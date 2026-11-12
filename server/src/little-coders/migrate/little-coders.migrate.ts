// FILE PATH: server/src/little-coders/migrate/little-coders.migrate.ts
//
// Builds the redesigned Little Coders program (5 courses × 8 lessons + 5 course
// assessments + 1 final assessment = 46 classes) — on a fresh database, or by
// restructuring an EXISTING Little Coders course in place without losing anything.
//
// Safety rules (this runs against live student data):
//   * One transaction under a Postgres advisory lock; the state is read AFTER the lock, so two
//     instances booting together cannot both migrate. Idempotent: a second run changes nothing.
//   * Nothing a student produced is deleted or rewritten. Every Lesson row keeps its id, so each
//     ScheduledLesson, homework Submission, LessonProgress, AssessmentAttempt, TestReport and
//     certificate keeps pointing at the same row. A completed class keeps its lessonNumber
//     (the scheduler's "next lesson = highest completed + 1" rule stays true).
//   * The old content of every lesson is kept as a snapshot in sourceRefs.legacyLittleCodersV1.
//   * The old Final Test row (position 28) is MOVED to position 46 (with the classes that point
//     at it), so a student who had finished the old program stays finished.
//   * A custom curriculum that imported one of the old Little Coders tests (it reads that test's
//     questions through Assessment.sourceAssessmentId) is detached first — it receives its own
//     copy of the questions — so its test never changes.
//   * Odyssey, Game Creator and every other program are untouched: this only reads and writes
//     rows of the Little Coders course.
//   * An admin's edits are respected: a lesson field an admin changed (recorded in
//     sourceRefs.lcV2.edited) is never refreshed from the authored curriculum.
//
// Position map of the 46 sessions (Lesson.order):
//   course n lessons 9(n-1)+1 … 9(n-1)+8, its assessment 9n — then the Final Assessment at 46.

import {
  AssessmentFormat,
  Prisma,
  PrismaClient,
  SessionType,
} from '@prisma/client';
import {
  DEPRECATED_PROGRAM_DESCRIPTIONS,
  LC_COURSES,
  LC_COURSE_SLUG,
  LC_FINAL_ASSESSMENT_ORDER,
  LC_FINAL_ASSESSMENT_TITLE,
  LC_LESSON_CONTENT_VERSION,
  LC_LESSONS_PER_COURSE,
  LC_LEARNING_TOTAL,
  LC_PROGRAM_DESCRIPTION,
  LC_SESSIONS_TOTAL,
  LC_SPEC_VERSION,
  lcCourseAssessmentOrder,
  lcCourseAssessmentTitle,
  lcLessonOrder,
  type LcCourseMeta,
} from '../lc.constants';
import { lcAssessmentInstructions } from '../assessments/lc-instructions';
import { lcPatchFor, type LcLessonPatch } from '../curriculum';
import { seedCodingPlatforms } from '../lc.platforms';

interface Logger {
  log: (msg: string) => void;
  warn: (msg: string) => void;
}

/** Arbitrary constant — the advisory lock namespace for "Little Coders curriculum". */
const LC_LOCK_KEY = 7_315_204_912;

export type LcSeedMode =
  | 'none'
  | 'fresh'
  | 'migrated'
  | 'repaired'
  | 'refreshed'
  | 'current'
  | 'skipped';

export interface LcSeedReport {
  mode: LcSeedMode;
  lessonsCreated: number;
  lessonsUpdated: number;
  assessmentsCreated: number;
  linkedAssessmentsDetached: number;
  movedClassRows: number;
  notes: string[];
}

const OLD_SLUGS = {
  m1: 'scratch-adventures',
  m2: 'python-for-young-builders',
  m3: 'ai-for-kids',
} as const;
const NEW_M2_SLUG = 'scratch-game-studio';

import {
  readLcRefs,
  type LcEditableField,
  type LcSourceRefs,
} from '../lc.refs';
export { readLcRefs };
export type { LcEditableField, LcSourceRefs };

const json = (v: unknown) => v as Prisma.InputJsonValue;
const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

interface PlanItem {
  order: number;
  kind: 'learning' | 'course-test' | 'final';
  course?: LcCourseMeta;
  lesson?: number;
}

/** The 46 sessions in order. */
export function lcPlan(): PlanItem[] {
  const plan: PlanItem[] = [];
  for (const course of LC_COURSES) {
    for (let lesson = 1; lesson <= LC_LESSONS_PER_COURSE; lesson++) {
      plan.push({
        order: lcLessonOrder(course.number, lesson),
        kind: 'learning',
        course,
        lesson,
      });
    }
    plan.push({
      order: lcCourseAssessmentOrder(course.number),
      kind: 'course-test',
      course,
    });
  }
  plan.push({ order: LC_FINAL_ASSESSMENT_ORDER, kind: 'final' });
  return plan;
}

const testTitle = lcCourseAssessmentTitle;
const FINAL_TITLE = LC_FINAL_ASSESSMENT_TITLE;

type Tx = Prisma.TransactionClient;

interface LessonRow {
  id: string;
  order: number;
  type: SessionType;
  moduleId: string | null;
  sourceRefs: Prisma.JsonValue;
  projectCard: Prisma.JsonValue;
  previewVideo: Prisma.JsonValue;
  homeworkCard: Prisma.JsonValue;
  experience: Prisma.JsonValue;
}

/** Keeps the URL fields an admin has already filled in when a card is refreshed. */
function mergeUrls(
  fresh: Record<string, unknown>,
  stored: Prisma.JsonValue,
  fields: string[],
): Record<string, unknown> {
  if (!isObj(stored)) return fresh;
  const out = { ...fresh };
  for (const f of fields) {
    const v = stored[f];
    if (v !== undefined && v !== null && v !== '') out[f] = v;
  }
  return out;
}

function lessonData(
  patch: LcLessonPatch,
  row: LessonRow | null,
  opts: {
    moduleId: string;
    projectId: string | null;
    edited: LcEditableField[];
    key: string;
    legacy?: unknown;
    previousRefs?: unknown;
  },
) {
  const skip = new Set<LcEditableField>(opts.edited);
  const data: Prisma.LessonUncheckedUpdateInput = {
    type: SessionType.LEARNING,
    moduleId: opts.moduleId,
    projectId: opts.projectId,
    reviewNotes: null,
    miniQuiz: json([]),
    visuals: json([]),
    projectLinks: Prisma.DbNull,
    contentVersion: LC_LESSON_CONTENT_VERSION,
  };
  if (!skip.has('title')) data.title = patch.title;
  if (!skip.has('objectives')) data.objectives = patch.objectives;
  if (!skip.has('contentMarkdown'))
    data.contentMarkdown = patch.contentMarkdown;
  if (!skip.has('homework')) data.homework = patch.homework;
  if (!skip.has('teacherNotes')) data.teacherNotes = patch.teacherNotes;
  if (!skip.has('checkpoint')) data.checkpoint = patch.checkpoint;
  if (!skip.has('codeSnippets')) data.codeSnippets = json(patch.codeSnippets);
  if (!skip.has('experience')) data.experience = json(patch.experience);
  if (!skip.has('previewVideo')) {
    data.previewVideo = json(
      mergeUrls({ ...patch.previewVideo }, row?.previewVideo ?? null, [
        'videoUrl',
        'posterUrl',
        'captionsUrl',
        'durationSeconds',
        'stored',
      ]),
    );
  }
  if (!skip.has('projectCard')) {
    data.projectCard = json(
      mergeUrls({ ...patch.projectCard }, row?.projectCard ?? null, [
        'projectUrl',
        'copyUrl',
      ]),
    );
  }
  if (!skip.has('homeworkCard')) data.homeworkCard = json(patch.homeworkCard);
  const prev = isObj(row?.sourceRefs) ? (row.sourceRefs as LcSourceRefs) : {};
  const refs: LcSourceRefs = {
    lcV2: { key: opts.key, version: LC_SPEC_VERSION, edited: opts.edited },
    ...(opts.legacy !== undefined
      ? { legacyLittleCodersV1: opts.legacy }
      : prev.legacyLittleCodersV1 !== undefined
        ? { legacyLittleCodersV1: prev.legacyLittleCodersV1 }
        : {}),
  };
  data.sourceRefs = json(refs);
  return data;
}

async function createShell(
  tx: Tx,
  lessonId: string,
  type: SessionType,
  title: string,
) {
  return tx.assessment.create({
    data: {
      lessonId,
      type,
      title,
      instructions: lcAssessmentInstructions(
        type === SessionType.FINAL_TEST ? 'FINAL' : 'COURSE',
      ),
      mcqCount: 0,
      randomizeQuestions: true,
      randomizeOptions: true,
      vivaMaxScore: 0,
      isPublished: true,
      format: AssessmentFormat.LITTLE_CODERS_V2,
      activeVariant: type === SessionType.FINAL_TEST ? 'SCRATCH_AI' : null,
      bankVersion: 0,
    },
  });
}

/**
 * A custom curriculum's imported test reads the original's questions through
 * Assessment.sourceAssessmentId. Before a Little Coders test is repurposed, every such link is
 * replaced by a private copy of the questions, so the custom test stays exactly as it was.
 */
async function detachLinkedAssessments(
  tx: Tx,
  rootAssessmentId: string,
): Promise<number> {
  const children = await tx.assessment.findMany({
    where: { sourceAssessmentId: rootAssessmentId },
    select: { id: true },
  });
  if (children.length === 0) return 0;
  const root = await tx.assessment.findUniqueOrThrow({
    where: { id: rootAssessmentId },
    select: { instructions: true, bankVersion: true },
  });
  const [mcqs, practicals] = await Promise.all([
    tx.mCQQuestion.findMany({
      where: { assessmentId: rootAssessmentId, isPublished: true },
    }),
    tx.practicalQuestion.findMany({
      where: { assessmentId: rootAssessmentId, isPublished: true },
    }),
  ]);
  for (const child of children) {
    if (mcqs.length) {
      await tx.mCQQuestion.createMany({
        data: mcqs.map((q) => ({
          assessmentId: child.id,
          questionType: q.questionType,
          questionText: q.questionText,
          options: q.options as Prisma.InputJsonValue,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          difficulty: q.difficulty,
          tags: q.tags,
          order: q.order,
          isPublished: true,
          bankKey: q.bankKey,
          editedByAdmin: q.editedByAdmin,
        })),
        skipDuplicates: true,
      });
    }
    if (practicals.length) {
      await tx.practicalQuestion.createMany({
        data: practicals.map((p) => ({
          assessmentId: child.id,
          title: p.title,
          instructions: p.instructions,
          language: p.language,
          starterCode: p.starterCode,
          testCases:
            p.testCases === null
              ? Prisma.DbNull
              : (p.testCases as Prisma.InputJsonValue),
          rubric:
            p.rubric === null
              ? Prisma.DbNull
              : (p.rubric as Prisma.InputJsonValue),
          maxScore: p.maxScore,
          order: p.order,
          isPublished: true,
          bankKey: p.bankKey,
        })),
        skipDuplicates: true,
      });
    }
    await tx.assessment.update({
      where: { id: child.id },
      data: {
        sourceAssessmentId: null,
        instructions: root.instructions,
        bankVersion: root.bankVersion,
      },
    });
  }
  return children.length;
}

function legacySnapshot(l: {
  order: number;
  title: string;
  type: SessionType;
  objectives: string[];
  contentMarkdown: string | null;
  homework: string | null;
  teacherNotes: string | null;
  reviewNotes: string | null;
  miniQuiz: Prisma.JsonValue;
  visuals: Prisma.JsonValue;
  checkpoint: string | null;
  codeSnippets: Prisma.JsonValue;
  projectLinks: Prisma.JsonValue;
  sourceRefs: Prisma.JsonValue;
  module: { slug: string; title: string } | null;
}) {
  return {
    note: 'Content of this lesson before the Little Coders redesign (five courses). Kept for reference and rollback.',
    savedAt: new Date().toISOString(),
    order: l.order,
    type: l.type,
    module: l.module,
    title: l.title,
    objectives: l.objectives,
    contentMarkdown: l.contentMarkdown,
    homework: l.homework,
    teacherNotes: l.teacherNotes,
    reviewNotes: l.reviewNotes,
    miniQuiz: l.miniQuiz,
    visuals: l.visuals,
    checkpoint: l.checkpoint,
    codeSnippets: l.codeSnippets,
    projectLinks: l.projectLinks,
    sourceRefs: l.sourceRefs,
  };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/**
 * Brings the Little Coders course up to the redesigned structure. Safe to call on every boot.
 */
export async function ensureLittleCodersCurriculum(
  prisma: PrismaClient,
  logger: Logger,
  reconcile?: (courseId: string, actorId: string) => Promise<unknown>,
): Promise<LcSeedReport> {
  const report: LcSeedReport = {
    mode: 'none',
    lessonsCreated: 0,
    lessonsUpdated: 0,
    assessmentsCreated: 0,
    linkedAssessmentsDetached: 0,
    movedClassRows: 0,
    notes: [],
  };

  await seedCodingPlatforms(prisma);

  const course = await prisma.course.findFirst({
    where: {
      isCustom: false,
      slug: { in: [LC_COURSE_SLUG, `${LC_COURSE_SLUG}-path`] },
    },
    select: { id: true, slug: true },
  });
  if (!course) return report;

  // Fail early (before touching the database) if the authored curriculum itself is invalid.
  lcPatchFor(1, 1);

  let reconcileNeeded = false;
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LC_LOCK_KEY})`;

      const lessons = await tx.lesson.findMany({
        where: { courseId: course.id },
        select: {
          id: true,
          order: true,
          type: true,
          moduleId: true,
          title: true,
          objectives: true,
          contentMarkdown: true,
          homework: true,
          teacherNotes: true,
          reviewNotes: true,
          miniQuiz: true,
          visuals: true,
          checkpoint: true,
          codeSnippets: true,
          projectLinks: true,
          sourceRefs: true,
          projectCard: true,
          previewVideo: true,
          homeworkCard: true,
          experience: true,
          module: { select: { slug: true, title: true } },
        },
        orderBy: { order: 'asc' },
      });
      const modules = await tx.courseModule.findMany({
        where: { courseId: course.id },
      });
      const slugs = new Set(modules.map((m) => m.slug));
      const v2Count = lessons.filter((l) => l.experience !== null).length;

      const looksOld =
        lessons.length === 28 &&
        v2Count === 0 &&
        slugs.has(OLD_SLUGS.m1) &&
        slugs.has(OLD_SLUGS.m2) &&
        slugs.has(OLD_SLUGS.m3);

      if (lessons.length === 0) report.mode = 'fresh';
      else if (looksOld) report.mode = 'migrated';
      else if (
        v2Count > 0 &&
        lessons.length === LC_SESSIONS_TOTAL &&
        v2Count === LC_LEARNING_TOTAL
      )
        report.mode = 'current';
      else if (v2Count > 0) report.mode = 'repaired';
      else {
        report.mode = 'skipped';
        report.notes.push(
          `Little Coders has ${lessons.length} lesson(s) in a shape that is neither the old nor the new curriculum — left exactly as it is. Use the admin curriculum editor to adjust it.`,
        );
        return;
      }

      const overwrite = report.mode === 'fresh' || report.mode === 'migrated';
      const byOrder = new Map(lessons.map((l) => [l.order, l]));

      // ── 0. Types at the old positions must be what we expect before anything moves. ──
      if (report.mode === 'migrated') {
        const expectTest = new Set([9, 18, 27]);
        for (const l of lessons) {
          const isTest = l.type !== SessionType.LEARNING;
          if (l.order === 28) {
            if (l.type !== SessionType.FINAL_TEST)
              throw new Error('position 28 is not the Final Test');
          } else if (expectTest.has(l.order) !== isTest) {
            throw new Error(
              `position ${l.order} has an unexpected type ${l.type}`,
            );
          }
        }
      }

      // ── 1. Link-safe: custom curricula that read an old Little Coders test get their own copy. ──
      if (report.mode === 'migrated') {
        const assessments = await tx.assessment.findMany({
          where: {
            lessonId: {
              in: lessons
                .filter((l) => l.type !== SessionType.LEARNING)
                .map((l) => l.id),
            },
          },
          select: { id: true },
        });
        for (const a of assessments)
          report.linkedAssessmentsDetached += await detachLinkedAssessments(
            tx,
            a.id,
          );
      }

      // ── 2. Modules ──
      const bySlug = new Map(modules.map((m) => [m.slug, m]));
      const old2 = bySlug.get(OLD_SLUGS.m2);
      if (old2 && !bySlug.has(NEW_M2_SLUG) && overwrite) {
        const renamed = await tx.courseModule.update({
          where: { id: old2.id },
          data: { slug: NEW_M2_SLUG },
        });
        bySlug.delete(OLD_SLUGS.m2);
        bySlug.set(NEW_M2_SLUG, renamed);
      }
      const moduleIdByCourse = new Map<number, string>();
      for (const c of LC_COURSES) {
        let m = bySlug.get(c.slug);
        if (!m) {
          m = await tx.courseModule.create({
            data: {
              courseId: course.id,
              slug: c.slug,
              title: c.title,
              description: c.focus,
              order: c.number,
            },
          });
        } else if (overwrite) {
          m = await tx.courseModule.update({
            where: { id: m.id },
            data: { title: c.title, description: c.focus, order: c.number },
          });
        }
        moduleIdByCourse.set(c.number, m.id);
      }

      // ── 3. Old projects (three per old course) are replaced by one project per lesson. ──
      if (report.mode === 'migrated') {
        await tx.project.deleteMany({
          where: { moduleId: { in: [...moduleIdByCourse.values()] } },
        });
      }

      // ── 4. The old Final Test (position 28) moves to position 46 with the classes that point at it. ──
      if (report.mode === 'migrated') {
        const oldFinal = byOrder.get(28)!;
        const moved1 = await tx.scheduledLesson.updateMany({
          where: {
            courseId: course.id,
            OR: [
              { lessonId: oldFinal.id },
              { lessonId: null, lessonNumber: 28 },
            ],
          },
          data: {
            lessonNumber: LC_FINAL_ASSESSMENT_ORDER,
            lessonId: oldFinal.id,
          },
        });
        const moved2 = await tx.batchSession.updateMany({
          where: {
            courseId: course.id,
            OR: [
              { lessonId: oldFinal.id },
              { lessonId: null, lessonNumber: 28 },
            ],
          },
          data: {
            lessonNumber: LC_FINAL_ASSESSMENT_ORDER,
            lessonId: oldFinal.id,
          },
        });
        report.movedClassRows = moved1.count + moved2.count;
        await tx.lesson.update({
          where: { id: oldFinal.id },
          data: { order: LC_FINAL_ASSESSMENT_ORDER },
        });
        byOrder.delete(28);
        byOrder.set(LC_FINAL_ASSESSMENT_ORDER, {
          ...oldFinal,
          order: LC_FINAL_ASSESSMENT_ORDER,
        });
        reconcileNeeded = true;
      }

      // ── 5. Every position: update in place, or create. ──
      for (const item of lcPlan()) {
        const existing = byOrder.get(item.order) ?? null;

        if (item.kind === 'learning') {
          const c = item.course!;
          const patch = lcPatchFor(c.number, item.lesson!);
          const key = `c${c.number}l${item.lesson}`;
          const moduleId = moduleIdByCourse.get(c.number)!;
          const refs = readLcRefs(existing?.sourceRefs);
          const edited = refs?.edited ?? [];
          const upToDate =
            existing &&
            refs &&
            refs.version >= LC_SPEC_VERSION &&
            existing.experience !== null;
          if (upToDate) continue;

          // One Project per lesson (kept in the module so the curriculum editor lists it).
          const slug = slugify(`${key}-${patch.project.title}`);
          const project = await tx.project.upsert({
            where: { moduleId_slug: { moduleId, slug } },
            update: {
              title: patch.project.title,
              description: patch.project.description,
              order: item.lesson!,
            },
            create: {
              moduleId,
              slug,
              title: patch.project.title,
              description: patch.project.description,
              order: item.lesson!,
            },
          });

          if (existing) {
            const legacy =
              report.mode === 'migrated'
                ? legacySnapshot({ ...existing, module: existing.module })
                : undefined;
            await tx.lesson.update({
              where: { id: existing.id },
              data: lessonData(patch, existing, {
                moduleId,
                projectId: project.id,
                edited,
                key,
                legacy,
              }),
            });
            report.lessonsUpdated++;
          } else {
            const created = await tx.lesson.create({
              data: {
                courseId: course.id,
                order: item.order,
                title: patch.title,
                type: SessionType.LEARNING,
                moduleId,
              },
            });
            await tx.lesson.update({
              where: { id: created.id },
              data: lessonData(patch, null, {
                moduleId,
                projectId: project.id,
                edited: [],
                key,
              }),
            });
            report.lessonsCreated++;
          }
          continue;
        }

        // Assessment sessions.
        const type =
          item.kind === 'final'
            ? SessionType.FINAL_TEST
            : SessionType.COURSE_TEST;
        const title =
          item.kind === 'final' ? FINAL_TITLE : testTitle(item.course!);
        const moduleId =
          item.kind === 'final'
            ? null
            : moduleIdByCourse.get(item.course!.number)!;
        const objectives =
          item.kind === 'final'
            ? ['Show what you learned across all five Little Coders courses']
            : [`Show what you learned in ${item.course!.title}`];
        let lessonId: string;
        if (existing) {
          lessonId = existing.id;
          if (overwrite) {
            await tx.lesson.update({
              where: { id: existing.id },
              data: { title, type, moduleId, objectives, order: item.order },
            });
            report.lessonsUpdated++;
          }
        } else {
          const created = await tx.lesson.create({
            data: {
              courseId: course.id,
              order: item.order,
              title,
              type,
              moduleId,
              objectives,
            },
          });
          lessonId = created.id;
          report.lessonsCreated++;
        }
        const assessment = await tx.assessment.findUnique({
          where: { lessonId },
          select: { id: true, format: true },
        });
        if (!assessment) {
          await createShell(tx, lessonId, type, title);
          report.assessmentsCreated++;
        } else if (assessment.format !== AssessmentFormat.LITTLE_CODERS_V2) {
          // The retired test becomes the new assessment: its old questions are retired by the
          // bank sync (answered ones are kept, unpublished, for history).
          await tx.assessment.update({
            where: { id: assessment.id },
            data: {
              title,
              instructions: lcAssessmentInstructions(
                item.kind === 'final' ? 'FINAL' : 'COURSE',
              ),
              mcqCount: 0,
              vivaMaxScore: 0,
              format: AssessmentFormat.LITTLE_CODERS_V2,
              activeVariant: item.kind === 'final' ? 'SCRATCH_AI' : null,
              bankVersion: 0,
            },
          });
        }
      }

      // ── 6. The course row. Everything an admin edits stays; only the stale facts change. ──
      const row = await tx.course.findUniqueOrThrow({
        where: { id: course.id },
        select: { description: true, sessions: true },
      });
      const data: Prisma.CourseUpdateInput = {};
      if (row.sessions !== LC_SESSIONS_TOTAL) data.sessions = LC_SESSIONS_TOTAL;
      if (
        !row.description ||
        DEPRECATED_PROGRAM_DESCRIPTIONS.includes(row.description)
      )
        data.description = LC_PROGRAM_DESCRIPTION;
      if (Object.keys(data).length)
        await tx.course.update({ where: { id: course.id }, data });

      if (
        report.mode === 'current' &&
        report.lessonsUpdated === 0 &&
        report.lessonsCreated === 0 &&
        report.assessmentsCreated === 0
      ) {
        report.mode = 'current';
      } else if (report.mode === 'current') {
        report.mode = 'refreshed';
      }
    },
    { timeout: 120_000, maxWait: 30_000 },
  );

  if (
    report.mode === 'migrated' ||
    report.mode === 'fresh' ||
    report.mode === 'repaired'
  ) {
    logger.log(
      `[little-coders] ${report.mode}: ${report.lessonsCreated} lesson(s) created, ${report.lessonsUpdated} updated, ${report.assessmentsCreated} assessment(s) created` +
        (report.movedClassRows
          ? `, ${report.movedClassRows} class record(s) of the old Final Test moved to position ${LC_FINAL_ASSESSMENT_ORDER}`
          : '') +
        (report.linkedAssessmentsDetached
          ? `, ${report.linkedAssessmentsDetached} custom-curriculum test(s) kept on their own copy of the old questions`
          : '') +
        '.',
    );
  } else if (report.mode === 'refreshed') {
    logger.log(
      `[little-coders] refreshed ${report.lessonsUpdated} lesson(s) to curriculum version ${LC_SPEC_VERSION}.`,
    );
  }
  for (const n of report.notes) logger.warn(`[little-coders] ${n}`);

  if (reconcileNeeded && reconcile) {
    try {
      const result = await reconcile(course.id, 'system-little-coders-v2');
      logger.log(
        `[little-coders] regenerated the upcoming schedule — ${JSON.stringify(result)}.`,
      );
    } catch (err) {
      logger.warn(
        `[little-coders] schedule reconciliation failed (an admin can re-run it from the curriculum editor): ${(err as Error).message}`,
      );
    }
  } else if (reconcileNeeded) {
    logger.warn(
      '[little-coders] the upcoming schedule of enrolled students was not regenerated (standalone run). Restart the app server, which does it.',
    );
  }
  return report;
}

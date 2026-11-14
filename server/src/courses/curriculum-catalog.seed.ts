// FILE PATH: server/src/courses/curriculum-catalog.seed.ts
//
// Assembles the 28-session specialized-pathway structure and the 85-session
// Odyssey structure on top of course-catalog.seed.ts's plain Course rows.
//
// Source content lives in server/prisma/curriculum-data/<pathway-slug>.json
// — extracted from the sibling lumexa-all-lessons/lumexa-all-projects repos
// by scripts/extract-curriculum.mjs and scripts/build-web-developer.mjs (run
// offline, not at app runtime; see those scripts' header comments). This
// file turns that raw content into real DB rows: CourseModule, Lesson
// (LEARNING + COURSE_TEST/STAGE_TEST/FINAL_TEST), Project and an empty
// Assessment per test session. The questions themselves are NOT generated
// here: they are the authored, validated banks in server/src/assessments/bank,
// applied by syncAssessmentBanks (see course-catalog.seed.ts).
//
// Every specialized pathway becomes: 3 modules × (8 learning + 1 course
// test) + 1 final test = 28 sessions (24 learning + 4 assessment).
// Odyssey becomes: 3 stages × (3 modules × (8 learning + 1 course test) + 1
// stage test) + 1 final test = 85 sessions (72 learning + 13 assessment),
// reusing the exact same 9 source modules the specialized pathways use (per
// the Lumexa Odyssey Curriculum PDF's stage → course mapping), each stage
// getting its own CourseModule/Lesson rows scoped to the Odyssey Course so
// Odyssey students progress independently of specialized-pathway students.
//
// Idempotent and non-destructive: a course already carrying the target
// module/lesson count is left alone. A course found with the OLD flat
// (moduleId-less) Lesson[] shape from the previous version of this seed is
// upgraded in place — but only when no AssessmentAttempt/ScheduledLesson
// history exists yet against it, so real production data is never touched
// automatically; if history exists, the mismatch is logged for a manual
// admin-driven migration instead (see SchedulingService.reconcileCourseSchedules
// for the *supported* path once a course is genuinely restructured live).

import { LessonStatus, PrismaClient, SessionType } from '@prisma/client';
import { standardInstructions } from '../assessments/bank/bank.constants';
import type { BankTestType } from '../assessments/bank/bank.types';
import { ADVANCED_DATA_SCIENCE_FIXES } from './advanced-data-science.content';
import { canonicalCourseSlug, legacyCourseSlug } from './course-slug';
import { CONTENT_VERSION, upgradeLesson } from '../curriculum/lesson-content';
import { backfillLessonContent, upgradeAdvancedDataScienceFix } from './lesson-content.backfill';
import {
  PATHWAY_SLUGS,
  loadPathway,
  type RawModule,
  type RawPathway,
} from './curriculum-source';
import { upgradePythonFoundations } from './python-foundations.upgrade';
import { isLittleCodersSlug } from '../little-coders/lc.constants';
import { ensureLittleCodersCurriculum } from '../little-coders/migrate/little-coders.migrate';

// ── Project-checkpoint assignment: the standard 8-lesson shape ─────────────
// L1 intro · L2-3 Project1 · L4-5 Project2 · L6-7 Project3 · L8 review

export function assignStandardCheckpoints(mod: RawModule) {
  const projects = mod.projects;
  mod.lessons.forEach((lesson, i) => {
    if (lesson.projectSlug !== undefined && lesson.projectSlug !== null) return; // web-developer already assigned
    if (i === 0) {
      lesson.projectSlug = null;
      lesson.checkpoint = projects.length
        ? `Set up your environment and explore what you'll build this module`
        : undefined;
      return;
    }
    if (i === 7) {
      lesson.projectSlug = null;
      lesson.checkpoint = projects.length
        ? `Polish, review, and synthesize all ${projects.length} projects from this module`
        : undefined;
      return;
    }
    const pairIndex = Math.floor((i - 1) / 2); // 0,0,1,1,2,2 for i=1..6
    const proj = projects[pairIndex];
    if (!proj) {
      lesson.projectSlug = null;
      return;
    }
    const part = (i - 1) % 2 === 0 ? 'Part 1' : 'Part 2 — Finish';
    lesson.projectSlug = proj.slug;
    lesson.checkpoint = `${part} of "${proj.title}"`;
  });
}

// Digital Independence: projects are embedded 1:1 on specific lessons
// (hasEmbeddedProject), never spanning multiple lessons — many lessons are
// deliberately non-coding (career-readiness content), so the standard
// project-every-two-lessons shape does not apply. See
// Content_Schema_Proposal.md in the source repo (Project.type: coding |
// non-coding) for the origin of this distinction.
function assignDigitalIndependenceCheckpoints(mod: RawModule) {
  for (const lesson of mod.lessons) {
    if (lesson.hasEmbeddedProject) {
      const slug = lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      lesson.projectSlug = slug;
      lesson.checkpoint = `Complete the "${lesson.title}" project deliverable for this session`;
      if (!mod.projects.find((p) => p.slug === slug)) {
        mod.projects.push({
          slug,
          title: lesson.title,
          order: mod.projects.length + 1,
          description: `Embedded project for Lesson: ${lesson.title}`,
          sourceRepoPath: (lesson.sourceRefs as { lessonSource?: string })?.lessonSource,
          files: lesson.codeSnippets.filter((c) => c.part === 'project'),
        });
      }
    } else {
      lesson.projectSlug = null;
      lesson.checkpoint = `Complete the "${lesson.title}" worksheet and reflection`;
    }
  }
}

// ── Core builders ────────────────────────────────────────────────────────────

/** Replaces a lesson's raw title wherever generated text (a checkpoint, an embedded
 *  project's name) quotes it, so a cleaned title never leaves its old form behind. */
export function retitleText(text: string | null | undefined, retitle: Map<string, string>): string | undefined {
  if (text === null || text === undefined) return undefined;
  let out = text;
  for (const [from, to] of retitle) if (from.length >= 6) out = out.split(from).join(to);
  return out;
}

async function createModuleRows(
  prisma: PrismaClient,
  courseId: string,
  mod: RawModule,
  moduleOrder: number,
  lessonOrderStart: number,
  stageNumber: number | null,
  courseTitle: string | null = null,
): Promise<number> {
  const courseModule = await prisma.courseModule.create({
    data: {
      courseId,
      slug: mod.slug,
      title: mod.title,
      order: moduleOrder,
      stageNumber: stageNumber ?? undefined,
    },
  });

  // Bring every lesson up to the current content model BEFORE any row is written:
  // cleaned body, structured quiz, instructor notes, visuals and lineage. A new
  // database therefore never holds the duplicated, unstructured content that
  // backfillLessonContent exists to repair in old ones.
  const learningCount = mod.lessons.length;
  const upgrades = mod.lessons.map(
    (lesson, i) =>
      upgradeLesson({
        row: {
          id: '',
          title: lesson.title,
          type: 'LEARNING',
          objectives: lesson.objectives,
          contentMarkdown: lesson.contentMarkdown,
          homework: lesson.homework ?? null,
          teacherNotes: null,
          miniQuiz: null,
          visuals: null,
          contentVersion: 0,
          sourceRefs: lesson.sourceRefs ?? null,
          duration: null,
        },
        courseTitle,
        module: { slug: mod.slug, title: mod.title },
        positionInGroup: i + 1,
        groupSize: learningCount,
        source: { teacherNotes: lesson.teacherNotes ?? null, miniQuiz: lesson.miniQuiz ?? null, moduleLessonCount: learningCount },
      }).patch,
  );
  const retitle = new Map<string, string>();
  mod.lessons.forEach((lesson, i) => {
    const cleaned = upgrades[i]?.title;
    if (cleaned && cleaned !== lesson.title) retitle.set(lesson.title, cleaned);
  });

  const projectRows = new Map<string, string>();
  for (const p of mod.projects) {
    const row = await prisma.project.create({
      data: {
        moduleId: courseModule.id,
        slug: p.slug,
        title: retitleText(p.title, retitle) ?? p.title,
        description: retitleText(p.description, retitle),
        sourceRepoPath: p.sourceRepoPath ?? undefined,
        order: p.order,
      },
    });
    projectRows.set(p.slug, row.id);
  }

  let order = lessonOrderStart;
  for (const [i, lesson] of mod.lessons.entries()) {
    const patch = upgrades[i];
    await prisma.lesson.create({
      data: {
        courseId,
        moduleId: courseModule.id,
        title: patch?.title ?? lesson.title,
        order,
        type: SessionType.LEARNING,
        objectives: patch?.objectives ?? lesson.objectives,
        contentMarkdown: patch && patch.contentMarkdown !== undefined ? patch.contentMarkdown : lesson.contentMarkdown,
        homework: patch && patch.homework !== undefined ? patch.homework : (lesson.homework ?? undefined),
        teacherNotes: patch?.teacherNotes ?? undefined,
        miniQuiz: patch?.miniQuiz ? (patch.miniQuiz as object) : undefined,
        visuals: patch?.visuals ? (patch.visuals as object) : undefined,
        contentVersion: CONTENT_VERSION,
        checkpoint: retitleText(lesson.checkpoint, retitle),
        projectId: lesson.projectSlug ? projectRows.get(lesson.projectSlug) : undefined,
        codeSnippets: (lesson.codeSnippets as unknown as object[]) ?? [],
        sourceRefs: ((patch?.sourceRefs ?? lesson.sourceRefs) as object) ?? undefined,
      },
    });
    order++;
  }

  // Course Test session directly after this module's 8 lessons. The
  // assessment starts as an empty shell; syncAssessmentBanks fills it with the
  // module's authored 40-question bank (see server/src/assessments/bank).
  const testLesson = await prisma.lesson.create({
    data: {
      courseId,
      moduleId: courseModule.id,
      title: `${mod.title} — Course Test`,
      order,
      type: SessionType.COURSE_TEST,
      objectives: [`Demonstrate mastery of everything taught in "${mod.title}"`],
    },
  });
  await createAssessmentShell(
    prisma,
    testLesson.id,
    SessionType.COURSE_TEST,
    `${mod.title} — Course Test`,
  );

  return order + 1; // next free lesson order
}

/** An Assessment row with no questions yet — the maintained question banks
 *  (server/src/assessments/bank) are applied by syncAssessmentBanks, which
 *  runs straight after the seed (see seedCourseCatalog), so a fresh database
 *  and an upgraded one end up with exactly the same questions. */
async function createAssessmentShell(
  prisma: PrismaClient,
  lessonId: string,
  type: SessionType,
  title: string,
) {
  return prisma.assessment.create({
    data: {
      lessonId,
      type,
      title,
      instructions: standardInstructions(type as BankTestType),
      mcqCount: 0,
      randomizeQuestions: true,
      randomizeOptions: true,
      vivaMaxScore: 0,
      isPublished: true,
    },
  });
}

// ── Pathway (specialized, 28-session) builder ───────────────────────────────

export async function seedPathwayCurriculum(prisma: PrismaClient, courseId: string, pathwaySlug: string) {
  const raw = loadPathway(pathwaySlug);
  const courseRow = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
  for (const mod of raw.modules) {
    if (mod.slug === 'build-your-professional-identity' || mod.slug === 'skills-that-pay' || mod.slug === 'professional-presence') {
      assignDigitalIndependenceCheckpoints(mod);
    } else {
      assignStandardCheckpoints(mod);
    }
  }

  let order = 1;
  for (let i = 0; i < raw.modules.length; i++) {
    order = await createModuleRows(prisma, courseId, raw.modules[i], i + 1, order, null, courseRow?.title ?? null);
  }

  // Final Test: 25 MCQs + 5 True/False across all 3 modules plus one ~15-minute
  // coding project the teacher marks — applied by syncAssessmentBanks.
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true },
  });
  const finalLesson = await prisma.lesson.create({
    data: {
      courseId,
      title: `${course?.title ?? raw.slug} — Final Test`,
      order,
      type: SessionType.FINAL_TEST,
      objectives: ['Demonstrate complete mastery of every module in this pathway'],
    },
  });
  await createAssessmentShell(
    prisma,
    finalLesson.id,
    SessionType.FINAL_TEST,
    'Final Test',
  );

  return order; // total session count
}

// ── Odyssey (85-session) builder ────────────────────────────────────────────
//
// Stage → module mapping per the Lumexa Odyssey Curriculum PDF:
//   Stage 1 (Foundation):      little-coders/scratch-adventures,
//                               little-coders/python-for-young-builders,
//                               game-creator/python-arcade-games
//   Stage 2 (Create & Apply):  web-developer/html-css-mastery,
//                               digital-independence/build-your-professional-identity,
//                               web-developer/javascript-interactivity
//   Stage 3 (Explore & Advance): data-scientist/python-for-data,
//                               ai-builder/python-ai-foundations,
//                               game-creator/roblox-world-builder

export const ODYSSEY_STAGES: { pathway: string; module: string }[][] = [
  [
    { pathway: 'little-coders-path', module: 'scratch-adventures' },
    { pathway: 'little-coders-path', module: 'python-for-young-builders' },
    { pathway: 'game-creator-path', module: 'python-arcade-games' },
  ],
  [
    { pathway: 'web-developer-path', module: 'html-css-mastery' },
    { pathway: 'digital-independence-path', module: 'build-your-professional-identity' },
    { pathway: 'web-developer-path', module: 'javascript-interactivity' },
  ],
  [
    { pathway: 'data-scientist-path', module: 'python-for-data' },
    { pathway: 'ai-builder-path', module: 'python-ai-foundations' },
    { pathway: 'game-creator-path', module: 'roblox-world-builder' },
  ],
];

export async function seedOdysseyCurriculum(prisma: PrismaClient, courseId: string) {
  const courseRow = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
  const pathwayCache = new Map<string, RawPathway>();
  function getModule(pathwaySlug: string, moduleSlug: string): RawModule {
    if (!pathwayCache.has(pathwaySlug)) pathwayCache.set(pathwaySlug, loadPathway(pathwaySlug));
    const pw = pathwayCache.get(pathwaySlug)!;
    const mod = pw.modules.find((m) => m.slug === moduleSlug);
    if (!mod) throw new Error(`Odyssey mapping error: ${pathwaySlug}/${moduleSlug} not found`);
    // Deep clone — Odyssey gets its own Lesson/Project rows, and checkpoint
    // assignment mutates the object in place.
    return JSON.parse(JSON.stringify(mod));
  }

  let order = 1;
  let moduleOrderCounter = 1;

  for (let stageIdx = 0; stageIdx < ODYSSEY_STAGES.length; stageIdx++) {
    const stageModules = ODYSSEY_STAGES[stageIdx].map(({ pathway, module }) => getModule(pathway, module));
    for (const mod of stageModules) {
      if (mod.slug === 'build-your-professional-identity') assignDigitalIndependenceCheckpoints(mod);
      else assignStandardCheckpoints(mod);
    }

    for (const mod of stageModules) {
      order = await createModuleRows(prisma, courseId, mod, moduleOrderCounter, order, stageIdx + 1, courseRow?.title ?? null);
      moduleOrderCounter++;
    }

    // Stage Test — spans this stage's 3 modules.
    const stageLesson = await prisma.lesson.create({
      data: {
        courseId,
        title: `Stage ${stageIdx + 1} Test`,
        order,
        type: SessionType.STAGE_TEST,
        objectives: [`Demonstrate mastery of everything taught in Stage ${stageIdx + 1}`],
      },
    });
    await createAssessmentShell(
      prisma,
      stageLesson.id,
      SessionType.STAGE_TEST,
      `Stage ${stageIdx + 1} Test`,
    );
    order++;
  }

  // Final Test — spans all 9 modules across all 3 stages.
  const finalLesson = await prisma.lesson.create({
    data: {
      courseId,
      title: `Lumexa Odyssey — Final Test`,
      order,
      type: SessionType.FINAL_TEST,
      objectives: ['Demonstrate complete mastery of the entire Odyssey journey across all 3 stages'],
    },
  });
  await createAssessmentShell(
    prisma,
    finalLesson.id,
    SessionType.FINAL_TEST,
    'Final Test',
  );

  return order;
}

// ── Orchestration + idempotency guard ───────────────────────────────────────

async function buildFreshStructure(prisma: PrismaClient, course: { id: string; slug: string }) {
  if (course.slug === 'lumexa-odyssey') return seedOdysseyCurriculum(prisma, course.id);
  return seedPathwayCurriculum(prisma, course.id, PATHWAY_SLUGS[canonicalCourseSlug(course.slug)]);
}

// One-time upgrade for a course that already has real enrollment data on
// the OLD flat (moduleId-less) Lesson list — this is exactly the state
// every already-deployed environment is in the first time this ships, so
// it must be handled for real rather than skipped (a skip would silently
// leave admin/student/teacher looking at empty lesson content forever).
//
// Safe by construction:
//   - COMPLETED ScheduledLesson rows are never deleted. Each student's
//     completed history is remapped in place to the new sequence using the
//     app's own invariant that a student's completed lessonNumbers are
//     always contiguous from 1 (see SchedulingService) — "this was my Nth
//     completed lesson" is preserved 1:1 onto the Nth new learning lesson,
//     clamped if a student somehow completed more than the new curriculum
//     has (never crashes, never orphans a row).
//   - UPCOMING/CANCELLED rows are deleted and regenerated by the same
//     `reconcile` callback CoursesService already uses for ordinary
//     add/remove/reorder edits — same code path, so this is exercised by
//     the exact same logic as every future curriculum change.
async function migrateFlatCourseToModules(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
  course: { id: string; slug: string },
  reconcile?: (courseId: string, actorId: string) => Promise<unknown>,
) {
  const oldLessonCount = await prisma.lesson.count({ where: { courseId: course.id, moduleId: null } });
  logger.log(`[curriculum-seed] Migrating ${course.slug}: ${oldLessonCount} legacy flat lesson(s) -> modular structure (preserving history).`);

  const completedRows = await prisma.scheduledLesson.findMany({
    where: { courseId: course.id, status: LessonStatus.COMPLETED },
    orderBy: [{ studentUserId: 'asc' }, { lessonNumber: 'asc' }],
    select: { id: true, studentUserId: true, lessonNumber: true },
  });

  // Drop stale UPCOMING/CANCELLED rows FIRST — they're about to be
  // regenerated fresh anyway, and leaving them in place would collide with
  // the completed-lesson remap below (their old lessonNumbers overlap the
  // new positions completed rows are about to claim).
  await prisma.scheduledLesson.deleteMany({
    where: { courseId: course.id, status: { in: [LessonStatus.UPCOMING, LessonStatus.CANCELLED] } },
  });

  // Old rows predate the lessonId column entirely, so there is no FK to
  // clear before removing them.
  await prisma.lesson.deleteMany({ where: { courseId: course.id, moduleId: null } });

  const newTotal = await buildFreshStructure(prisma, course);

  const newLearningLessons = await prisma.lesson.findMany({
    where: { courseId: course.id, type: SessionType.LEARNING },
    orderBy: { order: 'asc' },
    select: { id: true, order: true },
  });

  const byStudent = new Map<string, typeof completedRows>();
  for (const row of completedRows) {
    if (!byStudent.has(row.studentUserId)) byStudent.set(row.studentUserId, []);
    byStudent.get(row.studentUserId)!.push(row);
  }

  // ScheduledLesson.lessonNumber must always equal the catalog Lesson's
  // absolute `order` (test sessions included) — every other read path
  // (attachLessonTitles, reconcileStudentCourseSchedule's lessonIdByOrder
  // lookup, setStudentSchedule) depends on that equality. The i-th
  // completed LEARNING lesson under the old test-less curriculum maps to
  // the i-th LEARNING lesson under the new one (same content, same
  // relative order — only test sessions were inserted), so `i` selects
  // which new lesson it is, but the stored lessonNumber must be that
  // lesson's real `order`, not the compressed learning-only index `i`.
  // Any course/stage tests that now fall chronologically BEFORE a
  // student's last remapped position are deliberately not retrofitted
  // as "owed" — they didn't exist when that student was actually taught,
  // so their future schedule simply continues forward from their real
  // last completed lesson's new position.
  // Two-phase update: test insertions shift most rows' lessonNumber upward
  // by a different amount each, so updating them one at a time in place
  // routinely tries to claim a lessonNumber a later (not-yet-updated) row
  // in the same student+course still holds — @@unique([studentUserId,
  // courseId, lessonNumber]) rejects that. Phase 1 moves every affected
  // row to a guaranteed-free negative placeholder; phase 2 assigns the
  // real target now that no old positive value is in the way.
  let remapped = 0;
  for (const [studentUserId, rows] of byStudent) {
    const targets = rows.map((row, i) => {
      const learningIndex = Math.min(i + 1, newLearningLessons.length || 1);
      const newLesson = newLearningLessons[learningIndex - 1];
      return { row, lessonNumber: newLesson?.order ?? row.lessonNumber, lessonId: newLesson?.id ?? null };
    });

    for (let i = 0; i < targets.length; i++) {
      await prisma.scheduledLesson.update({ where: { id: targets[i].row.id }, data: { lessonNumber: -(i + 1) } });
    }
    for (const t of targets) {
      try {
        await prisma.scheduledLesson.update({
          where: { id: t.row.id },
          data: { lessonNumber: t.lessonNumber, lessonId: t.lessonId },
        });
        remapped++;
      } catch (err) {
        logger.warn(`[curriculum-seed] Could not remap completed session ${t.row.id} (student ${studentUserId}): ${(err as Error).message}`);
      }
    }
  }
  logger.log(
    `[curriculum-seed] ${course.slug}: remapped ${remapped} completed session(s) across ${byStudent.size} student(s) -> ${newTotal} total sessions.`,
  );

  if (reconcile) {
    const result = await reconcile(course.id, 'system-curriculum-migration');
    logger.log(`[curriculum-seed] ${course.slug}: regenerated upcoming schedule — ${JSON.stringify(result)}.`);
  } else {
    logger.warn(
      `[curriculum-seed] ${course.slug}: no reconcile callback available (standalone script run) — ` +
        `enrolled students' upcoming schedule was cleared but NOT regenerated. Restart the app server ` +
        `(which does pass a reconcile callback) or trigger it from the admin curriculum editor.`,
    );
  }

  return newTotal;
}

export async function seedCurriculumContent(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
  reconcile?: (courseId: string, actorId: string) => Promise<unknown>,
) {
  const courses = await prisma.course.findMany({
    where: {
      slug: {
        in: [
          ...Object.keys(PATHWAY_SLUGS),
          // Databases that have not been renamed yet still carry the old spelling.
          ...Object.keys(PATHWAY_SLUGS).map(legacyCourseSlug),
          'lumexa-odyssey',
        ],
      },
    },
    select: { id: true, slug: true, sessions: true },
  });

  for (const course of courses) {
    // Little Coders is the redesigned five-course program: it is built (or restructured in
    // place) by its own migration just below, never by the generic pathway builder.
    if (isLittleCodersSlug(course.slug)) continue;
    const moduleCount = await prisma.courseModule.count({ where: { courseId: course.id } });
    const lessonCount = await prisma.lesson.count({ where: { courseId: course.id } });
    const expectedSessions = course.sessions;

    if (moduleCount > 0 && lessonCount === expectedSessions) {
      continue; // already fully migrated to the module/assessment structure
    }

    if (lessonCount > 0 && moduleCount === 0) {
      // The OLD flat (pre-modules) shape — this is the state every
      // already-deployed environment is in the first time this code runs,
      // including ones with real student schedules/history. Migrate it for
      // real rather than skipping (see migrateFlatCourseToModules).
      await migrateFlatCourseToModules(prisma, logger, course, reconcile);
      continue;
    }

    if (lessonCount > 0 && moduleCount > 0) {
      // Partially migrated (moduleCount doesn't match expectedSessions —
      // e.g. an interrupted previous run, or an admin has since hand-edited
      // sessions independently of this seed). Never touched automatically:
      // real assessment attempts or admin edits may already depend on the
      // current shape. Surface it and move on.
      logger.warn(
        `[curriculum-seed] ${course.slug} has ${moduleCount} module(s)/${lessonCount} lesson(s), expected ${expectedSessions} — ` +
          `leaving as-is (looks hand-edited or partially migrated). Use the admin curriculum editor to adjust it directly.`,
      );
      continue;
    }

    // No lessons at all yet — brand new course, fresh build.
    const total = await buildFreshStructure(prisma, course);
    logger.log(`[curriculum-seed] ${course.slug} seeded: ${total} sessions.`);
  }

  try {
    await ensureLittleCodersCurriculum(prisma, logger, reconcile);
  } catch (err) {
    // Never stop the rest of the boot seed; the migration is a single transaction, so a
    // failure leaves Little Coders exactly as it was and it is retried on the next boot.
    logger.warn(`[little-coders] curriculum migration failed (nothing was changed; will retry on the next boot): ${(err as Error).message}`);
  }

  await backfillProjectLinks(prisma, logger, 'ai-builder');
  await backfillProjectLinks(prisma, logger, 'data-scientist');
  // Python Foundations moved to the standard project pattern: bring an already-seeded program across first,
  // then fill any project row that was never set.
  await upgradePythonFoundations(prisma, logger, {
    assignStandardCheckpoints,
    projectLinks: PYTHON_FOUNDATIONS_PROJECT_LINKS,
  });
  await backfillProjectLinks(prisma, logger, 'python-foundations');
  await backfillDataScientistKeyTerminologyTables(prisma, logger);
  await backfillWebDeveloperLessonContent(prisma, logger);
  await backfillAdvancedDataScience(prisma, logger);
  await backfillAdvancedDataScienceProgramDetails(prisma, logger);
  await dropPathFromFinalTestTitles(prisma, logger);
  // Last: every learning lesson — pathway, Odyssey copy, custom course, imported —
  // is brought up to the structured content model (cleanup, quiz, notes, visuals).
  // Isolated on purpose: whatever happens while tidying lesson text must never stop the
  // rest of the boot seed (the assessment-bank sync runs right after this).
  try {
    await backfillLessonContent(prisma, logger);
  } catch (err) {
    logger.warn(`[curriculum-seed] lesson content backfill failed (will retry on the next boot): ${(err as Error).message}`);
  }
}

// ── Portfolio-project links (per pathway) ───────────────────────────────────
//
// The lesson page shows a "💻 Project" section (Open Project / Copy Link
// buttons) in place of the plain Code section whenever Lesson.projectLinks
// is set — see LessonDetailsView on the client. Each map below is keyed by
// the lesson's absolute `order` within its 28-session pathway course (1-8 +
// Course Test 9, 10-17 + Course Test 18, 19-26 + Course Test 27, Final Test
// 28 — see createModuleRows/seedPathwayCurriculum above). Lessons not
// listed (the first lesson of each module, and every assessment session)
// keep showing the plain Code section instead. The 3 "polish/recap"
// lessons (8, 17, 26) link back to all 3 projects finished in that module.

// ── AI Builder Path ──────────────────────────────────────────────────────
const NUMBER_PREDICTION_MODEL = {
  title: 'Number Prediction Model',
  url: 'https://colab.research.google.com/drive/1t_GfYWRaBp8tHM9py5DPzqk_aMMIaPwy?usp=sharing',
};
const SIMPLE_IMAGE_CLASSIFIER = {
  title: 'Simple Image Classifier',
  url: 'https://colab.research.google.com/drive/1oJkbUz5HbehVtkpOG3e6lVCH4xHidcJv?usp=sharing',
};
const DATA_PATTERN_FINDER = {
  title: 'Data Pattern Finder',
  url: 'https://colab.research.google.com/drive/1X94pQT5P4kYaQKYJN8C8DrmRcrq7A4ZY?usp=sharing',
};
const REALTIME_EMOTION_DETECTOR = {
  title: 'Real-Time Emotion Detector',
  url: 'https://colab.research.google.com/drive/1ZuSs3-MPXQw2MWS05tfW4MSsjEPFOY51?usp=sharing',
};
const OBJECT_RECOGNITION_YOLOV8 = {
  title: 'Object Recognition with YOLOv8',
  url: 'https://colab.research.google.com/drive/1zAf46thbfCJHHcTR7D_5vPZt9D0KsSFl?usp=sharing',
};
const MOTION_ACTIVATED_SECURITY_CAM = {
  title: 'Motion-Activated Security Cam',
  url: 'https://colab.research.google.com/drive/15blXXC1wVOZIPQXYTRNLDZESl7Cx_ZGG?usp=sharing',
};
const RECIPE_CHATBOT_WITH_MEMORY = {
  title: 'Recipe Chatbot with Memory',
  url: 'https://colab.research.google.com/drive/1l41gSrZspbKCQNgWOwak-YSelgWLM117?usp=sharing',
};
const STUDY_ASSISTANT_ORBIT = {
  title: 'Study Assistant — Orbit',
  url: 'https://colab.research.google.com/drive/1gxA9s1KhEXkRA3cQ_4mjfRsJWJ0IB2ta?usp=sharing',
};
const CREATIVE_STORY_GENERATOR_NOVA = {
  title: 'Creative Story Generator — Nova',
  url: 'https://colab.research.google.com/drive/1pbP6LEAufmfv9_Rb86LmHlaVvuzjNvxu?usp=sharing',
};

const AI_BUILDER_PROJECT_LINKS: Record<number, { title: string; url: string }[]> = {
  // python-ai-foundations (lessons 1-8; 9 = Course Test)
  2: [NUMBER_PREDICTION_MODEL],
  3: [NUMBER_PREDICTION_MODEL],
  4: [SIMPLE_IMAGE_CLASSIFIER],
  5: [SIMPLE_IMAGE_CLASSIFIER],
  6: [DATA_PATTERN_FINDER],
  7: [DATA_PATTERN_FINDER],
  8: [NUMBER_PREDICTION_MODEL, SIMPLE_IMAGE_CLASSIFIER, DATA_PATTERN_FINDER],
  // computer-vision (lessons 10-17; 18 = Course Test)
  11: [REALTIME_EMOTION_DETECTOR],
  12: [REALTIME_EMOTION_DETECTOR],
  13: [OBJECT_RECOGNITION_YOLOV8],
  14: [OBJECT_RECOGNITION_YOLOV8],
  15: [MOTION_ACTIVATED_SECURITY_CAM],
  16: [MOTION_ACTIVATED_SECURITY_CAM],
  17: [REALTIME_EMOTION_DETECTOR, OBJECT_RECOGNITION_YOLOV8, MOTION_ACTIVATED_SECURITY_CAM],
  // language-models (lessons 19-26; 27 = Course Test, 28 = Final Test)
  20: [RECIPE_CHATBOT_WITH_MEMORY],
  21: [RECIPE_CHATBOT_WITH_MEMORY],
  22: [STUDY_ASSISTANT_ORBIT],
  23: [STUDY_ASSISTANT_ORBIT],
  24: [CREATIVE_STORY_GENERATOR_NOVA],
  25: [CREATIVE_STORY_GENERATOR_NOVA],
  26: [RECIPE_CHATBOT_WITH_MEMORY, STUDY_ASSISTANT_ORBIT, CREATIVE_STORY_GENERATOR_NOVA],
};

// ── Data Scientist Path: portfolio-project links ────────────────────────────
const SPORTS_PERFORMANCE_ANALYSIS = {
  title: 'Sports Performance Analysis',
  url: 'https://colab.research.google.com/drive/1FC67JYgeDDAxJn0A5yAUSIufEO6drkci?usp=sharing',
};
const SCHOOL_GRADE_ANALYSIS = {
  title: 'School Grade Analysis',
  url: 'https://colab.research.google.com/drive/1ZyV_SXwN0fsxD8akkCvjlP-3sd41H5zy?usp=sharing',
};
const CITY_POPULATION_TRENDS = {
  title: 'City Population Trends',
  url: 'https://colab.research.google.com/drive/1nt79FsuO4onQuRYxbAufewcCLcR292cq?usp=sharing',
};
const CLIMATE_CHANGE_DASHBOARD = {
  title: 'Climate Change Dashboard',
  url: 'https://colab.research.google.com/drive/1GwWw1G0D5vCWN--m9tGET2L_eVFv-uii?usp=sharing',
};
const MARKET_TRENDS_CHART = {
  title: 'Market Trends Chart',
  url: 'https://colab.research.google.com/drive/1ZwnsQ1Be_VPs1Z086kwvzFflIxZY46R9?usp=sharing',
};
const SPORTS_COMPARISON_VISUALISER = {
  title: 'Sports Comparison Visualiser',
  url: 'https://colab.research.google.com/drive/1RcCBuPXHfMyJ_hoWpBdHmTAXL2XPDPcC?usp=sharing',
};
const HOUSE_PRICE_PREDICTOR = {
  title: 'House Price Predictor',
  url: 'https://colab.research.google.com/drive/1SPMH9HTmmYOHhlORUdJedz5GyOwbuPmp?usp=sharing',
};
const CUSTOMER_CHURN_PREDICTOR = {
  title: 'Customer Churn Predictor',
  url: 'https://colab.research.google.com/drive/1pItOS98TOpAKh74aVr3fbGRQOCCYNcgq?usp=sharing',
};
const MOVIE_RECOMMENDATION_ENGINE = {
  title: 'Movie Recommendation Engine',
  url: 'https://colab.research.google.com/drive/1JaYTWH4jMEOVQPfG0Te0wq_XX5LzviQU?usp=sharing',
};

const DATA_SCIENTIST_PROJECT_LINKS: Record<number, { title: string; url: string }[]> = {
  // python-for-data (lessons 1-8; 9 = Course Test)
  2: [SPORTS_PERFORMANCE_ANALYSIS],
  3: [SPORTS_PERFORMANCE_ANALYSIS],
  4: [SCHOOL_GRADE_ANALYSIS],
  5: [SCHOOL_GRADE_ANALYSIS],
  6: [CITY_POPULATION_TRENDS],
  7: [CITY_POPULATION_TRENDS],
  8: [SPORTS_PERFORMANCE_ANALYSIS, SCHOOL_GRADE_ANALYSIS, CITY_POPULATION_TRENDS],
  // data-visualisation (lessons 10-17; 18 = Course Test)
  11: [CLIMATE_CHANGE_DASHBOARD],
  12: [CLIMATE_CHANGE_DASHBOARD],
  13: [MARKET_TRENDS_CHART],
  14: [MARKET_TRENDS_CHART],
  15: [SPORTS_COMPARISON_VISUALISER],
  16: [SPORTS_COMPARISON_VISUALISER],
  17: [CLIMATE_CHANGE_DASHBOARD, MARKET_TRENDS_CHART, SPORTS_COMPARISON_VISUALISER],
  // machine-learning-projects (lessons 19-26; 27 = Course Test, 28 = Final Test)
  20: [HOUSE_PRICE_PREDICTOR],
  21: [HOUSE_PRICE_PREDICTOR],
  22: [CUSTOMER_CHURN_PREDICTOR],
  23: [CUSTOMER_CHURN_PREDICTOR],
  24: [MOVIE_RECOMMENDATION_ENGINE],
  25: [MOVIE_RECOMMENDATION_ENGINE],
  26: [HOUSE_PRICE_PREDICTOR, CUSTOMER_CHURN_PREDICTOR, MOVIE_RECOMMENDATION_ENGINE],
};

// ── Python Foundations: portfolio-project slots ─────────────────────────────
//
// The same shape as AI Builder and Data Scientist above: the two lessons of a project (2-3, 4-5 and
// 6-7 of each course) show the same project, lesson 8 (the review) shows all three, lesson 1 none.
// Each project is a Google Colab notebook (the .ipynb files in server/prisma/python-foundations/notebooks).
// Operations uploads them to Colab and pastes each link into the lesson from /admin/lessons/<id>/edit
// (the "Project" section), so the URL is deliberately EMPTY here: the lesson page shows the project
// card with "Open Project" and "Copy Link" disabled ("link coming soon") until a link is added. The
// title is already in place, so the admin only has to paste an address.
//
// Keyed by the lesson's absolute `order` in the 28-session course (Course 1 = 1-8 + Test 9,
// Course 2 = 10-17 + Test 18, Course 3 = 19-26 + Test 27, Final Test 28). The order of the projects
// inside a course is the order of `projects` in server/prisma/python-foundations/outline.ts.
const PF_SMART_CALCULATOR = { title: 'Smart Calculator', url: '' };
const PF_NUMBER_GUESSING_GAME = { title: 'Number Guessing Game', url: '' };
const PF_PYTHON_QUIZ_MASTER = { title: 'Python Quiz Master', url: '' };
const PF_TEXT_ADVENTURE_GAME = { title: 'Text-Based Adventure Game', url: '' };
const PF_LIBRARY_MANAGEMENT_SYSTEM = {
  title: 'Library Management System',
  url: '',
};
const PF_PERSONAL_EXPENSE_TRACKER = {
  title: 'Personal Expense Tracker',
  url: '',
};
const PF_STUDENT_LIFE_DATA_EXPLORER = {
  title: 'Student Life Data Explorer',
  url: '',
};
const PF_DATASET_EXPLORER = { title: 'Dataset Explorer', url: '' };
const PF_LIVE_DATA_EXPLORER = { title: 'Live Data Explorer', url: '' };

export const PYTHON_FOUNDATIONS_PROJECT_LINKS: Record<
  number,
  { title: string; url: string }[]
> = {
  // python-programming-essentials (lessons 1-8; 9 = Course Test)
  2: [PF_SMART_CALCULATOR],
  3: [PF_SMART_CALCULATOR],
  4: [PF_NUMBER_GUESSING_GAME],
  5: [PF_NUMBER_GUESSING_GAME],
  6: [PF_PYTHON_QUIZ_MASTER],
  7: [PF_PYTHON_QUIZ_MASTER],
  8: [PF_SMART_CALCULATOR, PF_NUMBER_GUESSING_GAME, PF_PYTHON_QUIZ_MASTER],
  // problem-solving-program-design (lessons 10-17; 18 = Course Test)
  11: [PF_TEXT_ADVENTURE_GAME],
  12: [PF_TEXT_ADVENTURE_GAME],
  13: [PF_LIBRARY_MANAGEMENT_SYSTEM],
  14: [PF_LIBRARY_MANAGEMENT_SYSTEM],
  15: [PF_PERSONAL_EXPENSE_TRACKER],
  16: [PF_PERSONAL_EXPENSE_TRACKER],
  17: [
    PF_TEXT_ADVENTURE_GAME,
    PF_LIBRARY_MANAGEMENT_SYSTEM,
    PF_PERSONAL_EXPENSE_TRACKER,
  ],
  // python-tools-data-foundations (lessons 19-26; 27 = Course Test, 28 = Final Test)
  20: [PF_STUDENT_LIFE_DATA_EXPLORER],
  21: [PF_STUDENT_LIFE_DATA_EXPLORER],
  22: [PF_DATASET_EXPLORER],
  23: [PF_DATASET_EXPLORER],
  24: [PF_LIVE_DATA_EXPLORER],
  25: [PF_LIVE_DATA_EXPLORER],
  26: [
    PF_STUDENT_LIFE_DATA_EXPLORER,
    PF_DATASET_EXPLORER,
    PF_LIVE_DATA_EXPLORER,
  ],
};

const PROJECT_LINKS_BY_COURSE_SLUG: Record<string, Record<number, { title: string; url: string }[]>> = {
  'ai-builder': AI_BUILDER_PROJECT_LINKS,
  'data-scientist': DATA_SCIENTIST_PROJECT_LINKS,
  'python-foundations': PYTHON_FOUNDATIONS_PROJECT_LINKS,
};

/** Read-time fallback for a pathway's project links, used by
 * CurriculumService wherever a Lesson is returned to the client
 * (getCatalogLessonDetails/getScheduledLessonDetails/
 * getDemoExampleLessonDetails) — so the correct project always shows up
 * immediately even on an environment whose backend hasn't rebooted (and
 * hence hasn't run backfillProjectLinks below) since this feature shipped,
 * without waiting on a restart. Only ever consulted when the lesson's own
 * stored projectLinks is null/undefined (see call sites) — an admin-set
 * value, including an intentionally-cleared `[]`, always wins. Returns null
 * for any course slug with no known mapping (every course besides the ones
 * explicitly listed above). */
export function getProjectLinksFallback(courseSlug: string, order: number): { title: string; url: string }[] | null {
  return PROJECT_LINKS_BY_COURSE_SLUG[canonicalCourseSlug(courseSlug)]?.[order] ?? null;
}

/** Idempotent, admin-safe: only ever fills in a lesson whose projectLinks is
 * still unset (null) — an admin who has since edited or cleared it (an
 * empty array, `[]`, counts as "set") is never overwritten on a later boot.
 * Runs unconditionally (unlike buildFreshStructure above) so it also
 * back-fills an already-seeded course, not just a fresh one. */
async function backfillProjectLinks(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
  courseSlug: string,
) {
  const map = PROJECT_LINKS_BY_COURSE_SLUG[canonicalCourseSlug(courseSlug)];
  if (!map) return;

  const course = await prisma.course.findFirst({
    where: { slug: { in: [canonicalCourseSlug(courseSlug), legacyCourseSlug(courseSlug)] } },
    select: { id: true },
  });
  if (!course) return;

  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id, order: { in: Object.keys(map).map(Number) } },
    select: { id: true, order: true, projectLinks: true },
  });

  let updated = 0;
  for (const lesson of lessons) {
    if (lesson.projectLinks !== null) continue;
    const links = map[lesson.order];
    if (!links) continue;
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { projectLinks: links as unknown as object },
    });
    updated++;
  }
  if (updated > 0) {
    logger.log(`[curriculum-seed] ${courseSlug}: backfilled projectLinks on ${updated} lesson(s).`);
  }
}

// ── Data Scientist Path: "Key Terminology" bullets -> table ─────────────────
//
// The source content renders a "## Key Terminology"/"### Key Terminology"
// section as a `- **Term**: definition` bullet list on 16 of this pathway's
// 24 learning lessons (the other 8, in data-visualisation, already use a
// table). Converts that bullet block into a real GFM table so it reads the
// same way the "Key Vocabulary" table does elsewhere — see
// SimpleMarkdown.tsx's table renderer on the client. Pure and idempotent: a
// no-op wherever the pattern isn't found (already a table, section missing,
// or an admin rewrote it into something else entirely), so it's safe to run
// on every read (see CurriculumService.tableizeContent) and as a one-time DB
// backfill (below) alike.
export function tableizeKeyTerminology(markdown: string): string {
  const lines = markdown.split('\n');
  const headingIdx = lines.findIndex((l) => /^#{2,3}\s+Key Terminology\s*$/.test(l.trim()));
  if (headingIdx === -1) return markdown;

  let i = headingIdx + 1;
  while (i < lines.length && lines[i].trim() === '') i++;

  // A short non-bullet line directly under the heading (e.g. a lesson-8
  // recap's "(Review from Lessons 1–7)") is kept as-is, ahead of the table,
  // rather than mistaken for the start of a definition list.
  let subtitle: string | null = null;
  if (i < lines.length && lines[i].trim() !== '' && !lines[i].trim().startsWith('-')) {
    subtitle = lines[i];
    i++;
  }

  // Greedy up to the LAST "**:" on the line — handles both a single bolded
  // term ("- **Term**: def") and a multi-term bullet ("- **A**, **B**: def",
  // used by one lesson-8 recap) the same way, keeping the term's own bold
  // markup intact for the table cell instead of re-wrapping it.
  const bulletRe = /^-\s+(.+)\*\*:\s*(.+)$/;
  const rows: { term: string; def: string }[] = [];
  while (i < lines.length) {
    const bulletMatch = lines[i].match(bulletRe);
    if (bulletMatch) {
      rows.push({ term: `${bulletMatch[1]}**`, def: bulletMatch[2] });
      i++;
    } else if (rows.length > 0 && lines[i].trim() !== '') {
      // Continuation of the previous bullet's definition, wrapped onto its
      // own line (source markdown wraps long definitions at ~80 columns).
      rows[rows.length - 1].def += ` ${lines[i].trim()}`;
      i++;
    } else {
      break;
    }
  }
  if (rows.length === 0) return markdown; // nothing to convert (already a table, or no bullets)

  const escapeCell = (s: string) => s.replace(/\|/g, '\\|');
  const table = [
    '| Term | Definition |',
    '|---|---|',
    ...rows.map((r) => `| ${escapeCell(r.term)} | ${escapeCell(r.def)} |`),
  ];

  return [
    ...lines.slice(0, headingIdx + 1),
    ...(subtitle !== null ? [subtitle] : []),
    '',
    ...table,
    ...lines.slice(i),
  ].join('\n');
}

/** One-time DB backfill counterpart to the read-time tableizeKeyTerminology
 * fallback (see CurriculumService.tableizeContent) — persists the converted
 * markdown for real so the admin editor's textarea shows (and future saves
 * keep) the table form rather than silently diverging from what's stored. */
async function backfillDataScientistKeyTerminologyTables(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
) {
  const course = await prisma.course.findFirst({
    where: { slug: { in: ['data-scientist', 'data-scientist-path'] } },
    select: { id: true },
  });
  if (!course) return;

  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id, type: SessionType.LEARNING },
    select: { id: true, contentMarkdown: true },
  });

  let updated = 0;
  for (const lesson of lessons) {
    if (!lesson.contentMarkdown) continue;
    const converted = tableizeKeyTerminology(lesson.contentMarkdown);
    if (converted === lesson.contentMarkdown) continue;
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { contentMarkdown: converted },
    });
    updated++;
  }
  if (updated > 0) {
    logger.log(`[curriculum-seed] data-scientist-path: tableized Key Terminology on ${updated} lesson(s).`);
  }
}

// ── Web Developer Path: real lesson material backfill ──────────────────────
//
// web-developer-path.json originally shipped with placeholder contentMarkdown
// stubs (a single short "## Learn" paragraph, ~250-750 chars) instead of real
// lesson material, unlike every other pathway (several thousand chars each).
// The JSON was later filled in with the full lesson content extracted from
// lumexa-all-lessons/web-developer, but seedCurriculumContent above leaves
// any course that already has its full module/lesson count alone — exactly
// the state every already-deployed environment is in — so updating the JSON
// alone never reaches an already-seeded DB. This mirrors backfillProjectLinks:
// runs unconditionally on every boot, and only ever replaces a lesson's
// contentMarkdown while it still looks like the old short stub (under
// WEB_DEVELOPER_STUB_MAX_LEN chars) — a lesson an admin has since hand-edited
// into something longer is left untouched. Also covers Lumexa Odyssey, which
// reuses this pathway's html-css-mastery and javascript-interactivity modules
// (see ODYSSEY_STAGES) as its own separate Lesson rows.
const WEB_DEVELOPER_STUB_MAX_LEN = 2000;

async function backfillWebDeveloperLessonContent(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
) {
  const raw = loadPathway('web-developer-path');
  const moduleSlugs = raw.modules.map((m) => m.slug);
  const contentByModuleAndTitle = new Map<string, string>();
  for (const mod of raw.modules) {
    for (const lesson of mod.lessons) {
      contentByModuleAndTitle.set(`${mod.slug}::${lesson.title}`, lesson.contentMarkdown);
    }
  }

  const courses = await prisma.course.findMany({
    where: { slug: { in: ['web-developer', 'web-developer-path', 'lumexa-odyssey'] } },
    select: { id: true, slug: true },
  });

  for (const course of courses) {
    const lessons = await prisma.lesson.findMany({
      where: {
        courseId: course.id,
        type: SessionType.LEARNING,
        module: { slug: { in: moduleSlugs } },
      },
      select: { id: true, title: true, contentMarkdown: true, module: { select: { slug: true } } },
    });

    let updated = 0;
    for (const lesson of lessons) {
      if (!lesson.module) continue;
      const newContent = contentByModuleAndTitle.get(`${lesson.module.slug}::${lesson.title}`);
      if (!newContent) continue;
      const current = lesson.contentMarkdown ?? '';
      if (current.length >= WEB_DEVELOPER_STUB_MAX_LEN || current === newContent) continue;
      // The replacement is the raw source text: reset the content version so the
      // cleanup (backfillLessonContent, below) runs over it.
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { contentMarkdown: newContent, contentVersion: 0 },
      });
      updated++;
    }
    if (updated > 0) {
      logger.log(`[curriculum-seed] ${course.slug}: backfilled full lesson material on ${updated} lesson(s).`);
    }
  }
}

// ── Retired "Path" naming on the default programs' Final Tests ─────────────
//
// Final Test lessons were seeded as "<Course title> — Final Test" while the
// course titles still ended in "Path" ("AI Builder Path — Final Test"). Lumexa
// has dropped that word from program names, so each default program's Final
// Test follows its course's current title. Exact-match only: a title an admin
// has since changed is left alone, and re-running is a no-op.
async function dropPathFromFinalTestTitles(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
) {
  const courses = await prisma.course.findMany({
    where: {
      slug: {
        in: [
          ...Object.keys(PATHWAY_SLUGS),
          ...Object.keys(PATHWAY_SLUGS).map(legacyCourseSlug),
        ],
      },
    },
    select: { id: true, title: true },
  });
  let fixed = 0;
  for (const c of courses) {
    const result = await prisma.lesson.updateMany({
      where: {
        courseId: c.id,
        type: SessionType.FINAL_TEST,
        title: `${c.title} Path — Final Test`,
      },
      data: { title: `${c.title} — Final Test` },
    });
    fixed += result.count;
  }
  if (fixed > 0) {
    logger.log(`[curriculum-seed] dropped "Path" from ${fixed} Final Test title(s).`);
  }
}

// ── Advanced Data Science: public program details ──────────────────────────
//
// The public site shows Advanced Data Science as a beginner program for ages
// 12–18 with five courses, as in lumexa-advanced-data-science-curriculum.pdf.
// The course was built by hand, so three details differ from that document:
// the age range is still the creation default (6–18), the first Course Test
// carries an older working name, and the Final Test was copied from another
// program. Each fix applies only while the value is still exactly the old one,
// so an admin's own later edit is never overwritten and re-running is a no-op.
async function backfillAdvancedDataScienceProgramDetails(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
) {
  const course = await prisma.course.findUnique({
    where: { slug: 'advanced-data-science' },
    select: { id: true, ageMin: true, ageMax: true },
  });
  if (!course) return;

  let fixed = 0;
  if (course.ageMin === 6 && course.ageMax === 18) {
    await prisma.course.update({
      where: { id: course.id },
      data: { ageMin: 12, ageMax: 18 },
    });
    fixed++;
  }

  const renames: { type: SessionType; from: string; to: string }[] = [
    {
      type: SessionType.COURSE_TEST,
      from: 'Python Fundamentals — Course Test',
      to: 'Python for Young Builders — Course Test',
    },
    {
      type: SessionType.FINAL_TEST,
      from: 'Data Scientist Path — Final Test',
      to: 'Advanced Data Science — Final Test',
    },
  ];
  for (const r of renames) {
    const result = await prisma.lesson.updateMany({
      where: { courseId: course.id, type: r.type, title: r.from },
      data: { title: r.to },
    });
    fixed += result.count;
  }
  if (fixed > 0) {
    logger.log(`[curriculum-seed] advanced-data-science: updated ${fixed} program detail(s).`);
  }
}

// ── Advanced Data Science (custom course): full lesson redesign ────────────
//
// "Advanced Data Science" (slug: advanced-data-science) is a one-off CUSTOM
// curriculum (Course.isCustom) an admin built via the Custom Curriculum
// Builder, importing lessons from little-coders-path's
// python-for-young-builders module (orders 1-8) and game-creator-path's
// python-arcade-games module (orders 10-17) — see lessonImportData in
// curriculum.service.ts. Unlike every pathway above, this course is never
// touched by the course loop in seedCurriculumContent (that only processes
// PATHWAY_SLUGS + lumexa-odyssey) and has no CourseModule of its own —
// custom course lessons are always flat, moduleId: null — so it needs its
// own direct, course-slug-scoped backfill, the same shape as
// backfillWebDeveloperLessonContent above. The little-coders-path/
// game-creator-path source JSON is deliberately left untouched: those
// modules still serve every other course/student using them unchanged.
// See advanced-data-science.content.ts for the actual replacement content
// (title/objectives/contentMarkdown/homework/checkpoint/codeSnippets/
// projectLinks per lesson) and why each one changed — including orders
// 11-16, reimagined as one cumulative "Cosmic Defender" Pygame project.
// Order 18 (Course Test) and orders 19-46 have no entry in that file and
// are therefore never touched here, left exactly as imported.
//
// Idempotent and admin-safe: each fix only applies while the lesson's
// CURRENT title still exactly matches one of its known prior (pre-this-fix)
// titles — so re-running this on every boot is a no-op once applied, and an
// admin who has since retitled a lesson by hand is never overwritten.
async function backfillAdvancedDataScience(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
) {
  const course = await prisma.course.findUnique({
    where: { slug: 'advanced-data-science' },
    select: { id: true },
  });
  if (!course) return;

  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id, order: { in: ADVANCED_DATA_SCIENCE_FIXES.map((f) => f.order) } },
    select: {
      id: true,
      order: true,
      title: true,
      objectives: true,
      contentMarkdown: true,
      homework: true,
      checkpoint: true,
      codeSnippets: true,
      projectLinks: true,
      teacherNotes: true,
      miniQuiz: true,
      visuals: true,
      sourceRefs: true,
      duration: true,
      contentVersion: true,
    },
  });
  const byOrder = new Map(lessons.map((l) => [l.order, l]));

  let updated = 0;
  for (const fix of ADVANCED_DATA_SCIENCE_FIXES) {
    const lesson = byOrder.get(fix.order);
    if (!lesson) continue;
    const titleMatches = Array.isArray(fix.matchTitle)
      ? fix.matchTitle.includes(lesson.title)
      : lesson.title === fix.matchTitle;
    if (!titleMatches) continue;
    // The redesign is applied in its CLEAN form (same cleanup as every lesson) and
    // only written when the stored row differs — so this no longer rewrites every
    // lesson on every boot, and never re-introduces duplicated sections.
    const data = upgradeAdvancedDataScienceFix(fix, lesson);
    if (!data) continue;
    await prisma.lesson.update({ where: { id: lesson.id }, data });
    updated++;
  }
  if (updated > 0) {
    logger.log(`[curriculum-seed] advanced-data-science: redesigned ${updated} lesson(s).`);
  }
}

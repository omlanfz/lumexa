// FILE PATH: server/src/courses/lesson-content.backfill.ts
//
// The idempotent backfill that brings every EXISTING learning lesson up to the
// structured content model (see server/src/curriculum/lesson-content): duplicate
// objectives / homework / banner / metadata removed, titles cleaned, teacher-only
// material moved out of student-facing text, text quizzes made interactive,
// "Lesson N" mentions linked, visuals added.
//
// It discovers courses and lessons from the database — no course, module, lesson
// id or lesson count is hard-coded:
//   * a lesson in a module is identified by (module slug, position in module);
//   * a lesson in a flat custom course inherits the identity of the lesson it was
//     imported from (sourceRefs.importedFromLessonId);
// and only that identity is used to look up the source dataset's instructor guide /
// quiz, and only when the stored lesson still matches that source — so an admin's
// redesign (e.g. Advanced Data Science) is never given another lesson's notes.
//
// Safe to run on every boot: a row already at CONTENT_VERSION is skipped, so an
// admin's later edits are never overwritten.

import { Prisma, PrismaClient, SessionType } from '@prisma/client';
import {
  CONTENT_VERSION,
  comparable,
  indexCourseLessons,
  persistedLineage,
  textSimilarity,
  upgradeLesson,
  type ChangeRecord,
  type IndexedLesson,
  type ReviewRecord,
  type UpgradeResult,
} from '../curriculum/lesson-content';
import { getSourceIndex, type SourceLesson } from './curriculum-source';
import type { AdvancedDataScienceLessonFix } from './advanced-data-science.content';

type Logger = { log: (msg: string) => void; warn: (msg: string) => void };

export interface LessonUpgradeEntry {
  lessonId: string;
  courseSlug: string;
  courseTitle: string;
  order: number;
  title: string;
  moduleSlug: string | null;
  lineage: string | null;
  result: UpgradeResult;
  currentCheckpoint: string | null;
  project: { id: string; title: string; description: string | null } | null;
  sourceRefs: unknown;
}

function importedFrom(sourceRefs: unknown): string | null {
  if (sourceRefs && typeof sourceRefs === 'object') {
    const id = (sourceRefs as { importedFromLessonId?: unknown }).importedFromLessonId;
    if (typeof id === 'string') return id;
  }
  return null;
}

/** Is the stored lesson still (essentially) the source lesson, not a redesign of it? */
function matchesSource(row: { contentMarkdown: string | null; objectives: string[] }, src: SourceLesson): boolean {
  const a = (row.contentMarkdown ?? '').slice(0, 1500);
  if (a !== '' && textSimilarity(a, src.contentMarkdown.slice(0, 1500)) >= 0.6) return true;
  return !!src.firstObjective && !!row.objectives[0] && comparable(row.objectives[0]) === comparable(src.firstObjective);
}

/**
 * Works out the upgrade for every lesson that needs one, without writing anything
 * (used by the boot backfill and by the dry-run report script).
 */
export async function planLessonUpgrades(prisma: PrismaClient, opts: { force?: boolean } = {}): Promise<LessonUpgradeEntry[]> {
  const rows = await prisma.lesson.findMany({
    where: { type: SessionType.LEARNING, ...(opts.force ? {} : { contentVersion: { lt: CONTENT_VERSION } }) },
    select: {
      id: true,
      courseId: true,
      moduleId: true,
      title: true,
      order: true,
      type: true,
      duration: true,
      objectives: true,
      contentMarkdown: true,
      homework: true,
      teacherNotes: true,
      miniQuiz: true,
      visuals: true,
      contentVersion: true,
      sourceRefs: true,
      checkpoint: true,
      course: { select: { slug: true, title: true } },
      module: { select: { slug: true, title: true } },
      project: { select: { id: true, title: true, description: true } },
    },
    orderBy: [{ courseId: 'asc' }, { order: 'asc' }],
  });
  if (rows.length === 0) return [];

  // Everything needed to number lessons and trace imports: the lessons' own courses
  // plus the courses their sources live in.
  const importedIds = rows.map((r) => (r.moduleId ? null : importedFrom(r.sourceRefs))).filter((x): x is string => !!x);
  const sources = importedIds.length
    ? await prisma.lesson.findMany({ where: { id: { in: importedIds } }, select: { id: true, courseId: true } })
    : [];
  const courseIds = [...new Set([...rows.map((r) => r.courseId), ...sources.map((r) => r.courseId)])];
  const all = await prisma.lesson.findMany({
    where: { courseId: { in: courseIds } },
    select: {
      id: true,
      courseId: true,
      order: true,
      type: true,
      title: true,
      moduleId: true,
      sourceRefs: true,
      module: { select: { id: true, slug: true, title: true, stageNumber: true } },
    },
  });
  const grouped = new Map<string, typeof all>();
  for (const l of all) grouped.set(l.courseId, [...(grouped.get(l.courseId) ?? []), l]);
  const indexByCourse = new Map<string, IndexedLesson[]>();
  const lineageById = new Map<string, string | null>();
  for (const [courseId, list] of grouped) {
    const idx = indexCourseLessons(list);
    indexByCourse.set(courseId, idx);
    idx.forEach((l) => lineageById.set(l.id, l.lineage));
  }

  const sourceIndex = getSourceIndex();
  return rows.map((r) => {
    const idx = indexByCourse.get(r.courseId)?.find((x) => x.id === r.id);
    const importedId = r.moduleId ? null : importedFrom(r.sourceRefs);
    const lineageOverride = importedId ? (lineageById.get(importedId) ?? null) : null;
    const lineage = persistedLineage(r.sourceRefs) ?? lineageOverride ?? idx?.lineage ?? null;
    const src = lineage ? sourceIndex.get(lineage) : undefined;
    const matches = !!src && matchesSource(r, src);
    const result = upgradeLesson({
      row: {
        id: r.id,
        title: r.title,
        type: r.type,
        objectives: r.objectives,
        contentMarkdown: r.contentMarkdown,
        homework: r.homework,
        teacherNotes: r.teacherNotes,
        miniQuiz: r.miniQuiz,
        visuals: r.visuals,
        contentVersion: r.contentVersion,
        sourceRefs: r.sourceRefs,
        duration: r.duration,
      },
      courseTitle: r.course.title,
      module: r.module,
      positionInGroup: idx?.lessonIndex ?? 1,
      groupSize: idx?.lessonTotal ?? 1,
      lineageOverride,
      // Source enrichment (instructor guide, quiz, module size) only while the lesson
      // still is that source lesson; a redesigned lesson gets neither another lesson's
      // notes nor "Lesson N" links to a numbering it does not follow.
      source: src && matches ? { teacherNotes: src.teacherNotes, miniQuiz: src.miniQuiz, moduleLessonCount: src.moduleLessonCount } : null,
      force: opts.force,
    });
    return {
      lessonId: r.id,
      courseSlug: r.course.slug,
      courseTitle: r.course.title,
      order: r.order,
      title: r.title,
      moduleSlug: r.module?.slug ?? null,
      lineage,
      result,
      currentCheckpoint: r.checkpoint,
      project: r.project,
      sourceRefs: r.sourceRefs,
    };
  });
}

/** What needs a person: review items worth persisting on the lesson. */
export function reviewItemsToKeep(review: ReviewRecord[]): { kind: string; detail: string }[] {
  return review
    .filter((r) => r.kind !== 'quiz-answer-bias' && r.kind !== 'metadata-mismatch')
    .map((r) => ({ kind: r.kind, detail: r.detail }));
}

/** Writes one planned upgrade (lesson + the project/checkpoint text derived from its old title). */
export async function applyLessonUpgrade(prisma: PrismaClient, e: LessonUpgradeEntry): Promise<void> {
  const patch = e.result.patch;
  if (!patch) return;
  const { sourceRefs, miniQuiz, visuals, ...plain } = patch;
  const data: Prisma.LessonUpdateInput = { ...plain };
  if (miniQuiz) data.miniQuiz = miniQuiz as Prisma.InputJsonValue;
  if (visuals) data.visuals = visuals as Prisma.InputJsonValue;

  // Review items are kept on the lesson so an admin can see what needs attention.
  const keep = reviewItemsToKeep(e.result.review);
  const refsBase = (sourceRefs ?? (e.sourceRefs && typeof e.sourceRefs === 'object' && !Array.isArray(e.sourceRefs) ? e.sourceRefs : {})) as Record<string, unknown>;
  if (sourceRefs || keep.length > 0) {
    data.sourceRefs = (keep.length > 0 ? { ...refsBase, contentReview: keep } : refsBase) as Prisma.InputJsonValue;
  }

  // A cleaned title must also reach the checkpoint text and embedded project that quoted the old one.
  const oldTitle = e.title;
  if (patch.title && patch.title !== oldTitle) {
    if (e.currentCheckpoint?.includes(oldTitle)) data.checkpoint = e.currentCheckpoint.split(oldTitle).join(patch.title);
  }
  await prisma.$transaction(async (tx) => {
    await tx.lesson.update({ where: { id: e.lessonId }, data });
    if (patch.title && patch.title !== oldTitle && e.project && e.project.title.includes(oldTitle)) {
      await tx.project.update({
        where: { id: e.project.id },
        data: {
          title: e.project.title.split(oldTitle).join(patch.title),
          ...(e.project.description?.includes(oldTitle) ? { description: e.project.description.split(oldTitle).join(patch.title) } : {}),
        },
      });
    }
  });
}

export interface BackfillSummary {
  inspected: number;
  upgraded: number;
  changed: number;
  byKind: Record<string, number>;
  flagged: { courseTitle: string; order: number; title: string; items: ReviewRecord[] }[];
}

/** Boot-time entry point (see seedCurriculumContent). */
export async function backfillLessonContent(prisma: PrismaClient, logger: Logger): Promise<BackfillSummary> {
  const plan = await planLessonUpgrades(prisma);
  const summary: BackfillSummary = { inspected: plan.length, upgraded: 0, changed: 0, byKind: {}, flagged: [] };
  const versionOnly: string[] = [];

  for (const e of plan) {
    const patch = e.result.patch;
    if (!patch) continue;
    const meaningful = Object.keys(patch).some((k) => k !== 'contentVersion') || reviewItemsToKeep(e.result.review).length > 0;
    try {
      if (meaningful) {
        await applyLessonUpgrade(prisma, e);
        summary.changed++;
        for (const c of e.result.changes as ChangeRecord[]) summary.byKind[c.kind] = (summary.byKind[c.kind] ?? 0) + 1;
      } else {
        versionOnly.push(e.lessonId);
      }
      summary.upgraded++;
      const items = reviewItemsToKeep(e.result.review);
      if (items.length > 0) summary.flagged.push({ courseTitle: e.courseTitle, order: e.order, title: patch.title ?? e.title, items: e.result.review.filter((r) => items.some((i) => i.kind === r.kind && i.detail === r.detail)) });
    } catch (err) {
      logger.warn(`[curriculum-seed] Could not upgrade lesson ${e.lessonId} (${e.courseSlug} #${e.order}): ${(err as Error).message}`);
    }
  }
  if (versionOnly.length > 0) {
    await prisma.lesson.updateMany({ where: { id: { in: versionOnly } }, data: { contentVersion: CONTENT_VERSION } });
  }

  if (summary.upgraded > 0) {
    const kinds = Object.entries(summary.byKind).map(([k, n]) => `${k} ${n}`).join(', ');
    logger.log(`[curriculum-seed] lesson content: upgraded ${summary.upgraded} learning lesson(s) to content version ${CONTENT_VERSION} (${summary.changed} rewritten${kinds ? `: ${kinds}` : ''}).`);
    if (summary.flagged.length > 0) {
      logger.warn(`[curriculum-seed] lesson content: ${summary.flagged.length} lesson(s) need a manual look (kept on the lesson as sourceRefs.contentReview):`);
      for (const f of summary.flagged.slice(0, 40)) {
        logger.warn(`  · ${f.courseTitle} #${f.order} "${f.title}": ${f.items.map((i) => `[${i.kind}] ${i.detail}`).join(' | ').slice(0, 300)}`);
      }
      if (summary.flagged.length > 40) logger.warn(`  … and ${summary.flagged.length - 40} more.`);
    }
  }
  return summary;
}

// ─── Advanced Data Science: re-asserting hand-written content, cleaned ──────

type StoredLesson = {
  title: string;
  objectives: string[];
  contentMarkdown: string | null;
  homework: string | null;
  checkpoint: string | null;
  codeSnippets: unknown;
  projectLinks: unknown;
  teacherNotes: string | null;
  miniQuiz: unknown;
  visuals: unknown;
  sourceRefs: unknown;
  duration: number | null;
  contentVersion: number;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * The update that makes a stored Advanced Data Science lesson match its hand-written
 * redesign (advanced-data-science.content.ts) in CLEAN form, or null when it already
 * does. The redesign text is run through the same cleanup as every other lesson, so
 * re-asserting it on each boot neither re-introduces duplicated sections nor
 * rewrites a row that is already right. Structured fields (quiz, teacher notes,
 * visuals) are only ever filled in while empty — never overwritten.
 */
export function upgradeAdvancedDataScienceFix(
  fix: AdvancedDataScienceLessonFix,
  lesson: StoredLesson,
): Prisma.LessonUpdateInput | null {
  const res = upgradeLesson({
    row: {
      id: 'ads',
      title: fix.title ?? lesson.title,
      type: 'LEARNING',
      objectives: fix.objectives,
      contentMarkdown: fix.contentMarkdown,
      homework: fix.homework,
      teacherNotes: null,
      miniQuiz: null,
      visuals: null,
      contentVersion: 0,
      sourceRefs: lesson.sourceRefs,
      duration: lesson.duration,
    },
    courseTitle: null,
    module: null,
    positionInGroup: 1,
    groupSize: 1,
    force: true,
  });
  const p = res.patch;
  const title = p?.title ?? fix.title ?? lesson.title;
  const objectives = p?.objectives ?? fix.objectives;
  const contentMarkdown = p && p.contentMarkdown !== undefined ? p.contentMarkdown : fix.contentMarkdown;
  const homework = p && p.homework !== undefined ? p.homework : fix.homework;

  const data: Prisma.LessonUpdateInput = {};
  if (title !== lesson.title) data.title = title;
  if (!same(objectives, lesson.objectives)) data.objectives = objectives;
  if (contentMarkdown !== lesson.contentMarkdown) data.contentMarkdown = contentMarkdown;
  if (homework !== lesson.homework) data.homework = homework;
  if (fix.checkpoint !== undefined && fix.checkpoint !== lesson.checkpoint) data.checkpoint = fix.checkpoint;
  if (!same(fix.codeSnippets, lesson.codeSnippets)) data.codeSnippets = fix.codeSnippets as unknown as Prisma.InputJsonValue;
  if (!same(fix.projectLinks, lesson.projectLinks)) data.projectLinks = fix.projectLinks as unknown as Prisma.InputJsonValue;

  if ((lesson.miniQuiz === null || lesson.miniQuiz === undefined) && p?.miniQuiz) data.miniQuiz = p.miniQuiz as Prisma.InputJsonValue;
  if (lesson.teacherNotes === null && p?.teacherNotes) data.teacherNotes = p.teacherNotes;
  if ((lesson.visuals === null || lesson.visuals === undefined) && p?.visuals) data.visuals = p.visuals as Prisma.InputJsonValue;
  if (Object.keys(data).length === 0) return null;
  data.contentVersion = CONTENT_VERSION;
  return data;
}

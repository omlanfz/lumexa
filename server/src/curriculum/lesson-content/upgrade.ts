// FILE PATH: server/src/curriculum/lesson-content/upgrade.ts
//
// Brings one stored lesson up to the current content model: cleanup, lineage,
// structured quiz / teacher notes, visuals. Pure — takes the row and its context,
// returns a patch (or null when there is nothing to do) plus a report — so the
// same code serves a fresh seed, the idempotent backfill of existing rows and the
// dry-run report.
//
// Gated by `contentVersion`: once a row has been upgraded it is never touched by a
// later boot, so an admin's own edits are never overwritten. A future release that
// adds content bumps CONTENT_VERSION and ships only the additions.

import { cleanLesson } from './cleaner';
import { lineageKey, parseLineageKey } from './refs';
import { persistedLineage } from './numbering';
import './catalog';
import { catalogFor, catalogForTitle } from './visual-catalog';
import { quizCatalogFor } from './quiz-catalog';
import { addQuizPlaceholder } from './quiz-extract';
import { normalizeQuiz } from './quiz';
import { extractVisualIds, normalizeVisuals, placeVisuals } from './visuals';
import { readQuiz } from './serialize';
import type { ChangeRecord, LessonContentFields, LessonVisual, ReviewRecord, SourceQuizQuestion } from './types';

/** Version of the structured-content backfill. Bump when a release adds content. */
export const CONTENT_VERSION = 1;

export interface UpgradeInput {
  row: {
    id: string;
    title: string;
    type: string;
    objectives: string[];
    contentMarkdown: string | null;
    homework: string | null;
    teacherNotes: string | null;
    miniQuiz: unknown;
    visuals: unknown;
    contentVersion: number;
    sourceRefs: unknown;
    duration: number | null;
  };
  courseTitle: string | null;
  module: { slug: string; title: string } | null;
  /** 1-based position among the learning lessons of this lesson's module (or course). */
  positionInGroup: number;
  /** Learning lessons in that module (or course). */
  groupSize: number;
  /** Source dataset enrichment, matched by lineage. */
  source?: { teacherNotes?: string | null; miniQuiz?: SourceQuizQuestion[] | null; moduleLessonCount?: number } | null;
  /** Lineage inherited from the lesson this one was imported from (a flat custom-course lesson). */
  lineageOverride?: string | null;
  /** Force an upgrade even when the row is already at CONTENT_VERSION (dry runs / the CLI). */
  force?: boolean;
}

export interface UpgradePatch {
  title?: string;
  objectives?: string[];
  contentMarkdown?: string | null;
  homework?: string | null;
  teacherNotes?: string | null;
  miniQuiz?: unknown;
  visuals?: unknown;
  sourceRefs?: Record<string, unknown>;
  contentVersion: number;
}

export interface UpgradeResult {
  patch: UpgradePatch | null;
  changes: ChangeRecord[];
  review: ReviewRecord[];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function upgradeLesson(input: UpgradeInput): UpgradeResult {
  const { row } = input;
  if (row.type !== 'LEARNING') return { patch: null, changes: [], review: [] };
  if (!input.force && row.contentVersion >= CONTENT_VERSION) return { patch: null, changes: [], review: [] };

  // Lineage: where this lesson's content originated (travels with copies).
  const stored = persistedLineage(row.sourceRefs);
  const lineage = stored ?? input.lineageOverride ?? (input.module ? lineageKey(input.module.slug, input.positionInGroup) : null);
  const parsed = lineage ? parseLineageKey(lineage) : null;
  const lineageModule = parsed?.moduleSlug ?? null;
  const lineagePosition = parsed?.position ?? null;
  const moduleLessonCount = input.source?.moduleLessonCount ?? (input.module ? input.groupSize : null);

  const before: LessonContentFields = {
    title: row.title,
    objectives: row.objectives ?? [],
    contentMarkdown: row.contentMarkdown,
    homework: row.homework,
    teacherNotes: row.teacherNotes,
    miniQuiz: row.miniQuiz === null || row.miniQuiz === undefined ? null : readQuiz(row.miniQuiz),
    visuals: row.visuals === null || row.visuals === undefined ? null : normalizeVisuals(row.visuals).visuals,
  };

  const cleaned = cleanLesson(before, {
    courseTitle: input.courseTitle,
    moduleTitle: input.module?.title ?? null,
    duration: row.duration,
    positionInModule: lineagePosition ?? input.positionInGroup,
    moduleLessonCount,
    lineageModule,
    sourceTeacherNotes: input.source?.teacherNotes ?? null,
    sourceQuiz: input.source?.miniQuiz ?? null,
  });
  const changes = [...cleaned.changes];
  const review = [...cleaned.review];
  const f = cleaned.fields;

  let markdown = f.contentMarkdown;
  let quiz = f.miniQuiz;

  // A lesson whose source has no quiz gets the authored self-check from the quiz catalog (if there is one).
  if ((quiz === null || quiz.length === 0) && markdown !== null && (row.miniQuiz === null || row.miniQuiz === undefined)) {
    const authored = lineage ? quizCatalogFor(lineage) : null;
    if (authored) {
      const norm = normalizeQuiz(authored);
      if (norm.errors.length === 0 && norm.quiz.length > 0) {
        quiz = norm.quiz;
        markdown = addQuizPlaceholder(markdown);
        changes.push({ kind: 'quiz-authored', detail: `This lesson had no quiz; added a ${quiz.length}-question knowledge check.` });
      } else {
        review.push({ kind: 'content-quality', detail: `The authored quiz for ${lineage} is invalid: ${norm.errors.join(' ')}` });
      }
    }
  }

  // Visuals from the catalog (only for a lesson that has never been given any).
  let visuals: LessonVisual[] | null = before.visuals;
  if (visuals === null && markdown !== null) {
    // A title-specific entry (a redesigned custom lesson) wins over the lineage entry, which is
    // written for the original wording; otherwise the lesson inherits its lineage's visuals.
    const byTitle = catalogForTitle(f.title);
    const entries = byTitle.length > 0 ? byTitle : lineage ? catalogFor(lineage) : [];
    if (entries.length > 0) {
      const res = placeVisuals(markdown, entries.map((e) => ({ id: e.visual.id, ...e.placement })));
      markdown = res.markdown;
      // Only the visuals that actually landed in the text are stored with the lesson.
      const placedIds = new Set([...res.placed, ...extractVisualIds(markdown)]);
      visuals = entries.map((e) => e.visual).filter((v) => placedIds.has(v.id));
      changes.push({ kind: 'visuals-assigned', detail: `Added ${visuals.length} visual(s): ${visuals.map((v) => v.id).join(', ')}.` });
      if (res.moved.length > 0) changes.push({ kind: 'visuals-assigned', detail: `Visual(s) ${res.moved.join(', ')} were placed in the main explanation section because the lesson no longer has their original heading.` });
      if (res.unplaced.length > 0) review.push({ kind: 'content-quality', detail: `Visual(s) ${res.unplaced.join(', ')} could not be placed: the lesson has no sections.` });
    }
  }

  const patch: UpgradePatch = { contentVersion: CONTENT_VERSION };
  if (f.title !== row.title) patch.title = f.title;
  if (!same(f.objectives, row.objectives ?? [])) patch.objectives = f.objectives;
  if (markdown !== row.contentMarkdown) patch.contentMarkdown = markdown;
  if (f.homework !== row.homework) patch.homework = f.homework;
  if (f.teacherNotes !== row.teacherNotes) patch.teacherNotes = f.teacherNotes;
  if (quiz !== null && quiz.length > 0 && (row.miniQuiz === null || row.miniQuiz === undefined)) patch.miniQuiz = quiz;
  if (visuals !== null && (row.visuals === null || row.visuals === undefined)) patch.visuals = visuals;
  if (lineage && lineage !== stored) {
    const refs = row.sourceRefs && typeof row.sourceRefs === 'object' && !Array.isArray(row.sourceRefs) ? (row.sourceRefs as Record<string, unknown>) : {};
    patch.sourceRefs = { ...refs, lineageKey: lineage };
    changes.push({ kind: 'lineage-set', detail: `Recorded lineage ${lineage}.` });
  }
  return { patch, changes, review };
}

/** Does the patch change anything besides the version stamp? */
export function patchIsMeaningful(p: UpgradePatch | null): boolean {
  if (!p) return false;
  return Object.keys(p).some((k) => k !== 'contentVersion');
}

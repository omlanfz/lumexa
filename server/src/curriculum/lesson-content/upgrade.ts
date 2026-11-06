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
// adds content bumps CONTENT_VERSION and ships only the additions:
//   1 = cleanup, structured quiz, teacher notes, visuals;
//   2 = every quiz question is four-option multiple choice (quiz-mcq.ts). A row already at 1
//       gets ONLY that quiz conversion — nothing else about it is touched.

import { cleanLesson } from './cleaner';
import { lineageKey, parseLineageKey } from './refs';
import { persistedLineage } from './numbering';
import './catalog';
import { catalogFor, catalogForTitle } from './visual-catalog';
import { quizCatalogFor } from './quiz-catalog';
import { addQuizPlaceholder } from './quiz-extract';
import { normalizeQuiz } from './quiz';
import { DISCUSSION_HEADING, conformQuiz, discussionSection, type Leftover } from './quiz-mcq';
import { extractVisualIds, normalizeVisuals, placeVisuals } from './visuals';
import type { ChangeRecord, LessonContentFields, LessonVisual, QuizQuestion, ReviewRecord, SourceQuizQuestion } from './types';

/** Version of the structured-content backfill. Bump when a release adds content. */
export const CONTENT_VERSION = 2;

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

/** Keeps the questions that could not become multiple choice, for the teacher, in the teacher notes. */
export function appendDiscussion(notes: string | null, leftover: Leftover[]): string | null {
  if (leftover.length === 0) return notes;
  const base = (notes ?? '').trimEnd();
  if (base.includes(DISCUSSION_HEADING)) {
    const fresh = leftover.filter((l) => !base.includes(l.prompt));
    return fresh.length === 0 ? notes : `${base}\n${fresh.map((l) => `- ${l.prompt}`).join('\n')}`;
  }
  return [base, discussionSection(leftover)].filter((x) => x !== '').join('\n\n');
}

/** The authored quiz for a lineage, validated (it is data in this repo, but never trusted blindly). */
function authoredQuiz(lineage: string | null, review: ReviewRecord[]) {
  const authored = lineage ? quizCatalogFor(lineage) : null;
  if (!authored) return null;
  const norm = normalizeQuiz(authored);
  if (norm.errors.length > 0 || norm.quiz.length === 0) {
    review.push({ kind: 'content-quality', detail: `The authored quiz for ${lineage} is invalid: ${norm.errors.join(' ')}` });
    return null;
  }
  return norm.quiz;
}

/**
 * A row already at content version 1 has been cleaned, given its visuals and notes, and may
 * have been edited since. All it needs now is its quiz brought up to the multiple-choice rule —
 * so that, and nothing else, is what this changes.
 */
function upgradeQuizOnly(input: UpgradeInput, lineage: string | null): UpgradeResult {
  const { row } = input;
  const review: ReviewRecord[] = [];
  const authored = authoredQuiz(lineage, review);
  const conformed = conformQuiz(row.miniQuiz, { lineage, title: row.title, authored });
  const patch: UpgradePatch = { contentVersion: CONTENT_VERSION };
  if (conformed.changed) patch.miniQuiz = conformed.quiz;
  if (conformed.leftover.length > 0) {
    const notes = appendDiscussion(row.teacherNotes, conformed.leftover);
    if (notes !== row.teacherNotes) patch.teacherNotes = notes;
  }
  return { patch, changes: conformed.changes, review: [...review, ...conformed.review] };
}

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

  // Already cleaned and enriched by the first release: only the quiz needs bringing up to the rule.
  if (!input.force && row.contentVersion === 1) return upgradeQuizOnly(input, lineage);

  const before: LessonContentFields = {
    title: row.title,
    objectives: row.objectives ?? [],
    contentMarkdown: row.contentMarkdown,
    homework: row.homework,
    teacherNotes: row.teacherNotes,
    // The stored quiz as it is (it may hold older question shapes); quiz-mcq.ts brings it up to the rule below.
    miniQuiz: Array.isArray(row.miniQuiz) ? (row.miniQuiz as QuizQuestion[]) : null,
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
  let teacherNotes = f.teacherNotes;

  // EVERY quiz question is four-option multiple choice. What was extracted or stored in an older
  // shape is converted (authored rewrites first); what cannot be is kept for the teacher.
  const authored = authoredQuiz(lineage, review);
  const conformed = conformQuiz(f.miniQuiz, { lineage, title: f.title, authored });
  changes.push(...conformed.changes);
  review.push(...conformed.review);
  let quiz = conformed.quiz;
  if (conformed.leftover.length > 0) teacherNotes = appendDiscussion(teacherNotes, conformed.leftover);

  // A lesson whose source has no quiz gets the authored knowledge check from the quiz catalog (if there is one).
  if (quiz.length === 0 && markdown !== null && (row.miniQuiz === null || row.miniQuiz === undefined) && authored) {
    quiz = authored;
    markdown = addQuizPlaceholder(markdown);
    changes.push({ kind: 'quiz-authored', detail: `This lesson had no quiz; added a ${quiz.length}-question knowledge check.` });
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
  if (teacherNotes !== row.teacherNotes) patch.teacherNotes = teacherNotes;
  if (row.miniQuiz === null || row.miniQuiz === undefined) {
    if (quiz.length > 0) patch.miniQuiz = quiz;
  } else if (conformed.changed) {
    patch.miniQuiz = quiz;
  }
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

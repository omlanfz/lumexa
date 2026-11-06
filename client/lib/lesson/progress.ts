// FILE PATH: client/lib/lesson/progress.ts
//
// How far a student is through a lesson. Four separate things, never blurred:
//   read       — sections they have actually read (reached the end of, and stayed);
//   activities — interactive blocks they have used;
//   quiz       — the Mini Quiz answered through to the end;
//   homework   — a submission exists (read from the real homework record).
//
// Opening a lesson counts for nothing, and a lesson is only "complete" when EVERY
// part that applies to it is done. This is study progress only: it awards nothing
// and is not part of gems, ranks, streaks or badges.

import type { ProgressView } from './types';

export interface LocalProgress {
  sectionsRead: string[];
  activitiesDone: string[];
}

export const emptyProgress = (): LocalProgress => ({ sectionsRead: [], activitiesDone: [] });

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

export function mergeProgress(a: LocalProgress, b: Partial<LocalProgress> | null | undefined): LocalProgress {
  return { sectionsRead: union(a.sectionsRead, b?.sectionsRead ?? []), activitiesDone: union(a.activitiesDone, b?.activitiesDone ?? []) };
}

export function parseStored(raw: string | null): LocalProgress {
  if (!raw) return emptyProgress();
  try {
    const v = JSON.parse(raw) as Partial<LocalProgress>;
    const ids = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string').slice(0, 80) : []);
    return { sectionsRead: ids(v.sectionsRead), activitiesDone: ids(v.activitiesDone) };
  } catch {
    return emptyProgress();
  }
}

export interface PartStatus {
  done: number;
  total: number;
}

export interface Completion {
  /** 0–100 over the parts that apply. */
  percent: number;
  read: PartStatus;
  /** null when the lesson has no interactive activities. */
  activities: PartStatus | null;
  /** null when the lesson has no quiz. */
  quiz: { done: boolean; answered: number; total: number } | null;
  /** null when the lesson has no homework. */
  homework: { submitted: boolean } | null;
  /** Every applicable part is finished. */
  complete: boolean;
}

const WEIGHTS = { read: 40, activities: 15, quiz: 25, homework: 20 } as const;

export function lessonCompletion(input: {
  sectionIds: string[];
  activityIds: string[];
  progress: LocalProgress;
  quiz: ProgressView['quiz'] | null;
  hasQuiz: boolean;
  hasHomework: boolean;
  homeworkSubmitted: boolean;
}): Completion {
  const readSet = new Set(input.progress.sectionsRead);
  const actSet = new Set(input.progress.activitiesDone);
  const read = { done: input.sectionIds.filter((id) => readSet.has(id)).length, total: input.sectionIds.length };
  const activities = input.activityIds.length > 0 ? { done: input.activityIds.filter((id) => actSet.has(id)).length, total: input.activityIds.length } : null;
  const quiz = input.hasQuiz ? { done: !!input.quiz?.completed, answered: input.quiz?.answered ?? 0, total: input.quiz?.total ?? 0 } : null;
  const homework = input.hasHomework ? { submitted: input.homeworkSubmitted } : null;

  let weight = 0;
  let earned = 0;
  const add = (w: number, fraction: number) => {
    weight += w;
    earned += w * Math.max(0, Math.min(1, fraction));
  };
  if (read.total > 0) add(WEIGHTS.read, read.done / read.total);
  if (activities) add(WEIGHTS.activities, activities.done / activities.total);
  if (quiz) add(WEIGHTS.quiz, quiz.done ? 1 : quiz.total > 0 ? (quiz.answered / quiz.total) * 0.8 : 0);
  if (homework) add(WEIGHTS.homework, homework.submitted ? 1 : 0);

  const complete =
    (read.total === 0 || read.done === read.total) &&
    (!activities || activities.done === activities.total) &&
    (!quiz || quiz.done) &&
    (!homework || homework.submitted);
  return { percent: weight === 0 ? 0 : Math.round((earned / weight) * 100), read, activities, quiz, homework, complete: complete && weight > 0 };
}

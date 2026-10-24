// FILE PATH: client/lib/assessment/classProgress.ts
//
// What the teacher's class monitor derives from the server's overview: how many
// learners are where, what "lock all" is about to do (shown before they confirm),
// and how to word what it did. No React, no DOM.

import { elapsedMs } from './clock.ts';
import type { ClassTestStudent, LockClassResponse, LockResult } from './types.ts';

export interface ClassSummary {
  total: number;
  notStarted: number;
  inProgress: number;
  /** Handed in (by the learner or through the teacher's lock). */
  submitted: number;
  /** The teacher closed the test before this learner started it. */
  closed: number;
  /** Learners the lock-all button would still change. */
  needsLock: number;
}

export function summarizeClass(students: ClassTestStudent[]): ClassSummary {
  const count = (state: ClassTestStudent['state']) => students.filter((s) => s.state === state).length;
  const notStarted = count('NOT_STARTED');
  const inProgress = count('IN_PROGRESS');
  return {
    total: students.length,
    notStarted,
    inProgress,
    submitted: count('SUBMITTED'),
    closed: count('CLOSED'),
    needsLock: notStarted + inProgress,
  };
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function percent(answered: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((answered / total) * 100)));
}

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

/** The short status word shown on a learner's card. */
export function studentBadge(s: ClassTestStudent): { label: string; tone: BadgeTone } {
  switch (s.state) {
    case 'NOT_STARTED':
      return { label: 'Not started', tone: 'neutral' };
    case 'IN_PROGRESS':
      return { label: 'In progress', tone: 'info' };
    case 'SUBMITTED':
      return s.attempt?.lockedAt ? { label: 'Locked & submitted', tone: 'success' } : { label: 'Submitted', tone: 'success' };
    case 'CLOSED':
      return { label: 'Test closed', tone: 'warning' };
  }
}

/** Time on the test: running for someone still working, final for someone done,
 *  nothing for someone who has not started. */
export function studentElapsedMs(s: ClassTestStudent, now: number, offsetMs: number): number | null {
  const a = s.attempt;
  if (!a) return null;
  return elapsedMs(a.startedAt, now, offsetMs, s.state === 'SUBMITTED' ? a.submittedAt : null);
}

export interface LockAllPreview {
  /** Working now: submitted with what they have saved. */
  submitNow: { name: string; answered: number; total: number }[];
  /** Not started: they will no longer be able to start. */
  closeNow: string[];
  /** Already handed in or already closed: nothing changes. */
  unchanged: number;
}

/** What pressing "lock all" will do, learner by learner — shown in the
 *  confirmation so nothing about it is a surprise. */
export function previewLockAll(students: ClassTestStudent[]): LockAllPreview {
  const submitNow: LockAllPreview['submitNow'] = [];
  const closeNow: string[] = [];
  let unchanged = 0;
  for (const s of students) {
    if (s.state === 'IN_PROGRESS') {
      submitNow.push({ name: s.studentName, answered: s.attempt?.answered ?? 0, total: s.attempt?.total ?? 0 });
    } else if (s.state === 'NOT_STARTED') {
      closeNow.push(s.studentName);
    } else {
      unchanged++;
    }
  }
  return { submitNow, closeNow, unchanged };
}

export interface LockReport {
  tone: 'success' | 'warning';
  headline: string;
  failures: { name: string; error: string }[];
}

/** One sentence about what a "lock all" did, and who (if anyone) it could not
 *  lock — those need another press, and the teacher is told exactly who. */
export function describeLockAll(res: LockClassResponse): LockReport {
  const failures = res.results
    .filter((r) => r.outcome === 'FAILED')
    .map((r) => ({ name: r.studentName, error: r.error || 'Something went wrong.' }));

  const parts: string[] = [];
  if (res.submitted) parts.push(`${plural(res.submitted, 'test')} submitted with what was saved`);
  if (res.closed) parts.push(`${plural(res.closed, 'student')} who hadn’t started can no longer start`);
  if (!parts.length && !failures.length) {
    return { tone: 'success', headline: 'Everyone’s test was already locked.', failures };
  }
  const done = parts.length ? `${parts.join('; ')}.` : '';
  if (failures.length) {
    return {
      tone: 'warning',
      headline: `${done ? `${done} ` : ''}${plural(failures.length, 'student')} could not be locked — press the button again to retry.`,
      failures,
    };
  }
  return { tone: 'success', headline: `Done — ${done}`, failures };
}

/** The message for a single learner's lock. */
export function describeLockOne(outcome: LockResult): string {
  switch (outcome.outcome) {
    case 'SUBMITTED':
      return `${outcome.studentName}’s test was locked and submitted with what they had saved.`;
    case 'ALREADY_SUBMITTED':
      return `${outcome.studentName} had already handed in their test.`;
    case 'CLOSED':
      return `${outcome.studentName} can no longer start the test.`;
    case 'ALREADY_CLOSED':
      return `${outcome.studentName}’s test was already closed.`;
    case 'FAILED':
      return outcome.error || `${outcome.studentName}’s test could not be locked. Please try again.`;
  }
}

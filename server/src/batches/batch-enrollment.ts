// FILE PATH: server/src/batches/batch-enrollment.ts
//
// The rules for placing a student in a batch — pure functions over plain data,
// so every rule is testable without a database and the admin screens and the
// server enforce exactly the same thing.
//
// A student is either COMPATIBLE with a batch, or the problem is one of two
// kinds:
//
//   BLOCKER   the placement is not allowed (wrong curriculum, batch full, the
//             student is ahead of the batch, ...). Nothing the admin can tick
//             makes it allowed.
//   DECISION  the placement is possible but changes something the admin must
//             knowingly accept (the student's teacher, lessons they will not
//             take, the 1:1 classes that get replaced). The server refuses the
//             request until the matching decision is explicitly given — a
//             student's progress is never rewritten silently.
//
// Progress, in one line: the batch has ONE lesson sequence. A student whose
// next lesson is the batch's next lesson is simply aligned. A student behind
// the batch may skip ahead to it (their records are untouched; the lessons in
// between just stay untaken). A student ahead of the batch cannot join it,
// because they would repeat lessons they have completed. A batch that has not
// taught a class and has no students has no position to protect, so it may be
// re-based to start where the student is.

import { AccountStatus, BatchStatus } from '@prisma/client';

export type IssueSeverity = 'BLOCKER' | 'DECISION';

export type EnrollmentIssueCode =
  | 'BATCH_NOT_ACCEPTING'
  | 'STUDENT_PAUSED'
  | 'ALREADY_IN_BATCH'
  | 'BATCH_FULL'
  | 'COURSE_MISMATCH'
  | 'PROGRESS_AHEAD'
  | 'SCHEDULE_CONFLICT'
  | 'PROGRESS_BEHIND'
  | 'BATCH_REBASE'
  | 'TEACHER_CHANGE'
  | 'REPLACES_UPCOMING';

export type ProgressChoice = 'SKIP_TO_BATCH' | 'REBASE_BATCH';

export interface EnrollmentDecisions {
  /** Accept that the student's assigned teacher becomes the batch's teacher. */
  acceptTeacherChange?: boolean;
  /** How the student's place in the curriculum is reconciled with the batch's. */
  progress?: ProgressChoice;
  /** Accept that the student's upcoming 1-to-1 classes are removed. */
  replaceUpcoming?: boolean;
}

export interface EnrollmentIssue {
  code: EnrollmentIssueCode;
  severity: IssueSeverity;
  message: string;
  /** For a DECISION: the decision that resolves it. */
  decision?: keyof EnrollmentDecisions;
  /** For the `progress` decision: the one value that resolves this issue. */
  choice?: ProgressChoice;
  detail?: Record<string, unknown>;
}

export interface EnrollmentBatchInfo {
  id: string;
  name: string;
  status: BatchStatus;
  courseId: string;
  courseTitle: string;
  teacherId: string;
  teacherName: string;
  maxStudents: number;
  /** Students currently placed in the batch (paused ones included). */
  memberCount: number;
  /** The lesson a student joining now would take first. */
  nextLesson: number;
  /** True once the batch has taught a class or has students: its position in
   * the curriculum is then not up for re-basing. */
  anchored: boolean;
}

export interface EnrollmentStudentInfo {
  id: string;
  fullName: string;
  accountStatus: AccountStatus;
  assignedTeacherId: string | null;
  assignedTeacherName: string | null;
  assignedCourseId: string | null;
  assignedCourseTitle: string | null;
  /** The student's next lesson in the BATCH's curriculum. */
  nextLesson: number;
  currentBatch: { id: string; name: string } | null;
  /** Upcoming 1-to-1 classes that joining a batch replaces. */
  upcomingOneToOne: number;
}

export type Alignment = 'ALIGNED' | 'SKIPPED_TO_BATCH' | 'BATCH_REBASED';

export interface EnrollmentEvaluation {
  issues: EnrollmentIssue[];
  /** No blocker: the placement is allowed (decisions may still be needed). */
  allowed: boolean;
  /** The placement can go ahead as-is — no blocker and no decision needed. */
  compatible: boolean;
  alignment: Alignment;
  studentNextLesson: number;
  batchNextLesson: number;
}

export function evaluateEnrollment(
  batch: EnrollmentBatchInfo,
  student: EnrollmentStudentInfo,
): EnrollmentEvaluation {
  const issues: EnrollmentIssue[] = [];
  const blocker = (
    code: EnrollmentIssueCode,
    message: string,
    detail?: Record<string, unknown>,
  ) => issues.push({ code, severity: 'BLOCKER', message, detail });
  const decision = (
    code: EnrollmentIssueCode,
    message: string,
    resolvedBy: keyof EnrollmentDecisions,
    extra: { choice?: ProgressChoice; detail?: Record<string, unknown> } = {},
  ) =>
    issues.push({
      code,
      severity: 'DECISION',
      message,
      decision: resolvedBy,
      ...extra,
    });

  const sameBatch = student.currentBatch?.id === batch.id;

  if (batch.status !== BatchStatus.ACTIVE) {
    blocker(
      'BATCH_NOT_ACCEPTING',
      `${batch.name} is ${batch.status.toLowerCase()} and does not accept students.`,
    );
  }
  if (student.accountStatus === AccountStatus.PAUSED) {
    blocker(
      'STUDENT_PAUSED',
      'This student is paused. Resume them before placing them in a batch.',
    );
  }
  if (sameBatch) {
    blocker('ALREADY_IN_BATCH', `This student is already in ${batch.name}.`);
  }
  if (!sameBatch && batch.memberCount >= batch.maxStudents) {
    blocker(
      'BATCH_FULL',
      `${batch.name} is full (${batch.memberCount} of ${batch.maxStudents} students).`,
      { memberCount: batch.memberCount, maxStudents: batch.maxStudents },
    );
  }
  if (student.assignedCourseId && student.assignedCourseId !== batch.courseId) {
    blocker(
      'COURSE_MISMATCH',
      `This student is on ${student.assignedCourseTitle ?? 'another curriculum'}, but ${batch.name} teaches ${batch.courseTitle}. Change the student's curriculum first.`,
      {
        studentCourse: student.assignedCourseTitle,
        batchCourse: batch.courseTitle,
      },
    );
  }

  // ── Progress ────────────────────────────────────────────────────────────
  const s = student.nextLesson;
  const b = batch.nextLesson;
  let alignment: Alignment = 'ALIGNED';
  if (s !== b) {
    if (!batch.anchored) {
      alignment = 'BATCH_REBASED';
      decision(
        'BATCH_REBASE',
        `${batch.name} has not taught a class yet and has no students, so it can start where this student is: lesson ${s} (it is currently set to start at lesson ${b}).`,
        'progress',
        {
          choice: 'REBASE_BATCH',
          detail: { studentNextLesson: s, batchNextLesson: b },
        },
      );
    } else if (s < b) {
      alignment = 'SKIPPED_TO_BATCH';
      decision(
        'PROGRESS_BEHIND',
        `This student is on lesson ${s}, but ${batch.name} is already on lesson ${b}. Joining means ${
          b - s === 1 ? `lesson ${s}` : `lessons ${s}–${b - 1}`
        } will not be taught to them by the batch. Their completed classes are kept exactly as they are.`,
        'progress',
        {
          choice: 'SKIP_TO_BATCH',
          detail: {
            studentNextLesson: s,
            batchNextLesson: b,
            skippedFrom: s,
            skippedTo: b - 1,
          },
        },
      );
    } else {
      blocker(
        'PROGRESS_AHEAD',
        `This student has already completed through lesson ${s - 1}, but ${batch.name} is on lesson ${b}. They would repeat lessons they have taken. Choose a batch that is at lesson ${s} or later, or create a new batch.`,
        { studentNextLesson: s, batchNextLesson: b },
      );
    }
  }

  // ── Things the placement changes ────────────────────────────────────────
  if (
    student.assignedTeacherId &&
    student.assignedTeacherId !== batch.teacherId
  ) {
    decision(
      'TEACHER_CHANGE',
      `This student's teacher will change from ${student.assignedTeacherName ?? 'their current teacher'} to ${batch.teacherName}. Classes already taught keep their original teacher.`,
      'acceptTeacherChange',
      {
        detail: {
          from: student.assignedTeacherName,
          to: batch.teacherName,
        },
      },
    );
  }
  if (student.upcomingOneToOne > 0) {
    decision(
      'REPLACES_UPCOMING',
      `${student.upcomingOneToOne} upcoming 1-to-1 class${
        student.upcomingOneToOne === 1 ? '' : 'es'
      } will be removed and replaced by the batch's classes. Completed classes are kept.`,
      'replaceUpcoming',
      { detail: { count: student.upcomingOneToOne } },
    );
  }

  const allowed = !issues.some((i) => i.severity === 'BLOCKER');
  return {
    issues,
    allowed,
    compatible: allowed && issues.length === 0,
    alignment,
    studentNextLesson: s,
    batchNextLesson: b,
  };
}

/** The decision issues the admin has not (correctly) answered. A `progress`
 * decision only counts when it is the choice that issue asks for, so a stale
 * screen can never skip lessons or re-base a batch by accident. */
export function unmetDecisions(
  issues: EnrollmentIssue[],
  decisions: EnrollmentDecisions | undefined,
): EnrollmentIssue[] {
  const given = decisions ?? {};
  return issues.filter((issue) => {
    if (issue.severity !== 'DECISION' || !issue.decision) return false;
    if (issue.decision === 'progress') return given.progress !== issue.choice;
    return given[issue.decision] !== true;
  });
}

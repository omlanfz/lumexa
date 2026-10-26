// The rules for placing a student in a batch, as pure data-in/data-out checks.
// The same evaluation drives the admin screens and the server's refusal, so
// proving it here proves both.

import { AccountStatus, BatchStatus } from '@prisma/client';
import {
  EnrollmentBatchInfo,
  EnrollmentStudentInfo,
  evaluateEnrollment,
  unmetDecisions,
} from './batch-enrollment';

function batch(over: Partial<EnrollmentBatchInfo> = {}): EnrollmentBatchInfo {
  return {
    id: 'b1',
    name: 'Evening Odyssey',
    status: BatchStatus.ACTIVE,
    courseId: 'course-1',
    courseTitle: 'Odyssey',
    teacherId: 'tp-1',
    teacherName: 'Ms Rahman',
    maxStudents: 4,
    memberCount: 2,
    nextLesson: 5,
    anchored: true,
    ...over,
  };
}

function student(
  over: Partial<EnrollmentStudentInfo> = {},
): EnrollmentStudentInfo {
  return {
    id: 's1',
    fullName: 'Ada',
    accountStatus: AccountStatus.ACTIVE,
    assignedTeacherId: 'tp-1',
    assignedTeacherName: 'Ms Rahman',
    assignedCourseId: 'course-1',
    assignedCourseTitle: 'Odyssey',
    nextLesson: 5,
    currentBatch: null,
    upcomingOneToOne: 0,
    ...over,
  };
}

const codes = (e: ReturnType<typeof evaluateEnrollment>) =>
  e.issues.map((i) => i.code);

describe('evaluateEnrollment', () => {
  it('a student on the same curriculum, teacher and lesson is simply compatible', () => {
    const e = evaluateEnrollment(batch(), student());
    expect(e.compatible).toBe(true);
    expect(e.allowed).toBe(true);
    expect(e.issues).toEqual([]);
    expect(e.alignment).toBe('ALIGNED');
  });

  describe('what is never allowed (blockers)', () => {
    it.each([
      [
        'a different curriculum',
        { assignedCourseId: 'course-2', assignedCourseTitle: 'Builder' },
        'COURSE_MISMATCH',
      ],
      [
        'a paused student',
        { accountStatus: AccountStatus.PAUSED },
        'STUDENT_PAUSED',
      ],
      [
        'a student already in this batch',
        { currentBatch: { id: 'b1', name: 'Evening Odyssey' } },
        'ALREADY_IN_BATCH',
      ],
    ])('%s', (_name, over, code) => {
      const e = evaluateEnrollment(batch(), student(over));
      expect(codes(e)).toContain(code);
      expect(e.allowed).toBe(false);
      expect(e.compatible).toBe(false);
      expect(e.issues.find((i) => i.code === code)?.severity).toBe('BLOCKER');
    });

    it('a full batch (4 of 4 places taken)', () => {
      const e = evaluateEnrollment(batch({ memberCount: 4 }), student());
      expect(codes(e)).toContain('BATCH_FULL');
      expect(e.allowed).toBe(false);
    });

    it('a batch with room left is not full', () => {
      const e = evaluateEnrollment(batch({ memberCount: 3 }), student());
      expect(codes(e)).not.toContain('BATCH_FULL');
    });

    it.each([BatchStatus.COMPLETED, BatchStatus.ARCHIVED])(
      'a %s batch does not accept students',
      (status) => {
        const e = evaluateEnrollment(batch({ status }), student());
        expect(codes(e)).toContain('BATCH_NOT_ACCEPTING');
        expect(e.allowed).toBe(false);
      },
    );

    it('a student who has no curriculum yet is not blocked by it', () => {
      const e = evaluateEnrollment(
        batch(),
        student({ assignedCourseId: null, assignedCourseTitle: null }),
      );
      expect(codes(e)).not.toContain('COURSE_MISMATCH');
    });

    it('a student AHEAD of the batch cannot join (they would repeat lessons)', () => {
      const e = evaluateEnrollment(
        batch({ nextLesson: 5 }),
        student({ nextLesson: 9 }),
      );
      expect(codes(e)).toContain('PROGRESS_AHEAD');
      expect(e.allowed).toBe(false);
      // Nothing the admin ticks can make this one pass.
      expect(unmetDecisions(e.issues, { progress: 'SKIP_TO_BATCH' })).toEqual(
        [],
      );
      expect(e.issues.find((i) => i.code === 'PROGRESS_AHEAD')?.severity).toBe(
        'BLOCKER',
      );
    });

    it('a full batch does not count the student already in it against the limit', () => {
      const e = evaluateEnrollment(
        batch({ memberCount: 4 }),
        student({ currentBatch: { id: 'b1', name: 'Evening Odyssey' } }),
      );
      expect(codes(e)).not.toContain('BATCH_FULL');
    });
  });

  describe('what needs an explicit decision', () => {
    it('a student BEHIND the batch may skip ahead — only if the admin says so, naming the lessons skipped', () => {
      const e = evaluateEnrollment(
        batch({ nextLesson: 8 }),
        student({ nextLesson: 5 }),
      );
      const issue = e.issues.find((i) => i.code === 'PROGRESS_BEHIND')!;
      expect(issue.severity).toBe('DECISION');
      expect(issue.decision).toBe('progress');
      expect(issue.choice).toBe('SKIP_TO_BATCH');
      expect(issue.message).toContain('lessons 5–7');
      expect(e.allowed).toBe(true);
      expect(e.compatible).toBe(false);
      expect(e.alignment).toBe('SKIPPED_TO_BATCH');
      expect(unmetDecisions(e.issues, {})).toHaveLength(1);
      expect(unmetDecisions(e.issues, { progress: 'SKIP_TO_BATCH' })).toEqual(
        [],
      );
    });

    it('names one skipped lesson in the singular', () => {
      const e = evaluateEnrollment(
        batch({ nextLesson: 6 }),
        student({ nextLesson: 5 }),
      );
      expect(
        e.issues.find((i) => i.code === 'PROGRESS_BEHIND')?.message,
      ).toContain('lesson 5 will not');
    });

    it('the wrong progress choice never counts — a stale screen cannot skip lessons by accident', () => {
      const e = evaluateEnrollment(
        batch({ nextLesson: 8 }),
        student({ nextLesson: 5 }),
      );
      expect(
        unmetDecisions(e.issues, { progress: 'REBASE_BATCH' }),
      ).toHaveLength(1);
    });

    it('a batch that has taught nothing and has no students can start where the student is', () => {
      const e = evaluateEnrollment(
        batch({ anchored: false, memberCount: 0, nextLesson: 1 }),
        student({ nextLesson: 6 }),
      );
      const issue = e.issues.find((i) => i.code === 'BATCH_REBASE')!;
      expect(issue.severity).toBe('DECISION');
      expect(issue.choice).toBe('REBASE_BATCH');
      expect(e.alignment).toBe('BATCH_REBASED');
      expect(e.allowed).toBe(true);
      // Skipping is not what that issue asks for.
      expect(
        unmetDecisions(e.issues, { progress: 'SKIP_TO_BATCH' }),
      ).toHaveLength(1);
      expect(unmetDecisions(e.issues, { progress: 'REBASE_BATCH' })).toEqual(
        [],
      );
    });

    it('an unanchored batch the student is already aligned with needs no decision', () => {
      const e = evaluateEnrollment(
        batch({ anchored: false, memberCount: 0, nextLesson: 6 }),
        student({ nextLesson: 6 }),
      );
      expect(codes(e)).not.toContain('BATCH_REBASE');
      expect(e.alignment).toBe('ALIGNED');
    });

    it("a different teacher: the student's teacher changes only with consent", () => {
      const e = evaluateEnrollment(
        batch(),
        student({ assignedTeacherId: 'tp-9', assignedTeacherName: 'Mr Khan' }),
      );
      const issue = e.issues.find((i) => i.code === 'TEACHER_CHANGE')!;
      expect(issue.severity).toBe('DECISION');
      expect(issue.decision).toBe('acceptTeacherChange');
      expect(issue.message).toContain('Mr Khan');
      expect(issue.message).toContain('Ms Rahman');
      expect(unmetDecisions(e.issues, {})).toHaveLength(1);
      expect(unmetDecisions(e.issues, { acceptTeacherChange: true })).toEqual(
        [],
      );
    });

    it('a student with no teacher yet is simply given the batch’s', () => {
      const e = evaluateEnrollment(
        batch(),
        student({ assignedTeacherId: null, assignedTeacherName: null }),
      );
      expect(codes(e)).not.toContain('TEACHER_CHANGE');
    });

    it('upcoming 1-to-1 classes are replaced only with consent (and counted)', () => {
      const one = evaluateEnrollment(batch(), student({ upcomingOneToOne: 1 }));
      expect(
        one.issues.find((i) => i.code === 'REPLACES_UPCOMING')?.message,
      ).toContain('1 upcoming 1-to-1 class will be removed');
      const many = evaluateEnrollment(
        batch(),
        student({ upcomingOneToOne: 12 }),
      );
      const issue = many.issues.find((i) => i.code === 'REPLACES_UPCOMING')!;
      expect(issue.message).toContain(
        '12 upcoming 1-to-1 classes will be removed',
      );
      expect(issue.decision).toBe('replaceUpcoming');
      expect(unmetDecisions(many.issues, { replaceUpcoming: true })).toEqual(
        [],
      );
    });

    it('several things at once: every decision must be answered, each by its own tick', () => {
      const e = evaluateEnrollment(
        batch({ nextLesson: 8 }),
        student({
          nextLesson: 5,
          assignedTeacherId: 'tp-9',
          assignedTeacherName: 'Mr Khan',
          upcomingOneToOne: 3,
        }),
      );
      expect(codes(e).sort()).toEqual(
        ['PROGRESS_BEHIND', 'REPLACES_UPCOMING', 'TEACHER_CHANGE'].sort(),
      );
      expect(unmetDecisions(e.issues, undefined)).toHaveLength(3);
      expect(
        unmetDecisions(e.issues, { acceptTeacherChange: true }),
      ).toHaveLength(2);
      expect(
        unmetDecisions(e.issues, {
          acceptTeacherChange: true,
          replaceUpcoming: true,
          progress: 'SKIP_TO_BATCH',
        }),
      ).toEqual([]);
      // A tick that is not literally `true` is not consent.
      expect(
        unmetDecisions(e.issues, {
          acceptTeacherChange: 'yes' as unknown as boolean,
          replaceUpcoming: true,
          progress: 'SKIP_TO_BATCH',
        }),
      ).toHaveLength(1);
    });
  });

  it('a blocker and a decision can be reported together; blockers make it not allowed', () => {
    const e = evaluateEnrollment(
      batch({ memberCount: 4 }),
      student({ upcomingOneToOne: 2 }),
    );
    expect(e.allowed).toBe(false);
    expect(codes(e)).toEqual(
      expect.arrayContaining(['BATCH_FULL', 'REPLACES_UPCOMING']),
    );
  });

  it('reports both lesson numbers it compared', () => {
    const e = evaluateEnrollment(
      batch({ nextLesson: 8 }),
      student({ nextLesson: 5 }),
    );
    expect(e.studentNextLesson).toBe(5);
    expect(e.batchNextLesson).toBe(8);
  });
});

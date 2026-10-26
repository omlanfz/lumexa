// FILE PATH: server/src/assessments/class-tests.service.ts
//
// The teacher's live view of a class taking a test, and the lock.
//
// A student takes the test in their own browser tab while sharing their whole
// screen, so the teacher cannot follow it by looking at the classroom stage:
// they see this instead — every learner's progress at a glance — and it is also
// how they stop the test when time is up. The time limit is the teacher's call
// and learners start at different moments, so there is deliberately NO deadline
// anywhere in the system: the teacher ends the test.
//
// "Lock & submit" ends it for a learner: their attempt is submitted exactly as
// it was last saved (whatever was saved is never lost), their report card is
// created for evaluation like any other submission, and from then on they can
// neither change the test nor start it. A learner who never started simply
// cannot start any more (the teacher can reopen that — see reopenStudent).
//
// Who sits a test together? A batch class IS its group: every student taking
// part in the same BatchSession sits the test together, each on their own
// ScheduledLesson row (so each has their own attempt, result and report card).
// A 1:1 class is a group of one. This single definition (classGroupWhere) is
// the only place that knows.

import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  LessonStatus,
  Prisma,
  Role,
  TestReportStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AssessmentsService, Requester } from './assessments.service';

export type ClassTestStudentState =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'CLOSED';

export interface ClassTestStudent {
  scheduledLessonId: string;
  studentUserId: string;
  studentName: string;
  /** NOT_STARTED · IN_PROGRESS · SUBMITTED (by the learner or by the teacher's
   *  lock — see attempt.lockedAt) · CLOSED (the teacher closed the test before
   *  this learner started it). */
  state: ClassTestStudentState;
  closedAt: Date | null;
  attempt: {
    id: string;
    status: AttemptStatus;
    startedAt: Date | null;
    submittedAt: Date | null;
    lockedAt: Date | null;
    total: number;
    answered: number;
    codingSaved: boolean;
    report: { id: string; status: TestReportStatus } | null;
  } | null;
}

export type LockOutcome =
  | 'SUBMITTED' // in progress → submitted by this lock
  | 'ALREADY_SUBMITTED' // had already handed in (a moment ago, or earlier)
  | 'CLOSED' // never started → can no longer start
  | 'ALREADY_CLOSED'
  | 'FAILED';

export interface LockResult {
  scheduledLessonId: string;
  studentUserId: string;
  studentName: string;
  outcome: LockOutcome;
  error?: string;
}

/** The classes that sit this test together with `anchor`. */
export function classGroupWhere(anchor: {
  id: string;
  teacherId: string;
  courseId: string;
  lessonNumber: number;
  start: Date;
  end: Date;
  batchSessionId?: string | null;
}): Prisma.ScheduledLessonWhereInput {
  if (anchor.batchSessionId) {
    return {
      batchSessionId: anchor.batchSessionId,
      // The class being looked at always belongs to its own group, whatever its
      // state; others only while they are still to be taught.
      OR: [{ id: anchor.id }, { status: LessonStatus.UPCOMING }],
    };
  }
  return {
    teacherId: anchor.teacherId,
    courseId: anchor.courseId,
    lessonNumber: anchor.lessonNumber,
    start: { lt: anchor.end },
    end: { gt: anchor.start },
    // The class being looked at always belongs to its own group, whatever its
    // state; others only while they are still to be taught.
    OR: [{ id: anchor.id }, { status: LessonStatus.UPCOMING }],
  };
}

const NOT_YOUR_CLASS =
  'Only the teacher of this class can see or lock its test.';

@Injectable()
export class ClassTestsService {
  private readonly logger = new Logger(ClassTestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assessments: AssessmentsService,
  ) {}

  // ═══ Monitor ═══════════════════════════════════════════════════════════════

  async getOverview(scheduledLessonId: string, requester: Requester) {
    const anchor = await this.loadClass(scheduledLessonId, requester);
    const members = await this.prisma.scheduledLesson.findMany({
      where: classGroupWhere(anchor),
      orderBy: [{ student: { fullName: 'asc' } }, { id: 'asc' }],
      select: {
        id: true,
        studentUserId: true,
        testLockedAt: true,
        student: { select: { fullName: true } },
        assessmentAttempt: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            submittedAt: true,
            lockedAt: true,
            mcqQuestionIds: true,
            mcqAnswers: { select: { selectedIndex: true } },
            practicalSubmissions: { select: { code: true } },
            report: { select: { id: true, status: true } },
          },
        },
      },
    });

    const assessment = anchor.lesson?.assessment ?? null;
    const students: ClassTestStudent[] = members.map((m) => {
      const a = m.assessmentAttempt;
      const state: ClassTestStudentState = a
        ? a.status === AttemptStatus.IN_PROGRESS
          ? 'IN_PROGRESS'
          : 'SUBMITTED'
        : m.testLockedAt
          ? 'CLOSED'
          : 'NOT_STARTED';
      return {
        scheduledLessonId: m.id,
        studentUserId: m.studentUserId,
        studentName: m.student.fullName,
        state,
        closedAt: a ? null : m.testLockedAt,
        attempt: a
          ? {
              id: a.id,
              status: a.status,
              startedAt: a.startedAt,
              submittedAt: a.submittedAt,
              lockedAt: a.lockedAt,
              total: a.mcqQuestionIds.length,
              answered: a.mcqAnswers.filter((x) => x.selectedIndex !== null)
                .length,
              codingSaved: a.practicalSubmissions.some(
                (p) => p.code.trim().length > 0,
              ),
              report: a.report,
            }
          : null,
      };
    });

    return {
      scheduledLessonId: anchor.id,
      // Clients show elapsed time against THIS clock, so a learner's stopwatch
      // is right even when their computer's clock is not.
      serverTime: new Date(),
      assessment: assessment
        ? {
            id: assessment.id,
            type: assessment.type,
            title: assessment.title,
            isPublished: assessment.isPublished,
            ...(await this.assessments.bankSummary(assessment)),
          }
        : null,
      students,
    };
  }

  // ═══ Lock ══════════════════════════════════════════════════════════════════

  /** "Lock & submit" for one learner. */
  async lockStudent(
    scheduledLessonId: string,
    requester: Requester,
  ): Promise<LockResult> {
    await this.loadClass(scheduledLessonId, requester);
    return this.lockOne(scheduledLessonId, requester.userId);
  }

  /** "Time's up" — lock & submit every learner in the group of this class.
   *  One learner failing never stops the others, and the call is safe to repeat:
   *  anyone already locked is reported as such. */
  async lockClass(scheduledLessonId: string, requester: Requester) {
    const anchor = await this.loadClass(scheduledLessonId, requester);
    const members = await this.prisma.scheduledLesson.findMany({
      where: classGroupWhere(anchor),
      orderBy: [{ student: { fullName: 'asc' } }, { id: 'asc' }],
      select: {
        id: true,
        studentUserId: true,
        student: { select: { fullName: true } },
      },
    });

    const results: LockResult[] = [];
    for (const m of members) {
      try {
        results.push(await this.lockOne(m.id, requester.userId));
      } catch (err) {
        this.logger.error(
          `Locking the test of class ${m.id} failed: ${err instanceof Error ? err.stack : err}`,
        );
        results.push({
          scheduledLessonId: m.id,
          studentUserId: m.studentUserId,
          studentName: m.student.fullName,
          outcome: 'FAILED',
          error: failureText(err),
        });
      }
    }
    const count = (o: LockOutcome) =>
      results.filter((r) => r.outcome === o).length;
    return {
      results,
      submitted: count('SUBMITTED'),
      closed: count('CLOSED'),
      alreadyDone: count('ALREADY_SUBMITTED') + count('ALREADY_CLOSED'),
      failed: count('FAILED'),
    };
  }

  /** Reopen a test the teacher closed before the learner had started it (the
   *  safety valve for a late arrival). A test that was submitted can never be
   *  reopened — its report card exists. */
  async reopenStudent(scheduledLessonId: string, requester: Requester) {
    await this.loadClass(scheduledLessonId, requester);
    const reopened = await this.prisma.scheduledLesson.updateMany({
      where: {
        id: scheduledLessonId,
        testLockedAt: { not: null },
        assessmentAttempt: { is: null },
      },
      data: { testLockedAt: null, testLockedByUserId: null },
    });
    if (reopened.count === 1) return { reopened: true };

    const sl = await this.prisma.scheduledLesson.findUnique({
      where: { id: scheduledLessonId },
      select: {
        testLockedAt: true,
        assessmentAttempt: { select: { id: true } },
      },
    });
    if (sl?.assessmentAttempt) {
      throw new ConflictException(
        'This learner has already handed in their test, so it cannot be reopened.',
      );
    }
    // Not closed in the first place — nothing to do.
    return { reopened: false };
  }

  // ═══ internals ═════════════════════════════════════════════════════════════

  private async loadClass(scheduledLessonId: string, requester: Requester) {
    const sl = await this.prisma.scheduledLesson.findUnique({
      where: { id: scheduledLessonId },
      select: {
        id: true,
        teacherId: true,
        courseId: true,
        lessonNumber: true,
        start: true,
        end: true,
        batchSessionId: true,
        teacher: { select: { userId: true } },
        lesson: {
          select: {
            assessment: {
              select: {
                id: true,
                type: true,
                title: true,
                isPublished: true,
                sourceAssessmentId: true,
              },
            },
          },
        },
      },
    });
    if (!sl) throw new NotFoundException('Class not found');
    const isClassTeacher =
      requester.role === Role.TEACHER && sl.teacher.userId === requester.userId;
    if (requester.role !== Role.ADMIN && !isClassTeacher) {
      throw new ForbiddenException(NOT_YOUR_CLASS);
    }
    return sl;
  }

  /** Lock one learner's test. */
  private async lockOne(
    scheduledLessonId: string,
    lockedByUserId: string,
  ): Promise<LockResult> {
    const sl = await this.prisma.scheduledLesson.findUnique({
      where: { id: scheduledLessonId },
      select: {
        id: true,
        studentUserId: true,
        student: { select: { fullName: true } },
      },
    });
    if (!sl) throw new NotFoundException('Class not found');
    const base = {
      scheduledLessonId: sl.id,
      studentUserId: sl.studentUserId,
      studentName: sl.student.fullName,
    };

    // Two rounds at most: the only thing that can change between them is a
    // learner who pressed "Start test" in the same instant as the lock.
    for (let round = 0; round < 2; round++) {
      const attempt = await this.prisma.assessmentAttempt.findUnique({
        where: { scheduledLessonId },
        select: { id: true, status: true },
      });

      if (attempt) {
        if (attempt.status !== AttemptStatus.IN_PROGRESS) {
          return { ...base, outcome: 'ALREADY_SUBMITTED' };
        }
        const summary = await this.assessments.lockAttempt(
          attempt.id,
          sl.studentUserId,
          scheduledLessonId,
          lockedByUserId,
        );
        return {
          ...base,
          outcome: summary.alreadySubmitted ? 'ALREADY_SUBMITTED' : 'SUBMITTED',
        };
      }

      // Never started: close the test so it cannot be started from now on.
      // The row lock waits for a start in flight (which holds it shared), and
      // the attempt is looked at again under that lock.
      const closed = await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ testLockedAt: Date | null }[]>(
          Prisma.sql`SELECT "testLockedAt" FROM "ScheduledLesson" WHERE "id" = ${scheduledLessonId} FOR UPDATE`,
        );
        if (!rows[0]) throw new NotFoundException('Class not found');
        const started = await tx.assessmentAttempt.findUnique({
          where: { scheduledLessonId },
          select: { id: true },
        });
        if (started) return 'STARTED' as const;
        if (rows[0].testLockedAt) return 'ALREADY_CLOSED' as const;
        await tx.scheduledLesson.update({
          where: { id: scheduledLessonId },
          data: {
            testLockedAt: new Date(),
            testLockedByUserId: lockedByUserId,
          },
        });
        return 'CLOSED' as const;
      });
      if (closed !== 'STARTED') return { ...base, outcome: closed };
    }
    // Unreachable in practice: a second round always finds the attempt.
    throw new ConflictException(
      'This test changed while it was being locked. Please try again.',
    );
  }
}

/** What to tell the teacher about a learner whose lock failed: the reason
 *  when it is one of ours, otherwise a generic line (details stay in the log). */
function failureText(err: unknown): string {
  if (err instanceof HttpException) {
    const response = err.getResponse();
    if (typeof response === 'string') return response;
    const message = (response as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
  }
  return 'Something went wrong. Please try again.';
}

// FILE PATH: server/src/assessments/assessments.service.ts
//
// The assessment engine.
//
// Student flow (all enforced here, never trusted from the client):
//   startAttempt  → the student's OWN scheduled class, for THIS assessment,
//                   inside the test window; creates (or resumes) exactly one
//                   attempt per class (unique scheduledLessonId).
//   saveAnswer /  → autosave while IN_PROGRESS. Serialized against submit with
//   saveCode        a row lock, so an answer can never land after the lock-in.
//   submitAttempt → ONE transaction: lock the attempt, apply the student's
//                   final answers, auto-grade the objective part, and create
//                   the TestReport for the teacher. A second submit (double
//                   click, two tabs, retry after a dropped response) is a
//                   harmless no-op that returns the first result.
//
// The questions of a test live on its "root bank" (see linked-assessment.ts) —
// the assessment itself, or the original assessment a custom curriculum's
// imported test links to. Every question read/write resolves through
// rootBankId(), which is how a custom course sees the original course's
// questions without copying them.
//
// Results are RELEASED to the student only once the teacher approves the
// report (attempt status GRADED). Until then the student sees a confirmation,
// not a score — a batch class never leaks answers to students still testing,
// and the teacher can still correct the result before anyone sees it.

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  LessonStatus,
  Prisma,
  QuestionKind,
  Role,
  SessionType,
  TestReportStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { CertificatesService } from '../certificates/certificates.service';
import {
  getClassWindow,
  JOIN_WINDOW_MS,
} from '../scheduling/lesson-window.util';
import {
  MARKS_PER_QUESTION,
  TEST_SHAPES,
  TRUE_FALSE_OPTIONS,
  expectedTotalMarks,
} from './bank/bank.constants';
import { getBankSummary } from './bank-summary';
import { BankTestType } from './bank/bank.types';
import {
  BANK_OWNER_SELECT,
  ensureLinkedAssessment,
  rootBankId,
} from './linked-assessment';
import {
  MAX_CODE_LENGTH,
  RecordVivaDto,
  SaveAnswerDto,
  SaveCodeDto,
  SubmitAttemptDto,
} from './dto/assessment.dto';
import {
  QuestionResult,
  RubricScore,
  isEffectivelyCorrect,
  summarizeObjective,
} from './assessment-grading';
import {
  SubmittedAnswer,
  SubmittedCoding,
  buildReportCreateData,
} from './test-report.builder';

export interface Requester {
  userId: string;
  role: Role;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const identityOrder = (n: number) => Array.from({ length: n }, (_, i) => i);

export interface RubricItem {
  criterion: string;
  maxPoints: number;
  lookFor?: string;
}

function parseRubric(value: Prisma.JsonValue | undefined): RubricItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (r): r is Record<string, Prisma.JsonValue> =>
        !!r && typeof r === 'object' && !Array.isArray(r),
    )
    .map((r) => ({
      criterion: typeof r.criterion === 'string' ? r.criterion : '',
      maxPoints: Number(r.maxPoints ?? 0),
      lookFor: typeof r.lookFor === 'string' ? r.lookFor : undefined,
    }))
    .filter((r) => r.criterion && r.maxPoints > 0);
}

/** The marking guide ("look for") is for teachers: it often spells out the
 *  expected output of the project. A student sees the criteria and their marks
 *  only. */
function withoutMarkingGuide<T extends { lookFor?: string }>(
  items: T[],
): Omit<T, 'lookFor'>[] {
  return items.map((item) => {
    const { lookFor: _guide, ...rest } = item;
    void _guide;
    return rest;
  });
}

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly certificates: CertificatesService,
    private readonly alerts: AlertsService,
  ) {}

  // ═══ Student: start / resume ═══════════════════════════════════════════════

  async startAttempt(
    assessmentId: string,
    studentUserId: string,
    scheduledLessonId: string,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        lessonId: true,
        isPublished: true,
        randomizeQuestions: true,
        randomizeOptions: true,
        sourceAssessmentId: true,
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const sl = await this.prisma.scheduledLesson.findUnique({
      where: { id: scheduledLessonId },
      select: {
        id: true,
        studentUserId: true,
        status: true,
        start: true,
        end: true,
        courseId: true,
        lessonNumber: true,
        lessonId: true,
        testLockedAt: true,
      },
    });
    if (!sl || sl.studentUserId !== studentUserId)
      throw new ForbiddenException('This is not your class.');

    // The class must actually be the one that carries THIS assessment —
    // otherwise any student could start any test id with any class of theirs.
    const catalogLessonId =
      sl.lessonId ??
      (await this.lessonIdForSession(sl.courseId, sl.lessonNumber));
    if (catalogLessonId !== assessment.lessonId) {
      throw new ForbiddenException('That test does not belong to this class.');
    }

    // Resuming (or reviewing) an existing attempt is always allowed.
    const existing = await this.prisma.assessmentAttempt.findUnique({
      where: { scheduledLessonId },
      select: { id: true },
    });
    if (existing)
      return this.getAttempt(existing.id, {
        userId: studentUserId,
        role: Role.STUDENT,
      });

    // Only a brand-new attempt is gated.
    if (sl.testLockedAt) {
      throw new ForbiddenException(
        'Your teacher has closed this test, so it can no longer be started.',
      );
    }
    if (!assessment.isPublished)
      throw new ForbiddenException('This test has not been published yet.');
    if (sl.status !== LessonStatus.UPCOMING) {
      throw new ForbiddenException(
        'This class has ended, so the test can no longer be started. Please ask your teacher.',
      );
    }
    if (getClassWindow(sl.start, sl.end).msUntilStart > JOIN_WINDOW_MS) {
      throw new ForbiddenException(
        'This test opens 10 minutes before your class starts.',
      );
    }

    const rootId = rootBankId(assessment);
    const [questions, practicals] = await Promise.all([
      this.prisma.mCQQuestion.findMany({
        where: { assessmentId: rootId, isPublished: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.practicalQuestion.findMany({
        where: { assessmentId: rootId, isPublished: true },
        orderBy: { order: 'asc' },
      }),
    ]);
    if (questions.length === 0) {
      throw new ConflictException(
        'This test has no questions yet. Please tell your teacher so Lumexa Operations can fix it.',
      );
    }

    // The whole published bank is the test — multiple-choice first, then
    // True/False. Order is shuffled within each section per student.
    const mcqs = questions.filter((q) => q.questionType === QuestionKind.MCQ);
    const tfs = questions.filter(
      (q) => q.questionType === QuestionKind.TRUE_FALSE,
    );
    const ordered = assessment.randomizeQuestions
      ? [...shuffle(mcqs), ...shuffle(tfs)]
      : [...mcqs, ...tfs];

    try {
      const attempt = await this.prisma.$transaction(async (tx) => {
        // The teacher may have locked this test since the checks above. The
        // shared row lock makes "start" and the teacher's "close" take turns:
        // whichever comes second sees the first one's result.
        const [locked] = await tx.$queryRaw<{ testLockedAt: Date | null }[]>(
          Prisma.sql`SELECT "testLockedAt" FROM "ScheduledLesson" WHERE "id" = ${scheduledLessonId} FOR SHARE`,
        );
        if (locked?.testLockedAt) {
          throw new ForbiddenException(
            'Your teacher has closed this test, so it can no longer be started.',
          );
        }
        const created = await tx.assessmentAttempt.create({
          data: {
            assessmentId,
            studentUserId,
            scheduledLessonId,
            status: AttemptStatus.IN_PROGRESS,
            startedAt: new Date(),
            mcqQuestionIds: ordered.map((q) => q.id),
            mcqMaxScore: ordered.length * MARKS_PER_QUESTION,
            practicalMaxScore: practicals.reduce(
              (sum, p) => sum + p.maxScore,
              0,
            ),
          },
        });
        await tx.mCQAnswer.createMany({
          data: ordered.map((q) => {
            const n = (q.options as unknown as string[]).length;
            const shuffleOptions =
              assessment.randomizeOptions &&
              q.questionType === QuestionKind.MCQ;
            return {
              attemptId: created.id,
              questionId: q.id,
              optionOrder: shuffleOptions
                ? shuffle(identityOrder(n))
                : identityOrder(n),
            };
          }),
        });
        return created;
      });
      return this.getAttempt(attempt.id, {
        userId: studentUserId,
        role: Role.STUDENT,
      });
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') {
        // Two tabs / a double click started it at the same moment.
        const winner = await this.prisma.assessmentAttempt.findUnique({
          where: { scheduledLessonId },
          select: { id: true },
        });
        if (winner)
          return this.getAttempt(winner.id, {
            userId: studentUserId,
            role: Role.STUDENT,
          });
      }
      throw err;
    }
  }

  private async lessonIdForSession(
    courseId: string,
    lessonNumber: number,
  ): Promise<string | null> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { courseId, order: lessonNumber },
      select: { id: true },
    });
    return lesson?.id ?? null;
  }

  // ═══ Read an attempt ═══════════════════════════════════════════════════════

  async getAttempt(attemptId: string, requester: Requester) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: {
          select: {
            id: true,
            type: true,
            title: true,
            instructions: true,
            passScorePct: true,
            sourceAssessmentId: true,
            lesson: {
              select: {
                courseId: true,
                title: true,
                course: { select: { title: true } },
              },
            },
          },
        },
        mcqAnswers: { include: { question: true } },
        practicalSubmissions: { include: { question: true } },
        student: {
          select: {
            id: true,
            fullName: true,
            assignedTeacher: { select: { userId: true } },
          },
        },
        scheduledLesson: { select: { teacher: { select: { userId: true } } } },
        report: true,
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    this.assertCanView(attempt, requester);

    const isStudent = requester.role === Role.STUDENT;
    const released = attempt.status === AttemptStatus.GRADED;
    const showAnswers = !isStudent || released;
    const rootId = rootBankId(attempt.assessment);

    const answerByQuestion = new Map(
      attempt.mcqAnswers.map((a) => [a.questionId, a]),
    );
    const orderedAnswers = attempt.mcqQuestionIds
      .map((id) => answerByQuestion.get(id))
      .filter((a): a is NonNullable<typeof a> => !!a);

    // A released student review is read from the FROZEN report snapshot, so it
    // reflects the teacher's final decision (overrides included).
    const reportResults = (attempt.report?.questionResults ??
      null) as unknown as QuestionResult[] | null;
    const questions =
      isStudent && released && reportResults
        ? reportResults.map((r) => ({
            id: r.questionId,
            kind: r.kind,
            order: r.order,
            text: r.text,
            options: r.options,
            selectedIndex: r.selectedIndex,
            correctIndex: r.correctIndex,
            isCorrect: isEffectivelyCorrect(r),
            explanation: r.explanation,
          }))
        : orderedAnswers.map((a, i) => {
            const options = a.question.options as unknown as string[];
            const order =
              a.optionOrder.length === options.length
                ? a.optionOrder
                : identityOrder(options.length);
            return {
              id: a.questionId,
              kind: a.question.questionType,
              order: i + 1,
              text: a.question.questionText,
              options: order.map((idx) => options[idx]),
              selectedIndex:
                a.selectedIndex === null
                  ? null
                  : order.indexOf(a.selectedIndex),
              ...(showAnswers
                ? {
                    correctIndex: order.indexOf(a.question.correctIndex),
                    isCorrect: a.isCorrect,
                    explanation: a.question.explanation,
                  }
                : {}),
            };
          });

    // The coding project(s): the bank's published ones, plus any this attempt
    // already submitted code for (so older attempts still show their question).
    const bankPracticals = await this.prisma.practicalQuestion.findMany({
      where: { assessmentId: rootId, isPublished: true },
      orderBy: { order: 'asc' },
    });
    const practicalQs = new Map(bankPracticals.map((p) => [p.id, p]));
    for (const s of attempt.practicalSubmissions)
      practicalQs.set(s.questionId, s.question);
    const coding =
      [...practicalQs.values()].slice(0, 1).map((p) => {
        const sub = attempt.practicalSubmissions.find(
          (s) => s.questionId === p.id,
        );
        return {
          id: p.id,
          title: p.title,
          instructions: p.instructions,
          language: p.language,
          starterCode: p.starterCode,
          maxScore: p.maxScore,
          rubric: isStudent
            ? withoutMarkingGuide(parseRubric(p.rubric))
            : parseRubric(p.rubric),
          code: sub?.code ?? p.starterCode ?? '',
          savedAt: sub?.updatedAt ?? null,
          hasSavedCode: !!sub,
        };
      })[0] ?? null;

    const report = attempt.report;
    const showResult = !!report && (!isStudent || released);
    const result = showResult
      ? {
          status: report.status,
          objective: {
            score: report.objectiveScore,
            max: report.objectiveMaxScore,
            mcqTotal: report.mcqTotal,
            trueFalseTotal: report.trueFalseTotal,
            ...(isStudent ? {} : { autoScore: report.autoObjectiveScore }),
          },
          coding: report.hasCodingProject
            ? {
                score: report.codingScore,
                max: report.codingMaxScore,
                feedback: report.codingFeedback,
                rubric: isStudent
                  ? withoutMarkingGuide(
                      (report.codingRubricScores as unknown as
                        | RubricScore[]
                        | null) ?? [],
                    )
                  : report.codingRubricScores,
              }
            : null,
          total: report.totalScore,
          totalMax: report.totalMaxScore,
          percentage: report.percentage,
          passed: report.passed,
          passScorePct: report.passScorePct,
          feedback: report.feedback,
          strengths: report.strengths,
          improvements: report.improvements,
          approvedAt: report.approvedAt,
        }
      : null;

    // An attempt graded before report cards existed has no report: show the
    // result it was given (its scores live on the attempt itself).
    const legacyResult =
      !report && released && attempt.totalScore !== null
        ? {
            status: TestReportStatus.READY_TO_SHARE,
            objective: {
              score: attempt.mcqScore ?? 0,
              max:
                attempt.mcqMaxScore ??
                orderedAnswers.length * MARKS_PER_QUESTION,
              mcqTotal: orderedAnswers.filter(
                (a) => a.question.questionType === QuestionKind.MCQ,
              ).length,
              trueFalseTotal: orderedAnswers.filter(
                (a) => a.question.questionType === QuestionKind.TRUE_FALSE,
              ).length,
            },
            coding: null,
            total: attempt.totalScore,
            totalMax: attempt.totalMaxScore ?? 100,
            percentage: attempt.totalScore,
            passed: attempt.passed,
            passScorePct: attempt.assessment.passScorePct,
            feedback: null,
            strengths: null,
            improvements: null,
            approvedAt: attempt.gradedAt,
          }
        : null;

    return {
      id: attempt.id,
      status: attempt.status,
      released,
      assessment: {
        id: attempt.assessment.id,
        type: attempt.assessment.type,
        title: attempt.assessment.title,
        instructions: attempt.assessment.instructions,
        courseId: attempt.assessment.lesson.courseId,
        courseTitle: attempt.assessment.lesson.course.title,
        lessonTitle: attempt.assessment.lesson.title,
        passScorePct: attempt.assessment.passScorePct,
        hasCodingProject: !!coding,
        questionCount: orderedAnswers.length,
        mcqCount: orderedAnswers.filter(
          (a) => a.question.questionType === QuestionKind.MCQ,
        ).length,
        trueFalseCount: orderedAnswers.filter(
          (a) => a.question.questionType === QuestionKind.TRUE_FALSE,
        ).length,
        totalMarks:
          orderedAnswers.length * MARKS_PER_QUESTION + (coding?.maxScore ?? 0),
      },
      student: { id: attempt.student.id, fullName: attempt.student.fullName },
      questions,
      codingProject: coding,
      answeredCount: orderedAnswers.filter((a) => a.selectedIndex !== null)
        .length,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      gradedAt: attempt.gradedAt,
      // Set when the teacher locked the test (it was submitted for the student).
      lockedAt: attempt.lockedAt,
      lockedByTeacher: !!attempt.lockedAt,
      // The clock the student's stopwatch is measured against — the browser's
      // own clock may be minutes off, which must not start the test at 03:12.
      serverTime: new Date(),
      report: report ? { id: report.id, status: report.status } : null,
      result: result ?? legacyResult,
    };
  }

  /** The cheap, frequent question a test tab asks: "is my test still open?"
   *  — answered without loading any questions. */
  async getAttemptState(attemptId: string, requester: Requester) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        lockedAt: true,
        studentUserId: true,
        student: { select: { assignedTeacher: { select: { userId: true } } } },
        scheduledLesson: { select: { teacher: { select: { userId: true } } } },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    this.assertCanView(attempt, requester);
    return {
      id: attempt.id,
      status: attempt.status,
      released: attempt.status === AttemptStatus.GRADED,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      lockedAt: attempt.lockedAt,
      lockedByTeacher: !!attempt.lockedAt,
      serverTime: new Date(),
    };
  }

  /** Who may look at an attempt: the student, their class's teacher or their
   *  currently assigned teacher, and admins. (A teacher is no longer let in
   *  just for teaching someone else in the same course.) */
  private assertCanView(
    attempt: {
      studentUserId: string;
      student: { assignedTeacher: { userId: string } | null };
      scheduledLesson: { teacher: { userId: string } } | null;
    },
    requester: Requester,
  ) {
    if (requester.role === Role.ADMIN) return;
    if (requester.userId === attempt.studentUserId) return;
    if (requester.role === Role.TEACHER) {
      if (attempt.scheduledLesson?.teacher.userId === requester.userId) return;
      if (attempt.student.assignedTeacher?.userId === requester.userId) return;
    }
    throw new ForbiddenException(
      'You do not have access to this test attempt.',
    );
  }

  // ═══ Student: autosave ═════════════════════════════════════════════════════

  /** Runs `fn` inside a transaction holding a SHARE lock on the attempt row,
   *  after checking it is the caller's and still IN_PROGRESS. submitAttempt
   *  takes the row's update lock first thing, so a save either lands before
   *  the lock-in (and is graded) or is refused — never silently lost. */
  private async withEditableAttempt<T>(
    attemptId: string,
    studentUserId: string,
    fn: (
      tx: Prisma.TransactionClient,
      row: { assessmentId: string },
    ) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        {
          studentUserId: string;
          status: AttemptStatus;
          assessmentId: string;
          lockedAt: Date | null;
        }[]
      >(
        Prisma.sql`SELECT "studentUserId", "status", "assessmentId", "lockedAt" FROM "AssessmentAttempt" WHERE "id" = ${attemptId} FOR SHARE`,
      );
      const row = rows[0];
      if (!row) throw new NotFoundException('Attempt not found');
      if (row.studentUserId !== studentUserId) throw new ForbiddenException();
      if (row.status !== AttemptStatus.IN_PROGRESS) {
        throw new ConflictException(
          row.lockedAt
            ? 'Your teacher locked this test, so answers can no longer be changed.'
            : 'This test has already been submitted, so answers can no longer be changed.',
        );
      }
      return fn(tx, { assessmentId: row.assessmentId });
    });
  }

  async saveAnswer(
    attemptId: string,
    dto: SaveAnswerDto,
    studentUserId: string,
  ) {
    return this.withEditableAttempt(attemptId, studentUserId, async (tx) => {
      const answer = await tx.mCQAnswer.findUnique({
        where: {
          attemptId_questionId: { attemptId, questionId: dto.questionId },
        },
        include: {
          question: { select: { options: true, correctIndex: true } },
        },
      });
      if (!answer)
        throw new NotFoundException('That question is not part of this test.');

      const options = answer.question.options as unknown as string[];
      let real: number | null = null;
      if (dto.selectedIndex !== undefined && dto.selectedIndex !== null) {
        if (
          !Number.isInteger(dto.selectedIndex) ||
          dto.selectedIndex < 0 ||
          dto.selectedIndex >= options.length
        ) {
          throw new BadRequestException(
            'Please choose one of the listed answers.',
          );
        }
        const order =
          answer.optionOrder.length === options.length
            ? answer.optionOrder
            : identityOrder(options.length);
        real = order[dto.selectedIndex];
      }
      const now = new Date();
      await tx.mCQAnswer.update({
        where: { id: answer.id },
        data: {
          selectedIndex: real,
          isCorrect: real !== null && real === answer.question.correctIndex,
          answeredAt: now,
        },
      });
      return { saved: true, savedAt: now };
    });
  }

  /** Autosave of the coding project's code. Saving never grades anything —
   *  the teacher marks the project. */
  async saveCode(attemptId: string, dto: SaveCodeDto, studentUserId: string) {
    return this.withEditableAttempt(
      attemptId,
      studentUserId,
      async (tx, row) => {
        await this.assertPracticalBelongs(tx, row.assessmentId, dto.questionId);
        const saved = await tx.practicalSubmission.upsert({
          where: {
            attemptId_questionId: { attemptId, questionId: dto.questionId },
          },
          create: { attemptId, questionId: dto.questionId, code: dto.code },
          update: { code: dto.code },
        });
        return { saved: true, savedAt: saved.updatedAt };
      },
    );
  }

  private async assertPracticalBelongs(
    tx: Prisma.TransactionClient,
    assessmentId: string,
    questionId: string,
  ) {
    const a = await tx.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, sourceAssessmentId: true },
    });
    if (!a) throw new NotFoundException('Assessment not found');
    const q = await tx.practicalQuestion.findUnique({
      where: { id: questionId },
      select: { assessmentId: true },
    });
    if (!q || q.assessmentId !== rootBankId(a))
      throw new NotFoundException(
        'That coding project is not part of this test.',
      );
  }

  // ═══ Student: submit ═══════════════════════════════════════════════════════

  async submitAttempt(
    attemptId: string,
    studentUserId: string,
    dto: SubmitAttemptDto = {},
  ) {
    const pre = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: { studentUserId: true, status: true },
    });
    if (!pre) throw new NotFoundException('Attempt not found');
    if (pre.studentUserId !== studentUserId) throw new ForbiddenException();
    if (pre.status !== AttemptStatus.IN_PROGRESS)
      return this.submissionSummary(attemptId, true);
    return this.finalizeSubmission(attemptId, studentUserId, dto, null);
  }

  /** The teacher's "Lock & submit" for one learner: submits the attempt exactly
   *  as it was last saved, and closes the class's test. Called by
   *  ClassTestsService, which has already checked the teacher may do this. */
  async lockAttempt(
    attemptId: string,
    studentUserId: string,
    scheduledLessonId: string,
    lockedByUserId: string,
  ) {
    return this.finalizeSubmission(
      attemptId,
      studentUserId,
      {},
      { byUserId: lockedByUserId, scheduledLessonId },
    );
  }

  /** Locks an attempt in and creates its report card. Used by the student's own
   *  Submit and by the teacher's lock (`lock` set), which submits whatever was
   *  saved — in the same transaction, so a lock can never leave an attempt
   *  half-submitted. Whoever claims the attempt first wins; the other caller
   *  gets the first result back. */
  private async finalizeSubmission(
    attemptId: string,
    studentUserId: string,
    dto: SubmitAttemptDto,
    lock: { byUserId: string; scheduledLessonId: string } | null,
  ) {
    const outcome = await this.prisma.$transaction(
      async (tx) => {
        // 1. Lock in. The UPDATE takes the row lock: it waits for any in-flight
        //    autosave (SHARE lock) and blocks new ones until we commit. Zero
        //    rows = another request submitted first.
        const lockedAt = new Date();
        const claimed = await tx.assessmentAttempt.updateMany({
          where: {
            id: attemptId,
            studentUserId,
            status: AttemptStatus.IN_PROGRESS,
          },
          data: {
            status: AttemptStatus.SUBMITTED,
            submittedAt: lockedAt,
            ...(lock ? { lockedAt, lockedByUserId: lock.byUserId } : {}),
          },
        });
        if (claimed.count === 0) return null;

        const attempt = await tx.assessmentAttempt.findUniqueOrThrow({
          where: { id: attemptId },
          include: {
            assessment: {
              select: {
                id: true,
                type: true,
                title: true,
                passScorePct: true,
                sourceAssessmentId: true,
                lessonId: true,
                lesson: {
                  select: {
                    courseId: true,
                    course: { select: { title: true } },
                  },
                },
              },
            },
            mcqAnswers: { include: { question: true } },
            practicalSubmissions: true,
            scheduledLesson: { select: { id: true, teacherId: true } },
            student: { select: { assignedTeacherId: true } },
          },
        });

        // 2. Apply the student's final answers (display index → canonical).
        const byQuestion = new Map(
          attempt.mcqAnswers.map((a) => [a.questionId, a]),
        );
        const finalSelection = new Map<string, number | null>(
          attempt.mcqAnswers.map((a) => [a.questionId, a.selectedIndex]),
        );
        for (const incoming of dto.answers ?? []) {
          const answer = byQuestion.get(incoming.questionId);
          if (!answer)
            throw new BadRequestException(
              'One of the answers is for a question that is not part of this test.',
            );
          const options = answer.question.options as unknown as string[];
          if (
            incoming.selectedIndex === undefined ||
            incoming.selectedIndex === null
          ) {
            finalSelection.set(answer.questionId, null);
            continue;
          }
          if (incoming.selectedIndex >= options.length)
            throw new BadRequestException(
              'Please choose one of the listed answers.',
            );
          const order =
            answer.optionOrder.length === options.length
              ? answer.optionOrder
              : identityOrder(options.length);
          finalSelection.set(answer.questionId, order[incoming.selectedIndex]);
        }
        for (const answer of attempt.mcqAnswers) {
          const next = finalSelection.get(answer.questionId) ?? null;
          if (next === answer.selectedIndex) continue;
          await tx.mCQAnswer.update({
            where: { id: answer.id },
            data: {
              selectedIndex: next,
              isCorrect: next !== null && next === answer.question.correctIndex,
              answeredAt: new Date(),
            },
          });
        }

        // 3. Final code for the coding project.
        const rootId = rootBankId(attempt.assessment);
        const bankPractical = await tx.practicalQuestion.findFirst({
          where: { assessmentId: rootId, isPublished: true },
          orderBy: { order: 'asc' },
        });
        let coding: SubmittedCoding | null = null;
        if (bankPractical) {
          const incomingCode = dto.practical?.find(
            (p) => p.questionId === bankPractical.id,
          )?.code;
          if (dto.practical?.some((p) => p.questionId !== bankPractical.id)) {
            throw new BadRequestException(
              'One of the submitted projects is not part of this test.',
            );
          }
          let sub =
            attempt.practicalSubmissions.find(
              (s) => s.questionId === bankPractical.id,
            ) ?? null;
          if (incomingCode !== undefined) {
            if (incomingCode.length > MAX_CODE_LENGTH)
              throw new BadRequestException('That code is too long.');
            sub = await tx.practicalSubmission.upsert({
              where: {
                attemptId_questionId: {
                  attemptId,
                  questionId: bankPractical.id,
                },
              },
              create: {
                attemptId,
                questionId: bankPractical.id,
                code: incomingCode,
              },
              update: { code: incomingCode },
            });
          }
          coding = {
            questionId: bankPractical.id,
            title: bankPractical.title,
            instructions: bankPractical.instructions,
            language: bankPractical.language,
            maxScore: bankPractical.maxScore,
            rubric: parseRubric(bankPractical.rubric),
            code: sub?.code ?? '',
            savedAt: sub?.updatedAt ?? null,
          };
        }

        // 4. Grade the objective part and build the report card.
        const teacherId =
          attempt.scheduledLesson?.teacherId ??
          attempt.student.assignedTeacherId;
        if (!teacherId) {
          throw new ConflictException(
            'No teacher is assigned to this class, so the test cannot be submitted yet. Please tell Lumexa Operations.',
          );
        }
        const answers: SubmittedAnswer[] = attempt.mcqQuestionIds
          .map((id) => byQuestion.get(id))
          .filter((a): a is NonNullable<typeof a> => !!a)
          .map((a) => ({
            questionId: a.questionId,
            kind: a.question.questionType,
            text: a.question.questionText,
            storedOptions: a.question.options as unknown as string[],
            optionOrder: a.optionOrder,
            selectedIndex: finalSelection.get(a.questionId) ?? null,
            correctIndex: a.question.correctIndex,
            explanation: a.question.explanation,
          }));
        const reportData = buildReportCreateData({
          attemptId,
          assessmentId: attempt.assessment.id,
          studentUserId,
          teacherId,
          courseId: attempt.assessment.lesson.courseId,
          courseTitle: attempt.assessment.lesson.course.title,
          lessonId: attempt.assessment.lessonId,
          scheduledLessonId: attempt.scheduledLesson?.id ?? null,
          type: attempt.assessment.type,
          testTitle: attempt.assessment.title,
          passScorePct: attempt.assessment.passScorePct,
          submittedAt: new Date(),
          answers,
          coding,
        });
        const report = await tx.testReport.create({ data: reportData });

        const objective = summarizeObjective(
          (report.questionResults as unknown as QuestionResult[]) ?? [],
        );
        await tx.assessmentAttempt.update({
          where: { id: attemptId },
          data: {
            mcqScore: objective.score,
            mcqMaxScore: objective.max,
            practicalMaxScore: coding?.maxScore ?? 0,
          },
        });
        if (lock) {
          // Remember that the teacher closed this student's test.
          await tx.scheduledLesson.update({
            where: { id: lock.scheduledLessonId },
            data: { testLockedAt: lockedAt, testLockedByUserId: lock.byUserId },
          });
        }
        return { reportId: report.id, teacherId };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    if (outcome === null) return this.submissionSummary(attemptId, true);

    // A teacher who pressed lock does not need an alert about it.
    if (!lock) {
      this.notifyTeacherOfSubmission(outcome.reportId).catch((err) =>
        this.logger.warn(
          `Could not alert the teacher about report ${outcome.reportId}: ${err}`,
        ),
      );
    }
    return this.submissionSummary(attemptId, false);
  }

  private async submissionSummary(
    attemptId: string,
    alreadySubmitted: boolean,
  ) {
    const a = await this.prisma.assessmentAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        report: { select: { id: true, status: true } },
      },
    });
    return {
      attemptId: a.id,
      status: a.status,
      submittedAt: a.submittedAt,
      alreadySubmitted,
      report: a.report,
    };
  }

  /** In-dashboard alert for the evaluating teacher the moment a test lands. */
  private async notifyTeacherOfSubmission(reportId: string) {
    const r = await this.prisma.testReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        testTitle: true,
        courseTitle: true,
        hasCodingProject: true,
        student: { select: { fullName: true } },
        teacher: { select: { userId: true } },
      },
    });
    if (!r) return;
    await this.alerts.create({
      userId: r.teacher.userId,
      role: Role.TEACHER,
      type: 'TEST_SUBMITTED',
      title: 'Test submitted',
      message: r.hasCodingProject
        ? `${r.student.fullName} submitted “${r.testTitle}” (${r.courseTitle}). The objective part is graded — the coding project is waiting for your marks.`
        : `${r.student.fullName} submitted “${r.testTitle}” (${r.courseTitle}). The report card is ready for your review.`,
      metadata: { reportId: r.id },
    });
  }

  // ═══ Class-level status (teacher monitor + student launcher) ═══════════════

  async getLessonTestStatus(scheduledLessonId: string, requester: Requester) {
    const sl = await this.prisma.scheduledLesson.findUnique({
      where: { id: scheduledLessonId },
      select: {
        id: true,
        studentUserId: true,
        status: true,
        testLockedAt: true,
        teacher: { select: { userId: true } },
        student: {
          select: {
            fullName: true,
            assignedTeacher: { select: { userId: true } },
          },
        },
        lesson: {
          select: {
            id: true,
            type: true,
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
        assessmentAttempt: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            submittedAt: true,
            lockedAt: true,
            mcqQuestionIds: true,
            mcqAnswers: { select: { selectedIndex: true } },
            report: { select: { id: true, status: true } },
          },
        },
      },
    });
    if (!sl) throw new NotFoundException('Class not found');
    const isOwner = sl.studentUserId === requester.userId;
    const isTeacher =
      requester.role === Role.TEACHER &&
      (sl.teacher.userId === requester.userId ||
        sl.student.assignedTeacher?.userId === requester.userId);
    if (!isOwner && !isTeacher && requester.role !== Role.ADMIN)
      throw new ForbiddenException('You do not have access to this class.');

    const assessment = sl.lesson?.assessment ?? null;
    const attempt = sl.assessmentAttempt;
    return {
      scheduledLessonId: sl.id,
      studentName: sl.student.fullName,
      assessment: assessment
        ? {
            id: assessment.id,
            type: assessment.type,
            title: assessment.title,
            isPublished: assessment.isPublished,
            ...(await this.bankSummary(assessment)),
          }
        : null,
      // The teacher closed this class's test before the student started it.
      closedAt: attempt ? null : sl.testLockedAt,
      serverTime: new Date(),
      attempt: attempt
        ? {
            id: attempt.id,
            status: attempt.status,
            startedAt: attempt.startedAt,
            submittedAt: attempt.submittedAt,
            lockedAt: attempt.lockedAt,
            lockedByTeacher: !!attempt.lockedAt,
            total: attempt.mcqQuestionIds.length,
            answered: attempt.mcqAnswers.filter((a) => a.selectedIndex !== null)
              .length,
          }
        : null,
      // The report id/status is for the teacher; a student only needs to know
      // their result is under review or released (via the attempt itself).
      report: isOwner && !isTeacher ? null : (attempt?.report ?? null),
    };
  }

  /** Published question counts of an assessment's root bank, against the standard. */
  bankSummary(assessment: {
    id: string;
    sourceAssessmentId: string | null;
    type: SessionType;
  }) {
    return getBankSummary(this.prisma, assessment);
  }

  /** The teacher's preview of the test they are about to run in class —
   *  questions without answers unless explicitly asked for. */
  async previewForTeacher(
    assessmentId: string,
    requester: Requester,
    includeAnswers: boolean,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        type: true,
        title: true,
        instructions: true,
        sourceAssessmentId: true,
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (requester.role !== Role.ADMIN) {
      const teaches =
        requester.role === Role.TEACHER &&
        (await this.prisma.scheduledLesson.findFirst({
          where: {
            teacher: { userId: requester.userId },
            lesson: { assessment: { id: assessmentId } },
          },
          select: { id: true },
        }));
      if (!teaches)
        throw new ForbiddenException(
          'You are not assigned to teach this test.',
        );
    }
    const rootId = rootBankId(assessment);
    const [questions, practicals] = await Promise.all([
      this.prisma.mCQQuestion.findMany({
        where: { assessmentId: rootId, isPublished: true },
        orderBy: { order: 'asc' },
      }),
      this.prisma.practicalQuestion.findMany({
        where: { assessmentId: rootId, isPublished: true },
        orderBy: { order: 'asc' },
      }),
    ]);
    return {
      id: assessment.id,
      type: assessment.type,
      title: assessment.title,
      instructions: assessment.instructions,
      ...(await this.bankSummary(assessment)),
      questions: questions.map((q, i) => ({
        id: q.id,
        order: i + 1,
        kind: q.questionType,
        text: q.questionText,
        options: q.options as unknown as string[],
        ...(includeAnswers
          ? { correctIndex: q.correctIndex, explanation: q.explanation }
          : {}),
      })),
      codingProjects: practicals.map((p) => ({
        id: p.id,
        title: p.title,
        instructions: p.instructions,
        language: p.language,
        maxScore: p.maxScore,
        rubric: parseRubric(p.rubric),
      })),
    };
  }

  // ═══ Legacy viva (superseded by the coding project) ════════════════════════

  async recordViva(
    attemptId: string,
    dto: RecordVivaDto,
    requester: Requester,
  ) {
    if (requester.role !== Role.TEACHER && requester.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only a teacher or admin can record a viva.',
      );
    }
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: { include: { lesson: { select: { courseId: true } } } },
        report: { select: { id: true } },
        student: { select: { assignedTeacher: { select: { userId: true } } } },
        scheduledLesson: { select: { teacher: { select: { userId: true } } } },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.report) {
      throw new BadRequestException(
        'This test is evaluated through its report card — open it under Test Evaluations.',
      );
    }
    this.assertCanView(attempt, requester);
    if (attempt.assessment.type !== SessionType.FINAL_TEST) {
      throw new BadRequestException(
        'Only a Final Test attempt has a viva component.',
      );
    }
    if (
      attempt.status === AttemptStatus.IN_PROGRESS ||
      attempt.status === AttemptStatus.NOT_STARTED
    ) {
      throw new BadRequestException(
        'The student must submit the test before a viva can be recorded.',
      );
    }

    let teacherProfileId: string | null = null;
    if (requester.role === Role.TEACHER) {
      const tp = await this.prisma.teacherProfile.findUnique({
        where: { userId: requester.userId },
        select: { id: true },
      });
      if (!tp) throw new ForbiddenException('No teacher profile found.');
      teacherProfileId = tp.id;
    } else {
      const assigned = await this.prisma.scheduledLesson.findFirst({
        where: {
          courseId: attempt.assessment.lesson.courseId,
          studentUserId: attempt.studentUserId,
        },
        select: { teacherId: true },
        orderBy: { start: 'desc' },
      });
      if (!assigned)
        throw new BadRequestException(
          'No assigned teacher found to attribute this viva to.',
        );
      teacherProfileId = assigned.teacherId;
    }

    const viva = await this.prisma.vivaRecord.upsert({
      where: { attemptId },
      update: {
        questions: dto.questions as unknown as object,
        score: dto.score,
        remarks: dto.remarks,
        recordedByTeacherId: teacherProfileId,
      },
      create: {
        attemptId,
        recordedByTeacherId: teacherProfileId,
        questions: dto.questions as unknown as object,
        score: dto.score,
        maxScore: attempt.vivaMaxScore ?? 20,
        remarks: dto.remarks,
      },
    });

    const mcqPct = attempt.mcqMaxScore
      ? ((attempt.mcqScore ?? 0) / attempt.mcqMaxScore) * 100
      : null;
    const practicalPct = attempt.practicalMaxScore
      ? ((attempt.practicalScore ?? 0) / attempt.practicalMaxScore) * 100
      : null;
    const vivaPct =
      attempt.vivaMaxScore && dto.score !== undefined
        ? (dto.score / attempt.vivaMaxScore) * 100
        : null;
    const parts = [mcqPct, practicalPct, vivaPct].filter(
      (p): p is number => p !== null,
    );
    const totalScore = parts.length
      ? Math.round((parts.reduce((s, p) => s + p, 0) / parts.length) * 10) / 10
      : 0;
    const passed = totalScore >= attempt.assessment.passScorePct;

    await this.prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        vivaScore: dto.score,
        totalScore,
        totalMaxScore: 100,
        passed,
        status: AttemptStatus.GRADED,
        gradedAt: new Date(),
      },
    });
    if (passed) {
      this.certificates
        .checkAndIssueCertificate(
          attempt.studentUserId,
          attempt.assessment.lesson.courseId,
        )
        .catch(() => {});
    }
    return viva;
  }

  // ═══ Results listing ═══════════════════════════════════════════════════════

  async listAttemptsForStudent(studentUserId: string, requester: Requester) {
    if (requester.role === Role.ADMIN || requester.userId === studentUserId) {
      // allowed
    } else if (requester.role === Role.TEACHER) {
      const related = await this.prisma.user.findFirst({
        where: {
          id: studentUserId,
          OR: [
            { assignedTeacher: { userId: requester.userId } },
            {
              scheduledLessons: {
                some: { teacher: { userId: requester.userId } },
              },
            },
          ],
        },
        select: { id: true },
      });
      if (!related)
        throw new ForbiddenException("You are not this student's teacher.");
    } else {
      throw new ForbiddenException();
    }
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { studentUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        gradedAt: true,
        passed: true,
        totalScore: true,
        report: { select: { id: true, status: true, percentage: true } },
        assessment: {
          select: {
            title: true,
            type: true,
            lesson: {
              select: { title: true, course: { select: { title: true } } },
            },
          },
        },
      },
    });
    if (requester.role !== Role.STUDENT) return attempts;
    // A student sees a result only once the teacher has approved it; until
    // then the report card (and its automatic score) stays with the teacher.
    return attempts.map((a) =>
      a.status === AttemptStatus.GRADED
        ? a
        : { ...a, passed: null, totalScore: null, report: null },
    );
  }

  async listAttemptsForCourse(courseId: string, requester: Requester) {
    if (requester.role === Role.TEACHER) {
      const teaches = await this.prisma.scheduledLesson.findFirst({
        where: { courseId, teacher: { userId: requester.userId } },
        select: { id: true },
      });
      if (!teaches)
        throw new ForbiddenException(
          'You are not assigned to teach this curriculum.',
        );
    } else if (requester.role !== Role.ADMIN) {
      throw new ForbiddenException();
    }
    return this.prisma.assessmentAttempt.findMany({
      where: {
        assessment: { lesson: { courseId } },
        // A teacher only sees their own students' attempts.
        ...(requester.role === Role.TEACHER
          ? {
              OR: [
                { scheduledLesson: { teacher: { userId: requester.userId } } },
                { student: { assignedTeacher: { userId: requester.userId } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        passed: true,
        totalScore: true,
        student: { select: { id: true, fullName: true } },
        assessment: { select: { title: true, type: true } },
        report: { select: { id: true, status: true } },
      },
    });
  }

  // ═══ Admin: question bank + assessment settings ════════════════════════════

  async getAssessmentAdmin(assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        lesson: {
          select: {
            title: true,
            courseId: true,
            course: { select: { title: true } },
          },
        },
        sourceAssessment: {
          select: {
            id: true,
            title: true,
            lesson: {
              select: { title: true, course: { select: { title: true } } },
            },
          },
        },
        _count: { select: { attempts: true } },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    const rootId = rootBankId(assessment);
    const [mcqQuestions, practicalQuestions, linkedCount, summary] =
      await Promise.all([
        this.prisma.mCQQuestion.findMany({
          where: { assessmentId: rootId },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.practicalQuestion.findMany({
          where: { assessmentId: rootId },
          orderBy: { order: 'asc' },
        }),
        this.prisma.assessment.count({
          where: { sourceAssessmentId: rootId, NOT: { id: assessmentId } },
        }),
        this.bankSummary(assessment),
      ]);
    const shape =
      assessment.type === SessionType.LEARNING
        ? null
        : TEST_SHAPES[assessment.type];
    const issues: string[] = [];
    if (shape) {
      if (summary.counts.mcq !== shape.mcq)
        issues.push(
          `Expected ${shape.mcq} multiple-choice questions, found ${summary.counts.mcq}.`,
        );
      if (summary.counts.trueFalse !== shape.trueFalse)
        issues.push(
          `Expected ${shape.trueFalse} True/False questions, found ${summary.counts.trueFalse}.`,
        );
      const wantPractical = shape.codingProject ? 1 : 0;
      if (summary.counts.practical !== wantPractical) {
        issues.push(
          wantPractical
            ? `A Final Test needs exactly one coding project, found ${summary.counts.practical}.`
            : `A ${assessment.type.replace('_', ' ').toLowerCase()} has no coding project, found ${summary.counts.practical}.`,
        );
      }
    }
    return {
      ...assessment,
      mcqQuestions,
      practicalQuestions,
      bank: {
        assessmentId: rootId,
        isShared: rootId !== assessment.id,
        sourceTitle: assessment.sourceAssessment?.lesson.title ?? null,
        sourceCourseTitle:
          assessment.sourceAssessment?.lesson.course.title ?? null,
        linkedCount,
      },
      standard: {
        expectedMcq: shape?.mcq ?? 0,
        expectedTrueFalse: shape?.trueFalse ?? 0,
        expectedCodingProject: shape?.codingProject ?? false,
        expectedTotalMarks: shape
          ? expectedTotalMarks(assessment.type as BankTestType)
          : 0,
        counts: summary.counts,
        meets: summary.meetsStandard,
        issues,
      },
    };
  }

  async updateAssessmentSettings(
    assessmentId: string,
    dto: Record<string, unknown>,
  ) {
    const a = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!a) throw new NotFoundException('Assessment not found');
    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: dto,
    });
  }

  /** Every question edit lands on the ROOT bank, so editing it from a custom
   *  curriculum's page fixes it for the original course too (and vice versa). */
  private async rootIdFor(assessmentId: string): Promise<string> {
    const a = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, sourceAssessmentId: true },
    });
    if (!a) throw new NotFoundException('Assessment not found');
    return rootBankId(a);
  }

  private validateQuestionShape(q: {
    questionType: QuestionKind;
    questionText: string;
    options: string[];
    correctIndex: number;
  }) {
    if (!q.questionText.trim())
      throw new BadRequestException('The question needs some text.');
    if (q.questionType === QuestionKind.TRUE_FALSE) {
      if (
        q.options.length !== 2 ||
        q.options[0] !== TRUE_FALSE_OPTIONS[0] ||
        q.options[1] !== TRUE_FALSE_OPTIONS[1]
      ) {
        throw new BadRequestException(
          'A True/False question has exactly the options "True" and "False".',
        );
      }
      if (q.correctIndex !== 0 && q.correctIndex !== 1)
        throw new BadRequestException('Pick True or False as the answer.');
      return;
    }
    if (q.options.length !== 4)
      throw new BadRequestException(
        'A multiple-choice question needs exactly four options.',
      );
    const cleaned = q.options.map((o) => o.trim().toLowerCase());
    if (cleaned.some((o) => !o))
      throw new BadRequestException('All four options need text.');
    if (new Set(cleaned).size !== 4)
      throw new BadRequestException('The four options must all be different.');
    if (q.correctIndex < 0 || q.correctIndex > 3)
      throw new BadRequestException(
        'Pick which of the four options is correct.',
      );
  }

  async createMCQQuestion(assessmentId: string, dto: Record<string, unknown>) {
    const rootId = await this.rootIdFor(assessmentId);
    const questionType =
      (dto.questionType as QuestionKind | undefined) ?? QuestionKind.MCQ;
    const options =
      questionType === QuestionKind.TRUE_FALSE
        ? [...TRUE_FALSE_OPTIONS]
        : (dto.options as string[]);
    const questionText =
      typeof dto.questionText === 'string' ? dto.questionText : '';
    this.validateQuestionShape({
      questionType,
      questionText,
      options,
      correctIndex: Number(dto.correctIndex),
    });
    const last = await this.prisma.mCQQuestion.aggregate({
      where: { assessmentId: rootId },
      _max: { order: true },
    });
    return this.prisma.mCQQuestion.create({
      data: {
        assessmentId: rootId,
        questionType,
        questionText: questionText.trim(),
        options: options as unknown as Prisma.InputJsonValue,
        correctIndex: Number(dto.correctIndex),
        explanation: (dto.explanation as string | undefined) ?? null,
        difficulty: (dto.difficulty as string | undefined) ?? null,
        tags: (dto.tags as string[] | undefined) ?? [],
        order: (dto.order as number | undefined) ?? (last._max.order ?? -1) + 1,
        isPublished: (dto.isPublished as boolean | undefined) ?? true,
        editedByAdmin: true,
      },
    });
  }

  async updateMCQQuestion(id: string, dto: Record<string, unknown>) {
    const q = await this.prisma.mCQQuestion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    const questionType =
      (dto.questionType as QuestionKind | undefined) ?? q.questionType;
    const options =
      questionType === QuestionKind.TRUE_FALSE
        ? [...TRUE_FALSE_OPTIONS]
        : ((dto.options as string[] | undefined) ??
          (q.options as unknown as string[]));
    const correctIndex =
      dto.correctIndex !== undefined
        ? Number(dto.correctIndex)
        : q.correctIndex;
    const questionText =
      typeof dto.questionText === 'string' ? dto.questionText : q.questionText;
    this.validateQuestionShape({
      questionType,
      questionText,
      options,
      correctIndex,
    });
    const {
      questionType: _qt,
      options: _o,
      correctIndex: _ci,
      questionText: _qx,
      ...rest
    } = dto;
    void _qt;
    void _o;
    void _ci;
    void _qx;
    return this.prisma.mCQQuestion.update({
      where: { id },
      data: {
        ...(rest as Prisma.MCQQuestionUpdateInput),
        questionType,
        questionText: questionText.trim(),
        options: options as unknown as Prisma.InputJsonValue,
        correctIndex,
        editedByAdmin: true,
      },
    });
  }

  async deleteMCQQuestion(id: string) {
    const q = await this.prisma.mCQQuestion.findUnique({
      where: { id },
      select: { id: true, _count: { select: { answers: true } } },
    });
    if (!q) throw new NotFoundException('Question not found');
    // A question students have answered is history: keep it, stop using it.
    if (q._count.answers > 0) {
      await this.prisma.mCQQuestion.update({
        where: { id },
        data: { isPublished: false, editedByAdmin: true },
      });
      return { success: true, unpublishedInstead: true };
    }
    await this.prisma.mCQQuestion.delete({ where: { id } });
    return { success: true, unpublishedInstead: false };
  }

  async createPracticalQuestion(
    assessmentId: string,
    dto: Record<string, unknown>,
  ) {
    const rootId = await this.rootIdFor(assessmentId);
    return this.prisma.practicalQuestion.create({
      data: { ...dto, assessmentId: rootId } as never,
    });
  }

  async updatePracticalQuestion(id: string, dto: Record<string, unknown>) {
    const q = await this.prisma.practicalQuestion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    return this.prisma.practicalQuestion.update({
      where: { id },
      data: dto as never,
    });
  }

  async deletePracticalQuestion(id: string) {
    const q = await this.prisma.practicalQuestion.findUnique({
      where: { id },
      select: { id: true, _count: { select: { submissions: true } } },
    });
    if (!q) throw new NotFoundException('Question not found');
    if (q._count.submissions > 0) {
      await this.prisma.practicalQuestion.update({
        where: { id },
        data: { isPublished: false },
      });
      return { success: true, unpublishedInstead: true };
    }
    await this.prisma.practicalQuestion.delete({ where: { id } });
    return { success: true, unpublishedInstead: false };
  }

  // ═══ Admin: give a test lesson a question bank ═════════════════════════════

  /** Every bank a test lesson can be linked to: the root (non-linked)
   *  assessments, labelled by the course and lesson that own them. */
  async listLinkableBanks() {
    const banks = await this.prisma.assessment.findMany({
      where: { sourceAssessmentId: null },
      select: {
        id: true,
        type: true,
        title: true,
        lesson: {
          select: {
            title: true,
            course: { select: { title: true, isCustom: true } },
          },
        },
        _count: { select: { mcqQuestions: { where: { isPublished: true } } } },
      },
      orderBy: [
        { lesson: { course: { title: 'asc' } } },
        { lesson: { order: 'asc' } },
      ],
    });
    return banks
      .filter((b) => b._count.mcqQuestions > 0)
      .map((b) => ({
        id: b.id,
        type: b.type,
        label: `${b.lesson.course.title} — ${b.lesson.title}`,
        questionCount: b._count.mcqQuestions,
      }));
  }

  /** Gives a test-type lesson that has no assessment one: linked to an
   *  existing bank, or an empty bank of its own to fill in by hand. */
  async attachBankToLesson(lessonId: string, sourceAssessmentId?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        type: true,
        title: true,
        assessment: { select: { id: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.type === SessionType.LEARNING)
      throw new BadRequestException(
        'Only a test session (Course/Stage/Final Test) has a question bank.',
      );
    if (lesson.assessment)
      throw new ConflictException('This lesson already has a question bank.');

    if (sourceAssessmentId) {
      const source = await this.prisma.assessment.findUnique({
        where: { id: sourceAssessmentId },
        select: BANK_OWNER_SELECT,
      });
      if (!source)
        throw new NotFoundException('That question bank no longer exists.');
      await ensureLinkedAssessment(this.prisma, lesson.id, lesson.type, source);
    } else {
      await this.prisma.assessment.create({
        data: {
          lessonId: lesson.id,
          type: lesson.type,
          title: lesson.title,
          isPublished: false,
        },
      });
    }
    return this.prisma.assessment.findUniqueOrThrow({
      where: { lessonId: lesson.id },
    });
  }
}

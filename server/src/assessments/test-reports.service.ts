// FILE PATH: server/src/assessments/test-reports.service.ts
//
// The teacher's side of a test: the Test Evaluation report card.
//
//   Course/Stage test:  PENDING_REVIEW ──approve──▶ READY_TO_SHARE ──share──▶ SHARED_WITH_PARENTS
//   Final test:         PENDING_CODE_EVALUATION ─(every rubric criterion marked)─▶ PENDING_REVIEW
//                       ──approve──▶ READY_TO_SHARE ──share──▶ SHARED_WITH_PARENTS
//
// The report is created by AssessmentsService.submitAttempt with the objective
// part already auto-graded. Here a teacher reviews it, may override single
// questions, marks the coding project against the rubric, writes feedback, and
// approves it (which releases the result to the student). Sharing then emails
// the parent/guardian — for real: SHARED_WITH_PARENTS is only set after the
// mail server accepted the message.
//
// Automatic results are never rewritten. `autoObjectiveScore` and each
// question's `autoCorrect` stay as graded; a teacher's change is stored next to
// them (questionResults[].override), and every total is RECOMPUTED from those
// facts on each edit (assessment-grading.ts) instead of being patched.

import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  Prisma,
  Role,
  SessionType,
  TestReportStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CertificatesService } from '../certificates/certificates.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  QuestionResult,
  ReportValidationError,
  RubricScore,
  applyQuestionOverrides,
  applyRubricScores,
  computeTotals,
  sumRubric,
  summarizeObjective,
} from './assessment-grading';
import {
  ListTestReportsQueryDto,
  UpdateTestReportDto,
} from './dto/test-report.dto';
import { Requester } from './assessments.service';

/** A share that has not finished within this long is treated as abandoned
 *  (the server died mid-send). Longer than EmailService.sendTracked's wait, so
 *  a send that is merely slow is never raced by a second one. */
const SHARE_IN_FLIGHT_MS = 60_000;

const PENDING: TestReportStatus[] = [
  TestReportStatus.PENDING_REVIEW,
  TestReportStatus.PENDING_CODE_EVALUATION,
];

const TYPE_LABEL: Record<string, string> = {
  COURSE_TEST: 'Course Test',
  STAGE_TEST: 'Stage Test',
  FINAL_TEST: 'Final Test',
};

/** Columns the list needs — deliberately not the big per-question JSON. */
const LIST_SELECT = {
  id: true,
  status: true,
  testTitle: true,
  assessmentType: true,
  courseTitle: true,
  submittedAt: true,
  hasCodingProject: true,
  objectiveScore: true,
  autoObjectiveScore: true,
  objectiveMaxScore: true,
  codingScore: true,
  codingMaxScore: true,
  totalScore: true,
  totalMaxScore: true,
  percentage: true,
  passed: true,
  teacherEdited: true,
  approvedAt: true,
  sharedAt: true,
  updatedAt: true,
  shareEmailLogId: true,
  student: { select: { id: true, fullName: true, avatarUrl: true } },
} satisfies Prisma.TestReportSelect;

function cleanText(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function isShareInFlight(startedAt: Date | null, now: Date): boolean {
  return (
    !!startedAt && now.getTime() - startedAt.getTime() < SHARE_IN_FLIGHT_MS
  );
}

@Injectable()
export class TestReportsService {
  private readonly logger = new Logger(TestReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly certificates: CertificatesService,
  ) {}

  // ─── Access ───────────────────────────────────────────────────────────────

  /** Reports a requester may see: all (admin), or — for a teacher — those of
   *  their own classes plus those of students currently assigned to them. */
  private async accessWhere(
    requester: Requester,
  ): Promise<Prisma.TestReportWhereInput> {
    if (requester.role === Role.ADMIN) return {};
    if (requester.role !== Role.TEACHER)
      throw new ForbiddenException('Only teachers can evaluate tests.');
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId: requester.userId },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenException('No teacher profile found.');
    return {
      OR: [
        { teacherId: profile.id },
        { student: { assignedTeacherId: profile.id } },
      ],
    };
  }

  private async loadFull(id: string, requester: Requester) {
    const access = await this.accessWhere(requester);
    const report = await this.prisma.testReport.findFirst({
      where: { AND: [{ id }, access] },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
            billingContactEmail: true,
          },
        },
        teacher: { select: { id: true, user: { select: { fullName: true } } } },
        // When the test was started and how it ended (handed in, or locked by
        // the teacher when time was up).
        attempt: {
          select: { startedAt: true, submittedAt: true, lockedAt: true },
        },
      },
    });
    if (!report) throw new NotFoundException('Report not found.');
    return this.reconcileShare(report);
  }

  /** A share whose first attempt timed out may still have been delivered
   *  afterwards. The EmailLog is the source of truth: promote the report when
   *  it says SENT, so the status never lags reality. */
  private async reconcileShare<
    T extends {
      id: string;
      status: TestReportStatus;
      shareEmailLogId: string | null;
    },
  >(report: T): Promise<T> {
    if (
      report.status !== TestReportStatus.READY_TO_SHARE ||
      !report.shareEmailLogId
    )
      return report;
    const log = await this.prisma.emailLog.findUnique({
      where: { id: report.shareEmailLogId },
      select: { status: true, sentAt: true },
    });
    if (log?.status !== 'SENT') return report;
    const updated = await this.prisma.testReport.update({
      where: { id: report.id },
      data: {
        status: TestReportStatus.SHARED_WITH_PARENTS,
        sharedAt: log.sentAt ?? new Date(),
        lastShareError: null,
      },
    });
    return {
      ...report,
      status: updated.status,
      sharedAt: updated.sharedAt,
    } as T;
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  async list(requester: Requester, query: ListTestReportsQueryDto) {
    const access = await this.accessWhere(requester);
    const where: Prisma.TestReportWhereInput = { AND: [access] };
    const and = where.AND as Prisma.TestReportWhereInput[];
    if (query.status === 'PENDING') and.push({ status: { in: PENDING } });
    else if (query.status) and.push({ status: query.status });
    if (query.type) and.push({ assessmentType: query.type });
    if (query.studentUserId) and.push({ studentUserId: query.studentUserId });

    const rows = await this.prisma.testReport.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { submittedAt: 'desc' },
      take: 300,
    });
    const items = await Promise.all(rows.map((r) => this.reconcileShare(r)));
    // Work that needs the teacher first, then newest first.
    items.sort((a, b) => {
      const ap = PENDING.includes(a.status) ? 0 : 1;
      const bp = PENDING.includes(b.status) ? 0 : 1;
      return ap - bp || b.submittedAt.getTime() - a.submittedAt.getTime();
    });
    return items.map(({ shareEmailLogId: _log, ...r }) => {
      void _log;
      return {
        ...r,
        typeLabel: TYPE_LABEL[r.assessmentType] ?? r.assessmentType,
        needsAction: PENDING.includes(r.status),
      };
    });
  }

  async summary(requester: Requester) {
    const access = await this.accessWhere(requester);
    const groups = await this.prisma.testReport.groupBy({
      by: ['status'],
      where: access,
      _count: { _all: true },
    });
    const n = (s: TestReportStatus) =>
      groups.find((g) => g.status === s)?._count._all ?? 0;
    return {
      pendingReview: n(TestReportStatus.PENDING_REVIEW),
      pendingCodeEvaluation: n(TestReportStatus.PENDING_CODE_EVALUATION),
      readyToShare: n(TestReportStatus.READY_TO_SHARE),
      sharedWithParents: n(TestReportStatus.SHARED_WITH_PARENTS),
      needsAction:
        n(TestReportStatus.PENDING_REVIEW) +
        n(TestReportStatus.PENDING_CODE_EVALUATION),
    };
  }

  async get(id: string, requester: Requester) {
    const report = await this.loadFull(id, requester);
    return this.toDetail(report);
  }

  /** Where a share would go, and the real delivery state of the last send. */
  private async shareInfo(report: {
    status: TestReportStatus;
    shareEmailLogId: string | null;
    sharedAt: Date | null;
    sharedToEmail: string | null;
    shareRecipientKind: string | null;
    lastShareError: string | null;
    shareAttempts: number;
    shareStartedAt: Date | null;
    student: { email: string; billingContactEmail: string | null };
  }) {
    const recipient = this.resolveRecipient(report.student);
    const sending = isShareInFlight(report.shareStartedAt, new Date());
    const log = report.shareEmailLogId
      ? await this.prisma.emailLog.findUnique({
          where: { id: report.shareEmailLogId },
          select: { status: true, sentAt: true, lastError: true },
        })
      : null;
    return {
      recipient,
      sharedAt: report.sharedAt,
      sharedToEmail: report.sharedToEmail,
      sharedToKind: report.shareRecipientKind,
      deliveryStatus: log?.status ?? null,
      lastError:
        report.lastShareError ??
        (log?.status === 'FAILED' ? log.lastError : null),
      attempts: report.shareAttempts,
      sending,
      canShare: report.status === TestReportStatus.READY_TO_SHARE && !sending,
    };
  }

  private resolveRecipient(student: {
    email: string;
    billingContactEmail: string | null;
  }) {
    const billing = student.billingContactEmail?.trim();
    return billing
      ? { email: billing, kind: 'BILLING_CONTACT' as const }
      : { email: student.email, kind: 'STUDENT_ACCOUNT' as const };
  }

  private async toDetail(
    report: Awaited<ReturnType<TestReportsService['loadFull']>>,
  ) {
    const results =
      (report.questionResults as unknown as QuestionResult[]) ?? [];
    const objective = summarizeObjective(results);
    const rubric =
      (report.codingRubricScores as unknown as RubricScore[] | null) ?? [];
    const project = report.codingProject as unknown as {
      questionId: string;
      title: string;
      instructions: string;
      language: string;
      code: string;
      savedAt: string | null;
    } | null;
    return {
      id: report.id,
      attemptId: report.attemptId,
      status: report.status,
      assessmentType: report.assessmentType,
      typeLabel: TYPE_LABEL[report.assessmentType] ?? report.assessmentType,
      testTitle: report.testTitle,
      courseTitle: report.courseTitle,
      student: {
        id: report.student.id,
        fullName: report.student.fullName,
        avatarUrl: report.student.avatarUrl,
      },
      teacher: {
        id: report.teacher.id,
        fullName: report.teacher.user.fullName,
      },
      passScorePct: report.passScorePct,
      objective: {
        mcq: { correct: objective.mcqCorrect, total: objective.mcqTotal },
        trueFalse: {
          correct: objective.trueFalseCorrect,
          total: objective.trueFalseTotal,
        },
        score: objective.score,
        autoScore: objective.autoScore,
        max: objective.max,
        overrides: objective.overrides,
        unanswered: objective.unanswered,
      },
      questions: results,
      coding: report.hasCodingProject
        ? {
            project,
            rubric,
            score: report.codingScore,
            max: report.codingMaxScore,
            feedback: report.codingFeedback,
            evaluatedAt: report.codingEvaluatedAt,
            hasCode: !!project?.code?.trim(),
          }
        : null,
      totals: {
        total: report.totalScore,
        totalMax: report.totalMaxScore,
        percentage: report.percentage,
        passed: report.passed,
      },
      feedback: report.feedback,
      strengths: report.strengths,
      improvements: report.improvements,
      teacherEdited: report.teacherEdited,
      timeline: {
        startedAt: report.attempt.startedAt,
        submittedAt: report.submittedAt,
        // Set when the teacher locked the test instead of the student handing
        // it in — the answers are whatever had been saved by then.
        lockedByTeacherAt: report.attempt.lockedAt,
        timeTakenSeconds:
          report.attempt.startedAt && report.attempt.submittedAt
            ? Math.max(
                0,
                Math.round(
                  (report.attempt.submittedAt.getTime() -
                    report.attempt.startedAt.getTime()) /
                    1000,
                ),
              )
            : null,
        lastEditedAt: report.lastEditedAt,
        approvedAt: report.approvedAt,
        sharedAt: report.sharedAt,
      },
      share: await this.shareInfo(report),
      updatedAt: report.updatedAt,
    };
  }

  // ─── Edit ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateTestReportDto, requester: Requester) {
    const report = await this.loadFull(id, requester);
    this.assertEditable(report.status);
    if (
      dto.expectedUpdatedAt &&
      new Date(dto.expectedUpdatedAt).getTime() !== report.updatedAt.getTime()
    ) {
      throw new ConflictException(
        'This report was changed somewhere else. Reload it to see the latest version.',
      );
    }

    const nowIso = new Date().toISOString();
    let results = (report.questionResults as unknown as QuestionResult[]) ?? [];
    let rubric =
      (report.codingRubricScores as unknown as RubricScore[] | null) ?? [];
    try {
      if (dto.questionOverrides) {
        results = applyQuestionOverrides(
          results,
          dto.questionOverrides.map((o) => ({
            questionId: o.questionId,
            correct: o.correct ?? null,
            note: o.note ?? null,
          })),
          nowIso,
        );
      }
      if (dto.codingRubricScores) {
        if (!report.hasCodingProject)
          throw new ReportValidationError(
            'This test has no coding project to mark.',
          );
        rubric = applyRubricScores(
          rubric,
          dto.codingRubricScores.map((s) => ({
            criterion: s.criterion,
            score: s.score ?? null,
          })),
        );
      }
    } catch (err) {
      if (err instanceof ReportValidationError)
        throw new BadRequestException(err.message);
      throw err;
    }

    const next = {
      feedback:
        dto.feedback !== undefined ? cleanText(dto.feedback) : report.feedback,
      strengths:
        dto.strengths !== undefined
          ? cleanText(dto.strengths)
          : report.strengths,
      improvements:
        dto.improvements !== undefined
          ? cleanText(dto.improvements)
          : report.improvements,
      codingFeedback:
        dto.codingFeedback !== undefined
          ? cleanText(dto.codingFeedback)
          : report.codingFeedback,
    };
    const computed = this.recompute(report, results, rubric);
    const teacherEdited =
      computed.objective.overrides > 0 ||
      rubric.some((r) => r.score !== null) ||
      Object.values(next).some((v) => !!v);

    const codingScoreChanged = computed.codingScore !== report.codingScore;
    const write = await this.prisma.testReport.updateMany({
      // The WHERE doubles as the concurrency guard: nothing is written if the
      // report moved on (approved, edited elsewhere) since it was loaded.
      where: { id, updatedAt: report.updatedAt, status: { in: PENDING } },
      data: {
        questionResults: results as unknown as Prisma.InputJsonValue,
        objectiveScore: computed.objective.score,
        codingRubricScores: report.hasCodingProject
          ? (rubric as unknown as Prisma.InputJsonValue)
          : undefined,
        codingScore: computed.codingScore,
        codingEvaluatedAt:
          computed.codingScore === null
            ? null
            : codingScoreChanged
              ? new Date()
              : report.codingEvaluatedAt,
        totalScore: computed.totals.total,
        percentage: computed.totals.percentage,
        passed: computed.totals.passed,
        status: computed.status,
        ...next,
        teacherEdited,
        lastEditedAt: new Date(),
        lastEditedByUserId: requester.userId,
      },
    });
    if (write.count === 0)
      throw new ConflictException(
        'This report was changed somewhere else. Reload it to see the latest version.',
      );

    if (report.hasCodingProject && codingScoreChanged) {
      // Mirror the teacher's mark onto the stored submission (older screens read it there).
      await this.prisma.practicalSubmission.updateMany({
        where: { attemptId: report.attemptId },
        data: { score: computed.codingScore },
      });
    }
    return this.get(id, requester);
  }

  private assertEditable(status: TestReportStatus) {
    if (status === TestReportStatus.SHARED_WITH_PARENTS) {
      throw new ConflictException(
        'This report was already shared with the parent, so it is locked.',
      );
    }
    if (status === TestReportStatus.READY_TO_SHARE) {
      throw new ConflictException(
        'This report is already approved. Reopen it if you need to change something.',
      );
    }
  }

  /** Every derived number, recomputed from first principles. */
  private recompute(
    report: {
      hasCodingProject: boolean;
      codingMaxScore: number | null;
      objectiveMaxScore: number;
      passScorePct: number;
    },
    results: QuestionResult[],
    rubric: RubricScore[],
  ) {
    const objective = summarizeObjective(results);
    const codingScore = report.hasCodingProject ? sumRubric(rubric) : null;
    const totals = computeTotals({
      objectiveScore: objective.score,
      objectiveMax: objective.max,
      codingMax: report.hasCodingProject ? (report.codingMaxScore ?? 0) : null,
      codingScore,
      passScorePct: report.passScorePct,
    });
    const status =
      report.hasCodingProject && codingScore === null
        ? TestReportStatus.PENDING_CODE_EVALUATION
        : TestReportStatus.PENDING_REVIEW;
    return { objective, codingScore, totals, status };
  }

  // ─── Approve / reopen ─────────────────────────────────────────────────────

  /** Finalizes the report: it becomes READY_TO_SHARE and the result is
   *  released to the student (attempt GRADED). A Final Test cannot be
   *  approved until every rubric criterion of the coding project is marked. */
  async approve(id: string, requester: Requester) {
    const report = await this.loadFull(id, requester);
    if (
      report.status === TestReportStatus.READY_TO_SHARE ||
      report.status === TestReportStatus.SHARED_WITH_PARENTS
    ) {
      throw new ConflictException('This report is already approved.');
    }
    const results =
      (report.questionResults as unknown as QuestionResult[]) ?? [];
    const rubric =
      (report.codingRubricScores as unknown as RubricScore[] | null) ?? [];
    const computed = this.recompute(report, results, rubric);
    if (report.hasCodingProject && computed.codingScore === null) {
      throw new BadRequestException(
        'Mark every rubric criterion of the coding project before completing the report card.',
      );
    }
    const totals = computed.totals;
    if (totals.percentage === null || totals.total === null) {
      throw new BadRequestException(
        'The report does not have a final score yet.',
      );
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.testReport.updateMany({
        where: { id, status: { in: PENDING }, updatedAt: report.updatedAt },
        data: {
          status: TestReportStatus.READY_TO_SHARE,
          objectiveScore: computed.objective.score,
          codingScore: computed.codingScore,
          totalScore: totals.total,
          percentage: totals.percentage,
          passed: totals.passed,
          approvedAt: now,
          approvedByUserId: requester.userId,
          lastEditedAt: report.lastEditedAt ?? now,
        },
      });
      if (claimed.count === 0)
        throw new ConflictException(
          'This report was changed somewhere else. Reload it and try again.',
        );
      await tx.assessmentAttempt.update({
        where: { id: report.attemptId },
        data: {
          status: AttemptStatus.GRADED,
          gradedAt: now,
          mcqScore: computed.objective.score,
          mcqMaxScore: computed.objective.max,
          practicalScore: computed.codingScore,
          practicalMaxScore: report.hasCodingProject
            ? report.codingMaxScore
            : 0,
          // The attempt keeps a 0–100 percentage (what certificates read).
          totalScore: totals.percentage,
          totalMaxScore: 100,
          passed: totals.passed,
        },
      });
    });

    if (report.assessmentType === SessionType.FINAL_TEST && totals.passed) {
      this.certificates
        .checkAndIssueCertificate(report.studentUserId, report.courseId)
        .catch((err) =>
          this.logger.warn(
            `Certificate check after report ${id} failed: ${err}`,
          ),
        );
    }
    return this.get(id, requester);
  }

  /** Takes an approved (but not yet shared) report back to editing and hides
   *  the result from the student again. */
  async reopen(id: string, requester: Requester) {
    const report = await this.loadFull(id, requester);
    if (report.status === TestReportStatus.SHARED_WITH_PARENTS) {
      throw new ConflictException(
        'This report was already shared with the parent, so it cannot be reopened.',
      );
    }
    if (report.status !== TestReportStatus.READY_TO_SHARE) {
      throw new ConflictException('Only an approved report can be reopened.');
    }
    if (isShareInFlight(report.shareStartedAt, new Date())) {
      throw new ConflictException(
        'This report is being emailed to the parent right now, so it cannot be reopened. Reload in a moment to see whether it was delivered.',
      );
    }
    if (report.assessmentType === SessionType.FINAL_TEST) {
      const issued = await this.prisma.certificate.findFirst({
        where: {
          studentUserId: report.studentUserId,
          courseId: report.courseId,
        },
        select: { id: true },
      });
      if (issued)
        throw new ConflictException(
          'A certificate was already issued from this result, so the report cannot be reopened.',
        );
    }
    const results =
      (report.questionResults as unknown as QuestionResult[]) ?? [];
    const rubric =
      (report.codingRubricScores as unknown as RubricScore[] | null) ?? [];
    const { status } = this.recompute(report, results, rubric);

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.testReport.updateMany({
        where: {
          id,
          status: TestReportStatus.READY_TO_SHARE,
          updatedAt: report.updatedAt,
        },
        data: { status, approvedAt: null, approvedByUserId: null },
      });
      if (claimed.count === 0)
        throw new ConflictException(
          'This report was changed somewhere else. Reload it and try again.',
        );
      await tx.assessmentAttempt.update({
        where: { id: report.attemptId },
        data: {
          status: AttemptStatus.SUBMITTED,
          gradedAt: null,
          totalScore: null,
          totalMaxScore: null,
          passed: null,
          practicalScore: null,
        },
      });
    });
    return this.get(id, requester);
  }

  // ─── Share with the parent ────────────────────────────────────────────────

  /** Emails the approved report to the parent/guardian. The report only
   *  becomes SHARED_WITH_PARENTS if the mail server accepted the message; any
   *  failure leaves it READY_TO_SHARE with the real reason, and the teacher
   *  can try again. */
  async share(id: string, requester: Requester) {
    const report = await this.loadFull(id, requester);
    if (report.status === TestReportStatus.SHARED_WITH_PARENTS) {
      throw new ConflictException(
        'This report has already been shared with the parent.',
      );
    }
    if (report.status !== TestReportStatus.READY_TO_SHARE) {
      throw new ConflictException(
        'Approve the report before sharing it with the parent.',
      );
    }
    if (report.percentage === null || report.totalScore === null) {
      throw new BadRequestException(
        'The report does not have a final score yet.',
      );
    }

    // Claim this send so two clicks can never both send: only one request wins
    // the compare-and-set, and while its email is going out the marker keeps
    // every later request (including one that loads the report afterwards) out.
    const attempt = report.shareAttempts + 1;
    const startedAt = new Date();
    const claimed = await this.prisma.testReport.updateMany({
      where: {
        id,
        status: TestReportStatus.READY_TO_SHARE,
        shareAttempts: report.shareAttempts,
        OR: [
          { shareStartedAt: null },
          {
            shareStartedAt: {
              lt: new Date(startedAt.getTime() - SHARE_IN_FLIGHT_MS),
            },
          },
        ],
      },
      data: { shareAttempts: attempt, shareStartedAt: startedAt },
    });
    if (claimed.count === 0)
      throw new ConflictException(
        'This report is already being shared. Reload to see its status.',
      );

    const recipient = this.resolveRecipient(report.student);
    const results =
      (report.questionResults as unknown as QuestionResult[]) ?? [];
    const objective = summarizeObjective(results);
    let sent: Awaited<
      ReturnType<NotificationsService['sendTestReportToParent']>
    >;
    try {
      sent = await this.notifications.sendTestReportToParent(recipient.email, {
        reportId: report.id,
        attempt,
        studentUserId: report.studentUserId,
        studentName: report.student.fullName,
        teacherName: report.teacher.user.fullName,
        courseTitle: report.courseTitle,
        testTitle: report.testTitle,
        testTypeLabel:
          TYPE_LABEL[report.assessmentType] ?? report.assessmentType,
        submittedAt: report.submittedAt,
        objective: {
          score: objective.score,
          max: objective.max,
          mcq: { correct: objective.mcqCorrect, total: objective.mcqTotal },
          trueFalse: {
            correct: objective.trueFalseCorrect,
            total: objective.trueFalseTotal,
          },
        },
        coding:
          report.hasCodingProject && report.codingScore !== null
            ? { score: report.codingScore, max: report.codingMaxScore ?? 0 }
            : null,
        total: report.totalScore,
        totalMax: report.totalMaxScore,
        percentage: report.percentage,
        passed: !!report.passed,
        passScorePct: report.passScorePct,
        feedback: report.feedback,
        strengths: report.strengths,
        improvements: report.improvements,
        codingFeedback: report.codingFeedback,
      });
    } catch (err) {
      // Nothing was sent: release the claim so the teacher can try again.
      await this.prisma.testReport
        .update({ where: { id }, data: { shareStartedAt: null } })
        .catch(() => undefined);
      throw err;
    }

    if (sent.ok) {
      await this.prisma.testReport.update({
        where: { id },
        data: {
          status: TestReportStatus.SHARED_WITH_PARENTS,
          sharedAt: new Date(),
          sharedByUserId: requester.userId,
          sharedToEmail: recipient.email,
          shareRecipientKind: recipient.kind,
          shareEmailLogId: sent.logId ?? null,
          shareStartedAt: null,
          lastShareError: null,
        },
      });
      return this.get(id, requester);
    }

    await this.prisma.testReport.update({
      where: { id },
      data: {
        sharedToEmail: recipient.email,
        shareRecipientKind: recipient.kind,
        shareEmailLogId: sent.logId ?? report.shareEmailLogId,
        lastShareError: sent.error ?? 'The email could not be sent.',
        // A send that timed out may still be delivered: keep the claim so a
        // second click cannot race it (it expires on its own). Any other
        // failure is final, so the teacher can retry straight away.
        ...(sent.pending ? {} : { shareStartedAt: null }),
      },
    });
    if (sent.duplicate)
      throw new ConflictException(
        'This report is already being shared. Reload to see its status.',
      );
    throw new BadGatewayException(
      `The report was NOT sent to ${recipient.email}: ${sent.error ?? 'the email could not be delivered.'} It is still ready to share — fix the problem and try again.`,
    );
  }
}

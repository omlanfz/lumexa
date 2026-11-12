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
  Optional,
} from '@nestjs/common';
import {
  AssessmentFormat,
  AttemptStatus,
  Prisma,
  Role,
  SessionType,
  TestReportStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AssessmentFilesService } from './assessment-files.service';
import { viewKindFor } from '../submissions/homework-file-types';
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

/** Little Coders calls its tests "assessments" (see the six standardised assessments). */
const LC_TYPE_LABEL: Record<string, string> = {
  COURSE_TEST: 'Course Assessment',
  FINAL_TEST: 'Final Assessment',
};

function typeLabelFor(type: string, littleCoders: boolean): string {
  return (
    (littleCoders ? LC_TYPE_LABEL[type] : undefined) ?? TYPE_LABEL[type] ?? type
  );
}

/** What the student handed in for a Little Coders practical, frozen on the report when they submitted. */
interface FrozenLcSubmission {
  links?: string[];
  note?: string | null;
  files?: { id: string; name: string; size: number }[];
}

/** Columns the list needs — deliberately not the big per-question JSON. */
const LIST_SELECT = {
  id: true,
  assessmentId: true,
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
    // The temporary R2 files of a Little Coders practical. Only that format needs it, so a bare
    // unit-test instance (and every other program's report) works without it.
    @Optional() private readonly files?: AssessmentFilesService,
  ) {}

  /** Which of these assessments are Little Coders ones (their own, or the bank they read from). */
  private async littleCodersAssessmentIds(ids: string[]): Promise<Set<string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Set();
    const rows = await this.prisma.assessment.findMany({
      where: { id: { in: unique } },
      select: {
        id: true,
        format: true,
        sourceAssessment: { select: { format: true } },
      },
    });
    return new Set(
      rows
        .filter(
          (r) =>
            r.format === AssessmentFormat.LITTLE_CODERS_V2 ||
            r.sourceAssessment?.format === AssessmentFormat.LITTLE_CODERS_V2,
        )
        .map((r) => r.id),
    );
  }

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
    const littleCoders = await this.littleCodersAssessmentIds(
      items.map((r) => r.assessmentId),
    );
    // Work that needs the teacher first, then newest first.
    items.sort((a, b) => {
      const ap = PENDING.includes(a.status) ? 0 : 1;
      const bp = PENDING.includes(b.status) ? 0 : 1;
      return ap - bp || b.submittedAt.getTime() - a.submittedAt.getTime();
    });
    return items.map(({ shareEmailLogId: _log, assessmentId, ...r }) => {
      void _log;
      const lc = littleCoders.has(assessmentId);
      return {
        ...r,
        littleCoders: lc,
        typeLabel: typeLabelFor(r.assessmentType, lc),
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

  /**
   * What the teacher reviews for a Little Coders practical: the practical's brief, the links and
   * note the student handed in, and their files. The file list is read live so it shows which files
   * are still kept and which were removed once the review was finalised; the links, the note and
   * the file NAMES stay on the report for good (only the contents are removed).
   */
  private async lcReview(
    attemptId: string,
    submission: FrozenLcSubmission | undefined,
    spec: unknown,
  ) {
    const handedIn = submission?.files ?? [];
    const live = this.files ? await this.files.listFor(attemptId) : null;
    const files = live
      ? live
          // A file the student was still preparing is not part of what was handed in.
          .filter((f) => f.status !== 'UPLOADED')
          .map((f) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            kind: f.kind,
            removed: f.removed,
          }))
      : handedIn.map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          kind: viewKindFor(f.name),
          removed: false,
        }));
    // The brief as the student saw it. `adminEdited` is bookkeeping, not part of the brief.
    const brief =
      spec && typeof spec === 'object'
        ? (({ adminEdited: _edited, ...rest }) => {
            void _edited;
            return rest;
          })(spec as Record<string, unknown>)
        : null;
    return {
      spec: brief,
      links: submission?.links ?? [],
      note: submission?.note ?? null,
      files,
      filesRemoved: files.length > 0 && files.every((f) => f.removed),
    };
  }

  private async toDetail(
    report: Awaited<ReturnType<TestReportsService['loadFull']>>,
  ) {
    const results =
      (report.questionResults as unknown as QuestionResult[]) ?? [];
    const objective = summarizeObjective(results);
    const rubric =
      (report.codingRubricScores as unknown as RubricScore[] | null) ?? [];
    const frozen = report.codingProject as unknown as {
      questionId: string;
      title: string;
      instructions: string;
      language: string;
      code: string;
      savedAt: string | null;
      submission?: FrozenLcSubmission;
      spec?: unknown;
    } | null;
    // The submission and the specification belong to the Little Coders review (below), not to the
    // plain project block every program shares.
    let project: {
      questionId: string;
      title: string;
      instructions: string;
      language: string;
      code: string;
      savedAt: string | null;
    } | null = null;
    if (frozen) {
      const { submission: _submission, spec: _spec, ...plain } = frozen;
      void _submission;
      void _spec;
      project = plain;
    }
    const lcSubmission = frozen?.submission;
    const lcSpec = frozen?.spec;
    const isLittleCoders = (
      await this.littleCodersAssessmentIds([report.assessmentId])
    ).has(report.assessmentId);
    return {
      id: report.id,
      attemptId: report.attemptId,
      status: report.status,
      assessmentType: report.assessmentType,
      littleCoders: isLittleCoders,
      typeLabel: typeLabelFor(report.assessmentType, isLittleCoders),
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
            // Little Coders: the project as handed in — links, note and files — and the practical's
            // brief, so the teacher marks against exactly what the student was asked to build.
            lc: isLittleCoders
              ? await this.lcReview(report.attemptId, lcSubmission, lcSpec)
              : null,
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
    // Little Coders: the practical's files are only needed until the review is final. They are
    // marked for removal in THIS transaction — the same one that stores the final score — so a
    // file is never marked before the score is safely saved, and never kept once it is.
    const releaseFiles =
      report.hasCodingProject &&
      !!this.files &&
      (await this.littleCodersAssessmentIds([report.assessmentId])).has(
        report.assessmentId,
      );
    let marked: string[] = [];
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
      if (releaseFiles) {
        marked = await this.files.finaliseAttempt(tx, report.attemptId);
      }
    });
    // After the commit (the score is stored): take the files out of R2. This never throws — a file
    // that cannot be removed right now stays DELETE_PENDING and the scheduled sweep retries it.
    if (marked.length > 0) await this.files!.removeMarked(marked);

    // An approved Final Test report does not issue a certificate by itself:
    // certificates are approved by an admin after the student's final class
    // (see server/src/certificates).
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
    const isLittleCoders = (
      await this.littleCodersAssessmentIds([report.assessmentId])
    ).has(report.assessmentId);
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
        testTypeLabel: typeLabelFor(report.assessmentType, isLittleCoders),
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
        ...(isLittleCoders
          ? { codingLabel: 'Practical project (marked by the teacher)' }
          : {}),
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

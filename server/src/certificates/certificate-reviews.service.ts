// FILE PATH: server/src/certificates/certificate-reviews.service.ts
//
// The "an admin should look at this student" queue.
//
// When a student's FINAL scheduled class of a programme is finalised, the class
// system calls onClassFinalized() and a CertificateReview (PENDING) is created —
// exactly once per student + programme, however many times the event fires, because
// the database's unique constraint (studentUserId, courseId) is the only thing that
// decides (createMany with skipDuplicates: whoever loses the race inserts nothing).
//
// What this is NOT:
//   • not an eligibility decision — nothing here looks at scores, attendance or
//     homework to judge the student. It records a fact about CLASSES (see
//     program-completion.ts) and asks a human to review;
//   • not an issuance — no certificate, ID, QR code or file exists yet;
//   • not a teacher workflow — teachers are never told, never asked, and have no
//     route into any of this. Only admins (CertificatesAdminController).
//
// An hourly sweep re-checks recent completions so a lost event (a crash between
// the class being finalised and this call) still produces its review. It is
// idempotent for the same reason the event is.

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CertificateReviewStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { COUNTS_AS_COMPLETED } from '../scheduling/lesson-state.util';
import { resolveCertificateTheme } from './certificate-themes';
import { findProgramCompletion } from './program-completion';

export interface CertificateActor {
  id: string;
  role: string;
}

/** An approval that has not finished within this long is considered abandoned (a
 * crash mid-generation) and may be claimed again. Generation takes seconds. */
export const REVIEW_PROCESSING_LEASE_MS = 10 * 60_000;

const SYSTEM_ACTOR = { id: 'system', role: 'SYSTEM' } as const;

export type RecordCompletionResult =
  | { created: true; reviewId: string }
  | { created: false; reason: 'exists' | 'not-complete' | 'already-certified' };

@Injectable()
export class CertificateReviewsService {
  private readonly logger = new Logger(CertificateReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Trigger ─────────────────────────────────────────────────────────────

  /** Called by the class system after a class is finalised as taken (Completed /
   * Partially Completed) for each student who had it. Never throws: the class is
   * already finalised and paid, and a failure here must not look like one. The
   * hourly sweep covers anything this misses. */
  async onClassFinalized(
    courseId: string,
    studentUserIds: string[],
  ): Promise<void> {
    for (const studentUserId of new Set(studentUserIds)) {
      try {
        await this.recordCompletionIfDue(
          studentUserId,
          courseId,
          'CLASS_FINALIZED',
        );
      } catch (err) {
        this.logger.error(
          `Certificate review check failed for student ${studentUserId} / course ${courseId}: ${err}`,
        );
      }
    }
  }

  /** Creates the pending review if (and only if) the student's final scheduled
   * class of the programme has been completed and no review exists yet. */
  async recordCompletionIfDue(
    studentUserId: string,
    courseId: string,
    source: 'CLASS_FINALIZED' | 'RECONCILIATION',
  ): Promise<RecordCompletionResult> {
    const existing = await this.prisma.certificateReview.findUnique({
      where: { studentUserId_courseId: { studentUserId, courseId } },
      select: { id: true },
    });
    if (existing) return { created: false, reason: 'exists' };

    const certified = await this.prisma.certificate.findFirst({
      where: { studentUserId, courseId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (certified) return { created: false, reason: 'already-certified' };

    const completion = await findProgramCompletion(
      this.prisma,
      studentUserId,
      courseId,
    );
    if (!completion) return { created: false, reason: 'not-complete' };

    // The unique constraint arbitrates: of any number of concurrent callers,
    // exactly one inserts a row (count 1); the rest insert nothing (count 0).
    const created = await this.prisma.certificateReview.createMany({
      data: [
        {
          studentUserId,
          courseId,
          finalClassId: completion.finalClassId,
          completedAt: completion.completedAt,
          suggestedCompletionDate: completion.completionDate,
          source,
        },
      ],
      skipDuplicates: true,
    });
    if (created.count === 0) return { created: false, reason: 'exists' };

    const review = await this.prisma.certificateReview.findUniqueOrThrow({
      where: { studentUserId_courseId: { studentUserId, courseId } },
      select: { id: true },
    });
    await this.prisma.auditLog
      .create({
        data: {
          actorId: SYSTEM_ACTOR.id,
          actorRole: SYSTEM_ACTOR.role,
          action: 'CERTIFICATE_REVIEW_CREATED',
          entityType: 'CertificateReview',
          entityId: review.id,
          afterData: {
            studentUserId,
            courseId,
            source,
            finalClassId: completion.finalClassId,
            suggestedCompletionDate: completion.completionDate,
          } as Prisma.InputJsonValue,
        },
      })
      .catch((err) =>
        this.logger.error(`Audit log failed for review ${review.id}: ${err}`),
      );
    return { created: true, reviewId: review.id };
  }

  /** Safety net: re-checks every (student, programme) with a class finalised as
   * taken in the last `days` days. Cheap and idempotent. */
  async reconcile(days = 14): Promise<{ checked: number; created: number }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60_000);
    const recent = await this.prisma.scheduledLesson.findMany({
      where: { status: { in: COUNTS_AS_COMPLETED }, endedAt: { gte: since } },
      distinct: ['studentUserId', 'courseId'],
      select: { studentUserId: true, courseId: true },
      take: 5000,
    });
    let created = 0;
    for (const pair of recent) {
      try {
        const result = await this.recordCompletionIfDue(
          pair.studentUserId,
          pair.courseId,
          'RECONCILIATION',
        );
        if (result.created) created++;
      } catch (err) {
        this.logger.error(
          `Certificate review reconciliation failed for ${pair.studentUserId}/${pair.courseId}: ${err}`,
        );
      }
    }
    return { checked: recent.length, created };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async hourlySweep(): Promise<void> {
    const { created } = await this.reconcile(14);
    if (created > 0)
      this.logger.log(
        `Certificate review sweep opened ${created} review(s) the class events had missed.`,
      );
  }

  // ─── Admin: the queue ────────────────────────────────────────────────────

  async summary() {
    const [reviews, certificates] = await Promise.all([
      this.prisma.certificateReview.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.certificate.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);
    const r = (s: CertificateReviewStatus) =>
      reviews.find((x) => x.status === s)?._count._all ?? 0;
    const c = (s: 'ACTIVE' | 'REVOKED' | 'REPLACED') =>
      certificates.find((x) => x.status === s)?._count._all ?? 0;
    return {
      pending: r('PENDING') + r('PROCESSING'),
      dismissed: r('DISMISSED'),
      issued: c('ACTIVE'),
      revoked: c('REVOKED'),
      replaced: c('REPLACED'),
    };
  }

  async list(params: {
    status: 'PENDING' | 'DISMISSED';
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const statuses: CertificateReviewStatus[] =
      params.status === 'DISMISSED' ? ['DISMISSED'] : ['PENDING', 'PROCESSING'];
    const search = params.search?.trim();

    const where: Prisma.CertificateReviewWhereInput = {
      status: { in: statuses },
    };
    if (search) {
      const [users, courses] = await Promise.all([
        this.prisma.user.findMany({
          where: {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
          take: 200,
        }),
        this.prisma.course.findMany({
          where: { title: { contains: search, mode: 'insensitive' } },
          select: { id: true },
          take: 100,
        }),
      ]);
      where.OR = [
        { studentUserId: { in: users.map((u) => u.id) } },
        { courseId: { in: courses.map((c) => c.id) } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.certificateReview.count({ where }),
      this.prisma.certificateReview.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      items: await this.withPeople(rows),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /** One review with the facts an admin needs to decide: what the student did,
   * read straight from the records. No verdict is computed. */
  async get(id: string) {
    const review = await this.prisma.certificateReview.findUnique({
      where: { id },
    });
    if (!review) throw new NotFoundException('Review not found.');
    const [item] = await this.withPeople([review]);

    const [completion, attempts] = await Promise.all([
      findProgramCompletion(this.prisma, review.studentUserId, review.courseId),
      this.prisma.assessmentAttempt.findMany({
        where: {
          studentUserId: review.studentUserId,
          status: 'GRADED',
          assessment: { lesson: { courseId: review.courseId } },
        },
        orderBy: { gradedAt: 'desc' },
        select: {
          assessmentId: true,
          totalScore: true,
          passed: true,
          gradedAt: true,
          assessment: {
            select: { title: true, type: true, passScorePct: true },
          },
        },
      }),
    ]);
    const latest = new Map<string, (typeof attempts)[number]>();
    for (const a of attempts)
      if (!latest.has(a.assessmentId)) latest.set(a.assessmentId, a);

    return {
      ...item,
      facts: {
        lessonsTaken: completion?.lessonsTaken ?? null,
        lastLesson: completion?.lastLesson ?? null,
        assessments: [...latest.values()]
          .map((a) => ({
            title: a.assessment.title,
            type: a.assessment.type,
            scorePct: a.totalScore,
            passScorePct: a.assessment.passScorePct,
            passed: a.passed,
            gradedAt: a.gradedAt,
          }))
          .reverse(),
      },
    };
  }

  async dismiss(id: string, reason: string, admin: CertificateActor) {
    if (!reason?.trim())
      throw new BadRequestException(
        'Say why this review is being dismissed — it is kept in the audit trail.',
      );
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.certificateReview.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'DISMISSED',
          decidedAt: new Date(),
          decidedByAdminId: admin.id,
          dismissReason: reason,
        },
      });
      if (claimed.count !== 1) {
        const current = await tx.certificateReview.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!current) throw new NotFoundException('Review not found.');
        throw new ConflictException(
          current.status === 'PROCESSING'
            ? 'A certificate is being generated for this review right now.'
            : current.status === 'ISSUED'
              ? 'A certificate was already issued from this review.'
              : 'This review was already dismissed.',
        );
      }
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          actorRole: admin.role,
          action: 'CERTIFICATE_REVIEW_DISMISSED',
          entityType: 'CertificateReview',
          entityId: id,
          reason,
        },
      });
      return { id, status: 'DISMISSED' as const };
    });
  }

  async reopen(id: string, admin: CertificateActor) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.certificateReview.updateMany({
        where: { id, status: 'DISMISSED' },
        data: {
          status: 'PENDING',
          decidedAt: null,
          decidedByAdminId: null,
          dismissReason: null,
        },
      });
      if (claimed.count !== 1)
        throw new ConflictException('Only a dismissed review can be reopened.');
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          actorRole: admin.role,
          action: 'CERTIFICATE_REVIEW_REOPENED',
          entityType: 'CertificateReview',
          entityId: id,
        },
      });
      return { id, status: 'PENDING' as const };
    });
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private async withPeople<
    T extends { studentUserId: string; courseId: string },
  >(rows: T[]) {
    const [users, courses] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: [...new Set(rows.map((r) => r.studentUserId))] } },
        select: { id: true, fullName: true, email: true, avatarUrl: true },
      }),
      this.prisma.course.findMany({
        where: { id: { in: [...new Set(rows.map((r) => r.courseId))] } },
        select: { id: true, title: true, slug: true, category: true },
      }),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const courseById = new Map(courses.map((c) => [c.id, c]));
    return rows.map((r) => {
      const course = courseById.get(r.courseId);
      const theme = course
        ? resolveCertificateTheme({
            category: course.category,
            slug: course.slug,
          })
        : null;
      return {
        ...r,
        student: userById.get(r.studentUserId) ?? null,
        course: course
          ? { id: course.id, title: course.title, category: course.category }
          : null,
        // `accent` is a description for people ("Deep blue"); `color` is a real
        // swatch (the palette's middle ribbon colour) for drawing a dot.
        theme: theme
          ? {
              key: theme.key,
              label: theme.label,
              accent: theme.accent,
              color: theme.palette.ribbon[1],
            }
          : null,
      };
    });
  }
}

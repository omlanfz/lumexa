// FILE PATH: server/src/submissions/submissions.service.ts
//
// Student homework submissions for a completed ScheduledLesson. One row per
// scheduled occurrence (@unique scheduledLessonId on Submission) — a
// resubmission overwrites the existing row and resets it to PENDING rather
// than creating a second one, so "has this lesson been submitted" is always
// a single unambiguous lookup (see getScheduledLessonDetails in
// CurriculumService, which surfaces this on the lesson page).

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  COUNTS_AS_COMPLETED,
  findCanonicalCompletedRow,
  keepCanonicalRows,
} from '../scheduling/lesson-state.util';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitHomework(
    studentUserId: string,
    params: {
      scheduledLessonId: string;
      files?: { url: string; name?: string }[];
      links?: string[];
      note?: string;
    },
  ) {
    const sl = await this.prisma.scheduledLesson.findUnique({
      where: { id: params.scheduledLessonId },
      select: {
        id: true,
        studentUserId: true,
        teacherId: true,
        status: true,
        courseId: true,
        lessonNumber: true,
        lessonId: true,
        lesson: { select: { id: true, homework: true } },
      },
    });
    if (!sl) throw new NotFoundException('Scheduled lesson not found.');
    if (sl.studentUserId !== studentUserId) {
      throw new ForbiddenException('This is not your class.');
    }
    // Homework unlocks once the student has had the lesson — COMPLETED or
    // PARTIALLY_COMPLETED, on this class or on the other class of the same
    // lesson. A lesson has ONE homework slot, owned by its earliest finalized
    // class, so submitting from the extra class of a partially completed
    // lesson lands on (and updates) the same submission.
    const canonical = await findCanonicalCompletedRow(this.prisma, sl);
    if (!canonical) {
      throw new BadRequestException(
        'This lesson is not completed yet — homework unlocks once the class is finished.',
      );
    }
    if (canonical.id !== sl.id) {
      return this.submitHomework(studentUserId, {
        ...params,
        scheduledLessonId: canonical.id,
      });
    }
    if (!sl.lesson?.homework) {
      throw new BadRequestException('This lesson has no homework to submit.');
    }

    const files = params.files ?? [];
    const links = (params.links ?? []).filter((l) => l.trim().length > 0);
    if (files.length === 0 && links.length === 0) {
      throw new BadRequestException(
        'Attach at least one file or link before submitting.',
      );
    }

    const existing = await this.prisma.submission.findUnique({
      where: { scheduledLessonId: sl.id },
      select: { status: true, resubmissionCount: true },
    });
    // Only a NEEDS_CHANGES → resubmit counts as a resubmission. A student
    // isn't normally able to re-open an already-APPROVED submission (the
    // UI hides "Submit different work" for it), but treat it the same as a
    // fresh submission rather than a resubmission if it happens.
    const resubmissionCount =
      existing?.status === SubmissionStatus.NEEDS_CHANGES
        ? existing.resubmissionCount + 1
        : (existing?.resubmissionCount ?? 0);

    return this.prisma.submission.upsert({
      where: { scheduledLessonId: sl.id },
      create: {
        scheduledLessonId: sl.id,
        lessonId: sl.lesson.id,
        studentUserId,
        teacherId: sl.teacherId,
        files,
        links,
        note: params.note,
      },
      update: {
        files,
        links,
        note: params.note,
        status: SubmissionStatus.PENDING,
        submittedAt: new Date(),
        reviewedAt: null,
        rating: null,
        feedbackTags: [],
        feedback: null,
        resubmissionCount,
      },
    });
  }

  /** Homework a student has completed the class for but hasn't submitted
   * yet — the "needs attention" list for Student Home. */
  async getPendingForStudent(studentUserId: string, limit = 5) {
    const candidates = await this.prisma.scheduledLesson.findMany({
      where: {
        studentUserId,
        status: { in: COUNTS_AS_COMPLETED },
        lesson: { homework: { not: null } },
        submission: null,
      },
      orderBy: { end: 'desc' },
      take: limit * 2,
      select: {
        id: true,
        studentUserId: true,
        courseId: true,
        lessonNumber: true,
        course: { select: { title: true } },
        lesson: { select: { title: true } },
      },
    });
    const rows = (await keepCanonicalRows(this.prisma, candidates)).slice(
      0,
      limit,
    );
    return rows.map((r) => ({
      scheduledLessonId: r.id,
      lessonNumber: r.lessonNumber,
      courseTitle: r.course.title,
      lessonTitle: r.lesson?.title ?? `Session ${r.lessonNumber}`,
    }));
  }

  /** Submissions sent back with NEEDS_CHANGES that the student hasn't
   * resubmitted yet — the other half of the "needs attention" list for
   * Student Home, alongside getPendingForStudent (never-submitted work). */
  async getNeedsChangesForStudent(studentUserId: string, limit = 5) {
    const rows = await this.prisma.submission.findMany({
      where: { studentUserId, status: SubmissionStatus.NEEDS_CHANGES },
      orderBy: { reviewedAt: 'desc' },
      take: limit,
      select: {
        scheduledLessonId: true,
        feedback: true,
        feedbackTags: true,
        reviewedAt: true,
        scheduledLesson: {
          select: {
            lessonNumber: true,
            course: { select: { title: true } },
          },
        },
        lesson: { select: { title: true } },
      },
    });
    return rows.map((r) => ({
      scheduledLessonId: r.scheduledLessonId,
      lessonNumber: r.scheduledLesson.lessonNumber,
      courseTitle: r.scheduledLesson.course.title,
      lessonTitle:
        r.lesson?.title ?? `Session ${r.scheduledLesson.lessonNumber}`,
      feedback: r.feedback,
      feedbackTags: r.feedbackTags,
      reviewedAt: r.reviewedAt,
    }));
  }

  private async requireTeacherProfileId(
    teacherUserId: string,
  ): Promise<string> {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Teacher profile not found.');
    return profile.id;
  }

  async getPendingCountForTeacher(teacherUserId: string) {
    const teacherId = await this.requireTeacherProfileId(teacherUserId);
    const count = await this.prisma.submission.count({
      where: { teacherId, status: SubmissionStatus.PENDING },
    });
    return { count };
  }

  async listForTeacher(teacherUserId: string, status?: SubmissionStatus) {
    const teacherId = await this.requireTeacherProfileId(teacherUserId);
    const rows = await this.prisma.submission.findMany({
      where: { teacherId, ...(status ? { status } : {}) },
      orderBy: { submittedAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true } },
        lesson: { select: { title: true } },
        scheduledLesson: {
          select: { lessonNumber: true, course: { select: { title: true } } },
        },
      },
    });
    return rows.map((row) => this.mapSubmission(row));
  }

  async listForTeacherAndStudent(teacherUserId: string, studentUserId: string) {
    const teacherId = await this.requireTeacherProfileId(teacherUserId);
    const hasRelationship = await this.prisma.scheduledLesson.findFirst({
      where: { studentUserId, teacherId },
      select: { id: true },
    });
    if (!hasRelationship) {
      throw new ForbiddenException(
        'You are not assigned to teach this student.',
      );
    }
    const rows = await this.prisma.submission.findMany({
      where: { studentUserId },
      orderBy: { submittedAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true } },
        lesson: { select: { title: true } },
        scheduledLesson: {
          select: { lessonNumber: true, course: { select: { title: true } } },
        },
      },
    });
    return rows.map((row) => this.mapSubmission(row));
  }

  async review(
    submissionId: string,
    teacherUserId: string,
    params: {
      status: 'APPROVED' | 'NEEDS_CHANGES';
      rating?: number;
      feedbackTags?: string[];
      feedback?: string;
    },
  ) {
    const teacherId = await this.requireTeacherProfileId(teacherUserId);
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('Submission not found.');
    if (submission.teacherId !== teacherId) {
      throw new ForbiddenException('This submission was not sent to you.');
    }

    const feedbackTags = params.feedbackTags ?? [];
    const feedback = params.feedback?.trim() || null;
    if (
      params.status === SubmissionStatus.NEEDS_CHANGES &&
      feedbackTags.length === 0 &&
      !feedback
    ) {
      throw new BadRequestException(
        'Feedback is required when requesting changes — pick a suggestion or write your own.',
      );
    }

    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus[params.status],
        rating: params.rating ?? null,
        feedbackTags,
        feedback,
        reviewedAt: new Date(),
      },
    });
  }

  private mapSubmission(row: {
    id: string;
    files: unknown;
    links: string[];
    note: string | null;
    status: SubmissionStatus;
    rating: number | null;
    feedbackTags: string[];
    resubmissionCount: number;
    submittedAt: Date;
    reviewedAt: Date | null;
    feedback: string | null;
    student: { id: string; fullName: string; avatarUrl: string | null };
    lesson: { title: string };
    scheduledLesson: { lessonNumber: number; course: { title: string } };
  }) {
    return {
      id: row.id,
      status: row.status,
      files: (row.files as { url: string; name: string | null }[]) ?? [],
      links: row.links ?? [],
      note: row.note,
      rating: row.rating,
      feedbackTags: row.feedbackTags,
      resubmissionCount: row.resubmissionCount,
      submittedAt: row.submittedAt,
      reviewedAt: row.reviewedAt,
      feedback: row.feedback,
      student: row.student,
      lessonTitle: row.lesson.title,
      lessonNumber: row.scheduledLesson.lessonNumber,
      courseTitle: row.scheduledLesson.course.title,
    };
  }
}

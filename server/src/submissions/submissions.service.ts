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
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  HomeworkFileDeleteReason,
  HomeworkFileStatus,
  SubmissionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  COUNTS_AS_COMPLETED,
  keepCanonicalRows,
} from '../scheduling/lesson-state.util';
import {
  HomeworkFilesService,
  PRESENTABLE_FILE_SELECT,
  presentFiles,
} from './homework-files.service';
import { resolveHomeworkTarget } from './homework-target';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly homeworkFiles: HomeworkFilesService,
  ) {}

  async submitHomework(
    studentUserId: string,
    params: {
      scheduledLessonId: string;
      /** Files already uploaded with POST /uploads/homework, by id. */
      files?: { id: string }[];
      links?: string[];
      note?: string;
    },
  ) {
    // Which class owns the lesson's homework slot, and whether it is unlocked
    // (see resolveHomeworkTarget — a lesson has ONE homework slot).
    const target = await resolveHomeworkTarget(
      this.prisma,
      studentUserId,
      params.scheduledLessonId,
    );

    const fileIds = (params.files ?? []).map((f) => f.id);
    const links = (params.links ?? []).filter((l) => l.trim().length > 0);
    if (fileIds.length === 0 && links.length === 0) {
      throw new BadRequestException(
        'Attach at least one file or link before submitting.',
      );
    }

    const existing = await this.prisma.submission.findUnique({
      where: { scheduledLessonId: target.scheduledLessonId },
      select: { id: true, status: true, resubmissionCount: true },
    });

    // The same request twice (a double click, a retry after a dropped
    // connection): the files are already part of this submission — it is done.
    if (existing && fileIds.length > 0) {
      const already = await this.prisma.homeworkFile.count({
        where: {
          id: { in: fileIds },
          submissionId: existing.id,
          status: HomeworkFileStatus.ATTACHED,
          supersededAt: null,
        },
      });
      if (already === fileIds.length) {
        return this.presentOwn(existing.id);
      }
    }

    // Every file must really be in storage, whole, before anything is saved: a
    // file that never finished uploading cannot make a submission look complete.
    const rows =
      fileIds.length > 0
        ? await this.homeworkFiles.verifyUploads(
            studentUserId,
            target.scheduledLessonId,
            fileIds,
          )
        : [];
    for (const row of rows) {
      if (row.status !== HomeworkFileStatus.UPLOADED) {
        throw new ConflictException(
          `"${row.originalName}" was already used. Please upload it again.`,
        );
      }
    }
    await this.homeworkFiles.assertStored(rows);

    // Only a NEEDS_CHANGES → resubmit counts as a resubmission. A student
    // isn't normally able to re-open an already-APPROVED submission (the
    // UI hides "Submit different work" for it), but treat it the same as a
    // fresh submission rather than a resubmission if it happens.
    const resubmissionCount =
      existing?.status === SubmissionStatus.NEEDS_CHANGES
        ? existing.resubmissionCount + 1
        : (existing?.resubmissionCount ?? 0);

    const now = new Date();
    const { submission, replaced } = await this.prisma.$transaction(
      async (tx) => {
        const saved = await tx.submission.upsert({
          where: { scheduledLessonId: target.scheduledLessonId },
          create: {
            scheduledLessonId: target.scheduledLessonId,
            lessonId: target.lessonId,
            studentUserId,
            teacherId: target.teacherId,
            files: [],
            links,
            note: params.note,
          },
          update: {
            // New hand-ins keep their files in homeworkFiles; whatever list of
            // links an earlier (Cloudinary-era) submission had is replaced.
            files: [],
            links,
            note: params.note,
            status: SubmissionStatus.PENDING,
            submittedAt: now,
            reviewedAt: null,
            rating: null,
            feedbackTags: [],
            feedback: null,
            resubmissionCount,
          },
        });

        // Different work replaces the old: its files are no longer shown, and
        // the ones still stored are no longer needed.
        const replacedIds = await this.homeworkFiles.markForRemoval(
          {
            submissionId: saved.id,
            status: HomeworkFileStatus.ATTACHED,
            supersededAt: null,
          },
          HomeworkFileDeleteReason.REPLACED,
          tx,
        );
        await tx.homeworkFile.updateMany({
          where: { submissionId: saved.id, supersededAt: null },
          data: { supersededAt: now },
        });

        if (rows.length > 0) {
          const attached = await tx.homeworkFile.updateMany({
            where: {
              id: { in: fileIds },
              studentUserId,
              status: HomeworkFileStatus.UPLOADED,
            },
            data: {
              submissionId: saved.id,
              status: HomeworkFileStatus.ATTACHED,
              attachedAt: now,
            },
          });
          if (attached.count !== rows.length) {
            // Another request used one of them first: save nothing.
            throw new ConflictException(
              'One of those files was already used. Please upload your files again.',
            );
          }
        }
        return { submission: saved, replaced: replacedIds };
      },
    );

    // The old files (if any) are removed from storage now that the new work is
    // safely saved — best effort; the sweep finishes it if R2 is unreachable.
    if (replaced.length > 0) {
      await this.homeworkFiles.removeMarked(replaced);
    }
    return this.presentOwn(submission.id);
  }

  /** A submission as its owner's lesson page shows it. */
  private async presentOwn(submissionId: string) {
    const row = await this.prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: { homeworkFiles: { select: PRESENTABLE_FILE_SELECT } },
    });
    const { homeworkFiles, ...rest } = row;
    return { ...rest, files: presentFiles(row.files, homeworkFiles) };
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
        homeworkFiles: { select: PRESENTABLE_FILE_SELECT },
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
        homeworkFiles: { select: PRESENTABLE_FILE_SELECT },
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

    // 1. Save the review — grade, feedback and status. This either succeeds
    //    or throws; nothing below runs unless it did.
    // 2. Only then are the submission's files marked for removal from R2 (in
    //    the same transaction, so a saved review and "files to remove" can
    //    never disagree)...
    const now = new Date();
    const { saved, toRemove } = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus[params.status],
          rating: params.rating ?? null,
          feedbackTags,
          feedback,
          reviewedAt: now,
        },
      });
      const ids = await this.homeworkFiles.markForRemoval(
        {
          submissionId,
          status: HomeworkFileStatus.ATTACHED,
          supersededAt: null,
        },
        HomeworkFileDeleteReason.REVIEWED,
        tx,
      );
      return { saved: updated, toRemove: ids };
    });

    // 3. ...and removed. The review is already saved, so a failure here (R2
    //    unreachable) never undoes or fails it: the files stay marked and the
    //    scheduled sweep retries until R2 confirms.
    const outcome = await this.homeworkFiles.removeMarked(toRemove);
    if (outcome.pending > 0) {
      this.logger.warn(
        `Review of submission ${submissionId} saved; ${outcome.pending} homework file(s) will be removed on a retry.`,
      );
    }
    const presented = await this.presentOwn(saved.id);
    return {
      ...presented,
      homeworkFilesRemoved: outcome.removed,
      homeworkFilesPendingRemoval: outcome.pending,
    };
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
    homeworkFiles?: Parameters<typeof presentFiles>[1];
  }) {
    return {
      id: row.id,
      status: row.status,
      files: presentFiles(row.files, row.homeworkFiles),
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

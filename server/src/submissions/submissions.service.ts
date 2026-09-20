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

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitHomework(
    studentUserId: string,
    params: {
      scheduledLessonId: string;
      fileUrl: string;
      fileName?: string;
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
        lessonId: true,
        lesson: { select: { id: true, homework: true } },
      },
    });
    if (!sl) throw new NotFoundException('Scheduled lesson not found.');
    if (sl.studentUserId !== studentUserId) {
      throw new ForbiddenException('This is not your class.');
    }
    if (sl.status !== 'COMPLETED') {
      throw new BadRequestException(
        'This lesson is not completed yet — homework unlocks once the class is finished.',
      );
    }
    if (!sl.lesson?.homework) {
      throw new BadRequestException('This lesson has no homework to submit.');
    }

    return this.prisma.submission.upsert({
      where: { scheduledLessonId: sl.id },
      create: {
        scheduledLessonId: sl.id,
        lessonId: sl.lesson.id,
        studentUserId,
        teacherId: sl.teacherId,
        fileUrl: params.fileUrl,
        fileName: params.fileName,
        note: params.note,
      },
      update: {
        fileUrl: params.fileUrl,
        fileName: params.fileName,
        note: params.note,
        status: SubmissionStatus.PENDING,
        submittedAt: new Date(),
        reviewedAt: null,
        feedback: null,
      },
    });
  }

  /** Homework a student has completed the class for but hasn't submitted
   * yet — the "needs attention" list for Student Home. */
  async getPendingForStudent(studentUserId: string, limit = 5) {
    const rows = await this.prisma.scheduledLesson.findMany({
      where: {
        studentUserId,
        status: 'COMPLETED',
        lesson: { homework: { not: null } },
        submission: null,
      },
      orderBy: { end: 'desc' },
      take: limit,
      select: {
        id: true,
        lessonNumber: true,
        course: { select: { title: true } },
        lesson: { select: { title: true } },
      },
    });
    return rows.map((r) => ({
      scheduledLessonId: r.id,
      lessonNumber: r.lessonNumber,
      courseTitle: r.course.title,
      lessonTitle: r.lesson?.title ?? `Session ${r.lessonNumber}`,
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
    params: { feedback?: string },
  ) {
    const teacherId = await this.requireTeacherProfileId(teacherUserId);
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('Submission not found.');
    if (submission.teacherId !== teacherId) {
      throw new ForbiddenException('This submission was not sent to you.');
    }
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.REVIEWED,
        reviewedAt: new Date(),
        feedback: params.feedback?.trim() || null,
      },
    });
  }

  private mapSubmission(row: {
    id: string;
    fileUrl: string;
    fileName: string | null;
    note: string | null;
    status: SubmissionStatus;
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
      fileUrl: row.fileUrl,
      fileName: row.fileName,
      note: row.note,
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

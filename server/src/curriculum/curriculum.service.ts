// FILE PATH: server/src/curriculum/curriculum.service.ts
//
// Lesson Details: the access-controlled read path for lesson materials,
// projects, and checkpoints (requirement #2), plus admin CRUD for
// modules/projects/lesson-content/question-bank rows sitting on top of the
// curriculum-catalog.seed.ts-built structure.
//
// Access rules (see getScheduledLessonDetails):
//   - Student, LEARNING session   -> visible only once ScheduledLesson is COMPLETED.
//   - Student, test session       -> visible once COMPLETED (review), or on the
//                                    scheduled test DAY while still UPCOMING
//                                    (Asia/Dhaka calendar day) — never before.
//   - Teacher                     -> full access to every session (including
//                                    future ones) for any course they are the
//                                    assigned teacher of, so they can prepare.
//   - Admin                       -> full access, same as teacher.

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LessonStatus, Role, SessionType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { todayDhakaDateStr, utcToDhakaParts } from '../scheduling/dhaka-time.util';
import {
  CreateModuleDto,
  CreateProjectDto,
  UpdateLessonContentDto,
  UpdateModuleDto,
  UpdateProjectDto,
} from './dto/curriculum.dto';

interface Requester {
  userId: string;
  role: Role;
}

function dhakaDateStrOf(date: Date): string {
  return utcToDhakaParts(date).dateStr;
}

@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Lesson Details (student/teacher read path) ───────────────────────────

  async getScheduledLessonDetails(scheduledLessonId: string, requester: Requester) {
    const sl = await this.prisma.scheduledLesson.findUnique({
      where: { id: scheduledLessonId },
      include: {
        lesson: {
          include: {
            module: true,
            project: true,
            assessment: { select: { id: true, type: true, title: true, isPublished: true } },
          },
        },
        teacher: { select: { userId: true } },
        course: { select: { id: true, title: true } },
      },
    });
    if (!sl) throw new NotFoundException('Scheduled lesson not found');

    const isOwner = sl.studentUserId === requester.userId;
    const isAssignedTeacher = requester.role === Role.TEACHER && sl.teacher.userId === requester.userId;
    const isAdmin = requester.role === Role.ADMIN;

    if (!isOwner && !isAssignedTeacher && !isAdmin) {
      throw new ForbiddenException('You do not have access to this class.');
    }
    if (!sl.lesson) {
      return { available: false, reason: 'NO_CATALOG_LESSON', session: this.baseSessionInfo(sl) };
    }

    const isTest = sl.lesson.type !== SessionType.LEARNING;
    const teacherOrAdmin = isAssignedTeacher || isAdmin;

    let available = false;
    let reason: string | null = null;

    if (teacherOrAdmin) {
      available = true;
    } else if (isTest) {
      if (sl.status === LessonStatus.COMPLETED) {
        available = true;
      } else if (sl.status === LessonStatus.UPCOMING && dhakaDateStrOf(sl.start) === todayDhakaDateStr()) {
        available = true;
      } else if (sl.status === LessonStatus.UPCOMING) {
        reason = 'TEST_NOT_YET_TODAY';
      } else {
        reason = 'CANCELLED';
      }
    } else {
      if (sl.status === LessonStatus.COMPLETED) {
        available = true;
      } else if (sl.status === LessonStatus.UPCOMING) {
        reason = 'UPCOMING_LOCKED';
      } else {
        reason = 'CANCELLED';
      }
    }

    if (!available) {
      return { available: false, reason, session: this.baseSessionInfo(sl) };
    }

    return {
      available: true,
      session: this.baseSessionInfo(sl),
      isTest,
      lesson: {
        id: sl.lesson.id,
        title: sl.lesson.title,
        type: sl.lesson.type,
        objectives: sl.lesson.objectives,
        contentMarkdown: sl.lesson.contentMarkdown,
        reviewNotes: sl.lesson.reviewNotes,
        homework: sl.lesson.homework,
        checkpoint: sl.lesson.checkpoint,
        codeSnippets: sl.lesson.codeSnippets,
        module: sl.lesson.module ? { id: sl.lesson.module.id, title: sl.lesson.module.title, stageNumber: sl.lesson.module.stageNumber } : null,
        project: sl.lesson.project
          ? { id: sl.lesson.project.id, title: sl.lesson.project.title, description: sl.lesson.project.description }
          : null,
      },
      assessment: sl.lesson.assessment ?? null,
    };
  }

  private baseSessionInfo(sl: { id: string; lessonNumber: number; start: Date; end: Date; status: LessonStatus; course: { id: string; title: string } }) {
    return {
      scheduledLessonId: sl.id,
      lessonNumber: sl.lessonNumber,
      start: sl.start,
      end: sl.end,
      status: sl.status,
      courseId: sl.course.id,
      courseTitle: sl.course.title,
    };
  }

  // ── Admin/teacher browsing: full course structure ────────────────────────

  async getCourseStructure(courseId: string, requester: Requester) {
    // Full curriculum content (materials, homework, checkpoints) is only
    // for the admin editor and a teacher preparing their own assigned
    // curriculum — never a student/parent, who must go through the
    // per-session access rules in getScheduledLessonDetails instead.
    if (requester.role === Role.TEACHER) {
      const teaches = await this.prisma.scheduledLesson.findFirst({
        where: { courseId, teacher: { userId: requester.userId } },
        select: { id: true },
      });
      if (!teaches) throw new ForbiddenException('You are not assigned to teach this curriculum.');
    } else if (requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have access to the full curriculum structure.');
    }

    const modules = await this.prisma.courseModule.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: {
        projects: { orderBy: { order: 'asc' } },
        lessons: {
          orderBy: { order: 'asc' },
          include: { assessment: { select: { id: true, type: true, title: true, isPublished: true } } },
        },
      },
    });
    // Lessons not tied to any module (pathway/stage-level Final/Stage Tests)
    const looseLessons = await this.prisma.lesson.findMany({
      where: { courseId, moduleId: null },
      orderBy: { order: 'asc' },
      include: { assessment: { select: { id: true, type: true, title: true, isPublished: true } } },
    });

    return { modules, looseLessons };
  }

  // ── Admin CRUD: modules ───────────────────────────────────────────────────

  async createModule(courseId: string, dto: CreateModuleDto) {
    return this.prisma.courseModule.create({ data: { courseId, ...dto } });
  }

  async updateModule(moduleId: string, dto: UpdateModuleDto) {
    await this.ensure(this.prisma.courseModule, moduleId, 'Module');
    return this.prisma.courseModule.update({ where: { id: moduleId }, data: dto });
  }

  async deleteModule(moduleId: string) {
    await this.ensure(this.prisma.courseModule, moduleId, 'Module');
    await this.prisma.courseModule.delete({ where: { id: moduleId } }); // cascades lessons/projects
    return { success: true };
  }

  // ── Admin CRUD: projects ──────────────────────────────────────────────────

  async createProject(moduleId: string, dto: CreateProjectDto) {
    await this.ensure(this.prisma.courseModule, moduleId, 'Module');
    return this.prisma.project.create({ data: { moduleId, ...dto } });
  }

  async updateProject(projectId: string, dto: UpdateProjectDto) {
    await this.ensure(this.prisma.project, projectId, 'Project');
    return this.prisma.project.update({ where: { id: projectId }, data: dto });
  }

  async deleteProject(projectId: string) {
    await this.ensure(this.prisma.project, projectId, 'Project');
    await this.prisma.project.delete({ where: { id: projectId } });
    return { success: true };
  }

  // ── Admin: rich lesson content (extends the plain title/order editor) ────

  async updateLessonContent(lessonId: string, dto: UpdateLessonContentDto) {
    await this.ensure(this.prisma.lesson, lessonId, 'Lesson');
    const { codeSnippets, type, ...rest } = dto;
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...rest,
        ...(type ? { type: type as SessionType } : {}),
        ...(codeSnippets ? { codeSnippets: codeSnippets as unknown as object } : {}),
      },
    });
  }

  private async ensure(delegate: { findUnique: (args: { where: { id: string } }) => Promise<unknown> }, id: string, label: string) {
    const row = await delegate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`${label} not found`);
    return row;
  }
}

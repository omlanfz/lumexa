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

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LessonStatus, Role, SessionType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  todayDhakaDateStr,
  utcToDhakaParts,
} from '../scheduling/dhaka-time.util';
import { getAiBuilderProjectLinksFallback } from '../courses/curriculum-catalog.seed';
import {
  CreateModuleDto,
  CreateProjectDto,
  ImportLessonDto,
  ImportLessonsDto,
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

  // ── QA demo classroom (see DEMO_ROOM_NAME in classroom.service.ts) ───────

  /** The demo classroom has no real ScheduledLesson behind it, so "View
   * Lesson" there shows this one fixed, always-unlocked example instead of
   * an empty state — the first lesson of the seeded AI Builder Path
   * ("How Language Models Work"), looked up by its stable course/module
   * slug + in-module order rather than a raw id (which would differ per
   * seed run). Any authenticated user may call this — it's public catalog
   * content, not tied to any student's actual progress. */
  async getDemoExampleLessonDetails() {
    const emptySession = {
      scheduledLessonId: null,
      lessonNumber: 0,
      start: null,
      end: null,
      status: null,
      courseId: '',
      courseTitle: '',
    };

    const course = await this.prisma.course.findUnique({
      where: { slug: 'ai-builder-path' },
    });
    const module = course
      ? await this.prisma.courseModule.findUnique({
          where: { courseId_slug: { courseId: course.id, slug: 'language-models' } },
        })
      : null;
    const lesson = module
      ? await this.prisma.lesson.findFirst({
          where: { moduleId: module.id, order: 1 },
          include: {
            module: true,
            project: true,
            assessment: {
              select: { id: true, type: true, title: true, isPublished: true },
            },
          },
        })
      : null;

    if (!course || !lesson) {
      return {
        available: false,
        reason: 'NO_CATALOG_LESSON',
        session: emptySession,
      };
    }

    return {
      available: true,
      isTest: lesson.type !== SessionType.LEARNING,
      session: {
        ...emptySession,
        lessonNumber: lesson.order,
        courseId: course.id,
        courseTitle: course.title,
      },
      lesson: {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        objectives: lesson.objectives,
        contentMarkdown: lesson.contentMarkdown,
        reviewNotes: lesson.reviewNotes,
        homework: lesson.homework,
        checkpoint: lesson.checkpoint,
        codeSnippets: lesson.codeSnippets,
        projectLinks: this.resolveProjectLinks('ai-builder-path', lesson.order, lesson.projectLinks),
        module: lesson.module
          ? {
              id: lesson.module.id,
              title: lesson.module.title,
              stageNumber: lesson.module.stageNumber,
            }
          : null,
        project: lesson.project
          ? {
              id: lesson.project.id,
              title: lesson.project.title,
              description: lesson.project.description,
            }
          : null,
      },
      assessment: lesson.assessment ?? null,
    };
  }

  // ── Lesson Details (student/teacher read path) ───────────────────────────

  // Catalog-based lesson details — for a teacher/admin browsing the
  // curriculum itself rather than one specific scheduled occurrence (e.g.
  // preparing ahead for a lesson that hasn't been scheduled for a given
  // student yet). Always unlocked for an assigned teacher/admin; students
  // never call this — their access always goes through a real
  // ScheduledLesson via getScheduledLessonDetails above.
  async getCatalogLessonDetails(lessonId: string, requester: Requester) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: true,
        project: true,
        assessment: {
          select: { id: true, type: true, title: true, isPublished: true },
        },
        course: { select: { id: true, title: true, slug: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    if (requester.role === Role.TEACHER) {
      const teaches = await this.prisma.scheduledLesson.findFirst({
        where: {
          courseId: lesson.courseId,
          teacher: { userId: requester.userId },
        },
        select: { id: true },
      });
      if (!teaches)
        throw new ForbiddenException(
          'You are not assigned to teach this curriculum.',
        );
    } else if (requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have access to this lesson.');
    }

    const isTest = lesson.type !== SessionType.LEARNING;
    return {
      available: true,
      isTest,
      session: {
        scheduledLessonId: null,
        lessonNumber: lesson.order,
        start: null,
        end: null,
        status: null,
        courseId: lesson.course.id,
        courseTitle: lesson.course.title,
      },
      lesson: {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        objectives: lesson.objectives,
        contentMarkdown: lesson.contentMarkdown,
        reviewNotes: lesson.reviewNotes,
        homework: lesson.homework,
        checkpoint: lesson.checkpoint,
        codeSnippets: lesson.codeSnippets,
        projectLinks: this.resolveProjectLinks(lesson.course.slug, lesson.order, lesson.projectLinks),
        module: lesson.module
          ? {
              id: lesson.module.id,
              title: lesson.module.title,
              stageNumber: lesson.module.stageNumber,
            }
          : null,
        project: lesson.project
          ? {
              id: lesson.project.id,
              title: lesson.project.title,
              description: lesson.project.description,
            }
          : null,
      },
      assessment: lesson.assessment ?? null,
    };
  }

  async getScheduledLessonDetails(
    scheduledLessonId: string,
    requester: Requester,
  ) {
    const sl = await this.prisma.scheduledLesson.findUnique({
      where: { id: scheduledLessonId },
      include: {
        lesson: {
          include: {
            module: true,
            project: true,
            assessment: {
              select: { id: true, type: true, title: true, isPublished: true },
            },
          },
        },
        teacher: { select: { userId: true } },
        course: { select: { id: true, title: true, slug: true } },
        submission: {
          select: {
            id: true,
            status: true,
            fileUrl: true,
            fileName: true,
            note: true,
            submittedAt: true,
            reviewedAt: true,
            feedback: true,
          },
        },
      },
    });
    if (!sl) throw new NotFoundException('Scheduled lesson not found');

    const isOwner = sl.studentUserId === requester.userId;
    const isAssignedTeacher =
      requester.role === Role.TEACHER && sl.teacher.userId === requester.userId;
    const isAdmin = requester.role === Role.ADMIN;

    if (!isOwner && !isAssignedTeacher && !isAdmin) {
      throw new ForbiddenException('You do not have access to this class.');
    }
    if (!sl.lesson) {
      return {
        available: false,
        reason: 'NO_CATALOG_LESSON',
        session: this.baseSessionInfo(sl),
      };
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
      } else if (
        sl.status === LessonStatus.UPCOMING &&
        dhakaDateStrOf(sl.start) === todayDhakaDateStr()
      ) {
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
        projectLinks: this.resolveProjectLinks(sl.course.slug, sl.lesson.order, sl.lesson.projectLinks),
        module: sl.lesson.module
          ? {
              id: sl.lesson.module.id,
              title: sl.lesson.module.title,
              stageNumber: sl.lesson.module.stageNumber,
            }
          : null,
        project: sl.lesson.project
          ? {
              id: sl.lesson.project.id,
              title: sl.lesson.project.title,
              description: sl.lesson.project.description,
            }
          : null,
      },
      assessment: sl.lesson.assessment ?? null,
      submission: sl.lesson.homework ? sl.submission : null,
    };
  }

  private baseSessionInfo(sl: {
    id: string;
    lessonNumber: number;
    start: Date;
    end: Date;
    status: LessonStatus;
    course: { id: string; title: string };
  }) {
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

  /** The lesson's own stored projectLinks always wins (including an
   * intentionally-cleared `[]`) — only when it's null/undefined do we fall
   * back to the known ai-builder-path mapping, so the "💻 Project" section
   * (admin editor and live lesson pages alike) is always correct even on an
   * environment whose backend hasn't rebooted since this feature shipped
   * (see backfillAiBuilderProjectLinks in curriculum-catalog.seed.ts, which
   * this fallback makes non-essential for correctness, only for making the
   * value permanent/editable). Never applies outside ai-builder-path, since
   * every pathway course reuses the same 1-28 lesson `order` numbering. */
  private resolveProjectLinks(
    courseSlug: string,
    order: number,
    stored: unknown,
  ): unknown {
    if (stored !== null && stored !== undefined) return stored;
    if (courseSlug !== 'ai-builder-path') return stored;
    return getAiBuilderProjectLinksFallback(order);
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
      if (!teaches)
        throw new ForbiddenException(
          'You are not assigned to teach this curriculum.',
        );
    } else if (requester.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have access to the full curriculum structure.',
      );
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, isCustom: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    const modules = await this.prisma.courseModule.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: {
        projects: { orderBy: { order: 'asc' } },
        lessons: {
          orderBy: { order: 'asc' },
          include: {
            assessment: {
              select: { id: true, type: true, title: true, isPublished: true },
            },
          },
        },
      },
    });
    // Lessons not tied to any module (pathway/stage-level Final/Stage Tests)
    const looseLessons = await this.prisma.lesson.findMany({
      where: { courseId, moduleId: null },
      orderBy: { order: 'asc' },
      include: {
        assessment: {
          select: { id: true, type: true, title: true, isPublished: true },
        },
      },
    });

    return { course, modules, looseLessons };
  }

  // ── Custom Curriculum Builder: reuse existing default-curriculum content ──
  //
  // Every LEARNING-type lesson from every default (non-custom) course,
  // categorized by curriculum -> module, for the "reuse existing
  // lessons/courses" picker. Test-type sessions (COURSE_TEST/STAGE_TEST/
  // FINAL_TEST) are deliberately excluded — they carry an Assessment +
  // question bank that isn't safe to duplicate blind, so a custom
  // curriculum's own tests (if any) are hand-built via the regular lesson
  // editor instead.

  /** Every default curriculum's full, ordered session list — every course
   * (module) and every session, learning and test alike — grouped by
   * curriculum -> module, exactly matching that curriculum's real teaching
   * order (Lesson.order is the session number within the whole course, not
   * per-module — see ScheduledLesson.lessonId's doc comment). Test-type
   * sessions (COURSE_TEST/STAGE_TEST/FINAL_TEST) ARE included here for a
   * true "all 28 lessons" picker, but importing one copies only its
   * content — never its Assessment/question bank, which isn't safe to
   * duplicate blind (see importLesson). */
  async getReusableLessons() {
    const courses = await this.prisma.course.findMany({
      where: { isCustom: false },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        category: true,
        sessions: true,
        modules: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            stageNumber: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                order: true,
                duration: true,
                type: true,
                homework: true,
              },
            },
          },
        },
        lessons: {
          where: { moduleId: null },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            order: true,
            duration: true,
            type: true,
            homework: true,
          },
        },
      },
    });
    return courses
      .map((c) => ({
        courseId: c.id,
        courseTitle: c.title,
        category: c.category,
        totalSessions: c.sessions,
        modules: [
          ...c.modules.map((m) => ({
            moduleId: m.id,
            moduleTitle: m.title,
            stageNumber: m.stageNumber,
            lessons: m.lessons,
          })),
          // Loose (non-module) sessions — Stage/Final Tests — appended as
          // their own pseudo-section so they still appear in sequence.
          ...(c.lessons.length > 0
            ? [
                {
                  moduleId: null,
                  moduleTitle: 'Stage / Final Tests',
                  stageNumber: null,
                  lessons: c.lessons,
                },
              ]
            : []),
        ].filter((m) => m.lessons.length > 0),
      }))
      .filter((c) => c.modules.length > 0);
  }

  /** Copies one default-curriculum Lesson's content into a custom course as
   * a new, independent, flat (moduleId: null) lesson at the given order —
   * the default lesson and its module/course are never touched, so this can
   * never mutate a default curriculum. The session type is preserved for an
   * accurate structure preview, but no Assessment/question bank is cloned —
   * an imported test session has no question bank until the admin builds
   * one fresh for it. */
  async importLesson(targetCourseId: string, dto: ImportLessonDto) {
    const target = await this.requireCustomCourse(targetCourseId);
    const source = await this.prisma.lesson.findUnique({
      where: { id: dto.sourceLessonId },
    });
    if (!source) throw new NotFoundException('Source lesson not found');

    return this.prisma.lesson.create({
      data: this.lessonImportData(target.id, dto.order, source),
    });
  }

  /** Same as importLesson, but for a whole batch at once — the "select all"
   * actions in the Curriculum Builder (a module, a stage, or an entire
   * curriculum). Orders are assigned sequentially starting right after the
   * course's current last lesson, in the same order the source lessons were
   * given in (already teaching-order from the reusable-lessons endpoint). */
  async importLessons(targetCourseId: string, dto: ImportLessonsDto) {
    const target = await this.requireCustomCourse(targetCourseId);
    const sources = await this.prisma.lesson.findMany({
      where: { id: { in: dto.sourceLessonIds } },
    });
    if (sources.length === 0) {
      throw new NotFoundException('No matching source lessons found');
    }
    const byId = new Map(sources.map((s) => [s.id, s]));

    const currentMax = await this.prisma.lesson.aggregate({
      where: { courseId: target.id },
      _max: { order: true },
    });
    let nextOrder = (currentMax._max.order ?? 0) + 1;

    const creates = dto.sourceLessonIds
      .map((id) => byId.get(id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((source) =>
        this.prisma.lesson.create({
          data: this.lessonImportData(target.id, nextOrder++, source),
        }),
      );
    return this.prisma.$transaction(creates);
  }

  private async requireCustomCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isCustom: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (!course.isCustom) {
      throw new ForbiddenException(
        'Lessons can only be imported into a custom curriculum.',
      );
    }
    return course;
  }

  private lessonImportData(
    targetCourseId: string,
    order: number,
    source: {
      id: string;
      title: string;
      duration: number;
      type: SessionType;
      objectives: string[];
      contentMarkdown: string | null;
      reviewNotes: string | null;
      checkpoint: string | null;
      codeSnippets: unknown;
      projectLinks: unknown;
      homework: string | null;
    },
  ) {
    return {
      courseId: targetCourseId,
      title: source.title,
      order,
      duration: source.duration,
      type: source.type,
      objectives: source.objectives,
      contentMarkdown: source.contentMarkdown,
      reviewNotes: source.reviewNotes,
      checkpoint: source.checkpoint,
      codeSnippets: source.codeSnippets as object | undefined,
      projectLinks: source.projectLinks as object | undefined,
      homework: source.homework,
      sourceRefs: { importedFromLessonId: source.id } as object,
    };
  }

  // ── Admin CRUD: modules ───────────────────────────────────────────────────

  async createModule(courseId: string, dto: CreateModuleDto) {
    return this.prisma.courseModule.create({ data: { courseId, ...dto } });
  }

  async updateModule(moduleId: string, dto: UpdateModuleDto) {
    await this.ensure(this.prisma.courseModule, moduleId, 'Module');
    return this.prisma.courseModule.update({
      where: { id: moduleId },
      data: dto,
    });
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
    const { codeSnippets, projectLinks, type, ...rest } = dto;
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...rest,
        ...(type ? { type: type as SessionType } : {}),
        ...(codeSnippets
          ? { codeSnippets: codeSnippets as unknown as object }
          : {}),
        ...(projectLinks
          ? { projectLinks: projectLinks as unknown as object }
          : {}),
      },
    });
  }

  private async ensure(
    delegate: {
      findUnique: (args: { where: { id: string } }) => Promise<unknown>;
    },
    id: string,
    label: string,
  ) {
    const row = await delegate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`${label} not found`);
    return row;
  }
}

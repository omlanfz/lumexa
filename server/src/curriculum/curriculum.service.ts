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
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClassroomAdmissionStatus,
  Lesson,
  LessonStatus,
  Prisma,
  Role,
  SessionType,
} from '@prisma/client';
import {
  COUNTS_AS_COMPLETED,
  findCanonicalCompletedRow,
} from '../scheduling/lesson-state.util';
import { PrismaService } from '../prisma.service';
import {
  todayDhakaDateStr,
  utcToDhakaParts,
} from '../scheduling/dhaka-time.util';
import { getClassWindow } from '../scheduling/lesson-window.util';
import { roomForLessonRecord } from '../classroom/room-ref.util';
import {
  getProjectLinksFallback,
  tableizeKeyTerminology,
} from '../courses/curriculum-catalog.seed';
import { getBankSummary } from '../assessments/bank-summary';
import {
  PRESENTABLE_FILE_SELECT,
  presentFiles,
} from '../submissions/homework-files.service';
import {
  BANK_OWNER_SELECT,
  ensureLinkedAssessment,
} from '../assessments/linked-assessment';
import {
  CreateModuleDto,
  CreateProjectDto,
  ImportLessonDto,
  ImportLessonsDto,
  PreviewLessonDto,
  QuizCheckDto,
  SaveProgressDto,
  UpdateLessonContentDto,
  UpdateModuleDto,
  UpdateProjectDto,
} from './dto/curriculum.dto';
import {
  CONTENT_VERSION,
  QuizAnswerError,
  VISUAL_TYPES,
  buildNavigation,
  buildSharedLesson,
  buildTeacherPrep,
  gradeAnswer,
  hasTeacherPrep,
  indexCourseLessons,
  lineageKey,
  numberingFor,
  persistedLineage,
  readQuiz,
  readVisuals,
  resolveLessonRefs,
  validateLessonContent,
  type LessonRow,
  type LinkFor,
  type QuizAnswer,
  type Viewer,
} from './lesson-content';

interface Requester {
  userId: string;
  role: Role;
}

/** A submission as the lesson page shows it: its files as one list (links from
 * before homework moved to R2, plus the files kept there), never raw rows. */
function presentSubmission<
  T extends {
    files: unknown;
    homeworkFiles?: Parameters<typeof presentFiles>[1];
  },
>(submission: T | null) {
  if (!submission) return null;
  const { homeworkFiles, ...rest } = submission;
  return { ...rest, files: presentFiles(submission.files, homeworkFiles) };
}

/** What the Custom Curriculum Builder's lesson picker needs about each lesson. */
const PICKER_LESSON_SELECT = {
  id: true,
  title: true,
  order: true,
  duration: true,
  type: true,
  homework: true,
  miniQuiz: true,
  visuals: true,
  teacherNotes: true,
} satisfies Prisma.LessonSelect;

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
          where: {
            courseId_slug: { courseId: course.id, slug: 'language-models' },
          },
        })
      : null;
    const lesson = module
      ? await this.prisma.lesson.findFirst({
          where: { moduleId: module.id, order: 1 },
          include: {
            module: true,
            project: true,
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
        })
      : null;

    if (!course || !lesson) {
      return {
        available: false,
        reason: 'NO_CATALOG_LESSON',
        session: emptySession,
      };
    }

    const isTest = lesson.type !== SessionType.LEARNING;
    return {
      available: true,
      isTest,
      session: {
        ...emptySession,
        lessonNumber: lesson.order,
        courseId: course.id,
        courseTitle: course.title,
      },
      lesson: buildSharedLesson(lesson as unknown as LessonRow, {
        projectLinks: this.resolveProjectLinks(
          'ai-builder-path',
          lesson.order,
          lesson.projectLinks,
        ),
      }),
      assessment: await this.describeAssessment(lesson.assessment),
      viewer: 'student' as Viewer,
      canPrepare: false,
      ...(isTest
        ? {}
        : await this.enrich({
            courseId: course.id,
            lessonId: lesson.id,
            markdowns: [lesson.contentMarkdown, lesson.homework],
            viewer: 'student',
            inClassroom: true,
            withNavigation: false,
          })),
    };
  }

  // ── Lesson Details (student/teacher read path) ───────────────────────────

  /** A teacher must teach the course; an admin always may. Anyone else may not. */
  private async assertTeachesOrAdmin(
    courseId: string,
    requester: Requester,
    forbidden = 'You do not have access to this lesson.',
  ) {
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
      throw new ForbiddenException(forbidden);
    }
  }

  /**
   * Where a viewer may follow a link to another lesson, from this course:
   *   - inside the classroom: nowhere (a link would navigate away from the live class);
   *   - teacher / admin: the always-unlocked catalog page;
   *   - student: only the lessons they have already had, through their own class —
   *     every other lesson is reported as locked, never linked.
   */
  private async linkFor(
    viewer: Viewer,
    courseId: string,
    studentUserId: string | undefined,
    inClassroom: boolean,
  ): Promise<LinkFor> {
    if (inClassroom) return () => ({ href: null, locked: false });
    if (viewer !== 'student' || !studentUserId) {
      return (t) => ({ href: `/curriculum-lesson/${t.id}`, locked: false });
    }
    const done = await this.prisma.scheduledLesson.findMany({
      where: { studentUserId, courseId, status: { in: COUNTS_AS_COMPLETED } },
      orderBy: { start: 'asc' },
      select: { id: true, lessonNumber: true },
    });
    const byNumber = new Map<number, string>();
    for (const d of done) if (!byNumber.has(d.lessonNumber)) byNumber.set(d.lessonNumber, d.id);
    return (t) => {
      const id = byNumber.get(t.order);
      return id ? { href: `/lesson/${id}`, locked: false } : { href: null, locked: true };
    };
  }

  /** Session / lesson numbering, previous-next navigation and resolved "Lesson N" links. */
  private async enrich(args: {
    courseId: string;
    lessonId: string;
    markdowns: (string | null | undefined)[];
    viewer: Viewer;
    studentUserId?: string;
    inClassroom?: boolean;
    withNavigation: boolean;
  }) {
    const rows = await this.prisma.lesson.findMany({
      where: { courseId: args.courseId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        order: true,
        type: true,
        title: true,
        moduleId: true,
        sourceRefs: true,
        module: { select: { id: true, slug: true, title: true, stageNumber: true } },
      },
    });
    const index = indexCourseLessons(rows);
    const linkFor = await this.linkFor(args.viewer, args.courseId, args.studentUserId, !!args.inClassroom);
    return {
      numbering: numberingFor(index, args.lessonId),
      navigation: args.withNavigation ? buildNavigation(index, args.lessonId, linkFor) : null,
      refs: resolveLessonRefs(args.markdowns, index, args.lessonId, linkFor),
    };
  }

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
          select: {
            id: true,
            type: true,
            title: true,
            isPublished: true,
            sourceAssessmentId: true,
          },
        },
        course: { select: { id: true, title: true, slug: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.assertTeachesOrAdmin(lesson.courseId, requester);

    const isTest = lesson.type !== SessionType.LEARNING;
    const viewer: Viewer = requester.role === Role.ADMIN ? 'admin' : 'teacher';
    const row = lesson as unknown as LessonRow;
    const markdown = this.tableizeContent(lesson.course.slug, lesson.contentMarkdown);
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
      lesson: buildSharedLesson(row, {
        contentMarkdown: markdown,
        projectLinks: this.resolveProjectLinks(lesson.course.slug, lesson.order, lesson.projectLinks),
      }),
      assessment: await this.describeAssessment(lesson.assessment),
      viewer,
      canPrepare: !isTest && hasTeacherPrep(row),
      ...(isTest
        ? {}
        : await this.enrich({
            courseId: lesson.courseId,
            lessonId: lesson.id,
            markdowns: [markdown, lesson.homework],
            viewer,
            withNavigation: true,
          })),
    };
  }

  /** The decision "may this person read this class's lesson, and if not, why?" — shared by
   * the lesson read, the Mini Quiz check and the progress endpoints so they can never disagree. */
  private async decideAccess(
    sl: {
      id: string;
      status: LessonStatus;
      start: Date;
      end: Date;
      classType: 'ONE_TO_ONE' | 'BATCH';
      teacherId: string;
      studentUserId: string;
      studentJoinedAt: Date | null;
      batchSessionId: string | null;
      batchSession: { status: LessonStatus; start: Date; end: Date } | null;
      courseId: string;
      lessonNumber: number;
      teacher: { userId: string };
      lesson: { type: SessionType } | null;
    },
    requester: Requester,
    opts: { inClassroom?: boolean },
  ) {
    const isOwner = sl.studentUserId === requester.userId;
    const isAssignedTeacher =
      requester.role === Role.TEACHER && sl.teacher.userId === requester.userId;
    const isAdmin = requester.role === Role.ADMIN;

    if (!isOwner && !isAssignedTeacher && !isAdmin) {
      throw new ForbiddenException('You do not have access to this class.');
    }
    const teacherOrAdmin = isAssignedTeacher || isAdmin;
    if (!sl.lesson) {
      return { isOwner, teacherOrAdmin, isTest: false, canonical: null, available: false, reason: 'NO_CATALOG_LESSON' as string | null, noLesson: true };
    }

    const isTest = sl.lesson.type !== SessionType.LEARNING;

    // A lesson the student has already had (COMPLETED, or PARTIALLY_COMPLETED —
    // which unlocks it even though one extra class is still scheduled) is open
    // for them regardless of which of its classes this id points at. The
    // canonical row is the earliest such class; it also owns the homework
    // submission, so the extra class shows the same submission, not a blank.
    const canonical = await findCanonicalCompletedRow(this.prisma, {
      studentUserId: sl.studentUserId,
      courseId: sl.courseId,
      lessonNumber: sl.lessonNumber,
    });
    const lessonUnlocked =
      COUNTS_AS_COMPLETED.includes(sl.status) || !!canonical;
    const attendingNow =
      !!opts.inClassroom && isOwner && (await this.isAttendingNow(sl));

    let available = false;
    let reason: string | null = null;

    if (teacherOrAdmin) {
      available = true;
    } else if (isTest) {
      if (lessonUnlocked || attendingNow) {
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
      if (lessonUnlocked || attendingNow) {
        available = true;
      } else if (sl.status === LessonStatus.UPCOMING) {
        reason = 'UPCOMING_LOCKED';
      } else {
        reason = 'CANCELLED';
      }
    }
    return { isOwner, teacherOrAdmin, isTest, canonical, available, reason, noLesson: false };
  }

  /**
   * `inClassroom: true` is the classroom's own request (GET .../classroom-
   * details). It additionally lets the student see the lesson of the class they
   * are attending right now — see `isAttendingNow`. The standalone lesson page
   * never passes it, so an upcoming lesson stays locked everywhere else.
   */
  async getScheduledLessonDetails(
    scheduledLessonId: string,
    requester: Requester,
    opts: { inClassroom?: boolean } = {},
  ) {
    const sl = await this.prisma.scheduledLesson.findUnique({
      where: { id: scheduledLessonId },
      include: {
        batchSession: {
          select: { id: true, status: true, start: true, end: true },
        },
        lesson: {
          include: {
            module: true,
            project: true,
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
        teacher: { select: { userId: true } },
        course: { select: { id: true, title: true, slug: true } },
        batch: { select: { id: true, name: true } },
        submission: {
          select: {
            id: true,
            status: true,
            files: true,
            links: true,
            note: true,
            rating: true,
            feedbackTags: true,
            resubmissionCount: true,
            submittedAt: true,
            reviewedAt: true,
            feedback: true,
            homeworkFiles: { select: PRESENTABLE_FILE_SELECT },
          },
        },
      },
    });
    if (!sl) throw new NotFoundException('Scheduled lesson not found');

    const access = await this.decideAccess(sl, requester, opts);
    if (access.noLesson) {
      return {
        available: false,
        reason: 'NO_CATALOG_LESSON',
        session: this.baseSessionInfo(sl),
      };
    }
    if (!access.available) {
      return { available: false, reason: access.reason, session: this.baseSessionInfo(sl) };
    }
    const lesson = sl.lesson!;
    const { isOwner, teacherOrAdmin, isTest, canonical } = access;
    const viewer: Viewer = requester.role === Role.ADMIN ? 'admin' : requester.role === Role.TEACHER ? 'teacher' : 'student';
    const row = lesson as unknown as LessonRow;
    const markdown = this.tableizeContent(sl.course.slug, lesson.contentMarkdown);

    return {
      available: true,
      session: this.baseSessionInfo(sl),
      isTest,
      lesson: buildSharedLesson(row, {
        contentMarkdown: markdown,
        projectLinks: this.resolveProjectLinks(sl.course.slug, lesson.order, lesson.projectLinks),
      }),
      assessment: await this.describeAssessment(lesson.assessment),
      // Homework hand-ins are each student's own. A batch class's lesson page
      // is shared, so what the teacher or an admin opens through one student's
      // row must not show that one student's work as if it were the class's —
      // they review each student's work on that student's own homework.
      submission: presentSubmission(
        lesson.homework && !(sl.batchId && !isOwner)
          ? canonical && canonical.id !== sl.id
            ? await this.findSubmission(canonical.id)
            : sl.submission
          : null,
      ),
      viewer,
      // Teacher preparation is offered on the teacher's own lesson page only — never
      // in the classroom stage, which is shown to the whole class.
      canPrepare: !isTest && teacherOrAdmin && !opts.inClassroom && hasTeacherPrep(row),
      ...(isTest
        ? {}
        : await this.enrich({
            courseId: sl.courseId,
            lessonId: lesson.id,
            markdowns: [markdown, lesson.homework],
            viewer,
            studentUserId: sl.studentUserId,
            inClassroom: !!opts.inClassroom,
            withNavigation: !opts.inClassroom,
          })),
    };
  }

  // ── Teacher-only preparation ─────────────────────────────────────────────

  /** Teacher notes, review notes and the full quiz answer key. Assigned teacher or admin only —
   * deliberately not part of any lesson payload a student (or the shared screen) receives. */
  async getTeacherPrep(lessonId: string, requester: Requester) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true, type: true, teacherNotes: true, reviewNotes: true, miniQuiz: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.assertTeachesOrAdmin(lesson.courseId, requester, 'Teacher preparation notes are for teachers.');
    const prep = buildTeacherPrep(lesson as unknown as LessonRow);
    // The notes mention other lessons too ("Lesson 2 …"): resolve those links like the lesson's own.
    const { refs } = await this.enrich({
      courseId: lesson.courseId,
      lessonId: lesson.id,
      markdowns: [prep.teacherNotes, prep.reviewNotes],
      viewer: requester.role === Role.ADMIN ? 'admin' : 'teacher',
      withNavigation: false,
    });
    return { ...prep, refs };
  }

  // ── Mini Quiz (learning lessons only — separate from the assessment system) ──

  private async loadScheduledForAccess(scheduledLessonId: string) {
    const sl = await this.prisma.scheduledLesson.findUnique({
      where: { id: scheduledLessonId },
      include: {
        batchSession: { select: { id: true, status: true, start: true, end: true } },
        lesson: { select: { id: true, type: true } },
        teacher: { select: { userId: true } },
      },
    });
    if (!sl) throw new NotFoundException('Scheduled lesson not found');
    return sl;
  }

  /** A student may use a lesson's quiz / progress only through their own, unlocked class. */
  private async assertStudentMayUse(
    lessonId: string,
    scheduledLessonId: string | undefined,
    requester: Requester,
    inClassroom?: boolean,
  ) {
    if (!scheduledLessonId) throw new ForbiddenException('Open the lesson from your class first.');
    const sl = await this.loadScheduledForAccess(scheduledLessonId);
    if (sl.lessonId !== lessonId) throw new ForbiddenException('That class is not for this lesson.');
    const access = await this.decideAccess(sl, requester, { inClassroom });
    if (!access.available || access.noLesson) throw new ForbiddenException('This lesson is not unlocked yet.');
    return sl;
  }

  /**
   * Grades one answer. Students are checked through their own unlocked class and the
   * result is remembered on their progress; a teacher or admin can try every question
   * (to preview the quiz) without anything being stored.
   */
  async checkQuizAnswer(lessonId: string, dto: QuizCheckDto, requester: Requester) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true, type: true, miniQuiz: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.type !== SessionType.LEARNING) {
      throw new BadRequestException('Mini quizzes belong to learning lessons.');
    }
    if (requester.role === Role.STUDENT) {
      await this.assertStudentMayUse(lesson.id, dto.scheduledLessonId, requester, dto.inClassroom);
    } else {
      await this.assertTeachesOrAdmin(lesson.courseId, requester);
    }

    const questions = readQuiz(lesson.miniQuiz);
    const question = questions.find((q) => q.id === dto.questionId);
    if (!question) throw new NotFoundException('That question is not in this lesson.');
    let result;
    try {
      result = gradeAnswer(question, dto.answer as unknown as QuizAnswer);
    } catch (err) {
      if (err instanceof QuizAnswerError) throw new BadRequestException(err.message);
      throw err;
    }
    if (requester.role === Role.STUDENT) {
      await this.recordQuizResult(requester.userId, lesson.id, questions, question.id, result.correct);
    }
    return result;
  }

  // ── Study progress ───────────────────────────────────────────────────────

  private async recordQuizResult(
    studentUserId: string,
    lessonId: string,
    questions: ReturnType<typeof readQuiz>,
    questionId: string,
    correct: boolean,
  ) {
    const key = { studentUserId_lessonId: { studentUserId, lessonId } };
    const prev = await this.prisma.lessonProgress.findUnique({ where: key });
    const results = { ...((prev?.quizResults as Record<string, { correct: boolean | null; attempts: number; at: string }> | null) ?? {}) };
    results[questionId] = { correct, attempts: (results[questionId]?.attempts ?? 0) + 1, at: new Date().toISOString() };
    // Every question is multiple choice, so every question is scored.
    const allAnswered = questions.length > 0 && questions.every((q) => results[q.id]);
    const score = questions.filter((q) => results[q.id]?.correct === true).length;
    const now = new Date();
    const data = {
      quizResults: results as unknown as Prisma.InputJsonValue,
      quizTotal: questions.length,
      ...(allAnswered ? { quizScore: score, quizCompletedAt: prev?.quizCompletedAt ?? now } : {}),
      lastOpenedAt: now,
    };
    await this.prisma.lessonProgress.upsert({
      where: key,
      create: { studentUserId, lessonId, ...data },
      update: data,
    });
  }

  private async progressView(studentUserId: string, lessonId: string, miniQuiz: unknown) {
    const row = await this.prisma.lessonProgress.findUnique({
      where: { studentUserId_lessonId: { studentUserId, lessonId } },
    });
    const questions = readQuiz(miniQuiz);
    const results = (row?.quizResults as Record<string, { correct: boolean | null; attempts: number }> | null) ?? {};
    const submission = await this.prisma.submission.findFirst({
      where: { studentUserId, lessonId },
      select: { id: true },
    });
    return {
      sectionsRead: row?.sectionsRead ?? [],
      activitiesDone: row?.activitiesDone ?? [],
      quiz:
        questions.length > 0
          ? {
              total: questions.length,
              answered: questions.filter((q) => results[q.id]).length,
              gradedTotal: questions.length,
              score: questions.filter((q) => results[q.id]?.correct === true).length,
              // Finished only if every question that is in the quiz NOW has been answered (a quiz can change).
              completed: !!row?.quizCompletedAt && questions.every((q) => results[q.id]),
              results: Object.fromEntries(
                questions.filter((q) => results[q.id]).map((q) => [q.id, { correct: results[q.id].correct, attempts: results[q.id].attempts }]),
              ),
            }
          : null,
      // Always read from the real homework record — never stored twice.
      homeworkSubmitted: !!submission,
      lastOpenedAt: row?.lastOpenedAt ?? null,
    };
  }

  /** A student's own progress through this class's lesson (null for a teacher / admin). */
  async getProgress(scheduledLessonId: string, requester: Requester, inClassroom?: boolean) {
    if (requester.role !== Role.STUDENT) return { progress: null };
    const sl = await this.loadScheduledForAccess(scheduledLessonId);
    if (!sl.lesson) return { progress: null };
    await this.assertStudentMayUse(sl.lesson.id, scheduledLessonId, requester, inClassroom);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: sl.lesson.id }, select: { miniQuiz: true } });
    return { progress: await this.progressView(requester.userId, sl.lesson.id, lesson?.miniQuiz) };
  }

  /** Records what the student has actually read / done. Opening a lesson records nothing. */
  async saveProgress(scheduledLessonId: string, dto: SaveProgressDto, requester: Requester) {
    if (requester.role !== Role.STUDENT) return { progress: null };
    const sl = await this.loadScheduledForAccess(scheduledLessonId);
    if (!sl.lesson) throw new NotFoundException('This class has no lesson.');
    await this.assertStudentMayUse(sl.lesson.id, scheduledLessonId, requester, dto.inClassroom);
    const clean = (list: string[] | undefined) =>
      (list ?? []).filter((id) => /^[a-z0-9][a-z0-9-]{0,59}$/.test(id));
    const key = { studentUserId_lessonId: { studentUserId: requester.userId, lessonId: sl.lesson.id } };
    const prev = await this.prisma.lessonProgress.findUnique({ where: key });
    const union = (a: string[], b: string[]) => [...new Set([...a, ...b])].slice(0, 80);
    const data = {
      sectionsRead: union(prev?.sectionsRead ?? [], clean(dto.sectionsRead)),
      activitiesDone: union(prev?.activitiesDone ?? [], clean(dto.activitiesDone)),
      lastOpenedAt: new Date(),
    };
    await this.prisma.lessonProgress.upsert({
      where: key,
      create: { studentUserId: requester.userId, lessonId: sl.lesson.id, ...data },
      update: data,
    });
    const lesson = await this.prisma.lesson.findUnique({ where: { id: sl.lesson.id }, select: { miniQuiz: true } });
    return { progress: await this.progressView(requester.userId, sl.lesson.id, lesson?.miniQuiz) };
  }

  // ── Admin: the editor and its preview ────────────────────────────────────

  /** The lesson exactly as stored (teacher notes, answer key and all) — for the admin editor only. */
  async getLessonForEditor(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true, project: true, course: { select: { id: true, title: true, slug: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const refs = lesson.sourceRefs as { contentReview?: unknown } | null;
    return {
      session: { courseId: lesson.course.id, courseTitle: lesson.course.title },
      lesson: {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        order: lesson.order,
        duration: lesson.duration,
        objectives: lesson.objectives,
        contentMarkdown: this.tableizeContent(lesson.course.slug, lesson.contentMarkdown),
        homework: lesson.homework,
        checkpoint: lesson.checkpoint,
        teacherNotes: lesson.teacherNotes ?? '',
        reviewNotes: lesson.reviewNotes ?? '',
        miniQuiz: readQuiz(lesson.miniQuiz),
        visuals: readVisuals(lesson.visuals),
        codeSnippets: lesson.codeSnippets,
        projectLinks: this.resolveProjectLinks(lesson.course.slug, lesson.order, lesson.projectLinks),
        contentReview: Array.isArray(refs?.contentReview) ? refs.contentReview : [],
        module: lesson.module ? { id: lesson.module.id, title: lesson.module.title, stageNumber: lesson.module.stageNumber } : null,
        project: lesson.project ? { id: lesson.project.id, title: lesson.project.title, description: lesson.project.description } : null,
      },
    };
  }

  /** What learners and the teacher's presentation would see for a DRAFT, plus everything wrong with it. */
  async previewLesson(dto: PreviewLessonDto) {
    const existing = dto.lessonId
      ? await this.prisma.lesson.findUnique({
          where: { id: dto.lessonId },
          include: { module: true, project: true },
        })
      : null;
    if (dto.lessonId && !existing) throw new NotFoundException('Lesson not found');
    const check = validateLessonContent({
      title: dto.title,
      objectives: dto.objectives,
      contentMarkdown: dto.contentMarkdown,
      homework: dto.homework,
      teacherNotes: dto.teacherNotes,
      miniQuiz: dto.miniQuiz,
      visuals: dto.visuals,
      projectLinks: dto.projectLinks,
      codeSnippets: dto.codeSnippets,
    });
    const draft: LessonRow = {
      id: existing?.id ?? 'draft',
      title: dto.title ?? existing?.title ?? 'Untitled lesson',
      type: 'LEARNING',
      order: existing?.order ?? 1,
      duration: existing?.duration ?? null,
      objectives: dto.objectives ?? existing?.objectives ?? [],
      contentMarkdown: dto.contentMarkdown ?? existing?.contentMarkdown ?? null,
      homework: dto.homework ?? existing?.homework ?? null,
      checkpoint: dto.checkpoint ?? existing?.checkpoint ?? null,
      teacherNotes: dto.teacherNotes ?? existing?.teacherNotes ?? null,
      reviewNotes: existing?.reviewNotes ?? null,
      miniQuiz: check.quiz ?? existing?.miniQuiz ?? null,
      visuals: check.visuals ?? existing?.visuals ?? null,
      codeSnippets: dto.codeSnippets ?? existing?.codeSnippets ?? [],
      projectLinks: dto.projectLinks ?? existing?.projectLinks ?? null,
      module: existing?.module ? { id: existing.module.id, title: existing.module.title, stageNumber: existing.module.stageNumber } : null,
      project: existing?.project ? { id: existing.project.id, title: existing.project.title, description: existing.project.description } : null,
    };
    const context = existing
      ? await this.enrich({
          courseId: existing.courseId,
          lessonId: existing.id,
          markdowns: [draft.contentMarkdown, draft.homework],
          viewer: 'admin',
          withNavigation: false,
        })
      : { numbering: null, navigation: null, refs: {} };
    return {
      lesson: buildSharedLesson(draft, {}),
      teacherPrep: buildTeacherPrep(draft),
      ...context,
      validation: { errors: check.errors, warnings: check.warnings },
    };
  }

  /** The visual kinds the editor can offer (and the server accepts). */
  getVisualTypes() {
    return VISUAL_TYPES;
  }

  /**
   * Is this student in the classroom of this class right now? The same things
   * that let them into the room, and nothing wider:
   *   - the class (and, for a batch class, its session) is still UPCOMING — the
   *     teacher has not ended it, and it is not cancelled;
   *   - its classroom has opened (10 minutes before the start);
   *   - they have actually come in through the join flow (studentJoinedAt is
   *     set there, after the lock and admission checks);
   *   - the teacher has not removed them and not yet let them back.
   * Only the lesson of THIS class is ever unlocked by it — never a later one.
   */
  private async isAttendingNow(sl: {
    id: string;
    status: LessonStatus;
    start: Date;
    end: Date;
    classType: 'ONE_TO_ONE' | 'BATCH';
    teacherId: string;
    studentUserId: string;
    studentJoinedAt: Date | null;
    batchSessionId: string | null;
    batchSession: {
      status: LessonStatus;
      start: Date;
      end: Date;
    } | null;
  }): Promise<boolean> {
    const classStatus = sl.batchSession?.status ?? sl.status;
    if (sl.status !== LessonStatus.UPCOMING) return false;
    if (classStatus !== LessonStatus.UPCOMING) return false;
    if (!sl.studentJoinedAt) return false;

    const window = getClassWindow(
      sl.batchSession?.start ?? sl.start,
      sl.batchSession?.end ?? sl.end,
    );
    if (!window.joinable) return false;

    const latest = await this.prisma.classroomAdmission.findFirst({
      where: { room: roomForLessonRecord(sl), userId: sl.studentUserId },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });
    return latest?.status !== ClassroomAdmissionStatus.REMOVED;
  }

  private findSubmission(scheduledLessonId: string) {
    return this.prisma.submission.findUnique({
      where: { scheduledLessonId },
      select: {
        id: true,
        status: true,
        files: true,
        links: true,
        note: true,
        rating: true,
        feedbackTags: true,
        resubmissionCount: true,
        submittedAt: true,
        reviewedAt: true,
        feedback: true,
        homeworkFiles: { select: PRESENTABLE_FILE_SELECT },
      },
    });
  }

  /** The assessment as the lesson page/classroom needs it: identity plus what
   *  the test actually contains (question counts, marks), read from its root
   *  bank — so a linked custom-course test reports the original's questions. */
  private async describeAssessment(
    assessment: {
      id: string;
      type: SessionType;
      title: string;
      isPublished: boolean;
      sourceAssessmentId: string | null;
    } | null,
  ) {
    if (!assessment) return null;
    const { sourceAssessmentId: _source, ...visible } = assessment;
    void _source;
    return { ...visible, ...(await getBankSummary(this.prisma, assessment)) };
  }

  private baseSessionInfo(sl: {
    id: string;
    lessonNumber: number;
    start: Date;
    end: Date;
    status: LessonStatus;
    course: { id: string; title: string };
    batch?: { id: string; name: string } | null;
  }) {
    return {
      scheduledLessonId: sl.id,
      lessonNumber: sl.lessonNumber,
      start: sl.start,
      end: sl.end,
      status: sl.status,
      courseId: sl.course.id,
      courseTitle: sl.course.title,
      // The group this class is taught to — null for a 1-to-1 class.
      batchName: sl.batch?.name ?? null,
    };
  }

  /** The lesson's own stored projectLinks always wins (including an
   * intentionally-cleared `[]`) — only when it's null/undefined do we fall
   * back to the known per-pathway mapping, so the "💻 Project" section
   * (admin editor and live lesson pages alike) is always correct even on an
   * environment whose backend hasn't rebooted since this feature shipped
   * (see backfillProjectLinks in curriculum-catalog.seed.ts, which this
   * fallback makes non-essential for correctness, only for making the
   * value permanent/editable). getProjectLinksFallback itself returns null
   * for any course slug with no known mapping, so every other course is
   * unaffected without needing a check here. */
  private resolveProjectLinks(
    courseSlug: string,
    order: number,
    stored: unknown,
  ): unknown {
    if (stored !== null && stored !== undefined) return stored;
    return getProjectLinksFallback(courseSlug, order);
  }

  /** Converts data-scientist-path's "## Key Terminology" bullet lists into a
   * real table on read (see tableizeKeyTerminology) — the same read-time
   * safety net as resolveProjectLinks above, for the same reason: an
   * environment that hasn't rebooted since this shipped would otherwise
   * still serve the un-converted markdown. A no-op for every other course,
   * and a no-op wherever the bullet pattern isn't found (already converted,
   * or an admin rewrote the section). */
  private tableizeContent(
    courseSlug: string,
    markdown: string | null,
  ): string | null {
    if (!markdown || courseSlug !== 'data-scientist-path') return markdown;
    return tableizeKeyTerminology(markdown);
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
  // Every session from every default (non-custom) course, categorized by
  // curriculum -> module, for the "reuse existing lessons/courses" picker.
  // Importing a test session (COURSE_TEST/STAGE_TEST/FINAL_TEST) links the new
  // lesson to the ORIGINAL question bank — see importLesson.

  /** Every default curriculum's full, ordered session list — every course
   * (module) and every session, learning and test alike — grouped by
   * curriculum -> module, exactly matching that curriculum's real teaching
   * order (Lesson.order is the session number within the whole course, not
   * per-module — see ScheduledLesson.lessonId's doc comment). Test-type
   * sessions ARE included for a true "all 28 lessons" picker; importing one
   * gives the custom course a test that reads the original's questions. */
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
              select: PICKER_LESSON_SELECT,
            },
          },
        },
        lessons: {
          where: { moduleId: null },
          orderBy: { order: 'asc' },
          select: PICKER_LESSON_SELECT,
        },
      },
    });
    // What each lesson brings with it when imported, so the builder can say so.
    const badge = (l: (typeof courses)[number]['lessons'][number]) => {
      const { miniQuiz, visuals, teacherNotes, ...rest } = l;
      return {
        ...rest,
        content: {
          quizQuestions: readQuiz(miniQuiz).length,
          visuals: readVisuals(visuals).length,
          teacherNotes: !!teacherNotes && teacherNotes.trim() !== '',
        },
      };
    };
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
            lessons: m.lessons.map(badge),
          })),
          // Loose (non-module) sessions — Stage/Final Tests — appended as
          // their own pseudo-section so they still appear in sequence.
          ...(c.lessons.length > 0
            ? [
                {
                  moduleId: null,
                  moduleTitle: 'Stage / Final Tests',
                  stageNumber: null,
                  lessons: c.lessons.map(badge),
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
   * never mutate a default curriculum.
   *
   * A test session (Course/Stage/Final Test) is imported WITH its question
   * bank: the new lesson gets its own Assessment row (own attempts, own
   * publish/pass settings) LINKED to the original bank rather than a copy of
   * its questions (see linked-assessment.ts). Importing the lesson without
   * its bank was the bug that left every imported test with "no questions". */
  async importLesson(targetCourseId: string, dto: ImportLessonDto) {
    const target = await this.requireCustomCourse(targetCourseId);
    const source = await this.prisma.lesson.findUnique({
      where: { id: dto.sourceLessonId },
      include: {
        course: { select: { slug: true } },
        module: { select: { slug: true } },
        assessment: { select: BANK_OWNER_SELECT },
      },
    });
    if (!source) throw new NotFoundException('Source lesson not found');
    const lineage = await this.lineageOf(source);

    return this.prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.create({
        data: this.lessonImportData(target.id, dto.order, source, lineage),
      });
      if (source.assessment) {
        await ensureLinkedAssessment(
          tx,
          lesson.id,
          source.type,
          source.assessment,
        );
      }
      return lesson;
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
      include: {
        course: { select: { slug: true } },
        module: { select: { slug: true } },
        assessment: { select: BANK_OWNER_SELECT },
      },
    });
    if (sources.length === 0) {
      throw new NotFoundException('No matching source lessons found');
    }
    const byId = new Map(sources.map((s) => [s.id, s]));
    const lineages = new Map<string, string | null>();
    for (const src of sources) lineages.set(src.id, await this.lineageOf(src));

    const currentMax = await this.prisma.lesson.aggregate({
      where: { courseId: target.id },
      _max: { order: true },
    });
    let nextOrder = (currentMax._max.order ?? 0) + 1;

    const ordered = dto.sourceLessonIds
      .map((id) => byId.get(id))
      .filter((s): s is NonNullable<typeof s> => !!s);
    return this.prisma.$transaction(
      async (tx) => {
        const created: Lesson[] = [];
        for (const source of ordered) {
          const lesson = await tx.lesson.create({
            data: this.lessonImportData(target.id, nextOrder++, source, lineages.get(source.id) ?? null),
          });
          // Test sessions come with their (linked) question bank.
          if (source.assessment) {
            await ensureLinkedAssessment(
              tx,
              lesson.id,
              source.type,
              source.assessment,
            );
          }
          created.push(lesson);
        }
        return created;
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
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

  /** Where the source lesson's content originated (see lesson-content/refs.ts) — what lets
   * "Lesson 4" links in the copy resolve to the right lesson of the course it lands in. */
  private async lineageOf(source: {
    id: string;
    moduleId: string | null;
    type: SessionType;
    sourceRefs: unknown;
    module?: { slug: string } | null;
  }): Promise<string | null> {
    const stored = persistedLineage(source.sourceRefs);
    if (stored) return stored;
    if (source.type !== SessionType.LEARNING || !source.moduleId || !source.module) return null;
    const siblings = await this.prisma.lesson.findMany({
      where: { moduleId: source.moduleId, type: SessionType.LEARNING },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    const position = siblings.findIndex((x) => x.id === source.id) + 1;
    return position > 0 ? lineageKey(source.module.slug, position) : null;
  }

  private lessonImportData(
    targetCourseId: string,
    order: number,
    source: {
      id: string;
      order: number;
      title: string;
      duration: number;
      type: SessionType;
      objectives: string[];
      contentMarkdown: string | null;
      reviewNotes: string | null;
      teacherNotes: string | null;
      miniQuiz: unknown;
      visuals: unknown;
      contentVersion: number;
      sourceRefs: unknown;
      checkpoint: string | null;
      codeSnippets: unknown;
      projectLinks: unknown;
      homework: string | null;
      course: { slug: string };
    },
    lineage: string | null = null,
  ) {
    // Resolve the same read-time fallbacks the lesson-details endpoints
    // apply (see resolveProjectLinks/tableizeContent) before copying, so an
    // imported lesson gets the real "💻 Project" buttons and a tableized
    // Key Terminology section even when the *source* row's own stored
    // values are still null/un-converted (e.g. an environment that hasn't
    // rebooted since those features shipped) — otherwise a custom
    // curriculum would freeze in a stale copy forever, since importing
    // never re-reads the default lesson afterwards.
    //
    // Everything the lesson owns comes along — body (with its visual and quiz
    // placeholders and "Lesson N" links), teacher notes, quiz with explanations,
    // visuals. JSON is copied by value, so the copy is fully independent: editing
    // it never touches the original. Lineage + the source id are kept in sourceRefs
    // (traceability) and "Lesson N" links resolve by lineage inside the new course.
    const refs = source.sourceRefs && typeof source.sourceRefs === 'object' && !Array.isArray(source.sourceRefs)
      ? (source.sourceRefs as { contentReview?: unknown })
      : null;
    const copyJson = (v: unknown) => (v === null || v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));
    return {
      courseId: targetCourseId,
      title: source.title,
      order,
      duration: source.duration,
      type: source.type,
      objectives: source.objectives,
      contentMarkdown: this.tableizeContent(
        source.course.slug,
        source.contentMarkdown,
      ),
      reviewNotes: source.reviewNotes,
      teacherNotes: source.teacherNotes,
      miniQuiz: copyJson(source.miniQuiz),
      visuals: copyJson(source.visuals),
      // The copy is as upgraded as its source: an already-upgraded source is never
      // re-processed; a not-yet-upgraded one is picked up by the backfill later.
      contentVersion: source.contentVersion,
      checkpoint: source.checkpoint,
      codeSnippets: source.codeSnippets as object | undefined,
      projectLinks: this.resolveProjectLinks(
        source.course.slug,
        source.order,
        source.projectLinks,
      ) as object | undefined,
      homework: source.homework,
      sourceRefs: {
        importedFromLessonId: source.id,
        ...(lineage ? { lineageKey: lineage } : {}),
        ...(Array.isArray(refs?.contentReview) && refs.contentReview.length > 0 ? { contentReview: refs.contentReview } : {}),
      } as object,
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

  /**
   * Saves lesson content. Everything is validated first (required fields, quiz
   * structure, visual alt text/captions, media addresses, links, references between
   * the Markdown and the structured parts); a save with errors is rejected with the
   * full list so the editor can show every problem at once.
   */
  async updateLessonContent(lessonId: string, dto: UpdateLessonContentDto) {
    await this.ensure(this.prisma.lesson, lessonId, 'Lesson');
    const check = validateLessonContent({
      title: dto.title,
      objectives: dto.objectives,
      contentMarkdown: dto.contentMarkdown,
      homework: dto.homework,
      teacherNotes: dto.teacherNotes,
      miniQuiz: dto.miniQuiz,
      visuals: dto.visuals,
      projectLinks: dto.projectLinks,
      codeSnippets: dto.codeSnippets,
    });
    if (check.errors.length > 0) {
      throw new BadRequestException({
        message: `The lesson cannot be saved yet: ${check.errors.slice(0, 3).join(' ')}${check.errors.length > 3 ? ` (and ${check.errors.length - 3} more)` : ''}`,
        errors: check.errors,
        warnings: check.warnings,
      });
    }
    const { codeSnippets, projectLinks, type, miniQuiz: _quiz, visuals: _visuals, ...rest } = dto;
    void _quiz;
    void _visuals;
    const updated = await this.prisma.lesson.update({
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
        ...(check.quiz ? { miniQuiz: check.quiz as unknown as Prisma.InputJsonValue } : {}),
        ...(check.visuals ? { visuals: check.visuals as unknown as Prisma.InputJsonValue } : {}),
        // An admin's own edit is final: the structured-content backfill never rewrites it.
        contentVersion: CONTENT_VERSION,
      },
    });
    return { ...updated, warnings: check.warnings };
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

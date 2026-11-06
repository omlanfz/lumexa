import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClassroomAdmissionStatus, LessonStatus, Role } from '@prisma/client';
import { CurriculumService } from './curriculum.service';
import { optionId } from './lesson-content';

// The lesson-content features of CurriculumService, against a mocked Prisma:
//   * what a student receives never contains teacher-only material or answers;
//   * the teacher preparation is for the assigned teacher or an admin only;
//   * the quiz check is available only through a student's own unlocked class;
//   * an imported lesson is an independent copy that keeps its traceability.

const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000);

const QUIZ = [
  { id: 'q1', type: 'multiple_choice', prompt: 'Pick', options: ['one', 'two', 'three'], correctIndex: 2, explanation: 'SECRET-EXPLANATION', source: 'markdown' },
  { id: 'q2', type: 'self_check', prompt: 'Explain', sampleAnswer: 'SECRET-SAMPLE', source: 'markdown' },
];

const lessonRow = (over: Record<string, unknown> = {}) => ({
  id: 'lesson-1',
  title: 'Variables',
  type: 'LEARNING',
  order: 2,
  courseId: 'course-1',
  duration: 60,
  objectives: ['Use a variable'],
  contentMarkdown: '## Body\n\n```lumexa-quiz\n```',
  reviewNotes: 'SECRET-REVIEW-NOTE',
  teacherNotes: 'SECRET-TEACHER-NOTE',
  miniQuiz: QUIZ,
  visuals: null,
  homework: null,
  checkpoint: null,
  codeSnippets: null,
  projectLinks: [],
  module: null,
  project: null,
  assessment: null,
  sourceRefs: null,
  moduleId: null,
  ...over,
});

const classRow = (over: Record<string, unknown> = {}) => ({
  id: 'sl-1',
  studentUserId: 'stu-1',
  teacherId: 'teacher-1',
  classType: 'ONE_TO_ONE',
  status: LessonStatus.UPCOMING,
  start: minutesFromNow(-5),
  end: minutesFromNow(55),
  courseId: 'course-1',
  lessonNumber: 2,
  lessonId: 'lesson-1',
  batchId: null,
  batchSessionId: null,
  batchSession: null,
  batch: null,
  studentJoinedAt: new Date(),
  teacher: { userId: 'teacher-user' },
  course: { id: 'course-1', title: 'Course', slug: 'unknown-slug' },
  submission: null,
  lesson: lessonRow(),
  ...over,
});

function build(opts: { sl?: Record<string, unknown> | null; teaches?: boolean; lesson?: Record<string, unknown> | null } = {}) {
  const lesson = opts.lesson === undefined ? lessonRow() : opts.lesson;
  const prisma: any = {
    scheduledLesson: {
      findUnique: jest.fn().mockResolvedValue(opts.sl === undefined ? classRow() : opts.sl),
      findFirst: jest.fn().mockResolvedValue(opts.teaches ? { id: 'sl-x' } : null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    lesson: {
      findUnique: jest.fn().mockResolvedValue(lesson),
      findMany: jest.fn().mockResolvedValue([]),
    },
    classroomAdmission: { findFirst: jest.fn().mockResolvedValue({ status: ClassroomAdmissionStatus.APPROVED }) },
    lessonProgress: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({}) },
    submission: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(null) },
  };
  return { service: new CurriculumService(prisma), prisma };
}

const student = { userId: 'stu-1', role: Role.STUDENT };
const admin = { userId: 'admin-1', role: Role.ADMIN };
const teacher = { userId: 'teacher-user', role: Role.TEACHER };
const inClassroom = { inClassroom: true };

describe('a student’s lesson payload', () => {
  it('contains no teacher notes, review notes, answers or explanations — in class or on the standalone page', async () => {
    const { service } = build({ sl: classRow({ status: LessonStatus.COMPLETED }) });
    for (const res of [await service.getScheduledLessonDetails('sl-1', student), await service.getScheduledLessonDetails('sl-1', student, inClassroom)]) {
      const json = JSON.stringify(res);
      for (const secret of ['SECRET-TEACHER-NOTE', 'SECRET-REVIEW-NOTE', 'SECRET-EXPLANATION', 'SECRET-SAMPLE']) expect(json).not.toContain(secret);
      expect(json).not.toContain('correctIndex');
      expect(json).not.toContain('teacherNotes');
      expect(json).not.toContain('answerKey');
    }
  });

  it('still includes the quiz questions (without answers) so the quiz can be taken', async () => {
    const { service } = build({ sl: classRow({ status: LessonStatus.COMPLETED }) });
    const res: any = await service.getScheduledLessonDetails('sl-1', student);
    expect(res.lesson.quiz.questions).toHaveLength(2);
    expect(res.lesson.quiz.questions[0].options).toHaveLength(3);
  });

  it('is the same for the teacher and the shared classroom view: teacher notes are fetched separately', async () => {
    const { service } = build({ sl: classRow({ status: LessonStatus.COMPLETED }), teaches: true });
    const res = await service.getScheduledLessonDetails('sl-1', teacher, inClassroom);
    expect(JSON.stringify(res)).not.toContain('SECRET-TEACHER-NOTE');
  });
});

describe('teacher preparation', () => {
  it('is refused to students and to teachers who do not teach the curriculum', async () => {
    await expect(build().service.getTeacherPrep('lesson-1', student)).rejects.toThrow(ForbiddenException);
    await expect(build({ teaches: false }).service.getTeacherPrep('lesson-1', teacher)).rejects.toThrow(ForbiddenException);
  });

  it('gives an assigned teacher and an admin the notes, review notes and the whole answer key', async () => {
    for (const who of [teacher, admin]) {
      const prep: any = await build({ teaches: true }).service.getTeacherPrep('lesson-1', who);
      expect(prep.teacherNotes).toBe('SECRET-TEACHER-NOTE');
      expect(prep.reviewNotes).toBe('SECRET-REVIEW-NOTE');
      expect(prep.answerKey).toHaveLength(2);
      expect(JSON.stringify(prep)).toContain('SECRET-EXPLANATION');
    }
  });
});

describe('checking a quiz answer', () => {
  const right = { questionId: 'q1', answer: { optionId: optionId('q1', 2) }, scheduledLessonId: 'sl-1', inClassroom: true };

  it('needs a student’s own unlocked class', async () => {
    const noClass = build();
    await expect(noClass.service.checkQuizAnswer('lesson-1', { questionId: 'q1', answer: { optionId: optionId('q1', 2) } } as never, student)).rejects.toThrow(ForbiddenException);
    const locked = build({ sl: classRow({ start: minutesFromNow(600), end: minutesFromNow(660) }) });
    await expect(locked.service.checkQuizAnswer('lesson-1', right as never, student)).rejects.toThrow(ForbiddenException);
    const someoneElses = build({ sl: classRow({ studentUserId: 'stu-2' }) });
    await expect(someoneElses.service.checkQuizAnswer('lesson-1', right as never, student)).rejects.toThrow(ForbiddenException);
  });

  it('reveals the answer and explanation only in response to an answer, and remembers a student’s result', async () => {
    const { service, prisma } = build();
    const res: any = await service.checkQuizAnswer('lesson-1', right as never, student);
    expect(res).toMatchObject({ graded: true, correct: true, reveal: { optionId: optionId('q1', 2) }, explanation: 'SECRET-EXPLANATION' });
    expect(prisma.lessonProgress.upsert).toHaveBeenCalled();
  });

  it('lets an assigned teacher try every question without storing anything', async () => {
    const { service, prisma } = build({ teaches: true });
    const res: any = await service.checkQuizAnswer('lesson-1', { questionId: 'q1', answer: { optionId: optionId('q1', 0) } } as never, teacher);
    expect(res.correct).toBe(false);
    expect(prisma.lessonProgress.upsert).not.toHaveBeenCalled();
  });

  it('turns a malformed answer into a clear 400, never a crash', async () => {
    const { service } = build();
    await expect(service.checkQuizAnswer('lesson-1', { ...right, answer: { optionId: 'nonsense' } } as never, student)).rejects.toThrow(BadRequestException);
  });

  it('only quizzes learning lessons — never a test', async () => {
    const { service } = build({ lesson: lessonRow({ type: 'COURSE_TEST' }) });
    await expect(service.checkQuizAnswer('lesson-1', right as never, student)).rejects.toThrow(BadRequestException);
  });
});

describe('importing a lesson into a custom curriculum', () => {
  const source = lessonRow({
    id: 'src-1',
    type: 'LEARNING',
    moduleId: 'mod-1',
    module: { slug: 'computer-vision' },
    course: { slug: 'ai-builder-path' },
    visuals: [{ id: 'haar-features', type: 'haar', alt: 'Haar features on a face', caption: 'c', config: { features: ['edge'] } }],
    sourceRefs: { lineageKey: 'computer-vision/3', contentReview: [{ kind: 'quiz-answer-bias', detail: 'x' }] },
    contentVersion: 1,
    duration: 60,
    order: 3,
  });

  function buildImport() {
    const created: any[] = [];
    const prisma: any = {
      course: { findUnique: jest.fn().mockResolvedValue({ id: 'custom-1', isCustom: true }) },
      lesson: {
        findUnique: jest.fn().mockResolvedValue(source),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (fn: any) => fn({ lesson: { create: jest.fn(async ({ data }: any) => (created.push(data), { id: 'new-1', ...data })) } })),
    };
    return { service: new CurriculumService(prisma), created };
  }

  it('copies the quiz, visuals, teacher notes and lineage, and records where it came from', async () => {
    const { service, created } = buildImport();
    await service.importLesson('custom-1', { sourceLessonId: 'src-1', order: 9 } as never);
    const copy = created[0];
    expect(copy.courseId).toBe('custom-1');
    expect(copy.teacherNotes).toBe('SECRET-TEACHER-NOTE');
    expect(copy.miniQuiz).toEqual(QUIZ);
    expect(copy.visuals).toEqual((source as any).visuals);
    expect(copy.contentVersion).toBe(1);
    expect(copy.sourceRefs).toMatchObject({ importedFromLessonId: 'src-1', lineageKey: 'computer-vision/3' });
    expect(copy.sourceRefs.contentReview).toHaveLength(1);
  });

  it('is an independent copy: changing it can never change the original', async () => {
    const { service, created } = buildImport();
    await service.importLesson('custom-1', { sourceLessonId: 'src-1', order: 9 } as never);
    const copy = created[0];
    expect(copy.miniQuiz).not.toBe(source.miniQuiz);
    expect(copy.visuals).not.toBe((source as any).visuals);
    (copy.miniQuiz as any[])[0].prompt = 'EDITED IN THE COPY';
    (copy.visuals as any[])[0].config.features.push('line');
    expect((source.miniQuiz as any[])[0].prompt).toBe('Pick');
    expect(((source as any).visuals as any[])[0].config.features).toEqual(['edge']);
  });

  it('refuses to import into a built-in (non-custom) course', async () => {
    const prisma: any = { course: { findUnique: jest.fn().mockResolvedValue({ id: 'c', isCustom: false }) } };
    await expect(new CurriculumService(prisma).importLesson('c', { sourceLessonId: 's', order: 1 } as never)).rejects.toThrow(ForbiddenException);
  });
});

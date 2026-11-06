import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClassroomAdmissionStatus, LessonStatus, Role } from '@prisma/client';
import { CurriculumService } from './curriculum.service';
import { CONTENT_VERSION, optionId } from './lesson-content';

// The lesson-content features of CurriculumService, against a mocked Prisma:
//   * what a student receives never contains teacher-only material or answers;
//   * the teacher preparation is for the assigned teacher or an admin only;
//   * the quiz check is available only through a student's own unlocked class;
//   * an imported lesson is an independent copy that keeps its traceability.

const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000);

const QUIZ = [
  { id: 'q1', type: 'multiple_choice', prompt: 'Pick', options: ['one', 'two', 'three', 'four'], correctIndex: 2, explanation: 'SECRET-EXPLANATION', source: 'markdown' },
  { id: 'q2', type: 'multiple_choice', prompt: 'Pick again', options: ['red', 'green', 'blue', 'amber'], correctIndex: 0, explanation: 'SECRET-EXPLANATION-2', source: 'markdown' },
];

/** What an older release may have left in a row: shapes the quiz no longer allows. */
const LEGACY_QUIZ = [
  QUIZ[0],
  { id: 'q2', type: 'self_check', prompt: 'Explain', sampleAnswer: 'SECRET-SAMPLE', source: 'markdown' },
  { id: 'q3', type: 'true_false', prompt: 'True?', options: ['True', 'False'], correctIndex: 0, explanation: 'SECRET-TF' },
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
    expect(res.lesson.quiz.gradedCount).toBe(2);
    for (const q of res.lesson.quiz.questions) {
      expect(q.type).toBe('multiple_choice');
      expect(q.options).toHaveLength(4);
    }
  });

  it('never includes a stored question that is not four-option multiple choice', async () => {
    const { service } = build({ sl: classRow({ status: LessonStatus.COMPLETED, lesson: lessonRow({ miniQuiz: LEGACY_QUIZ }) }), lesson: lessonRow({ miniQuiz: LEGACY_QUIZ }) });
    const res: any = await service.getScheduledLessonDetails('sl-1', student);
    expect(res.lesson.quiz.questions.map((q: { id: string }) => q.id)).toEqual(['q1']);
    for (const secret of ['SECRET-SAMPLE', 'SECRET-TF']) expect(JSON.stringify(res)).not.toContain(secret);
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
      expect(prep.answerKey.map((q: { correctIndex: number }) => q.correctIndex)).toEqual([2, 0]);
      expect(JSON.stringify(prep)).toContain('SECRET-EXPLANATION');
    }
  });

  it('keeps only four-option multiple-choice questions in the answer key', async () => {
    const prep: any = await build({ teaches: true, lesson: lessonRow({ miniQuiz: LEGACY_QUIZ }) }).service.getTeacherPrep('lesson-1', teacher);
    expect(prep.answerKey.map((q: { id: string }) => q.id)).toEqual(['q1']);
    expect(JSON.stringify(prep)).not.toContain('SECRET-SAMPLE');
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
    // A typed answer is not an answer to a multiple-choice question.
    await expect(service.checkQuizAnswer('lesson-1', { ...right, answer: { text: 'a typed answer' } } as never, student)).rejects.toThrow(BadRequestException);
    await expect(service.checkQuizAnswer('lesson-1', { ...right, answer: undefined } as never, student)).rejects.toThrow(BadRequestException);
  });

  it('cannot be used to grade a stored question that is no longer a four-option multiple-choice question', async () => {
    const { service } = build({ lesson: lessonRow({ miniQuiz: LEGACY_QUIZ }) });
    await expect(service.checkQuizAnswer('lesson-1', { ...right, questionId: 'q2', answer: { optionId: optionId('q2', 0) } } as never, student)).rejects.toThrow('That question is not in this lesson.');
    await expect(service.checkQuizAnswer('lesson-1', { ...right, questionId: 'q3', answer: { optionId: optionId('q3', 0) } } as never, student)).rejects.toThrow('That question is not in this lesson.');
  });

  it('only quizzes learning lessons — never a test', async () => {
    const { service } = build({ lesson: lessonRow({ type: 'COURSE_TEST' }) });
    await expect(service.checkQuizAnswer('lesson-1', right as never, student)).rejects.toThrow(BadRequestException);
  });
});

describe('a student’s quiz progress', () => {
  const answer = (q: string, optionIndex: number) => ({ questionId: q, answer: { optionId: optionId(q, optionIndex) }, scheduledLessonId: 'sl-1', inClassroom: true });

  it('scores every question, and finishes the quiz only when every question has been answered', async () => {
    const { service, prisma } = build();
    await service.checkQuizAnswer('lesson-1', answer('q1', 2) as never, student); // right
    const first = prisma.lessonProgress.upsert.mock.calls[0][0].update;
    expect(first.quizTotal).toBe(2);
    expect(first.quizCompletedAt).toBeUndefined(); // one of two answered

    prisma.lessonProgress.findUnique.mockResolvedValue({ quizResults: first.quizResults, quizCompletedAt: null });
    await service.checkQuizAnswer('lesson-1', answer('q2', 3) as never, student); // wrong
    const second = prisma.lessonProgress.upsert.mock.calls[1][0].update;
    expect(second).toMatchObject({ quizTotal: 2, quizScore: 1 });
    expect(second.quizCompletedAt).toBeInstanceOf(Date);
  });

  it('reports the whole quiz as scored, and unfinished again if the quiz now has a question the student has not answered', async () => {
    const stored = { sectionsRead: [], activitiesDone: [], lastOpenedAt: null };
    const done = { ...stored, quizCompletedAt: new Date(), quizResults: { q1: { correct: true, attempts: 1 }, q2: { correct: false, attempts: 2 } } };
    const finished = build();
    finished.prisma.lessonProgress.findUnique.mockResolvedValue(done);
    const a: any = await finished.service.getProgress('sl-1', student, true);
    expect(a.progress.quiz).toMatchObject({ total: 2, answered: 2, gradedTotal: 2, score: 1, completed: true });

    // The quiz was converted: its questions have new ids, so the old answers no longer count.
    const converted = build({ lesson: lessonRow({ miniQuiz: [{ ...QUIZ[0], id: 'q1m' }, { ...QUIZ[1], id: 'q2m' }] }), sl: classRow({ lesson: lessonRow() }) });
    converted.prisma.lessonProgress.findUnique.mockResolvedValue(done);
    const b: any = await converted.service.getProgress('sl-1', student, true);
    expect(b.progress.quiz).toMatchObject({ total: 2, answered: 0, score: 0, completed: false });
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
    contentVersion: CONTENT_VERSION,
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
    expect(copy.contentVersion).toBe(CONTENT_VERSION);
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
    expect((copy.miniQuiz as any[])[0].options).toHaveLength(4);
    expect(((source as any).visuals as any[])[0].config.features).toEqual(['edge']);
  });

  it('refuses to import into a built-in (non-custom) course', async () => {
    const prisma: any = { course: { findUnique: jest.fn().mockResolvedValue({ id: 'c', isCustom: false }) } };
    await expect(new CurriculumService(prisma).importLesson('c', { sourceLessonId: 's', order: 1 } as never)).rejects.toThrow(ForbiddenException);
  });
});

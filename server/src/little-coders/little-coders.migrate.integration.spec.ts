// The Little Coders redesign against a REAL Postgres: what happens to the program that exists today —
// three courses, 28 classes, students halfway through, a custom curriculum that borrows one of its
// tests — when it becomes five courses and 46 classes. Nothing a student produced may be lost, a
// second run may change nothing, an admin's edits are kept, and no other program is touched.
//
// Skipped unless ASSESSMENT_INTEGRATION_DATABASE_URL points at a throwaway, fully migrated database
// — see ../assessments/testing/integration-db.ts.

import 'reflect-metadata';
import {
  IT_DB_URL,
  acquireDatabaseLock,
  truncateAssessmentData,
  useIntegrationDatabase,
} from '../assessments/testing/integration-db';

useIntegrationDatabase();

import { AssessmentFormat, ClassType, LessonStatus, Role, SessionType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { makeUser, Person } from '../batches/testing/batch-world';
import { syncLittleCodersBanks } from './assessments/lc-bank.sync';
import { LC_BANK_VERSION, DEPRECATED_PROGRAM_DESCRIPTIONS, LC_PROGRAM_DESCRIPTION, LC_SESSIONS_TOTAL } from './lc.constants';
import { ensureLittleCodersCurriculum } from './migrate/little-coders.migrate';
import { readLcRefs } from './lc.refs';

const describeDb = IT_DB_URL ? describe : describe.skip;
const quiet = { log: () => undefined, warn: () => undefined };

describeDb('Little Coders migration (real Postgres)', () => {
  jest.setTimeout(240_000);

  let prisma: PrismaService;
  let release: () => void;
  let teacher: Person;
  let student1: Person;
  let student2: Person;
  let student3: Person;

  beforeAll(async () => {
    release = await acquireDatabaseLock(IT_DB_URL as string);
    prisma = new PrismaService();
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    release?.();
  });
  beforeEach(async () => {
    await truncateAssessmentData(prisma);
    await prisma.codingPlatform.deleteMany();
    teacher = await makeUser(prisma, 'ms-karim', Role.TEACHER);
    student1 = await makeUser(prisma, 'mira', Role.STUDENT, { assignedTeacherId: teacher.profileId });
    student2 = await makeUser(prisma, 'omar', Role.STUDENT, { assignedTeacherId: teacher.profileId });
    student3 = await makeUser(prisma, 'zoya', Role.STUDENT, { assignedTeacherId: teacher.profileId });
  });

  // ── The OLD program, as production has it ─────────────────────────────────

  /** 28 classes: three courses of 8 lessons each followed by a course test, then the Final Test. */
  async function seedOldProgram() {
    const course = await prisma.course.create({
      data: {
        slug: 'little-coders',
        title: 'Little Coders',
        category: 'Little Coders',
        level: 'BEGINNER',
        sessions: 28,
        priceCents: 500_000,
        description: DEPRECATED_PROGRAM_DESCRIPTIONS[0],
      },
    });
    const modules = {
      m1: await prisma.courseModule.create({ data: { courseId: course.id, slug: 'scratch-adventures', title: 'Scratch Adventures', order: 1 } }),
      m2: await prisma.courseModule.create({ data: { courseId: course.id, slug: 'python-for-young-builders', title: 'Python for Young Builders', order: 2 } }),
      m3: await prisma.courseModule.create({ data: { courseId: course.id, slug: 'ai-for-kids', title: 'AI for Kids', order: 3 } }),
    };
    for (const m of Object.values(modules)) {
      for (let i = 1; i <= 3; i++) {
        await prisma.project.create({ data: { moduleId: m.id, slug: `old-project-${i}`, title: `Old project ${i}`, order: i } });
      }
    }
    const lessons: Record<number, { id: string }> = {};
    for (let order = 1; order <= 28; order++) {
      const moduleId = order <= 9 ? modules.m1.id : order <= 18 ? modules.m2.id : order <= 27 ? modules.m3.id : null;
      const type = order === 28 ? SessionType.FINAL_TEST : [9, 18, 27].includes(order) ? SessionType.COURSE_TEST : SessionType.LEARNING;
      lessons[order] = await prisma.lesson.create({
        data: {
          courseId: course.id,
          order,
          type,
          moduleId,
          title: type === SessionType.LEARNING ? `Old lesson ${order}` : type === SessionType.FINAL_TEST ? 'Little Coders — Final Test' : `Old course test ${order}`,
          contentMarkdown: type === SessionType.LEARNING ? `Old content ${order}` : null,
          homework: type === SessionType.LEARNING ? `Old homework ${order}` : null,
          contentVersion: 2,
        },
      });
    }
    // The old tests, each with a question students have answered or not.
    const tests: Record<number, { id: string; answered: string; fresh: string }> = {};
    for (const order of [9, 18, 27, 28]) {
      const a = await prisma.assessment.create({
        data: {
          lessonId: lessons[order].id,
          type: order === 28 ? SessionType.FINAL_TEST : SessionType.COURSE_TEST,
          title: `Old test ${order}`,
          passScorePct: 70,
          isPublished: true,
          bankVersion: 3,
        },
      });
      const answered = await prisma.mCQQuestion.create({
        data: { assessmentId: a.id, questionType: 'MCQ', questionText: `Old answered question ${order}`, options: ['a', 'b', 'c', 'd'], correctIndex: 0, order: 0, bankKey: `old/${order}#1` },
      });
      const fresh = await prisma.mCQQuestion.create({
        data: { assessmentId: a.id, questionType: 'MCQ', questionText: `Old unanswered question ${order}`, options: ['a', 'b', 'c', 'd'], correctIndex: 1, order: 1, bankKey: `old/${order}#2` },
      });
      tests[order] = { id: a.id, answered: answered.id, fresh: fresh.id };
    }
    return { course, modules, lessons, tests };
  }

  const makeClass = (who: Person, courseId: string, lessonNumber: number, lessonId: string | null, status: LessonStatus, day: number) =>
    prisma.scheduledLesson.create({
      data: {
        studentUserId: who.id,
        teacherId: teacher.profileId!,
        courseId,
        lessonNumber,
        lessonId,
        start: new Date(Date.UTC(2026, 9, day, 10)),
        end: new Date(Date.UTC(2026, 9, day, 11)),
        classType: ClassType.ONE_TO_ONE,
        status,
      },
    });

  async function seedStudents(old: Awaited<ReturnType<typeof seedOldProgram>>) {
    // Mira is on class 11: ten classes done (incl. the first course test, answered), the next upcoming.
    const mira = [];
    for (let n = 1; n <= 10; n++) mira.push(await makeClass(student1, old.course.id, n, old.lessons[n].id, LessonStatus.COMPLETED, n));
    mira.push(await makeClass(student1, old.course.id, 11, old.lessons[11].id, LessonStatus.UPCOMING, 20));
    const attempt = await prisma.assessmentAttempt.create({
      data: { assessmentId: old.tests[9].id, studentUserId: student1.id, scheduledLessonId: mira[8].id, status: 'GRADED', mcqQuestionIds: [old.tests[9].answered], totalScore: 80, totalMaxScore: 100, passed: true },
    });
    await prisma.mCQAnswer.create({ data: { attemptId: attempt.id, questionId: old.tests[9].answered, selectedIndex: 0, isCorrect: true, optionOrder: [0, 1, 2, 3] } });
    // Omar has finished 27 classes; his Final Test (class 28) is booked but not taken — the old numbering.
    for (let n = 1; n <= 27; n++) await makeClass(student2, old.course.id, n, old.lessons[n].id, LessonStatus.COMPLETED, 1);
    const omarFinal = await makeClass(student2, old.course.id, 28, old.lessons[28].id, LessonStatus.UPCOMING, 25);
    // Zoya finished the whole old program, Final Test included.
    for (let n = 1; n <= 28; n++) await makeClass(student3, old.course.id, n, old.lessons[n].id, LessonStatus.COMPLETED, 1);
    return { mira, omarFinal };
  }

  /** A custom curriculum that imported the old first course test: its test READS the original's questions. */
  async function seedCustomCurriculum(old: Awaited<ReturnType<typeof seedOldProgram>>) {
    const custom = await prisma.course.create({ data: { slug: 'my-custom-course', title: 'My custom course', category: 'Custom', level: 'STARTER', isCustom: true } });
    const lesson = await prisma.lesson.create({ data: { courseId: custom.id, order: 1, title: 'Imported test', type: SessionType.COURSE_TEST } });
    const linked = await prisma.assessment.create({
      data: { lessonId: lesson.id, type: SessionType.COURSE_TEST, title: 'Old test 9', passScorePct: 70, isPublished: true, sourceAssessmentId: old.tests[9].id },
    });
    return { custom, lesson, linked };
  }

  /** A second program with a little history, to prove it is left alone. */
  async function seedOtherProgram() {
    const course = await prisma.course.create({ data: { slug: 'game-creator', title: 'Game Creator', category: 'Game Creator', level: 'BEGINNER', sessions: 3, description: 'Other program' } });
    const module = await prisma.courseModule.create({ data: { courseId: course.id, slug: 'game-basics', title: 'Game basics', order: 1 } });
    for (let order = 1; order <= 3; order++) {
      await prisma.lesson.create({ data: { courseId: course.id, moduleId: module.id, order, title: `Game lesson ${order}`, contentMarkdown: `Game content ${order}`, contentVersion: 2 } });
    }
    return course;
  }

  const snapshot = async (courseId: string) =>
    JSON.stringify({
      course: await prisma.course.findUnique({ where: { id: courseId } }),
      modules: await prisma.courseModule.findMany({ where: { courseId }, orderBy: { slug: 'asc' } }),
      lessons: await prisma.lesson.findMany({ where: { courseId }, orderBy: { order: 'asc' } }),
    });

  // ═══════════════════════════════════════════════════════════════════════════

  it('turns the three-course program into five courses and 46 classes without losing a student’s record', async () => {
    const old = await seedOldProgram();
    const { mira, omarFinal } = await seedStudents(old);
    const { linked } = await seedCustomCurriculum(old);
    const other = await seedOtherProgram();
    const otherBefore = await snapshot(other.id);
    const oldLessonIds = new Set(Object.values(old.lessons).map((l) => l.id));
    const reconcile = jest.fn().mockResolvedValue({ regenerated: 0 });

    const report = await ensureLittleCodersCurriculum(prisma, quiet, reconcile);

    expect(report.mode).toBe('migrated');
    expect(report.linkedAssessmentsDetached).toBe(1);

    // 46 sessions: 40 lessons + 5 course assessments + the final.
    const lessons = await prisma.lesson.findMany({ where: { courseId: old.course.id }, orderBy: { order: 'asc' }, include: { module: true } });
    expect(lessons).toHaveLength(LC_SESSIONS_TOTAL);
    expect(lessons.map((l) => l.order)).toEqual(Array.from({ length: 46 }, (_, i) => i + 1));
    const types = lessons.map((l) => l.type);
    expect(types.filter((t) => t === 'LEARNING')).toHaveLength(40);
    expect(types.filter((t) => t === 'COURSE_TEST')).toHaveLength(5);
    expect(types.filter((t) => t === 'FINAL_TEST')).toHaveLength(1);
    expect([9, 18, 27, 36, 45].every((o) => lessons[o - 1].type === 'COURSE_TEST')).toBe(true);
    expect(lessons[45].type).toBe('FINAL_TEST');

    // Every old lesson row survives under its own id — the ids students' records point at.
    const nowIds = new Set(lessons.map((l) => l.id));
    for (const id of oldLessonIds) expect(nowIds.has(id)).toBe(true);
    for (const order of [1, 8, 10, 17, 19, 26]) expect(lessons[order - 1].id).toBe(old.lessons[order].id);
    // The old Final Test moved to the end, keeping its row and its assessment.
    expect(lessons[45].id).toBe(old.lessons[28].id);
    expect((await prisma.assessment.findUnique({ where: { lessonId: old.lessons[28].id } }))?.id).toBe(old.tests[28].id);

    // Five courses (modules), the second renamed from "Python for Young Builders".
    const modules = await prisma.courseModule.findMany({ where: { courseId: old.course.id }, orderBy: { order: 'asc' } });
    expect(modules.map((m) => [m.order, m.slug, m.title])).toEqual([
      [1, 'scratch-adventures', 'Scratch Adventures'],
      [2, 'scratch-game-studio', 'Scratch Game Studio'],
      [3, 'ai-for-kids', 'AI for Kids: Smart Projects'],
      [4, 'python-explorers', 'Python Explorers'],
      [5, 'python-creative-lab', 'Python Creative Lab'],
    ]);
    expect(JSON.stringify(modules)).not.toMatch(/Python for Young Builders/);
    // The module row of old course 2 is the same row, renamed (so its lessons never moved).
    expect(modules[1].id).toBe(old.modules.m2.id);

    // Eight redesigned lessons per course, each with its own project and the interactive page.
    const learning = lessons.filter((l) => l.type === 'LEARNING');
    expect(learning.every((l) => l.experience !== null && l.previewVideo !== null && l.projectCard !== null && l.homeworkCard !== null)).toBe(true);
    expect(learning.every((l) => l.projectId !== null)).toBe(true);
    expect(await prisma.project.count({ where: { module: { courseId: old.course.id } } })).toBe(40);
    for (const m of modules) expect(learning.filter((l) => l.moduleId === m.id)).toHaveLength(8);

    // Links start empty: nothing is pre-populated for an admin to correct.
    for (const l of learning) {
      expect(l.projectCard).toMatchObject({ projectUrl: '', copyUrl: '' });
      expect(l.previewVideo).toMatchObject({ videoUrl: '', posterUrl: '', captionsUrl: '' });
    }

    // The old content is kept for reference and rollback.
    const refs = lessons[0].sourceRefs as { legacyLittleCodersV1?: { contentMarkdown?: string; title?: string } };
    expect(refs.legacyLittleCodersV1).toMatchObject({ title: 'Old lesson 1', contentMarkdown: 'Old content 1' });
    expect(readLcRefs(lessons[0].sourceRefs)?.key).toBe('c1l1');

    // Students: not one class record changed, except the old Final Test moved to class 46 with its row.
    for (const sl of mira.slice(0, 10)) {
      const now = await prisma.scheduledLesson.findUniqueOrThrow({ where: { id: sl.id } });
      expect(now).toMatchObject({ status: 'COMPLETED', lessonNumber: sl.lessonNumber, lessonId: sl.lessonId });
    }
    expect(await prisma.scheduledLesson.count({ where: { studentUserId: student1.id } })).toBe(11);
    expect(await prisma.scheduledLesson.count({ where: { studentUserId: student2.id } })).toBe(28);
    expect(await prisma.scheduledLesson.count({ where: { studentUserId: student3.id } })).toBe(28);
    const omarNow = await prisma.scheduledLesson.findUniqueOrThrow({ where: { id: omarFinal.id } });
    expect(omarNow).toMatchObject({ lessonNumber: 46, lessonId: old.lessons[28].id, status: 'UPCOMING' });
    const zoyaFinal = await prisma.scheduledLesson.findFirstOrThrow({ where: { studentUserId: student3.id, lessonId: old.lessons[28].id } });
    expect(zoyaFinal).toMatchObject({ lessonNumber: 46, status: 'COMPLETED' });
    // Graduates stay graduates: Zoya's 28th class is her Final Test, now class 46.
    expect(await prisma.scheduledLesson.count({ where: { studentUserId: student3.id, status: 'COMPLETED' } })).toBe(28);

    // Assessment history is intact: the attempt, its answer and the answered question.
    expect(await prisma.assessmentAttempt.count({ where: { studentUserId: student1.id } })).toBe(1);
    expect(await prisma.mCQAnswer.count({ where: { questionId: old.tests[9].answered } })).toBe(1);

    // The six assessments exist in the new format; the retired tests became them.
    const assessments = await prisma.assessment.findMany({ where: { lesson: { courseId: old.course.id } }, include: { lesson: true }, orderBy: { lesson: { order: 'asc' } } });
    expect(assessments.map((a) => a.lesson.order)).toEqual([9, 18, 27, 36, 45, 46]);
    expect(assessments.every((a) => a.format === AssessmentFormat.LITTLE_CODERS_V2)).toBe(true);
    expect(assessments[5].activeVariant).toBe('SCRATCH_AI');
    expect(assessments[0].id).toBe(old.tests[9].id);

    // The custom curriculum that borrowed the old first test keeps exactly what it had.
    const detached = await prisma.assessment.findUniqueOrThrow({ where: { id: linked.id } });
    expect(detached.sourceAssessmentId).toBeNull();
    expect(detached.format).toBe(AssessmentFormat.STANDARD);
    expect(await prisma.mCQQuestion.count({ where: { assessmentId: linked.id, isPublished: true } })).toBe(2);

    // The course row.
    const row = await prisma.course.findUniqueOrThrow({ where: { id: old.course.id } });
    expect(row.sessions).toBe(46);
    expect(row.description).toBe(LC_PROGRAM_DESCRIPTION);
    expect(row.priceCents).toBe(500_000); // pricing is never touched

    // Platforms for "Start Coding" are seeded.
    expect((await prisma.codingPlatform.findMany({ orderBy: { sortOrder: 'asc' } })).map((p) => p.key)).toEqual(['SCRATCH', 'STRETCH3', 'TEACHABLE_MACHINE', 'EDUBLOCKS']);

    // The upcoming schedule is regenerated once, by the caller.
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith(old.course.id, expect.any(String));

    // Another program: not one byte changed.
    expect(await snapshot(other.id)).toBe(otherBefore);
  });

  it('is idempotent: a second run changes nothing and does not reschedule', async () => {
    const old = await seedOldProgram();
    await seedStudents(old);
    const reconcile = jest.fn().mockResolvedValue({});
    await ensureLittleCodersCurriculum(prisma, quiet, reconcile);
    const first = await snapshot(old.course.id);
    const classes = await prisma.scheduledLesson.findMany({ orderBy: { id: 'asc' } });

    const again = await ensureLittleCodersCurriculum(prisma, quiet, reconcile);

    expect(again.mode).toBe('current');
    expect(again).toMatchObject({ lessonsCreated: 0, lessonsUpdated: 0, assessmentsCreated: 0, movedClassRows: 0 });
    expect(await snapshot(old.course.id)).toBe(first);
    expect(await prisma.scheduledLesson.findMany({ orderBy: { id: 'asc' } })).toEqual(classes);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it('builds the whole program on a fresh database', async () => {
    const course = await prisma.course.create({ data: { slug: 'little-coders', title: 'Little Coders', category: 'Little Coders', level: 'BEGINNER', sessions: 28, description: DEPRECATED_PROGRAM_DESCRIPTIONS[0] } });
    const report = await ensureLittleCodersCurriculum(prisma, quiet);
    expect(report.mode).toBe('fresh');
    expect(await prisma.lesson.count({ where: { courseId: course.id } })).toBe(46);
    expect(await prisma.assessment.count({ where: { lesson: { courseId: course.id } } })).toBe(6);
    expect(await prisma.courseModule.count({ where: { courseId: course.id } })).toBe(5);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).sessions).toBe(46);
  });

  it('does nothing when there is no Little Coders course', async () => {
    expect((await ensureLittleCodersCurriculum(prisma, quiet)).mode).toBe('none');
  });

  it('leaves a shape it does not recognise exactly as it is', async () => {
    const course = await prisma.course.create({ data: { slug: 'little-coders', title: 'Little Coders', category: 'Little Coders', level: 'BEGINNER', sessions: 3 } });
    for (let order = 1; order <= 3; order++) await prisma.lesson.create({ data: { courseId: course.id, order, title: `Custom ${order}` } });
    const before = await snapshot(course.id);
    const report = await ensureLittleCodersCurriculum(prisma, quiet);
    expect(report.mode).toBe('skipped');
    expect(await snapshot(course.id)).toBe(before);
  });

  it('keeps what an admin edited and the addresses an admin filled in when the curriculum is refreshed', async () => {
    const old = await seedOldProgram();
    await ensureLittleCodersCurriculum(prisma, quiet);
    const lesson1 = await prisma.lesson.findFirstOrThrow({ where: { courseId: old.course.id, order: 1 } });
    const card = lesson1.projectCard as Record<string, unknown>;
    const video = lesson1.previewVideo as Record<string, unknown>;
    await prisma.lesson.update({
      where: { id: lesson1.id },
      data: {
        title: 'Welcome to Scratch (my own title)',
        projectCard: { ...card, projectUrl: 'https://scratch.mit.edu/projects/123456/', copyUrl: 'https://scratch.mit.edu/projects/123456/editor/' },
        previewVideo: { ...video, videoUrl: 'https://cdn.example.org/lc/c1l1.mp4', durationSeconds: 91 },
        // The admin editor records which fields it changed; a bumped curriculum version is simulated by version 0.
        sourceRefs: { lcV2: { key: 'c1l1', version: 0, edited: ['title'] } },
      },
    });

    const report = await ensureLittleCodersCurriculum(prisma, quiet);

    expect(report.mode).toBe('refreshed');
    const after = await prisma.lesson.findUniqueOrThrow({ where: { id: lesson1.id } });
    expect(after.title).toBe('Welcome to Scratch (my own title)'); // edited → never overwritten
    expect(after.projectCard).toMatchObject({ projectUrl: 'https://scratch.mit.edu/projects/123456/', copyUrl: 'https://scratch.mit.edu/projects/123456/editor/' });
    expect(after.previewVideo).toMatchObject({ videoUrl: 'https://cdn.example.org/lc/c1l1.mp4', durationSeconds: 91 });
    expect(readLcRefs(after.sourceRefs)).toMatchObject({ key: 'c1l1', version: 1, edited: ['title'] });
    // An untouched lesson was refreshed in place under the same id.
    expect(report.lessonsUpdated).toBeGreaterThan(0);
  });

  it('retires the old questions by the bank sync: answered ones are kept (unpublished), unanswered ones removed', async () => {
    const old = await seedOldProgram();
    await seedStudents(old);
    const { linked } = await seedCustomCurriculum(old);
    await ensureLittleCodersCurriculum(prisma, quiet);

    const report = await syncLittleCodersBanks(prisma, quiet);

    expect(report.invalidBanks).toEqual([]);
    expect(report.synced).toBe(6);
    const owners = await prisma.assessment.findMany({ where: { format: AssessmentFormat.LITTLE_CODERS_V2, lesson: { courseId: old.course.id } } });
    expect(owners).toHaveLength(6);
    for (const a of owners) {
      expect(a.bankVersion).toBe(LC_BANK_VERSION);
      expect(await prisma.mCQQuestion.count({ where: { assessmentId: a.id, isPublished: true, questionType: 'MCQ' } })).toBe(10);
      expect(await prisma.mCQQuestion.count({ where: { assessmentId: a.id, isPublished: true, questionType: 'TRUE_FALSE' } })).toBe(5);
      expect(await prisma.practicalQuestion.count({ where: { assessmentId: a.id, isPublished: true } })).toBe(a.type === 'FINAL_TEST' ? 2 : 1);
      expect(a.instructions).toMatch(/40 minutes/i);
    }
    // History: the answered question of the first course test is still there, but no longer given.
    const answered = await prisma.mCQQuestion.findUniqueOrThrow({ where: { id: old.tests[9].answered } });
    expect(answered.isPublished).toBe(false);
    expect(await prisma.mCQAnswer.count({ where: { questionId: old.tests[9].answered } })).toBe(1);
    // A question nobody answered is simply gone.
    expect(await prisma.mCQQuestion.findUnique({ where: { id: old.tests[9].fresh } })).toBeNull();
    // The borrower is untouched by the new banks.
    expect(await prisma.mCQQuestion.count({ where: { assessmentId: linked.id, isPublished: true } })).toBe(2);

    // And a second sync is a no-op.
    const second = await syncLittleCodersBanks(prisma, quiet);
    expect(second.synced).toBe(0);
    expect(second.upToDate).toBe(6);
  });
});

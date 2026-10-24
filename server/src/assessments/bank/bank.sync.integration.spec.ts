// The question-bank sync against a REAL Postgres: idempotency, non-destructive
// upgrades, admin edits, invalid banks, linked banks for custom curricula and
// two instances booting at once. Skipped unless
// ASSESSMENT_INTEGRATION_DATABASE_URL points at a throwaway, fully migrated
// database — see ../testing/integration-db.ts.

import 'reflect-metadata';
import {
  IT_DB_URL,
  acquireDatabaseLock,
  truncateAssessmentData,
  useIntegrationDatabase,
} from '../testing/integration-db';

useIntegrationDatabase();

import { Logger } from '@nestjs/common';
import { PrismaClient, SessionType } from '@prisma/client';
import { standardInstructions } from './bank.constants';
import { BankRegistry } from './bank.registry';
import { syncAssessmentBanks } from './bank.sync';
import { BankTestType, TestBank } from './bank.types';
import { syntheticBank } from './testing/synthetic-bank';
import { PrismaService } from '../../prisma.service';

const describeDb = IT_DB_URL ? describe : describe.skip;

const SLUG = 'sync-it-course';
const MODULE = 'sync-it-module';

const quiet = { log: () => undefined, warn: () => undefined };

function registryFor(
  over: { course?: TestBank; final?: TestBank; stage?: TestBank } = {},
): BankRegistry {
  return {
    courseSlugs: [SLUG],
    courseTests: {
      [MODULE]:
        over.course ?? syntheticBank('course-test/sync-it', 'COURSE_TEST'),
    },
    finalTests: {
      [SLUG]: over.final ?? syntheticBank('final-test/sync-it', 'FINAL_TEST'),
    },
    stageTests: {
      1: over.stage ?? syntheticBank('stage-test/sync-it-1', 'STAGE_TEST'),
    },
  };
}

describeDb('Question-bank sync (real Postgres)', () => {
  let prisma: PrismaService;
  let courseId: string;
  let courseTest: { lessonId: string; assessmentId: string };
  let finalTest: { lessonId: string; assessmentId: string };
  let stageTest: { lessonId: string; assessmentId: string };

  async function lessonWithAssessment(
    type: SessionType,
    order: number,
    title: string,
    moduleId: string | null,
  ) {
    const lesson = await prisma.lesson.create({
      data: { courseId, title, order, type, moduleId },
    });
    const assessment = await prisma.assessment.create({
      data: {
        lessonId: lesson.id,
        type,
        title,
        instructions: 'old text',
        mcqCount: 12,
        isPublished: true,
      },
    });
    return { lessonId: lesson.id, assessmentId: assessment.id };
  }

  async function build() {
    await truncateAssessmentData(prisma);
    const course = await prisma.course.create({
      data: {
        slug: SLUG,
        title: 'Sync IT Course',
        category: 'Python',
        level: 'STARTER',
      },
    });
    courseId = course.id;
    const mod = await prisma.courseModule.create({
      data: { courseId, slug: MODULE, title: 'Sync Module', order: 1 },
    });
    courseTest = await lessonWithAssessment(
      SessionType.COURSE_TEST,
      9,
      'Sync Module — Course Test',
      mod.id,
    );
    stageTest = await lessonWithAssessment(
      SessionType.STAGE_TEST,
      10,
      'Stage 1 Test',
      null,
    );
    finalTest = await lessonWithAssessment(
      SessionType.FINAL_TEST,
      11,
      'Sync IT Course — Final Test',
      null,
    );
  }

  const questions = (assessmentId: string, where: object = {}) =>
    prisma.mCQQuestion.findMany({
      where: { assessmentId, ...where },
      orderBy: { order: 'asc' },
    });

  let releaseLock: () => void;
  beforeAll(async () => {
    releaseLock = await acquireDatabaseLock(IT_DB_URL as string);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    prisma = new PrismaService();
    await prisma.$connect();
  }, 200_000);
  afterAll(async () => {
    await prisma?.$disconnect();
    releaseLock?.();
  });
  beforeEach(build);

  it('fills every test with exactly the standard questions', async () => {
    const report = await syncAssessmentBanks(
      prisma as unknown as PrismaClient,
      quiet,
      registryFor(),
      1,
    );
    expect(report).toMatchObject({
      assessmentsSynced: 3,
      assessmentsUpToDate: 0,
      invalidBanks: [],
      questionsCreated: 40 + 40 + 30 + 1, // …+ the Final Test's coding project
    });

    for (const [t, mcq, tf] of [
      [courseTest, 30, 10],
      [stageTest, 30, 10],
      [finalTest, 25, 5],
    ] as const) {
      const rows = await questions(t.assessmentId);
      expect(rows.filter((q) => q.questionType === 'MCQ')).toHaveLength(mcq);
      expect(rows.filter((q) => q.questionType === 'TRUE_FALSE')).toHaveLength(
        tf,
      );
      expect(rows.every((q) => q.isPublished && q.bankKey)).toBe(true);
      // Four distinct options with the right answer stored at correctIndex.
      for (const q of rows) {
        const opts = q.options as string[];
        expect(opts).toHaveLength(q.questionType === 'MCQ' ? 4 : 2);
        expect(new Set(opts).size).toBe(opts.length);
        expect(q.correctIndex).toBeLessThan(opts.length);
      }
    }
  });

  it('gives the Final Test its single coding project and the standard instructions', async () => {
    await syncAssessmentBanks(
      prisma as unknown as PrismaClient,
      quiet,
      registryFor(),
      1,
    );
    const projects = await prisma.practicalQuestion.findMany({
      where: { assessmentId: finalTest.assessmentId },
    });
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ maxScore: 20, isPublished: true });
    expect(
      (projects[0].rubric as { maxPoints: number }[]).reduce(
        (s, r) => s + r.maxPoints,
        0,
      ),
    ).toBe(20);

    const noProject = await prisma.practicalQuestion.count({
      where: { assessmentId: courseTest.assessmentId },
    });
    expect(noProject).toBe(0);

    const asm = await prisma.assessment.findUniqueOrThrow({
      where: { id: courseTest.assessmentId },
    });
    expect(asm.instructions).toBe(
      standardInstructions('COURSE_TEST' as BankTestType),
    );
    expect(asm.mcqCount).toBe(0);
    expect(asm.bankVersion).toBe(1);
  });

  it('is idempotent: running it again changes nothing', async () => {
    const reg = registryFor();
    await syncAssessmentBanks(prisma as unknown as PrismaClient, quiet, reg, 1);
    const before = await questions(courseTest.assessmentId);
    const second = await syncAssessmentBanks(
      prisma as unknown as PrismaClient,
      quiet,
      reg,
      1,
    );
    expect(second).toMatchObject({
      assessmentsSynced: 0,
      assessmentsUpToDate: 3,
      questionsCreated: 0,
    });
    const after = await questions(courseTest.assessmentId);
    expect(after.map((q) => q.id)).toEqual(before.map((q) => q.id));
    expect(after).toHaveLength(40);
  });

  it('a newer bank version updates in place without duplicating or losing questions', async () => {
    const reg = registryFor();
    await syncAssessmentBanks(prisma as unknown as PrismaClient, quiet, reg, 1);
    const before = await questions(courseTest.assessmentId);

    const changed = syntheticBank('course-test/sync-it', 'COURSE_TEST');
    changed.mcq[0].text = 'A rewritten first question about the same idea?';
    const report = await syncAssessmentBanks(
      prisma as unknown as PrismaClient,
      quiet,
      registryFor({ course: changed }),
      2,
    );
    expect(report.questionsCreated).toBe(0);
    expect(report.questionsUpdated).toBeGreaterThan(0);

    const after = await questions(courseTest.assessmentId);
    expect(after).toHaveLength(40);
    expect(after.map((q) => q.id).sort()).toEqual(
      before.map((q) => q.id).sort(),
    );
    expect(after.find((q) => q.bankKey?.endsWith('#M01'))!.questionText).toBe(
      'A rewritten first question about the same idea?',
    );
  });

  it('never overwrites a question an admin edited', async () => {
    const reg = registryFor();
    await syncAssessmentBanks(prisma as unknown as PrismaClient, quiet, reg, 1);
    const [first] = await questions(courseTest.assessmentId);
    await prisma.mCQQuestion.update({
      where: { id: first.id },
      data: { questionText: 'The admin’s own wording.', editedByAdmin: true },
    });
    await syncAssessmentBanks(prisma as unknown as PrismaClient, quiet, reg, 2);
    const kept = await prisma.mCQQuestion.findUniqueOrThrow({
      where: { id: first.id },
    });
    expect(kept.questionText).toBe('The admin’s own wording.');
    expect(kept.isPublished).toBe(true);
  });

  it('removes unanswered legacy questions, keeps answered ones as history, and leaves admin-authored ones alone', async () => {
    const legacyUnanswered = await prisma.mCQQuestion.create({
      data: {
        assessmentId: courseTest.assessmentId,
        questionText: 'Old unanswered question that should disappear?',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 0,
      },
    });
    const legacyAnswered = await prisma.mCQQuestion.create({
      data: {
        assessmentId: courseTest.assessmentId,
        questionText: 'Old question a student already answered?',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 0,
      },
    });
    const adminOwn = await prisma.mCQQuestion.create({
      data: {
        assessmentId: courseTest.assessmentId,
        questionText: 'A question the admin wrote by hand for this class?',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 2,
        editedByAdmin: true,
      },
    });
    const student = await prisma.user.create({
      data: {
        email: 'sync-student@example.com',
        password: 'x',
        fullName: 'Sync Student',
        role: 'STUDENT',
      },
    });
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: courseTest.assessmentId,
        studentUserId: student.id,
        status: 'SUBMITTED',
      },
    });
    await prisma.mCQAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: legacyAnswered.id,
        selectedIndex: 0,
        isCorrect: true,
        optionOrder: [0, 1, 2, 3],
      },
    });

    const report = await syncAssessmentBanks(
      prisma as unknown as PrismaClient,
      quiet,
      registryFor(),
      1,
    );
    expect(report.questionsDeleted).toBe(1);
    expect(report.questionsRetired).toBe(1);

    expect(
      await prisma.mCQQuestion.findUnique({
        where: { id: legacyUnanswered.id },
      }),
    ).toBeNull();
    const answered = await prisma.mCQQuestion.findUniqueOrThrow({
      where: { id: legacyAnswered.id },
    });
    expect(answered.isPublished).toBe(false); // history kept, no longer served
    const own = await prisma.mCQQuestion.findUniqueOrThrow({
      where: { id: adminOwn.id },
    });
    expect(own.isPublished).toBe(true);

    // The student's old answer still points at a real question.
    expect(
      await prisma.mCQAnswer.count({ where: { attemptId: attempt.id } }),
    ).toBe(1);
  });

  it('never writes a bank that fails the standard — existing questions stay', async () => {
    await syncAssessmentBanks(
      prisma as unknown as PrismaClient,
      quiet,
      registryFor(),
      1,
    );
    const before = await questions(courseTest.assessmentId);

    const broken = syntheticBank('course-test/sync-it', 'COURSE_TEST');
    broken.mcq.pop(); // 29 MCQs: below the standard
    const warn = jest.fn();
    const report = await syncAssessmentBanks(
      prisma as unknown as PrismaClient,
      { log: () => undefined, warn },
      registryFor({ course: broken }),
      2,
    );
    expect(report.invalidBanks).toContain('course-test/sync-it');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('fails the test standard'),
    );
    const after = await questions(courseTest.assessmentId);
    expect(after.map((q) => [q.id, q.questionText])).toEqual(
      before.map((q) => [q.id, q.questionText]),
    );
    const asm = await prisma.assessment.findUniqueOrThrow({
      where: { id: courseTest.assessmentId },
    });
    expect(asm.bankVersion).toBe(1); // not advanced
  });

  it('only touches the default catalog courses it was told about', async () => {
    const other = await prisma.course.create({
      data: {
        slug: 'someone-elses-course',
        title: 'Reuses a module slug',
        category: 'Python',
        level: 'STARTER',
      },
    });
    const mod = await prisma.courseModule.create({
      data: { courseId: other.id, slug: MODULE, title: 'Same slug', order: 1 },
    });
    const lesson = await prisma.lesson.create({
      data: {
        courseId: other.id,
        title: 'Their test',
        order: 9,
        type: SessionType.COURSE_TEST,
        moduleId: mod.id,
      },
    });
    const theirs = await prisma.assessment.create({
      data: {
        lessonId: lesson.id,
        type: SessionType.COURSE_TEST,
        title: 'Their test',
      },
    });
    const own = await prisma.mCQQuestion.create({
      data: {
        assessmentId: theirs.id,
        questionText: 'Their own hand-written question for their own class?',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 1,
      },
    });

    const report = await syncAssessmentBanks(
      prisma as unknown as PrismaClient,
      quiet,
      registryFor(),
      1,
    );
    expect(report.assessmentsUnmapped).toBeGreaterThanOrEqual(1);
    expect(await questions(theirs.id)).toHaveLength(1);
    expect((await questions(theirs.id))[0].id).toBe(own.id);
  });

  it('two instances syncing at once never duplicate a question', async () => {
    const reg = registryFor();
    const runs = await Promise.all([
      syncAssessmentBanks(prisma as unknown as PrismaClient, quiet, reg, 1),
      syncAssessmentBanks(prisma as unknown as PrismaClient, quiet, reg, 1),
      syncAssessmentBanks(prisma as unknown as PrismaClient, quiet, reg, 1),
    ]);
    expect(runs.length).toBe(3);
    for (const t of [courseTest, stageTest, finalTest]) {
      const rows = await questions(t.assessmentId);
      const keys = rows.map((q) => q.bankKey);
      expect(new Set(keys).size).toBe(keys.length);
    }
    expect(await questions(courseTest.assessmentId)).toHaveLength(40);
    expect(await questions(finalTest.assessmentId)).toHaveLength(30);
    expect(
      await prisma.practicalQuestion.count({
        where: { assessmentId: finalTest.assessmentId },
      }),
    ).toBe(1);
  });

  describe('custom curricula', () => {
    async function customCourseImportedFrom(lessonId: string) {
      const course = await prisma.course.create({
        data: {
          slug: 'custom-course',
          title: 'AI & DS - All Exams Check',
          category: 'Custom',
          level: 'STARTER',
          isCustom: true,
        },
      });
      const lesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          title: 'Imported Course Test',
          order: 1,
          type: SessionType.COURSE_TEST,
          sourceRefs: { importedFromLessonId: lessonId },
        },
      });
      return { course, lesson };
    }

    it('links an imported test lesson to the original bank instead of copying it', async () => {
      const reg = registryFor();
      await syncAssessmentBanks(
        prisma as unknown as PrismaClient,
        quiet,
        reg,
        1,
      );
      const { lesson } = await customCourseImportedFrom(courseTest.lessonId);
      expect(
        await prisma.assessment.findUnique({ where: { lessonId: lesson.id } }),
      ).toBeNull(); // the defect: an imported test with no assessment at all

      const report = await syncAssessmentBanks(
        prisma as unknown as PrismaClient,
        quiet,
        reg,
        1,
      );
      expect(report.linksCreated).toBe(1);
      const linked = await prisma.assessment.findUniqueOrThrow({
        where: { lessonId: lesson.id },
      });
      expect(linked.sourceAssessmentId).toBe(courseTest.assessmentId);
      expect(linked.type).toBe(SessionType.COURSE_TEST);
      // No copies: the questions live only on the original bank.
      expect(await questions(linked.id)).toHaveLength(0);
      expect(await questions(courseTest.assessmentId)).toHaveLength(40);

      // …and a second run does not link it twice.
      const again = await syncAssessmentBanks(
        prisma as unknown as PrismaClient,
        quiet,
        reg,
        1,
      );
      expect(again.linksCreated).toBe(0);
    });

    it('a linked test picks up the standard instructions when its bank is upgraded', async () => {
      const reg = registryFor();
      const { lesson } = await customCourseImportedFrom(courseTest.lessonId);
      // First boot after the change: the bank is applied, then the link refreshed.
      await syncAssessmentBanks(
        prisma as unknown as PrismaClient,
        quiet,
        reg,
        1,
      );
      const linked = await prisma.assessment.findUniqueOrThrow({
        where: { lessonId: lesson.id },
      });
      expect(linked.instructions).toBe(
        standardInstructions('COURSE_TEST' as BankTestType),
      );
      expect(linked.bankVersion).toBe(1);
    });

    it('a custom course’s own tests are never given questions of their own', async () => {
      const { course } = await customCourseImportedFrom(courseTest.lessonId);
      const own = await prisma.lesson.create({
        data: {
          courseId: course.id,
          title: 'Hand-made test',
          order: 2,
          type: SessionType.COURSE_TEST,
        },
      });
      const asm = await prisma.assessment.create({
        data: {
          lessonId: own.id,
          type: SessionType.COURSE_TEST,
          title: 'Hand-made test',
        },
      });
      await syncAssessmentBanks(
        prisma as unknown as PrismaClient,
        quiet,
        registryFor(),
        1,
      );
      expect(await questions(asm.id)).toHaveLength(0);
    });
  });
});

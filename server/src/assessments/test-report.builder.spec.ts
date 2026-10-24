import { Prisma, SessionType, TestReportStatus } from '@prisma/client';
import {
  BuildReportInput,
  SubmittedAnswer,
  buildQuestionResults,
  buildReportCreateData,
} from './test-report.builder';

const SUBMITTED_AT = new Date('2026-10-24T09:30:00.000Z');

function answer(over: Partial<SubmittedAnswer> = {}): SubmittedAnswer {
  return {
    questionId: 'q1',
    kind: 'MCQ',
    text: 'What does print(2 + 3) show?',
    storedOptions: ['4', '5', '23', 'Error'],
    optionOrder: [0, 1, 2, 3],
    selectedIndex: 1,
    correctIndex: 1,
    explanation: 'Adding numbers gives 5.',
    ...over,
  };
}

function input(over: Partial<BuildReportInput> = {}): BuildReportInput {
  return {
    attemptId: 'att-1',
    assessmentId: 'asm-1',
    studentUserId: 'stu-1',
    teacherId: 'tch-1',
    courseId: 'course-1',
    courseTitle: 'Python for Young Builders',
    lessonId: 'lesson-9',
    scheduledLessonId: 'sl-1',
    type: SessionType.COURSE_TEST,
    testTitle: 'Python for Young Builders — Course Test',
    passScorePct: 70,
    submittedAt: SUBMITTED_AT,
    answers: [answer()],
    coding: null,
    ...over,
  };
}

describe('buildQuestionResults', () => {
  it('freezes the options in the order the student saw them', () => {
    // Stored: [4, 5, 23, Error]; the student was shown: 23, Error, 5, 4.
    const [r] = buildQuestionResults([
      answer({ optionOrder: [2, 3, 1, 0], selectedIndex: 1, correctIndex: 1 }),
    ]);
    expect(r.options).toEqual(['23', 'Error', '5', '4']);
    // They picked canonical option 1 ("5"), which sits at display position 2.
    expect(r.selectedIndex).toBe(2);
    expect(r.correctIndex).toBe(2);
    expect(r.autoCorrect).toBe(true);
  });

  it('grades on the canonical index, so shuffling cannot change the verdict', () => {
    const picked4 = answer({
      optionOrder: [3, 2, 1, 0],
      selectedIndex: 0, // canonical "4" → wrong
    });
    const [r] = buildQuestionResults([picked4]);
    expect(r.autoCorrect).toBe(false);
    expect(r.options[r.selectedIndex as number]).toBe('4');
    expect(r.options[r.correctIndex]).toBe('5');
  });

  it('an unanswered question is wrong and has no selection', () => {
    const [r] = buildQuestionResults([answer({ selectedIndex: null })]);
    expect(r.selectedIndex).toBeNull();
    expect(r.autoCorrect).toBe(false);
  });

  it('falls back to the stored order when the saved order is unusable', () => {
    const [r] = buildQuestionResults([
      answer({ optionOrder: [], selectedIndex: 3, correctIndex: 1 }),
    ]);
    expect(r.options).toEqual(['4', '5', '23', 'Error']);
    expect(r.selectedIndex).toBe(3);
    expect(r.correctIndex).toBe(1);
  });

  it('numbers questions by the position the student saw them in', () => {
    const results = buildQuestionResults([
      answer({ questionId: 'a' }),
      answer({ questionId: 'b' }),
      answer({ questionId: 'c' }),
    ]);
    expect(results.map((r) => [r.questionId, r.order])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('True/False questions keep True before False', () => {
    const [r] = buildQuestionResults([
      answer({
        kind: 'TRUE_FALSE',
        storedOptions: ['True', 'False'],
        optionOrder: [0, 1],
        selectedIndex: 1,
        correctIndex: 0,
      }),
    ]);
    expect(r.kind).toBe('TRUE_FALSE');
    expect(r.options).toEqual(['True', 'False']);
    expect(r.autoCorrect).toBe(false);
  });

  it('never starts with a teacher override', () => {
    expect(buildQuestionResults([answer()])[0].override).toBeNull();
  });
});

describe('buildReportCreateData', () => {
  it('a course test is graded immediately and waits for the teacher to review', () => {
    // 3 questions, 2 right.
    const data = buildReportCreateData(
      input({
        answers: [
          answer({ questionId: 'a' }),
          answer({ questionId: 'b' }),
          answer({ questionId: 'c', selectedIndex: 0 }),
        ],
      }),
    );
    expect(data.status).toBe(TestReportStatus.PENDING_REVIEW);
    expect(data).toMatchObject({
      attemptId: 'att-1',
      studentUserId: 'stu-1',
      teacherId: 'tch-1',
      assessmentType: SessionType.COURSE_TEST,
      mcqTotal: 3,
      trueFalseTotal: 0,
      objectiveScore: 2,
      autoObjectiveScore: 2,
      objectiveMaxScore: 3,
      hasCodingProject: false,
      codingScore: null,
      totalMaxScore: 3,
      totalScore: 2,
      teacherEdited: false,
      submittedAt: SUBMITTED_AT,
    });
    expect(data.percentage).toBeCloseTo(66.7, 1);
    expect(data.passed).toBe(false);
    expect(data.codingProject).toBe(Prisma.DbNull);
    expect(data.codingRubricScores).toBe(Prisma.DbNull);
  });

  it('a final test waits for the coding project: no total, no pass decision', () => {
    const data = buildReportCreateData(
      input({
        type: SessionType.FINAL_TEST,
        answers: Array.from({ length: 30 }, (_, i) =>
          answer({ questionId: `q${i}` }),
        ),
        coding: {
          questionId: 'p1',
          title: 'Check a Prediction Model',
          instructions: 'Spend about 15 minutes …',
          language: 'python',
          maxScore: 20,
          rubric: [
            { criterion: 'Functions', maxPoints: 8, lookFor: 'returns values' },
            { criterion: 'Clarity', maxPoints: 12, lookFor: 'clear names' },
          ],
          code: 'def predict(h):\n    return 45 + 7 * h\n',
          savedAt: new Date('2026-10-24T09:29:00.000Z'),
        },
      }),
    );
    expect(data.status).toBe(TestReportStatus.PENDING_CODE_EVALUATION);
    expect(data).toMatchObject({
      hasCodingProject: true,
      objectiveScore: 30,
      objectiveMaxScore: 30,
      codingMaxScore: 20,
      codingScore: null,
      totalMaxScore: 50,
      totalScore: null,
      percentage: null,
      passed: null,
    });
    const rubric = data.codingRubricScores as unknown as {
      criterion: string;
      score: number | null;
    }[];
    expect(rubric.map((r) => [r.criterion, r.score])).toEqual([
      ['Functions', null],
      ['Clarity', null],
    ]);
    const project = data.codingProject as unknown as {
      code: string;
      savedAt: string;
      title: string;
    };
    expect(project.code).toContain('def predict');
    expect(project.title).toBe('Check a Prediction Model');
    expect(project.savedAt).toBe('2026-10-24T09:29:00.000Z');
  });

  it('keeps an empty project submission (the student wrote nothing)', () => {
    const data = buildReportCreateData(
      input({
        type: SessionType.FINAL_TEST,
        coding: {
          questionId: 'p1',
          title: 'Project',
          instructions: 'x',
          language: 'python',
          maxScore: 20,
          rubric: [{ criterion: 'Works', maxPoints: 20 }],
          code: '',
          savedAt: null,
        },
      }),
    );
    expect(data.status).toBe(TestReportStatus.PENDING_CODE_EVALUATION);
    expect(
      (data.codingProject as unknown as { savedAt: string | null }).savedAt,
    ).toBeNull();
  });

  it('stores the question snapshot the teacher will review', () => {
    const data = buildReportCreateData(
      input({ answers: [answer({ optionOrder: [1, 0, 3, 2] })] }),
    );
    const results = data.questionResults as unknown as {
      options: string[];
      text: string;
    }[];
    expect(results).toHaveLength(1);
    expect(results[0].options).toEqual(['5', '4', 'Error', '23']);
    expect(results[0].text).toBe('What does print(2 + 3) show?');
  });
});

import {
  BankProblem,
  validateAcrossBanks,
  validateBank,
} from './bank.validate';
import { BankMcq, BankTrueFalse, TestBank } from './bank.types';
import { syntheticBank } from './testing/synthetic-bank';

const messages = (problems: BankProblem[]) =>
  problems.map((p) => `${p.where}: ${p.message}`);

const hasProblem = (bank: TestBank, re: RegExp) =>
  messages(validateBank(bank)).some((m) => re.test(m));

/** Deep-copy so each test can break one thing in an otherwise valid bank. */
const clone = (b: TestBank): TestBank => structuredClone(b);

describe('validateBank — the standard every test must meet', () => {
  it.each(['COURSE_TEST', 'STAGE_TEST', 'FINAL_TEST'] as const)(
    'accepts a well-formed %s',
    (type) => {
      expect(validateBank(syntheticBank(`x/${type}`, type))).toEqual([]);
    },
  );

  describe('shape', () => {
    it('a course test needs exactly 30 MCQ + 10 True/False', () => {
      const b = clone(syntheticBank('x/c', 'COURSE_TEST'));
      b.mcq.pop();
      expect(hasProblem(b, /expected exactly 30 MCQs, found 29/)).toBe(true);

      const c = clone(syntheticBank('x/c', 'COURSE_TEST'));
      c.trueFalse.pop();
      expect(
        hasProblem(c, /expected exactly 10 True\/False questions, found 9/),
      ).toBe(true);
    });

    it('a final test needs exactly 25 MCQ + 5 True/False', () => {
      const b = clone(syntheticBank('x/f', 'FINAL_TEST'));
      b.mcq.push({ ...b.mcq[0], key: 'M99', text: `${b.mcq[0].text} (extra)` });
      expect(hasProblem(b, /expected exactly 25 MCQs, found 26/)).toBe(true);
    });

    it('a final test must include the coding project, a course test must not', () => {
      const f = clone(syntheticBank('x/f', 'FINAL_TEST'));
      delete f.codingProject;
      expect(hasProblem(f, /needs exactly one coding project/)).toBe(true);

      const c = clone(syntheticBank('x/c', 'COURSE_TEST'));
      c.codingProject = syntheticBank('x/f', 'FINAL_TEST').codingProject;
      expect(hasProblem(c, /must not include a coding project/)).toBe(true);
    });
  });

  describe('coding project', () => {
    it('the rubric must total 20 marks', () => {
      const b = clone(syntheticBank('x/f', 'FINAL_TEST'));
      b.codingProject!.rubric[0].maxPoints += 1;
      b.codingProject!.maxScore += 1;
      expect(hasProblem(b, /rubric must total 20 marks, found 21/)).toBe(true);
    });

    it('maxScore must equal the rubric total', () => {
      const b = clone(syntheticBank('x/f', 'FINAL_TEST'));
      b.codingProject!.maxScore = 19;
      expect(hasProblem(b, /maxScore must equal the rubric total/)).toBe(true);
    });

    it('needs 3–5 criteria, each with a real "look for" guide', () => {
      const few = clone(syntheticBank('x/f', 'FINAL_TEST'));
      few.codingProject!.rubric = [
        { criterion: 'Everything', maxPoints: 20, lookFor: 'x'.repeat(30) },
      ];
      expect(hasProblem(few, /rubric should have 3–5 criteria/)).toBe(true);

      const vague = clone(syntheticBank('x/f', 'FINAL_TEST'));
      vague.codingProject!.rubric[0].lookFor = 'good';
      expect(hasProblem(vague, /needs a "look for" guide/)).toBe(true);
    });

    it('instructions must be self-contained and state the 15-minute time box', () => {
      const short = clone(syntheticBank('x/f', 'FINAL_TEST'));
      short.codingProject!.instructions = 'Write something for 15 minutes.';
      expect(hasProblem(short, /instructions are too short/)).toBe(true);

      const untimed = clone(syntheticBank('x/f', 'FINAL_TEST'));
      untimed.codingProject!.instructions =
        'Write a short Python program that adds two numbers and prints the answer. '.repeat(
          4,
        );
      expect(hasProblem(untimed, /state the ~15-minute time box/)).toBe(true);
    });

    it('is also held to the "no setup chores" rule', () => {
      const b = clone(syntheticBank('x/f', 'FINAL_TEST'));
      b.codingProject!.instructions += ' First install pandas with pip.';
      expect(hasProblem(b, /installation question/)).toBe(true);
    });
  });

  describe('every question', () => {
    it('rejects duplicate options, ignoring case and spacing', () => {
      const b = clone(syntheticBank('x/c', 'COURSE_TEST'));
      b.mcq[0].wrong[0] = `  ${b.mcq[0].correct.toUpperCase()}`;
      expect(hasProblem(b, /four options must all be different/)).toBe(true);
    });

    it('rejects vague "all of the above" style options', () => {
      for (const vague of [
        'All of the above',
        'None of the above',
        'Both of the above',
        'A and B',
        'Option C',
      ]) {
        const b = clone(syntheticBank('x/c', 'COURSE_TEST'));
        b.mcq[0].wrong[0] = vague;
        expect(hasProblem(b, /avoid vague options/)).toBe(true);
      }
    });

    it('rejects empty and over-long options', () => {
      const empty = clone(syntheticBank('x/c', 'COURSE_TEST'));
      empty.mcq[0].wrong[1] = '   ';
      expect(hasProblem(empty, /empty option/)).toBe(true);

      const long = clone(syntheticBank('x/c', 'COURSE_TEST'));
      long.mcq[0].wrong[1] = 'y'.repeat(221);
      expect(hasProblem(long, /option too long/)).toBe(true);
    });

    it('needs sensible question text and a real explanation', () => {
      const b = clone(syntheticBank('x/c', 'COURSE_TEST'));
      b.mcq[0].text = 'Why?';
      b.mcq[1].explanation = 'Because.';
      b.mcq[2].text = 'z'.repeat(901);
      const m = messages(validateBank(b));
      expect(m).toContain('M01: question text is too short');
      expect(m).toContain('M02: needs an explanation (≥ 20 characters)');
      expect(m).toContain('M03: question text is too long');
    });

    it('rejects a repeated question inside a bank (normalising whitespace/case)', () => {
      const b = clone(syntheticBank('x/c', 'COURSE_TEST'));
      b.mcq[1].text = `  ${b.mcq[0].text.toUpperCase()}  `;
      expect(hasProblem(b, /duplicate question text within the bank/)).toBe(
        true,
      );
    });

    it('rejects a duplicate key', () => {
      const b = clone(syntheticBank('x/c', 'COURSE_TEST'));
      b.mcq[1].key = b.mcq[0].key;
      expect(hasProblem(b, /duplicate key/)).toBe(true);
    });

    it('an MCQ code check may not carry a True/False claim', () => {
      const b = clone(syntheticBank('x/c', 'COURSE_TEST'));
      b.mcq[0].codeCheck = {
        language: 'python',
        code: 'print(1)',
        claim: '1',
      };
      expect(hasProblem(b, /MCQ codeCheck must not set `claim`/)).toBe(true);
    });
  });

  describe('setup / installation / environment questions are out of scope', () => {
    const offenders: [string, string][] = [
      ['installation', 'How do you install the library on your computer?'],
      ['installation', 'After installing Python, what do you check first?'],
      ['package manager', 'Which command adds a library: pip, npm or conda?'],
      ['package manager', 'Run npx to start the project.'],
      ['terminal', 'What does the terminal show after the command runs?'],
      ['command line', 'Which command-line tool lists files?'],
      ['running a file', 'Type python main.py to run the program.'],
      ['environment', 'Why use a virtual environment for each project?'],
      ['environment', 'Where do you store an environment variable?'],
      ['editor chore', 'Open the project in VS Code and press run.'],
      ['PATH', 'Why add Python to PATH?'],
      ['download', 'Download the starter files before you begin.'],
    ];

    it.each(offenders)('flags a %s question: "%s"', (_name, text) => {
      const asQuestion = clone(syntheticBank('x/c', 'COURSE_TEST'));
      asQuestion.mcq[0].text = `${text} Pick the best answer.`;
      expect(hasProblem(asQuestion, /question — test understanding/)).toBe(
        true,
      );

      const asOption = clone(syntheticBank('x/c', 'COURSE_TEST'));
      asOption.mcq[0].wrong[0] = text.slice(0, 200);
      expect(hasProblem(asOption, /question — test understanding/)).toBe(true);

      const asExplanation = clone(syntheticBank('x/c', 'COURSE_TEST'));
      asExplanation.mcq[0].explanation = `This is wrong. ${text}`;
      expect(hasProblem(asExplanation, /question — test understanding/)).toBe(
        true,
      );
    });

    it('does not trip over ordinary programming vocabulary', () => {
      const b = clone(syntheticBank('x/c', 'COURSE_TEST'));
      b.mcq[0].text =
        'A function called shell_shape draws a shell. Which instance method redraws a pythonic list of sprites on the screen?';
      b.mcq[1].text =
        'Which keyword starts a loop, and which statement leaves it early?';
      expect(hasProblem(b, /question — test understanding/)).toBe(false);
    });
  });

  describe('True/False balance', () => {
    const withAnswers = (
      type: 'COURSE_TEST' | 'FINAL_TEST',
      trues: number,
    ): TestBank => {
      const b = clone(syntheticBank('x/b', type));
      b.trueFalse.forEach((q: BankTrueFalse, i: number) => {
        q.answer = i < trues;
      });
      return b;
    };

    it('10 True/False: 3–7 true is fine, 2 or 8 is lopsided', () => {
      for (const trues of [3, 4, 5, 6, 7])
        expect(hasProblem(withAnswers('COURSE_TEST', trues), /lopsided/)).toBe(
          false,
        );
      for (const trues of [0, 2, 8, 10])
        expect(hasProblem(withAnswers('COURSE_TEST', trues), /lopsided/)).toBe(
          true,
        );
    });

    it('5 True/False: 2 or 3 true is fine, 0/1/4/5 is lopsided', () => {
      for (const trues of [2, 3])
        expect(hasProblem(withAnswers('FINAL_TEST', trues), /lopsided/)).toBe(
          false,
        );
      for (const trues of [0, 1, 4, 5])
        expect(hasProblem(withAnswers('FINAL_TEST', trues), /lopsided/)).toBe(
          true,
        );
    });
  });

  describe('course-test coverage', () => {
    it('every one of the 8 lessons needs at least 3 questions', () => {
      const b = clone(syntheticBank('x/c', 'COURSE_TEST'));
      // Move every question from lesson 5 to lesson 1.
      const move = (q: BankMcq | BankTrueFalse) => {
        if (q.topic === 5) q.topic = 1;
      };
      b.mcq.forEach(move);
      b.trueFalse.forEach(move);
      expect(hasProblem(b, /lesson 5 has only 0 question/)).toBe(true);
    });

    it('a topic outside lessons 1–8 is rejected', () => {
      const b = clone(syntheticBank('x/c', 'COURSE_TEST'));
      b.mcq[0].topic = 9;
      expect(hasProblem(b, /topic 9 is outside lessons 1–8/)).toBe(true);
    });

    it('finals and stage tests are not held to the 8-lesson rule', () => {
      const b = syntheticBank('x/f', 'FINAL_TEST');
      expect(hasProblem(b, /lesson \d has only/)).toBe(false);
    });
  });
});

describe('validateAcrossBanks', () => {
  it('passes when no two tests share a question', () => {
    expect(
      validateAcrossBanks([
        syntheticBank('x/one', 'COURSE_TEST'),
        syntheticBank('x/two', 'COURSE_TEST'),
      ]),
    ).toEqual([]);
  });

  it('flags a question that appears in two different tests', () => {
    const a = syntheticBank('x/one', 'COURSE_TEST');
    const b = syntheticBank('x/two', 'COURSE_TEST');
    b.mcq[3].text = `  ${a.mcq[0].text.toUpperCase()}`;
    const problems = validateAcrossBanks([a, b]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({
      bankId: 'x/two',
      where: 'M04',
      message: 'same question text as x/one',
    });
  });
});

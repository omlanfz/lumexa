import { ADVANCED_DATA_SCIENCE_FIXES } from '../../courses/advanced-data-science.content';
import { cleanLesson } from './cleaner';
import { buildMcq, conformQuiz, discussionSection, DISCUSSION_HEADING, mcqRewriteKeys, mcqRewritesFor, registerMcqRewrites, registerMcqRewritesByTitle, squash } from './quiz-mcq';
import { isConformingQuestion, normalizeQuiz } from './quiz';
import { quizCatalogFor } from './quiz-catalog';
import './catalog';
import { MCQ_OPTION_COUNT, type McqQuestion } from './types';
import { allSourceLessons, contextOf, fieldsOf } from './test-support';

const four = (over: Record<string, unknown> = {}) => ({ id: 'q1', type: 'multiple_choice', prompt: 'Which one?', options: ['a', 'b', 'c', 'd'], correctIndex: 1, explanation: 'Because b.', ...over });
const ctx = { lineage: null, title: 'Nothing registered for this title' };

describe('conformQuiz: bringing older questions up to the rule', () => {
  it('keeps a question that already obeys the rule exactly as it is, and says nothing changed', () => {
    const raw = [four(), four({ id: 'q2', prompt: 'Two?' })];
    const out = conformQuiz(raw, ctx);
    expect(out.quiz.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(out.quiz[0]).toMatchObject({ options: ['a', 'b', 'c', 'd'], correctIndex: 1, explanation: 'Because b.' });
    expect(out).toMatchObject({ changed: false, changes: [], review: [], leftover: [], duplicates: 0 });
  });

  it('makes an older code-output / code-error question with four options a multiple-choice question', () => {
    const out = conformQuiz([four({ type: 'code_output' }), four({ id: 'q2', type: 'code_error', prompt: 'Which error?' })], ctx);
    expect(out.quiz.map((q) => q.type)).toEqual(['multiple_choice', 'multiple_choice']);
    expect(out.leftover).toEqual([]);
  });

  it('is a no-op the second time (no database churn on every boot)', () => {
    const raw = [
      { id: 'q1', type: 'ordering', prompt: 'Put the steps in order', items: ['one', 'two', 'three', 'four'], explanation: 'x' },
      { id: 'q2', type: 'self_check', prompt: 'Explain loops in your own words' },
      four({ id: 'q3', prompt: 'Which?', options: ['a', 'b', 'c', 'd', 'e'] }),
    ];
    const first = conformQuiz(raw, ctx);
    const second = conformQuiz(first.quiz, ctx);
    expect(second.changed).toBe(false);
    expect(second.quiz).toEqual(first.quiz);
    expect(JSON.stringify(conformQuiz(raw, ctx))).toBe(JSON.stringify(first)); // deterministic
  });

  it('turns an ordering question into "which order is right?" with the real order and three different orders', () => {
    const out = conformQuiz([{ id: 'q1', type: 'ordering', prompt: 'Put these in order', items: ['write code', 'commit', 'push', 'deploy'], explanation: 'That is the flow.' }], ctx);
    const q = out.quiz[0];
    expect(q).toMatchObject({ id: 'q1m', type: 'multiple_choice', source: 'derived' });
    expect(q.options).toHaveLength(MCQ_OPTION_COUNT);
    expect(new Set(q.options).size).toBe(MCQ_OPTION_COUNT);
    expect(q.options[q.correctIndex]).toBe('write code → commit → push → deploy');
    expect(q.prompt).toMatch(/correct order/);
    expect(out.changes[0].kind).toBe('quiz-converted');
  });

  it('turns a matching question into "which pairing is right?" with one real pair and three crossed ones', () => {
    const pairs = [{ left: 'HTML', right: 'structure' }, { left: 'CSS', right: 'style' }, { left: 'JS', right: 'behaviour' }];
    const q = conformQuiz([{ id: 'q1', type: 'matching', prompt: 'Match each language', pairs }], ctx).quiz[0];
    expect(q.options).toHaveLength(MCQ_OPTION_COUNT);
    expect(new Set(q.options).size).toBe(MCQ_OPTION_COUNT);
    expect(pairs.map((p) => `${p.left} → ${p.right}`)).toContain(q.options[q.correctIndex]);
  });

  it('trims a question with more than four options to the right answer plus three wrong ones', () => {
    const q = conformQuiz([four({ prompt: 'Which?', options: ['a', 'b', 'c', 'd', 'e', 'f'], correctIndex: 4 })], ctx).quiz[0];
    expect(q.options).toHaveLength(MCQ_OPTION_COUNT);
    expect(q.options[q.correctIndex]).toBe('e');
    expect(q.id).toBe('q1m');
    // "All of the above" only makes sense next to the options it refers to, so it is not trimmed.
    const out = conformQuiz([four({ options: ['a', 'b', 'c', 'all of the above', 'e'], correctIndex: 3 })], ctx);
    expect(out.quiz).toEqual([]);
    expect(out.leftover).toHaveLength(1);
  });

  it('keeps what it cannot turn into multiple choice for the teacher — never drops it silently — and reports it', () => {
    const raw = [
      four(),
      { id: 'q2', type: 'self_check', prompt: 'Why does a `while` loop need its condition to change?', sampleAnswer: 'So it can end.' },
      { id: 'q3', type: 'reflection', prompt: 'Describe a time you debugged something.' },
      { id: 'q4', type: 'true_false', prompt: 'Python runs lines in random order.', options: ['True', 'False'], correctIndex: 1 },
    ];
    const out = conformQuiz(raw, ctx);
    expect(out.quiz.map((q) => q.id)).toEqual(['q1']);
    expect(out.leftover.map((l) => l.kind)).toEqual(['self_check', 'reflection', 'true_false']);
    expect(out.leftover[0].prompt).toBe('Why does a while loop need its condition to change?'); // plain text, no Markdown
    expect(out.review).toHaveLength(1);
    expect(out.review[0]).toMatchObject({ kind: 'quiz-needs-rewrite' });
    expect(out.review[0].detail).toMatch(/3 quiz questions/);
    const notes = discussionSection(out.leftover);
    expect(notes).toContain(`## ${DISCUSSION_HEADING}`);
    expect(notes).toContain('- Describe a time you debugged something.');
  });

  it('does not keep the same question twice ("True or False: …" repeating one, or a copy cut short)', () => {
    const raw = [
      { id: 'q1', type: 'true_false', prompt: 'Comments are executed by the Python interpreter.', options: ['True', 'False'], correctIndex: 1 },
      { id: 'q2', type: 'self_check', prompt: 'True or False: Comments are executed by the Python interpreter.' },
      { id: 'q3', type: 'self_check', prompt: 'Name one metric appropriate for classification and one appropriate for regression.' },
      { id: 'q4', type: 'self_check', prompt: 'Name one metric appropriate for classification and one appropriate for' },
    ];
    registerMcqRewritesByTitle({ 'Repeat test lesson': [{ from: 'Comments are executed', prompt: 'What does the interpreter do with a comment?', options: ['Ignores it', 'Runs it', 'Prints it', 'Saves it'], explanation: 'Comments are for people.' }] });
    const out = conformQuiz(raw, { lineage: null, title: 'Repeat test lesson' });
    expect(out.quiz.map((q) => q.id)).toEqual(['q1m']);
    expect(out.duplicates).toBe(2);
    expect(out.leftover.map((l) => l.prompt)).toEqual(['Name one metric appropriate for classification and one appropriate for regression.']);
  });

  it('never throws, whatever it is given', () => {
    for (const raw of [null, undefined, 'text', 42, {}, [], [null, 'x', 7, [], {}]]) {
      expect(() => conformQuiz(raw, ctx)).not.toThrow();
      expect(conformQuiz(raw, ctx).quiz.every((q) => isConformingQuestion(q))).toBe(true);
    }
  });
});

describe('authored rewrites', () => {
  it('are found by the start of the original question however it is punctuated, and put the right answer in a varied place', () => {
    registerMcqRewrites({
      'rewrite-test/1': [
        { from: 'If `fuel_level = 45`', prompt: 'Which branch runs?', options: ['The elif branch', 'The if branch', 'The else branch', 'No branch'], explanation: 'Because 45 < 50.' },
        { from: 'What is the difference between `=` and `==` in Python', options: ['Assign vs compare', 'Compare vs assign', 'No difference', 'Text vs numbers'], explanation: 'One assigns.' },
      ],
    });
    const raw = [
      { id: 'q1', type: 'reflection', prompt: 'If `fuel_level = 45`, which branch of the `launch_readiness.py` example runs, and why?' },
      { id: 'q2', type: 'reflection', prompt: 'What is the difference between `=` and `==` in Python?' },
    ];
    const out = conformQuiz(raw, { lineage: 'rewrite-test/1', title: 'x' });
    expect(out.quiz.map((q) => q.id)).toEqual(['q1m', 'q2m']);
    expect(out.quiz[0].prompt).toBe('Which branch runs?');
    expect(out.quiz[1].prompt).toBe('What is the difference between `=` and `==` in Python?'); // keeps the original wording when none is given
    expect(out.quiz[0].options[out.quiz[0].correctIndex]).toBe('The elif branch');
    expect(out.quiz[1].options[out.quiz[1].correctIndex]).toBe('Assign vs compare');
    expect(out.unusedRewrites).toEqual([]);
    expect(out.changes[0].detail).toMatch(/Converted 2 quiz questions/);
    expect(squash('If `fuel_level = 45`, which')).toBe(squash('If fuel level 45 which'));
  });

  it('reports a rewrite that matched nothing, so a typo cannot go unnoticed', () => {
    registerMcqRewrites({ 'rewrite-test/2': [{ from: 'A question nobody asks', options: ['a', 'b', 'c', 'd'], explanation: 'x' }] });
    expect(conformQuiz([{ id: 'q1', type: 'reflection', prompt: 'Something else' }], { lineage: 'rewrite-test/2', title: 'x' }).unusedRewrites).toEqual(['A question nobody asks']);
  });

  it('a rewrite by lesson title wins over one by lineage', () => {
    registerMcqRewrites({ 'rewrite-test/3': [{ from: 'Q', options: ['by lineage', 'b', 'c', 'd'], explanation: 'x' }] });
    registerMcqRewritesByTitle({ 'Rewrite Test Title': [{ from: 'Q', options: ['by title', 'b', 'c', 'd'], explanation: 'x' }] });
    expect(mcqRewritesFor('rewrite-test/3', 'Another title')[0].options[0]).toBe('by lineage');
    expect(mcqRewritesFor('rewrite-test/3', '  rewrite test TITLE ')[0].options[0]).toBe('by title');
  });

  it('builds questions that pass the same validation as an admin edit, with the right answer in a spread of places', () => {
    const positions = [0, 0, 0, 0];
    for (let i = 0; i < 200; i++) {
      const q = buildMcq(`q${i}`, `A different question number ${i}?`, ['right', 'w1', 'w2', 'w3'], 'Because.');
      expect(normalizeQuiz([q]).errors).toEqual([]);
      expect(q.options[q.correctIndex]).toBe('right');
      positions[q.correctIndex]++;
    }
    for (const p of positions) expect(p).toBeGreaterThan(30);
  });
});

describe('the hand-written rewrites cover every shipped lesson', () => {
  const lessons = allSourceLessons();
  const cleanedQuiz = (c: (typeof lessons)[number]) => (cleanLesson(fieldsOf(c), contextOf(c)).fields.miniQuiz ?? []) as { id: string; type: string; prompt: string }[];
  const registeredByLineage = mcqRewriteKeys().lineages.filter((k) => lessons.some((c) => c.key === k));

  it('every rewrite of every pathway lesson matches exactly one of that lesson’s questions, and is used', () => {
    expect(registeredByLineage.length).toBeGreaterThanOrEqual(81); // every pathway lesson that had typed-answer or true/false questions
    for (const c of lessons) {
      // (Little Coders' knowledge checks are authored in the quiz catalog, not rewritten from older questions.)
      const rewrites = mcqRewritesFor(c.key, '');
      if (c.pathway === 'little-coders-path') {
        expect({ key: c.key, rewrites: rewrites.length }).toEqual({ key: c.key, rewrites: 0 });
        continue;
      }
      const quiz = cleanedQuiz(c);
      for (const w of rewrites) {
        const hits = quiz.filter((q) => squash(String(q.prompt)).startsWith(squash(w.from)));
        expect({ key: c.key, from: w.from.slice(0, 60), matches: hits.length }).toEqual({ key: c.key, from: w.from.slice(0, 60), matches: 1 });
      }
      const out = conformQuiz(quiz, { lineage: c.key, title: '', authored: null });
      expect({ key: c.key, unused: out.unusedRewrites }).toEqual({ key: c.key, unused: [] });
    }
  });

  it('no rewrite is registered for a lesson that does not exist', () => {
    const known = new Set(lessons.map((c) => c.key));
    expect(mcqRewriteKeys().lineages.filter((k) => !known.has(k) && !k.startsWith('rewrite-test/'))).toEqual([]);
  });

  it('after conversion no lesson is left with anything but four-option multiple choice', () => {
    for (const c of lessons) {
      const authored = quizCatalogFor(c.key);
      const out = conformQuiz(cleanedQuiz(c), { lineage: c.key, title: c.raw.title, authored: authored ? normalizeQuiz(authored).quiz : null });
      for (const q of out.quiz) expect({ key: c.key, id: q.id, ok: isConformingQuestion(q) }).toEqual({ key: c.key, id: q.id, ok: true });
    }
  });

  it('every rewrite is a well-formed question: four different, non-empty options and a short explanation', () => {
    const all = [...mcqRewriteKeys().lineages.filter((k) => !k.startsWith('rewrite-test/')).flatMap((k) => mcqRewritesFor(k, '')), ...mcqRewriteKeys().titles.filter((t) => t !== 'rewrite test title' && t !== 'repeat test lesson').flatMap((t) => mcqRewritesFor(null, t))];
    expect(all.length).toBeGreaterThan(300);
    for (const w of all) {
      const label = w.from.slice(0, 50);
      expect({ label, n: w.options.length }).toEqual({ label, n: 4 });
      expect({ label, distinct: new Set(w.options.map((o) => o.trim())).size }).toEqual({ label, distinct: 4 });
      expect({ label, blank: w.options.some((o) => o.trim() === '' || o.length > 400) }).toEqual({ label, blank: false });
      expect({ label, explained: w.explanation.trim().length > 10 && w.explanation.length <= 1500 }).toEqual({ label, explained: true });
      if (w.prompt) expect({ label, ok: w.prompt.length <= 1500 }).toEqual({ label, ok: true });
    }
  });

  it('the Advanced Data Science course’s lessons (matched by title) end up as multiple choice only, each question matched once', () => {
    expect(ADVANCED_DATA_SCIENCE_FIXES.length).toBe(16);
    for (const fix of ADVANCED_DATA_SCIENCE_FIXES) {
      const title = fix.title ?? (Array.isArray(fix.matchTitle) ? fix.matchTitle[0] : fix.matchTitle);
      const quiz = (cleanLesson(
        { title, objectives: fix.objectives, contentMarkdown: fix.contentMarkdown, homework: fix.homework, teacherNotes: null, miniQuiz: null, visuals: null },
        { courseTitle: null, moduleTitle: null, duration: 60, positionInModule: 1, moduleLessonCount: null, lineageModule: null, sourceTeacherNotes: null, sourceQuiz: null },
      ).fields.miniQuiz ?? []) as { prompt: string }[];
      for (const w of mcqRewritesFor(null, title)) {
        const hits = quiz.filter((q) => squash(String(q.prompt)).startsWith(squash(w.from)));
        expect({ title, from: w.from.slice(0, 50), matches: hits.length }).toEqual({ title, from: w.from.slice(0, 50), matches: 1 });
      }
      const out = conformQuiz(quiz, { lineage: null, title });
      expect({ title, unused: out.unusedRewrites, nonMcq: out.quiz.filter((q) => !isConformingQuestion(q)).length }).toEqual({ title, unused: [], nonMcq: 0 });
      expect({ title, enough: out.quiz.length >= 5 }).toEqual({ title, enough: true });
    }
  });
});

describe('the discussion questions kept for the teacher', () => {
  it('are a clearly labelled section of plain bullets', () => {
    const s = discussionSection([{ prompt: 'Why?', kind: 'self_check' }, { prompt: 'How?', kind: 'reflection' }]);
    expect(s.startsWith(`## ${DISCUSSION_HEADING}`)).toBe(true);
    expect(s).toContain('- Why?\n- How?');
    const q: McqQuestion[] = [];
    expect(q).toHaveLength(0);
  });
});

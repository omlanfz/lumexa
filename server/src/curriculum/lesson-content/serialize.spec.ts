import { linkLessonReferences } from './refs';
import { describeNumbering, indexCourseLessons, numberingFor, type CourseLessonRow } from './numbering';
import { buildNavigation, buildSharedLesson, buildTeacherPrep, hasTeacherPrep, resolveLessonRefs, type LessonRow } from './serialize';

const quiz = [
  { id: 'q1', type: 'multiple_choice', prompt: 'Pick', options: ['a1', 'b1', 'c1', 'd1'], correctIndex: 1, explanation: 'SECRET-EXPLANATION' },
  { id: 'q2', type: 'multiple_choice', prompt: 'Pick again', options: ['a2', 'b2', 'c2', 'd2'], correctIndex: 3, explanation: 'SECRET-EXPLANATION-2' },
];

/** A row stored by an older release: it still holds question shapes that are no longer allowed. */
const legacyQuiz = [
  quiz[0],
  { id: 'q8', type: 'self_check', prompt: 'Explain', sampleAnswer: 'SECRET-SAMPLE' },
  { id: 'q9', type: 'multiple_choice', prompt: 'Only two options', options: ['a', 'b'], correctIndex: 0, explanation: 'SECRET-TWO' },
  { id: 'q10', type: 'true_false', prompt: 'True?', options: ['True', 'False'], correctIndex: 0 },
];

const row: LessonRow = {
  id: 'l1',
  title: 'Loops',
  type: 'LEARNING',
  order: 12,
  duration: 60,
  objectives: ['Write a loop'],
  contentMarkdown: '## Body\n\n```lumexa-quiz\n```',
  reviewNotes: 'SECRET-REVIEW-NOTE',
  teacherNotes: 'SECRET-TEACHER-NOTE: ask them to predict the output',
  miniQuiz: quiz,
  visuals: null,
  homework: 'Write three loops',
  checkpoint: 'A loop',
  codeSnippets: [],
  projectLinks: null,
  module: { id: 'm1', title: 'Python', stageNumber: 1 },
  project: null,
};

describe('role-aware serialization', () => {
  it('the shared lesson contains nothing teacher-only, whatever the row holds', () => {
    const shared = buildSharedLesson(row, {});
    const json = JSON.stringify(shared);
    for (const secret of ['SECRET-REVIEW-NOTE', 'SECRET-TEACHER-NOTE', 'SECRET-EXPLANATION']) expect(json).not.toContain(secret);
    for (const key of ['teacherNotes', 'reviewNotes', 'answerKey', 'correctIndex', 'sampleAnswer']) expect(json).not.toContain(`"${key}"`);
    expect(shared.quiz?.questions).toHaveLength(2);
    expect(shared.quiz?.gradedCount).toBe(2); // every question is multiple choice, so every question is scored
    for (const q of shared.quiz?.questions ?? []) {
      expect(q.type).toBe('multiple_choice');
      expect(q.options).toHaveLength(4);
    }
  });

  it('never serves a stored question that is not four-option multiple choice — not in the lesson and not in the answer key', () => {
    const old = { ...row, miniQuiz: legacyQuiz };
    const shared = buildSharedLesson(old, {});
    expect(shared.quiz?.questions.map((q) => q.id)).toEqual(['q1']);
    expect(shared.quiz?.gradedCount).toBe(1);
    const prep = buildTeacherPrep(old);
    expect(prep.answerKey.map((q) => q.id)).toEqual(['q1']);
    for (const secret of ['SECRET-SAMPLE', 'SECRET-TWO']) expect(JSON.stringify({ shared, prep })).not.toContain(secret);
    // A lesson whose stored quiz holds only older shapes has no quiz at all (and no empty quiz box).
    expect(buildSharedLesson({ ...row, miniQuiz: legacyQuiz.slice(1) }, {}).quiz).toBeNull();
  });

  it('is an allowlist: a new column added to the row never reaches a learner by accident', () => {
    const shared = buildSharedLesson({ ...row, somethingNew: 'LEAK-ME', adminOnly: { x: 1 } } as LessonRow, {});
    expect(JSON.stringify(shared)).not.toContain('LEAK-ME');
    expect(Object.keys(shared).sort()).toEqual(['checkpoint', 'codeSnippets', 'contentMarkdown', 'duration', 'homework', 'id', 'module', 'objectives', 'project', 'projectLinks', 'quiz', 'title', 'type', 'visuals'].sort());
  });

  it('the teacher prep holds the notes, the review notes and the whole answer key', () => {
    const prep = buildTeacherPrep(row);
    expect(prep.teacherNotes).toContain('SECRET-TEACHER-NOTE');
    expect(prep.reviewNotes).toBe('SECRET-REVIEW-NOTE');
    expect(prep.answerKey).toHaveLength(2);
    expect(prep.answerKey.map((q) => q.correctIndex)).toEqual([1, 3]);
    expect(JSON.stringify(prep)).toContain('SECRET-EXPLANATION');
    expect(hasTeacherPrep(row)).toBe(true);
    expect(hasTeacherPrep({ ...row, teacherNotes: '  ', reviewNotes: null, miniQuiz: null })).toBe(false);
  });
});

describe('numbering: Session N is course-wide, Lesson N of M is within the module', () => {
  const mod = (id: string, slug: string, n: number) => ({ id, slug, title: slug, stageNumber: n });
  const rows: CourseLessonRow[] = [
    { id: 'a1', order: 1, type: 'LEARNING', title: 'A1', moduleId: 'ma', module: mod('ma', 'alpha', 1) },
    { id: 'a2', order: 2, type: 'LEARNING', title: 'A2', moduleId: 'ma', module: mod('ma', 'alpha', 1) },
    { id: 'at', order: 3, type: 'STAGE_TEST', title: 'Test', moduleId: 'ma', module: mod('ma', 'alpha', 1) },
    { id: 'b1', order: 4, type: 'LEARNING', title: 'B1', moduleId: 'mb', module: mod('mb', 'beta', 2) },
    { id: 'b2', order: 5, type: 'LEARNING', title: 'B2', moduleId: 'mb', module: mod('mb', 'beta', 2) },
    { id: 'b3', order: 6, type: 'LEARNING', title: 'B3', moduleId: 'mb', module: mod('mb', 'beta', 2) },
  ];

  it('counts tests in the session number but not in the lesson number', () => {
    const idx = indexCourseLessons(rows);
    expect(describeNumbering(numberingFor(idx, 'b2')!)).toBe('Session 5 · Lesson 2 of 3');
    expect(numberingFor(idx, 'b1')).toMatchObject({ session: 4, lessonIndex: 1, lessonTotal: 3 });
    expect(numberingFor(idx, 'at')).toMatchObject({ session: 3, lessonIndex: null, lessonTotal: null });
    expect(describeNumbering(numberingFor(idx, 'at')!)).toBe('Session 3');
  });

  it('uses course-level numbering for a custom course without modules', () => {
    const flat: CourseLessonRow[] = [1, 2, 3].map((n) => ({ id: `c${n}`, order: n * 2, type: 'LEARNING', title: `C${n}`, moduleId: null, module: null }));
    const idx = indexCourseLessons(flat);
    expect(numberingFor(idx, 'c2')).toMatchObject({ session: 4, lessonIndex: 2, lessonTotal: 3, module: null });
  });

  it('renumbers per course: the same lesson is Lesson 1 in its module and Lesson 3 in a custom course', () => {
    const custom: CourseLessonRow[] = [
      { id: 'x1', order: 1, type: 'LEARNING', title: 'Other', moduleId: null },
      { id: 'x2', order: 2, type: 'LEARNING', title: 'Other 2', moduleId: null },
      { id: 'copy', order: 3, type: 'LEARNING', title: 'B1', moduleId: null, sourceRefs: { lineageKey: 'beta/1' } },
    ];
    expect(numberingFor(indexCourseLessons(custom), 'copy')).toMatchObject({ session: 3, lessonIndex: 3, lessonTotal: 3 });
    expect(numberingFor(indexCourseLessons(rows), 'b1')).toMatchObject({ lessonIndex: 1 });
  });

  it('previous / next move between learning lessons and never into a test', () => {
    const idx = indexCourseLessons(rows);
    const nav = buildNavigation(idx, 'a2', (t) => ({ href: `/l/${t.id}`, locked: false }));
    expect(nav.prev?.lessonId).toBe('a1');
    expect(nav.next?.lessonId).toBe('b1'); // skips the stage test
  });
});

describe('cross-lesson references', () => {
  const md = 'Remember [Lesson 1](lumexa:lesson/alpha/1) and [Lesson 3](lumexa:lesson/beta/3), also [Lesson 9](lumexa:lesson/gamma/9).';
  const rows: CourseLessonRow[] = [
    { id: 'a1', order: 1, type: 'LEARNING', title: 'Intro', moduleId: 'ma', module: { id: 'ma', slug: 'alpha', title: 'Alpha', stageNumber: 1 } },
    { id: 'b1', order: 2, type: 'LEARNING', title: 'B1', moduleId: 'mb', module: { id: 'mb', slug: 'beta', title: 'Beta', stageNumber: 2 } },
    { id: 'b2', order: 3, type: 'LEARNING', title: 'B2', moduleId: 'mb', module: { id: 'mb', slug: 'beta', title: 'Beta', stageNumber: 2 } },
    { id: 'b3', order: 4, type: 'LEARNING', title: 'The one you want', moduleId: 'mb', module: { id: 'mb', slug: 'beta', title: 'Beta', stageNumber: 2 } },
  ];

  it('resolves each reference against THIS course, honouring the viewer’s access', () => {
    const idx = indexCourseLessons(rows);
    const refs = resolveLessonRefs([md], idx, 'b2', (t) => (t.id === 'b3' ? { href: null, locked: true } : { href: `/lesson/${t.id}`, locked: false }));
    expect(refs['alpha/1']).toMatchObject({ lessonId: 'a1', href: '/lesson/a1', locked: false });
    expect(refs['beta/3']).toMatchObject({ lessonId: 'b3', title: 'The one you want', href: null, locked: true }); // not unlocked yet
    expect(refs['gamma/9']).toBeNull(); // this course has no such lesson: stays plain text
  });

  it('keeps working after a lesson is copied into another course (lineage travels with it)', () => {
    const copied: CourseLessonRow[] = [
      { id: 'n1', order: 1, type: 'LEARNING', title: 'Beta lesson 3 copy', moduleId: null, sourceRefs: { lineageKey: 'beta/3' } },
      { id: 'n2', order: 2, type: 'LEARNING', title: 'Alpha lesson 1 copy', moduleId: null, sourceRefs: { lineageKey: 'alpha/1' } },
    ];
    const refs = resolveLessonRefs([md], indexCourseLessons(copied), 'n1', (t) => ({ href: `/curriculum-lesson/${t.id}`, locked: false }));
    expect(refs['beta/3']).toMatchObject({ lessonId: 'n1', current: true });
    expect(refs['alpha/1']).toMatchObject({ lessonId: 'n2', session: 2 });
  });

  it('turns module-relative "Lesson N" into links, but leaves ambiguous or out-of-range mentions as text', () => {
    const res = linkLessonReferences('In Lesson 2 we met loops. See Lessons 1-3. Lesson 40 is far away. `Lesson 2` in code stays.', { lineageModule: 'beta', moduleLessonCount: 8, selfPosition: 5 });
    expect(res.markdown).toContain('[Lesson 2](lumexa:lesson/beta/2)');
    expect(res.markdown).toContain('`Lesson 2`');
    expect(res.markdown).not.toContain('(lumexa:lesson/beta/40)');
    expect(res.linked).toBeGreaterThanOrEqual(1);
    expect(res.review.length).toBeGreaterThan(0); // the range and the out-of-range mention are reported, not guessed at
  });
});

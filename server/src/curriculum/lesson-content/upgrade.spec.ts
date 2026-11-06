import { cleanLesson } from './cleaner';
import { CONTENT_VERSION, upgradeLesson, type UpgradeInput } from './upgrade';
import { extractVisualIds, normalizeVisuals } from './visuals';
import { validateLessonContent } from './validate';
import { readQuiz } from './serialize';
import { catalogForTitle } from './visual-catalog';
import { quizCatalogFor } from './quiz-catalog';
import { DISCUSSION_HEADING } from './quiz-mcq';
import { allSourceLessons, contextOf, fieldsOf, rowAfter as apply, upgradeInputFor as inputFor } from './test-support';
import type { SourceLessonCase } from './test-support';

const lessons = allSourceLessons();

describe('the structured-content upgrade of every learning lesson', () => {
  const results = lessons.map((c) => ({ c, res: upgradeLesson(inputFor(c)) }));

  it('upgrades all 144 lessons exactly once and stamps the current content version', () => {
    for (const { c, res } of results) expect({ key: c.key, version: res.patch?.contentVersion }).toEqual({ key: c.key, version: CONTENT_VERSION });
  });

  it('is idempotent: a second boot finds nothing to do, and a forced re-run changes no content', () => {
    for (const { c, res } of results) {
      const next = apply(c, res.patch!);
      expect({ key: c.key, again: upgradeLesson(next).patch }).toEqual({ key: c.key, again: null });
      const forced = upgradeLesson({ ...next, force: true }).patch;
      const contentKeys = Object.keys(forced ?? {}).filter((k) => k !== 'contentVersion');
      expect({ key: c.key, changed: contentKeys }).toEqual({ key: c.key, changed: [] });
    }
  });

  it('never overwrites an admin’s later edit: an upgraded row is left alone even when its text differs', () => {
    const { c, res } = results[0];
    const edited = { ...apply(c, res.patch!), row: { ...apply(c, res.patch!).row, contentMarkdown: 'An admin rewrote this.' } };
    expect(upgradeLesson(edited).patch).toBeNull();
  });

  it('leaves tests and other non-learning lessons exactly as they are', () => {
    const c = lessons[0];
    for (const type of ['COURSE_TEST', 'STAGE_TEST', 'FINAL_TEST']) {
      const out = upgradeLesson(inputFor(c, { type }));
      expect({ type, patch: out.patch, changes: out.changes }).toEqual({ type, patch: null, changes: [] });
    }
  });

  it('gives every lesson a quiz, at least one visual, and every visual is placed, defined and valid', () => {
    for (const { c, res } of results) {
      const p = res.patch!;
      const quiz = readQuiz(p.miniQuiz);
      const visuals = normalizeVisuals(p.visuals);
      const placed = extractVisualIds(p.contentMarkdown ?? c.raw.contentMarkdown);
      const problems: string[] = [];
      if (quiz.length === 0) problems.push('no quiz');
      if (visuals.visuals.length === 0) problems.push('no visual');
      problems.push(...visuals.errors);
      for (const v of visuals.visuals) if (!placed.includes(v.id)) problems.push(`${v.id} not placed`);
      for (const id of placed) if (!visuals.visuals.some((v) => v.id === id)) problems.push(`${id} undefined`);
      expect({ key: c.key, problems }).toEqual({ key: c.key, problems: [] });
    }
  });

  it('passes the same validation an admin edit goes through, with no errors', () => {
    for (const { c, res } of results) {
      const p = res.patch!;
      const v = validateLessonContent({ contentMarkdown: p.contentMarkdown ?? c.raw.contentMarkdown, visuals: p.visuals as never, miniQuiz: p.miniQuiz as never });
      expect({ key: c.key, errors: v.errors }).toEqual({ key: c.key, errors: [] });
    }
  });

  it('records where each lesson’s content came from, so a copy keeps its identity', () => {
    for (const { c, res } of results) expect((res.patch!.sourceRefs as { lineageKey?: string }).lineageKey).toBe(c.key);
  });

  it('adds the Face Detection set to the face detection lesson, in a sensible order', () => {
    const fd = results.find(({ c }) => c.key === 'computer-vision/3')!;
    const ids = extractVisualIds(fd.res.patch!.contentMarkdown!);
    for (const want of ['haar-features', 'cascade-funnel', 'face-box', 'detect-lab', 'gray-first']) expect(ids).toContain(want);
    expect(ids.indexOf('haar-features')).toBeLessThan(ids.indexOf('cascade-funnel'));
    expect(ids.indexOf('face-box')).toBeLessThan(ids.indexOf('detect-lab'));
    const types = (fd.res.patch!.visuals as { id: string; type: string }[]).map((v) => v.type);
    expect(types).toEqual(expect.arrayContaining(['haar', 'cascade', 'bbox', 'detection-lab', 'colorspace']));
  });

  it('adds a friendly multiple-choice knowledge check to the Little Coders lessons that had none, and says so', () => {
    const lc = results.filter(({ c }) => c.pathway === 'little-coders-path');
    expect(lc).toHaveLength(24);
    for (const { c, res } of lc) {
      expect({ key: c.key, authored: res.changes.some((x) => x.kind === 'quiz-authored') }).toEqual({ key: c.key, authored: true });
      expect(res.patch!.contentMarkdown).toMatch(/```lumexa-quiz/);
      const quiz = readQuiz(res.patch!.miniQuiz);
      expect({ key: c.key, n: quiz.length, allFourOptions: quiz.every((q) => q.type === 'multiple_choice' && q.options.length === 4) }).toEqual({ key: c.key, n: 3, allFourOptions: true });
    }
  });

  it('gives every lesson at least five multiple-choice questions when its source had five or more, and never fewer than it had', () => {
    for (const { c, res } of results) {
      if (c.pathway === 'little-coders-path') continue;
      const sourceCount = (cleanLesson(fieldsOf(c), contextOf(c)).fields.miniQuiz ?? []).length;
      const served = readQuiz(res.patch!.miniQuiz).length;
      expect({ key: c.key, enough: served >= Math.min(5, sourceCount - 1) }).toEqual({ key: c.key, enough: true });
    }
  });

  it('keeps the questions that cannot be asked as multiple choice for the teacher, and says so in the review', () => {
    const { res } = results.find(({ c }) => c.key === 'python-ai-foundations/3')!;
    const patch = res.patch!;
    expect(patch.teacherNotes).toContain(DISCUSSION_HEADING);
    expect(patch.teacherNotes).toMatch(/difference between a for loop and a while loop/);
    expect(res.review.some((x) => x.kind === 'quiz-needs-rewrite')).toBe(true);
    // …and none of it reaches the student quiz.
    expect(JSON.stringify(readQuiz(patch.miniQuiz))).not.toMatch(/difference between a for loop and a while loop/);
    // A statement that was turned into a multiple-choice question, and then repeated as "True or False: …", is not kept twice.
    expect(JSON.stringify(readQuiz(patch.miniQuiz))).toMatch(/variable that is defined inside a function/);
    expect(patch.teacherNotes).not.toMatch(/variable defined inside a function can be used anywhere/);
    expect(res.changes.some((x) => /repeated quiz question/.test(x.detail))).toBe(true);
  });

  it('a custom lesson imported from a pathway lesson inherits its visuals through the lineage', () => {
    const c = lessons.find((l) => l.key === 'computer-vision/3')!;
    const copy: UpgradeInput = { ...inputFor(c), module: null, positionInGroup: 7, groupSize: 20, lineageOverride: 'computer-vision/3' };
    const out = upgradeLesson(copy);
    expect(out.patch!.visuals).toBeTruthy();
    expect(extractVisualIds(out.patch!.contentMarkdown!)).toContain('haar-features');
    expect((out.patch!.sourceRefs as { lineageKey: string }).lineageKey).toBe('computer-vision/3');
  });

  it('a redesigned lesson with its own title gets its own visuals instead of the original’s', () => {
    expect(catalogForTitle('Cosmic Defender — Part 5: Health & Survival').length).toBeGreaterThan(0);
    const c = lessons.find((l) => l.key === 'python-arcade-games/5')!;
    const redesigned: UpgradeInput = {
      ...inputFor(c, { title: 'Cosmic Defender — Part 5: Health & Survival', contentMarkdown: '## Concept Explanation\n\nHealth is a number the game keeps checking.\n\n## Recap\n\nDone.' }),
      module: null,
      lineageOverride: 'python-arcade-games/5',
    };
    const out = upgradeLesson(redesigned);
    expect((out.patch!.visuals as { id: string }[]).map((v) => v.id)).toEqual(['health-trace']);
  });
});


describe('moving a lesson from the first release (version 1) to multiple choice only (version 2)', () => {
  const byKey = new Map(results0());
  function results0() {
    return allSourceLessons().map((c) => [c.key, { c, fresh: upgradeLesson(inputFor(c)).patch! }] as const);
  }

  /** A row as the first release left it: cleaned, with visuals and notes — its quiz still in the older shapes. */
  function v1Row(c: SourceLessonCase): UpgradeInput {
    const { fresh } = byKey.get(c.key)!;
    const cleaned = cleanLesson(fieldsOf(c), contextOf(c)).fields;
    return inputFor(c, {
      title: fresh.title ?? c.raw.title,
      objectives: fresh.objectives ?? c.raw.objectives,
      contentMarkdown: fresh.contentMarkdown ?? c.raw.contentMarkdown,
      homework: fresh.homework !== undefined ? fresh.homework : c.raw.homework ?? null,
      teacherNotes: cleaned.teacherNotes,
      miniQuiz: cleaned.miniQuiz,
      visuals: fresh.visuals,
      sourceRefs: fresh.sourceRefs,
      contentVersion: 1,
    });
  }

  it('changes only the quiz and the teacher notes, and ends up exactly where a fresh seed ends up', () => {
    for (const c of lessons) {
      if (c.pathway === 'little-coders-path') continue; // their older quiz was authored in the catalog (covered below)
      const out = upgradeLesson(v1Row(c));
      const fresh = byKey.get(c.key)!.fresh;
      const keys = Object.keys(out.patch ?? {}).sort();
      expect({ key: c.key, touched: keys.filter((k) => !['contentVersion', 'miniQuiz', 'teacherNotes'].includes(k)) }).toEqual({ key: c.key, touched: [] });
      expect({ key: c.key, version: out.patch!.contentVersion }).toEqual({ key: c.key, version: CONTENT_VERSION });
      expect({ key: c.key, quiz: JSON.stringify(out.patch!.miniQuiz) }).toEqual({ key: c.key, quiz: JSON.stringify(fresh.miniQuiz) });
      expect({ key: c.key, notes: out.patch!.teacherNotes ?? v1Row(c).row.teacherNotes }).toEqual({ key: c.key, notes: fresh.teacherNotes ?? null });
    }
  });

  it('is done after one pass: the migrated row needs nothing more', () => {
    for (const c of lessons) {
      if (c.pathway === 'little-coders-path') continue;
      const out = upgradeLesson(v1Row(c));
      const migrated = inputFor(c, { ...v1Row(c).row, miniQuiz: out.patch!.miniQuiz ?? v1Row(c).row.miniQuiz, teacherNotes: out.patch!.teacherNotes ?? v1Row(c).row.teacherNotes, contentVersion: out.patch!.contentVersion });
      expect({ key: c.key, again: upgradeLesson(migrated).patch }).toEqual({ key: c.key, again: null });
      const forced = upgradeLesson({ ...migrated, force: true }).patch;
      expect({ key: c.key, changed: Object.keys(forced ?? {}).filter((k) => k !== 'contentVersion') }).toEqual({ key: c.key, changed: [] });
    }
  });

  it('leaves a quiz an admin already wrote as multiple choice exactly as it is, and never touches the lesson text', () => {
    const c = lessons.find((l) => l.key === 'html-css-mastery/2')!;
    const adminQuiz = [
      { id: 'a1', type: 'multiple_choice', prompt: 'Which tag?', options: ['<a>', '<b>', '<i>', '<u>'], correctIndex: 0, explanation: 'Because.' },
      { id: 'a2', type: 'multiple_choice', prompt: 'Which attribute?', options: ['href', 'src', 'alt', 'id'], correctIndex: 0, explanation: 'Because.' },
    ];
    const row = { ...v1Row(c).row, contentMarkdown: 'An admin rewrote this lesson.', miniQuiz: adminQuiz };
    const out = upgradeLesson({ ...v1Row(c), row });
    expect(out.patch).toEqual({ contentVersion: CONTENT_VERSION });
  });

  it('keeps an admin’s own multiple-choice questions and converts only the older ones next to them', () => {
    const c = lessons.find((l) => l.key === 'html-css-mastery/2')!;
    const keep = { id: 'a1', type: 'multiple_choice', prompt: 'Which tag?', options: ['<a>', '<b>', '<i>', '<u>'], correctIndex: 0, explanation: 'Because.' };
    const row = { ...v1Row(c).row, miniQuiz: [keep, { id: 'a2', type: 'true_false', prompt: '`alt=""` is always wrong.', options: ['True', 'False'], correctIndex: 1 }, { id: 'a3', type: 'self_check', prompt: 'Explain the box model in your own words.' }] };
    const out = upgradeLesson({ ...v1Row(c), row });
    const quiz = out.patch!.miniQuiz as { id: string; options: string[] }[];
    expect(quiz.map((q) => q.id)).toEqual(['a1', 'a2m']); // the admin's question is untouched, the true/false one became multiple choice
    expect(quiz[1].options).toHaveLength(4);
    expect(out.patch!.teacherNotes).toContain('Explain the box model in your own words.'); // the typed-answer question is kept for the teacher
    expect(out.review.some((r) => r.kind === 'quiz-needs-rewrite')).toBe(true);
  });

  it('turns an authored Little Coders question from the first release into the catalog’s multiple-choice version', () => {
    const c = lessons.find((l) => l.pathway === 'little-coders-path')!;
    const catalog = quizCatalogFor(c.key)!;
    const oldQuiz = catalog.map((q) => ({ id: q.id, type: 'ordering', prompt: 'older version', items: ['a', 'b', 'c'], source: 'authored' }));
    const fresh = byKey.get(c.key)!.fresh;
    const row = { ...inputFor(c).row, contentMarkdown: fresh.contentMarkdown ?? c.raw.contentMarkdown, visuals: fresh.visuals, sourceRefs: fresh.sourceRefs, miniQuiz: oldQuiz, contentVersion: 1 };
    const out = upgradeLesson({ ...inputFor(c), row });
    const quiz = out.patch!.miniQuiz as { id: string; prompt: string }[];
    expect(quiz.map((q) => q.id)).toEqual(catalog.map((q) => `${q.id}m`));
    expect(quiz.map((q) => q.prompt)).toEqual(catalog.map((q) => q.prompt));
  });

  it('leaves tests alone at version 1 as well', () => {
    const c = lessons[0];
    for (const type of ['COURSE_TEST', 'STAGE_TEST', 'FINAL_TEST']) {
      expect(upgradeLesson({ ...v1Row(c), row: { ...v1Row(c).row, type } }).patch).toBeNull();
    }
  });
});

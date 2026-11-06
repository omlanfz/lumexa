import { CONTENT_VERSION, upgradeLesson, type UpgradeInput } from './upgrade';
import { extractVisualIds, normalizeVisuals } from './visuals';
import { validateLessonContent } from './validate';
import { readQuiz } from './serialize';
import { catalogForTitle } from './visual-catalog';
import { allSourceLessons } from './test-support';
import type { SourceLessonCase } from './test-support';

const inputFor = (c: SourceLessonCase, over: Partial<UpgradeInput['row']> = {}): UpgradeInput => ({
  row: {
    id: `row-${c.key}`,
    title: c.raw.title,
    type: 'LEARNING',
    objectives: c.raw.objectives,
    contentMarkdown: c.raw.contentMarkdown,
    homework: c.raw.homework ?? null,
    teacherNotes: null,
    miniQuiz: null,
    visuals: null,
    contentVersion: 0,
    sourceRefs: null,
    duration: 60,
    ...over,
  },
  courseTitle: c.pathway,
  module: { slug: c.moduleSlug, title: c.moduleTitle },
  positionInGroup: c.position,
  groupSize: c.moduleSize,
  source: { teacherNotes: c.raw.teacherNotes ?? null, miniQuiz: (c.raw.miniQuiz ?? null) as never, moduleLessonCount: c.moduleSize },
});

/** What the database row looks like after a patch is written. */
const apply = (c: SourceLessonCase, patch: NonNullable<ReturnType<typeof upgradeLesson>['patch']>) =>
  inputFor(c, {
    title: patch.title ?? c.raw.title,
    objectives: patch.objectives ?? c.raw.objectives,
    contentMarkdown: patch.contentMarkdown !== undefined ? patch.contentMarkdown : c.raw.contentMarkdown,
    homework: patch.homework !== undefined ? patch.homework : c.raw.homework ?? null,
    teacherNotes: patch.teacherNotes ?? null,
    miniQuiz: patch.miniQuiz ?? null,
    visuals: patch.visuals ?? null,
    contentVersion: patch.contentVersion,
    sourceRefs: patch.sourceRefs ?? null,
  });

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

  it('adds a friendly knowledge check to the Little Coders lessons that had none, and says so', () => {
    const lc = results.filter(({ c }) => c.pathway === 'little-coders-path');
    expect(lc).toHaveLength(24);
    for (const { c, res } of lc) {
      expect({ key: c.key, authored: res.changes.some((x) => x.kind === 'quiz-authored') }).toEqual({ key: c.key, authored: true });
      expect(res.patch!.contentMarkdown).toMatch(/```lumexa-quiz/);
    }
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

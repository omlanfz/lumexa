import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ODYSSEY, buildPrograms, homeOrder, programMetaFor, resolveProgramId, DEFAULT_BLOCK_PRICE } from './programs.ts';
import { fullPayment, pricePerBlock } from './pricing.ts';
import { mergeProgramFacts, type Catalog, type CatalogCourse } from './catalog.ts';

const snapshot = JSON.parse(readFileSync(new URL('./catalog-snapshot.json', import.meta.url), 'utf8')) as Catalog;
const course = (slug: string): CatalogCourse => {
  const found = snapshot.courses.find((c) => c.slug === slug);
  assert.ok(found, `snapshot has ${slug}`);
  return found;
};
const withCourse = (patch: Partial<CatalogCourse> & { slug: string }, from: string): Catalog => ({
  ...snapshot,
  courses: snapshot.courses.map((c) => (c.slug === from ? { ...c, ...patch } : c)),
});

test('every active specialized program in the catalog gets a card, in parent order', () => {
  const { specialized, odyssey } = buildPrograms(snapshot);
  assert.equal(odyssey?.course.slug, 'lumexa-odyssey');
  assert.deepEqual(
    specialized.map((s) => s.meta.id),
    ['little', 'game', 'ai', 'web', 'data', 'advanced-data-science', 'digital'],
  );
  assert.deepEqual(
    homeOrder(specialized).map((s) => s.meta.id),
    ['game', 'ai', 'web', 'little', 'data', 'advanced-data-science', 'digital'],
  );
});

test('slugs with or without the retired "-path" suffix are the same program', () => {
  const plain = programMetaFor(course('game-creator'));
  const legacy = programMetaFor({ ...course('game-creator'), slug: 'game-creator-path' });
  assert.equal(plain.id, 'game');
  assert.equal(legacy.id, 'game');
  assert.equal(legacy.tagline, plain.tagline);
  assert.equal(legacy.blockPrice, plain.blockPrice);
});

test('titles and ages shown on a card come from the catalog', () => {
  const catalog = withCourse({ slug: 'little-coders', title: 'Little Coders', ageMin: 6, ageMax: 11 }, 'little-coders');
  const little = buildPrograms(catalog).specialized.find((s) => s.meta.id === 'little')!;
  assert.equal(little.meta.title, 'Little Coders');
  assert.equal(little.meta.ages, 'Ages 6–11');
});

test('Little Coders is five independent courses and 46 classes in the public catalog', () => {
  const little = course('little-coders');
  assert.equal(little.totalLessons, 46);
  assert.equal(little.learningLessons, 40);
  assert.equal(little.assessmentLessons, 6);
  assert.deepEqual(
    little.modules.map((m) => m.title),
    ['Scratch Adventures', 'Scratch Game Studio', 'AI for Kids: Smart Projects', 'Python Explorers', 'Python Creative Lab'],
  );
  for (const m of little.modules) {
    assert.equal(m.learningCount, 8, `${m.title} has eight lessons`);
    assert.equal(m.lessonCount, 9, `${m.title} ends with its course assessment`);
  }
  assert.deepEqual(little.closingAssessments.map((l) => l.type), ['FINAL_TEST']);
  assert.ok(!little.modules.some((m) => /Young Builders/i.test(m.title)), 'the retired course name is gone');
});

test('an admin re-slugging a program keeps its card, look and price', () => {
  const catalog = withCourse({ slug: 'ai-engineer-track' }, 'ai-builder');
  const programs = buildPrograms(catalog).specialized;
  const ai = programs.find((s) => s.course.slug === 'ai-engineer-track')!;
  assert.ok(ai, 'the card is still there');
  assert.equal(ai.meta.id, 'ai', 'recognised by its title');
  assert.equal(ai.meta.blockPrice, 7500);
  assert.equal(ai.meta.curriculumFile, 'ai-builder-path-curriculum.pdf');
  assert.equal(programs.length, 7);
});

test('a brand-new or fully renamed program still gets a working card', () => {
  const catalog = withCourse({ slug: 'robotics-lab', title: 'Robotics Lab', ageMin: 11, ageMax: 15 }, 'digital-independence');
  const programs = buildPrograms(catalog).specialized;
  const robotics = programs.find((s) => s.course.slug === 'robotics-lab')!;
  assert.equal(robotics.meta.id, 'robotics-lab');
  assert.equal(robotics.meta.title, 'Robotics Lab');
  assert.equal(robotics.meta.ages, 'Ages 11–15');
  assert.equal(robotics.meta.blockPrice, DEFAULT_BLOCK_PRICE);
  assert.equal(robotics.meta.curriculumFile, null, 'no curriculum PDF is offered');
  assert.ok(robotics.meta.color.startsWith('from-'));
  // Stable: the same program always gets the same colours.
  assert.equal(programMetaFor(robotics.course).color, robotics.meta.color);
  assert.equal(programs.at(-1)!.meta.id, 'robotics-lab', 'unlisted programs follow the known ones');
});

test('Advanced Data Science: beginner card with its own curriculum PDF', () => {
  const ads = programMetaFor(course('advanced-data-science'));
  assert.equal(ads.id, 'advanced-data-science');
  assert.equal(ads.title, 'Advanced Data Science');
  assert.equal(ads.ages, 'Ages 12–18');
  assert.equal(ads.curriculumFile, 'advanced-data-science-curriculum.pdf');
  assert.deepEqual(ads.badges.map((b) => b.label), ['Beginner friendly']);
  assert.equal(ads.mostPopular, false, 'AI Builder is the most popular program, not this one');
  assert.match(ads.tagline, /15\+ Real AI & Data Science Projects/);
});

test('Advanced Data Science costs the same as Data Scientist, 1:1 and batch', () => {
  const ads = programMetaFor(course('advanced-data-science'));
  const data = programMetaFor(course('data-scientist'));
  for (const format of ['private', 'batch'] as const) {
    assert.equal(pricePerBlock(ads, format), pricePerBlock(data, format));
  }
  assert.equal(pricePerBlock(ads, 'private'), 7500);
  assert.equal(pricePerBlock(ads, 'batch'), 4500);
  // Same rate per lesson, so the whole 46-lesson program is 46/8 blocks.
  assert.equal(fullPayment(ads, 'private', 46).regular, Math.round((7500 / 8) * 46));
});

test('?program= accepts the short id, the slug and the old "-path" slug', () => {
  const { all } = buildPrograms(snapshot);
  for (const value of ['ai', 'ai-builder', 'ai-builder-path']) assert.equal(resolveProgramId(value, all), 'ai');
  assert.equal(resolveProgramId('advanced-data-science', all), 'advanced-data-science');
  assert.equal(resolveProgramId('odyssey', all), 'odyssey');
  assert.equal(resolveProgramId('nope', all), null);
  assert.equal(resolveProgramId(null, all), null);
});

// ── Final ages and badges ───────────────────────────────────────────────────

const FINAL: Record<string, { ages: string; badges: string[]; popular: boolean }> = {
  'lumexa-odyssey': { ages: 'Ages 6–18', badges: ['Best choice for beginners', 'Suitable for all ages'], popular: false },
  'little-coders': { ages: 'Ages 6–12', badges: ['Complete beginner friendly', 'For first-time coders'], popular: false },
  'game-creator': { ages: 'Ages 6–12', badges: ['Beginner friendly'], popular: false },
  'ai-builder': { ages: 'Ages 12–18', badges: ['Most popular', 'Basic Python needed'], popular: true },
  'web-developer': { ages: 'Ages 12–18', badges: ['Beginner friendly'], popular: false },
  'data-scientist': { ages: 'Ages 12–18', badges: ['Basic Python needed'], popular: false },
  'advanced-data-science': { ages: 'Ages 12–18', badges: ['Beginner friendly'], popular: false },
  'digital-independence': { ages: 'Ages 15–18', badges: ['Best after a few projects'], popular: false },
};

test('every program shows its final age range and badges', () => {
  const { odyssey, specialized } = buildPrograms(snapshot);
  const metas = [odyssey!.meta, ...specialized.map((s) => s.meta)];
  assert.equal(metas.length, Object.keys(FINAL).length);
  for (const meta of metas) {
    const want = FINAL[meta.catalogSlug];
    assert.ok(want, `${meta.catalogSlug} is a known program`);
    assert.equal(meta.ages, want.ages, `${meta.title} ages`);
    assert.deepEqual(meta.badges.map((b) => b.label), want.badges, `${meta.title} badges`);
    assert.equal(meta.mostPopular, want.popular, `${meta.title} most popular`);
  }
  assert.deepEqual(
    metas.filter((m) => m.prerequisite).map((m) => m.id),
    ['ai', 'data'],
    'only AI Builder and Data Scientist need basic Python',
  );
});

test('the built-in Odyssey fallback matches the catalog while the live data is loading', () => {
  const live = course('lumexa-odyssey');
  assert.equal(ODYSSEY.ages, 'Ages 6–18');
  assert.deepEqual(ODYSSEY.badges, live.badges);
  assert.equal(ODYSSEY.audience, live.audience);
});

test('a catalog from an API that predates the badges borrows them from the snapshot', () => {
  const bare: Catalog = {
    ...snapshot,
    courses: snapshot.courses.map((c) => {
      const { badges, audience, prerequisite, mostPopular, ...rest } = c;
      void badges; void audience; void prerequisite; void mostPopular;
      // an older answer, with the retired "-path" spelling for one program
      return c.slug === 'ai-builder' ? { ...rest, slug: 'ai-builder-path' } : rest;
    }),
  };
  assert.equal(bare.courses.find((c) => c.slug === 'ai-builder-path')!.badges, undefined);
  const merged = mergeProgramFacts(bare, snapshot);
  const ai = merged.courses.find((c) => c.slug === 'ai-builder-path')!;
  assert.deepEqual(ai.badges!.map((b) => b.label), ['Most popular', 'Basic Python needed']);
  assert.equal(ai.prerequisite, 'Basic Python knowledge needed');
  // A program the snapshot does not know keeps no badges; one that already has them is left alone.
  const custom = mergeProgramFacts(
    { ...snapshot, courses: [{ ...course('game-creator'), slug: 'robotics-lab', badges: undefined }, course('ai-builder')] },
    snapshot,
  );
  assert.equal(custom.courses[0].badges, undefined);
  assert.equal(custom.courses[1], course('ai-builder'));
});

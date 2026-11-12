import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPrograms, homeOrder, programMetaFor, resolveProgramId, DEFAULT_BLOCK_PRICE } from './programs.ts';
import { fullPayment, pricePerBlock } from './pricing.ts';
import type { Catalog, CatalogCourse } from './catalog.ts';

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
  assert.equal(ads.beginner.ok, true);
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

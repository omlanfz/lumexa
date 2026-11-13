// The final ages, badges and prerequisites of every default program — pinned exactly as
// Operations specified them — and the guarantees around moving a stored database to them.

import { COURSE_CATALOG, storedFactsPatch } from './course-catalog.seed';
import { buildPublicCatalog } from './public-catalog.util';
import {
  PROGRAM_FACTS,
  ageLabel,
  factsBackfill,
  factsForCourse,
  publicFactsFor,
} from './program-facts';

const SPEC: Record<
  string,
  {
    ages: [number, number];
    badges: string[];
    prerequisite: string | null;
    mostPopular: boolean;
  }
> = {
  'lumexa-odyssey': {
    ages: [6, 18],
    badges: ['Best choice for beginners', 'Suitable for all ages'],
    prerequisite: null,
    mostPopular: false,
  },
  'little-coders': {
    ages: [6, 12],
    badges: ['Complete beginner friendly', 'For first-time coders'],
    prerequisite: null,
    mostPopular: false,
  },
  'game-creator': {
    ages: [6, 12],
    badges: ['Beginner friendly'],
    prerequisite: null,
    mostPopular: false,
  },
  'ai-builder': {
    ages: [12, 18],
    badges: ['Most popular', 'Basic Python needed'],
    prerequisite: 'Basic Python knowledge needed',
    mostPopular: true,
  },
  'web-developer': {
    ages: [12, 18],
    badges: ['Beginner friendly'],
    prerequisite: null,
    mostPopular: false,
  },
  'python-foundations': {
    ages: [12, 18],
    badges: ['Beginner friendly', 'No prior coding experience needed'],
    prerequisite: null,
    mostPopular: false,
  },
  'data-scientist': {
    ages: [12, 18],
    badges: ['Basic Python needed'],
    prerequisite: 'Basic Python knowledge needed',
    mostPopular: false,
  },
  'advanced-data-science': {
    ages: [12, 18],
    badges: ['Beginner friendly'],
    prerequisite: null,
    mostPopular: false,
  },
  'digital-independence': {
    ages: [15, 18],
    badges: ['Best after a few projects'],
    prerequisite: null,
    mostPopular: false,
  },
};

describe('program facts', () => {
  it('describes exactly the nine programs, with the agreed ages, badges and prerequisites', () => {
    expect(Object.keys(PROGRAM_FACTS).sort()).toEqual(Object.keys(SPEC).sort());
    for (const [slug, want] of Object.entries(SPEC)) {
      const f = PROGRAM_FACTS[slug];
      expect([f.ageMin, f.ageMax]).toEqual(want.ages);
      expect(f.badges.map((b) => b.label)).toEqual(want.badges);
      expect(f.prerequisite).toBe(want.prerequisite);
      expect(f.mostPopular).toBe(want.mostPopular);
    }
  });

  it('only AI Builder is the most popular program, and a prerequisite always has a badge', () => {
    expect(
      Object.values(PROGRAM_FACTS)
        .filter((f) => f.mostPopular)
        .map((f) => f.slug),
    ).toEqual(['ai-builder']);
    for (const f of Object.values(PROGRAM_FACTS)) {
      if (f.prerequisite)
        expect(f.badges.some((b) => b.tone === 'prerequisite')).toBe(true);
      if (f.mostPopular)
        expect(f.badges.some((b) => b.tone === 'popular')).toBe(true);
      expect(f.ageMin).toBeLessThan(f.ageMax);
    }
  });

  it('formats the age range', () => {
    expect(ageLabel(PROGRAM_FACTS['little-coders'])).toBe('Ages 6–12');
    expect(ageLabel(PROGRAM_FACTS['lumexa-odyssey'])).toBe('Ages 6–18');
    expect(ageLabel({ ageMin: 9, ageMax: 9 })).toBe('Age 9');
  });

  it('the seed creates every default program with the same ages and level', () => {
    for (const seed of COURSE_CATALOG) {
      const f = PROGRAM_FACTS[seed.slug];
      expect(f).toBeDefined();
      expect([seed.ageMin, seed.ageMax, seed.level]).toEqual([
        f.ageMin,
        f.ageMax,
        f.level,
      ]);
    }
  });

  it('finds a program by either slug spelling, or by title when an admin re-slugged it', () => {
    expect(factsForCourse({ slug: 'ai-builder-path' })?.slug).toBe(
      'ai-builder',
    );
    expect(
      factsForCourse({ slug: 'my-own-slug', title: 'Web Developer' })?.slug,
    ).toBe('web-developer');
    expect(factsForCourse({ slug: 'custom-for-nusrat', title: 'Nusrat' })).toBe(
      undefined,
    );
    expect(publicFactsFor({ slug: 'custom-for-nusrat' })).toEqual({
      badges: [],
      audience: null,
      prerequisite: null,
      mostPopular: false,
    });
  });
});

describe('moving a stored program to the final ages and level', () => {
  const OLD: Record<string, { ageMin: number; ageMax: number; level: string }> =
    {
      'lumexa-odyssey': { ageMin: 12, ageMax: 18, level: 'BEGINNER' },
      'little-coders': { ageMin: 6, ageMax: 11, level: 'BEGINNER' },
      'game-creator': { ageMin: 10, ageMax: 18, level: 'INTERMEDIATE' },
      'web-developer': { ageMin: 12, ageMax: 18, level: 'INTERMEDIATE' },
      'ai-builder': { ageMin: 12, ageMax: 18, level: 'INTERMEDIATE' },
      'data-scientist': { ageMin: 13, ageMax: 18, level: 'INTERMEDIATE' },
      'advanced-data-science': { ageMin: 6, ageMax: 18, level: 'BEGINNER' },
      'digital-independence': { ageMin: 15, ageMax: 18, level: 'ADVANCED' },
    };

  it('brings every previously seeded program to the final ages (and level) — and a second run changes nothing', () => {
    for (const [slug, stored] of Object.entries(OLD)) {
      const f = PROGRAM_FACTS[slug];
      const patch = factsBackfill(f, stored);
      const after = { ...stored, ...patch };
      expect([after.ageMin, after.ageMax]).toEqual([f.ageMin, f.ageMax]);
      expect(factsBackfill(f, after)).toEqual({});
    }
    // the programs whose ages changed
    expect(
      factsBackfill(PROGRAM_FACTS['lumexa-odyssey'], OLD['lumexa-odyssey']),
    ).toEqual({
      ageMin: 6,
      ageMax: 18,
    });
    expect(
      factsBackfill(PROGRAM_FACTS['little-coders'], OLD['little-coders']),
    ).toEqual({
      ageMin: 6,
      ageMax: 12,
      level: 'STARTER',
    });
    expect(
      factsBackfill(PROGRAM_FACTS['game-creator'], OLD['game-creator']),
    ).toEqual({
      ageMin: 6,
      ageMax: 12,
      level: 'BEGINNER',
    });
    expect(
      factsBackfill(PROGRAM_FACTS['data-scientist'], OLD['data-scientist']),
    ).toEqual({
      ageMin: 12,
      ageMax: 18,
    });
    expect(
      factsBackfill(PROGRAM_FACTS['web-developer'], OLD['web-developer']),
    ).toEqual({
      level: 'BEGINNER',
    });
    // unchanged programs stay untouched
    expect(
      factsBackfill(PROGRAM_FACTS['ai-builder'], OLD['ai-builder']),
    ).toEqual({});
    expect(
      factsBackfill(
        PROGRAM_FACTS['digital-independence'],
        OLD['digital-independence'],
      ),
    ).toEqual({});
  });

  it("never overwrites an administrator's own ages or level", () => {
    // Ages the admin set themselves (not a value the seed ever used) stay, whatever the facts say.
    expect(
      factsBackfill(PROGRAM_FACTS['game-creator'], {
        ageMin: 8,
        ageMax: 14,
        level: 'ADVANCED',
      }),
    ).toEqual({});
    // Only the part that still holds an old default moves.
    expect(
      factsBackfill(PROGRAM_FACTS['little-coders'], {
        ageMin: 5,
        ageMax: 11,
        level: 'BEGINNER',
      }),
    ).toEqual({ level: 'STARTER' });
    expect(
      factsBackfill(PROGRAM_FACTS['little-coders'], {
        ageMin: 6,
        ageMax: 11,
        level: 'INTERMEDIATE',
      }),
    ).toEqual({ ageMin: 6, ageMax: 12 });
  });

  it('refreshes the AI Builder description only while it is still the old seeded text', () => {
    const seed = COURSE_CATALOG.find((c) => c.slug === 'ai-builder')!;
    expect(seed.description).toContain('basic Python');
    const oldText =
      "A complete, project-driven journey from first line of Python to real machine learning, computer vision, and large language model applications. Students don't just learn about AI — they write the code, train the models, and ship three working portfolio projects. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.";
    const stored = { ageMin: 12, ageMax: 18, level: 'INTERMEDIATE' };
    expect(storedFactsPatch(seed, { ...stored, description: oldText })).toEqual(
      {
        description: seed.description,
      },
    );
    expect(
      storedFactsPatch(seed, { ...stored, description: 'Our own wording' }),
    ).toEqual({});
    expect(storedFactsPatch(seed, { ...stored, description: null })).toEqual(
      {},
    );
  });
});

describe('the public catalog carries the badges', () => {
  it('attaches the facts of each default program and nothing to an unknown one', () => {
    const courses = [
      { id: 'a', slug: 'ai-builder', title: 'AI Builder' },
      { id: 'b', slug: 'little-coders', title: 'Little Coders' },
      { id: 'c', slug: 'something-new', title: 'Something New' },
    ].map((c) => ({
      ...c,
      emoji: null,
      category: 'x',
      ageMin: 6,
      ageMax: 18,
    }));
    const catalog = buildPublicCatalog({ courses, modules: [], lessons: [] });
    const [ai, lc, other] = catalog.courses;
    expect(ai.mostPopular).toBe(true);
    expect(ai.prerequisite).toBe('Basic Python knowledge needed');
    expect(ai.badges.map((b) => b.label)).toEqual([
      'Most popular',
      'Basic Python needed',
    ]);
    expect(lc.badges.map((b) => b.tone)).toEqual(['starter', 'beginner']);
    expect(other.badges).toEqual([]);
    expect(other.audience).toBeNull();
  });
});

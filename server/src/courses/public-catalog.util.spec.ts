import {
  buildPublicCatalog,
  cleanLessonTitle,
  headingFromMarkdown,
  isGenericTitle,
  lessonIdsNeedingHeading,
  ODYSSEY_SLUG,
  type CatalogLessonRow,
  type CatalogModuleRow,
} from './public-catalog.util';

describe('cleanLessonTitle', () => {
  it.each([
    [
      'Course 13 · Python for Data — Lesson 1: Why Data Science Matters (Real Examples)',
      'Why Data Science Matters (Real Examples)',
    ],
    [
      'Course 15 · Lesson 4: Linear Regression From Scratch',
      'Linear Regression From Scratch',
    ],
    [
      'Course 18, Lesson 8: Measure, Reflect, and Improve',
      'Measure, Reflect, and Improve',
    ],
    [
      'Student Guide — Lesson 2: Training Your First Image Recognition Model',
      'Training Your First Image Recognition Model',
    ],
    [
      'Student Lesson — Your Professional Presence',
      'Your Professional Presence',
    ],
    [
      'Student Lesson: Marketplace Models — What Changes at Different Ages?',
      'Marketplace Models — What Changes at Different Ages?',
    ],
    ['— Game Design Fundamentals', 'Game Design Fundamentals'],
  ])('strips boilerplate from %s', (raw, expected) => {
    expect(cleanLessonTitle(raw)).toBe(expected);
  });

  it('leaves already-clean titles alone', () => {
    for (const title of [
      'Roblox Studio Setup and First Build',
      'Final Project — Build Your Own Game!',
      'CSS basics: colors, fonts, spacing',
      'Loops — Do It Again (and Again)!',
    ]) {
      expect(cleanLessonTitle(title)).toBe(title);
    }
  });
});

describe('isGenericTitle / headingFromMarkdown', () => {
  it('flags titles that only say "Lesson N" or repeat the course name', () => {
    expect(
      isGenericTitle(
        cleanLessonTitle('Course 14: Data Visualisation — Lesson 3'),
      ),
    ).toBe(true);
    expect(
      isGenericTitle(
        cleanLessonTitle('Course 14: Data Visualisation — Lesson 8 (Final)'),
      ),
    ).toBe(true);
    expect(
      isGenericTitle(
        cleanLessonTitle(
          'Course 18: Professional Presence & Opportunity Building',
        ),
        'Professional Presence & Opportunity Building',
      ),
    ).toBe(true);
    expect(isGenericTitle('Matplotlib: Line, Bar, Scatter Plots')).toBe(false);
  });

  it('reads the first ## heading, dropping a "Lesson N:" lead', () => {
    expect(
      headingFromMarkdown(
        '# Course 14 — Lesson 2\n## Matplotlib: Line, Bar, Scatter Plots\n\n### Goals',
      ),
    ).toBe('Matplotlib: Line, Bar, Scatter Plots');
    expect(
      headingFromMarkdown('# Course 18\n\n## Lesson 3: Showcase Your Work\n'),
    ).toBe('Showcase Your Work');
    expect(headingFromMarkdown('no headings here')).toBeNull();
    expect(headingFromMarkdown(null)).toBeNull();
  });
});

// ── Fixtures mirroring the seed's real shapes ───────────────────────────────

function makeModule(
  courseId: string,
  slug: string,
  order: number,
  stageNumber: number | null,
  firstOrder: number,
  titleOf: (i: number) => string = (i) => `${slug} lesson ${i}`,
) {
  const mod: CatalogModuleRow = {
    id: `${courseId}:${slug}`,
    courseId,
    slug,
    title: slug,
    order,
    stageNumber,
  };
  const lessons: CatalogLessonRow[] = [];
  for (let i = 1; i <= 8; i++) {
    lessons.push({
      id: `${mod.id}:${i}`,
      courseId,
      moduleId: mod.id,
      title: titleOf(i),
      order: firstOrder + i - 1,
      type: 'LEARNING',
    });
  }
  lessons.push({
    id: `${mod.id}:test`,
    courseId,
    moduleId: mod.id,
    title: `${slug} — Course Test`,
    order: firstOrder + 8,
    type: 'COURSE_TEST',
  });
  return { mod, lessons };
}

function specializedFixture(slug: string) {
  const modules: CatalogModuleRow[] = [];
  const lessons: CatalogLessonRow[] = [];
  for (let m = 0; m < 3; m++) {
    const built = makeModule(slug, `${slug}-m${m + 1}`, m + 1, null, m * 9 + 1);
    modules.push(built.mod);
    lessons.push(...built.lessons);
  }
  lessons.push({
    id: `${slug}:final`,
    courseId: slug,
    moduleId: null,
    title: `${slug} — Final Test`,
    order: 28,
    type: 'FINAL_TEST',
  });
  return { modules, lessons };
}

function odysseyFixture() {
  const modules: CatalogModuleRow[] = [];
  const lessons: CatalogLessonRow[] = [];
  let order = 1;
  let moduleOrder = 1;
  for (let stage = 1; stage <= 3; stage++) {
    for (let m = 0; m < 3; m++) {
      const built = makeModule(
        ODYSSEY_SLUG,
        `s${stage}m${m + 1}`,
        moduleOrder++,
        stage,
        order,
      );
      modules.push(built.mod);
      lessons.push(...built.lessons);
      order += 9;
    }
    lessons.push({
      id: `${ODYSSEY_SLUG}:stage${stage}`,
      courseId: ODYSSEY_SLUG,
      moduleId: null,
      title: `Stage ${stage} Test`,
      order: order++,
      type: 'STAGE_TEST',
    });
  }
  lessons.push({
    id: `${ODYSSEY_SLUG}:final`,
    courseId: ODYSSEY_SLUG,
    moduleId: null,
    title: 'Lumexa Odyssey — Final Test',
    order,
    type: 'FINAL_TEST',
  });
  return { modules, lessons };
}

describe('buildPublicCatalog', () => {
  const course = (slug: string, title: string) => ({
    id: slug,
    slug,
    title,
    emoji: null,
    category: title,
    ageMin: 6,
    ageMax: 18,
  });
  const ai = specializedFixture('ai-builder-path');
  const odyssey = odysseyFixture();
  const catalog = buildPublicCatalog({
    courses: [
      course(ODYSSEY_SLUG, 'Lumexa Odyssey'),
      course('ai-builder-path', 'AI Builder Path'),
    ],
    modules: [...odyssey.modules, ...ai.modules],
    lessons: [...odyssey.lessons, ...ai.lessons],
  });
  const byslug = (slug: string) =>
    catalog.courses.find((c) => c.slug === slug)!;

  it('counts every session, tests included, the way admin does', () => {
    const spec = byslug('ai-builder-path');
    expect(spec.totalLessons).toBe(28);
    expect(spec.learningLessons).toBe(24);
    expect(spec.assessmentLessons).toBe(4);
    expect(spec.modules).toHaveLength(3);
    expect(
      spec.modules.every((m) => m.lessonCount === 9 && m.learningCount === 8),
    ).toBe(true);
    expect(spec.kind).toBe('specialized');

    const od = byslug(ODYSSEY_SLUG);
    expect(od.totalLessons).toBe(85);
    expect(od.learningLessons).toBe(72);
    expect(od.assessmentLessons).toBe(13);
    expect(od.modules).toHaveLength(9);
    expect(od.kind).toBe('odyssey');
  });

  it('groups Odyssey into 3 stages, each closed by its own stage test', () => {
    const od = byslug(ODYSSEY_SLUG);
    expect(od.stages.map((s) => s.number)).toEqual([1, 2, 3]);
    for (const stage of od.stages) {
      expect(stage.modules).toHaveLength(3);
      expect(stage.assessments.map((a) => a.title)).toEqual([
        `Stage ${stage.number} Test`,
      ]);
    }
    expect(od.closingAssessments.map((a) => a.title)).toEqual([
      'Lumexa Odyssey — Final Test',
    ]);
  });

  it('does not stage specialized paths and tidies the final-test title', () => {
    const spec = byslug('ai-builder-path');
    expect(spec.stages).toEqual([]);
    expect(spec.closingAssessments).toEqual([
      { order: 28, type: 'FINAL_TEST', title: 'Final Test' },
    ]);
  });

  it('counts programs and courses across specialized paths only (Odyssey reuses the same 9)', () => {
    expect(catalog.totals).toEqual({ programs: 1, courses: 3 });
  });

  it('keeps lessons in course order', () => {
    const orders = byslug('ai-builder-path').modules.flatMap((m) =>
      m.lessons.map((l) => l.order),
    );
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('replaces generic titles using the lesson heading, only for the lessons that need it', () => {
    const built = makeModule(
      'dv',
      'data-visualisation',
      1,
      null,
      1,
      (i) => `Course 14: Data Visualisation — Lesson ${i}`,
    );
    const need = lessonIdsNeedingHeading([built.mod], built.lessons);
    expect(need).toHaveLength(8);
    expect(need).not.toContain(`${built.mod.id}:test`);

    const out = buildPublicCatalog({
      courses: [course('dv', 'DV Path')],
      modules: [built.mod],
      lessons: built.lessons,
      markdownByLessonId: new Map(
        need.map((id, i) => [id, `# x\n## Real Heading ${i + 1}\n`]),
      ),
    });
    expect(out.courses[0].modules[0].lessons[0].title).toBe('Real Heading 1');
    expect(out.courses[0].modules[0].lessons[8].type).toBe('COURSE_TEST');
  });
});

describe('buildPublicCatalog: programs built lesson by lesson (no modules)', () => {
  const row = (
    order: number,
    type: CatalogLessonRow['type'],
    title: string,
  ): CatalogLessonRow => ({
    id: `ads:${order}`,
    courseId: 'ads',
    moduleId: null,
    title,
    order,
    type,
  });

  // Two courses of 2 lessons + a Course Test each, then a Final Test.
  const lessons: CatalogLessonRow[] = [
    row(1, 'LEARNING', 'Hello, Python!'),
    row(2, 'LEARNING', 'Variables'),
    row(3, 'COURSE_TEST', 'Python for Young Builders — Course Test'),
    row(4, 'LEARNING', 'Game Loop'),
    row(5, 'LEARNING', 'Sprites'),
    row(6, 'COURSE_TEST', 'Python Arcade Games — Course Test'),
    row(7, 'FINAL_TEST', 'Data Scientist Path — Final Test'),
  ];
  const catalog = buildPublicCatalog({
    courses: [
      {
        id: 'ads',
        slug: 'advanced-data-science',
        title: 'Advanced Data Science',
        emoji: null,
        category: 'Advanced Data Science',
        ageMin: 12,
        ageMax: 18,
      },
    ],
    modules: [],
    lessons,
  });
  const ads = catalog.courses[0];

  it('turns each run of lessons ending in a Course Test into one course', () => {
    expect(ads.kind).toBe('specialized');
    expect(ads.modules.map((m) => m.title)).toEqual([
      'Python for Young Builders',
      'Python Arcade Games',
    ]);
    expect(ads.modules.map((m) => [m.lessonCount, m.learningCount])).toEqual([
      [3, 2],
      [3, 2],
    ]);
    expect(ads.modules.map((m) => m.slug)).toEqual(['course-1', 'course-2']);
  });

  it('keeps the totals and leaves only the final test as a closing assessment', () => {
    expect(ads.totalLessons).toBe(7);
    expect(ads.learningLessons).toBe(4);
    expect(ads.assessmentLessons).toBe(3);
    expect(ads.closingAssessments).toEqual([
      { order: 7, type: 'FINAL_TEST', title: 'Data Scientist — Final Test' },
    ]);
    expect(catalog.totals).toEqual({ programs: 1, courses: 2 });
  });

  it('puts untested trailing lessons in a last course', () => {
    const open = buildPublicCatalog({
      courses: [
        {
          id: 'ads',
          slug: 'custom-program',
          title: 'Custom Program',
          emoji: null,
          category: 'x',
          ageMin: 6,
          ageMax: 18,
        },
      ],
      modules: [],
      lessons: lessons.slice(0, 5),
    }).courses[0];
    expect(open.modules.map((m) => m.title)).toEqual([
      'Python for Young Builders',
      'Course 2',
    ]);
    expect(open.closingAssessments).toEqual([]);
  });

  it('never derives courses for a program that has real modules', () => {
    const real = buildPublicCatalog({
      courses: [
        {
          id: 'ads',
          slug: 'game-creator',
          title: 'Game Creator',
          emoji: null,
          category: 'x',
          ageMin: 10,
          ageMax: 18,
        },
      ],
      modules: [
        {
          id: 'm1',
          courseId: 'ads',
          slug: 'real-module',
          title: 'Real Module',
          order: 1,
          stageNumber: null,
        },
      ],
      lessons: [
        { ...row(1, 'LEARNING', 'One'), moduleId: 'm1' },
        { ...row(2, 'FINAL_TEST', 'Final Test') },
      ],
    }).courses[0];
    expect(real.modules.map((m) => m.slug)).toEqual(['real-module']);
  });

  it('drops the retired "Path" from a Final Test title', () => {
    const c = buildPublicCatalog({
      courses: [
        {
          id: 'x',
          slug: 'ai-builder',
          title: 'AI Builder',
          emoji: null,
          category: 'AI',
          ageMin: 12,
          ageMax: 18,
        },
      ],
      modules: [],
      lessons: [
        {
          id: 'x:1',
          courseId: 'x',
          moduleId: null,
          title: 'AI Builder Path — Final Test',
          order: 1,
          type: 'FINAL_TEST',
        },
      ],
    }).courses[0];
    expect(c.closingAssessments[0].title).toBe('AI Builder — Final Test');
  });
});

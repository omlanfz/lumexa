// The downloadable curriculum PDFs (server/prisma/curriculum-pdf): what they say must agree with the rest
// of the platform — the ages and badges of the program facts, the file names the website and the
// certificate email link to, and the real test formats — and every page must be built. The printing itself
// needs a browser and is checked by `npm run export:curriculum-pdfs` (which fails on any page that overflows).

import * as fs from 'fs';
import * as path from 'path';
import { PROGRAM_FACTS, factsForCourse } from './program-facts';
import { CURRICULUM_CATALOG } from '../certificates/curriculum-progression';
import { TEST_SHAPES } from '../assessments/bank/bank.constants';
import { PROGRAMS, problemsWith } from '../../prisma/curriculum-pdf/content';
import {
  LESSONS_PER_COURSE,
  ageRange,
  buildProgramHtml,
  expectedPageCount,
  totals,
} from '../../prisma/curriculum-pdf/pages';
import { snapshotSource } from '../../prisma/curriculum-pdf/snapshots';
import { THEMES } from '../../prisma/curriculum-pdf/theme';

const html = (slug: string): string => {
  const content = PROGRAMS.find((p) => p.slug === slug)!;
  const facts = factsForCourse({ slug })!;
  const snapshots: Record<string, string> = {};
  for (const c of content.courses)
    for (const s of c.snapshots)
      snapshots[s.id] = 'data:image/jpeg;base64,AAAA';
  return buildProgramHtml({
    content,
    facts,
    logo: 'data:image/png;base64,AAAA',
    snapshots,
  });
};

const count = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;
const decode = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

describe('the curriculum PDFs: the programs', () => {
  it('cover the eight programs, each with its own palette and file', () => {
    expect(PROGRAMS.map((p) => p.slug)).toEqual([
      'lumexa-odyssey',
      'little-coders',
      'game-creator',
      'ai-builder',
      'web-developer',
      'data-scientist',
      'advanced-data-science',
      'digital-independence',
    ]);
    expect(new Set(PROGRAMS.map((p) => p.themeKey)).size).toBe(8);
    expect(new Set(PROGRAMS.map((p) => p.fileName)).size).toBe(8);
    for (const p of PROGRAMS) expect(THEMES[p.themeKey]).toBeDefined();
    // every palette is genuinely different (the deep and main colours are the identity of a document)
    expect(
      new Set(
        PROGRAMS.map(
          (p) => `${THEMES[p.themeKey].deep}${THEMES[p.themeKey].main}`,
        ),
      ).size,
    ).toBe(8);
  });

  it('have complete, valid content', () => {
    expect(PROGRAMS.flatMap(problemsWith)).toEqual([]);
  });

  it('use the file names the website and the certificate email link to', () => {
    const clientPrograms = fs.readFileSync(
      path.join(__dirname, '../../../client/lib/programs.ts'),
      'utf8',
    );
    const linked = [...clientPrograms.matchAll(/curriculumFile:\s*"([^"]+)"/g)]
      .map((m) => m[1])
      .sort();
    expect(PROGRAMS.map((p) => p.fileName).sort()).toEqual(linked);
    for (const p of PROGRAMS) {
      const info = CURRICULUM_CATALOG[p.slug];
      // The seven programs a certificate can recommend attach their PDF to the email; Advanced Data Science is not one of them.
      expect(p.attachToCertificateEmail).toBe(!!info);
      if (info) expect(p.fileName).toBe(info.pdfFile);
    }
  });

  it('have a picture for every sample project', () => {
    for (const p of PROGRAMS)
      for (const c of p.courses)
        for (const s of c.snapshots)
          expect(() => snapshotSource(s.id)).not.toThrow();
  });

  it('count lessons and tests the way the platform does', () => {
    const t = Object.fromEntries(PROGRAMS.map((p) => [p.slug, totals(p)]));
    // 3 courses → 24 lessons + 3 course tests + 1 final test = 28 sessions; Odyssey 72 + 9 + 3 + 1 = 85; 5 courses 40 + 5 + 1 = 46
    for (const slug of [
      'game-creator',
      'ai-builder',
      'web-developer',
      'data-scientist',
      'digital-independence',
    ]) {
      expect(t[slug]).toMatchObject({
        courses: 3,
        lessons: 24,
        tests: 4,
        sessions: 28,
      });
    }
    expect(t['lumexa-odyssey']).toMatchObject({
      courses: 9,
      lessons: 72,
      courseTests: 9,
      stageTests: 3,
      tests: 13,
      sessions: 85,
    });
    expect(t['advanced-data-science']).toMatchObject({
      courses: 5,
      lessons: 40,
      tests: 6,
      sessions: 46,
    });
    expect(t['little-coders']).toMatchObject({
      courses: 5,
      lessons: 40,
      tests: 6,
      sessions: 46,
    });
    for (const p of PROGRAMS)
      expect(p.stats.map((s) => s.value)).toEqual([
        String(t[p.slug].courses),
        String(t[p.slug].lessons),
        String(t[p.slug].sessions),
      ]);
  });
});

describe('the curriculum PDFs: what a page says', () => {
  it.each(PROGRAMS.map((p) => [p.slug]))(
    '%s: has every page, the Lumexa logo on each, and the final ages and badges',
    (slug) => {
      const content = PROGRAMS.find((p) => p.slug === slug)!;
      const facts = PROGRAM_FACTS[slug];
      const out = html(slug);
      const pages = count(out, '<section class="page');
      expect(pages).toBe(expectedPageCount(content));
      expect(count(out, 'alt="Lumexa"')).toBe(pages); // the logo is in every page header
      // ages: the final range, in the chip, the stat card and the footers — and no older range
      const has = (needle: string): boolean => out.includes(needle);
      expect({
        what: `AGES ${ageRange(facts)}`,
        found: has(`AGES ${ageRange(facts)}`),
      }).toEqual({ what: `AGES ${ageRange(facts)}`, found: true });
      expect(has(`Ages ${ageRange(facts)}`)).toBe(true);
      for (const old of facts.replaces.ages)
        expect(has(`Ages ${old[0]}–${old[1]}`)).toBe(false);
      // badges and prerequisite, exactly as the website shows them
      for (const b of facts.badges)
        expect({
          badge: b.label,
          found: has(`chip ${b.tone}">${b.label.toUpperCase()}`),
        }).toEqual({ badge: b.label, found: true });
      if (facts.prerequisite) expect(has(facts.prerequisite)).toBe(true);
      expect(decode(out).includes(facts.audience)).toBe(true);
    },
  );

  it.each(PROGRAMS.map((p) => [p.slug]))(
    '%s: lists every course, every lesson and highlights the tests',
    (slug) => {
      const content = PROGRAMS.find((p) => p.slug === slug)!;
      const out = decode(html(slug));
      const has = (needle: string): boolean => out.includes(needle);
      for (const c of content.courses) {
        expect({ missing: c.title, found: has(c.title) }).toEqual({
          missing: c.title,
          found: true,
        });
        expect(c.lessons).toHaveLength(LESSONS_PER_COURSE);
        for (const l of c.lessons)
          expect({ missing: l, found: has(l) }).toEqual({
            missing: l,
            found: true,
          });
        expect({ missing: c.testTitle, found: has(c.testTitle) }).toEqual({
          missing: c.testTitle,
          found: true,
        });
      }
      expect(has('Level-Up Checkpoints')).toBe(true); // the highlighted assessment page
      expect(has('A TASTE OF A TEST')).toBe(true);
      expect(has('FINAL')).toBe(true);
      expect(
        has(`${totals(content).tests} ${totals(content).unit.toUpperCase()}`),
      ).toBe(true);
      // the hands-on project pictures: one per course page (two where a course has two), all present
      for (const c of content.courses)
        for (const s of c.snapshots)
          expect({ missing: s.title, found: has(s.title) }).toEqual({
            missing: s.title,
            found: true,
          });
    },
  );

  it('describes the real test formats', () => {
    const odyssey = decode(html('lumexa-odyssey'));
    const game = decode(html('game-creator'));
    const course = TEST_SHAPES.COURSE_TEST;
    const final = TEST_SHAPES.FINAL_TEST;
    const has = (doc: string, needle: string): boolean => doc.includes(needle); // (a failing toContain would print the whole document)
    for (const doc of [odyssey, game]) {
      // the big numbers of the test cards: 30 + 10 = 40 marks for a course test; 25 + 5 + a 20-mark project for the final test
      expect(
        has(
          doc,
          `<span class="v">${course.mcq}</span><span>multiple-choice questions`,
        ),
      ).toBe(true);
      expect(
        has(
          doc,
          `<span class="v">${course.trueFalse}</span><span>true / false questions`,
        ),
      ).toBe(true);
      expect(
        has(
          doc,
          `<span class="v">${course.mcq + course.trueFalse}</span><span>marks in total`,
        ),
      ).toBe(true);
      expect(
        has(
          doc,
          `<span class="v">${final.mcq}</span><span>multiple-choice questions`,
        ),
      ).toBe(true);
      expect(
        has(
          doc,
          `<span class="v">${final.trueFalse}</span><span>true / false questions`,
        ),
      ).toBe(true);
      expect(
        has(
          doc,
          `<span class="v">${final.codingMaxScore}</span><span>marks for one small practical project`,
        ),
      ).toBe(true);
      expect(has(doc, `${course.mcq} multiple-choice`)).toBe(true); // the chips on the course pages
    }
    // Odyssey is also tested after every stage
    expect(has(odyssey, 'STAGE TEST') && has(odyssey, 'Stage 3 Test')).toBe(
      true,
    );
    expect(has(game, 'STAGE TEST')).toBe(false);
    // Little Coders has its own 40-minute layout: 10 + 5 + a 25-mark practical
    const lc = decode(html('little-coders'));
    expect(has(lc, 'COURSE ASSESSMENT') && has(lc, 'FINAL ASSESSMENT')).toBe(
      true,
    );
    expect(has(lc, '25-mark project') && has(lc, '40 minutes')).toBe(true);
    expect(has(lc, '30 multiple-choice')).toBe(false);
  });

  it('uses each program’s own word for its tests', () => {
    for (const p of PROGRAMS) {
      const out = html(p.slug);
      const unit = totals(p).unit;
      expect(unit).toBe(p.slug === 'little-coders' ? 'assessments' : 'tests');
      const wrong = unit === 'tests' ? 'ASSESSMENTS' : 'TESTS';
      expect(
        out.includes(`HOW STUDENTS ARE TESTED · ${totals(p).tests} ${wrong}`),
      ).toBe(false);
      expect(
        out.includes(`${totals(p).tests} ${unit} along the way`) ||
          out.includes(`${totals(p).tests} ${unit} &nbsp;`),
      ).toBe(true);
    }
  });

  it('is HTML-safe: nothing from the content can break a page', () => {
    for (const p of PROGRAMS) {
      const out = html(p.slug);
      expect(out).not.toMatch(/<script/i);
      expect(count(out, '<section class="page')).toBe(count(out, '</section>'));
    }
  });
});

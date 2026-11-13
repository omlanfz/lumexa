import { cleanLesson } from './cleaner';
import { isBlank, isDivider, toLines, findHeadings, fenceMask, sectionRange } from './markdown';
import { contentTokens, comparable, textSimilarity } from './text';
import { allSourceLessons, contextOf, fieldsOf } from './test-support';

const lessons = allSourceLessons();
const cleaned = lessons.map((c) => ({ c, r: cleanLesson(fieldsOf(c), contextOf(c)) }));

const stripRefLinks = (s: string) => s.replace(/\[([^\]]*)\]\(lumexa:lesson\/[^)]*\)/g, '$1');
const headingTexts = (md: string | null) => {
  const lines = toLines(md ?? '');
  return findHeadings(lines, fenceMask(lines)).map((h) => comparable(h.text));
};

describe('cleanup engine over every shipped lesson', () => {
  it('covers all seven pathways (168 lessons) discovered from the data, not a hard-coded list', () => {
    expect(lessons.length).toBe(168);
    expect(new Set(lessons.map((l) => l.pathway)).size).toBe(7);
  });

  it('is idempotent: cleaning the result again changes nothing', () => {
    const notStable = cleaned.filter(({ c, r }) => {
      const again = cleanLesson(r.fields, contextOf(c));
      return again.changed || again.changes.length > 0;
    });
    expect(notStable.map(({ c }) => c.key)).toEqual([]);
  });

  it('leaves no duplicate Learning Objectives section behind', () => {
    for (const { c, r } of cleaned) {
      const heads = headingTexts(r.fields.contentMarkdown);
      const dup = heads.filter((h) => /^(learning objectives|what you will learn|what youll learn)$/.test(h));
      // Allowed only when it carries content the objectives list does not (flagged for review instead).
      if (dup.length > 0) expect({ key: c.key, flagged: r.review.some((x) => x.kind === 'objectives-ambiguous') }).toEqual({ key: c.key, flagged: true });
    }
  });

  it('leaves no Homework section that merely repeats the homework field', () => {
    for (const { c, r } of cleaned) {
      if (!r.fields.homework) continue;
      const lines = toLines(r.fields.contentMarkdown ?? '');
      const heads = findHeadings(lines, fenceMask(lines));
      heads.forEach((h, i) => {
        if (!/^(homework|homework practice mission|homework extension)\b/.test(comparable(h.text).replace(/^[^a-z]+/, ''))) return;
        const range = sectionRange(lines, heads, i);
        const body = lines.slice(h.line + 1, range.end).join('\n');
        // A different extension activity is legitimate content; a copy of the homework field is not.
        expect({ key: c.key, similarity: Math.round(textSimilarity(body, r.fields.homework!) * 10) / 10 < 0.8 }).toEqual({ key: c.key, similarity: true });
      });
    }
  });

  it('strips course / lesson-number prefixes from titles and never leaves a generic or empty title', () => {
    for (const { c, r } of cleaned) {
      expect(r.fields.title).not.toMatch(/^\s*[-–—]/);
      expect(r.fields.title).not.toMatch(/^Course\s+\d+\s*[·:-]/i);
      expect(r.fields.title).not.toMatch(/^Student Guide\s*[—–-]/i);
      expect(r.fields.title).not.toMatch(/\bLesson\s+\d+\s*:/i);
      expect(r.fields.title.trim().length).toBeGreaterThan(3);
      void c;
    }
  });

  it('derives accurate titles for the Data Visualisation lessons from their content', () => {
    const titles = cleaned.filter(({ c }) => c.moduleSlug === 'data-visualisation').map(({ r }) => r.fields.title);
    expect(titles).toHaveLength(8);
    expect(new Set(titles).size).toBe(8);
    expect(titles.join(' | ')).toMatch(/Matplotlib/);
    expect(titles.join(' | ')).toMatch(/Seaborn/);
    expect(titles.join(' | ')).toMatch(/Plotly/);
    expect(titles.join(' | ')).toMatch(/Dash/);
  });

  it('keeps teacher-only material out of the student-facing text', () => {
    const teacherHeading = /^(instructor guided coding|instructor guide|teacher notes|teacher guide|answer key|answers|reviewer notes|review notes)$/;
    for (const { c, r } of cleaned) {
      const heads = headingTexts(r.fields.contentMarkdown).map((h) => h.replace(/^[^a-z]+/, ''));
      expect({ key: c.key, leaked: heads.filter((h) => teacherHeading.test(h)) }).toEqual({ key: c.key, leaked: [] });
    }
  });

  it('moves instructor-guided coding into the teacher notes rather than deleting it', () => {
    const withGuide = lessons.filter((c) => /instructor[- ]guided coding/i.test(c.raw.contentMarkdown));
    expect(withGuide.length).toBeGreaterThan(0);
    for (const c of withGuide) {
      const r = cleaned.find((x) => x.c === c)!.r;
      expect(r.fields.contentMarkdown ?? '').not.toMatch(/instructor[- ]guided coding/i);
      expect(r.fields.teacherNotes ?? '').toMatch(/instructor[- ]guided coding|guided coding/i);
    }
  });

  it('never loses content: every substantive source line is still somewhere in the result', () => {
    let checked = 0;
    const lost: string[] = [];
    for (const { c, r } of cleaned) {
      const hay = new Set<string>();
      const add = (s: string | null | undefined) => contentTokens(stripRefLinks(s ?? '')).forEach((t) => hay.add(t));
      add(r.fields.contentMarkdown);
      add(r.fields.teacherNotes);
      add(r.fields.objectives.join('\n'));
      add(r.fields.homework);
      add(r.fields.title);
      add(JSON.stringify(r.fields.miniQuiz ?? []));
      for (const ch of r.changes) add(ch.excerpt);
      for (const line of toLines(c.raw.contentMarkdown)) {
        if (isBlank(line) || isDivider(line)) continue;
        const toks = contentTokens(stripRefLinks(line));
        if (toks.length < 3) continue;
        checked++;
        const missing = toks.filter((t) => !hay.has(t));
        if (missing.length / toks.length > 0.34) lost.push(`${c.key}: ${line.slice(0, 90)}`);
      }
    }
    expect(checked).toBeGreaterThan(10000);
    // The only lines allowed to disappear are the quiz section headings/instructions that became the interactive quiz.
    const unexplained = lost.filter((l) => !/quiz|knowledge check|check your understanding|answer|question|score|circle|choose|pick/i.test(l));
    expect(unexplained).toEqual([]);
    expect(lost.length).toBeLessThan(40);
  });

  it('extracts the text quizzes into structured questions without leaving an answer key in the lesson', () => {
    const withQuiz = cleaned.filter(({ r }) => (r.fields.miniQuiz?.length ?? 0) > 0);
    expect(withQuiz.length).toBeGreaterThan(100);
    for (const { c, r } of withQuiz) {
      const lines = toLines(r.fields.contentMarkdown ?? '');
      const mask = fenceMask(lines);
      const labelled = lines.filter((l, i) => !mask[i] && /^\s*(?:#{1,6}\s+|\*\*|__)(?:quiz\s+)?answer key\b|^\s*(?:quiz\s+)?answer key\s*:/i.test(l));
      expect({ key: c.key, leftover: labelled }).toEqual({ key: c.key, leftover: [] });
      expect(r.fields.contentMarkdown).toMatch(/```lumexa-quiz/);
      for (const q of r.fields.miniQuiz!) {
        expect(q.prompt.trim().length).toBeGreaterThan(2);
        if ('options' in q) {
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan(q.options.length);
        }
      }
    }
  });

  it('numbers lessons as "Lesson N of M" within a module in cross references', () => {
    const linked = cleaned.filter(({ r }) => r.changes.some((x) => x.kind === 'refs-linked'));
    expect(linked.length).toBeGreaterThan(5);
    for (const { c, r } of linked) {
      const all = [r.fields.contentMarkdown, r.fields.teacherNotes, r.fields.homework, r.fields.objectives.join('\n'), JSON.stringify(r.fields.miniQuiz)].join('\n');
      const refs = all.match(/lumexa:lesson\/[a-z0-9-]+\/\d{1,3}/g) ?? [];
      expect({ key: c.key, found: refs.length > 0 }).toEqual({ key: c.key, found: true });
      for (const ref of refs) {
        const m = ref.match(/lumexa:lesson\/([a-z0-9-]+)\/(\d{1,3})/)!;
        expect({ key: c.key, moduleKnown: lessons.some((l) => l.moduleSlug === m[1]) }).toEqual({ key: c.key, moduleKnown: true });
        expect(Number(m[2])).toBeGreaterThanOrEqual(1);
        expect(Number(m[2])).toBeLessThanOrEqual(8);
      }
    }
  });
});

describe('cleanup engine behaviours', () => {
  const base = { title: 'Lesson', objectives: [], contentMarkdown: '', homework: null, teacherNotes: null, miniQuiz: null, visuals: null };
  const ctx = { courseTitle: 'AI Builder Path', moduleTitle: 'Computer Vision Projects', duration: 60, positionInModule: 3, moduleLessonCount: 8, lineageModule: 'computer-vision' };

  it('removes the redundant course / lesson-number / duration banner and keeps the real content', () => {
    const md = '# Lumexa Mission Log: Python AI Foundations\n\n**Course/Path:** Python & AI Foundations\n**Lesson:** 05 of 08\n**Title:** Introduction to Machine Learning Concepts\n**Duration:** 60 minutes\n**Difficulty:** Intermediate\n\n---\n\n## Mission Brief\n\nHello there, this is the real content of the lesson.';
    const r = cleanLesson({ ...base, contentMarkdown: md }, { ...ctx, courseTitle: 'AI Builder Path', moduleTitle: 'Python and AI Foundations', positionInModule: 5, lineageModule: 'python-ai-foundations' });
    expect(r.fields.contentMarkdown).toContain('Mission Brief');
    expect(r.fields.contentMarkdown).toContain('real content of the lesson');
    expect(r.fields.contentMarkdown).not.toMatch(/Mission Log|Course\/Path|Duration:|\*\*Lesson:\*\*/);
  });

  it('removes an objectives section that repeats the objectives field, but keeps one that adds something', () => {
    const same = cleanLesson({ ...base, objectives: ['Explain what a loop is', 'Write a for loop'], contentMarkdown: '## Intro\n\nText here.\n\n## Learning Objectives\n\n- Explain what a loop is\n- Write a for loop\n\n## Body\n\nMore text.' }, ctx);
    expect(same.fields.contentMarkdown).not.toMatch(/Learning Objectives/);
    expect(same.fields.objectives).toEqual(['Explain what a loop is', 'Write a for loop']);
    const extra = cleanLesson({ ...base, objectives: ['Explain what a loop is'], contentMarkdown: '## Intro\n\nText.\n\n## Learning Objectives\n\n- Explain what a loop is\n- Debug an infinite loop in a short program\n\n## Body\n\nMore.' }, ctx);
    expect(extra.fields.objectives.join(' ')).toMatch(/infinite loop/);
  });

  it('never alters a fenced code block, even one that looks like a heading or an answer key', () => {
    const md = '## Code\n\n```python\n# Learning Objectives\nprint("Answer Key")\n## Homework\n```\n\nDone.';
    const r = cleanLesson({ ...base, contentMarkdown: md }, ctx);
    expect(r.fields.contentMarkdown).toContain('# Learning Objectives\nprint("Answer Key")\n## Homework');
  });
});

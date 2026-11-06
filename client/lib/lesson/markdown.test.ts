import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifySection,
  codeAlreadyInText,
  extractFencedBlocks,
  extractVisualIds,
  normalizeHeadingsFrom,
  stripLeadingH1,
  dedupeForRender,
  extractHeadings,
  hasQuizBlock,
  refKeyFromHref,
  safeMediaSrc,
  safeUrl,
  splitSections,
} from './markdown';

const ctx = { title: 'Python Setup and First Program', objectives: ['Explain what Python is.', 'Install Python.', 'Run a file.'], homework: null as string | null, hideAnswerKeys: true };

describe('extractHeadings', () => {
  it('finds headings outside fences only, with unique ASCII ids', () => {
    const md = ['## Intro', '```python', '# not a heading', '## also not', '```', '## Intro', '### 🚀 Café time!', '#### Deep'].join('\n');
    const h = extractHeadings(md);
    assert.deepEqual(h.map((x) => x.id), ['intro', 'intro-2', 'cafe-time', 'deep']);
    assert.deepEqual(h.map((x) => x.level), [2, 2, 3, 4]);
    for (const x of h) assert.match(x.id, /^[a-z0-9][a-z0-9-]{0,59}$/);
  });

  it('strips Markdown syntax from heading text', () => {
    assert.equal(extractHeadings('## **Bold** and `code` and [link](https://x.dev)')[0].text, 'Bold and code and link');
  });

  it('never yields an empty id', () => {
    assert.equal(extractHeadings('## 🎮🎮')[0].id, 'section');
  });
});

describe('splitSections', () => {
  const md = ['Intro paragraph.', '', '## Mission Brief', 'text', '', '## Prerequisites', '- a', '', '## Knowledge Check', '', '```lumexa-quiz', '```', '', '## Lesson Recap', 'bye'].join('\n');

  it('splits at H2 and keeps the intro', () => {
    const r = splitSections(md);
    assert.equal(r.intro.trim(), 'Intro paragraph.');
    assert.deepEqual(r.sections.map((s) => s.title), ['Mission Brief', 'Prerequisites', 'Knowledge Check', 'Lesson Recap']);
    assert.ok(r.sections[0].markdown.startsWith('## Mission Brief'));
  });

  it('marks the section that holds the quiz block', () => {
    const r = splitSections(md);
    assert.deepEqual(r.sections.map((s) => s.hasQuizBlock), [false, false, true, false]);
    assert.equal(hasQuizBlock(md), true);
    assert.equal(hasQuizBlock('## x\ntext'), false);
  });

  it('a document with no H2 is all intro', () => {
    const r = splitSections('just text\n\n### only h3');
    assert.equal(r.sections.length, 0);
  });

  it('keeps sections out of fenced code', () => {
    const r = splitSections('## A\n```\n## not a section\n```\n## B');
    assert.deepEqual(r.sections.map((s) => s.title), ['A', 'B']);
  });
});

describe('classifySection', () => {
  it('collapses only supplementary material', () => {
    for (const t of ['Prerequisites', 'Key Vocabulary', 'Key Terms', 'Key Terminology', 'Common Mistakes', 'Debugging Tips', '⭐ Bonus Challenge', 'Experiment/Extension', '🔍 New words you learned']) {
      assert.equal(classifySection(t), 'supplementary', t);
    }
    for (const t of ['Mission Brief', 'Concept Explanation', 'Code Example: Your First Mission Script', 'Student Mission / Guided Challenge', 'Lesson Recap', 'Knowledge Check', 'Guided Practice', 'Why It Matters', 'Key Concepts']) {
      assert.equal(classifySection(t), 'core', t);
    }
  });
});

describe('safeUrl', () => {
  it('allows ordinary addresses', () => {
    for (const u of ['https://example.com/a?b=1#c', 'http://example.com', 'mailto:a@b.co', '/lesson/abc', '#section', 'lumexa:lesson/python-ai-foundations/3', 'docs/page.html']) {
      assert.equal(safeUrl(u), u, u);
    }
  });

  it('blocks script-bearing and protocol-relative addresses, however disguised', () => {
    for (const u of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:msgbox(1)', '//evil.example', 'file:///etc/passwd', 'lumexa:lesson/../../x', 'lumexa:other/thing']) {
      assert.equal(safeUrl(u), '', JSON.stringify(u));
    }
  });

  it('handles empty input', () => {
    assert.equal(safeUrl(''), '');
    assert.equal(safeUrl(undefined), '');
    assert.equal(safeUrl(null), '');
  });
});

describe('safeMediaSrc / refKeyFromHref', () => {
  it('allows https and this app\'s own assets only', () => {
    assert.equal(safeMediaSrc('https://cdn.example.com/a.png'), 'https://cdn.example.com/a.png');
    assert.equal(safeMediaSrc('/lesson-assets/haar.svg'), '/lesson-assets/haar.svg');
    for (const bad of ['http://x.com/a.png', '/other/a.png', '/lesson-assets/../secret', 'data:image/png;base64,AAAA', 'javascript:alert(1)', '/lesson-assets/a b.png']) {
      assert.equal(safeMediaSrc(bad), '', bad);
    }
  });

  it('reads lesson reference keys', () => {
    assert.equal(refKeyFromHref('lumexa:lesson/computer-vision/4'), 'computer-vision/4');
    assert.equal(refKeyFromHref('https://x.dev'), null);
    assert.equal(refKeyFromHref('lumexa:lesson/Bad Key/4'), null);
  });
});

describe('dedupeForRender', () => {
  it('is a no-op (the very same string) when there is nothing to remove', () => {
    const md = '## Mission Brief\n\nHello.\n\n## Recap\n\nBye.';
    assert.equal(dedupeForRender(md, ctx).markdown, md);
    assert.deepEqual(dedupeForRender(md, ctx).removed, []);
  });

  it('removes a title banner and the metadata the page shows from the database', () => {
    const md = ['# Course 14: Data Visualisation — Lesson 1', '', '**Course/Path:** Python', '**Lesson:** 01 of 08', '**Duration:** 60 minutes', '**Difficulty:** Beginner', '', '---', '', '## Mission Brief', 'Go.'].join('\n');
    const out = dedupeForRender(md, { ...ctx, title: 'Anything' }).markdown;
    assert.ok(!out.includes('Course 14'));
    assert.ok(!out.includes('Course/Path'));
    assert.ok(!out.includes('Duration'));
    assert.ok(out.includes('**Difficulty:** Beginner'), 'difficulty is not shown from the database, so it stays');
    assert.ok(out.includes('## Mission Brief'));
  });

  it('removes an objectives section that repeats the card — even reworded', () => {
    const same = '## Learning Objectives\n\nBy the end of this lesson, students will be able to:\n\n1. Explain what Python is.\n2. Install Python.\n3. Run a file.\n\n## Next\ntext';
    assert.ok(!dedupeForRender(same, ctx).markdown.includes('Learning Objectives'));
    const reworded = '## Learning Objectives\n- Describe what Python is.\n- Install Python on your computer.\n- Run a Python file.\n\n## Next\ntext';
    assert.ok(!dedupeForRender(reworded, ctx).markdown.includes('Learning Objectives'));
  });

  it('keeps an objectives-looking section that holds different content', () => {
    const md = '## Learning Objectives\n- Build a rocket engine.\n- Plan a mission to Mars.\n- Pilot the shuttle.\n\n## Next\ntext';
    assert.ok(dedupeForRender(md, ctx).markdown.includes('Learning Objectives'));
  });

  it('removes a verbatim homework copy but keeps a distinct extension activity', () => {
    const homework = '**Solo Mission**\n\n1. Print a banner.\n2. Add a comment.';
    const dup = '## Homework / Extension Mission\n\n**Solo Mission**\n\n1. Print a banner.\n2. Add a comment.\n\n## Portfolio\nx';
    const a = dedupeForRender(dup, { ...ctx, homework }).markdown;
    assert.ok(!a.includes('Homework'), a);
    assert.ok(a.includes('## Portfolio'));
    const distinct = '## Homework / Extension\n\nFind two more charts and score them.\n\n## Portfolio\nx';
    assert.ok(dedupeForRender(distinct, { ...ctx, homework }).markdown.includes('Find two more charts'));
  });

  it('removes answer keys (heading or inline) for learners', () => {
    const md = '## Mini Quiz\n\n1. Q?\n\n### Answer Key\n\n1. a\n\n## Recap\nok\n\n**Answer Key:** 1-b, 2-c';
    const out = dedupeForRender(md, ctx).markdown;
    assert.ok(!/answer key/i.test(out), out);
    assert.ok(out.includes('## Recap'));
    assert.ok(dedupeForRender(md, { ...ctx, hideAnswerKeys: false }).markdown.includes('Answer Key'));
  });

  it('demotes a stray H1 so the page title is the only H1', () => {
    const out = dedupeForRender('# Something odd\n\ntext\n\n## Real section', { ...ctx, title: 'Unrelated Title' }).markdown;
    assert.ok(!/^# /m.test(out), out);
  });

  it('never alters fenced code', () => {
    const md = '## Code\n\n```markdown\n# Learning Objectives\n**Answer Key:** 1-b\n## Homework\n```\n\n## Next\nx';
    assert.equal(dedupeForRender(md, ctx).markdown, md);
  });

  it('is idempotent', () => {
    const md = ['# Lesson 1: Python Setup and First Program', '', '**Lesson:** 01', '', '## Learning Objectives', '- Explain what Python is.', '- Install Python.', '- Run a file.', '', '## Concept', 'text'].join('\n');
    const once = dedupeForRender(md, ctx).markdown;
    assert.equal(dedupeForRender(once, ctx).markdown, once);
  });
});

describe('lesson view helpers', () => {
  it('extracts fenced code and recognises code already in the text', () => {
    const md = 'x\n\n```python\nprint("hi")\nprint("there")\n```\n\n~~~\nplain\n~~~';
    const blocks = extractFencedBlocks(md);
    assert.deepEqual(blocks, ['print("hi")\nprint("there")', 'plain']);
    assert.equal(codeAlreadyInText('print("hi")\n  print("there")', blocks), true);
    assert.equal(codeAlreadyInText('something_else()', blocks), false);
  });

  it('strips a leading H1 only', () => {
    assert.equal(stripLeadingH1('# Lesson 1 Challenges\n\n## Mini\ntext'), '## Mini\ntext');
    assert.equal(stripLeadingH1('Intro\n\n# Later'), 'Intro\n\n# Later');
  });

  it('lowers headings beneath a card heading, keeping their relative depth', () => {
    assert.equal(normalizeHeadingsFrom('## A\n### B', 3), '### A\n#### B');
    assert.equal(normalizeHeadingsFrom('# A\n## B', 3), '### A\n#### B');
    assert.equal(normalizeHeadingsFrom('no headings', 3), 'no headings');
    assert.equal(normalizeHeadingsFrom('```\n# not a heading\n```', 3), '```\n# not a heading\n```');
  });
});

describe('extractVisualIds', () => {
  it('lists the visuals placed in the text, in order', () => {
    const md = 'a\n\n```lumexa-visual\nhaar-features\n```\n\ntext\n\n```lumexa-visual\nbbox\n```\n\n```python\nlumexa-visual\n```';
    assert.deepEqual(extractVisualIds(md), ['haar-features', 'bbox']);
    assert.deepEqual(extractVisualIds(null), []);
  });
});

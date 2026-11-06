import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import LessonMarkdown from './LessonMarkdown';
import { LessonRenderContext } from './LessonContext';
import type { LessonLink } from '@/lib/lesson/types';

const html = (md: string) => renderToStaticMarkup(<LessonMarkdown markdown={md} />);
const has = (h: string, s: string | RegExp) => (typeof s === 'string' ? h.includes(s) : s.test(h));

describe('headings', () => {
  it('renders a proper hierarchy and never a second H1', () => {
    const h = html('# Stray\n\n## Two\n\n### Three\n\n#### Four');
    assert.ok(!has(h, '<h1'), h);
    assert.equal((h.match(/<h2/g) ?? []).length, 2, 'the stray H1 becomes an H2');
    assert.ok(has(h, '<h3'));
    assert.ok(has(h, '<h4'));
  });

  it('gives headings the ids the table of contents links to', () => {
    const ids = new Map([[0, 'two']]);
    const h = renderToStaticMarkup(<LessonMarkdown markdown="## Two" headingIds={ids} />);
    assert.ok(has(h, 'id="two"'));
    assert.ok(has(h, 'href="#two"'));
  });
});

describe('text structure', () => {
  it('renders semantic numbered, bulleted and task lists', () => {
    const h = html('1. one\n2. two\n\nbetween\n\n- a\n- b\n  - nested\n\nthen\n\n- [x] done\n- [ ] todo');
    assert.ok(has(h, /<ol[^>]*>\s*<li>one<\/li>\s*<li>two<\/li>/), 'a numbered list is an <ol>');
    assert.ok(has(h, /<ul[^>]*>\s*<li>a<\/li>\s*<li>b/), 'a bulleted list is a <ul>');
    assert.ok(has(h, /<ul>\s*<li>nested<\/li>/), 'nesting is preserved');
    assert.equal((h.match(/type="checkbox"/g) ?? []).length, 2);
    assert.ok(has(h, 'disabled'), 'task boxes are read-only');
  });

  it('renders bold, italic, strike-through, dividers and blockquotes', () => {
    const h = html('**bold** and *italic* and ~~gone~~\n\n---\n\n> quoted words');
    assert.ok(has(h, '<strong>bold</strong>'));
    assert.ok(has(h, '<em>italic</em>'));
    assert.ok(has(h, '<del>gone</del>'));
    assert.ok(has(h, '<hr class="lesson-hr"'));
    assert.ok(has(h, /<blockquote>[\s\S]*quoted words/));
  });

  it('renders tables inside a horizontally scrolling wrapper', () => {
    const h = html('| Term | Meaning |\n|---|---|\n| **Loop** | repeats |\n| `if` | decides |');
    assert.ok(has(h, 'lesson-table-wrap'));
    assert.ok(has(h, /<th[^>]*>Term<\/th>/));
    assert.ok(has(h, '<strong>Loop</strong>'));
    assert.ok(has(h, 'tabindex="0"'), 'a scrollable region must be keyboard reachable');
  });
});

describe('code', () => {
  it('highlights fenced code and wraps it with a language label and copy button', () => {
    const h = html('```python\ndef greet(name):\n    return "hi " + name\n```');
    assert.ok(has(h, 'lesson-code'));
    assert.ok(has(h, '>Python<'));
    assert.ok(has(h, 'Copy code'));
    assert.ok(has(h, 'hljs-keyword'), 'syntax is highlighted');
    assert.ok(has(h, 'hljs-string'));
    assert.ok(has(h, 'tabindex="0"'), 'the code scrolls on its own and is focusable');
  });

  it('renders inline code differently from blocks, and unlabelled blocks safely', () => {
    const h = html('Use `print()` here.\n\n```\nplain output\n```');
    assert.ok(has(h, 'class="lesson-inline-code"'));
    assert.ok(has(h, 'plain output'));
    assert.ok(has(h, '>Output<') || has(h, '>Code<'));
  });

  it('shows literal HTML teaching examples as text — never executed, never hidden', () => {
    const h = html('```html\n<header>\n  <img src="logo.png" alt="Logo">\n</header>\n<section>Hi</section>\n```');
    assert.ok(!has(h, '<header>'), 'must not become a real element');
    assert.ok(!has(h, '<section>Hi'), 'must not become a real element');
    assert.ok(has(h, /&lt;/), 'angle brackets are escaped');
    assert.ok(has(h, 'header') && has(h, 'logo.png') && has(h, 'section'), 'all of it is visible');
  });

  it('shows raw HTML in running text literally rather than running or dropping it', () => {
    const h = html('Put it in a <header> tag, then <img src=x onerror=alert(1)> and <script>alert(1)</script> done.');
    assert.ok(!has(h, '<script'), h);
    assert.ok(!has(h, '<img src=x'), h);
    assert.ok(!has(h, 'onerror='.toLowerCase() + '=') || has(h, '&lt;'), h);
    assert.ok(has(h, '&lt;header&gt;'), 'the tag name stays readable: ' + h);
  });
});

describe('links', () => {
  it('opens external links safely in a new tab and keeps internal ones in the app', () => {
    const h = html('[Docs](https://example.com/page) [Home](/student-dashboard) [Jump](#top) [Mail](mailto:a@b.co)');
    assert.ok(has(h, /<a href="https:\/\/example\.com\/page" target="_blank" rel="noopener noreferrer">/));
    assert.ok(has(h, 'href="/student-dashboard"'));
    assert.ok(has(h, 'href="#top"'));
    assert.ok(has(h, 'href="mailto:a@b.co"'));
  });

  it('never renders a link that could run script', () => {
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', '//evil.example/x']) {
      const h = html(`[click me](${bad})`);
      assert.ok(!has(h, '<a '), `${bad} -> ${h}`);
      assert.ok(has(h, 'click me'), 'the words stay');
    }
  });
});

describe('images', () => {
  it('renders an image with alt text, a caption, and lazy loading', () => {
    const h = html('![A diagram of a loop](https://cdn.example.com/loop.png "Figure 1: a loop")');
    assert.ok(has(h, /<figure class="lesson-figure">/));
    assert.ok(has(h, 'alt="A diagram of a loop"'));
    assert.ok(has(h, 'loading="lazy"'));
    assert.ok(has(h, '<figcaption>Figure 1: a loop</figcaption>'));
  });

  it('allows this app\'s own assets but never an untrusted address', () => {
    assert.ok(has(html('![x](/lesson-assets/a.png)'), 'src="/lesson-assets/a.png"'));
    for (const bad of ['http://x.com/a.png', 'javascript:alert(1)', 'data:image/svg+xml;base64,AAAA', '/other/a.png']) {
      const h = html(`![alt words](${bad})`);
      assert.ok(!has(h, '<img'), `${bad} -> ${h}`);
      assert.ok(has(h, 'alt words'), 'the description is kept');
    }
  });
});

describe('callouts and lesson references', () => {
  it('turns > [!TIP] style blockquotes into callouts, without the marker', () => {
    const h = html('> [!TIP]\n> Press **Tab** to indent.\n\n> [!WARNING]\n> Careful!\n\n> an ordinary quote');
    assert.ok(has(h, 'lesson-callout-tip'));
    assert.ok(has(h, 'lesson-callout-warning'));
    assert.ok(!has(h, '[!TIP]') && !has(h, '[!WARNING]'));
    assert.ok(has(h, 'role="note"'));
    assert.ok(has(h, /<blockquote>[\s\S]*an ordinary quote/));
  });

  const link = (over: Partial<LessonLink>): LessonLink => ({ lessonId: 'l', title: 'Loops', session: 3, lessonIndex: 3, lessonTotal: 8, href: '/lesson/abc', locked: false, current: false, ...over });
  const withRefs = (refs: Record<string, LessonLink | null>, md: string) =>
    renderToStaticMarkup(
      <LessonRenderContext.Provider value={{ mode: 'page', presentation: false, viewer: 'student', refs, visuals: {}, renderQuiz: null }}>
        <LessonMarkdown markdown={md} />
      </LessonRenderContext.Provider>,
    );

  it('links an unlocked lesson reference, locks one the student has not had, and leaves the unresolved as text', () => {
    const md = '[Lesson 3](lumexa:lesson/python/3), [Lesson 5](lumexa:lesson/python/5), [Lesson 7](lumexa:lesson/python/7), [Lesson 2](lumexa:lesson/python/2)';
    const h = withRefs(
      {
        'python/3': link({}),
        'python/5': link({ href: null, locked: true, title: 'Models' }),
        'python/7': null,
        'python/2': link({ href: null, locked: false }),
      },
      md,
    );
    assert.ok(has(h, /<a [^>]*class="lesson-ref"[^>]*href="\/lesson\/abc"|<a [^>]*href="\/lesson\/abc"[^>]*class="lesson-ref"/), h);
    assert.ok(has(h, 'lesson-ref-locked'), 'a locked lesson is not a link');
    assert.ok(has(h, 'locked until that class is completed'));
    const links = h.match(/<a /g) ?? [];
    assert.equal(links.length, 1, 'only the unlocked reference is a link: ' + h);
    assert.ok(has(h, 'Lesson 7') && has(h, 'Lesson 2'));
  });
});

describe('embedded blocks', () => {
  it('renders the quiz where the lumexa-quiz block sits', () => {
    const h = renderToStaticMarkup(
      <LessonRenderContext.Provider value={{ mode: 'page', presentation: false, viewer: 'student', refs: {}, visuals: {}, renderQuiz: () => <div id="the-quiz">QUIZ HERE</div> }}>
        <LessonMarkdown markdown={'## Knowledge Check\n\n```lumexa-quiz\n```'} />
      </LessonRenderContext.Provider>,
    );
    assert.ok(has(h, 'QUIZ HERE'));
    assert.ok(!has(h, 'lumexa-quiz'), 'the directive itself is never shown');
  });

  it('shows nothing for a visual that is not in the lesson (but tells an admin)', () => {
    const md = '```lumexa-visual\nmissing-one\n```';
    assert.equal(html(md).replace(/<div class="lesson-prose">|<\/div>/g, ''), '');
    const admin = renderToStaticMarkup(
      <LessonRenderContext.Provider value={{ mode: 'page', presentation: false, viewer: 'admin', refs: {}, visuals: {}, renderQuiz: null }}>
        <LessonMarkdown markdown={md} />
      </LessonRenderContext.Provider>,
    );
    assert.ok(has(admin, 'missing-one'));
  });
});

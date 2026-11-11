import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import LessonStudyView from './LessonStudyView';
import SidebarToggle from './SidebarToggle';
import TableOfContents, { type TocItem } from './TableOfContents';
import type { LessonDetailsResponse } from '@/lib/lesson/types';

const has = (h: string, s: string | RegExp) => (typeof s === 'string' ? h.includes(s) : s.test(h));

describe('SidebarToggle', () => {
  it('offers to hide the sidebar while it is open', () => {
    const h = renderToStaticMarkup(<SidebarToggle open onToggle={() => undefined} controls="lesson-toc" />);
    assert.ok(has(h, 'type="button"'));
    assert.ok(has(h, 'aria-label="Hide sidebar"'));
    assert.ok(has(h, 'title="Hide sidebar"'));
    assert.ok(has(h, 'aria-expanded="true"'));
    assert.ok(has(h, 'aria-controls="lesson-toc"'));
    assert.ok(has(h, 'fill-opacity="0.22"'), 'the left pane is drawn filled while the sidebar shows');
  });

  it('offers to show it again once hidden — same button, outline icon', () => {
    const h = renderToStaticMarkup(<SidebarToggle open={false} onToggle={() => undefined} controls="lesson-toc" />);
    assert.ok(has(h, 'aria-label="Show sidebar"'));
    assert.ok(has(h, 'aria-expanded="false"'));
    assert.ok(!has(h, 'fill-opacity'), 'no filled pane when hidden');
    assert.ok(has(h, 'aria-hidden="true"'), 'the icon is decorative; the button has its own name');
  });
});

describe('TableOfContents heading', () => {
  const items: TocItem[] = [
    { id: 'a', text: 'Alpha', level: 2 },
    { id: 'b', text: 'Beta', level: 3 },
  ];
  it('shows its own "On this page" label by default and can leave it to the sidebar header', () => {
    assert.ok(has(renderToStaticMarkup(<TableOfContents items={items} activeId={null} readIds={null} onNavigate={() => undefined} />), />On this page</));
    const quiet = renderToStaticMarkup(<TableOfContents items={items} activeId={null} readIds={null} onNavigate={() => undefined} showHeading={false} />);
    assert.ok(!has(quiet, />On this page</));
    assert.ok(has(quiet, 'aria-label="On this page"'), 'the navigation landmark keeps its name');
    assert.ok(has(quiet, 'href="#a"') && has(quiet, 'href="#b"'));
  });

  it('renders nothing for a lesson with fewer than two sections', () => {
    assert.equal(renderToStaticMarkup(<TableOfContents items={items.slice(0, 1)} activeId={null} readIds={null} onNavigate={() => undefined} />), '');
  });
});

describe('the lesson page layout', () => {
  const data = (markdown: string): LessonDetailsResponse => ({
    available: true,
    session: { scheduledLessonId: null, lessonNumber: 3, start: null, end: null, status: null, courseId: 'c1', courseTitle: 'A Course' },
    lesson: {
      id: 'l1',
      title: 'A lesson',
      type: 'LEARNING',
      objectives: [],
      contentMarkdown: markdown,
      homework: null,
      checkpoint: null,
      codeSnippets: [],
      projectLinks: null,
      module: null,
      project: null,
    },
    viewer: 'teacher',
    numbering: null,
    navigation: null,
    refs: {},
  });
  const longLesson = '## First part\n\nSome words.\n\n## Second part\n\nMore words.\n\n## Third part\n\nEven more.';

  it('starts with the sidebar open and its toggle in the sidebar header', () => {
    const h = renderToStaticMarkup(<LessonStudyView data={data(longLesson)} mode="page" isStudent={false} />);
    assert.ok(has(h, 'class="lesson-layout"'));
    assert.ok(has(h, 'data-sidebar="open"'));
    assert.equal((h.match(/data-sidebar-toggle/g) ?? []).length, 1, 'one toggle');
    assert.ok(has(h, 'aria-label="Hide sidebar"'));
    assert.ok(has(h, 'id="lesson-toc"'));
    assert.ok(!has(h, /id="lesson-toc"[^>]*inert/), 'the contents are reachable while it is open');
    assert.ok(has(h, 'href="#first-part"') && has(h, 'href="#third-part"'));
    assert.ok(has(h, 'class="lesson-content min-w-0"'));
    assert.ok(!has(h, 'data-no-sidebar'), 'the layout reserves the sidebar column');
  });

  it('has no sidebar, and so no toggle, when there is nothing to navigate', () => {
    const h = renderToStaticMarkup(<LessonStudyView data={data('## Only one part\n\nShort.')} mode="page" isStudent={false} />);
    assert.ok(!has(h, 'data-sidebar-toggle'));
    assert.ok(has(h, 'data-sidebar="open"'));
    // the stylesheet keys on this: without it the content fell into the 15rem sidebar track
    assert.ok(has(h, 'data-no-sidebar'), 'the layout is told there is no sidebar column to reserve');
  });

  it('keeps the live classroom compact: no sidebar layout and no toggle', () => {
    const h = renderToStaticMarkup(<LessonStudyView data={data(longLesson)} mode="classroom" isStudent={false} />);
    assert.ok(!has(h, 'lesson-layout'));
    assert.ok(!has(h, 'data-sidebar-toggle'));
  });
});

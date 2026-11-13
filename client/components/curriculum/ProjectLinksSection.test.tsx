import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ProjectLinksSection, { hasProjectUrl, visibleProjectLinks } from './ProjectLinksSection';

const COLAB = 'https://colab.research.google.com/drive/example-notebook';

describe('visibleProjectLinks', () => {
  it('keeps every project that has a name, with or without a link yet, and drops nameless rows', () => {
    const rows = [
      { title: 'Smart Calculator', url: COLAB },
      { title: 'Number Guessing Game', url: '' },
      { title: '   ', url: COLAB },
      { title: '', url: '' },
    ];
    assert.deepEqual(visibleProjectLinks(rows).map((p) => p.title), ['Smart Calculator', 'Number Guessing Game']);
    assert.deepEqual(visibleProjectLinks(null), []);
    assert.deepEqual(visibleProjectLinks(undefined), []);
  });

  it('knows whether a project has been given its link', () => {
    assert.equal(hasProjectUrl({ title: 'A', url: COLAB }), true);
    assert.equal(hasProjectUrl({ title: 'A', url: '' }), false);
    assert.equal(hasProjectUrl({ title: 'A', url: '   ' }), false);
  });
});

describe('ProjectLinksSection', () => {
  it('shows Open Project and Copy Link for a project that has its link', () => {
    const h = renderToStaticMarkup(<ProjectLinksSection projectLinks={[{ title: 'Smart Calculator', url: COLAB }]} />);
    assert.ok(h.includes('Project: Smart Calculator'));
    assert.ok(h.includes(`href="${COLAB}"`));
    assert.ok(h.includes('target="_blank"') && h.includes('noopener'));
    assert.ok(h.includes('Open Project') && h.includes('Copy Link'));
    assert.ok(!h.includes('coming soon'));
    assert.ok(!h.includes('disabled'));
  });

  it('shows a project without a link yet as "coming soon", with both buttons switched off and nothing to open', () => {
    const h = renderToStaticMarkup(<ProjectLinksSection projectLinks={[{ title: 'Smart Calculator', url: '' }]} />);
    assert.ok(h.includes('Project: Smart Calculator'));
    assert.ok(h.includes('Project link coming soon'));
    assert.ok(!h.includes('<a '), 'there is no link to follow (an empty href would reopen this page)');
    assert.equal(h.split('disabled').length - 1, 2, 'Open Project and Copy Link are both disabled');
  });

  it('shows several projects each under its own heading, switching off only the ones without a link', () => {
    const h = renderToStaticMarkup(
      <ProjectLinksSection
        projectLinks={[
          { title: 'Number Guessing Game', url: COLAB },
          { title: 'Python Quiz Master', url: '' },
        ]}
      />,
    );
    assert.ok(h.includes('💻 Projects'));
    assert.ok(h.includes('Number Guessing Game') && h.includes('Python Quiz Master'));
    assert.equal(h.split('<a ').length - 1, 1, 'one working link');
    assert.equal(h.split('Project link coming soon').length - 1, 1, 'one project still waiting for its link');
  });

  it('renders nothing when no project has a name', () => {
    assert.equal(renderToStaticMarkup(<ProjectLinksSection projectLinks={[]} />), '');
    assert.equal(renderToStaticMarkup(<ProjectLinksSection projectLinks={[{ title: '', url: COLAB }]} />), '');
  });
});

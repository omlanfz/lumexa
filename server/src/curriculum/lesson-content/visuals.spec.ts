import { extractVisualIds, isSafeMediaSrc, normalizeVisuals, placeVisuals, VISUAL_TYPES } from './visuals';
import { validateLessonContent } from './validate';
import { catalogFor, catalogForTitle, catalogKeys, catalogTitles } from './visual-catalog';
import './catalog';

const ok = { id: 'v1', type: 'flow', alt: 'Boxes joined by arrows', caption: 'A flow', config: { nodes: [{ label: 'A' }, { label: 'B' }] } };

describe('visual validation', () => {
  it('accepts a well-formed visual and returns it normalised', () => {
    const v = normalizeVisuals([ok]);
    expect(v.errors).toEqual([]);
    expect(v.visuals[0]).toMatchObject({ id: 'v1', type: 'flow' });
  });

  it('requires alt text and a caption on every visual', () => {
    expect(normalizeVisuals([{ ...ok, alt: '' }]).errors.join(' ')).toMatch(/alt text/i);
    expect(normalizeVisuals([{ ...ok, caption: '' }]).errors.join(' ')).toMatch(/caption/i);
  });

  it('rejects unknown types, bad or duplicate ids, and missing required configuration', () => {
    expect(normalizeVisuals([{ ...ok, type: 'iframe' }]).errors.join(' ')).toMatch(/unknown visual type/i);
    expect(normalizeVisuals([{ ...ok, id: 'Bad Id!' }]).errors.join(' ')).toMatch(/id/i);
    expect(normalizeVisuals([ok, ok]).errors.join(' ')).toMatch(/duplicate/i);
    expect(normalizeVisuals([{ ...ok, config: {} }]).errors.join(' ')).toMatch(/needs "nodes"/);
  });

  it('only allows https or this app’s own asset paths for media, and requires a video transcript', () => {
    for (const bad of ['javascript:alert(1)', 'http://x.com/a.png', 'data:text/html,hi', '//evil.example/a.png', '/lesson-assets/../secret', '/other/a.png', 'https://x.com/a b.png']) {
      expect(isSafeMediaSrc(bad)).toBe(false);
      expect(normalizeVisuals([{ ...ok, type: 'image', config: { src: bad } }]).errors.length).toBeGreaterThan(0);
    }
    expect(isSafeMediaSrc('https://cdn.example.com/a.png')).toBe(true);
    expect(isSafeMediaSrc('/lesson-assets/a.png')).toBe(true);
    const video = { ...ok, type: 'video', config: { src: 'https://cdn.example.com/a.mp4' } };
    expect(normalizeVisuals([video]).errors.join(' ')).toMatch(/transcript/i);
    expect(normalizeVisuals([{ ...video, config: { ...video.config, transcript: 'First we do this, then that.' } }]).errors).toEqual([]);
  });

  it('is data only — a config can never carry markup the renderer would run', () => {
    const v = normalizeVisuals([{ ...ok, config: { nodes: [{ label: '<script>alert(1)</script>' }] } }]);
    // It validates as plain data; the renderer prints it as text (covered by the client tests).
    expect(v.errors).toEqual([]);
    expect(JSON.stringify(v.visuals)).toContain('<script>'); // stored verbatim as TEXT
  });

  it('lists a renderer type for every visual the lessons use', () => {
    expect(Object.keys(VISUAL_TYPES).length).toBeGreaterThanOrEqual(28);
    for (const key of catalogKeys()) for (const e of catalogFor(key)) expect(VISUAL_TYPES[e.visual.type]).toBeDefined();
    for (const t of catalogTitles()) for (const e of catalogForTitle(t)) expect(VISUAL_TYPES[e.visual.type]).toBeDefined();
  });
});

describe('placing visuals in the lesson text', () => {
  const md = '## Intro\n\nHello.\n\n## Concept Explanation\n\nFirst paragraph.\n\nSecond paragraph.\n\n### Sub\n\nDeep.\n\n## Recap\n\nBye.';

  it('puts the block after the first paragraph of the named section, and only once', () => {
    const a = placeVisuals(md, [{ id: 'one', after: 'Concept Explanation' }]);
    expect(a.markdown).toMatch(/First paragraph\.\n\n```lumexa-visual\none\n```\n\nSecond paragraph\./);
    const b = placeVisuals(a.markdown, [{ id: 'one', after: 'Concept Explanation' }]);
    expect(b.markdown).toBe(a.markdown); // idempotent
    expect(extractVisualIds(b.markdown)).toEqual(['one']);
  });

  it('can place at the end of a section, in the order given', () => {
    const r = placeVisuals(md, [{ id: 'a', after: 'Concept Explanation', at: 'end' }, { id: 'b', after: 'Concept Explanation', at: 'end' }]);
    expect(extractVisualIds(r.markdown)).toEqual(['a', 'b']);
    expect(r.markdown.indexOf('Deep.')).toBeLessThan(r.markdown.indexOf('lumexa-visual\na'));
    expect(r.markdown.indexOf('lumexa-visual\nb')).toBeLessThan(r.markdown.indexOf('## Recap'));
  });

  it('never lands inside a code fence, even when the section starts with one that has blank lines', () => {
    const fenced = '## Concept Explanation\n\n```python\nx = 1\n\ny = 2\n```\n\nAfter the code.';
    const r = placeVisuals(fenced, [{ id: 'v', after: 'Concept Explanation' }]);
    const open = r.markdown.indexOf('```python');
    const close = r.markdown.indexOf('```', open + 3);
    const at = r.markdown.indexOf('```lumexa-visual');
    expect(at).toBeGreaterThan(close);
    expect(r.markdown).toContain('x = 1\n\ny = 2');
  });

  it('falls back to the main explanation section when its heading was renamed, and reports it', () => {
    const r = placeVisuals(md, [{ id: 'v', after: 'A heading that no longer exists' }]);
    expect(r.moved).toEqual(['v']);
    expect(r.unplaced).toEqual([]);
    expect(r.markdown.indexOf('lumexa-visual')).toBeGreaterThan(r.markdown.indexOf('## Concept Explanation'));
    expect(r.markdown.indexOf('lumexa-visual')).toBeLessThan(r.markdown.indexOf('## Recap'));
  });

  it('leaves text alone when it has no sections at all', () => {
    const r = placeVisuals('Just a paragraph.', [{ id: 'v', after: 'Anything' }]);
    expect(r.unplaced).toEqual(['v']);
    expect(r.markdown).toBe('Just a paragraph.');
  });
});

describe('lesson content validation', () => {
  it('flags a visual placed in the text but not defined, and one defined but not placed', () => {
    const v = validateLessonContent({ contentMarkdown: '## A\n\n```lumexa-visual\nmissing\n```', visuals: [ok], miniQuiz: null });
    const all = [...v.errors, ...v.warnings].join(' ');
    expect(all).toMatch(/missing/);
    expect(all).toMatch(/v1/);
  });
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { LessonRenderContext } from '../LessonContext';
import type { LessonVisualData } from '@/lib/lesson/types';
import VisualBlock from './VisualBlock';
import { VISUAL_RENDERERS } from './index';

// The server owns the list of visual types and the catalog of lesson visuals. They are loaded
// at run time (not imported) so the client's own type-check never depends on server files.
const SERVER_DIR = path.resolve(__dirname, '../../../../server/src/curriculum/lesson-content');
const haveServer = fs.existsSync(path.join(SERVER_DIR, 'visuals.ts'));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const load = async (file: string) => (await import(pathToFileURL(path.join(SERVER_DIR, file)).href)) as Record<string, any>;

const render = (visual: LessonVisualData, viewer: 'student' | 'admin' = 'student') =>
  renderToStaticMarkup(
    <LessonRenderContext.Provider value={{ lessonId: 'lesson-1', mode: 'page', presentation: false, viewer, refs: {}, visuals: { [visual.id]: visual }, renderQuiz: null }}>
      <VisualBlock id={visual.id} />
    </LessonRenderContext.Provider>,
  );

const sample = (over: Partial<LessonVisualData> & Pick<LessonVisualData, 'type'>): LessonVisualData => ({
  id: 'v1',
  alt: 'A description of the visual for tests',
  caption: 'A caption',
  config: {},
  ...over,
});

describe('renderer registry', { skip: !haveServer && 'server sources not present' }, () => {
  it('has a renderer for every visual type the server accepts, with matching interactivity', async () => {
    const { VISUAL_TYPES } = await load('visuals.ts');
    for (const [type, info] of Object.entries<{ interactive: boolean }>(VISUAL_TYPES)) {
      const entry = VISUAL_RENDERERS[type];
      assert.ok(entry, `no client renderer for "${type}"`);
      assert.equal(entry.interactive, info.interactive, `"${type}": interactive flag differs between server and client`);
    }
  });

  it('has no renderer the server would reject', async () => {
    const { VISUAL_TYPES } = await load('visuals.ts');
    for (const type of Object.keys(VISUAL_RENDERERS)) assert.ok(VISUAL_TYPES[type], `client renderer "${type}" has no server type`);
  });
});

describe('every visual in the curriculum catalog', { skip: !haveServer && 'server sources not present' }, () => {
  it('renders without error, with its alt text and caption, and nothing broken in the output', async () => {
    await load('catalog/index.ts');
    const cat = await load('visual-catalog.ts');
    const entries: { key: string; visual: LessonVisualData }[] = [];
    for (const key of cat.catalogKeys()) for (const e of cat.catalogFor(key)) entries.push({ key, visual: e.visual });
    for (const title of cat.catalogTitles()) for (const e of cat.catalogForTitle(title)) entries.push({ key: title, visual: e.visual });
    assert.ok(entries.length >= 150, `expected a full catalog, found ${entries.length}`);

    for (const { key, visual } of entries) {
      let html = '';
      assert.doesNotThrow(() => (html = render(visual)), `${key} / ${visual.id} threw`);
      assert.ok(html.includes('lesson-visual'), `${key} / ${visual.id}: no figure`);
      assert.ok(html.includes(`aria-label="${visual.alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#x27;')}"`), `${key} / ${visual.id}: alt text missing`);
      assert.ok(html.includes('<figcaption>'), `${key} / ${visual.id}: caption missing`);
      assert.ok(!/NaN|undefined|\[object Object\]|Infinity/.test(html), `${key} / ${visual.id}: broken value in output: ${(html.match(/.{30}(NaN|undefined|\[object Object\]|Infinity).{30}/) ?? [''])[0]}`);
      assert.ok(!html.includes('not available in this version'), `${key} / ${visual.id}: no renderer`);
      // Something real was drawn (a picture, or text beyond the caption), not an empty frame.
      const text = html.replace(/<figcaption>.*?<\/figcaption>/, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      assert.ok(html.includes('<svg') || text.length > 25, `${key} / ${visual.id}: nothing drawn`);
    }
  });
});

describe('Face Detection visuals', () => {
  const sim = /Simulated example/;

  it('label every simulated result as a drawing — never live OpenCV', () => {
    for (const type of ['haar', 'bbox', 'detection-lab']) {
      const html = render(sample({ type, config: type === 'bbox' ? { imageWidth: 480, imageHeight: 320, box: { x: 100, y: 40, width: 120, height: 150 } } : {} }));
      assert.ok(sim.test(html), `${type} must say it is simulated`);
      assert.ok(/not a live OpenCV run|not live OpenCV/i.test(html), `${type} must say it is not OpenCV`);
    }
  });

  it('shows the labelled (x, y, width, height) box with its code', () => {
    const html = render(sample({ type: 'bbox', config: { imageWidth: 480, imageHeight: 320, box: { x: 150, y: 50, width: 150, height: 190 }, label: 'face' } }));
    for (const s of ['x = 150', 'y = 50', 'width = 150', 'height = 190', 'cv2.rectangle', '(0, 0)']) assert.ok(html.includes(s), `missing ${s}`);
  });

  it('computes Haar feature values from the drawn pixels', () => {
    const html = render(sample({ type: 'haar', config: {} }));
    assert.ok(html.includes('Edge feature') && html.includes('Line feature'));
    assert.ok(/feature value = [0-9.]+ − [0-9.]+ = <strong>-?[0-9.]+<\/strong>/.test(html.replace(/<!-- -->/g, '')), 'arithmetic shown');
  });

  it('shows the detection lab with scaleFactor, minNeighbors and the resulting counts', () => {
    const html = render(sample({ type: 'detection-lab', config: {} })).replace(/<!-- -->/g, '');
    for (const s of ['scaleFactor', 'minNeighbors', 'Faces found', 'False alarms', 'detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)']) assert.ok(html.includes(s), `missing ${s}`);
    // Default scaleFactor 1.1 / minNeighbors 5: both faces found, the clock rejected.
    assert.ok(/Faces found: <strong>2 of 2<\/strong>/.test(html), 'default settings find both faces');
    assert.ok(/False alarms: <strong>0<\/strong>/.test(html), 'default settings ignore the clock');
  });

  it('explains the cascade with real arithmetic', () => {
    const html = render(sample({ type: 'cascade', config: { windows: 10000, stages: [{ name: 'S1', passRate: 0.4 }, { name: 'S2', passRate: 0.25 }] } })).replace(/<!-- -->/g, '');
    assert.ok(html.includes('10,000 left'));
    assert.ok(html.includes('stage-checks'));
    assert.ok(/Illustrative numbers/.test(html));
  });

  it('shows the grayscale arithmetic for the chosen part of the picture', () => {
    const html = render(sample({ type: 'colorspace', config: {} })).replace(/<!-- -->/g, '');
    assert.ok(html.includes('0.299×205 + 0.587×92 + 0.114×92 = <strong>126</strong>'), html.slice(html.indexOf('0.299') - 40, html.indexOf('0.299') + 120));
  });
});

describe('media is safe', () => {
  it('blocks an image or video address that is not https or this app’s own assets', () => {
    for (const src of ['javascript:alert(1)', 'http://example.com/a.png', 'data:image/svg+xml;base64,AAAA', '//evil.example/a.png', '/other/a.png', 'https://x.com/a b.png']) {
      const img = render(sample({ type: 'image', config: { src } }));
      assert.ok(!img.includes('<img'), `${src} must not render as an image`);
      const vid = render(sample({ type: 'video', config: { src, transcript: 'A long enough transcript.' } }));
      assert.ok(!vid.includes('<video'), `${src} must not render as a video`);
    }
  });

  it('shows an allowed image lazily, with alt text', () => {
    // Lazy types wait to be near the screen, so on the server they render a placeholder.
    const html = render(sample({ type: 'image', config: { src: '/lesson-assets/loop.png' } }));
    assert.ok(html.includes('lesson-visual-skeleton'));
  });

  it('never autoplays a video and always offers controls and a transcript', async () => {
    const mod = await import('./media');
    const html = renderToStaticMarkup(
      <LessonRenderContext.Provider value={{ lessonId: 'l', mode: 'page', presentation: false, viewer: 'student', refs: {}, visuals: {}, renderQuiz: null }}>
        <mod.VideoVisual id="v" alt="A short video about loops" config={{ src: '/lesson-assets/loop.mp4', poster: '/lesson-assets/loop.png', captionsSrc: '/lesson-assets/loop.vtt', transcript: 'First we make a loop. Then we run it.' }} />
      </LessonRenderContext.Provider>,
    );
    assert.ok(html.includes('<video'));
    assert.ok(html.includes(' controls'));
    assert.ok(!/autoplay/i.test(html) && !/ loop[ >=]/.test(html), 'no autoplay, no looping');
    assert.ok(html.includes('preload="none"'));
    assert.ok(html.includes('<track kind="captions"'));
    assert.ok(html.includes('Transcript') && html.includes('First we make a loop.'));
  });
});

describe('interactive blocks render a usable starting state', () => {
  it('pixel grid shows its numbers and the shape', () => {
    const html = render(sample({ type: 'pixel-grid', config: { rows: 2, cols: 2, mode: 'gray', values: [[0, 255], [128, 64]] } })).replace(/<!-- -->/g, '');
    assert.ok(html.includes('image.shape = (2, 2)'));
    assert.ok(html.includes('>255<') && html.includes('>128<'));
  });

  it('train/test split states the share and the code', () => {
    const html = render(sample({ type: 'train-test', config: { total: 100 } })).replace(/<!-- -->/g, '');
    assert.ok(html.includes('Training: 80 rows') && html.includes('Test: 20 rows'));
    assert.ok(html.includes('test_size=0.20'));
  });

  it('the box model adds the sizes up', () => {
    const html = render(sample({ type: 'box-model', config: {} })).replace(/<!-- -->/g, '');
    assert.ok(html.includes('180 content + 40 padding + 12 border = <strong>232px</strong>'));
  });

  it('a code trace starts at step 1 and says it does not run code', () => {
    const html = render(sample({ type: 'code-trace', config: { lines: ['x = 1', 'print(x)'], steps: [{ line: 1, vars: { x: 1 } }, { line: 2, vars: { x: 1 }, output: '1' }] } })).replace(/<!-- -->/g, '');
    assert.ok(html.includes('Step 1 of 2'));
    assert.ok(html.includes('does not run any code'));
  });

  it('a chart with a fit line reports the line and the correlation', () => {
    const html = render(sample({ type: 'chart', config: { kind: 'scatter', fitLine: true, series: [{ points: [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6.2 }, { x: 4, y: 7.9 }] }] } })).replace(/<!-- -->/g, '');
    assert.ok(/best-fit line: y ≈ [0-9.]+·x/.test(html));
    assert.ok(/correlation r = 1|correlation r = 0\.99/.test(html));
  });

  it('a checklist starts empty and says it is saved on this device', () => {
    const html = render(sample({ type: 'checklist', config: { items: ['One', 'Two'] } })).replace(/<!-- -->/g, '');
    assert.ok(html.includes('0 of 2 done') && html.includes('saved on this device only'));
    assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2);
  });

  it('an unknown visual type says so instead of crashing', () => {
    const html = render(sample({ type: 'does-not-exist' }));
    assert.ok(html.includes('not available in this version'));
  });
});

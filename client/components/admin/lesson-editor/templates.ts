// FILE PATH: client/components/admin/lesson-editor/templates.ts
//
// A starting configuration for every kind of visual, so adding one gives an author a
// working example to edit instead of an empty box. (The server validates the result.)

export const VISUAL_TEMPLATES: Record<string, Record<string, unknown>> = {
  flow: { layout: 'row', nodes: [{ label: 'First step', detail: 'what happens' }, { label: 'Second step' }, { label: 'Result', tone: 'good' }] },
  sequence: { actors: [{ id: 'a', label: 'Browser' }, { id: 'b', label: 'Server' }], messages: [{ from: 'a', to: 'b', label: 'Request' }, { from: 'b', to: 'a', label: 'Response', dashed: true }] },
  tree: { root: { label: 'Parent', children: [{ label: 'Child A' }, { label: 'Child B', children: [{ label: 'Grandchild' }] }] } },
  table: { columns: ['Name', 'Value'], rows: [['one', 1], ['two', 2]] },
  'compare-tables': { before: { title: 'Before', columns: ['x'], rows: [[1], ['']] }, after: { title: 'After', columns: ['x'], rows: [[1], [0]] }, arrowLabel: 'clean' },
  chart: { kind: 'bar', xLabel: 'Category', yLabel: 'Amount', categories: ['A', 'B', 'C'], series: [{ name: 'Series', values: [3, 5, 2] }] },
  'pixel-grid': { rows: 3, cols: 3, mode: 'gray', values: [[0, 128, 255], [64, 192, 32], [255, 128, 0]] },
  'code-trace': { lines: ['x = 1', 'x = x + 1', 'print(x)'], steps: [{ line: 1, vars: { x: 1 } }, { line: 2, vars: { x: 2 } }, { line: 3, vars: { x: 2 }, output: '2' }] },
  stage: { cols: 8, rows: 6, sprites: [{ kind: 'player', x: 1, y: 4 }, { kind: 'goal', x: 6, y: 1 }, { kind: 'wall', x: 4, y: 3 }] },
  blocks: { scripts: [{ title: 'Script', blocks: [{ kind: 'event', text: 'when 🏁 clicked' }, { kind: 'motion', text: 'move 10 steps' }] }] },
  'box-model': {},
  'css-layout': { mode: 'flex', items: 5 },
  viewport: {},
  'neural-net': { layers: [{ label: 'Input', nodes: 3 }, { label: 'Hidden', nodes: 4 }, { label: 'Output', nodes: 2 }] },
  attention: { tokens: ['The', 'cat', 'sat'], weights: [[0.6, 0.3, 0.1], [0.2, 0.6, 0.2], [0.1, 0.5, 0.4]] },
  haar: {},
  cascade: { windows: 10000, stages: [{ name: 'Stage 1', passRate: 0.4 }, { name: 'Stage 2', passRate: 0.25 }] },
  bbox: { imageWidth: 480, imageHeight: 320, box: { x: 150, y: 50, width: 150, height: 190 }, label: 'face' },
  colorspace: {},
  'detection-lab': {},
  checklist: { title: 'Checklist', items: ['First thing', 'Second thing'] },
  cards: { cards: [{ title: 'Option A', bullets: ['point'] }, { title: 'Option B', bullets: ['point'] }] },
  swatches: { colors: [{ name: 'Primary', hex: '#1B3A4B' }, { name: 'Accent', hex: '#F2A93B' }], fonts: [{ label: 'Heading', family: 'sans-serif', sample: 'A heading' }], tagline: 'A short tagline' },
  'ui-map': { title: 'Window', regions: [{ id: 'one', label: 'Panel', desc: 'What this panel does.', x: 2, y: 2, w: 40, h: 90 }] },
  'train-test': { total: 100 },
  mockup: { kind: 'page', sections: [{ label: 'Header', text: 'Title', callout: 'Say what it is.' }] },
  image: { src: '/lesson-assets/your-image.png' },
  video: { src: '/lesson-assets/your-video.mp4', transcript: 'Write what the video says here, so everyone can follow it.' },
  walkthrough: { steps: [{ title: 'Step 1', text: 'Do this first.' }, { title: 'Step 2', text: 'Then this.' }] },
};

export function nextFreeId(base: string, taken: string[]): string {
  const root = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'visual';
  if (!taken.includes(root)) return root;
  let i = 2;
  while (taken.includes(`${root}-${i}`)) i++;
  return `${root}-${i}`;
}

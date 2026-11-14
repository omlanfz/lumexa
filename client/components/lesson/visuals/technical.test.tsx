import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LessonRenderContext } from '../LessonContext';
import type { LessonVisualData } from '@/lib/lesson/types';
import VisualBlock from './VisualBlock';
import './index'; // registers every renderer

// Representative configs for the technical visuals of the Pre-University CSE program. Each is rendered on
// the server (the first paint a learner gets) and must show something real and nothing broken.

const render = (visual: LessonVisualData) =>
  renderToStaticMarkup(
    <LessonRenderContext.Provider value={{ lessonId: 'lesson-1', mode: 'page', presentation: false, viewer: 'student', refs: {}, visuals: { [visual.id]: visual }, renderQuiz: null }}>
      <VisualBlock id={visual.id} />
    </LessonRenderContext.Provider>,
  );

const v = (type: string, config: Record<string, unknown>): LessonVisualData => ({ id: 'v1', type, alt: 'A technical visual for the tests', caption: 'A caption', config });
const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const SAMPLES: Record<string, Record<string, unknown>> = {
  'code-lab': { language: 'python', code: 'print("hi")', expected: 'hi' },
  'memory-map': { regions: [{ label: 'Stack', cells: [{ name: 'x', addr: '0x7ffc1000', value: '42', type: 'int' }, { name: 'p', addr: '0x7ffc1008', value: '0x7ffc1000', type: 'int *', pointsTo: '0x7ffc1000' }] }, { label: 'Heap', cells: [{ addr: '0x5000', value: '7' }] }] },
  'array-viz': { rows: [{ label: 'Binary search', cells: [2, 5, 8, 12, 16, 23, 38], pointers: [{ index: 0, label: 'low' }, { index: 3, label: 'mid' }, { index: 6, label: 'high' }], highlight: [{ from: 0, to: 6 }] }] },
  'linked-list': { lists: [{ label: 'list', kind: 'singly', nodes: [{ value: 3 }, { value: 7 }, { value: 9 }], cursors: [{ index: 1, label: 'cur' }] }, { kind: 'doubly', nodes: [{ value: 1 }, { value: 2 }] }, { kind: 'circular', nodes: [{ value: 'a' }, { value: 'b' }] }] },
  'hash-table': { size: 7, hash: 'sum-mod', keys: ['rahim', 'karim', 'salma'] },
  'stack-queue': { kind: 'stack', frames: [{ items: [], note: 'Empty.' }, { items: ['1'], op: 'push(1)', note: 'Pushed 1.' }] },
  'tree-steps': { frames: [{ root: { label: '8', children: [{ label: '3' }, { label: '10' }] }, note: 'A small tree.', array: [8, 3, 10] }] },
  graph: { nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }], edges: [{ from: 'A', to: 'B', weight: 4 }, { from: 'B', to: 'C', weight: 2 }], steps: [{ visit: ['A'], current: 'A', queue: ['B'], note: 'Start at A.' }] },
  'algo-steps': { frames: [{ array: [5, 2, 9, 1], marks: { 0: 'compare', 1: 'compare' }, note: 'Compare 5 and 2.', counters: { comparisons: 1, swaps: 0 } }, { array: [2, 5, 9, 1], marks: { 0: 'swap', 1: 'swap' }, note: 'Swap them.', counters: { comparisons: 1, swaps: 1 } }] },
  circuit: { inputs: [{ id: 'A' }, { id: 'B' }], gates: [{ id: 'x', type: 'XOR', in: ['A', 'B'] }, { id: 'c', type: 'AND', in: ['A', 'B'] }], outputs: [{ id: 'S', from: 'x', label: 'Sum' }, { id: 'C', from: 'c', label: 'Carry' }], truthTable: true },
  'truth-table': { vars: ['p', 'q'], columns: [{ label: 'p ∧ q', expr: 'p and q' }, { label: '¬(p ∧ q)', expr: 'not (p and q)' }, { label: '¬p ∨ ¬q', expr: 'not p or not q' }] },
  'bit-explorer': { bits: 8, value: 37, mode: 'both' },
  'block-diagram': { boxes: [{ id: 'pc', label: 'PC', x: 80, y: 60 }, { id: 'mem', label: 'Memory', x: 260, y: 60, shape: 'cylinder' }, { id: 'cls', label: 'Book', x: 160, y: 200, shape: 'class', fields: ['- title: string'], methods: ['+ display()'] }], arrows: [{ from: 'pc', to: 'mem', label: 'address' }, { from: 'cls', to: 'mem', head: 'open' }], steps: [{ note: 'The PC holds the address.', boxes: ['pc'], arrows: [0] }] },
  gantt: { lanes: ['P1', 'P2'], segments: [{ lane: 'P1', start: 0, end: 3, label: 'P1' }, { lane: 'P2', start: 3, end: 5, label: 'P2' }] },
  venn: { sets: ['A', 'B'], regions: { A: [1, 2], 'A,B': [3], B: [4], none: [5] }, highlight: ['A,B'] },
  automaton: { states: ['E', 'O'], start: 'E', accepting: ['E'], transitions: [{ from: 'E', to: 'E', on: '0' }, { from: 'E', to: 'O', on: '1' }, { from: 'O', to: 'O', on: '0' }, { from: 'O', to: 'E', on: '1' }], test: ['1101', '1010'] },
  'tool-launch': { tool: 'CircuitVerse', url: 'https://circuitverse.org/simulator', description: 'A free simulator.', steps: ['Open it.', 'Add an input.'] },
  'asm-lab': { program: 'LOADI A, 5\nLOADI B, 3\nADD A, B\nSTORE A, 7\nHALT' },
  'scheduler-sim': { processes: [{ id: 'P1', arrival: 0, burst: 5 }, { id: 'P2', arrival: 1, burst: 3 }], algorithm: 'FCFS' },
  'subnet-calc': { ip: '192.168.10.0', prefix: 26 },
};

describe('technical visuals', () => {
  for (const [type, config] of Object.entries(SAMPLES)) {
    it(`${type} renders something real and nothing broken`, () => {
      const html = render(v(type, config));
      assert.ok(html.includes('lesson-visual'), 'no figure');
      assert.ok(!html.includes('not available in this version'), 'no renderer');
      assert.ok(!/NaN|undefined|\[object Object\]|Infinity/.test(html), `broken value: ${(html.match(/.{30}(NaN|undefined|\[object Object\]|Infinity).{30}/) ?? [''])[0]}`);
      assert.ok(html.includes('<svg') || text(html).length > 40, 'nothing drawn');
    });
  }

  it('the code lab runs JavaScript, Python and SQL here but offers no Run button for C until the server says it can', () => {
    assert.ok(text(render(v('code-lab', { language: 'javascript', code: 'console.log(1)' }))).includes('Run'));
    assert.ok(text(render(v('code-lab', { language: 'python', code: 'print(1)' }))).includes('Runs in your browser'));
    assert.ok(text(render(v('code-lab', { language: 'sql', code: 'SELECT 1;', setup: 'CREATE TABLE t(a);' }))).includes('Runs in your browser'));
    const c = text(render(v('code-lab', { language: 'c', code: 'int main(void){return 0;}' })));
    assert.ok(!c.includes('▶ Run'), 'C must not show a Run button before the server confirms a compiler');
    assert.ok(c.includes('Checking the code runner'));
  });

  it('the circuit shows the half adder wiring, its inputs and a live truth table', () => {
    const t = text(render(v('circuit', SAMPLES.circuit)));
    assert.ok(t.includes('A = 0') && t.includes('Sum = 0') && t.includes('Carry = 0'));
    assert.ok(/Sum\s*Carry/.test(t) || (t.includes('Sum') && t.includes('Carry')));
  });

  it('the truth table lists every row and says what the last column is', () => {
    const t = text(render(v('truth-table', SAMPLES['truth-table'])));
    assert.ok(t.includes('The last column is a contingency'));
    assert.ok(t.includes('identical in every row'), 'De Morgan: the last two columns match');
  });

  it('the scheduler computes FCFS averages for its processes', () => {
    const t = text(render(v('scheduler-sim', SAMPLES['scheduler-sim'])));
    assert.ok(t.includes('Average'));
    assert.ok(t.includes('First come, first served'));
  });

  it('the subnet calculator shows the /26 facts', () => {
    const t = text(render(v('subnet-calc', SAMPLES['subnet-calc'])));
    assert.ok(t.includes('255.255.255.192') && t.includes('192.168.10.63') && t.includes('62'));
  });

  it('the assembly lab shows the CPU before any step', () => {
    const t = text(render(v('asm-lab', SAMPLES['asm-lab'])));
    assert.ok(t.includes('Data memory') && t.includes('Step') && t.includes('Flags'));
  });

  it('the bit explorer reads 37 in every base', () => {
    const t = text(render(v('bit-explorer', SAMPLES['bit-explorer'])));
    assert.ok(t.includes('0010 0101') && t.includes('0x25') && t.includes('0o45'));
  });

  it('a tool-launch card opens its tool in a new tab safely and refuses anything but https', () => {
    const ok = render(v('tool-launch', SAMPLES['tool-launch']));
    assert.ok(ok.includes('target="_blank"') && ok.includes('rel="noopener noreferrer"'));
    const bad = render(v('tool-launch', { tool: 'X', url: 'javascript:alert(1)' }));
    assert.ok(!bad.includes('href='), 'must not render a javascript: link');
  });

  it('a bad truth-table expression is reported, never evaluated', () => {
    const html = render(v('truth-table', { vars: ['p'], columns: [{ label: 'x', expr: 'process.exit(1)' }] }));
    assert.ok(html.includes('role="alert"'));
  });
});

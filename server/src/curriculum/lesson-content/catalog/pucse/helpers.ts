// FILE PATH: server/src/curriculum/lesson-content/catalog/pucse/helpers.ts
//
// Builders for the technical visuals of the Pre-University CSE program, so a lesson's visuals read as data
// rather than boilerplate. Every builder returns a CatalogEntry (the visual itself plus where it goes in the
// lesson: under the heading that contains `after`). Re-exports the generic builders (flow, table, cards …).

import type { CatalogEntry } from '../../visual-catalog';
import { V, type After, type Opts } from '../helpers';

export { V, flow, table, compare, cards, tree, sequence, trace, checklist, walkthrough, mcq } from '../helpers';
export type { After, Opts, CatalogEntry };

// ─── Code Lab ───────────────────────────────────────────────────────────────

export interface LabOpts extends Opts {
  stdin?: string;
  expected?: string;
  filename?: string;
  setup?: string;
  hint?: string;
  readOnly?: boolean;
}

/** An editor that runs the code (JavaScript, Python, SQL, HTML in the browser; C, C++, Java on the code runner). */
export const lab = (id: string, after: After, language: string, alt: string, caption: string, code: string, o: LabOpts = {}): CatalogEntry =>
  V(
    'code-lab',
    id,
    after,
    alt,
    caption,
    {
      language,
      code: code.replace(/^\n+|\s+$/g, ''),
      ...(o.stdin !== undefined ? { stdin: o.stdin } : {}),
      ...(o.expected !== undefined ? { expected: o.expected } : {}),
      ...(o.filename ? { filename: o.filename } : {}),
      ...(o.setup ? { setup: o.setup.replace(/^\n+|\s+$/g, '') } : {}),
      ...(o.hint ? { hint: o.hint } : {}),
      ...(o.readOnly ? { readOnly: true } : {}),
    },
    o,
  );

// ─── Diagrams on a grid ─────────────────────────────────────────────────────

export type Shape = 'rect' | 'round' | 'ellipse' | 'diamond' | 'cylinder' | 'circle' | 'terminator' | 'process' | 'decision' | 'io' | 'class' | 'cloud';

/** [id, shape, label, col, row, tone?, sub?] — a box on a grid (col and row may be fractions). */
export type GridBox = [id: string, shape: Shape, label: string, col: number, row: number, tone?: string, sub?: string];
/** [from, to, label?, extras?] */
export type GridArrow = [from: string, to: string, label?: string, extra?: { dashed?: boolean; head?: string; via?: [number, number][]; curve?: number; fromLabel?: string; toLabel?: string }];

export interface GridOpts extends Opts {
  /** Pixels between grid columns / rows. */
  dx?: number;
  dy?: number;
  /** Box size overrides by shape. */
  w?: number;
  h?: number;
  steps?: { title?: string; note: string; boxes?: string[]; arrows?: number[] }[];
  groups?: { label: string; col: number; row: number; cols: number; rows: number; tone?: string }[];
}

/** A block diagram laid out on a grid: boxes by (col, row), arrows between ids. */
export const grid = (id: string, after: After, alt: string, caption: string, boxes: GridBox[], arrows: GridArrow[] = [], o: GridOpts = {}): CatalogEntry => {
  const dx = o.dx ?? 200;
  const dy = o.dy ?? 84;
  // Columns and rows may be negative or fractional while authoring; the canvas starts at the smallest one.
  const minCol = Math.min(0, ...boxes.map((b) => b[3]), ...(o.groups ?? []).map((g) => g.col - 0.5));
  const minRow = Math.min(0, ...boxes.map((b) => b[4]), ...(o.groups ?? []).map((g) => g.row - 0.5));
  const x0 = 100 - minCol * dx;
  const y0 = 46 - minRow * dy;
  return V(
    'block-diagram',
    id,
    after,
    alt,
    caption,
    {
      boxes: boxes.map(([bid, shape, label, col, row, tone, sub]) => ({
        id: bid,
        shape,
        label,
        x: Math.round(x0 + col * dx),
        y: Math.round(y0 + row * dy),
        ...(o.w ? { w: o.w } : {}),
        ...(o.h ? { h: o.h } : {}),
        ...(tone ? { tone } : {}),
        ...(sub ? { sub } : {}),
      })),
      arrows: arrows.map(([from, to, label, extra]) => ({ from, to, ...(label ? { label } : {}), ...(extra ?? {}) })),
      ...(o.groups ? { groups: o.groups.map((g) => ({ label: g.label, x: Math.round(x0 + g.col * dx - dx / 2 + 8), y: Math.round(y0 + g.row * dy - dy / 2 + 8), w: Math.round(g.cols * dx - 16), h: Math.round(g.rows * dy - 16), ...(g.tone ? { tone: g.tone } : {}) })) } : {}),
      ...(o.steps ? { steps: o.steps } : {}),
    },
    o,
  );
};

/** A UML-style class box for grid(): the label is the class name. */
export const cls = (id: string, name: string, col: number, row: number, fields: string[], methods: string[], tone?: string): [GridBox, { fields: string[]; methods: string[] }] => [[id, 'class', name, col, row, tone], { fields, methods }];

/** A block diagram with class boxes (fields and methods) — UML class diagrams. */
export const uml = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  classes: { id: string; name: string; col: number; row: number; fields?: string[]; methods?: string[]; tone?: string }[],
  arrows: GridArrow[],
  o: GridOpts = {},
): CatalogEntry => {
  const dx = o.dx ?? 250;
  const dy = o.dy ?? 190;
  // Columns and rows may be negative or fractional while authoring; the canvas starts at the smallest one.
  const minCol = Math.min(0, ...classes.map((c) => c.col));
  const minRow = Math.min(0, ...classes.map((c) => c.row));
  return V(
    'block-diagram',
    id,
    after,
    alt,
    caption,
    {
      boxes: classes.map((c) => ({ id: c.id, shape: 'class', label: c.name, x: Math.round(110 + (c.col - minCol) * dx), y: Math.round(80 + (c.row - minRow) * dy), fields: c.fields ?? [], methods: c.methods ?? [], ...(c.tone ? { tone: c.tone } : {}) })),
      arrows: arrows.map(([from, to, label, extra]) => ({ from, to, ...(label ? { label } : {}), ...(extra ?? {}) })),
    },
    o,
  );
};

// ─── Structures ─────────────────────────────────────────────────────────────

type ArrRow = { label?: string; cells: (string | number)[]; pointers?: { index: number; label: string; tone?: string }[]; highlight?: { from: number; to: number; tone?: string }[]; dim?: number[]; indexStart?: number; hideIndex?: boolean };
export const arrays = (id: string, after: After, alt: string, caption: string, rows: ArrRow[], o: Opts = {}) => V('array-viz', id, after, alt, caption, { rows }, o);

export const memory = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  regions: { label: string; cells: { name?: string; addr: string; value: string; type?: string; note?: string; pointsTo?: string; tone?: string }[] }[],
  o: Opts = {},
) => V('memory-map', id, after, alt, caption, { regions }, o);

export const linkedLists = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  lists: { label?: string; kind?: 'singly' | 'doubly' | 'circular'; nodes: (string | number)[]; head?: string; tail?: string; cursors?: { index: number; label: string }[] }[],
  o: Opts = {},
) => V('linked-list', id, after, alt, caption, { lists: lists.map((l) => ({ ...l, nodes: l.nodes.map((v) => ({ value: v })) })) }, o);

export const hashTable = (id: string, after: After, alt: string, caption: string, size: number, keys: string[], o: Opts & { hash?: string; method?: string } = {}) =>
  V('hash-table', id, after, alt, caption, { size, keys, hash: o.hash ?? 'sum-mod', method: o.method ?? 'chaining' }, o);

export const stackQueue = (id: string, after: After, alt: string, caption: string, kind: 'stack' | 'queue' | 'call-stack', frames: { items: string[]; op?: string; note: string }[], o: Opts = {}) =>
  V('stack-queue', id, after, alt, caption, { kind, frames }, o);

export const treeSteps = (id: string, after: After, alt: string, caption: string, frames: { root: unknown; note: string; array?: (string | number)[] }[], o: Opts = {}) =>
  V('tree-steps', id, after, alt, caption, { frames }, o);

export const graph = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  nodes: (string | { id: string; label?: string; x?: number; y?: number; tone?: string })[],
  edges: ([string, string] | [string, string, number])[],
  o: Opts & { directed?: boolean; steps?: unknown[]; edgeTones?: Record<string, string> } = {},
) =>
  V(
    'graph',
    id,
    after,
    alt,
    caption,
    {
      nodes: nodes.map((n) => (typeof n === 'string' ? { id: n } : n)),
      edges: edges.map((e) => ({ from: e[0], to: e[1], ...(e[2] !== undefined ? { weight: e[2] } : {}) })),
      ...(o.directed ? { directed: true } : {}),
      ...(o.steps ? { steps: o.steps } : {}),
    },
    o,
  );

export type AlgoFrame = { array: number[]; marks?: Record<number, string>; note: string; counters?: Record<string, number> };
export const algoSteps = (id: string, after: After, alt: string, caption: string, frames: AlgoFrame[], o: Opts = {}) => V('algo-steps', id, after, alt, caption, { frames }, o);

// ─── Logic and computer architecture ────────────────────────────────────────

export const circuit = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  def: {
    inputs: (string | { id: string; label?: string; value?: 0 | 1 })[];
    gates: { id: string; type: string; in: string[]; label?: string }[];
    outputs: ({ id: string; from: string; label?: string })[];
    truthTable?: boolean;
  },
  o: Opts = {},
) => V('circuit', id, after, alt, caption, { inputs: def.inputs.map((i) => (typeof i === 'string' ? { id: i } : i)), gates: def.gates, outputs: def.outputs, ...(def.truthTable ? { truthTable: true } : {}) }, o);

export const truthTable = (id: string, after: After, alt: string, caption: string, vars: string[], columns: [label: string, expr: string][], o: Opts & { reveal?: boolean; symbols?: 'TF' | '01' } = {}) =>
  V('truth-table', id, after, alt, caption, { vars, columns: columns.map(([label, expr]) => ({ label, expr })), ...(o.reveal === false ? { reveal: false } : {}), ...(o.symbols ? { symbols: o.symbols } : {}) }, o);

export const bitExplorer = (id: string, after: After, alt: string, caption: string, bits: 4 | 8 | 16, value: number, o: Opts & { mode?: 'unsigned' | 'twos' | 'both' } = {}) =>
  V('bit-explorer', id, after, alt, caption, { bits, value, mode: o.mode ?? 'both' }, o);

export const asmLab = (id: string, after: After, alt: string, caption: string, program: string, o: Opts & { memory?: number[]; editable?: boolean; memorySize?: 16 | 32 } = {}) =>
  V('asm-lab', id, after, alt, caption, { program: program.replace(/^\n+|\s+$/g, ''), ...(o.memory ? { memory: o.memory } : {}), ...(o.editable === false ? { editable: false } : {}), ...(o.memorySize ? { memorySize: o.memorySize } : {}) }, o);

export const gantt = (id: string, after: After, alt: string, caption: string, lanes: string[], segments: { lane: string; start: number; end: number; label?: string; tone?: string }[], o: Opts & { max?: number; unit?: string } = {}) =>
  V('gantt', id, after, alt, caption, { lanes, segments, ...(o.max ? { max: o.max } : {}), ...(o.unit ? { unit: o.unit } : {}) }, o);

export const scheduler = (id: string, after: After, alt: string, caption: string, processes: [id: string, arrival: number, burst: number][], algorithm: 'FCFS' | 'SJF' | 'SRTF' | 'RR' = 'FCFS', o: Opts & { quantum?: number } = {}) =>
  V('scheduler-sim', id, after, alt, caption, { processes: processes.map(([pid, arrival, burst]) => ({ id: pid, arrival, burst })), algorithm, ...(o.quantum ? { quantum: o.quantum } : {}) }, o);

export const subnet = (id: string, after: After, alt: string, caption: string, ip: string, prefix: number, o: Opts = {}) => V('subnet-calc', id, after, alt, caption, { ip, prefix }, o);

// ─── Mathematics ────────────────────────────────────────────────────────────

export const venn = (id: string, after: After, alt: string, caption: string, sets: string[], regions: Record<string, (string | number)[]>, o: Opts & { highlight?: string[]; universe?: string } = {}) =>
  V('venn', id, after, alt, caption, { sets, regions, ...(o.highlight ? { highlight: o.highlight } : {}), ...(o.universe ? { universe: o.universe } : {}) }, o);

export const automaton = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  states: string[],
  start: string,
  accepting: string[],
  transitions: [from: string, to: string, on: string][],
  o: Opts & { test?: string[]; positions?: Record<string, [number, number]> } = {},
) => V('automaton', id, after, alt, caption, { states, start, accepting, transitions: transitions.map(([from, to, on]) => ({ from, to, on })), ...(o.test ? { test: o.test } : {}), ...(o.positions ? { positions: o.positions } : {}) }, o);

// ─── Tools ──────────────────────────────────────────────────────────────────

export const tool = (id: string, after: After, alt: string, caption: string, name: string, url: string, description: string, steps: string[] = [], o: Opts = {}) =>
  V('tool-launch', id, after, alt, caption, { tool: name, url, description, ...(steps.length ? { steps } : {}) }, o);

// ─── Code shown with a quiz question ("what does this print?") ──────────────

export const C = (code: string) => ({ language: 'c', code });
export const CPP = (code: string) => ({ language: 'cpp', code });
export const JAVA = (code: string) => ({ language: 'java', code });
export const PY = (code: string) => ({ language: 'python', code });
export const JS = (code: string) => ({ language: 'javascript', code });
export const SQL = (code: string) => ({ language: 'sql', code });

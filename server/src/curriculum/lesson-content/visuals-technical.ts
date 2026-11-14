// FILE PATH: server/src/curriculum/lesson-content/visuals-technical.ts
//
// The technical visuals of the Pre-University CSE program: memory and pointer diagrams, arrays,
// linked lists, hash tables, stacks and queues, trees and heaps, graphs, sorting and searching
// animations, logic circuits and truth tables, bit explorers, CPU / network / ER / UML / flow diagrams,
// scheduling timelines, Venn diagrams, finite automata, an assembly simulator, a scheduler and a
// subnet calculator, and the Code Lab (an editor that really runs code).
//
// Like every visual they are DATA: a renderer key, accessibility text and a plain config. Nothing
// here can carry markup or run on the server. Each type below has a deep validator, so a mistake in
// a lesson's diagram (an arrow pointing at a box that does not exist, a frame with no note) is caught
// by the content tests instead of by a learner.

import type { VisualTypeInfo } from './visuals';

export const TECHNICAL_VISUAL_TYPES: Record<string, VisualTypeInfo> = {
  'code-lab': { label: 'Code Lab', description: 'An editor that runs C, C++, Java, Python, JavaScript, SQL or HTML, with input and a check against the expected output.', requires: ['language', 'code'], interactive: true },
  'memory-map': { label: 'Memory and pointer diagram', description: 'Variables in memory with addresses, values and pointer arrows; stack and heap regions.', requires: ['regions'], interactive: false },
  'array-viz': { label: 'Array diagram', description: 'Arrays as indexed cells, with pointers such as low / mid / high and highlighted ranges; several rows show a process step by step.', requires: ['rows'], interactive: false },
  'linked-list': { label: 'Linked list', description: 'Singly, doubly or circular linked lists with head, tail and cursors.', requires: ['lists'], interactive: false },
  'hash-table': { label: 'Hash table', description: 'Buckets, chains or probing, with a hash function and keys the learner can add.', requires: ['size'], interactive: true },
  'stack-queue': { label: 'Stack / queue / call stack', description: 'A stack, queue or call stack changing operation by operation.', requires: ['kind', 'frames'], interactive: true },
  'tree-steps': { label: 'Tree or heap, step by step', description: 'A tree (binary search tree, heap) changing step by step, with the array underneath.', requires: ['frames'], interactive: true },
  graph: { label: 'Graph', description: 'Nodes and edges (directed, weighted); an optional step-through of BFS, DFS or a shortest-path search.', requires: ['nodes', 'edges'], interactive: true },
  'algo-steps': { label: 'Algorithm animation', description: 'Sorting and searching as a step-through of the array with comparisons and swaps counted.', requires: ['frames'], interactive: true },
  circuit: { label: 'Logic circuit simulator', description: 'Logic gates and flip-flops the learner can switch on and off, with a live truth table.', requires: ['inputs', 'gates', 'outputs'], interactive: true },
  'truth-table': { label: 'Truth table', description: 'A truth table generated from logical expressions; the answers can be hidden until the learner has tried.', requires: ['vars', 'columns'], interactive: true },
  'bit-explorer': { label: 'Bit explorer', description: 'Switch bits and read the value in binary, decimal, hexadecimal, octal and two’s complement.', requires: ['bits'], interactive: true },
  'block-diagram': { label: 'Block diagram', description: 'Boxes, shapes and arrows on a canvas: CPU datapaths, networks, ER diagrams, UML classes, flowcharts and architectures; optionally stepped through.', requires: ['boxes'], interactive: false },
  gantt: { label: 'Timeline / Gantt chart', description: 'Bars on a timeline: CPU scheduling, a pipeline, a process life.', requires: ['lanes', 'segments'], interactive: false },
  venn: { label: 'Venn diagram', description: 'Two or three overlapping sets with the elements of each region and a highlighted region.', requires: ['sets'], interactive: true },
  automaton: { label: 'Finite automaton', description: 'States and transitions; the learner can run an input string through it step by step.', requires: ['states', 'transitions', 'start', 'accepting'], interactive: true },
  'tool-launch': { label: 'Open an online tool', description: 'A card that opens a browser-based tool (for example the CircuitVerse simulator) with the steps to follow.', requires: ['tool', 'url'], interactive: false },
  'asm-lab': { label: 'Assembly simulator', description: 'A toy CPU: write assembly, step through fetch, decode and execute, and watch registers and memory.', requires: ['program'], interactive: true },
  'scheduler-sim': { label: 'CPU scheduler simulator', description: 'FCFS, SJF, SRTF and round-robin scheduling with a Gantt chart and the waiting and turnaround times.', requires: ['processes'], interactive: true },
  'subnet-calc': { label: 'Subnet calculator', description: 'An IPv4 address and prefix broken into network, broadcast, mask and host range.', requires: ['ip', 'prefix'], interactive: true },
};

// ─── Small validation helpers ───────────────────────────────────────────────

type Cfg = Record<string, unknown>;
const isObj = (v: unknown): v is Cfg => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown, min = 0, max = 400): v is string => typeof v === 'string' && v.length >= min && v.length <= max;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isIntIn = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

function listOf(v: unknown, min: number, max: number, what: string, errors: string[]): unknown[] {
  if (!Array.isArray(v)) {
    errors.push(`"${what}" must be a list.`);
    return [];
  }
  if (v.length < min || v.length > max) errors.push(`"${what}" needs ${min === max ? min : `${min}–${max}`} item(s), found ${v.length}.`);
  return v.slice(0, max);
}

const TONES = ['good', 'bad', 'warn', 'info', 'accent', 'accent2', 'muted'];
const checkTone = (tone: unknown, where: string, errors: string[]) => {
  if (tone !== undefined && !(typeof tone === 'string' && TONES.includes(tone))) errors.push(`${where}: unknown tone "${String(tone)}" (use ${TONES.join(', ')}).`);
};
const idRe = /^[A-Za-z0-9_.\-+*/=<>$#@:']{1,24}$/;

// ─── Per-type validators ────────────────────────────────────────────────────

const LAB_LANGUAGES = ['c', 'cpp', 'java', 'python', 'javascript', 'sql', 'html', 'text'];

function codeLab(c: Cfg, e: string[]) {
  if (typeof c.language !== 'string' || !LAB_LANGUAGES.includes(c.language)) e.push(`"language" must be one of ${LAB_LANGUAGES.join(', ')}.`);
  if (!isStr(c.code, 0, 20_000)) e.push('"code" must be text (up to 20,000 characters).');
  if (c.stdin !== undefined && !isStr(c.stdin, 0, 4_000)) e.push('"stdin" must be text (up to 4,000 characters).');
  if (c.expected !== undefined && !isStr(c.expected, 0, 4_000)) e.push('"expected" must be text (up to 4,000 characters).');
  if (c.filename !== undefined && !isStr(c.filename, 1, 60)) e.push('"filename" must be a short file name.');
  if (c.setup !== undefined) {
    if (c.language !== 'sql') e.push('"setup" only applies to SQL labs.');
    else if (!isStr(c.setup, 1, 12_000)) e.push('"setup" must be SQL text (up to 12,000 characters).');
  }
  if (c.language === 'sql' && c.setup === undefined) e.push('a SQL lab needs "setup": the statements that create and fill the practice database.');
  if (c.hint !== undefined && !isStr(c.hint, 1, 400)) e.push('"hint" must be a short text.');
  if (c.readOnly !== undefined && typeof c.readOnly !== 'boolean') e.push('"readOnly" must be true or false.');
}

function memoryMap(c: Cfg, e: string[]) {
  const regions = listOf(c.regions, 1, 4, 'regions', e);
  const addrs = new Set<string>();
  for (const r of regions) if (isObj(r)) for (const cell of Array.isArray(r.cells) ? r.cells : []) if (isObj(cell) && isStr(cell.addr, 1, 24)) addrs.add(cell.addr);
  regions.forEach((r, i) => {
    if (!isObj(r) || !isStr(r.label, 1, 40)) return e.push(`region ${i + 1} needs a "label".`);
    const cells = listOf(r.cells, 1, 12, `region ${i + 1} cells`, e);
    cells.forEach((cell, j) => {
      const w = `region ${i + 1}, cell ${j + 1}`;
      if (!isObj(cell)) return e.push(`${w} is not a cell.`);
      if (!isStr(cell.addr, 1, 24)) e.push(`${w} needs an "addr".`);
      if (!isStr(cell.value, 0, 60)) e.push(`${w} needs a "value" (text).`);
      if (cell.name !== undefined && !isStr(cell.name, 1, 40)) e.push(`${w}: "name" must be short text.`);
      if (cell.pointsTo !== undefined && !(isStr(cell.pointsTo, 1, 24) && addrs.has(cell.pointsTo))) e.push(`${w}: "pointsTo" must be the "addr" of a cell in this diagram.`);
      checkTone(cell.tone, w, e);
    });
  });
}

function arrayViz(c: Cfg, e: string[]) {
  listOf(c.rows, 1, 12, 'rows', e).forEach((row, i) => {
    const w = `row ${i + 1}`;
    if (!isObj(row)) return e.push(`${w} is not a row.`);
    const cells = listOf(row.cells, 1, 24, `${w} cells`, e);
    if (cells.some((x) => !(typeof x === 'string' || isNum(x)))) e.push(`${w}: every cell must be text or a number.`);
    const n = cells.length;
    for (const p of Array.isArray(row.pointers) ? row.pointers : []) {
      if (!isObj(p) || !isIntIn(p.index, 0, n - 1) || !isStr(p.label, 1, 12)) e.push(`${w}: a pointer needs an "index" inside the row and a short "label".`);
      else checkTone(p.tone, w, e);
    }
    for (const h of Array.isArray(row.highlight) ? row.highlight : []) {
      if (!isObj(h) || !isIntIn(h.from, 0, n - 1) || !isIntIn(h.to, 0, n - 1) || (h.to as number) < (h.from as number)) e.push(`${w}: a highlight needs "from" and "to" inside the row.`);
      else checkTone(h.tone, w, e);
    }
    if (row.dim !== undefined && !(Array.isArray(row.dim) && row.dim.every((x) => isIntIn(x, 0, n - 1)))) e.push(`${w}: "dim" must list indexes inside the row.`);
    if (row.label !== undefined && !isStr(row.label, 1, 80)) e.push(`${w}: "label" must be short text.`);
  });
}

function linkedList(c: Cfg, e: string[]) {
  listOf(c.lists, 1, 4, 'lists', e).forEach((l, i) => {
    const w = `list ${i + 1}`;
    if (!isObj(l)) return e.push(`${w} is not a list.`);
    if (l.kind !== undefined && !['singly', 'doubly', 'circular'].includes(l.kind as string)) e.push(`${w}: "kind" must be singly, doubly or circular.`);
    const nodes = listOf(l.nodes, 1, 10, `${w} nodes`, e);
    for (const n of nodes) if (!isObj(n) || !(isStr(n.value, 0, 12) || isNum(n.value))) e.push(`${w}: every node needs a short "value".`);
    for (const k of Array.isArray(l.cursors) ? l.cursors : []) if (!isObj(k) || !isIntIn(k.index, 0, nodes.length - 1) || !isStr(k.label, 1, 12)) e.push(`${w}: a cursor needs an "index" of a node and a "label".`);
  });
}

function hashTable(c: Cfg, e: string[]) {
  if (!isIntIn(c.size, 3, 16)) e.push('"size" must be a whole number from 3 to 16.');
  if (c.hash !== undefined && !['sum-mod', 'length-mod', 'first-letter-mod'].includes(c.hash as string)) e.push('"hash" must be sum-mod, length-mod or first-letter-mod.');
  if (c.method !== undefined && !['chaining', 'linear-probing'].includes(c.method as string)) e.push('"method" must be chaining or linear-probing.');
  if (c.keys !== undefined && !(Array.isArray(c.keys) && c.keys.length <= 24 && c.keys.every((k) => isStr(k, 1, 16)))) e.push('"keys" must be a list of short words.');
}

function stackQueue(c: Cfg, e: string[]) {
  if (!['stack', 'queue', 'call-stack'].includes(c.kind as string)) e.push('"kind" must be stack, queue or call-stack.');
  listOf(c.frames, 1, 40, 'frames', e).forEach((f, i) => {
    if (!isObj(f) || !Array.isArray(f.items) || f.items.length > 12 || !f.items.every((x) => isStr(x, 0, 28))) e.push(`frame ${i + 1} needs "items": up to 12 short texts.`);
    else if (!isStr(f.note, 3, 300)) e.push(`frame ${i + 1} needs a "note".`);
  });
}

function checkTreeNode(n: unknown, where: string, e: string[], depth = 0): number {
  if (!isObj(n) || !isStr(n.label, 1, 28)) {
    e.push(`${where}: every node needs a short "label".`);
    return 0;
  }
  checkTone(n.tone, where, e);
  const kids = Array.isArray(n.children) ? n.children : [];
  if (kids.length > 3) e.push(`${where}: a node can have at most 3 children.`);
  if (depth > 6) e.push(`${where}: the tree is too deep (7 levels at most).`);
  return 1 + kids.reduce((s: number, k) => s + checkTreeNode(k, where, e, depth + 1), 0);
}

function treeSteps(c: Cfg, e: string[]) {
  listOf(c.frames, 1, 30, 'frames', e).forEach((f, i) => {
    const w = `frame ${i + 1}`;
    if (!isObj(f)) return e.push(`${w} is not a frame.`);
    if (checkTreeNode(f.root, w, e) > 31) e.push(`${w}: too many nodes (31 at most).`);
    if (!isStr(f.note, 3, 300)) e.push(`${w} needs a "note".`);
    if (f.array !== undefined && !(Array.isArray(f.array) && f.array.length <= 20 && f.array.every((x) => isStr(x, 0, 8) || isNum(x)))) e.push(`${w}: "array" must be up to 20 short values.`);
  });
}

function graph(c: Cfg, e: string[]) {
  const nodes = listOf(c.nodes, 1, 14, 'nodes', e);
  const ids = new Set<string>();
  for (const n of nodes) {
    if (!isObj(n) || !isStr(n.id, 1, 12)) {
      e.push('every node needs a short "id".');
      continue;
    }
    if (ids.has(n.id)) e.push(`duplicate node id "${n.id}".`);
    ids.add(n.id);
    if ((n.x !== undefined && !isNum(n.x)) || (n.y !== undefined && !isNum(n.y))) e.push(`node "${n.id}": "x" and "y" must be numbers.`);
    checkTone(n.tone, `node "${n.id}"`, e);
  }
  const edges = listOf(c.edges, 0, 40, 'edges', e);
  for (const ed of edges) {
    if (!isObj(ed) || !ids.has(ed.from as string) || !ids.has(ed.to as string)) e.push('every edge needs "from" and "to" that are node ids.');
    else if (ed.weight !== undefined && !isNum(ed.weight)) e.push('an edge "weight" must be a number.');
  }
  if (c.steps !== undefined)
    listOf(c.steps, 1, 40, 'steps', e).forEach((s, i) => {
      const w = `step ${i + 1}`;
      if (!isObj(s) || !isStr(s.note, 3, 300)) return e.push(`${w} needs a "note".`);
      for (const key of ['visit', 'queue', 'stack']) {
        const v = s[key];
        if (v !== undefined && !(Array.isArray(v) && v.every((x) => ids.has(x as string)))) e.push(`${w}: "${key}" must list node ids.`);
      }
      if (s.current !== undefined && !ids.has(s.current as string)) e.push(`${w}: "current" must be a node id.`);
      for (const pair of Array.isArray(s.edges) ? s.edges : []) if (!(Array.isArray(pair) && pair.length === 2 && ids.has(pair[0]) && ids.has(pair[1]))) e.push(`${w}: "edges" must be pairs of node ids.`);
      if (s.dist !== undefined && !isObj(s.dist)) e.push(`${w}: "dist" must map node ids to values.`);
    });
}

const MARKS = ['compare', 'swap', 'sorted', 'pivot', 'found', 'range', 'min', 'current'];
function algoSteps(c: Cfg, e: string[]) {
  listOf(c.frames, 1, 90, 'frames', e).forEach((f, i) => {
    const w = `frame ${i + 1}`;
    if (!isObj(f)) return e.push(`${w} is not a frame.`);
    const arr = Array.isArray(f.array) ? f.array : [];
    if (arr.length < 1 || arr.length > 20 || !arr.every(isNum)) e.push(`${w} needs "array": 1–20 numbers.`);
    if (!isStr(f.note, 3, 300)) e.push(`${w} needs a "note".`);
    if (f.marks !== undefined) {
      if (!isObj(f.marks)) e.push(`${w}: "marks" must map indexes to marks.`);
      else
        for (const [k, v] of Object.entries(f.marks)) {
          if (!isIntIn(Number(k), 0, arr.length - 1)) e.push(`${w}: mark index ${k} is outside the array.`);
          if (!MARKS.includes(v as string)) e.push(`${w}: unknown mark "${String(v)}" (use ${MARKS.join(', ')}).`);
        }
    }
    if (f.counters !== undefined && !(isObj(f.counters) && Object.values(f.counters).every(isNum))) e.push(`${w}: "counters" must map names to numbers.`);
  });
}

const GATES = ['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR', 'XNOR', 'BUF', 'DFF', 'TFF', 'JKFF'];
const GATE_INPUTS: Record<string, number> = { AND: 2, OR: 2, NOT: 1, XOR: 2, NAND: 2, NOR: 2, XNOR: 2, BUF: 1, DFF: 1, TFF: 1, JKFF: 2 };
function circuit(c: Cfg, e: string[]) {
  const inputs = listOf(c.inputs, 1, 6, 'inputs', e);
  const ids = new Set<string>();
  for (const i of inputs) {
    if (!isObj(i) || !isStr(i.id, 1, 10)) e.push('every input needs a short "id".');
    else {
      if (ids.has(i.id)) e.push(`duplicate id "${i.id}".`);
      ids.add(i.id);
      if (i.value !== undefined && i.value !== 0 && i.value !== 1) e.push(`input "${i.id}": "value" must be 0 or 1.`);
    }
  }
  const gates = listOf(c.gates, 0, 24, 'gates', e);
  for (const g of gates) {
    if (!isObj(g) || !isStr(g.id, 1, 10)) e.push('every gate needs a short "id".');
    else {
      if (ids.has(g.id)) e.push(`duplicate id "${g.id}".`);
      ids.add(g.id);
    }
  }
  for (const g of gates) {
    if (!isObj(g)) continue;
    if (!GATES.includes(g.type as string)) {
      e.push(`gate "${String(g.id)}": unknown type "${String(g.type)}" (use ${GATES.join(', ')}).`);
      continue;
    }
    const inn = Array.isArray(g.in) ? g.in : [];
    if (inn.length !== GATE_INPUTS[g.type as string]) e.push(`gate "${String(g.id)}": ${g.type} takes ${GATE_INPUTS[g.type as string]} input(s), found ${inn.length}.`);
    for (const ref of inn) if (!ids.has(ref as string)) e.push(`gate "${String(g.id)}": input "${String(ref)}" is not an input or gate.`);
  }
  for (const o of listOf(c.outputs, 1, 8, 'outputs', e)) if (!isObj(o) || !isStr(o.id, 1, 10) || !ids.has(o.from as string)) e.push('every output needs an "id" and a "from" that is an input or gate.');
  if (c.truthTable !== undefined && typeof c.truthTable !== 'boolean') e.push('"truthTable" must be true or false.');
  if (c.truthTable && inputs.length > 5) e.push('a live truth table needs at most 5 inputs.');
}

const EXPR = /^[A-Za-z0-9\s()¬∧∨⊕→↔!&|^~<>=\-]+$/;
function truthTable(c: Cfg, e: string[]) {
  const vars = listOf(c.vars, 1, 4, 'vars', e);
  if (!vars.every((v) => typeof v === 'string' && /^[A-Za-z]{1,3}$/.test(v))) e.push('"vars" must be short letter names such as p, q, r.');
  listOf(c.columns, 1, 8, 'columns', e).forEach((col, i) => {
    if (!isObj(col) || !isStr(col.label, 1, 40) || !isStr(col.expr, 1, 120) || !EXPR.test(col.expr as string)) e.push(`column ${i + 1} needs a "label" and an "expr" written with the variables, and/or/not/xor/implies/iff and brackets.`);
  });
}

function bitExplorer(c: Cfg, e: string[]) {
  if (![4, 8, 16].includes(c.bits as number)) e.push('"bits" must be 4, 8 or 16.');
  if (c.value !== undefined && !isIntIn(c.value, 0, 65_535)) e.push('"value" must be a whole number from 0 to 65535.');
  if (c.mode !== undefined && !['unsigned', 'twos', 'both'].includes(c.mode as string)) e.push('"mode" must be unsigned, twos or both.');
}

const SHAPES = ['rect', 'round', 'ellipse', 'diamond', 'cylinder', 'circle', 'terminator', 'process', 'decision', 'io', 'class', 'cloud'];
const HEADS = ['end', 'both', 'none', 'open', 'diamond', 'filled-diamond'];
function blockDiagram(c: Cfg, e: string[]) {
  const boxes = listOf(c.boxes, 1, 40, 'boxes', e);
  const ids = new Set<string>();
  for (const b of boxes) {
    if (!isObj(b) || !isStr(b.id, 1, 24) || !isStr(b.label, 0, 120)) {
      e.push('every box needs an "id" and a "label".');
      continue;
    }
    if (ids.has(b.id)) e.push(`duplicate box id "${b.id}".`);
    ids.add(b.id);
    if (!isNum(b.x) || !isNum(b.y) || b.x < 0 || b.y < 0 || b.x > 2_000 || b.y > 2_000) e.push(`box "${b.id}" needs "x" and "y" between 0 and 2000.`);
    if ((b.w !== undefined && !isNum(b.w)) || (b.h !== undefined && !isNum(b.h))) e.push(`box "${b.id}": "w" and "h" must be numbers.`);
    if (b.shape !== undefined && !SHAPES.includes(b.shape as string)) e.push(`box "${b.id}": unknown shape "${String(b.shape)}" (use ${SHAPES.join(', ')}).`);
    if (b.shape === 'class' && b.fields !== undefined && !(Array.isArray(b.fields) && b.fields.every((x) => isStr(x, 1, 60)))) e.push(`box "${b.id}": "fields" must be a list of short texts.`);
    if (b.methods !== undefined && !(Array.isArray(b.methods) && b.methods.every((x) => isStr(x, 1, 60)))) e.push(`box "${b.id}": "methods" must be a list of short texts.`);
    checkTone(b.tone, `box "${b.id}"`, e);
  }
  const arrows = listOf(c.arrows ?? [], 0, 70, 'arrows', e);
  arrows.forEach((a, i) => {
    if (!isObj(a) || !ids.has(a.from as string) || !ids.has(a.to as string)) return e.push(`arrow ${i + 1} needs "from" and "to" that are box ids.`);
    if (a.head !== undefined && !HEADS.includes(a.head as string)) e.push(`arrow ${i + 1}: unknown head "${String(a.head)}" (use ${HEADS.join(', ')}).`);
    if (a.label !== undefined && !isStr(a.label, 1, 40)) e.push(`arrow ${i + 1}: "label" must be short text.`);
    if (a.via !== undefined && !(Array.isArray(a.via) && a.via.every((p) => Array.isArray(p) && p.length === 2 && p.every(isNum)))) e.push(`arrow ${i + 1}: "via" must be a list of [x, y] points.`);
  });
  for (const g of Array.isArray(c.groups) ? c.groups : []) if (!isObj(g) || !isStr(g.label, 0, 60) || !isNum(g.x) || !isNum(g.y) || !isNum(g.w) || !isNum(g.h)) e.push('a group needs "label", "x", "y", "w" and "h".');
  if (c.steps !== undefined)
    listOf(c.steps, 1, 24, 'steps', e).forEach((s, i) => {
      const w = `step ${i + 1}`;
      if (!isObj(s) || !isStr(s.note, 3, 320)) return e.push(`${w} needs a "note".`);
      for (const id of Array.isArray(s.boxes) ? s.boxes : []) if (!ids.has(id as string)) e.push(`${w}: box "${String(id)}" does not exist.`);
      for (const k of Array.isArray(s.arrows) ? s.arrows : []) if (!isIntIn(k, 0, arrows.length - 1)) e.push(`${w}: arrow index ${String(k)} does not exist.`);
    });
}

function gantt(c: Cfg, e: string[]) {
  const lanes = listOf(c.lanes, 1, 12, 'lanes', e);
  if (!lanes.every((l) => isStr(l, 1, 24))) e.push('every lane must be a short name.');
  let maxEnd = 0;
  listOf(c.segments, 1, 90, 'segments', e).forEach((s, i) => {
    if (!isObj(s) || !lanes.includes(s.lane) || !isNum(s.start) || !isNum(s.end) || (s.end as number) <= (s.start as number) || (s.start as number) < 0) return e.push(`segment ${i + 1} needs a "lane" from the list and "start" < "end".`);
    maxEnd = Math.max(maxEnd, s.end as number);
    checkTone(s.tone, `segment ${i + 1}`, e);
  });
  if (c.max !== undefined && !(isNum(c.max) && c.max >= maxEnd && c.max <= 200)) e.push('"max" must cover every segment (and be 200 at most).');
}

function venn(c: Cfg, e: string[]) {
  const sets = listOf(c.sets, 2, 3, 'sets', e);
  if (!sets.every((s) => isStr(s, 1, 12))) e.push('every set needs a short label such as A.');
  const letters = sets.filter((s): s is string => typeof s === 'string');
  const keys = new Set<string>(['none']);
  for (let mask = 1; mask < 1 << letters.length; mask++) keys.add(letters.filter((_, i) => mask & (1 << i)).join(','));
  if (c.regions !== undefined) {
    if (!isObj(c.regions)) e.push('"regions" must map region names to their elements.');
    else
      for (const [k, v] of Object.entries(c.regions)) {
        if (!keys.has(k)) e.push(`region "${k}" does not exist (use ${[...keys].join(' | ')}).`);
        if (!(Array.isArray(v) && v.every((x) => isStr(x, 0, 14) || isNum(x)) && v.length <= 12)) e.push(`region "${k}" must list up to 12 short elements.`);
      }
  }
  for (const h of Array.isArray(c.highlight) ? c.highlight : []) if (!keys.has(h as string)) e.push(`highlight "${String(h)}" is not a region.`);
}

function automaton(c: Cfg, e: string[]) {
  const states = listOf(c.states, 1, 10, 'states', e).filter((s): s is string => typeof s === 'string' && s.length > 0 && s.length <= 8);
  const set = new Set(states);
  if (set.size !== states.length) e.push('state names must be different.');
  if (!set.has(c.start as string)) e.push('"start" must be one of the states.');
  if (!(Array.isArray(c.accepting) && c.accepting.every((s) => set.has(s as string)))) e.push('"accepting" must list states.');
  const symbols = new Set<string>();
  listOf(c.transitions, 1, 40, 'transitions', e).forEach((t, i) => {
    if (!isObj(t) || !set.has(t.from as string) || !set.has(t.to as string) || !isStr(t.on, 1, 12)) return e.push(`transition ${i + 1} needs "from", "to" (states) and "on" (symbols, comma separated).`);
    for (const sym of (t.on as string).split(',')) symbols.add(sym.trim());
  });
  for (const x of Array.isArray(c.test) ? c.test : []) if (!isStr(x, 0, 24) || [...(x as string)].some((ch) => !symbols.has(ch))) e.push(`test string "${String(x)}" uses a symbol that no transition reads.`);
  for (const pos of Object.values(isObj(c.positions) ? c.positions : {})) if (!(Array.isArray(pos) && pos.length === 2 && pos.every(isNum))) e.push('"positions" must map states to [x, y].');
}

function toolLaunch(c: Cfg, e: string[]) {
  if (!isStr(c.tool, 2, 60)) e.push('"tool" must be the tool’s name.');
  if (!(isStr(c.url, 10, 500) && /^https:\/\/[^\s"'<>\\]+$/i.test(c.url))) e.push('"url" must be an https:// address.');
  if (c.steps !== undefined && !(Array.isArray(c.steps) && c.steps.length <= 10 && c.steps.every((s) => isStr(s, 3, 240)))) e.push('"steps" must be up to 10 short instructions.');
  if (c.description !== undefined && !isStr(c.description, 3, 400)) e.push('"description" must be short text.');
}

function asmLab(c: Cfg, e: string[]) {
  if (!isStr(c.program, 1, 4_000)) e.push('"program" must be assembly text (up to 4,000 characters).');
  if (c.memory !== undefined && !(Array.isArray(c.memory) && c.memory.length <= 32 && c.memory.every((x) => isIntIn(x, 0, 255)))) e.push('"memory" must be up to 32 whole numbers from 0 to 255.');
  if (c.memorySize !== undefined && ![16, 32].includes(c.memorySize as number)) e.push('"memorySize" must be 16 or 32.');
  if (c.maxSteps !== undefined && !isIntIn(c.maxSteps, 10, 2_000)) e.push('"maxSteps" must be from 10 to 2000.');
}

function schedulerSim(c: Cfg, e: string[]) {
  listOf(c.processes, 1, 8, 'processes', e).forEach((p, i) => {
    if (!isObj(p) || !isStr(p.id, 1, 8) || !isIntIn(p.arrival, 0, 60) || !isIntIn(p.burst, 1, 40)) e.push(`process ${i + 1} needs an "id", a whole "arrival" (0–60) and a whole "burst" (1–40).`);
  });
  if (c.algorithm !== undefined && !['FCFS', 'SJF', 'SRTF', 'RR'].includes(c.algorithm as string)) e.push('"algorithm" must be FCFS, SJF, SRTF or RR.');
  if (c.quantum !== undefined && !isIntIn(c.quantum, 1, 10)) e.push('"quantum" must be from 1 to 10.');
}

function subnetCalc(c: Cfg, e: string[]) {
  const parts = typeof c.ip === 'string' ? c.ip.split('.') : [];
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) e.push('"ip" must be a dotted IPv4 address such as 192.168.10.0.');
  if (!isIntIn(c.prefix, 0, 32)) e.push('"prefix" must be a whole number from 0 to 32.');
}

const VALIDATORS: Record<string, (c: Cfg, e: string[]) => void> = {
  'code-lab': codeLab,
  'memory-map': memoryMap,
  'array-viz': arrayViz,
  'linked-list': linkedList,
  'hash-table': hashTable,
  'stack-queue': stackQueue,
  'tree-steps': treeSteps,
  graph,
  'algo-steps': algoSteps,
  circuit,
  'truth-table': truthTable,
  'bit-explorer': bitExplorer,
  'block-diagram': blockDiagram,
  gantt,
  venn,
  automaton,
  'tool-launch': toolLaunch,
  'asm-lab': asmLab,
  'scheduler-sim': schedulerSim,
  'subnet-calc': subnetCalc,
};

/** Problems with the config of a technical visual (empty = fine). Other visual types return []. */
export function validateTechnicalConfig(type: string, config: Record<string, unknown>): string[] {
  const check = VALIDATORS[type];
  if (!check) return [];
  const errors: string[] = [];
  check(config, errors);
  return errors;
}

// FILE PATH: client/lib/littleCoders/blockLines.ts
//
// The block-line format Little Coders lessons are written in, parsed for drawing (the server has the
// matching validator, server/src/little-coders/blocks/block-dsl.ts — every line shown here has already
// been checked against the real Scratch / TM2Scratch / EduBlocks block names).
//
//     <indent><category>| <block text>
//
// Two spaces of indent per level. Slots in a Scratch block's text: (…) round, […] dropdown / text,
// {…} true/false; slots may nest ("if {(score) > (10)} then"). EduBlocks lines are plain Python.

import type { LcBlockLanguage } from './types';

export interface ParsedLine {
  depth: number;
  category: string;
  text: string;
}

const LINE_RE = /^( *)([a-z0-9]+)\| ?(.*)$/;

/** Splits "  motion| change y by (20)" into indent depth, category and text. */
export function parseLine(raw: string): ParsedLine | null {
  const m = LINE_RE.exec(raw);
  if (!m || m[1].length % 2 !== 0) return null;
  const text = m[3].trim();
  return text ? { depth: m[1].length / 2, category: m[2], text } : null;
}

// ─── Slots ──────────────────────────────────────────────────────────────────

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'round'; inner: string; parts: Segment[] | null }
  | { kind: 'string'; inner: string }
  | { kind: 'bool'; inner: string; parts: Segment[] };

const CLOSERS: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

/** Finds the end of the slot that opens at `at` (honouring nesting); -1 when brackets do not balance. */
function slotEnd(text: string, at: number): number {
  const stack = [CLOSERS[text[at]]];
  for (let j = at + 1; j < text.length; j++) {
    const c = text[j];
    if (CLOSERS[c]) stack.push(CLOSERS[c]);
    else if (c === ')' || c === ']' || c === '}') {
      if (stack[stack.length - 1] !== c) return -1;
      stack.pop();
      if (stack.length === 0) return j;
    }
  }
  return -1;
}

const isPlainValue = (s: string) => {
  const t = s.trim();
  return t === '' || /^-?\d+(\.\d+)?$/.test(t) || /^[A-Za-z_][\w -]*$/.test(t);
};

/** Text and slots of one Scratch block (nested slots are parsed too). */
export function segmentsOf(text: string): Segment[] {
  const out: Segment[] = [];
  let buf = '';
  let i = 0;
  const flush = () => {
    if (buf) out.push({ kind: 'text', text: buf });
    buf = '';
  };
  while (i < text.length) {
    const ch = text[i];
    if (CLOSERS[ch]) {
      const end = slotEnd(text, i);
      if (end > i) {
        flush();
        const inner = text.slice(i + 1, end);
        if (ch === '(') out.push({ kind: 'round', inner, parts: isPlainValue(inner) ? null : segmentsOf(inner) });
        else if (ch === '[') out.push({ kind: 'string', inner });
        else out.push({ kind: 'bool', inner, parts: segmentsOf(inner) });
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

// ─── Block trees ────────────────────────────────────────────────────────────

export interface BlockNode {
  /** 1-based line number in the original list (for notes and highlighting). */
  line: number;
  category: string;
  text: string;
  children: BlockNode[];
  /** For an "if … then" block with an "else" branch. */
  elseLine?: number;
  elseChildren?: BlockNode[];
  /** True for a block that is not inside another (a script's first level). */
  top: boolean;
}

/** True when this Scratch block starts a script (a hat). */
export function isHat(category: string, text: string): boolean {
  return (category === 'events' && /^when /.test(text)) || (category === 'control' && /^when I start as a clone$/.test(text));
}

/** Turns the flat, indented lines into nested blocks. Lines that do not parse are skipped. */
export function buildBlockTree(lines: string[]): BlockNode[] {
  const roots: BlockNode[] = [];
  const stack: { depth: number; node: BlockNode; inElse: boolean }[] = [];
  lines.forEach((raw, idx) => {
    const p = parseLine(raw);
    if (!p) return;
    const node: BlockNode = { line: idx + 1, category: p.category, text: p.text, children: [], top: false };
    // Leave every block that is deeper than this line.
    while (stack.length && stack[stack.length - 1].depth > p.depth) stack.pop();
    const sibling = stack.length ? stack[stack.length - 1] : null;
    if (sibling && sibling.depth === p.depth) {
      // An "else" / "else:" at the same depth continues the "if" above it instead of starting a new block.
      if (/^(else|else:)$/.test(p.text) && /^(if|elif)\b/.test(sibling.node.text)) {
        sibling.node.elseLine = node.line;
        sibling.node.elseChildren = [];
        sibling.inElse = true;
        return;
      }
      stack.pop();
    }
    const host = stack.length ? stack[stack.length - 1] : null;
    if (host) (host.inElse ? (host.node.elseChildren as BlockNode[]) : host.node.children).push(node);
    else {
      node.top = true;
      roots.push(node);
    }
    stack.push({ depth: p.depth, node, inElse: false });
  });
  return roots;
}

// ─── Colours ────────────────────────────────────────────────────────────────

export interface BlockColor {
  fill: string;
  edge: string;
}

const SCRATCH_COLORS: Record<string, BlockColor> = {
  motion: { fill: '#4C97FF', edge: '#3373CC' },
  looks: { fill: '#9966FF', edge: '#774DCB' },
  sound: { fill: '#CF63CF', edge: '#BD42BD' },
  events: { fill: '#FFBF00', edge: '#CC9900' },
  control: { fill: '#FFAB19', edge: '#CF8B17' },
  sensing: { fill: '#5CB1D6', edge: '#2E8EB8' },
  operators: { fill: '#59C059', edge: '#389438' },
  variables: { fill: '#FF8C1A', edge: '#DB6E00' },
  myblocks: { fill: '#FF6680', edge: '#FF3355' },
  tm2scratch: { fill: '#0FBD8C', edge: '#0B8E6A' },
};

const EDUBLOCKS_COLORS: Record<string, BlockColor> = {
  imports: { fill: '#7C8DA6', edge: '#5C6B82' },
  statements: { fill: '#4C97FF', edge: '#3373CC' },
  text: { fill: '#FFAB19', edge: '#CF8B17' },
  math: { fill: '#E5566D', edge: '#BC3E54' },
  logic: { fill: '#5CB1D6', edge: '#2E8EB8' },
  lists: { fill: '#D9704A', edge: '#B0502F' },
  loops: { fill: '#59C059', edge: '#389438' },
  functions: { fill: '#9966FF', edge: '#774DCB' },
  random: { fill: '#CF63CF', edge: '#BD42BD' },
  variables: { fill: '#FF8C1A', edge: '#DB6E00' },
  turtle: { fill: '#0FBD8C', edge: '#0B8E6A' },
};

export function blockColor(language: LcBlockLanguage, category: string): BlockColor {
  const table = language === 'scratch' ? SCRATCH_COLORS : EDUBLOCKS_COLORS;
  return table[category] ?? { fill: '#7C8DA6', edge: '#5C6B82' };
}

const CATEGORY_LABELS: Record<string, string> = {
  motion: 'Motion',
  looks: 'Looks',
  sound: 'Sound',
  events: 'Events',
  control: 'Control',
  sensing: 'Sensing',
  operators: 'Operators',
  variables: 'Variables',
  myblocks: 'My Blocks',
  tm2scratch: 'TM2Scratch',
  imports: 'Imports',
  statements: 'Statements',
  text: 'Text',
  math: 'Math',
  logic: 'Logic',
  lists: 'Lists',
  loops: 'Loops',
  functions: 'Functions',
  random: 'Random',
  turtle: 'Turtle',
};

export const categoryLabel = (category: string) => CATEGORY_LABELS[category] ?? category;

/** The text of a block as a plain sentence (slots shown by their content) — for screen readers. */
export function plainBlockText(text: string): string {
  return text.replace(/[(){}[\]]/g, '').replace(/\s+/g, ' ').trim();
}

/** The Python a stack of EduBlocks lines stands for (two-space levels become four). */
export function toPythonSource(lines: string[]): string {
  return lines
    .map((raw) => {
      const p = parseLine(raw);
      return p ? `${'    '.repeat(p.depth)}${p.text}` : '';
    })
    .join('\n');
}

// FILE PATH: server/src/little-coders/blocks/block-dsl.ts
//
// Parsing and checking of the block-line format (see lc.types.ts):
//
//     <indent><category>| <block text>
//
// Two spaces of indent per level. Slots in the text: (…) round, […] dropdown / text,
// {…} true/false; slots may nest ("if {(score) > (10)} then"). The same module is
// mirrored on the client (client/lib/littleCoders/blockLines.ts) for drawing; this one
// only validates, so a lesson or question with a block that does not exist is rejected.

import {
  EDUBLOCKS_ALLOWED_CALLS,
  EDUBLOCKS_ALLOWED_IMPORT,
  EDUBLOCKS_ALLOWED_METHODS,
  EDUBLOCKS_FORBIDDEN,
  SCRATCH_CATALOG,
  type BlockShape,
} from './block-catalog';
import {
  EDUBLOCKS_CATEGORIES,
  SCRATCH_CATEGORIES,
  type LcBlockLanguage,
  type ScratchCategory,
} from '../lc.types';

export interface ParsedLine {
  depth: number;
  category: string;
  text: string;
}

const LINE_RE = /^( *)([a-z0-9]+)\| ?(.*)$/;

/** Splits "  motion| change y by (20)" into indent depth, category and text. */
export function parseLine(raw: string): ParsedLine | null {
  const m = LINE_RE.exec(raw);
  if (!m) return null;
  const spaces = m[1].length;
  if (spaces % 2 !== 0) return null;
  const text = m[3].trim();
  if (!text) return null;
  return { depth: spaces / 2, category: m[2], text };
}

export interface Slot {
  kind: 'round' | 'text' | 'bool';
  inner: string;
}

const OPEN: Record<string, { close: string; kind: Slot['kind'] }> = {
  '(': { close: ')', kind: 'round' },
  '[': { close: ']', kind: 'text' },
  '{': { close: '}', kind: 'bool' },
};

/** Replaces every top-level slot by a placeholder; null when the brackets do not balance. */
export function templateOf(
  text: string,
): { template: string; slots: Slot[] } | null {
  let template = '';
  const slots: Slot[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const open = OPEN[ch];
    if (!open) {
      if (ch === ')' || ch === ']' || ch === '}') return null;
      template += ch;
      i++;
      continue;
    }
    // Find the matching close, honouring nesting of all three kinds.
    const stack: string[] = [open.close];
    let j = i + 1;
    while (j < text.length && stack.length > 0) {
      const c = text[j];
      if (OPEN[c]) stack.push(OPEN[c].close);
      else if (c === ')' || c === ']' || c === '}') {
        if (stack[stack.length - 1] !== c) return null;
        stack.pop();
      }
      j++;
    }
    if (stack.length > 0) return null;
    slots.push({ kind: open.kind, inner: text.slice(i + 1, j - 1) });
    template += open.kind === 'bool' ? '{}' : '_';
    i = j;
  }
  return { template: template.replace(/\s+/g, ' ').trim(), slots };
}

const catalogIndex = (() => {
  const byTemplate = new Map<
    string,
    { category: ScratchCategory; shape: BlockShape }[]
  >();
  for (const category of SCRATCH_CATEGORIES) {
    for (const e of SCRATCH_CATALOG[category]) {
      const list = byTemplate.get(e.t) ?? [];
      list.push({ category, shape: e.shape });
      byTemplate.set(e.t, list);
    }
  }
  return byTemplate;
})();

/** A number, or a single word (a variable / list / sprite name). Anything else in a round
 *  slot must be a real reporter or operator block. */
const isPlainValue = (s: string) => {
  const t = s.trim();
  return t === '' || /^-?\d+(\.\d+)?$/.test(t) || /^[A-Za-z_][\w-]*$/.test(t);
};

/** Problems with the Scratch block lines (empty list = fine). */
export function validateScratchLines(
  lines: string[],
  where = 'stack',
): string[] {
  const problems: string[] = [];
  let prevDepth = -1;
  lines.forEach((raw, idx) => {
    const at = `${where} line ${idx + 1}`;
    const p = parseLine(raw);
    if (!p) {
      problems.push(`${at}: not in the "category| block" format ("${raw}")`);
      return;
    }
    if (!(SCRATCH_CATEGORIES as readonly string[]).includes(p.category)) {
      problems.push(`${at}: unknown Scratch category "${p.category}"`);
      return;
    }
    if (p.depth > prevDepth + 1)
      problems.push(
        `${at}: indented more than one level deeper than the line above`,
      );
    prevDepth = p.depth;
    const tpl = templateOf(p.text);
    if (!tpl) {
      problems.push(`${at}: unbalanced brackets in "${p.text}"`);
      return;
    }
    const entries = catalogIndex
      .get(tpl.template)
      ?.filter((e) => e.category === p.category);
    if (!entries || entries.length === 0) {
      problems.push(
        `${at}: "${p.text}" is not a ${p.category} block (template "${tpl.template}")`,
      );
      return;
    }
    // Nested expressions must be real reporter / boolean blocks (or plain values).
    for (const slot of tpl.slots) checkSlot(slot, at, problems);
  });
  return problems;
}

function checkSlot(slot: Slot, at: string, problems: string[]): void {
  const inner = slot.inner.trim();
  if (slot.kind === 'text') return; // a dropdown choice or text — free
  if (isPlainValue(inner) && slot.kind === 'round') return;
  const tpl = templateOf(inner);
  if (!tpl) {
    problems.push(`${at}: unbalanced brackets inside "${inner}"`);
    return;
  }
  const entries = catalogIndex.get(tpl.template);
  const wantBool = slot.kind === 'bool';
  const ok = entries?.some((e) =>
    wantBool
      ? e.shape === 'boolean'
      : e.shape === 'reporter' || e.shape === 'boolean',
  );
  if (!ok) {
    // a variable written as "{ready}" or a bare name is accepted in a boolean slot
    if (wantBool && isPlainValue(inner)) return;
    problems.push(
      `${at}: "${inner}" is not a known ${wantBool ? 'true/false' : 'value'} block`,
    );
    return;
  }
  for (const s of tpl.slots) checkSlot(s, at, problems);
}

/** Problems with EduBlocks (Python) lines. Execution is checked separately in the tests. */
export function validateEduBlocksLines(
  lines: string[],
  where = 'stack',
): string[] {
  const problems: string[] = [];
  let prevDepth = -1;
  lines.forEach((raw, idx) => {
    const at = `${where} line ${idx + 1}`;
    const p = parseLine(raw);
    if (!p) {
      problems.push(`${at}: not in the "category| code" format ("${raw}")`);
      return;
    }
    if (!(EDUBLOCKS_CATEGORIES as readonly string[]).includes(p.category)) {
      problems.push(`${at}: unknown EduBlocks group "${p.category}"`);
      return;
    }
    if (p.depth > prevDepth + 1)
      problems.push(
        `${at}: indented more than one level deeper than the line above`,
      );
    prevDepth = p.depth;
    for (const f of EDUBLOCKS_FORBIDDEN) {
      if (f.re.test(p.text))
        problems.push(
          `${at}: ${f.name} is not available in EduBlocks ("${p.text}")`,
        );
    }
    // The Imports group offers libraries; these lessons use only random and the Turtle.
    if (
      /^(?:import|from)\s/.test(p.text) &&
      !EDUBLOCKS_ALLOWED_IMPORT.test(p.text)
    ) {
      problems.push(
        `${at}: only the random and turtle libraries are used here ("${p.text}")`,
      );
    }
    // Every called name must be one the toolbox can build.
    const code = p.text.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
    for (const m of code.matchAll(/([A-Za-z_][A-Za-z0-9_.]*)\s*\(/g)) {
      const name = m[1];
      if (/^(if|elif|while|for|def|return|and|or|not|in)$/.test(name)) continue;
      if (EDUBLOCKS_ALLOWED_CALLS.has(name)) continue;
      const parts = name.split('.');
      if (parts.length === 2 && EDUBLOCKS_ALLOWED_METHODS.has(parts[1]))
        continue;
      if (parts.length === 1 && p.category === 'functions') continue; // the learner's own function
      if (parts.length === 1 && isDefinedLater(lines, name)) continue;
      problems.push(
        `${at}: "${name}(" is not an EduBlocks block ("${p.text}")`,
      );
    }
  });
  return problems;
}

function isDefinedLater(lines: string[], name: string): boolean {
  return lines.some((l) => new RegExp(`\\|\\s*def\\s+${name}\\s*\\(`).test(l));
}

export function validateLines(
  language: LcBlockLanguage,
  lines: string[],
  where?: string,
): string[] {
  return language === 'scratch'
    ? validateScratchLines(lines, where)
    : validateEduBlocksLines(lines, where);
}

/** The Python program an EduBlocks stack stands for (two-space levels become four). */
export function toPythonSource(lines: string[]): string {
  return lines
    .map((raw) => {
      const p = parseLine(raw);
      return p ? `${'    '.repeat(p.depth)}${p.text}` : '';
    })
    .join('\n');
}

// ─── The derived "blocks you'll use" list ───────────────────────────────────

/** A block's display name: its label with each slot shown as an empty ( ) / [ ] / < >. */
export function scratchBlockName(text: string): string {
  const tpl = templateOf(text);
  if (!tpl) return text;
  // rebuild from the template so nested expressions disappear
  let i = 0;
  return tpl.template.replace(/_|\{\}/g, (m) => {
    const slot = tpl.slots[i++];
    if (m === '{}') return '< >';
    return slot?.kind === 'text' ? '[ ]' : '( )';
  });
}

/** The head of a Python line as a block name: arguments blanked out. */
export function pythonBlockName(code: string): string {
  const t = code.trim();
  const assign = /^([A-Za-z_]\w*)\s*(\+=|-=|=)\s*(.*)$/.exec(t);
  if (assign && !/^(==)/.test(assign[3]))
    return `${assign[1]} ${assign[2]} ( )`;
  const m = /^(.*?\()(.*)(\)(?::)?)$/.exec(t);
  if (m) return `${m[1]} ${m[3]}`.replace(/\(\s+\)/, '( )');
  if (/:$/.test(t)) return t.replace(/^(if|elif|while)\b.*:$/, '$1 …:');
  return t;
}

/** category → distinct block names, in the order first used. */
export function toolboxOf(
  stacks: { language: LcBlockLanguage; lines: string[] }[],
): { category: string; blocks: string[] }[] {
  const out = new Map<string, string[]>();
  for (const s of stacks) {
    for (const raw of s.lines) {
      const p = parseLine(raw);
      if (!p) continue;
      const name =
        s.language === 'scratch'
          ? scratchBlockName(p.text)
          : pythonBlockName(p.text);
      const list = out.get(p.category) ?? [];
      if (!list.includes(name)) list.push(name);
      out.set(p.category, list);
    }
  }
  return [...out.entries()].map(([category, blocks]) => ({ category, blocks }));
}

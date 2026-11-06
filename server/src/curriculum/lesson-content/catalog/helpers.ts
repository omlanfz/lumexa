// FILE PATH: server/src/curriculum/lesson-content/catalog/helpers.ts
//
// Small builders so a pathway's visual catalog reads as data, not boilerplate.
// Every builder returns a CatalogEntry: the visual itself (type, alt text,
// caption, structured config) plus WHERE it goes (a heading in the lesson).

import type { CatalogEntry } from '../visual-catalog';
import type { QuizQuestion } from '../types';

/** Where in the lesson a visual belongs: under the heading containing `after`. */
export type After = string | RegExp;
export interface Opts {
  /** 'start' (default): after the section's first paragraph; 'end': at the end of the section. */
  at?: 'start' | 'end';
  title?: string;
}

export function V(
  type: string,
  id: string,
  after: After,
  alt: string,
  caption: string,
  config: Record<string, unknown>,
  o: Opts = {},
): CatalogEntry {
  return {
    visual: { id, type, alt, caption, ...(o.title ? { title: o.title } : {}), config },
    placement: { after, at: o.at ?? 'start' },
  };
}

/** A flow node written as "Label|detail|tone" — detail and tone optional. */
export const nodes = (...defs: string[]) =>
  defs.map((d) => {
    const [label, detail, tone] = d.split('|');
    return { label, ...(detail ? { detail } : {}), ...(tone ? { tone } : {}) };
  });

export const flow = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  defs: string[],
  o: Opts & { layout?: 'row' | 'column' | 'cycle'; perRow?: number; edges?: { from: number | string; to: number | string; label?: string; dashed?: boolean }[] } = {},
) => V('flow', id, after, alt, caption, { nodes: nodes(...defs), layout: o.layout ?? 'row', ...(o.perRow ? { perRow: o.perRow } : {}), ...(o.edges ? { edges: o.edges } : {}) }, o);

export const table = (id: string, after: After, alt: string, caption: string, columns: string[], rows: unknown[][], o: Opts & { highlights?: { row: number; col: number; tone?: string; note?: string }[]; title?: string } = {}) =>
  V('table', id, after, alt, caption, { columns, rows, ...(o.highlights ? { highlights: o.highlights } : {}), ...(o.title ? { title: o.title } : {}) }, o);

export const compare = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  before: { title?: string; columns: string[]; rows: unknown[][]; highlights?: { row: number; col: number; tone?: string; note?: string }[] },
  afterT: { title?: string; columns: string[]; rows: unknown[][]; highlights?: { row: number; col: number; tone?: string; note?: string }[] },
  o: Opts & { arrowLabel?: string } = {},
) => V('compare-tables', id, after, alt, caption, { before, after: afterT, ...(o.arrowLabel ? { arrowLabel: o.arrowLabel } : {}) }, o);

export const cards = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  items: { title: string; subtitle?: string; price?: string; bullets?: string[]; tone?: string; badge?: string }[],
  o: Opts = {},
) => V('cards', id, after, alt, caption, { cards: items }, o);

export const tree = (id: string, after: After, alt: string, caption: string, root: unknown, o: Opts = {}) => V('tree', id, after, alt, caption, { root }, o);

export const sequence = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  actors: [string, string][],
  messages: { from: string; to: string; label: string; note?: string; dashed?: boolean }[],
  o: Opts = {},
) => V('sequence', id, after, alt, caption, { actors: actors.map(([id2, label]) => ({ id: id2, label })), messages }, o);

export const trace = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  lines: string[],
  steps: { line: number; vars?: Record<string, unknown>; output?: string; note?: string }[],
  o: Opts = {},
) => V('code-trace', id, after, alt, caption, { lines, steps }, o);

export const checklist = (id: string, after: After, alt: string, caption: string, items: string[], o: Opts & { title?: string } = {}) =>
  V('checklist', id, after, alt, caption, { items, ...(o.title ? { title: o.title } : {}) }, o);

export const walkthrough = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  steps: { title?: string; text?: string; code?: string }[],
  o: Opts = {},
) => V('walkthrough', id, after, alt, caption, { steps }, o);

export const uiMap = (
  id: string,
  after: After,
  alt: string,
  caption: string,
  regions: { id: string; label: string; desc: string; x: number; y: number; w: number; h: number }[],
  o: Opts & { title?: string } = {},
) => V('ui-map', id, after, alt, caption, { regions, ...(o.title ? { title: o.title } : {}) }, o);

export const blocks = (id: string, after: After, alt: string, caption: string, scripts: { title?: string; blocks: unknown[] }[], o: Opts = {}) =>
  V('blocks', id, after, alt, caption, { scripts }, o);

/** Block shorthand for Scratch-style scripts: kind + text, optional children. */
export const blk = (kind: string, text: string, children?: unknown[]) => ({ kind, text, ...(children ? { children } : {}) });

// ─── Authored quiz questions (for lessons whose source has none) ────────────

export const mcq = (id: string, prompt: string, options: string[], correctIndex: number, explanation: string): QuizQuestion => ({
  id,
  type: 'multiple_choice',
  prompt,
  options,
  correctIndex,
  explanation,
  source: 'authored',
});

export const tf = (id: string, prompt: string, answer: boolean, explanation: string): QuizQuestion => ({
  id,
  type: 'true_false',
  prompt,
  options: ['True', 'False'],
  correctIndex: answer ? 0 : 1,
  explanation,
  source: 'authored',
});

export const codeOut = (id: string, prompt: string, language: string, code: string, options: string[], correctIndex: number, explanation: string): QuizQuestion => ({
  id,
  type: 'code_output',
  prompt,
  code: { language, code },
  options,
  correctIndex,
  explanation,
  source: 'authored',
});

export const ordering = (id: string, prompt: string, items: string[], explanation?: string): QuizQuestion => ({
  id,
  type: 'ordering',
  prompt,
  items,
  ...(explanation ? { explanation } : {}),
  source: 'authored',
});

export const matching = (id: string, prompt: string, pairs: [string, string][], explanation?: string): QuizQuestion => ({
  id,
  type: 'matching',
  prompt,
  pairs: pairs.map(([left, right]) => ({ left, right })),
  ...(explanation ? { explanation } : {}),
  source: 'authored',
});

export const selfCheck = (id: string, prompt: string, sampleAnswer?: string): QuizQuestion => ({
  id,
  type: 'self_check',
  prompt,
  ...(sampleAnswer ? { sampleAnswer } : {}),
  source: 'authored',
});

export const reflection = (id: string, prompt: string): QuizQuestion => ({ id, type: 'reflection', prompt, source: 'authored' });

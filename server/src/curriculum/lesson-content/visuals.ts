// FILE PATH: server/src/curriculum/lesson-content/visuals.ts
//
// Lesson visuals and interactive blocks.
//
// A visual is DATA stored on the lesson (`Lesson.visuals`): a renderer key
// (`type`), required accessibility text (`alt`, `caption`) and a structured
// `config`. The lesson's Markdown places it with a fenced block:
//
//     ```lumexa-visual
//     haar-features
//     ```
//
// The client has one renderer per `type` (client/components/lesson/visuals) and
// draws every diagram from the config — so diagrams are accurate by
// construction, versioned with the lesson, copied with it on import, and editable
// without anyone writing HTML or SVG. Nothing here can execute: configs are
// validated plain data, media addresses are restricted to https or this app's own
// /lesson-assets/, and the renderer never injects markup.

import { fenceMask, findHeadings, isBlank, sectionRange, toLines } from './markdown';
import { comparable, stripLeadingEmoji } from './text';
import type { LessonVisual } from './types';

export const VISUAL_BLOCK_LANG = 'lumexa-visual';
export const LESSON_ASSET_PREFIX = '/lesson-assets/';

export interface VisualTypeInfo {
  label: string;
  description: string;
  /** Top-level config keys that must be present. */
  requires: string[];
  /** Interactive blocks are used live; static ones are diagrams. */
  interactive: boolean;
}

export const VISUAL_TYPES: Record<string, VisualTypeInfo> = {
  flow: { label: 'Flow / pipeline / cycle', description: 'Boxes and arrows: a pipeline, a game loop, a workflow or a state machine.', requires: ['nodes'], interactive: false },
  sequence: { label: 'Sequence diagram', description: 'Who sends what to whom, in order (browser ↔ server, app ↔ API).', requires: ['actors', 'messages'], interactive: false },
  tree: { label: 'Tree', description: 'A hierarchy: HTML/DOM structure, a component tree or a decision tree.', requires: ['root'], interactive: false },
  table: { label: 'Data table', description: 'A small table, with optional highlighted cells.', requires: ['columns', 'rows'], interactive: false },
  'compare-tables': { label: 'Before / after tables', description: 'Two tables side by side, e.g. data before and after cleaning.', requires: ['before', 'after'], interactive: false },
  chart: { label: 'Chart', description: 'A bar, line, scatter or histogram drawn from the given numbers.', requires: ['kind', 'series'], interactive: false },
  'pixel-grid': { label: 'Pixel grid', description: 'An image as the array of numbers a computer sees.', requires: ['rows', 'cols', 'values'], interactive: true },
  'code-trace': { label: 'Step through code', description: 'Run a few lines one step at a time and watch the variables.', requires: ['lines', 'steps'], interactive: true },
  stage: { label: 'Sprite / grid stage', description: 'Sprites moving on a grid: movement, collisions, level layout.', requires: ['cols', 'rows', 'sprites'], interactive: true },
  blocks: { label: 'Scratch-style blocks', description: 'A script drawn as coloured blocks.', requires: ['scripts'], interactive: false },
  'box-model': { label: 'CSS box model', description: 'Margin, border, padding and content, with sliders.', requires: [], interactive: true },
  'css-layout': { label: 'Flexbox / Grid playground', description: 'Change layout properties and see the boxes move.', requires: ['mode'], interactive: true },
  viewport: { label: 'Responsive preview', description: 'Drag the screen width and watch a layout adapt.', requires: [], interactive: true },
  'neural-net': { label: 'Neural network', description: 'Layers of nodes and the connections between them.', requires: ['layers'], interactive: false },
  attention: { label: 'Attention map', description: 'Which words a transformer looks at when reading each word.', requires: ['tokens', 'weights'], interactive: true },
  haar: { label: 'Haar-like features', description: 'Haar-like features over an illustrated (synthetic) face.', requires: [], interactive: true },
  cascade: { label: 'Cascade of classifiers', description: 'How a cascade rejects most windows early.', requires: ['windows', 'stages'], interactive: true },
  bbox: { label: 'Bounding box', description: 'A labelled (x, y, width, height) box on an illustrated scene.', requires: ['imageWidth', 'imageHeight', 'box'], interactive: true },
  colorspace: { label: 'Colour vs grayscale', description: 'The same synthetic image in colour, as channels, and in grayscale.', requires: [], interactive: true },
  'detection-lab': { label: 'Detection parameters lab', description: 'scaleFactor and minNeighbors on prepared, synthetic detections.', requires: [], interactive: true },
  checklist: { label: 'Interactive checklist', description: 'Tick items off; remembered on this device.', requires: ['items'], interactive: true },
  cards: { label: 'Cards', description: 'Side-by-side cards: packages, examples, good vs weak.', requires: ['cards'], interactive: false },
  swatches: { label: 'Brand kit', description: 'Colours, fonts and a tagline.', requires: ['colors'], interactive: false },
  'ui-map': { label: 'Annotated interface', description: 'A labelled map of an app window and its panels.', requires: ['regions'], interactive: true },
  'train-test': { label: 'Train / test split', description: 'How data is divided into training and test sets.', requires: [], interactive: true },
  mockup: { label: 'Page / profile mock-up', description: 'A wireframe of a profile, portfolio or document with callouts.', requires: ['kind', 'sections'], interactive: false },
  image: { label: 'Image', description: 'A picture from this app\'s own assets or an https address.', requires: ['src'], interactive: false },
  video: { label: 'Short video', description: 'A short clip with controls and a transcript. Never autoplays.', requires: ['src', 'transcript'], interactive: false },
  walkthrough: { label: 'Step-by-step walkthrough', description: 'An illustrated stepper for a software workflow.', requires: ['steps'], interactive: true },
};

/** Media addresses a lesson may reference: https, or this app's own assets. */
export function isSafeMediaSrc(src: unknown): boolean {
  if (typeof src !== 'string' || src.length === 0 || src.length > 2000) return false;
  if (src.startsWith(LESSON_ASSET_PREFIX)) return !src.includes('..') && !/[\s"'<>\\]/.test(src);
  return /^https:\/\/[^\s"'<>\\]+$/i.test(src);
}

export interface VisualValidation {
  visuals: LessonVisual[];
  errors: string[];
  warnings: string[];
}

const MAX_CONFIG_BYTES = 40_000;

/** Coerces untrusted input into clean visuals and reports every problem. */
export function normalizeVisuals(raw: unknown): VisualValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const visuals: LessonVisual[] = [];
  if (raw === null || raw === undefined) return { visuals, errors, warnings };
  if (!Array.isArray(raw)) return { visuals, errors: ['Visuals must be a list.'], warnings };
  if (raw.length > 40) errors.push('A lesson can have at most 40 visuals.');

  const seen = new Set<string>();
  raw.slice(0, 40).forEach((item, idx) => {
    const label = `Visual ${idx + 1}`;
    if (!item || typeof item !== 'object') {
      errors.push(`${label}: is not a visual.`);
      return;
    }
    const r = item as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id.trim() : '';
    if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(id)) {
      errors.push(`${label}: the id must be lowercase letters, numbers and dashes (e.g. "haar-features").`);
      return;
    }
    if (seen.has(id)) {
      errors.push(`${label}: duplicate id "${id}".`);
      return;
    }
    seen.add(id);
    const type = typeof r.type === 'string' ? r.type : '';
    const info = VISUAL_TYPES[type];
    if (!info) {
      errors.push(`${label} ("${id}"): unknown visual type "${type}".`);
      return;
    }
    const alt = typeof r.alt === 'string' ? r.alt.trim() : '';
    const caption = typeof r.caption === 'string' ? r.caption.trim() : '';
    if (alt.length < 8) errors.push(`${label} ("${id}"): describe the visual in the alt text (at least 8 characters) — it is read aloud to learners who cannot see it.`);
    if (alt.length > 600) errors.push(`${label} ("${id}"): the alt text is too long (600 characters max).`);
    if (caption.length < 3) errors.push(`${label} ("${id}"): add a short caption.`);
    if (caption.length > 300) errors.push(`${label} ("${id}"): the caption is too long (300 characters max).`);

    const config = r.config && typeof r.config === 'object' && !Array.isArray(r.config) ? (r.config as Record<string, unknown>) : {};
    if (JSON.stringify(config).length > MAX_CONFIG_BYTES) errors.push(`${label} ("${id}"): the configuration is too large.`);
    for (const key of info.requires) {
      if (config[key] === undefined || config[key] === null || (Array.isArray(config[key]) && (config[key] as unknown[]).length === 0)) {
        errors.push(`${label} ("${id}"): ${info.label} needs "${key}".`);
      }
    }
    if (type === 'image' && config.src !== undefined && !isSafeMediaSrc(config.src)) {
      errors.push(`${label} ("${id}"): the image address must be https:// or start with ${LESSON_ASSET_PREFIX}.`);
    }
    if (type === 'video') {
      if (config.src !== undefined && !isSafeMediaSrc(config.src)) errors.push(`${label} ("${id}"): the video address must be https:// or start with ${LESSON_ASSET_PREFIX}.`);
      if (config.poster !== undefined && !isSafeMediaSrc(config.poster)) errors.push(`${label} ("${id}"): the poster image address must be https:// or start with ${LESSON_ASSET_PREFIX}.`);
      if (config.captionsSrc !== undefined && !isSafeMediaSrc(config.captionsSrc)) errors.push(`${label} ("${id}"): the captions file address must be https:// or start with ${LESSON_ASSET_PREFIX}.`);
      if (typeof config.transcript !== 'string' || config.transcript.trim().length < 10) errors.push(`${label} ("${id}"): a video needs a transcript (at least 10 characters).`);
    }
    const title = typeof r.title === 'string' && r.title.trim() ? r.title.trim().slice(0, 120) : undefined;
    visuals.push({ id, type, alt, caption, ...(title ? { title } : {}), config });
  });
  return { visuals, errors, warnings };
}

// ─── Placing visuals in Markdown ────────────────────────────────────────────

export function visualBlock(id: string): string[] {
  return ['```' + VISUAL_BLOCK_LANG, id, '```'];
}

/** Ids placed in the Markdown with ```lumexa-visual blocks. */
export function extractVisualIds(markdown: string | null | undefined): string[] {
  if (!markdown) return [];
  const lines = toLines(markdown);
  const ids: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp('^ {0,3}`{3,}\\s*' + VISUAL_BLOCK_LANG + '\\s*$').test(lines[i])) {
      const id = (lines[i + 1] ?? '').trim();
      if (id) ids.push(id);
    }
  }
  return ids;
}

export interface VisualPlacement {
  id: string;
  /** Heading text (or a regexp tested against it) the visual belongs under. */
  after: string | RegExp;
  /** Where in that section: just after its first paragraph, or at its end. */
  at?: 'start' | 'end';
}

function headingMatches(text: string, after: string | RegExp): boolean {
  const key = comparable(stripLeadingEmoji(text));
  return typeof after === 'string' ? key.includes(comparable(after)) : after.test(key);
}

/**
 * Inserts ```lumexa-visual blocks into `markdown`. A visual whose id is already
 * placed is skipped (idempotent). A placement whose heading cannot be found goes
 * into the lesson's main explanation section (reported in `moved`); only a lesson
 * with no sections at all leaves a visual in `unplaced`.
 */
export function placeVisuals(markdown: string, placements: VisualPlacement[]): { markdown: string; placed: string[]; unplaced: string[]; moved: string[] } {
  const already = new Set(extractVisualIds(markdown));
  let lines = toLines(markdown);
  const placed: string[] = [];
  const unplaced: string[] = [];
  /** Placed, but not under the heading they were written for. */
  const moved: string[] = [];

  for (const p of placements) {
    if (already.has(p.id)) continue;
    const mask = fenceMask(lines);
    const heads = findHeadings(lines, mask);
    let idx = heads.findIndex((h) => h.level >= 2 && headingMatches(h.text, p.after));
    if (idx === -1) {
      // The lesson's headings differ from the ones this visual was written against (an admin
      // reworded it, or an imported copy was redesigned). Put it in the lesson's main
      // explanation section — or the first section — rather than leaving it unplaced.
      idx = heads.findIndex((h) => h.level === 2 && /concept|explanation|big idea|simple version|what & why|think like|main idea/.test(comparable(stripLeadingEmoji(h.text))));
      if (idx === -1) idx = heads.findIndex((h) => h.level === 2);
      if (idx === -1) {
        unplaced.push(p.id);
        continue;
      }
      moved.push(p.id);
    }
    const range = sectionRange(lines, heads, idx);
    // The end of the section's own text, before its first sub-heading when at: 'start'.
    const nextHeadingAfter = heads.slice(idx + 1).find((h) => h.line < range.end)?.line ?? range.end;
    let insertAt: number;
    if ((p.at ?? 'start') === 'end') {
      insertAt = range.end;
    } else {
      // After the first paragraph under the heading.
      let i = heads[idx].line + 1;
      while (i < nextHeadingAfter && isBlank(lines[i])) i++;
      while (i < nextHeadingAfter && !isBlank(lines[i])) i++;
      insertAt = Math.min(i, nextHeadingAfter);
    }
    // Never land inside a code fence (the "first paragraph" can be a code block that has blank lines).
    while (insertAt > 0 && insertAt < lines.length && mask[insertAt - 1] && mask[insertAt]) insertAt++;
    const block = ['', ...visualBlock(p.id), ''];
    lines = [...lines.slice(0, insertAt), ...block, ...lines.slice(insertAt)];
    // Collapse a doubled blank line the insertion may have created.
    for (let k = Math.max(1, insertAt); k < Math.min(lines.length, insertAt + block.length + 2); k++) {
      if (isBlank(lines[k]) && isBlank(lines[k - 1])) {
        lines.splice(k, 1);
        k--;
      }
    }
    already.add(p.id);
    placed.push(p.id);
  }
  return { markdown: lines.join('\n'), placed, unplaced, moved };
}

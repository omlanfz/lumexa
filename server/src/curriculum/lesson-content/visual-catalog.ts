// FILE PATH: server/src/curriculum/lesson-content/visual-catalog.ts
//
// Which visuals and interactive blocks each curriculum lesson gets. Entries are
// keyed by LINEAGE KEY ("<module-slug>/<position>", see refs.ts) — the identity of
// a lesson's content, not of one database row — so the very same diagrams reach the
// pathway lesson, Odyssey's copy of it and any custom course that imported it.
//
// The data lives in per-pathway files; this module only merges and looks it up.

import type { LessonVisual } from './types';
import type { VisualPlacement } from './visuals';

export interface CatalogEntry {
  visual: LessonVisual;
  placement: Omit<VisualPlacement, 'id'>;
}

export type CatalogSource = Record<string, CatalogEntry[]>;

const SOURCES: CatalogSource[] = [];

/** Registers a pathway's entries (called by each catalog file on import). */
export function registerVisualCatalog(source: CatalogSource): void {
  SOURCES.push(source);
}

/** Visuals for a lesson identified by lineage key. */
export function catalogFor(lineage: string | null): CatalogEntry[] {
  if (!lineage) return [];
  return SOURCES.flatMap((s) => s[lineage] ?? []);
}

/** Visuals for a lesson identified by title — only for custom curricula that have no lineage. */
const BY_TITLE: Record<string, CatalogEntry[]> = {};
export function registerTitleCatalog(source: Record<string, CatalogEntry[]>): void {
  for (const [k, v] of Object.entries(source)) BY_TITLE[k.trim().toLowerCase()] = v;
}
export function catalogForTitle(title: string): CatalogEntry[] {
  return BY_TITLE[title.trim().toLowerCase()] ?? [];
}

/** Every lesson title that has title-specific visuals (redesigned custom lessons). */
export function catalogTitles(): string[] {
  return Object.keys(BY_TITLE);
}

/** Every lineage key that has visuals (for coverage reporting). */
export function catalogKeys(): string[] {
  return [...new Set(SOURCES.flatMap((s) => Object.keys(s)))];
}

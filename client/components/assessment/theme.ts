// FILE PATH: client/components/assessment/theme.ts
//
// The test screens render in two places that use different design tokens:
// inside the live classroom (--cr-*) and on the standalone student pages
// (--s-*). Every assessment component reads only the neutral --ar-* variables;
// the root element maps them onto whichever token set it is hosted in.

import type { CSSProperties } from 'react';

export type Variant = 'classroom' | 'page' | 'teacher';

const MAPS: Record<Variant, Record<string, string>> = {
  classroom: {
    '--ar-bg': 'var(--cr-surface)',
    '--ar-surface': 'var(--cr-surface-2)',
    '--ar-surface-2': 'var(--cr-surface-3)',
    '--ar-border': 'var(--cr-border)',
    '--ar-border-strong': 'var(--cr-border-strong)',
    '--ar-text': 'var(--cr-text)',
    '--ar-muted': 'var(--cr-text-muted)',
    '--ar-faint': 'var(--cr-text-faint)',
    '--ar-accent': 'var(--cr-accent)',
    '--ar-accent-soft': 'color-mix(in srgb, var(--cr-accent) 14%, transparent)',
    '--ar-danger': 'var(--cr-danger)',
    '--ar-warning': 'var(--cr-warning)',
    '--ar-success': '#16a34a',
  },
  page: {
    '--ar-bg': 'var(--s-surface)',
    '--ar-surface': 'var(--s-surface-2)',
    '--ar-surface-2': 'var(--s-surface-3)',
    '--ar-border': 'var(--s-border)',
    '--ar-border-strong': 'var(--s-border-strong)',
    '--ar-text': 'var(--s-text)',
    '--ar-muted': 'var(--s-text-muted)',
    '--ar-faint': 'var(--s-text-faint)',
    '--ar-accent': 'var(--s-accent)',
    '--ar-accent-soft': 'var(--s-accent-light)',
    '--ar-danger': 'var(--s-danger)',
    '--ar-warning': '#d97706',
    '--ar-success': '#16a34a',
  },
  teacher: {
    '--ar-bg': 'var(--t-surface)',
    '--ar-surface': 'var(--t-surface-2)',
    '--ar-surface-2': 'var(--t-surface-3)',
    '--ar-border': 'var(--t-border)',
    '--ar-border-strong': 'var(--t-border-strong)',
    '--ar-text': 'var(--t-text)',
    '--ar-muted': 'var(--t-text-muted)',
    '--ar-faint': 'var(--t-text-faint)',
    '--ar-accent': 'var(--t-accent)',
    '--ar-accent-soft': 'var(--t-accent-light)',
    '--ar-danger': 'var(--t-danger)',
    '--ar-warning': 'var(--t-warning)',
    '--ar-success': 'var(--t-success)',
  },
};

export function themeVars(variant: Variant): CSSProperties {
  return MAPS[variant] as CSSProperties;
}

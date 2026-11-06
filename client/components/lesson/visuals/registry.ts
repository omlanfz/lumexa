// FILE PATH: client/components/lesson/visuals/registry.ts
//
// Visual type → renderer. Every type the server accepts (see VISUAL_TYPES in
// server/src/curriculum/lesson-content/visuals.ts) has a renderer here; a test
// keeps the two lists in step.

import type { ComponentType } from 'react';

export interface VisualProps {
  /** The visual's structured configuration (validated server-side). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
  /** Descriptive text (also the accessible name of the frame). */
  alt: string;
  id: string;
  /** Called when the learner actually uses an interactive block. */
  onUse?: () => void;
}

export interface VisualEntry {
  Component: ComponentType<VisualProps>;
  /** The learner is expected to USE it (counts as an activity in their progress). */
  interactive: boolean;
  /**
   * How a screen reader meets it. 'img' (default for static diagrams): one picture,
   * described by the alt text. 'group': it contains readable text or controls of its own.
   */
  role?: 'img' | 'group';
}

export const VISUAL_RENDERERS: Record<string, VisualEntry> = {};

/** Types whose content comes over the network: loaded only when near the screen. */
export const LAZY_TYPES = new Set(['image', 'video']);

export function registerVisuals(entries: Record<string, VisualEntry>) {
  Object.assign(VISUAL_RENDERERS, entries);
}

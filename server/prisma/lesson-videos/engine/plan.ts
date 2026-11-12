// What the renderer needs to draw one lesson's video. Built by the orchestrator (build.ts) from the
// lesson spec and the measured narration, then handed to the browser page as JSON.

import type { LcDemo } from '../../../src/little-coders/lc.types';

export type Track = 'scratch' | 'python' | 'ai';

export interface PlanScene {
  index: number;
  start: number;
  end: number;
  beat: string;
  onScreen: string;
}

export interface PlanCue {
  id: string;
  scene: number;
  index: number;
  start: number;
  end: number;
  text: string;
}

export interface VideoPlan {
  fps: number;
  width: number;
  height: number;
  duration: number;
  seed: number;
  /** Two colours of the course (header pill, accents). */
  accent: [string, string];
  course: { number: number; title: string; lessons: number };
  lesson: {
    number: number;
    title: string;
    emoji: string;
    platformName: string;
    language: 'scratch' | 'edublocks';
    track: Track;
  };
  hook: string;
  scenes: PlanScene[];
  cues: PlanCue[];
  concepts: { emoji: string; title: string; text: string }[];
  example: { title: string; lines: string[]; language: 'scratch' | 'edublocks' };
  demo: LcDemo;
  tip: { kind: 'tip' | 'mistake'; title: string; text: string; fix?: string };
  challenge: {
    kind: 'choose' | 'order';
    prompt: string;
    options: string[];
    lines: string[];
    language: 'scratch' | 'edublocks';
  };
  project: { name: string };
  /** Words and phrases highlighted in the subtitles. */
  highlights: string[];
  /** data: URI of the Lumexa logo mark. */
  logo: string;
}

export type SfxKind = 'whoosh' | 'pop' | 'chime' | 'success' | 'click' | 'sparkle';
export interface SfxEvent {
  t: number;
  kind: SfxKind;
}

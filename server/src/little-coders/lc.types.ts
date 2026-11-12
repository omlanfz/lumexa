// FILE PATH: server/src/little-coders/lc.types.ts
//
// The shapes of the Little Coders lesson experience, as authored (LcLessonSpec) and as
// stored on the Lesson row (LcExperience, LcPreviewVideo, LcProjectCard, LcHomeworkCard),
// and of the practical project of an assessment (LcPracticalSpec).
//
// Everything is plain validated data. Nothing here is markup: the client draws it with its
// own components, so a stored value can never inject HTML or script.
//
// Block scripts are written in a small line format, one block per line:
//
//     events| when green flag clicked
//     control| repeat (10)
//       motion| change y by (20)          ← two spaces of indent = inside the block above
//
// `category|` is one of SCRATCH_CATEGORIES / EDUBLOCKS_CATEGORIES (below). In the text,
// (…) is a round slot, […] a dropdown or text slot and <…> a true/false slot. The
// language is stored beside the lines: 'scratch' (MIT Scratch / Stretch3, including the
// TM2Scratch extension) or 'edublocks' (the blocks show real Python text).

import type { LcPlatformKey, LcTrack, LcVariant } from './lc.constants';

export type LcBlockLanguage = 'scratch' | 'edublocks';

/** Palette categories of MIT Scratch 3 plus the TM2Scratch extension of Stretch3. */
export const SCRATCH_CATEGORIES = [
  'motion',
  'looks',
  'sound',
  'events',
  'control',
  'sensing',
  'operators',
  'variables',
  'myblocks',
  'tm2scratch',
] as const;

/** Palette groups of the EduBlocks Python editor (read from its own toolbox). */
export const EDUBLOCKS_CATEGORIES = [
  'imports',
  'statements',
  'text',
  'math',
  'logic',
  'lists',
  'loops',
  'functions',
  'random',
  'variables',
  'turtle',
] as const;

export type ScratchCategory = (typeof SCRATCH_CATEGORIES)[number];
export type EduBlocksCategory = (typeof EDUBLOCKS_CATEGORIES)[number];

/** A block script with a title, optionally annotated: notes[“3”] explains line 3. */
export interface LcStack {
  id: string;
  title: string;
  /** One short sentence above the blocks. */
  intro?: string;
  language: LcBlockLanguage;
  lines: string[];
  /** The sprite (or "Stage") the script belongs to — Scratch only. */
  sprite?: string;
  /** 1-based line number (as a string) → a one-sentence explanation shown on click. */
  notes?: Record<string, string>;
}

export interface LcConcept {
  emoji: string;
  title: string;
  /** One or two short sentences. */
  text: string;
  /** The "click to reveal" detail. */
  reveal: string;
}

export interface LcTip {
  kind: 'tip' | 'mistake';
  title: string;
  text: string;
  /** For a mistake: how to fix it. */
  fix?: string;
}

// ─── Interactive demonstrations ─────────────────────────────────────────────

export type StageBackdrop = 'space' | 'sky' | 'grass' | 'night' | 'plain';

export interface LcStageSprite {
  id: string;
  /** The sprite drawn on the demo stage (a stand-in for the library sprite). */
  emoji: string;
  label: string;
  x?: number;
  y?: number;
  /** Costume faces, for "switch costume" / "next costume". */
  costumes?: string[];
}

export interface LcStageScript {
  sprite: string;
  lines: string[];
}

export type LcDemo =
  | {
      kind: 'scratch-stage';
      title: string;
      intro: string;
      backdrop?: StageBackdrop;
      sprites: LcStageSprite[];
      scripts: LcStageScript[];
      /** Keys that get an on-screen button ("when [space] key pressed"). */
      keys?: string[];
      hint?: string;
    }
  | {
      kind: 'python-run';
      title: string;
      intro: string;
      lines: string[];
      /** Answers offered to input() calls, in order. */
      inputs?: string[];
      /** The program is meant to stop with a Python error (a debugging lesson). */
      expectError?: boolean;
      hint?: string;
    }
  | {
      kind: 'ai-image';
      title: string;
      intro: string;
      /** Three or more classes — each with what you would show the webcam. */
      classes: { name: string; emoji: string }[];
      /** 'basic' shows training then predicting; 'improve' lets learners add varied examples. */
      mode: 'basic' | 'improve' | 'events';
      hint?: string;
    }
  | {
      kind: 'ai-voice';
      title: string;
      intro: string;
      words: { word: string; emoji: string }[];
      mode: 'basic' | 'events' | 'quiz';
      hint?: string;
    };

export type LcChallenge =
  | {
      kind: 'choose';
      prompt: string;
      code?: { language: LcBlockLanguage; lines: string[] };
      options: string[];
      /** Index of the right option. Practice only — assessments keep their keys on the server. */
      answer: number;
      hint: string;
      explain: string;
    }
  | {
      kind: 'order';
      prompt: string;
      language: LcBlockLanguage;
      /** The blocks in the CORRECT order (the page shuffles them). Top-level lines only. */
      lines: string[];
      hint: string;
      explain: string;
    };

// ─── Project, homework, AI plan ─────────────────────────────────────────────

export interface LcAsset {
  /** The exact name in the built-in Scratch sprite library. */
  name: string;
  /** The costumes the project uses, exactly as listed in the library. */
  costumes?: string[];
  note?: string;
}

export interface LcProjectStep {
  text: string;
  /** Id of a stack in `project.stacks` shown with this step. */
  stack?: string;
}

export interface LcProject {
  name: string;
  /** What the finished project does — one sentence. */
  goal: string;
  assets?: LcAsset[];
  steps: LcProjectStep[];
  stacks: LcStack[];
  /** "My project can …" self-check. */
  checklist: string[];
  stretch?: string;
}

export interface LcHomework {
  name: string;
  instructions: string;
  /** What to hand in. */
  deliverable: string;
  hint?: string;
  stack?: LcStack;
}

export interface LcAiClass {
  name: string;
  emoji: string;
  /** What to hold up to the webcam / say into the microphone. */
  collect: string;
  minExamples: number;
}

export interface LcAiPlan {
  kind: 'image' | 'sound';
  /** Exactly three main classes (+ Background Noise, for sound, shown separately). */
  classes: LcAiClass[];
  background: boolean;
  collectTips: string[];
  testSteps: string[];
  exportSteps: string[];
  connectSteps: string[];
}

export interface LcExperience {
  version: 1;
  track: LcTrack;
  platform: LcPlatformKey;
  courseNumber: number;
  lessonNumber: number;
  emoji: string;
  mission: { hook: string; objective: string; badge: string };
  concepts: LcConcept[];
  demo: LcDemo;
  /** "How the blocks look" — one or two annotated scripts. */
  examples: LcStack[];
  /** "Blocks you'll use", derived from the scripts: category → block names. */
  toolbox: { category: string; blocks: string[] }[];
  tips: LcTip[];
  challenge: LcChallenge;
  ai?: LcAiPlan;
  project: LcProject;
  homework: LcHomework;
}

// ─── Learning Preview video ─────────────────────────────────────────────────

export interface LcVideoScene {
  /** "0:00–0:08" */
  time: string;
  beat: string;
  visual: string;
  narration: string;
  onScreen: string;
}

/** The production brief. Staff only — students never receive it. */
export interface LcVideoBrief {
  title: string;
  /** What the video must make the student curious about. */
  hook: string;
  targetSeconds: number;
  scenes: LcVideoScene[];
  tip: string;
  challenge: string;
  /** The practical project it leads into (never revealed in full). */
  leadsInto: string;
}

export interface LcPreviewVideo {
  title: string;
  summary: string;
  /** MP4 address — empty until an admin adds the real video. */
  videoUrl: string;
  posterUrl: string;
  /** WebVTT subtitles address. */
  captionsUrl: string;
  durationSeconds: number | null;
  brief: LcVideoBrief;
}

/** What a student / shared screen receives: no production brief. */
export interface LcPreviewVideoPublic {
  title: string;
  summary: string;
  videoUrl: string;
  posterUrl: string;
  captionsUrl: string;
  durationSeconds: number | null;
}

// ─── Project and homework cards ─────────────────────────────────────────────

export interface LcPlatformButton {
  platform: LcPlatformKey;
  label: string;
}

export interface LcProjectCard {
  title: string;
  /** Opened by "Open Project" — empty until an admin adds it. */
  projectUrl: string;
  /** Copied by "Copy Link" — empty means the project address. */
  copyUrl: string;
  openLabel: string;
  copyLabel: string;
  /** Buttons that open a NEW project, in the order they are used. */
  platforms: LcPlatformButton[];
  /** A sentence under the buttons, e.g. "Train the model first, then open Stretch3." */
  helper: string;
  /** Staff only. */
  teacherInstructions: string;
}

export interface LcHomeworkCard {
  title: string;
  instructions: string;
  deliverable: string;
  platforms: LcPlatformButton[];
  helper: string;
}

/** A project card as students see it (no teacher instructions). */
export type LcProjectCardPublic = Omit<LcProjectCard, 'teacherInstructions'>;

// ─── Authoring spec of one lesson ───────────────────────────────────────────

export interface LcLessonSpec {
  course: number;
  lesson: number;
  title: string;
  emoji: string;
  platform: LcPlatformKey;
  mission: { hook: string; objective: string; badge: string };
  concepts: LcConcept[];
  demo: LcDemo;
  examples: LcStack[];
  tips: LcTip[];
  challenge: LcChallenge;
  ai?: LcAiPlan;
  project: LcProject;
  homework: LcHomework;
  /** Buttons on the homework card; defaults to the lesson's platforms. */
  homeworkPlatforms?: LcPlatformKey[];
  /** Student-facing line under the project buttons. */
  projectHelper?: string;
  /** Teacher-only Markdown: timing, discussion prompts, hints. */
  teacherNotes: string;
  video: LcVideoBrief;
}

// ─── Assessment practical ───────────────────────────────────────────────────

export interface LcPracticalSpec {
  version: 1;
  platform: LcPlatformKey;
  variant: LcVariant | null;
  minutes: number;
  /** 1. Project brief — short, clear, age-appropriate. */
  brief: string[];
  /** 2. Blocks you need to find — exact names under their palette category. */
  blocks: { category: string; blocks: string[] }[];
  /** 3. Build requirements — objective, testable points. */
  requirements: string[];
  /** The prepared model / starter project (admin-managed). */
  starter: {
    required: boolean;
    kind: 'NONE' | 'MODEL_URL' | 'PROJECT_URL';
    label: string;
    /** Empty until an admin adds it. Never invented. */
    url: string;
    note: string;
    /** For a prepared model: the exact labels it must have. */
    modelLabels: string[];
  };
  /** Optional — never part of the 40 marks. */
  bonus: string[];
  /** What to hand in. */
  handIn: string;
  /** Set when an admin edited the project: a later bank release leaves it exactly as written. */
  adminEdited?: boolean;
}

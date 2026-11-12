// FILE PATH: client/lib/littleCoders/types.ts
//
// The Little Coders lesson as the API serves it (mirrors server/src/little-coders/lc.types.ts and
// lc.public.ts). Everything here is plain validated data — the client draws it with its own
// components, nothing in it is markup or script. Staff-only material (the video production brief,
// the project card's teacher instructions) is a separate type that only teachers and admins receive.

export type LcPlatformKey = 'SCRATCH' | 'STRETCH3' | 'TEACHABLE_MACHINE' | 'EDUBLOCKS';
export type LcTrack = 'scratch' | 'ai' | 'python';
export type LcBlockLanguage = 'scratch' | 'edublocks';

export interface LcStack {
  id: string;
  title: string;
  intro?: string;
  language: LcBlockLanguage;
  lines: string[];
  sprite?: string;
  /** 1-based line number (as text) → a one-sentence explanation. */
  notes?: Record<string, string>;
}

export interface LcConcept {
  emoji: string;
  title: string;
  text: string;
  reveal: string;
}

export interface LcTip {
  kind: 'tip' | 'mistake';
  title: string;
  text: string;
  fix?: string;
}

export type StageBackdrop = 'space' | 'sky' | 'grass' | 'night' | 'plain';

export interface LcStageSprite {
  id: string;
  emoji: string;
  label: string;
  x?: number;
  y?: number;
  costumes?: string[];
}

export interface LcStageScript {
  sprite: string;
  lines: string[];
}

export type LcDemo =
  | { kind: 'scratch-stage'; title: string; intro: string; backdrop?: StageBackdrop; sprites: LcStageSprite[]; scripts: LcStageScript[]; keys?: string[]; hint?: string }
  | { kind: 'python-run'; title: string; intro: string; lines: string[]; inputs?: string[]; expectError?: boolean; hint?: string }
  | { kind: 'ai-image'; title: string; intro: string; classes: { name: string; emoji: string }[]; mode: 'basic' | 'improve' | 'events'; hint?: string }
  | { kind: 'ai-voice'; title: string; intro: string; words: { word: string; emoji: string }[]; mode: 'basic' | 'events' | 'quiz'; hint?: string };

export type LcChallenge =
  | { kind: 'choose'; prompt: string; code?: { language: LcBlockLanguage; lines: string[] }; options: string[]; answer: number; hint: string; explain: string }
  | { kind: 'order'; prompt: string; language: LcBlockLanguage; lines: string[]; hint: string; explain: string };

export interface LcAsset {
  name: string;
  costumes?: string[];
  note?: string;
}

export interface LcProjectStep {
  text: string;
  stack?: string;
}

export interface LcProject {
  name: string;
  goal: string;
  assets?: LcAsset[];
  steps: LcProjectStep[];
  stacks: LcStack[];
  checklist: string[];
  stretch?: string;
}

export interface LcHomework {
  name: string;
  instructions: string;
  deliverable: string;
  hint?: string;
  stack?: LcStack;
}

export interface LcAiClass {
  name: string;
  emoji: string;
  collect: string;
  minExamples: number;
}

export interface LcAiPlan {
  kind: 'image' | 'sound';
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
  examples: LcStack[];
  toolbox: { category: string; blocks: string[] }[];
  tips: LcTip[];
  challenge: LcChallenge;
  ai?: LcAiPlan;
  project: LcProject;
  homework: LcHomework;
}

// ─── Video, cards ───────────────────────────────────────────────────────────

/** A chapter marker on the player's seek bar (one per scene of the video). */
export interface LcVideoChapter {
  label: string;
  /** Seconds from the start. */
  start: number;
}

/** What a student receives: no production script. */
export interface LcPreviewVideoPublic {
  title: string;
  summary: string;
  /** MP4 address — empty until a video is uploaded (or an admin adds an address). */
  videoUrl: string;
  posterUrl: string;
  captionsUrl: string;
  durationSeconds: number | null;
  chapters: LcVideoChapter[];
}

/** A preview video kept in the lesson-video bucket (set by an upload; the addresses are made when the lesson is served). */
export interface LcStoredVideo {
  videoKey: string;
  posterKey: string | null;
  captionsKey: string | null;
  bytes: number;
  sha256: string;
  width: number;
  height: number;
  chapters: LcVideoChapter[];
  uploadedAt: string;
}

/** What /curriculum/lesson-videos/status says (admin). */
export interface LcVideoStorageStatus {
  configured: boolean;
  problem: string | null;
  storage: { bucket: string; delivery: 'signed' | 'public' } | null;
  lessons: number;
  withVideo: number;
  /** Lessons the bucket holds a video description for. */
  published: number;
}

/** What /curriculum/lesson-videos/attach says (admin). */
export interface LcVideoAttachReport {
  attached: string[];
  alreadyHave: string[];
  notInStorage: string[];
  noLesson: string[];
  storageProblem: string | null;
}

export interface LcVideoScene {
  time: string;
  beat: string;
  visual: string;
  narration: string;
  onScreen: string;
}

export interface LcVideoBrief {
  title: string;
  hook: string;
  targetSeconds: number;
  scenes: LcVideoScene[];
  tip: string;
  challenge: string;
  leadsInto: string;
}

export interface LcPreviewVideo extends Omit<LcPreviewVideoPublic, 'chapters'> {
  brief: LcVideoBrief;
  /** The video kept in the lesson-video bucket, if one was uploaded. */
  stored?: LcStoredVideo | null;
}

/** A platform button with its start address already resolved by the server (null = switched off). */
export interface LcResolvedButton {
  platform: LcPlatformKey;
  label: string;
  name: string;
  url: string | null;
}

export interface LcPlatformButton {
  platform: LcPlatformKey;
  label: string;
}

export interface LcProjectCardShared {
  title: string;
  projectUrl: string;
  copyUrl: string;
  openLabel: string;
  copyLabel: string;
  platforms: LcResolvedButton[];
  helper: string;
}

export interface LcProjectCard {
  title: string;
  projectUrl: string;
  copyUrl: string;
  openLabel: string;
  copyLabel: string;
  platforms: LcPlatformButton[];
  helper: string;
  teacherInstructions: string;
}

export interface LcHomeworkCardShared {
  title: string;
  instructions: string;
  deliverable: string;
  platforms: LcResolvedButton[];
  helper: string;
}

export interface LcHomeworkCard {
  title: string;
  instructions: string;
  deliverable: string;
  platforms: LcPlatformButton[];
  helper: string;
}

/** The `littleCoders` block of a lesson payload. */
export interface LcSharedLesson {
  experience: LcExperience;
  previewVideo: LcPreviewVideoPublic | null;
  projectCard: LcProjectCardShared | null;
  homeworkCard: LcHomeworkCardShared | null;
}

/** The `littleCoders` block of the teacher-prep payload (assigned teacher / admin only). */
export interface LcTeacherPrep {
  videoBrief: LcVideoBrief | null;
  videoReady: boolean;
  teacherInstructions: string;
}

export interface LcPlatform {
  key: LcPlatformKey;
  name: string;
  startUrl: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** The lesson editor's view of a Little Coders lesson (admin). */
export interface LcEditorData {
  experience: LcExperience | null;
  previewVideo: LcPreviewVideo | null;
  projectCard: LcProjectCard | null;
  homeworkCard: LcHomeworkCard | null;
  edited: string[];
  platforms: LcPlatform[];
}

// ─── Assessment practical ───────────────────────────────────────────────────

export interface LcPracticalSpec {
  version: 1;
  platform: LcPlatformKey;
  variant: 'SCRATCH_AI' | 'PYTHON' | null;
  minutes: number;
  brief: string[];
  blocks: { category: string; blocks: string[] }[];
  requirements: string[];
  starter: {
    required: boolean;
    kind: 'NONE' | 'MODEL_URL' | 'PROJECT_URL';
    label: string;
    url: string;
    note: string;
    modelLabels: string[];
  };
  bonus: string[];
  handIn: string;
  adminEdited?: boolean;
}

export type LcFileKind = 'SOURCE' | 'NOTEBOOK' | 'PDF' | 'IMAGE' | 'DOWNLOAD';

export interface LcAssessmentFile {
  id: string;
  name: string;
  size: number;
  kind: LcFileKind;
  status?: 'UPLOADED' | 'ATTACHED' | 'DELETE_PENDING' | 'DELETED';
  removed: boolean;
}

export interface LcAssessmentMeta {
  brand: string;
  title: string;
  minutes: number;
  marks: number;
  negativeMarking: boolean;
  sections: { key: string; label: string; detail: string; marks: number | null; minutes: number }[];
}

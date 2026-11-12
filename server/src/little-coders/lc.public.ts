// FILE PATH: server/src/little-coders/lc.public.ts
//
// What a Little Coders lesson looks like when it leaves the server.
//
// A lesson row stores four validated JSON documents (experience, previewVideo, projectCard,
// homeworkCard). Reading them back goes through the SAME validators that guard every write, so a
// value that is somehow malformed is never sent to a browser: the page then falls back to the
// lesson's plain Markdown text instead of breaking.
//
// Two audiences:
//   * Shared (student, shared classroom screen, teacher's presentation) — the experience, the
//     public video record (address / poster / captions, never the production script) and the cards
//     with each platform button already resolved to its start address.
//   * Staff (assigned teacher, admin) — the video production brief and the teacher instructions of
//     the project card. These are never part of the shared payload.
//
// Platform start addresses are NOT stored on the lesson: a button names a platform
// ("STRETCH3") and the server resolves it from the CodingPlatform table, so an admin can change
// where "Start Coding" opens — or switch a platform off — without touching 40 lessons.

import type { LcPlatformKey } from './lc.constants';
import type {
  LcExperience,
  LcHomeworkCard,
  LcPlatformButton,
  LcPreviewVideo,
  LcPreviewVideoPublic,
  LcProjectCard,
  LcVideoBrief,
} from './lc.types';
import {
  publicVideo,
  validateExperience,
  validateHomeworkCard,
  validatePreviewVideo,
  validateProjectCard,
} from './lc.validate';

/** The stored fields of a lesson row this module reads. */
export interface LcRow {
  experience?: unknown;
  previewVideo?: unknown;
  projectCard?: unknown;
  homeworkCard?: unknown;
}

export interface PlatformDirectoryEntry {
  name: string;
  startUrl: string;
  isActive: boolean;
}

export type PlatformDirectory = Partial<
  Record<LcPlatformKey, PlatformDirectoryEntry>
>;

/** A platform button as the browser receives it: where it opens, or null when it is switched off. */
export interface LcResolvedButton {
  platform: LcPlatformKey;
  label: string;
  /** The platform's name, for a tooltip / the "unavailable" message. */
  name: string;
  /** null = the platform is switched off (the button is shown disabled). */
  url: string | null;
}

export type LcProjectCardShared = Omit<
  LcProjectCard,
  'teacherInstructions' | 'platforms'
> & {
  platforms: LcResolvedButton[];
};

export type LcHomeworkCardShared = Omit<LcHomeworkCard, 'platforms'> & {
  platforms: LcResolvedButton[];
};

export interface LcSharedLesson {
  experience: LcExperience;
  previewVideo: LcPreviewVideoPublic | null;
  projectCard: LcProjectCardShared | null;
  homeworkCard: LcHomeworkCardShared | null;
}

export interface LcTeacherPrep {
  /** The video production brief: script, storyboard and on-screen text. */
  videoBrief: LcVideoBrief | null;
  videoReady: boolean;
  teacherInstructions: string;
}

export function resolveButtons(
  buttons: LcPlatformButton[],
  directory: PlatformDirectory,
): LcResolvedButton[] {
  return buttons.map((b) => {
    const entry = directory[b.platform];
    return {
      platform: b.platform,
      label: b.label,
      name: entry?.name ?? b.platform,
      url: entry && entry.isActive && entry.startUrl ? entry.startUrl : null,
    };
  });
}

function readExperience(raw: unknown): LcExperience | null {
  if (raw === null || raw === undefined) return null;
  return validateExperience(raw).value;
}

function readVideo(raw: unknown): LcPreviewVideo | null {
  if (raw === null || raw === undefined) return null;
  return validatePreviewVideo(raw).value;
}

function readProjectCard(raw: unknown): LcProjectCard | null {
  if (raw === null || raw === undefined) return null;
  return validateProjectCard(raw).value;
}

function readHomeworkCard(raw: unknown): LcHomeworkCard | null {
  if (raw === null || raw === undefined) return null;
  return validateHomeworkCard(raw).value;
}

/** True when the row is a redesigned Little Coders lesson (has a stored experience). */
export function isLcLessonRow(row: LcRow): boolean {
  return row.experience !== null && row.experience !== undefined;
}

/** The shared payload of a Little Coders lesson, or null for every other lesson. */
export function readLcShared(
  row: LcRow,
  directory: PlatformDirectory,
): LcSharedLesson | null {
  if (!isLcLessonRow(row)) return null;
  const experience = readExperience(row.experience);
  if (!experience) return null; // broken data: the page falls back to the Markdown text
  const video = readVideo(row.previewVideo);
  const card = readProjectCard(row.projectCard);
  const homework = readHomeworkCard(row.homeworkCard);
  return {
    experience,
    previewVideo: video ? publicVideo(video) : null,
    projectCard: card
      ? (() => {
          const { teacherInstructions: _staffOnly, platforms, ...rest } = card;
          void _staffOnly;
          return { ...rest, platforms: resolveButtons(platforms, directory) };
        })()
      : null,
    homeworkCard: homework
      ? {
          ...homework,
          platforms: resolveButtons(homework.platforms, directory),
        }
      : null,
  };
}

/** Staff-only material of a Little Coders lesson, or null for every other lesson. */
export function readLcTeacherPrep(row: LcRow): LcTeacherPrep | null {
  if (!isLcLessonRow(row)) return null;
  const video = readVideo(row.previewVideo);
  const card = readProjectCard(row.projectCard);
  return {
    videoBrief: video?.brief ?? null,
    videoReady: !!video?.videoUrl,
    teacherInstructions: card?.teacherInstructions ?? '',
  };
}

/** Builds the directory the resolver needs from CodingPlatform rows. */
export function directoryOf(
  rows: { key: string; name: string; startUrl: string; isActive: boolean }[],
): PlatformDirectory {
  const out: PlatformDirectory = {};
  for (const r of rows) {
    out[r.key as LcPlatformKey] = {
      name: r.name,
      startUrl: r.startUrl,
      isActive: r.isActive,
    };
  }
  return out;
}

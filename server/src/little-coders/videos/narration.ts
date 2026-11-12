// The narration of a lesson preview video: the six scene scripts of the lesson's video brief,
// split into sentences (each is spoken on its own, so the video knows exactly when every
// sentence starts and ends — that is what keeps voice, subtitles and animation in step).

import type { LcLessonSpec } from '../lc.types';

export interface NarrationSentence {
  /** "c1l1-s0-0": lesson, scene index, sentence index. */
  id: string;
  scene: number;
  index: number;
  /** As shown in the subtitles. */
  text: string;
}

export const lessonKey = (spec: Pick<LcLessonSpec, 'course' | 'lesson'>): string =>
  `c${spec.course}l${spec.lesson}`;

/** "Look! It works. Ready?" -> three sentences. Keeps quotes and brackets with their sentence. */
export function splitSentences(text: string): string[] {
  const parts = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+(?=[“"'(\[]?[A-Z0-9])/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function narrationFor(spec: LcLessonSpec): NarrationSentence[] {
  const key = lessonKey(spec);
  const out: NarrationSentence[] = [];
  spec.video.scenes.forEach((scene, sceneIndex) => {
    splitSentences(scene.narration).forEach((text, index) => {
      out.push({ id: `${key}-s${sceneIndex}-${index}`, scene: sceneIndex, index, text });
    });
  });
  return out;
}

export function narrationWordCount(spec: LcLessonSpec): number {
  return spec.video.scenes
    .map((s) => s.narration)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

'use client';

// FILE PATH: client/components/lesson/LessonContext.tsx
//
// What blocks embedded in the lesson text (visuals, the quiz, lesson links) need to
// know about the lesson they sit in — passed through context so the Markdown
// renderer stays a plain component.

import { createContext, useContext, type ReactNode } from 'react';
import type { LessonLink, LessonMode, LessonVisualData, Viewer } from '@/lib/lesson/types';

export interface LessonRender {
  /** The lesson being shown (scopes anything remembered on this device, like checklist ticks). */
  lessonId?: string;
  mode: LessonMode;
  /** Teacher's shared-screen presentation: larger, nothing private. */
  presentation: boolean;
  viewer: Viewer;
  /** Resolved "Lesson N" links, by lineage key. */
  refs: Record<string, LessonLink | null>;
  visuals: Record<string, LessonVisualData>;
  /** Renders the Mini Quiz where a ```lumexa-quiz block sits. */
  renderQuiz: (() => ReactNode) | null;
  /** An interactive visual was used. */
  onActivityDone?: (visualId: string) => void;
}

const DEFAULT: LessonRender = {
  mode: 'page',
  presentation: false,
  viewer: 'student',
  refs: {},
  visuals: {},
  renderQuiz: null,
};

export const LessonRenderContext = createContext<LessonRender>(DEFAULT);
export const useLessonRender = () => useContext(LessonRenderContext);

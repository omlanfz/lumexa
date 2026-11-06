// FILE PATH: server/src/curriculum/lesson-content/quiz-catalog.ts
//
// Authored Mini Quiz questions (four-option multiple choice, like every quiz question) for the lessons whose source material has no quiz of
// its own (keyed by LINEAGE KEY, like the visual catalog, so copies of a lesson
// carry the same questions). A lesson that already has a quiz — extracted from its
// text or written by an admin — is never given one from here.

import type { McqQuestion } from './types';

type QuizSource = Record<string, McqQuestion[]>;
const SOURCES: QuizSource[] = [];

export function registerQuizCatalog(source: QuizSource): void {
  SOURCES.push(source);
}

export function quizCatalogFor(lineage: string | null): McqQuestion[] | null {
  if (!lineage) return null;
  for (const s of SOURCES) if (s[lineage]) return JSON.parse(JSON.stringify(s[lineage])) as McqQuestion[];
  return null;
}

export function quizCatalogKeys(): string[] {
  return SOURCES.flatMap((s) => Object.keys(s));
}

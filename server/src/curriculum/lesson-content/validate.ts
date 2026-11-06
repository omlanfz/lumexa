// FILE PATH: server/src/curriculum/lesson-content/validate.ts
//
// Validation of lesson content before an admin save. Returns every problem at once
// (errors block the save, warnings do not) and the normalised structured parts.

import { fenceMask, toLines } from './markdown';
import { normalizeQuiz } from './quiz';
import { parseLineageKey } from './refs';
import { extractVisualIds, isSafeMediaSrc, normalizeVisuals, VISUAL_BLOCK_LANG } from './visuals';
import { QUIZ_BLOCK_LANG } from './quiz-extract';
import type { LessonVisual, QuizQuestion } from './types';

export interface LessonContentInput {
  title?: string;
  objectives?: string[];
  contentMarkdown?: string | null;
  homework?: string | null;
  teacherNotes?: string | null;
  reviewNotes?: string | null;
  checkpoint?: string | null;
  miniQuiz?: unknown;
  visuals?: unknown;
  projectLinks?: { title?: unknown; url?: unknown }[] | null;
  codeSnippets?: { label?: unknown; language?: unknown; code?: unknown }[] | null;
}

export interface LessonContentValidation {
  quiz?: QuizQuestion[];
  visuals?: LessonVisual[];
  errors: string[];
  warnings: string[];
}

const LINK = /(!?)\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
const SAFE_LINK_SCHEME = /^(?:https?:|mailto:|lumexa:lesson\/)/i;

/** Markdown links and images, outside code. */
function markdownLinks(md: string): { image: boolean; text: string; url: string }[] {
  const lines = toLines(md);
  const mask = fenceMask(lines);
  const found: { image: boolean; text: string; url: string }[] = [];
  lines.forEach((line, i) => {
    if (mask[i]) return;
    const withoutCode = line.replace(/(`+)[\s\S]*?\1/g, '');
    for (const m of withoutCode.matchAll(LINK)) found.push({ image: m[1] === '!', text: m[2], url: m[3] });
  });
  return found;
}

function checkMarkdown(label: string, md: string, errors: string[], warnings: string[]) {
  if (md.length > 200_000) errors.push(`${label} is too long (200,000 characters max).`);
  for (const l of markdownLinks(md)) {
    if (l.image) {
      if (l.text.trim() === '') errors.push(`${label}: an image (${l.url.slice(0, 60)}) has no alt text — describe it between the [ ].`);
      if (!isSafeMediaSrc(l.url)) errors.push(`${label}: the image address "${l.url.slice(0, 80)}" must be https:// or start with /lesson-assets/.`);
      continue;
    }
    if (l.url.startsWith('#') || l.url.startsWith('/')) continue;
    if (/^lumexa:lesson\//i.test(l.url)) {
      if (!parseLineageKey(l.url.replace(/^lumexa:lesson\//i, ''))) errors.push(`${label}: the lesson reference "${l.url}" is not valid.`);
      continue;
    }
    if (!SAFE_LINK_SCHEME.test(l.url)) errors.push(`${label}: the link "${l.url.slice(0, 80)}" is not allowed — use https://.`);
    if (l.text.trim() === '') warnings.push(`${label}: a link (${l.url.slice(0, 60)}) has no text.`);
  }
}

/** Validates (and normalises) whichever fields are present on `input`. */
export function validateLessonContent(input: LessonContentInput): LessonContentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const out: LessonContentValidation = { errors, warnings };

  if (input.title !== undefined) {
    if (input.title.trim() === '') errors.push('The lesson needs a title.');
    if (input.title.length > 200) errors.push('The title is too long (200 characters max).');
  }
  if (input.objectives !== undefined) {
    if (input.objectives.length > 12) errors.push('A lesson can have at most 12 learning objectives.');
    input.objectives.forEach((o, i) => {
      if (o.length > 400) errors.push(`Objective ${i + 1} is too long (400 characters max).`);
    });
  }
  if (typeof input.contentMarkdown === 'string') checkMarkdown('Lesson material', input.contentMarkdown, errors, warnings);
  if (typeof input.homework === 'string') checkMarkdown('Homework', input.homework, errors, warnings);
  if (typeof input.teacherNotes === 'string') checkMarkdown('Teacher notes', input.teacherNotes, errors, warnings);

  if (input.miniQuiz !== undefined) {
    const q = normalizeQuiz(input.miniQuiz);
    errors.push(...q.errors);
    warnings.push(...q.warnings);
    out.quiz = q.quiz;
  }
  if (input.visuals !== undefined) {
    const v = normalizeVisuals(input.visuals);
    errors.push(...v.errors);
    warnings.push(...v.warnings);
    out.visuals = v.visuals;
  }

  // Cross-checks between the Markdown and the structured parts.
  if (typeof input.contentMarkdown === 'string') {
    const placed = extractVisualIds(input.contentMarkdown);
    if (out.visuals) {
      const have = new Set(out.visuals.map((v) => v.id));
      for (const id of placed) if (!have.has(id)) errors.push(`The lesson material places a visual "${id}" that does not exist (add it under Visuals, or remove the ${VISUAL_BLOCK_LANG} block).`);
      for (const v of out.visuals) if (!placed.includes(v.id)) warnings.push(`The visual "${v.id}" is not placed anywhere in the lesson material.`);
    }
    if (out.quiz && out.quiz.length === 0 && new RegExp('`{3,}\\s*' + QUIZ_BLOCK_LANG + '\\b').test(input.contentMarkdown)) {
      warnings.push('The lesson material shows the quiz, but the quiz has no questions.');
    }
  }

  if (input.projectLinks) {
    input.projectLinks.forEach((p, i) => {
      const title = typeof p.title === 'string' ? p.title.trim() : '';
      const url = typeof p.url === 'string' ? p.url.trim() : '';
      if (!title || !url) errors.push(`Project link ${i + 1} needs both a name and an address.`);
      else if (!/^https?:\/\/\S+$/i.test(url)) errors.push(`Project link ${i + 1}: the address must start with https://.`);
    });
  }
  if (input.codeSnippets) {
    if (input.codeSnippets.length > 30) errors.push('A lesson can have at most 30 code snippets.');
    input.codeSnippets.forEach((c, i) => {
      if (typeof c.code === 'string' && c.code.length > 30_000) errors.push(`Code snippet ${i + 1} is too long (30,000 characters max).`);
    });
  }
  return out;
}

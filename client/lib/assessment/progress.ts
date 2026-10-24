// FILE PATH: client/lib/assessment/progress.ts
//
// Small pure helpers the test runner and the teacher screens share: which
// questions are answered, how a test splits into sections, and how statuses and
// scores are worded. No React, no DOM.

import type { AttemptQuestion, QuestionKind, ReportStatus, TestType } from './types.ts';

/** `selections` is the student's current answer per question id (display index). */
export function countAnswered(questions: { id: string }[], selections: Record<string, number | null>): number {
  let n = 0;
  for (const q of questions) if (selections[q.id] !== null && selections[q.id] !== undefined) n++;
  return n;
}

export function unansweredQuestions<T extends { id: string }>(questions: T[], selections: Record<string, number | null>): T[] {
  return questions.filter((q) => selections[q.id] === null || selections[q.id] === undefined);
}

export interface Section {
  key: 'MCQ' | 'TRUE_FALSE';
  title: string;
  questions: AttemptQuestion[];
}

/** Multiple-choice first, then True/False — each numbered continuously. */
export function splitSections(questions: AttemptQuestion[]): Section[] {
  const mcq = questions.filter((q) => q.kind === 'MCQ');
  const tf = questions.filter((q) => q.kind === 'TRUE_FALSE');
  const out: Section[] = [];
  if (mcq.length) out.push({ key: 'MCQ', title: 'Multiple choice', questions: mcq });
  if (tf.length) out.push({ key: 'TRUE_FALSE', title: 'True or False', questions: tf });
  return out;
}

export function kindLabel(kind: QuestionKind): string {
  return kind === 'TRUE_FALSE' ? 'True / False' : 'Multiple choice';
}

export function testTypeLabel(type: TestType | string): string {
  switch (type) {
    case 'COURSE_TEST':
      return 'Course Test';
    case 'STAGE_TEST':
      return 'Stage Test';
    case 'FINAL_TEST':
      return 'Final Test';
    default:
      return String(type).replace(/_/g, ' ');
  }
}

export type Tone = 'warning' | 'info' | 'success' | 'neutral' | 'danger';

export function reportStatusMeta(status: ReportStatus): { label: string; tone: Tone; hint: string } {
  switch (status) {
    case 'PENDING_REVIEW':
      return { label: 'Pending Review', tone: 'warning', hint: 'Auto-graded. Review it, adjust if needed, then approve.' };
    case 'PENDING_CODE_EVALUATION':
      return { label: 'Pending Code Evaluation', tone: 'warning', hint: 'The objective part is graded. Mark the coding project to complete the report.' };
    case 'READY_TO_SHARE':
      return { label: 'Ready to Share', tone: 'info', hint: 'Approved. Share it with the parent when you are ready.' };
    case 'SHARED_WITH_PARENTS':
      return { label: 'Shared with Parents', tone: 'success', hint: 'The report was emailed to the parent.' };
  }
}

/** 36 → "36", 36.5 → "36.5", 36.25 → "36.25". */
export function formatMarks(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${Number.isInteger(n) ? n : (Math.round(n * 10) / 10).toFixed(1)}%`;
}

/** "00:07:42" style elapsed time. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (x: number) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Splits question text into plain/code segments: ```lang fences and `inline`. */
export type TextSegment =
  | { type: 'text'; value: string }
  | { type: 'inline'; value: string }
  | { type: 'block'; value: string; lang: string };

export function parseQuestionText(text: string): TextSegment[] {
  const out: TextSegment[] = [];
  const fence = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushInline = (chunk: string) => {
    const re = /`([^`\n]+)`/g;
    let i = 0;
    let im: RegExpExecArray | null;
    while ((im = re.exec(chunk)) !== null) {
      if (im.index > i) out.push({ type: 'text', value: chunk.slice(i, im.index) });
      out.push({ type: 'inline', value: im[1] });
      i = im.index + im[0].length;
    }
    if (i < chunk.length) out.push({ type: 'text', value: chunk.slice(i) });
  };
  while ((m = fence.exec(text)) !== null) {
    if (m.index > last) pushInline(text.slice(last, m.index));
    out.push({ type: 'block', lang: m[1] || 'text', value: m[2].replace(/\n$/, '') });
    last = m.index + m[0].length;
  }
  if (last < text.length) pushInline(text.slice(last));
  return out;
}

/** One-line summary of a question for lists: its first line, plus the first
 *  line of its code when it is about a snippet — so "What is printed when this
 *  code runs?" can be told apart from the dozen others like it. */
export function questionHeadline(text: string, maxCode = 48): string {
  const lines = text.split('\n');
  const fence = lines.findIndex((l) => l.trim().startsWith('```'));
  const first = (fence === -1 ? lines[0] : fence === 0 ? '' : lines[0]).trim();
  if (fence === -1) return first;
  const code = lines
    .slice(fence + 1)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('```'));
  if (!code) return first;
  const snippet = code.length > maxCode ? `${code.slice(0, maxCode - 1)}…` : code;
  return first ? `${first} — ${snippet}` : snippet;
}

// FILE PATH: server/src/little-coders/assessments/lc-attempt.ts
//
// Small pure helpers for the Little Coders assessment flow (kept out of the assessment engine so
// every rule is unit-tested on its own): which practical version a class is given, how submitted
// links are checked, and what a student may see of the practical's specification.

import { SessionType } from '@prisma/client';
import { LC_ASSESSMENT, LC_FILE_LIMITS, LC_VARIANTS, type LcVariant } from '../lc.constants';
import type { LcPracticalSpec } from '../lc.types';
import { isHttpsUrl, validatePracticalSpec } from '../lc.validate';

/** Which practical version a class gets: the class's own override, else the assessment's. */
export function pickVariant(opts: { classVariant?: string | null; assessmentVariant?: string | null }): LcVariant {
  for (const v of [opts.classVariant, opts.assessmentVariant]) {
    if (v && (LC_VARIANTS as readonly string[]).includes(v)) return v as LcVariant;
  }
  return 'SCRATCH_AI';
}

/** The practical question a class is given. A course assessment has one (no variant); the final has one per version. */
export function pickPractical<T extends { variantKey: string | null }>(practicals: T[], variant: LcVariant): T | null {
  if (practicals.length === 0) return null;
  const withoutVariant = practicals.filter((p) => !p.variantKey);
  if (withoutVariant.length > 0 && practicals.every((p) => !p.variantKey)) return withoutVariant[0];
  return practicals.find((p) => p.variantKey === variant) ?? practicals[0];
}

export interface LinkCheck {
  links: string[];
  error: string | null;
}

/** Trims, de-duplicates and validates the project links a student hands in (https only). */
export function normalizeLinks(input: unknown): LinkCheck {
  if (input === undefined || input === null) return { links: [], error: null };
  if (!Array.isArray(input)) return { links: [], error: 'Links must be a list.' };
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') return { links: [], error: 'Each link must be text.' };
    const link = raw.trim();
    if (!link) continue;
    if (link.length > LC_FILE_LIMITS.maxLinkLength) return { links: [], error: `A link is longer than ${LC_FILE_LIMITS.maxLinkLength} characters.` };
    if (!isHttpsUrl(link)) return { links: [], error: `“${link.slice(0, 60)}” is not a full https:// link.` };
    if (!out.includes(link)) out.push(link);
  }
  if (out.length > LC_FILE_LIMITS.maxLinks) return { links: [], error: `You can hand in up to ${LC_FILE_LIMITS.maxLinks} links.` };
  return { links: out, error: null };
}

export function cleanNote(note: unknown): string | null {
  if (typeof note !== 'string') return null;
  const t = note.trim().slice(0, LC_FILE_LIMITS.maxNoteLength);
  return t || null;
}

/** The stored practical spec, or null when it does not pass validation (never served broken). */
export function readPracticalSpec(raw: unknown): LcPracticalSpec | null {
  const v = validatePracticalSpec(raw);
  return v.value;
}

/** What a student sees of the specification: the staff note about the starter is replaced by a student message. */
export function studentPracticalSpec(spec: LcPracticalSpec): LcPracticalSpec {
  // `adminEdited` is bookkeeping for the question-bank sync, not part of the brief.
  const { adminEdited: _bookkeeping, ...brief } = spec;
  void _bookkeeping;
  const waiting = brief.starter.required && !brief.starter.url;
  return {
    ...brief,
    starter: {
      ...brief.starter,
      note: waiting
        ? 'Your teacher will share the prepared link in class.'
        : brief.starter.required
          ? 'Use this prepared link. You do not need to train anything.'
          : '',
    },
  };
}

/** The standardized header and sections of a Little Coders assessment (shown on the launcher and the test). */
export function lcAssessmentMeta(type: SessionType) {
  const a = LC_ASSESSMENT;
  return {
    brand: a.brand,
    title: type === SessionType.FINAL_TEST ? a.finalTitle : a.title,
    minutes: a.minutes,
    marks: a.marks,
    negativeMarking: a.negativeMarking,
    sections: [
      { key: 'mcq', label: a.mcq.label, detail: `${a.mcq.count} MCQs`, marks: a.mcq.marks, minutes: a.mcq.minutes },
      { key: 'trueFalse', label: a.trueFalse.label, detail: `${a.trueFalse.count} True/False`, marks: a.trueFalse.marks, minutes: a.trueFalse.minutes },
      { key: 'practical', label: a.practical.label, detail: 'Practical coding project', marks: a.practical.marks, minutes: a.practical.minutes },
      { key: 'review', label: a.review.label, detail: 'Final check and submission', marks: null, minutes: a.review.minutes },
    ],
  };
}

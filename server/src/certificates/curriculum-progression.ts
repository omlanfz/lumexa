// FILE PATH: server/src/certificates/curriculum-progression.ts
//
// The ONLY place that knows "what comes after completing curriculum X" —
// every actual Lumexa offering, per course-catalog.seed.ts's COURSE_CATALOG
// (the flagship Lumexa Odyssey + its 6 specialized pathways). Nothing here
// invents a curriculum name; PATHWAY_ORDER is exactly the 6 real pathway
// slugs, ordered to mirror the real Stage 1 → 2 → 3 sequence Odyssey
// samples them in (see ODYSSEY_STAGES in curriculum-catalog.seed.ts):
// Stage 1 draws from little-coders + game-creator, Stage 2 from
// web-developer + digital-independence, Stage 3 from data-scientist +
// ai-builder — so this list runs youngest/most-foundational to most
// advanced, the same progression Odyssey itself teaches in.
//
// Kept deliberately separate from CertificateService/NotificationsService
// so the actual progression rule can change later (e.g. to a
// performance-based recommendation) without touching how certificates are
// issued or how the email is sent.

import { canonicalCourseSlug } from '../courses/course-slug';

export interface CurriculumInfo {
  slug: string;
  title: string;
  blurb: string;
  pdfFile: string; // filename under server/assets/curriculum-pdfs/
}

export const CURRICULUM_CATALOG: Record<string, CurriculumInfo> = {
  'lumexa-odyssey': {
    slug: 'lumexa-odyssey',
    title: 'Lumexa Odyssey',
    blurb:
      'The flagship broad-exposure journey across games, websites, apps, data, and AI.',
    pdfFile: 'lumexa-odyssey-curriculum.pdf',
  },
  'little-coders': {
    slug: 'little-coders',
    title: 'Little Coders',
    blurb:
      'Five hands-on courses: Scratch animations and games, AI-powered projects, and first block-based Python.',
    pdfFile: 'little-coders-path-curriculum.pdf',
  },
  'game-creator': {
    slug: 'game-creator',
    title: 'Game Creator',
    blurb: 'Design, script, and ship three real, playable games.',
    pdfFile: 'game-creator-path-curriculum.pdf',
  },
  'web-developer': {
    slug: 'web-developer',
    title: 'Web Developer',
    blurb:
      'Go from a first HTML page to a deployed, full-stack React application.',
    pdfFile: 'web-developer-path-curriculum.pdf',
  },
  'digital-independence': {
    slug: 'digital-independence',
    title: 'Digital Independence',
    blurb:
      'Build the portfolio, professional skills, and business knowledge to turn ability into real opportunity.',
    pdfFile: 'digital-independence-path-curriculum.pdf',
  },
  'data-scientist': {
    slug: 'data-scientist',
    title: 'Data Scientist',
    blurb:
      'Clean real datasets, build visualizations, and train models that make real decisions.',
    pdfFile: 'data-scientist-path-curriculum.pdf',
  },
  'ai-builder': {
    slug: 'ai-builder',
    title: 'AI Builder',
    blurb:
      'Go from a first line of Python to real machine learning, computer vision, and LLM applications.',
    pdfFile: 'ai-builder-path-curriculum.pdf',
  },
};

// The 6 specialized pathways in Odyssey's own Stage 1→2→3 order. Odyssey
// itself is intentionally excluded — it is the entry point, never a "next
// step" recommendation.
/** Looks a curriculum up by course slug, tolerating the old "-path" spelling. */
export function findCurriculumInfo(slug: string): CurriculumInfo | undefined {
  return CURRICULUM_CATALOG[canonicalCourseSlug(slug)];
}

export const PATHWAY_ORDER: string[] = [
  'little-coders',
  'game-creator',
  'web-developer',
  'digital-independence',
  'data-scientist',
  'ai-builder',
];

/** Given the slug of a curriculum a student just completed and the set of
 * curriculum slugs they've already completed (including this one), returns
 * the next recommended curriculum — or null if there genuinely isn't one
 * (they've completed every specialized pathway). Completing Odyssey always
 * recommends the first pathway in PATHWAY_ORDER not yet completed;
 * completing a specialized pathway recommends the next one after it in
 * that same order, skipping anything already done. */
export function getNextRecommendedCurriculum(
  completedSlug: string,
  allCompletedSlugs: string[],
): CurriculumInfo | null {
  const completed = new Set(allCompletedSlugs.map(canonicalCourseSlug));
  const completedCanonical = canonicalCourseSlug(completedSlug);

  const startIndex =
    completedCanonical === 'lumexa-odyssey'
      ? 0
      : Math.max(0, PATHWAY_ORDER.indexOf(completedCanonical) + 1);

  for (let i = startIndex; i < PATHWAY_ORDER.length; i++) {
    const slug = PATHWAY_ORDER[i];
    if (!completed.has(slug)) return CURRICULUM_CATALOG[slug];
  }
  // Wrapped past the end without finding an uncompleted pathway (or started
  // mid-list from a pathway near the end) — do one final pass from the top
  // in case an earlier pathway was skipped.
  for (const slug of PATHWAY_ORDER) {
    if (!completed.has(slug)) return CURRICULUM_CATALOG[slug];
  }
  return null;
}

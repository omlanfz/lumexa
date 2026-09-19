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
  'little-coders-path': {
    slug: 'little-coders-path',
    title: 'Little Coders Path',
    blurb:
      'A gentle, project-driven introduction to computing and a first taste of AI.',
    pdfFile: 'little-coders-path-curriculum.pdf',
  },
  'game-creator-path': {
    slug: 'game-creator-path',
    title: 'Game Creator Path',
    blurb: 'Design, script, and ship three real, playable games.',
    pdfFile: 'game-creator-path-curriculum.pdf',
  },
  'web-developer-path': {
    slug: 'web-developer-path',
    title: 'Web Developer Path',
    blurb:
      'Go from a first HTML page to a deployed, full-stack React application.',
    pdfFile: 'web-developer-path-curriculum.pdf',
  },
  'digital-independence-path': {
    slug: 'digital-independence-path',
    title: 'Digital Independence Path',
    blurb:
      'Build the portfolio, professional skills, and business knowledge to turn ability into real opportunity.',
    pdfFile: 'digital-independence-path-curriculum.pdf',
  },
  'data-scientist-path': {
    slug: 'data-scientist-path',
    title: 'Data Scientist Path',
    blurb:
      'Clean real datasets, build visualizations, and train models that make real decisions.',
    pdfFile: 'data-scientist-path-curriculum.pdf',
  },
  'ai-builder-path': {
    slug: 'ai-builder-path',
    title: 'AI Builder Path',
    blurb:
      'Go from a first line of Python to real machine learning, computer vision, and LLM applications.',
    pdfFile: 'ai-builder-path-curriculum.pdf',
  },
};

// The 6 specialized pathways in Odyssey's own Stage 1→2→3 order. Odyssey
// itself is intentionally excluded — it is the entry point, never a "next
// step" recommendation.
export const PATHWAY_ORDER: string[] = [
  'little-coders-path',
  'game-creator-path',
  'web-developer-path',
  'digital-independence-path',
  'data-scientist-path',
  'ai-builder-path',
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
  const completed = new Set(allCompletedSlugs);

  const startIndex =
    completedSlug === 'lumexa-odyssey'
      ? 0
      : Math.max(0, PATHWAY_ORDER.indexOf(completedSlug) + 1);

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

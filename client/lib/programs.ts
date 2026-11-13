// Marketing metadata for the programs shown on the public site.
//
// WHAT a program is (its title, slug, age range, courses and lessons) always
// comes from the live catalog (see catalog.ts), which reads the same rows
// /admin/courses manages. Rename a program, change its slug or ages, or add a
// new one there and the public site follows, with no code change.
//
// This file only holds PRESENTATION that a course row cannot carry: card
// colours, a tagline, a curriculum PDF and the price of a block of lessons.
// It is looked up by the program's slug (or, if an admin re-slugs it, its
// title) with the retired "-path" suffix ignored. A program with no entry here
// still gets a card: a colour picked from its slug, a generic tagline, the
// default price and no curriculum download.

import type { CatalogCourse, Catalog, ProgramBadge } from "./catalog";

/** Short id used in links (?program=ai); the slug itself for programs not listed below. */
export type ProgramKey = string;
export type ProgramId = ProgramKey;

export interface ProgramMeta {
  id: ProgramKey;
  /** The Course.slug this program currently has in the catalog. */
  catalogSlug: string;
  emoji: string;
  title: string;
  ages: string;
  tagline: string;
  /** "Your child can build: …" on the homepage card. */
  builds: string;
  /** Badges next to the age range: "Beginner friendly", "Most popular", "Basic Python needed"… */
  badges: ProgramBadge[];
  /** One plain line on who the program is for. */
  audience: string | null;
  /** What a child should know first, or null when nothing is needed. */
  prerequisite: string | null;
  mostPopular: boolean;
  /** gradient used for icon tiles and primary buttons */
  color: string;
  border: string;
  badge: string;
  accent: string;
  dot: string;
  hover: string;
  /** File in /public/curriculums, or null when the program has no PDF yet. */
  curriculumFile: string | null;
  /** A brand mark shown in place of the emoji (a path under /public), or null. */
  logo: string | null;
  /** Private 1:1 price for every 8 lessons, in BDT. */
  blockPrice: number;
}

export interface ProgramEntry {
  meta: ProgramMeta;
  course: CatalogCourse;
}

// ── Themes ──────────────────────────────────────────────────────────────────

interface Theme {
  color: string;
  border: string;
  badge: string;
  accent: string;
  dot: string;
  hover: string;
}

const THEMES = {
  amber: {
    color: "from-yellow-500 to-orange-500",
    border: "border-yellow-300 dark:border-yellow-700/40",
    badge: "bg-amber-100 dark:bg-yellow-900/30 text-amber-700 dark:text-yellow-300",
    accent: "text-amber-600 dark:text-yellow-400",
    dot: "bg-amber-500",
    hover: "hover:border-amber-300 dark:hover:border-amber-500/50",
  },
  red: {
    color: "from-red-600 to-orange-600",
    border: "border-red-300 dark:border-red-700/40",
    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    accent: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    hover: "hover:border-red-300 dark:hover:border-red-500/50",
  },
  purple: {
    color: "from-purple-600 to-blue-600",
    border: "border-purple-300 dark:border-purple-700/40",
    badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    accent: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-500",
    hover: "hover:border-purple-300 dark:hover:border-purple-500/50",
  },
  blue: {
    color: "from-blue-600 to-cyan-600",
    border: "border-blue-300 dark:border-blue-700/40",
    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    accent: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    hover: "hover:border-blue-300 dark:hover:border-blue-500/50",
  },
  teal: {
    color: "from-teal-600 to-green-600",
    border: "border-teal-300 dark:border-teal-700/40",
    badge: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
    accent: "text-teal-600 dark:text-teal-400",
    dot: "bg-teal-500",
    hover: "hover:border-teal-300 dark:hover:border-teal-500/50",
  },
  green: {
    color: "from-green-600 to-emerald-600",
    border: "border-green-300 dark:border-green-700/40",
    badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    accent: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
    hover: "hover:border-green-300 dark:hover:border-green-500/50",
  },
  indigo: {
    color: "from-indigo-600 to-sky-600",
    border: "border-indigo-300 dark:border-indigo-700/40",
    badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
    accent: "text-indigo-600 dark:text-indigo-400",
    dot: "bg-indigo-500",
    hover: "hover:border-indigo-300 dark:hover:border-indigo-500/50",
  },
  // Python's own blue. Reserved for Python Foundations, so it is not in the pool below.
  python: {
    color: "from-sky-700 to-blue-600",
    border: "border-sky-300 dark:border-sky-700/40",
    badge: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
    accent: "text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
    hover: "hover:border-sky-300 dark:hover:border-sky-500/50",
  },
} satisfies Record<string, Theme>;

type ThemeName = keyof typeof THEMES;
/** The colours a program without a preset can be given (reserved themes are left out, so existing programs keep their look). */
const THEME_NAMES = (Object.keys(THEMES) as ThemeName[]).filter((name) => name !== "python");

// ── Presentation by program ─────────────────────────────────────────────────

interface Preset {
  /** Short id used in links. */
  id: string;
  emoji: string;
  tagline: string;
  builds: string;
  theme: ThemeName;
  curriculumFile: string | null;
  /** A brand mark shown in place of the emoji (a path under /public). */
  logo?: string;
  /** Private 1:1 price for every 8 lessons, in BDT. */
  blockPrice: number;
  /** Order on /programs and /pricing. */
  rank: number;
  /** Order on the homepage. */
  homeRank: number;
}

/** Advanced Data Science is priced exactly like Data Scientist. */
const DATA_SCIENCE_BLOCK_PRICE = 7500;

/** Price for a program without an entry below. */
export const DEFAULT_BLOCK_PRICE = 7000;

// Keyed by the program's slug without any "-path" suffix.
const PRESETS: Record<string, Preset> = {
  "little-coders": {
    id: "little",
    emoji: "🌟",
    tagline: "Learn Coding Through Play",
    builds: "Animated stories, arcade games, AI-powered projects and first Python programs.",
    theme: "amber",
    curriculumFile: "little-coders-path-curriculum.pdf",
    blockPrice: 5000,
    rank: 1,
    homeRank: 5,
  },
  "game-creator": {
    id: "game",
    emoji: "🎮",
    tagline: "Design, Code & Build Your Own Games",
    builds: "Roblox and Python games that friends can actually play.",
    theme: "red",
    curriculumFile: "game-creator-path-curriculum.pdf",
    blockPrice: 6000,
    rank: 2,
    homeRank: 1,
  },
  // Priced exactly like Game Creator: the same block price, so the same Small Batch price
  // (60%) and the same whole-program discount (see pricing.ts).
  "python-foundations": {
    id: "python",
    emoji: "🐍",
    tagline: "Learn Python From Zero & Build Real Projects",
    builds: "Calculators, quiz games, a text adventure, an expense tracker and a data explorer, all written in Python.",
    theme: "python",
    curriculumFile: "python-foundations-curriculum.pdf",
    logo: "/brand/python-logo.svg",
    blockPrice: 6000,
    rank: 3,
    homeRank: 2,
  },
  "ai-builder": {
    id: "ai",
    emoji: "🤖",
    tagline: "Explore AI & Build Intelligent Projects",
    builds: "Chatbots, image classifiers and other smart AI apps.",
    theme: "purple",
    curriculumFile: "ai-builder-path-curriculum.pdf",
    blockPrice: 7500,
    rank: 4,
    homeRank: 3,
  },
  "web-developer": {
    id: "web",
    emoji: "🌐",
    tagline: "Design, Build & Launch Real Websites",
    builds: "Live websites and web apps that anyone can visit.",
    theme: "blue",
    curriculumFile: "web-developer-path-curriculum.pdf",
    blockPrice: 7000,
    rank: 5,
    homeRank: 4,
  },
  "data-scientist": {
    id: "data",
    emoji: "📊",
    tagline: "Turn Data Into Insights With Python",
    builds: "Charts, dashboards and models that predict from real data.",
    theme: "teal",
    curriculumFile: "data-scientist-path-curriculum.pdf",
    blockPrice: DATA_SCIENCE_BLOCK_PRICE,
    rank: 6,
    homeRank: 6,
  },
  "advanced-data-science": {
    id: "advanced-data-science",
    emoji: "🧠",
    tagline: "Build 15+ Real AI & Data Science Projects",
    builds: "Arcade games, data dashboards and machine learning models you can deploy.",
    theme: "indigo",
    curriculumFile: "advanced-data-science-curriculum.pdf",
    blockPrice: DATA_SCIENCE_BLOCK_PRICE,
    rank: 7,
    homeRank: 7,
  },
  "digital-independence": {
    id: "digital",
    emoji: "💼",
    tagline: "Build Your Digital Identity & Future",
    builds: "A professional portfolio, personal brand and service plan.",
    theme: "green",
    curriculumFile: "digital-independence-path-curriculum.pdf",
    blockPrice: 6000,
    rank: 8,
    homeRank: 8,
  },
};

const FALLBACK_TAGLINE = "Live, project-based learning with an expert teacher";
const FALLBACK_BUILDS = "Real projects, built step by step with a live teacher.";

/** "ai-builder-path" -> "ai-builder". The suffix was retired; old links and
 *  databases that still use it keep working. */
export function normalizeSlug(slug: string): string {
  return slug.replace(/-path$/, "");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function presetFor(course: CatalogCourse): Preset | undefined {
  // By slug first; if an admin re-slugged the program, by its title.
  return PRESETS[normalizeSlug(course.slug)] ?? PRESETS[normalizeSlug(slugify(course.title))];
}

/** A stable colour for a program with no preset, so it keeps the same look. */
function themeFor(slug: string): Theme {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return THEMES[THEME_NAMES[hash % THEME_NAMES.length]];
}

function agesOf(course: CatalogCourse): string {
  return course.ageMin === course.ageMax
    ? `Age ${course.ageMin}`
    : `Ages ${course.ageMin}–${course.ageMax}`;
}

/** The card/pricing metadata for one specialized program. */
export function programMetaFor(course: CatalogCourse): ProgramMeta {
  const preset = presetFor(course);
  const theme = preset ? THEMES[preset.theme] : themeFor(normalizeSlug(course.slug));
  return {
    id: preset?.id ?? normalizeSlug(course.slug),
    catalogSlug: course.slug,
    emoji: preset?.emoji ?? course.emoji ?? "📘",
    title: course.title,
    ages: agesOf(course),
    tagline: preset?.tagline ?? FALLBACK_TAGLINE,
    builds: preset?.builds ?? FALLBACK_BUILDS,
    badges: course.badges ?? [],
    audience: course.audience ?? null,
    prerequisite: course.prerequisite ?? null,
    mostPopular: course.mostPopular ?? false,
    ...theme,
    curriculumFile: preset ? preset.curriculumFile : null,
    logo: preset?.logo ?? null,
    blockPrice: preset?.blockPrice ?? DEFAULT_BLOCK_PRICE,
  };
}

export const ODYSSEY: ProgramMeta = {
  id: "odyssey",
  catalogSlug: "lumexa-odyssey",
  emoji: "🚀",
  title: "Lumexa Odyssey",
  ages: "Ages 6–18",
  tagline: "Your child's complete coding journey",
  builds: "Games, websites, data projects and first AI apps while they explore, before choosing a specialty.",
  // Until the catalog answers (these match the server's program facts; a test keeps them in step).
  badges: [
    { label: "Best choice for beginners", tone: "beginner" },
    { label: "Suitable for all ages", tone: "info" },
  ],
  audience: "Suitable for all ages — the best choice for beginners",
  prerequisite: null,
  mostPopular: false,
  color: "from-indigo-600 via-purple-600 to-blue-600",
  border: "border-purple-300 dark:border-purple-700/40",
  badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  accent: "text-purple-600 dark:text-purple-400",
  dot: "bg-purple-500",
  hover: "hover:border-purple-300 dark:hover:border-purple-500/50",
  curriculumFile: "lumexa-odyssey-curriculum.pdf",
  logo: null,
  blockPrice: 6500,
};

export interface Programs {
  /** The flagship, when it is in the catalog. */
  odyssey: ProgramEntry | null;
  /** Every active specialized program, in the order parents see them. */
  specialized: ProgramEntry[];
  /** Odyssey (always) followed by every specialized program. */
  all: ProgramMeta[];
}

/** Everything the marketing pages show, derived from the catalog alone. A
 *  program appears the moment it is in the catalog, whatever its slug. */
export function buildPrograms(catalog: Catalog): Programs {
  const odysseyCourse = catalog.courses.find((c) => c.kind === "odyssey");
  // The flagship's age range and badges follow the catalog like every other program's.
  const odysseyMeta: ProgramMeta = odysseyCourse
    ? {
        ...ODYSSEY,
        catalogSlug: odysseyCourse.slug,
        ages: agesOf(odysseyCourse),
        badges: odysseyCourse.badges ?? ODYSSEY.badges,
        audience: odysseyCourse.audience ?? ODYSSEY.audience,
        prerequisite: odysseyCourse.prerequisite ?? ODYSSEY.prerequisite,
        mostPopular: odysseyCourse.mostPopular ?? ODYSSEY.mostPopular,
      }
    : ODYSSEY;
  const specialized = catalog.courses
    .filter((c) => c.kind === "specialized")
    .map((course) => ({ meta: programMetaFor(course), course, preset: presetFor(course) }))
    .sort(
      (a, b) =>
        (a.preset?.rank ?? 1000) - (b.preset?.rank ?? 1000) ||
        a.course.ageMin - b.course.ageMin ||
        a.course.title.localeCompare(b.course.title),
    )
    .map(({ meta, course }) => ({ meta, course }));
  return {
    odyssey: odysseyCourse ? { meta: odysseyMeta, course: odysseyCourse } : null,
    specialized,
    all: [odysseyMeta, ...specialized.map((s) => s.meta)],
  };
}

/** The specialized programs in homepage order. */
export function homeOrder(specialized: ProgramEntry[]): ProgramEntry[] {
  const rank = (e: ProgramEntry) => presetFor(e.course)?.homeRank ?? 1000;
  return [...specialized].sort((a, b) => rank(a) - rank(b));
}

/** Resolves ?program= values: the short id, the slug, or the older "-path" slug. */
export function resolveProgramId(
  value: string | null | undefined,
  programs: ProgramMeta[],
): ProgramKey | null {
  if (!value) return null;
  const wanted = normalizeSlug(value);
  const match = programs.find(
    (p) => p.id === value || p.id === wanted || normalizeSlug(p.catalogSlug) === wanted,
  );
  return match ? match.id : null;
}

/** "Ages 6–18": the span covered by the given programs. */
export function ageSpan(programs: ProgramMeta[]): string {
  const ages = programs.flatMap((p) => (p.ages.match(/\d+/g) ?? []).map(Number));
  return ages.length ? `Ages ${Math.min(...ages)}–${Math.max(...ages)}` : "";
}

export function getProgram(id: ProgramKey, programs: ProgramMeta[]): ProgramMeta {
  return programs.find((p) => p.id === id) ?? ODYSSEY;
}

/** Odyssey's three stages. The names live with the Odyssey curriculum
 *  document; the catalog only knows the stage number. */
export const STAGE_NAMES: Record<number, string> = {
  1: "Foundation",
  2: "Create & Apply",
  3: "Explore & Advance",
};

/** A plain-language line per course, keyed by the course's slug. Optional: a
 *  course without one simply shows no summary line. */
export const COURSE_OUTCOMES: Record<string, string> = {
  "roblox-world-builder": "Build and publish a multiplayer Roblox game from scratch",
  "python-arcade-games": "Build 2D games using Python and Pygame",
  "advanced-game-design": "Design, polish, and publish a complete game with professional quality",
  "python-ai-foundations": "Write Python scripts and understand how machine learning really works",
  "computer-vision": "Build apps that see, detect, and recognize the real world",
  "language-models": "Build conversational AI apps using real LLM APIs",
  "html-css-mastery": "Build beautiful, responsive websites that look great on any device",
  "javascript-interactivity": "Add dynamic, interactive behavior to any webpage",
  "react-fullstack-web": "Build and deploy modern React applications used in real companies",
  // Python Foundations
  "python-programming-essentials": "Write your first real Python programs with variables, decisions, loops, strings, collections and functions",
  "problem-solving-program-design": "Plan, debug, handle errors and build bigger programs with files and classes",
  "python-tools-data-foundations": "Use real Python tools: notebooks, NumPy, Pandas and APIs to explore real data",
  "scratch-adventures": "Create animated stories, games, and interactive projects visually",
  "python-for-young-builders": "Write first real Python programs, the same language used by NASA and Google",
  "ai-for-kids": "Train your own AI models and build apps that see, listen, and respond",
  // Little Coders' five independent courses (the three above are shared with other programs).
  "scratch-game-studio": "Turn Scratch skills into real games with controls, scores, lives, levels and clones",
  "python-explorers": "Take first steps in Python with EduBlocks: print, draw, repeat, calculate and decide",
  "python-creative-lab": "Use lists, functions and loops in block-based Python, then build your own capstone",
  "python-for-data": "Load, clean, and analyse real-world datasets using Python",
  "data-visualisation": "Turn raw data into compelling, interactive charts and dashboards",
  "machine-learning-projects": "Build predictive models that make real decisions from real data",
  "build-your-professional-identity": "A live portfolio, brand kit, and project case studies that prove your skills are real",
  "skills-that-pay": "A packaged service, pricing, proposal, and a full simulated client project",
  "professional-presence": "A professional presence, real content, and a 90-day plan to generate opportunities",
};

/** The summary line for a course: by its slug, else by its title (courses of a
 *  program built lesson by lesson have generated slugs but real titles). */
export function courseOutcome(course: { slug: string; title: string }): string | undefined {
  return COURSE_OUTCOMES[course.slug] ?? COURSE_OUTCOMES[slugify(course.title)];
}

/** Value stored with a trial request, e.g. "AI Builder (Ages 12–18)". */
export function trialSubjectLabel(program: ProgramMeta): string {
  return program.id === "odyssey"
    ? `${program.title} (complete journey, ${program.ages})`
    : `${program.title} (${program.ages})`;
}

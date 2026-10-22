// Marketing metadata for the programs shown on the public site.
//
// This is presentation only (names, ages, taglines, colours). Anything that
// can change as the catalog grows — how many courses a program has, how many
// lessons, the lesson titles — comes from the live catalog (see catalog.ts),
// never from here.

export type ProgramId = "little" | "game" | "ai" | "web" | "data" | "digital";
export type ProgramKey = ProgramId | "odyssey";

export interface ProgramMeta {
  id: ProgramKey;
  /** Course.slug of the program in the catalog (what /admin/courses lists). */
  catalogSlug: string;
  emoji: string;
  title: string;
  ages: string;
  tagline: string;
  /** gradient used for icon tiles and primary buttons */
  color: string;
  border: string;
  badge: string;
  accent: string;
  dot: string;
  curriculumFile: string;
}

export const ODYSSEY: ProgramMeta = {
  id: "odyssey",
  catalogSlug: "lumexa-odyssey",
  emoji: "🚀",
  title: "Lumexa Odyssey",
  ages: "Ages 12–18",
  tagline: "Your child's complete coding journey",
  color: "from-indigo-600 via-purple-600 to-blue-600",
  border: "border-purple-300 dark:border-purple-700/40",
  badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  accent: "text-purple-600 dark:text-purple-400",
  dot: "bg-purple-500",
  curriculumFile: "lumexa-odyssey-curriculum.pdf",
};

// Order here is the order parents see on /programs and /pricing.
export const PROGRAMS: ProgramMeta[] = [
  {
    id: "little",
    catalogSlug: "little-coders-path",
    emoji: "🌟",
    title: "Little Coders",
    ages: "Ages 6–9",
    tagline: "Learn Coding Through Play",
    color: "from-yellow-500 to-orange-500",
    border: "border-yellow-300 dark:border-yellow-700/40",
    badge: "bg-amber-100 dark:bg-yellow-900/30 text-amber-700 dark:text-yellow-300",
    accent: "text-amber-600 dark:text-yellow-400",
    dot: "bg-amber-500",
    curriculumFile: "little-coders-path-curriculum.pdf",
  },
  {
    id: "game",
    catalogSlug: "game-creator-path",
    emoji: "🎮",
    title: "Game Creator",
    ages: "Ages 10–18",
    tagline: "Design, Code & Build Your Own Games",
    color: "from-red-600 to-orange-600",
    border: "border-red-300 dark:border-red-700/40",
    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    accent: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    curriculumFile: "game-creator-path-curriculum.pdf",
  },
  {
    id: "ai",
    catalogSlug: "ai-builder-path",
    emoji: "🤖",
    title: "AI Builder",
    ages: "Ages 12–18",
    tagline: "Explore AI & Build Intelligent Projects",
    color: "from-purple-600 to-blue-600",
    border: "border-purple-300 dark:border-purple-700/40",
    badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    accent: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-500",
    curriculumFile: "ai-builder-path-curriculum.pdf",
  },
  {
    id: "web",
    catalogSlug: "web-developer-path",
    emoji: "🌐",
    title: "Web Developer",
    ages: "Ages 12–18",
    tagline: "Design, Build & Launch Real Websites",
    color: "from-blue-600 to-cyan-600",
    border: "border-blue-300 dark:border-blue-700/40",
    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    accent: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    curriculumFile: "web-developer-path-curriculum.pdf",
  },
  {
    id: "data",
    catalogSlug: "data-scientist-path",
    emoji: "📊",
    title: "Data Scientist",
    ages: "Ages 12–18",
    tagline: "Turn Data Into Insights With Python",
    color: "from-teal-600 to-green-600",
    border: "border-teal-300 dark:border-teal-700/40",
    badge: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
    accent: "text-teal-600 dark:text-teal-400",
    dot: "bg-teal-500",
    curriculumFile: "data-scientist-path-curriculum.pdf",
  },
  {
    id: "digital",
    catalogSlug: "digital-independence-path",
    emoji: "💼",
    title: "Digital Independence",
    ages: "Ages 15–18",
    tagline: "Build Your Digital Identity & Future",
    color: "from-green-600 to-emerald-600",
    border: "border-green-300 dark:border-green-700/40",
    badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    accent: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
    curriculumFile: "digital-independence-path-curriculum.pdf",
  },
];

export const ALL_PROGRAMS: ProgramMeta[] = [ODYSSEY, ...PROGRAMS];

/** Resolves ?program= values, including the short ids and the older long ones. */
const ALIASES: Record<string, ProgramKey> = {
  "little-coders": "little",
  "game-creator": "game",
  "ai-builder": "ai",
  "web-developer": "web",
  "data-scientist": "data",
  "digital-independence": "digital",
};

export function resolveProgramId(value: string | null | undefined): ProgramKey | null {
  if (!value) return null;
  const key = ALIASES[value] ?? value;
  return ALL_PROGRAMS.some((p) => p.id === key) ? (key as ProgramKey) : null;
}

/** "Ages 6–18": the span covered by the given programs. */
export function ageSpan(programs: ProgramMeta[]): string {
  const ages = programs.flatMap((p) => (p.ages.match(/\d+/g) ?? []).map(Number));
  return ages.length ? `Ages ${Math.min(...ages)}–${Math.max(...ages)}` : "";
}

export function getProgram(id: ProgramKey): ProgramMeta {
  return ALL_PROGRAMS.find((p) => p.id === id) ?? ODYSSEY;
}

/** Odyssey's three stages. The names live with the Odyssey curriculum
 *  document; the catalog only knows the stage number. */
export const STAGE_NAMES: Record<number, string> = {
  1: "Foundation",
  2: "Create & Apply",
  3: "Explore & Advance",
};

/** A plain-language line per course, keyed by the course's catalog slug.
 *  Optional: a course without one simply shows no summary line. */
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
  "scratch-adventures": "Create animated stories, games, and interactive projects visually",
  "python-for-young-builders": "Write first real Python programs, the same language used by NASA and Google",
  "ai-for-kids": "Train your own AI models and build apps that see, listen, and respond",
  "python-for-data": "Load, clean, and analyse real-world datasets using Python",
  "data-visualisation": "Turn raw data into compelling, interactive charts and dashboards",
  "machine-learning-projects": "Build predictive models that make real decisions from real data",
  "build-your-professional-identity": "A live portfolio, brand kit, and project case studies that prove your skills are real",
  "skills-that-pay": "A packaged service, pricing, proposal, and a full simulated client project",
  "professional-presence": "A professional presence, real content, and a 90-day plan to generate opportunities",
};

/** Value stored with a trial request, e.g. "AI Builder (Ages 12–18)". */
export function trialSubjectLabel(program: ProgramMeta): string {
  return program.id === "odyssey"
    ? `${program.title} (complete journey, ${program.ages})`
    : `${program.title} (${program.ages})`;
}

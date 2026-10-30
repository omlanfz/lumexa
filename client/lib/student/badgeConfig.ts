// FILE PATH: client/lib/student/badgeConfig.ts
//
// The ONE place that says how every Lumexa achievement badge (and the rank
// chip in the navbar) looks and moves. The badge grid, the badge detail
// dialog, the navbar rank pill and the rank-journey ladder all read from here
// — nothing else defines an emoji, a colour or an animation for a badge.
//
// What a badge REQUIRES and how far the student is towards it comes from the
// backend (server/src/students/progress/progress.rules.ts); this file is only
// presentation: identity colour, a one-line flavour, and which animated effect
// (the `.bx-*` classes in globals.css) the badge plays.

export type BadgeEffect =
  | 'launch' // 🚀 First Launch      — lifts off with an exhaust trail
  | 'flicker' // 🔥 4-Week Streak     — flickering flame, rising embers
  | 'twinkle' // 🌟 8-Week Streak     — spinning star, sparkle points
  | 'orbit' // 💫 Galaxy Streak     — swirl with orbiting dots
  | 'scan' // 🔭 Explorer          — telescope sweeps, stars blink in
  | 'hover' // 🛸 Cosmonaut         — saucer hovers, tractor beam pulses
  | 'compass' // 🧭 Navigator         — needle swings and settles, ticks ring
  | 'medal' // 🎖️ Captain           — medal sways, gleam sweeps across
  | 'galaxy' // 🌌 Galaxy Commander  — slow spiral, nebula ring, starfield
  | 'comet' // 🌠 Comeback Cadet    — shooting star streaks through
  | 'halo'; // 🌟 Starchild (rank)  — breathing golden halo, floating motes

export interface BadgeVisual {
  id: string;
  /** Fallback name/emoji when the backend has not answered yet. */
  label: string;
  icon: string;
  /** "r, g, b" — the badge's identity colour (glows, rings, progress). */
  rgb: string;
  effect: BadgeEffect;
  /** One line of flavour shown under the name in the detail dialog. */
  tagline: string;
}

export const BADGE_VISUALS: Record<string, BadgeVisual> = {
  FIRST_MISSION: {
    id: 'FIRST_MISSION',
    label: 'First Launch',
    icon: '🚀',
    rgb: '244, 114, 182',
    effect: 'launch',
    tagline: 'Ignition — you are on your way.',
  },
  STREAK_4: {
    id: 'STREAK_4',
    label: '4-Week Streak',
    icon: '🔥',
    rgb: '249, 115, 22',
    effect: 'flicker',
    tagline: 'Four weeks in a row. You are on fire.',
  },
  STREAK_8: {
    id: 'STREAK_8',
    label: '8-Week Streak',
    icon: '🌟',
    rgb: '250, 204, 21',
    effect: 'twinkle',
    tagline: 'Eight weeks of shining, steadily.',
  },
  STREAK_12: {
    id: 'STREAK_12',
    label: 'Galaxy Streak',
    icon: '💫',
    rgb: '167, 139, 250',
    effect: 'orbit',
    tagline: 'A full season in orbit.',
  },
  RANK_EXPLORER: {
    id: 'RANK_EXPLORER',
    label: 'Explorer',
    icon: '🔭',
    rgb: '56, 189, 248',
    effect: 'scan',
    tagline: 'Scanning the sky for what comes next.',
  },
  RANK_COSMONAUT: {
    id: 'RANK_COSMONAUT',
    label: 'Cosmonaut',
    icon: '🛸',
    rgb: '45, 212, 191',
    effect: 'hover',
    tagline: 'Hovering above the clouds.',
  },
  RANK_NAVIGATOR: {
    id: 'RANK_NAVIGATOR',
    label: 'Navigator',
    icon: '🧭',
    rgb: '251, 146, 60',
    effect: 'compass',
    tagline: 'True north, every time.',
  },
  RANK_CAPTAIN: {
    id: 'RANK_CAPTAIN',
    label: 'Captain',
    icon: '🎖️',
    rgb: '245, 158, 11',
    effect: 'medal',
    tagline: 'Earned, polished and worn with pride.',
  },
  RANK_COMMANDER: {
    id: 'RANK_COMMANDER',
    label: 'Galaxy Commander',
    icon: '🌌',
    rgb: '139, 92, 246',
    effect: 'galaxy',
    tagline: 'The whole galaxy answers to you.',
  },
  COMEBACK_CADET: {
    id: 'COMEBACK_CADET',
    label: 'Comeback Cadet',
    icon: '🌠',
    rgb: '99, 102, 241',
    effect: 'comet',
    tagline: 'Streaking back into orbit.',
  },
  // Starchild is the starting rank, not an earnable badge — it only appears on
  // the navbar rank pill and the rank ladder.
  RANK_STARCHILD: {
    id: 'RANK_STARCHILD',
    label: 'Starchild',
    icon: '🌟',
    rgb: '250, 204, 21',
    effect: 'halo',
    tagline: 'Every galaxy starts with one bright spark.',
  },
};

/** SpaceRank enum value → the visual entry of that rank. */
export const RANK_VISUAL_ID: Record<string, string> = {
  STARCHILD: 'RANK_STARCHILD',
  EXPLORER: 'RANK_EXPLORER',
  COSMONAUT: 'RANK_COSMONAUT',
  NAVIGATOR: 'RANK_NAVIGATOR',
  CAPTAIN: 'RANK_CAPTAIN',
  GALAXY_COMMANDER: 'RANK_COMMANDER',
};

const FALLBACK: BadgeVisual = BADGE_VISUALS.RANK_STARCHILD;

export function badgeVisual(id: string): BadgeVisual {
  return BADGE_VISUALS[id] ?? FALLBACK;
}

export function rankVisual(rank: string): BadgeVisual {
  return badgeVisual(RANK_VISUAL_ID[rank] ?? 'RANK_STARCHILD');
}

/** Every effect, for tests and the CSS coverage check. */
export const ALL_EFFECTS: BadgeEffect[] = Array.from(
  new Set(Object.values(BADGE_VISUALS).map((v) => v.effect)),
);

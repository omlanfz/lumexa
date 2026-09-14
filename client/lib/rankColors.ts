// FILE PATH: client/lib/rankColors.ts
//
// Shared color mapping for the student "Space Rank" system. Each rank gets a
// color that matches the tone of its emoji badge, used for the rank chip's
// tint and its click-triggered glow/sparkle effect (see RankBadgeButton).

export interface RankColor {
  /** Solid hex — used for text/icons if ever needed. */
  hex: string;
  /** "r, g, b" triplet — used inside CSS rgb()/rgba() with a custom property. */
  rgb: string;
}

export const RANK_COLORS: Record<string, RankColor> = {
  STARCHILD: { hex: '#facc15', rgb: '250, 204, 21' }, // 🌟 gold
  EXPLORER: { hex: '#38bdf8', rgb: '56, 189, 248' }, // 🔭 sky blue
  COSMONAUT: { hex: '#2dd4bf', rgb: '45, 212, 191' }, // 🛸 teal
  NAVIGATOR: { hex: '#fb923c', rgb: '251, 146, 60' }, // 🧭 orange
  CAPTAIN: { hex: '#f59e0b', rgb: '245, 158, 11' }, // 🎖️ amber/gold
  GALAXY_COMMANDER: { hex: '#a78bfa', rgb: '167, 139, 250' }, // 🌌 violet
};

const DEFAULT_COLOR = RANK_COLORS.STARCHILD;

export function getRankColor(rank: string): RankColor {
  return RANK_COLORS[rank] ?? DEFAULT_COLOR;
}

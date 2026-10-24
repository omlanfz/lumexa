// FILE PATH: server/src/classroom/badges/badge-catalog.ts
//
// The Lumexa Classroom Badge System's badge definitions — the ONE place they
// live. A teacher picks from these in class; a stored award refers to a badge
// only by `id`; the browser gets the list from GET /classroom-badges/catalog
// and the celebration a student sees carries the name and emoji, so nothing
// else needs a copy.
//
// These are recognition, not a game: no points, levels, streaks or rankings.
// Ids are permanent (they are stored with every award) — rename a badge by
// changing `name`, never `id`. The order here is the order teachers see.

export interface ClassroomBadge {
  /** Permanent key stored with each award. */
  id: string;
  emoji: string;
  name: string;
  /** What the badge recognises — shown to the teacher as the badge's tooltip. */
  criteria: string;
}

export const BADGE_CATALOG: readonly ClassroomBadge[] = [
  {
    id: 'bright-spark',
    emoji: '⭐',
    name: 'Bright Spark',
    criteria: 'Sharing a great idea',
  },
  {
    id: 'problem-solver',
    emoji: '🧠',
    name: 'Problem Solver',
    criteria: 'Solving a challenging problem',
  },
  {
    id: 'creative-mind',
    emoji: '💡',
    name: 'Creative Mind',
    criteria: 'Creating an original solution',
  },
  {
    id: 'bug-buster',
    emoji: '🐛',
    name: 'Bug Buster',
    criteria: 'Finding and fixing a bug',
  },
  {
    id: 'code-explorer',
    emoji: '🚀',
    name: 'Code Explorer',
    criteria: 'Trying something new in coding',
  },
  {
    id: 'homework-hero',
    emoji: '🏆',
    name: 'Homework Hero',
    criteria: 'Completing homework on time',
  },
  {
    id: 'curious-mind',
    emoji: '🙋',
    name: 'Curious Mind',
    criteria: 'Asking thoughtful questions',
  },
  {
    id: 'never-give-up',
    emoji: '💪',
    name: 'Never Give Up',
    criteria: 'Persisting through a difficult task',
  },
  {
    id: 'team-star',
    emoji: '🤝',
    name: 'Team Star',
    criteria: 'Helping classmates',
  },
  {
    id: 'game-maker',
    emoji: '🎮',
    name: 'Game Maker',
    criteria: 'Completing a game project',
  },
  {
    id: 'web-weaver',
    emoji: '🌐',
    name: 'Web Weaver',
    criteria: 'Completing a website project',
  },
  {
    id: 'ai-pioneer',
    emoji: '🤖',
    name: 'AI Pioneer',
    criteria: 'Completing an AI activity or project',
  },
  {
    id: 'demo-star',
    emoji: '🎤',
    name: 'Demo Star',
    criteria: 'Presenting a project',
  },
  {
    id: 'milestone-master',
    emoji: '🎯',
    name: 'Milestone Master',
    criteria: 'Reaching an important learning milestone',
  },
  {
    id: 'knowledge-star',
    emoji: '📚',
    name: 'Knowledge Star',
    criteria: 'Showing strong understanding in an assessment',
  },
  {
    id: 'rising-star',
    emoji: '🌟',
    name: 'Rising Star',
    criteria: 'Making noticeable progress over time',
  },
];

export const BADGE_IDS: string[] = BADGE_CATALOG.map((b) => b.id);

export function findBadge(id: string): ClassroomBadge | undefined {
  return BADGE_CATALOG.find((b) => b.id === id);
}

/** How a badge shows up if it was later retired from the catalog — an old
 * award must still display, just plainly. */
export function describeBadge(id: string): ClassroomBadge {
  return findBadge(id) ?? { id, emoji: '🏅', name: id, criteria: '' };
}

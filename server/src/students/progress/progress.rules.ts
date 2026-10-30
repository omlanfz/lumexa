// FILE PATH: server/src/students/progress/progress.rules.ts
//
// Pure rules for a student's gamified progress: Space Rank, weekly streak,
// badges and milestones. No database, no clock — everything is derived from the
// list of classes the student actually attended, so the same history always
// produces the same answer (that is what makes both the live update after a
// class and the one-off backfill idempotent), and every number the student
// sees can be traced back to a real class record.
//
// What counts as "a class the student attended" is decided by the caller (see
// StudentProgressService.loadAttendedClasses) and handed in as AttendedClass.
//
// Weekly streak (unchanged product rule): one streak week for every calendar
// week (Sunday–Saturday, Asia/Dhaka) that holds at least one attended class;
// consecutive weeks accumulate and a whole week without one resets the streak.
// The current week is never counted against the student before it has ended,
// so the streak stays alive until the end of a week without a class.

import { SpaceRank } from '@prisma/client';
import { DHAKA_OFFSET_MINUTES } from '../../scheduling/dhaka-time.util';

// ─── Ranks ───────────────────────────────────────────────────────────────────

export interface RankTier {
  rank: SpaceRank;
  label: string;
  icon: string;
  /** Attended classes needed to hold this rank. */
  min: number;
}

export const RANK_TIERS: readonly RankTier[] = [
  { rank: 'STARCHILD', label: 'Starchild', icon: '🌟', min: 0 },
  { rank: 'EXPLORER', label: 'Explorer', icon: '🔭', min: 5 },
  { rank: 'COSMONAUT', label: 'Cosmonaut', icon: '🛸', min: 15 },
  { rank: 'NAVIGATOR', label: 'Navigator', icon: '🧭', min: 30 },
  { rank: 'CAPTAIN', label: 'Captain', icon: '🎖️', min: 60 },
  { rank: 'GALAXY_COMMANDER', label: 'Galaxy Commander', icon: '🌌', min: 100 },
];

export function rankIndex(rank: string): number {
  const i = RANK_TIERS.findIndex((t) => t.rank === rank);
  return i < 0 ? 0 : i;
}

export function rankForSessions(sessions: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (sessions >= RANK_TIERS[i].min) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

// ─── Weekly streak ───────────────────────────────────────────────────────────

/** Weeks in a streak that earn a badge (and gems — see EngagementService). */
export const STREAK_BADGE_WEEKS = [4, 8, 12] as const;

/** A break of at least this many days between two attended classes makes the
 * next class a "comeback" (Comeback Cadet badge). */
export const COMEBACK_GAP_DAYS = 14;

const DAY_MS = 86_400_000;

/** Index of the Sunday-started Asia/Dhaka calendar week containing `date`.
 * 1970-01-01 was a Thursday, hence the +4 offset. */
export function dhakaWeekIndex(date: Date): number {
  const localDays = Math.floor(
    (date.getTime() + DHAKA_OFFSET_MINUTES * 60_000) / DAY_MS,
  );
  return Math.floor((localDays + 4) / 7);
}

/** 'YYYY-MM-DD' of the Sunday that starts week `index` (a Dhaka calendar date). */
export function weekStartDateStr(index: number): string {
  const sundayLocalDays = index * 7 - 4;
  return new Date(sundayLocalDays * DAY_MS).toISOString().slice(0, 10);
}

// ─── Inputs / outputs ────────────────────────────────────────────────────────

export interface AttendedClass {
  /** When the class ended — the moment the progress was actually earned. */
  at: Date;
  minutes: number;
  /** Catalogue lesson (course + number), for distinct-lesson progress; null
   * for a legacy marketplace booking. */
  courseKey: string | null;
  courseTitle: string | null;
}

export interface CurriculumProgress {
  totalLessons: number;
  completedLessons: number;
}

export interface ProgressInput {
  classes: AttendedClass[];
  now: Date;
  /** The rank already stored on the student; a rank is never taken away. */
  storedRank: SpaceRank;
  homeworkSubmitted: number;
  curriculum: CurriculumProgress | null;
}

export interface BadgeState {
  id: string;
  earned: boolean;
  /** When the requirement was genuinely met (null if unknown / not earned). */
  earnedAt: Date | null;
  current: number;
  target: number;
  unit: 'classes' | 'weeks' | 'comeback';
  /** Extra line shown under the progress (e.g. best streak so far). */
  hint: string | null;
}

export interface MilestoneState {
  id: string;
  group: 'classes' | 'curriculum' | 'streak' | 'homework';
  icon: string;
  title: string;
  description: string;
  current: number;
  target: number;
  achieved: boolean;
}

export interface StreakWeek {
  weekStart: string;
  done: boolean;
  isCurrent: boolean;
}

export interface ProgressResult {
  sessions: number;
  totalMinutes: number;
  rank: RankTier;
  /** The rank the class count alone would give (≤ rank). */
  earnedByCountRank: RankTier;
  nextRank: RankTier | null;
  sessionsToNextRank: number | null;
  rankProgressPct: number;
  streak: {
    current: number;
    longest: number;
    thisWeekDone: boolean;
    weeks: StreakWeek[];
    next: { weeks: number; remaining: number } | null;
  };
  badges: BadgeState[];
  milestones: MilestoneState[];
  lastClassAt: Date | null;
}

// ─── Badge catalogue (requirements; presentation lives in the client) ────────

export interface BadgeDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  requirement: string;
}

export const BADGE_DEFS: readonly BadgeDef[] = [
  {
    id: 'FIRST_MISSION',
    label: 'First Launch',
    icon: '🚀',
    description: 'Your first class is in the books — liftoff!',
    requirement: 'Attend and complete your first class.',
  },
  {
    id: 'STREAK_4',
    label: '4-Week Streak',
    icon: '🔥',
    description: 'A month of showing up, week after week.',
    requirement: 'Complete at least one class in 4 weeks in a row.',
  },
  {
    id: 'STREAK_8',
    label: '8-Week Streak',
    icon: '🌟',
    description: 'Two months of steady learning orbit.',
    requirement: 'Complete at least one class in 8 weeks in a row.',
  },
  {
    id: 'STREAK_12',
    label: 'Galaxy Streak',
    icon: '💫',
    description: 'A whole season of consistency across the galaxy.',
    requirement: 'Complete at least one class in 12 weeks in a row.',
  },
  {
    id: 'RANK_EXPLORER',
    label: 'Explorer',
    icon: '🔭',
    description: 'You have started charting new territory.',
    requirement: 'Reach the Explorer rank by attending 5 classes.',
  },
  {
    id: 'RANK_COSMONAUT',
    label: 'Cosmonaut',
    icon: '🛸',
    description: 'You are cruising beyond the atmosphere.',
    requirement: 'Reach the Cosmonaut rank by attending 15 classes.',
  },
  {
    id: 'RANK_NAVIGATOR',
    label: 'Navigator',
    icon: '🧭',
    description: 'You can find your way across the stars.',
    requirement: 'Reach the Navigator rank by attending 30 classes.',
  },
  {
    id: 'RANK_CAPTAIN',
    label: 'Captain',
    icon: '🎖️',
    description: 'You are at the helm of your own learning ship.',
    requirement: 'Reach the Captain rank by attending 60 classes.',
  },
  {
    id: 'RANK_COMMANDER',
    label: 'Galaxy Commander',
    icon: '🌌',
    description: 'The highest rank in the fleet. Legendary.',
    requirement: 'Reach the Galaxy Commander rank by attending 100 classes.',
  },
  {
    id: 'COMEBACK_CADET',
    label: 'Comeback Cadet',
    icon: '🌠',
    description: 'Welcome back — every great mission has a re-entry.',
    requirement: `Return and complete a class after a break of ${COMEBACK_GAP_DAYS} days or more.`,
  },
];

const RANK_BADGE_TIER: Record<string, SpaceRank> = {
  RANK_EXPLORER: 'EXPLORER',
  RANK_COSMONAUT: 'COSMONAUT',
  RANK_NAVIGATOR: 'NAVIGATOR',
  RANK_CAPTAIN: 'CAPTAIN',
  RANK_COMMANDER: 'GALAXY_COMMANDER',
};

// ─── Computation ─────────────────────────────────────────────────────────────

function pct(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

export function computeProgress(input: ProgressInput): ProgressResult {
  const classes = [...input.classes].sort(
    (a, b) => a.at.getTime() - b.at.getTime(),
  );
  const sessions = classes.length;
  const totalMinutes = classes.reduce((sum, c) => sum + c.minutes, 0);
  const now = input.now;

  // Rank: highest earned, never taken away.
  const byCount = rankForSessions(sessions);
  const rank =
    rankIndex(input.storedRank) > rankIndex(byCount.rank)
      ? RANK_TIERS[rankIndex(input.storedRank)]
      : byCount;
  const rankIdx = rankIndex(rank.rank);
  const nextRank =
    rankIdx < RANK_TIERS.length - 1 ? RANK_TIERS[rankIdx + 1] : null;
  const sessionsToNextRank = nextRank
    ? Math.max(0, nextRank.min - sessions)
    : null;
  const rankProgressPct = nextRank
    ? pct(sessions - rank.min, nextRank.min - rank.min)
    : 100;

  // Weeks with an attended class, and the first class that fell in each.
  const firstClassOfWeek = new Map<number, Date>();
  for (const c of classes) {
    const w = dhakaWeekIndex(c.at);
    if (!firstClassOfWeek.has(w)) firstClassOfWeek.set(w, c.at);
  }
  const weekIdxs = [...firstClassOfWeek.keys()].sort((a, b) => a - b);

  // Longest run of consecutive weeks, and when each streak badge was reached.
  let longest = 0;
  let run = 0;
  let prev = Number.NaN;
  const streakBadgeAt = new Map<number, Date>();
  for (const w of weekIdxs) {
    run = w === prev + 1 ? run + 1 : 1;
    prev = w;
    longest = Math.max(longest, run);
    for (const n of STREAK_BADGE_WEEKS) {
      if (run >= n && !streakBadgeAt.has(n)) {
        streakBadgeAt.set(n, firstClassOfWeek.get(w)!);
      }
    }
  }

  // Current streak: counted back from this week if it already has a class,
  // otherwise from last week (this week is still open, so it cannot have
  // broken the streak yet).
  const curWeek = dhakaWeekIndex(now);
  const thisWeekDone = firstClassOfWeek.has(curWeek);
  let anchor = thisWeekDone ? curWeek : curWeek - 1;
  let current = 0;
  while (firstClassOfWeek.has(anchor)) {
    current++;
    anchor--;
  }

  const WEEKS_SHOWN = 12;
  const weeks: StreakWeek[] = [];
  for (let w = curWeek - (WEEKS_SHOWN - 1); w <= curWeek; w++) {
    weeks.push({
      weekStart: weekStartDateStr(w),
      done: firstClassOfWeek.has(w),
      isCurrent: w === curWeek,
    });
  }
  const nextStreakTarget = STREAK_BADGE_WEEKS.find((n) => n > current) ?? null;

  // Comeback: the first class completed after a break of COMEBACK_GAP_DAYS+.
  let comebackAt: Date | null = null;
  for (let i = 1; i < classes.length; i++) {
    const gap = classes[i].at.getTime() - classes[i - 1].at.getTime();
    if (gap >= COMEBACK_GAP_DAYS * DAY_MS) {
      comebackAt = classes[i].at;
      break;
    }
  }
  const lastClassAt = classes.length ? classes[classes.length - 1].at : null;
  const daysSinceLast = lastClassAt
    ? Math.floor((now.getTime() - lastClassAt.getTime()) / DAY_MS)
    : null;

  // Badges
  const badges: BadgeState[] = BADGE_DEFS.map((def) => {
    const base = { id: def.id, hint: null as string | null };
    if (def.id === 'FIRST_MISSION') {
      return {
        ...base,
        earned: sessions >= 1,
        earnedAt: classes[0]?.at ?? null,
        current: Math.min(sessions, 1),
        target: 1,
        unit: 'classes' as const,
      };
    }
    if (def.id.startsWith('STREAK_')) {
      const target = Number(def.id.split('_')[1]);
      const earned = longest >= target;
      return {
        ...base,
        earned,
        earnedAt: earned ? (streakBadgeAt.get(target) ?? null) : null,
        current: earned ? target : Math.min(current, target),
        target,
        unit: 'weeks' as const,
        hint:
          !earned && longest > 0
            ? `Your best streak so far: ${longest} week${longest === 1 ? '' : 's'}.`
            : null,
      };
    }
    if (def.id === 'COMEBACK_CADET') {
      const earned = comebackAt !== null;
      let hint: string | null = null;
      if (
        !earned &&
        daysSinceLast !== null &&
        daysSinceLast >= COMEBACK_GAP_DAYS
      ) {
        hint = `It has been ${daysSinceLast} days since your last class — your next class earns this badge!`;
      }
      return {
        ...base,
        earned,
        earnedAt: comebackAt,
        current: earned ? 1 : 0,
        target: 1,
        unit: 'comeback' as const,
        hint,
      };
    }
    // Rank badges
    const tierRank = RANK_BADGE_TIER[def.id];
    const tier = RANK_TIERS[rankIndex(tierRank)];
    const earned = rankIdx >= rankIndex(tierRank);
    return {
      ...base,
      earned,
      // The class that took the student to this rank, when the class count
      // alone explains it.
      earnedAt: earned ? (classes[tier.min - 1]?.at ?? null) : null,
      current: Math.min(sessions, tier.min),
      target: tier.min,
      unit: 'classes' as const,
    };
  });

  // Milestones
  const milestones: MilestoneState[] = [];
  const classTargets = [1, 5, 10, 25, 50, 100];
  for (const t of classTargets) {
    milestones.push({
      id: `classes-${t}`,
      group: 'classes',
      icon: t === 1 ? '🚀' : '📚',
      title: t === 1 ? 'First class attended' : `${t} classes attended`,
      description:
        t === 1 ? 'Attend your first class.' : `Attend ${t} classes in total.`,
      current: Math.min(sessions, t),
      target: t,
      achieved: sessions >= t,
    });
  }
  if (input.curriculum && input.curriculum.totalLessons > 0) {
    const { totalLessons, completedLessons } = input.curriculum;
    for (const p of [25, 50, 75, 100]) {
      const target = Math.max(1, Math.ceil((totalLessons * p) / 100));
      milestones.push({
        id: `curriculum-${p}`,
        group: 'curriculum',
        icon: p === 100 ? '🏁' : '🗺️',
        title: p === 100 ? 'Curriculum complete' : `${p}% of your curriculum`,
        description: `Complete ${target} of ${totalLessons} lessons.`,
        current: Math.min(completedLessons, target),
        target,
        achieved: completedLessons >= target,
      });
    }
  }
  for (const t of [2, 4, 8, 12]) {
    milestones.push({
      id: `streak-${t}`,
      group: 'streak',
      icon: '🔥',
      title: `${t}-week streak`,
      description: `Complete a class in ${t} weeks in a row.`,
      current: longest >= t ? t : Math.min(current, t),
      target: t,
      achieved: longest >= t,
    });
  }
  for (const t of [1, 5, 10, 25]) {
    milestones.push({
      id: `homework-${t}`,
      group: 'homework',
      icon: '📝',
      title: t === 1 ? 'First homework submitted' : `${t} homework submissions`,
      description:
        t === 1
          ? 'Hand in your first homework.'
          : `Hand in ${t} homework submissions.`,
      current: Math.min(input.homeworkSubmitted, t),
      target: t,
      achieved: input.homeworkSubmitted >= t,
    });
  }

  return {
    sessions,
    totalMinutes,
    rank,
    earnedByCountRank: byCount,
    nextRank,
    sessionsToNextRank,
    rankProgressPct,
    streak: {
      current,
      longest,
      thisWeekDone,
      weeks,
      next: nextStreakTarget
        ? { weeks: nextStreakTarget, remaining: nextStreakTarget - current }
        : null,
    },
    badges,
    milestones,
    lastClassAt,
  };
}

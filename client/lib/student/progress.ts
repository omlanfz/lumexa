// FILE PATH: client/lib/student/progress.ts
//
// Types and small helpers for the student's backend-derived progress (rank,
// streak, badges, milestones, class credits). Everything here mirrors what
// GET /students/me/progress and /students/me/nav-summary return — the client
// never works any of it out itself.

export interface RankLadderEntry {
  id: string;
  label: string;
  icon: string;
  min: number;
  unlocked: boolean;
  current: boolean;
}

export interface RankInfo {
  id: string;
  label: string;
  icon: string;
  min: number;
  sessions: number;
  progressPct: number;
  sessionsToNext: number | null;
  next: {
    id: string;
    label: string;
    icon: string;
    min: number;
    sessionsNeeded: number | null;
  } | null;
  requirement: string;
  ladder: RankLadderEntry[];
}

export interface CreditsInfo {
  remaining: number;
  purchased: number;
  used: number;
  adjustments: number;
  low: boolean;
  exhausted: boolean;
}

export interface NavSummary {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  spaceRank: string;
  rankIcon: string;
  totalSessions: number;
  streakWeeks: number;
  rank: RankInfo;
  credits: CreditsInfo;
}

export interface BadgeProgress {
  current: number;
  target: number;
  unit: 'classes' | 'weeks' | 'comeback';
  pct: number;
}

export interface BadgeInfo {
  id: string;
  label: string;
  icon: string;
  description: string;
  requirement: string;
  earned: boolean;
  earnedAt: string | null;
  progress: BadgeProgress;
  hint: string | null;
}

export interface StreakWeek {
  weekStart: string;
  done: boolean;
  isCurrent: boolean;
}

export interface Milestone {
  id: string;
  group: 'classes' | 'curriculum' | 'streak' | 'homework';
  icon: string;
  title: string;
  description: string;
  current: number;
  target: number;
  achieved: boolean;
}

export interface ProgressData {
  spaceRank: string;
  rankIcon: string;
  totalSessions: number;
  totalHours: number;
  streakWeeks: number;
  sessionsToNextRank: number | null;
  subjects: string[];
  subjectBreakdown: { subject: string; count: number }[];
  badges: BadgeInfo[];
  nextBadge: BadgeInfo | null;
  totalLessonsCompleted: number;
  lessonsCompletedThisMonth: number;
  memberSince: string;
  rank: RankInfo;
  streak: {
    current: number;
    longest: number;
    thisWeekDone: boolean;
    weeks: StreakWeek[];
    next: { weeks: number; remaining: number } | null;
  };
  milestones: {
    completed: Milestone[];
    next: Milestone | null;
    nextPerGroup: Milestone[];
    completedCount: number;
    totalCount: number;
    classesThisMonth: number;
  };
  overview: {
    classesAttended: number;
    lessonsCompleted: number;
    totalLessons: number | null;
    curriculumProgressPct: number | null;
    courseTitle: string | null;
    courseEmoji: string | null;
    earnedBadges: number;
    totalBadges: number;
    upcomingClasses: number;
    homeworkSubmitted: number;
    lastClassAt: string | null;
  };
}

/** "8", "7.5" — credits are whole classes; a part-class balance keeps one
 * decimal. */
export function formatCredits(n: number): string {
  const v = Math.round(n * 10) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function creditsLabel(n: number): string {
  return formatCredits(n) === '1' ? 'Credit' : 'Credits';
}

export const CREDITS_TOOLTIP =
  'Each credit covers one scheduled class session. Your balance decreases by 1 after each attended class. At 0 credits, classes will pause until your next payment is confirmed. Please pay on time to avoid interruptions.';

/** The rank pill's tooltip — the student's real rank and, where there is one,
 * the next rank. */
export function rankTooltip(rank: RankInfo): string {
  if (!rank.next) {
    return `Your current rank is ${rank.label}! You have reached the highest rank in the fleet — keep learning and earning badges.`;
  }
  const left = rank.sessionsToNext ?? 0;
  return `Your current rank is ${rank.label}! Keep learning, earning badges, and making progress to reach your next rank: ${rank.next.label} (${left} more class${left === 1 ? '' : 'es'}).`;
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function progressUnitLabel(unit: BadgeProgress['unit'], n: number): string {
  if (unit === 'weeks') return n === 1 ? 'week' : 'weeks';
  if (unit === 'classes') return n === 1 ? 'class' : 'classes';
  return n === 1 ? 'comeback' : 'comebacks';
}

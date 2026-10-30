import {
  AttendedClass,
  ProgressInput,
  computeProgress,
  dhakaWeekIndex,
  weekStartDateStr,
} from './progress.rules';

// 2026-11-01 is a Sunday (Asia/Dhaka and UTC agree around midday).
const SUN = new Date('2026-11-01T06:00:00Z');
const day = (n: number, hour = 6) =>
  new Date(SUN.getTime() + n * 86_400_000 + (hour - 6) * 3_600_000);

const cls = (at: Date): AttendedClass => ({
  at,
  minutes: 45,
  courseKey: null,
  courseTitle: null,
});

const input = (
  classes: AttendedClass[],
  now: Date,
  extra: Partial<ProgressInput> = {},
): ProgressInput => ({
  classes,
  now,
  storedRank: 'STARCHILD',
  homeworkSubmitted: 0,
  curriculum: null,
  ...extra,
});

const badge = (r: ReturnType<typeof computeProgress>, id: string) =>
  r.badges.find((b) => b.id === id)!;

describe('weeks', () => {
  it('starts weeks on Sunday in Asia/Dhaka', () => {
    expect(weekStartDateStr(dhakaWeekIndex(SUN))).toBe('2026-11-01');
    expect(weekStartDateStr(dhakaWeekIndex(day(6)))).toBe('2026-11-01');
    expect(weekStartDateStr(dhakaWeekIndex(day(7)))).toBe('2026-11-08');
    // Saturday 23:00 UTC is already Sunday 05:00 in Dhaka.
    const satNightUtc = new Date('2026-11-07T23:00:00Z');
    expect(weekStartDateStr(dhakaWeekIndex(satNightUtc))).toBe('2026-11-08');
  });
});

describe('computeProgress', () => {
  it('is all zeros (and no badges) for a student with no attended class', () => {
    const r = computeProgress(input([], day(3)));
    expect(r.sessions).toBe(0);
    expect(r.rank.rank).toBe('STARCHILD');
    expect(r.nextRank?.rank).toBe('EXPLORER');
    expect(r.sessionsToNextRank).toBe(5);
    expect(r.streak.current).toBe(0);
    expect(r.badges.every((b) => !b.earned)).toBe(true);
  });

  it('awards First Launch with the first class date', () => {
    const first = day(1);
    const r = computeProgress(input([cls(first)], day(2)));
    expect(badge(r, 'FIRST_MISSION').earned).toBe(true);
    expect(badge(r, 'FIRST_MISSION').earnedAt).toEqual(first);
    expect(r.rank.rank).toBe('STARCHILD');
    expect(r.rankProgressPct).toBe(20);
  });

  it('promotes by attended-class count and records when each rank was reached', () => {
    const classes = Array.from({ length: 16 }, (_, i) => cls(day(i)));
    const r = computeProgress(input(classes, day(20)));
    expect(r.rank.rank).toBe('COSMONAUT');
    expect(badge(r, 'RANK_EXPLORER').earnedAt).toEqual(classes[4].at);
    expect(badge(r, 'RANK_COSMONAUT').earnedAt).toEqual(classes[14].at);
    expect(badge(r, 'RANK_NAVIGATOR').earned).toBe(false);
    expect(badge(r, 'RANK_NAVIGATOR').current).toBe(16);
    expect(r.sessionsToNextRank).toBe(14);
  });

  it('never takes a stored rank away', () => {
    const r = computeProgress(
      input([cls(day(0))], day(1), { storedRank: 'NAVIGATOR' }),
    );
    expect(r.rank.rank).toBe('NAVIGATOR');
    expect(badge(r, 'RANK_NAVIGATOR').earned).toBe(true);
    expect(badge(r, 'RANK_CAPTAIN').earned).toBe(false);
  });

  it('counts consecutive weeks, and keeps the streak alive through an open week', () => {
    // Weeks of Nov 1, 8, 15, 22 each have a class; "now" is Wed of Nov 29's week
    // (no class yet that week) → streak of 4 still alive.
    const classes = [0, 7, 14, 21].map((d) => cls(day(d + 2)));
    const r = computeProgress(input(classes, day(28 + 3)));
    expect(r.streak.current).toBe(4);
    expect(r.streak.thisWeekDone).toBe(false);
    expect(r.streak.longest).toBe(4);
    expect(badge(r, 'STREAK_4').earned).toBe(true);
    expect(badge(r, 'STREAK_4').earnedAt).toEqual(classes[3].at);
    expect(badge(r, 'STREAK_8').earned).toBe(false);
    expect(r.streak.next).toEqual({ weeks: 8, remaining: 4 });
  });

  it('resets the streak after a fully missed week but keeps the badge', () => {
    const classes = [0, 7, 14, 21].map((d) => cls(day(d + 2)));
    // two weeks later: week of Nov 29 and Dec 6 had no class → streak 0.
    const r = computeProgress(input(classes, day(42 + 3)));
    expect(r.streak.current).toBe(0);
    expect(r.streak.longest).toBe(4);
    expect(badge(r, 'STREAK_4').earned).toBe(true);
  });

  it('awards Comeback Cadet only after a 14+ day break', () => {
    const noBreak = computeProgress(
      input([cls(day(0)), cls(day(13))], day(14)),
    );
    expect(badge(noBreak, 'COMEBACK_CADET').earned).toBe(false);

    const back = cls(day(30));
    const r = computeProgress(input([cls(day(0)), back], day(31)));
    expect(badge(r, 'COMEBACK_CADET').earned).toBe(true);
    expect(badge(r, 'COMEBACK_CADET').earnedAt).toEqual(back.at);
  });

  it('hints a pending comeback while the student is on a long break', () => {
    const r = computeProgress(input([cls(day(0))], day(20)));
    const b = badge(r, 'COMEBACK_CADET');
    expect(b.earned).toBe(false);
    expect(b.hint).toMatch(/20 days/);
  });

  it('is deterministic (idempotent) for the same history', () => {
    const classes = Array.from({ length: 9 }, (_, i) => cls(day(i * 3)));
    const a = computeProgress(input(classes, day(40)));
    const b = computeProgress(input([...classes].reverse(), day(40)));
    expect(b).toEqual(a);
  });

  it('builds milestones from real activity', () => {
    const classes = Array.from({ length: 6 }, (_, i) => cls(day(i)));
    const r = computeProgress(
      input(classes, day(7), {
        homeworkSubmitted: 2,
        curriculum: { totalLessons: 20, completedLessons: 6 },
      }),
    );
    const m = (id: string) => r.milestones.find((x) => x.id === id)!;
    expect(m('classes-1').achieved).toBe(true);
    expect(m('classes-5').achieved).toBe(true);
    expect(m('classes-10')).toMatchObject({ achieved: false, current: 6 });
    expect(m('curriculum-25')).toMatchObject({ achieved: true, target: 5 });
    expect(m('curriculum-50')).toMatchObject({ achieved: false, target: 10 });
    expect(m('homework-1').achieved).toBe(true);
    expect(m('homework-5')).toMatchObject({ achieved: false, current: 2 });
  });

  it('omits curriculum milestones when no curriculum is assigned', () => {
    const r = computeProgress(input([], day(0)));
    expect(r.milestones.some((m) => m.group === 'curriculum')).toBe(false);
  });
});

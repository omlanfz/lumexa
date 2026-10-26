import {
  GUEST_STATE_MESSAGE,
  isWellFormedGuestToken,
  joinWindow,
  reminderDueAt,
  trialAccessState,
} from './trial-access.util';

const MIN = 60_000;
const start = new Date('2026-11-10T10:00:00Z');
const end = new Date('2026-11-10T10:30:00Z');
const lead = (over: object = {}) => ({
  appointmentStatus: 'CONFIRMED',
  startAt: start,
  endAt: end,
  teacherId: 'teacher-1',
  ...over,
});
const at = (offsetMin: number, from = start) =>
  new Date(from.getTime() + offsetMin * MIN);

describe('trialAccessState — the guest/teacher joining window', () => {
  it('opens exactly 10 minutes before the start and closes 30 minutes after the end', () => {
    const { opensAt, closesAt } = joinWindow(start, end);
    expect(opensAt).toEqual(at(-10));
    expect(closesAt).toEqual(at(60)); // end (+30) + 30
  });

  it.each([
    [-61, 'NOT_YET'],
    [-11, 'NOT_YET'],
    [-10, 'OPEN'],
    [-1, 'OPEN'],
    [0, 'OPEN'],
    [29, 'OPEN'],
    [45, 'OPEN'], // a late-running class
    [60, 'OPEN'], // inclusive at the closing instant
    [61, 'ENDED'],
    [600, 'ENDED'],
  ])('%i minutes from the start → %s', (offset, expected) => {
    expect(trialAccessState(lead(), at(offset))).toBe(expected);
  });

  it('a cancelled trial grants nothing, at any time', () => {
    for (const offset of [-600, -5, 0, 20, 55]) {
      expect(
        trialAccessState(lead({ appointmentStatus: 'CANCELLED' }), at(offset)),
      ).toBe('CANCELLED');
    }
  });

  it.each(['COMPLETED', 'MISSED', null])(
    'status %s grants nothing (ENDED)',
    (status) => {
      expect(trialAccessState(lead({ appointmentStatus: status }), at(0))).toBe(
        'ENDED',
      );
    },
  );

  it('a trial with no teacher yet has nothing to join, even inside the window', () => {
    expect(trialAccessState(lead({ teacherId: null }), at(0))).toBe(
      'AWAITING_TEACHER',
    );
  });

  it('a lead without an appointment time grants nothing', () => {
    expect(trialAccessState(lead({ startAt: null, endAt: null }), at(0))).toBe(
      'ENDED',
    );
  });

  it('every refusal has a parent-friendly message', () => {
    for (const state of [
      'NOT_YET',
      'ENDED',
      'CANCELLED',
      'AWAITING_TEACHER',
    ] as const) {
      expect(GUEST_STATE_MESSAGE[state].length).toBeGreaterThan(30);
    }
  });
});

describe('reminderDueAt — one hour before, never outdated', () => {
  it('is exactly start − 60 minutes when there is more than an hour left', () => {
    expect(reminderDueAt(start, at(-24 * 60))).toEqual(at(-60));
    expect(reminderDueAt(start, at(-61))).toEqual(at(-60));
  });

  it('is null when the class is an hour away or less (the link sent now IS the reminder)', () => {
    expect(reminderDueAt(start, at(-60))).toBeNull();
    expect(reminderDueAt(start, at(-59))).toBeNull();
    expect(reminderDueAt(start, at(-1))).toBeNull();
    expect(reminderDueAt(start, at(5))).toBeNull();
  });
});

describe('isWellFormedGuestToken', () => {
  it('accepts generated tokens (43 base64url chars) and migration-minted ones (64 hex)', () => {
    expect(
      isWellFormedGuestToken('k3Jx9QmLw0pZ7vNc2RtYb5HdFgAe8UiOsXn1MqWjC4E'),
    ).toBe(true);
    expect(isWellFormedGuestToken('a'.repeat(64))).toBe(true);
  });

  it.each([
    undefined,
    null,
    42,
    '',
    'short',
    'a'.repeat(31),
    'a'.repeat(129),
    'k3Jx9QmLw0pZ7vNc2RtYb5HdFgAe8UiOsXn1MqWj C4E',
    "k3Jx9QmLw0pZ7vNc2RtYb5HdFgAe8UiOsXn1Mq'--;",
    '../../etc/passwd'.padEnd(40, 'a'),
  ])('rejects %p before it can reach the database', (bad) => {
    expect(isWellFormedGuestToken(bad)).toBe(false);
  });
});

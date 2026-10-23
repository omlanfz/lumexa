import {
  type AvailabilityConfig,
  candidateStartMinutes,
  conflictsWithBooked,
  dayStatus,
  formatMinutes,
  generateSlotsForDate,
  isCoveredByAvailability,
  parseTimeOfDay,
  rejectionForSlot,
} from './trial-slots.util';
import { dhakaToUtc } from '../scheduling/dhaka-time.util';

// 2026-11-04 is a Wednesday (Dhaka calendar).
const WED = '2026-11-04';
const NOW = new Date('2026-11-01T00:00:00Z'); // well before WED
const BASE = { now: NOW, minNoticeMinutes: 0, horizonDays: 365 };

const cfg = (
  partial: Partial<AvailabilityConfig> = {},
): AvailabilityConfig => ({
  rules: [],
  windows: [],
  blocks: [],
  ...partial,
});
const wednesdayRule = (startMinute: number, endMinute: number) => ({
  weekday: 3,
  startMinute,
  endMinute,
});
const at = (date: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return dhakaToUtc(date, h, m);
};
const hhmm = (d: Date) => {
  // Dhaka = UTC+6
  const t = new Date(d.getTime() + 6 * 3600_000);
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
};
const slotTimes = (c: AvailabilityConfig, booked: Date[] = [], extra = {}) =>
  generateSlotsForDate({
    cfg: c,
    date: WED,
    bookedStarts: booked,
    ...BASE,
    ...extra,
  }).map(hhmm);

describe('slot generation', () => {
  it('offers half-hour starts and the last start leaves room for the full 30 minutes', () => {
    // 2:00 PM–8:00 PM → last start is 7:30 PM, never 8:00 PM
    const times = slotTimes(cfg({ rules: [wednesdayRule(14 * 60, 20 * 60)] }));
    expect(times[0]).toBe('14:00');
    expect(times[times.length - 1]).toBe('19:30');
    expect(times).not.toContain('20:00');
    expect(times).toHaveLength(12);
  });

  it('supports multiple windows on the same weekday', () => {
    const times = slotTimes(
      cfg({
        rules: [
          wednesdayRule(15 * 60, 19 * 60),
          wednesdayRule(21 * 60, 23 * 60),
        ],
      }),
    );
    expect(times).toEqual([
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
      '18:00',
      '18:30',
      '21:00',
      '21:30',
      '22:00',
      '22:30',
    ]);
  });

  it('never produces duplicate slots when windows overlap', () => {
    const times = slotTimes(
      cfg({
        rules: [
          wednesdayRule(14 * 60, 17 * 60),
          wednesdayRule(16 * 60, 18 * 60),
        ],
        windows: [{ date: WED, startMinute: 15 * 60, endMinute: 16 * 60 + 30 }],
      }),
    );
    expect(new Set(times).size).toBe(times.length);
    expect(times).toEqual([
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
    ]);
  });

  it('allows a window ending at midnight (24:00) and a 30-minute window', () => {
    expect(
      candidateStartMinutes(
        cfg({ rules: [wednesdayRule(23 * 60, 1440)] }),
        WED,
      ),
    ).toEqual([1380, 1410]);
    expect(
      candidateStartMinutes(cfg({ rules: [wednesdayRule(600, 630)] }), WED),
    ).toEqual([600]);
  });

  it('ignores other weekdays and respects effective dates', () => {
    const thursday = { weekday: 4, startMinute: 600, endMinute: 660 };
    expect(slotTimes(cfg({ rules: [thursday] }))).toEqual([]);

    const dated = (from?: string, until?: string) =>
      cfg({
        rules: [
          {
            ...wednesdayRule(600, 660),
            effectiveFrom: from,
            effectiveUntil: until,
          },
        ],
      });
    expect(slotTimes(dated('2026-11-04', '2026-11-04'))).toHaveLength(2); // inclusive both ends
    expect(slotTimes(dated('2026-11-05'))).toEqual([]);
    expect(slotTimes(dated(undefined, '2026-11-03'))).toEqual([]);
  });

  it('includes one-off windows on their date only', () => {
    const c = cfg({
      windows: [{ date: WED, startMinute: 600, endMinute: 660 }],
    });
    expect(slotTimes(c)).toEqual(['10:00', '10:30']);
    expect(
      generateSlotsForDate({
        cfg: c,
        date: '2026-11-11',
        bookedStarts: [],
        ...BASE,
      }),
    ).toEqual([]);
  });

  it('removes slots overlapping a blocked period (whole day or part of a day)', () => {
    const rules = [wednesdayRule(10 * 60, 14 * 60)];
    expect(
      slotTimes(cfg({ rules, blocks: [{ startDate: WED, endDate: WED }] })),
    ).toEqual([]);
    // blocking 11:00–12:00 kills the 11:00 and 11:30 sessions, and nothing else
    expect(
      slotTimes(
        cfg({
          rules,
          blocks: [
            {
              startDate: '2026-11-01',
              endDate: '2026-11-10',
              startMinute: 660,
              endMinute: 720,
            },
          ],
        }),
      ),
    ).toEqual(['10:00', '10:30', '12:00', '12:30', '13:00', '13:30']);
    // a session that merely touches the block edge is fine: 10:30–11:00 vs block 11:00–12:00
    expect(
      slotTimes(
        cfg({
          rules,
          blocks: [
            { startDate: WED, endDate: WED, startMinute: 660, endMinute: 720 },
          ],
        }),
      ),
    ).toContain('10:30');
  });
});

describe('30-minute duration + mandatory 30-minute gap', () => {
  const rules = [wednesdayRule(14 * 60, 19 * 60)];

  it('a trial booked 4:00–4:30 PM allows 3:00 and 5:00 but not 3:30 or 4:30 (or 4:00 itself)', () => {
    const booked = [at(WED, '16:00')];
    const times = slotTimes(cfg({ rules }), booked);
    expect(times).toContain('15:00');
    expect(times).toContain('17:00');
    expect(times).not.toContain('15:30');
    expect(times).not.toContain('16:00');
    expect(times).not.toContain('16:30');
    // everything else in the window stays available
    expect(times).toEqual([
      '14:00',
      '14:30',
      '15:00',
      '17:00',
      '17:30',
      '18:00',
      '18:30',
    ]);
  });

  it('starts exactly 60 minutes apart are allowed, 30 minutes apart are not', () => {
    const t = at(WED, '16:00');
    expect(conflictsWithBooked(at(WED, '17:00'), [t])).toBe(false);
    expect(conflictsWithBooked(at(WED, '15:00'), [t])).toBe(false);
    expect(conflictsWithBooked(at(WED, '16:30'), [t])).toBe(true);
    expect(conflictsWithBooked(at(WED, '15:30'), [t])).toBe(true);
    expect(conflictsWithBooked(at(WED, '16:00'), [t])).toBe(true);
    expect(conflictsWithBooked(new Date(t.getTime() + 59 * 60_000), [t])).toBe(
      true,
    );
    expect(conflictsWithBooked(new Date(t.getTime() + 60 * 60_000), [t])).toBe(
      false,
    );
  });

  it('a chain of bookings keeps every start >= 60 minutes apart', () => {
    const booked = [at(WED, '14:00'), at(WED, '16:00')];
    expect(slotTimes(cfg({ rules }), booked)).toEqual([
      '15:00',
      '17:00',
      '17:30',
      '18:00',
      '18:30',
    ]);
  });
});

describe('clock rules', () => {
  const rules = [wednesdayRule(10 * 60, 14 * 60)];

  it('never offers past slots or slots inside the minimum notice', () => {
    const now = at(WED, '11:10'); // 11:10 AM Dhaka
    const noNotice = slotTimes(cfg({ rules }), [], {
      now,
      minNoticeMinutes: 0,
    });
    expect(noNotice).toEqual(['11:30', '12:00', '12:30', '13:00', '13:30']);
    const withNotice = slotTimes(cfg({ rules }), [], {
      now,
      minNoticeMinutes: 120,
    });
    expect(withNotice).toEqual(['13:30']);
  });

  it('stops offering slots beyond the booking horizon', () => {
    expect(slotTimes(cfg({ rules }), [], { now: NOW, horizonDays: 1 })).toEqual(
      [],
    );
    expect(
      slotTimes(cfg({ rules }), [], { now: NOW, horizonDays: 5 }),
    ).toHaveLength(8);
  });
});

describe('day status for the calendar', () => {
  const rules = [wednesdayRule(10 * 60, 12 * 60)]; // 10:00, 10:30, 11:00, 11:30

  it('available / full / unavailable', () => {
    const q = { cfg: cfg({ rules }), date: WED, ...BASE };
    expect(dayStatus({ ...q, bookedStarts: [] }).status).toBe('available');
    // 10:00 + 11:00 booked → every other half hour is within 30 min of one of them
    const full = dayStatus({
      ...q,
      bookedStarts: [at(WED, '10:30'), at(WED, '11:30')],
    });
    expect(full.status).toBe('full');
    expect(full.slots).toEqual([]);
    expect(
      dayStatus({ ...q, date: '2026-11-05', bookedStarts: [] }).status,
    ).toBe('unavailable');
    // a blocked day is "unavailable", not "full"
    expect(
      dayStatus({
        ...q,
        cfg: cfg({ rules, blocks: [{ startDate: WED, endDate: WED }] }),
        bookedStarts: [],
      }).status,
    ).toBe('unavailable');
  });

  it('a day whose slots are all in the past is unavailable', () => {
    const status = dayStatus({
      cfg: cfg({ rules }),
      date: WED,
      bookedStarts: [],
      now: at(WED, '13:00'),
      minNoticeMinutes: 0,
      horizonDays: 30,
    });
    expect(status.status).toBe('unavailable');
  });
});

describe('validating a submitted start (server-side, independent of the UI)', () => {
  const c = cfg({ rules: [wednesdayRule(14 * 60, 20 * 60)] });
  const base = {
    cfg: c,
    bookedStarts: [] as Date[],
    now: NOW,
    minNoticeMinutes: 60,
    horizonDays: 60,
  };

  it('accepts a valid slot, including the last one in a window', () => {
    expect(rejectionForSlot({ ...base, start: at(WED, '14:00') })).toBeNull();
    expect(rejectionForSlot({ ...base, start: at(WED, '19:30') })).toBeNull();
  });

  it('rejects: off-grid, past, too soon, too far, outside availability, window overrun, conflicts', () => {
    expect(rejectionForSlot({ ...base, start: at(WED, '14:15') })).toBe(
      'NOT_ON_SLOT_GRID',
    );
    expect(
      rejectionForSlot({
        ...base,
        start: new Date(at(WED, '14:00').getTime() + 1000),
      }),
    ).toBe('NOT_ON_SLOT_GRID');
    expect(rejectionForSlot({ ...base, start: new Date('invalid') })).toBe(
      'NOT_ON_SLOT_GRID',
    );
    expect(
      rejectionForSlot({
        ...base,
        now: at(WED, '15:00'),
        start: at(WED, '14:00'),
      }),
    ).toBe('IN_THE_PAST');
    expect(
      rejectionForSlot({
        ...base,
        now: at(WED, '13:30'),
        start: at(WED, '14:00'),
      }),
    ).toBe('TOO_SOON');
    expect(
      rejectionForSlot({ ...base, horizonDays: 1, start: at(WED, '14:00') }),
    ).toBe('TOO_FAR_AHEAD');
    expect(rejectionForSlot({ ...base, start: at(WED, '20:00') })).toBe(
      'OUTSIDE_AVAILABILITY',
    ); // would end at 20:30
    expect(rejectionForSlot({ ...base, start: at(WED, '13:30') })).toBe(
      'OUTSIDE_AVAILABILITY',
    );
    expect(
      rejectionForSlot({ ...base, start: at('2026-11-05', '14:00') }),
    ).toBe('OUTSIDE_AVAILABILITY');
    expect(
      rejectionForSlot({
        ...base,
        bookedStarts: [at(WED, '15:00')],
        start: at(WED, '15:30'),
      }),
    ).toBe('CONFLICTS_WITH_BOOKING');
    expect(
      rejectionForSlot({
        ...base,
        bookedStarts: [at(WED, '15:00')],
        start: at(WED, '16:00'),
      }),
    ).toBeNull();
  });

  it('isCoveredByAvailability ignores bookings and the clock', () => {
    expect(isCoveredByAvailability(c, at(WED, '19:30'))).toBe(true);
    expect(isCoveredByAvailability(c, at(WED, '20:00'))).toBe(false);
  });
});

describe('timezone handling (Asia/Dhaka, UTC+6)', () => {
  it('converts Dhaka wall-clock time to the right UTC instant', () => {
    expect(at(WED, '15:00').toISOString()).toBe('2026-11-04T09:00:00.000Z');
    expect(at(WED, '00:00').toISOString()).toBe('2026-11-03T18:00:00.000Z');
    expect(at(WED, '23:30').toISOString()).toBe('2026-11-04T17:30:00.000Z');
  });

  it('slots for a late-evening window land on the right Dhaka day even though UTC is the previous day', () => {
    const slots = generateSlotsForDate({
      cfg: cfg({ rules: [wednesdayRule(0, 60)] }),
      date: WED,
      bookedStarts: [],
      ...BASE,
    });
    expect(slots.map((s) => s.toISOString())).toEqual([
      '2026-11-03T18:00:00.000Z',
      '2026-11-03T18:30:00.000Z',
    ]);
  });
});

describe('time-of-day parsing', () => {
  it('parses and formats', () => {
    expect(parseTimeOfDay('15:30')).toBe(930);
    expect(parseTimeOfDay('9:00')).toBe(540);
    expect(parseTimeOfDay('24:00')).toBe(1440);
    expect(parseTimeOfDay('24:30')).toBeNull();
    expect(parseTimeOfDay('25:00')).toBeNull();
    expect(parseTimeOfDay('12:60')).toBeNull();
    expect(parseTimeOfDay('noon')).toBeNull();
    expect(formatMinutes(930)).toBe('15:30');
    expect(formatMinutes(1440)).toBe('24:00');
    expect(formatMinutes(0)).toBe('00:00');
  });
});

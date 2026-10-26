import {
  MAX_OCCURRENCE_SCAN_DAYS,
  formatSlotTime,
  generateOccurrences,
} from './occurrences.util';

// 2026-11-02 is a Monday (weekday 1) in Asia/Dhaka as anywhere.

describe('generateOccurrences', () => {
  it('lists the first N meetings of a weekly pattern, starting on the first date', () => {
    const out = generateOccurrences(
      '2026-11-02',
      [{ weekday: 1, time: '17:00' }],
      3,
    );
    expect(out).toEqual([
      { dateStr: '2026-11-02', hour: 17, minute: 0 },
      { dateStr: '2026-11-09', hour: 17, minute: 0 },
      { dateStr: '2026-11-16', hour: 17, minute: 0 },
    ]);
  });

  it('starts on the first matching weekday on or after the date', () => {
    const out = generateOccurrences(
      '2026-11-03',
      [{ weekday: 1, time: '09:30' }],
      1,
    );
    expect(out[0]).toEqual({ dateStr: '2026-11-09', hour: 9, minute: 30 });
  });

  it('interleaves several weekdays in date order, and several times on one day in time order', () => {
    const out = generateOccurrences(
      '2026-11-02',
      [
        { weekday: 3, time: '10:00' },
        { weekday: 1, time: '19:00' },
        { weekday: 1, time: '17:00' },
      ],
      5,
    );
    expect(
      out.map((o) => `${o.dateStr} ${formatSlotTime(o.hour, o.minute)}`),
    ).toEqual([
      '2026-11-02 17:00',
      '2026-11-02 19:00',
      '2026-11-04 10:00',
      '2026-11-09 17:00',
      '2026-11-09 19:00',
    ]);
  });

  it('stops at exactly the count asked for, even mid-day', () => {
    const out = generateOccurrences(
      '2026-11-02',
      [
        { weekday: 1, time: '17:00' },
        { weekday: 1, time: '19:00' },
      ],
      3,
    );
    expect(out).toHaveLength(3);
    expect(out[2].dateStr).toBe('2026-11-09');
  });

  it('gives nothing for no slots or a count of zero, and never loops forever', () => {
    expect(generateOccurrences('2026-11-02', [], 5)).toEqual([]);
    expect(
      generateOccurrences('2026-11-02', [{ weekday: 1, time: '17:00' }], 0),
    ).toEqual([]);
    expect(MAX_OCCURRENCE_SCAN_DAYS).toBeGreaterThan(365);
  });
});

describe('formatSlotTime', () => {
  it('pads hours and minutes', () => {
    expect(formatSlotTime(9, 5)).toBe('09:05');
    expect(formatSlotTime(17, 0)).toBe('17:00');
    expect(formatSlotTime(0, 0)).toBe('00:00');
  });
});

import {
  describeAppointment,
  formatTrialDate,
  formatTrialTime,
  formatTrialTimeRange,
  isValidTimeZone,
  trialEnd,
} from './trial-format.util';

describe('trial date/time display', () => {
  const start = new Date('2026-11-04T10:00:00Z'); // 4:00 PM in Dhaka

  it('formats in Bangladesh time regardless of the server timezone', () => {
    expect(formatTrialDate(start)).toBe('Wednesday, 4 November 2026');
    expect(formatTrialTime(start)).toBe('4:00 PM');
    expect(formatTrialTimeRange(start, trialEnd(start))).toBe(
      '4:00 PM – 4:30 PM',
    );
  });

  it('handles midnight and noon edges in 12-hour form', () => {
    expect(formatTrialTime(new Date('2026-11-03T18:00:00Z'))).toBe('12:00 AM');
    expect(formatTrialTime(new Date('2026-11-04T06:00:00Z'))).toBe('12:00 PM');
    expect(formatTrialTime(new Date('2026-11-04T17:30:00Z'))).toBe('11:30 PM');
  });

  it('trial lasts exactly 30 minutes', () => {
    expect(trialEnd(start).getTime() - start.getTime()).toBe(30 * 60_000);
  });

  it('adds a parent-local line only when their timezone actually differs', () => {
    const end = trialEnd(start);
    expect(describeAppointment(start, end, 'Asia/Dhaka').local).toBeNull();
    expect(describeAppointment(start, end, null).local).toBeNull();
    expect(describeAppointment(start, end, 'Not/AZone').local).toBeNull();

    const london = describeAppointment(start, end, 'Europe/London').local;
    expect(london).toEqual({
      date: 'Wednesday, 4 November 2026',
      timeRange: '10:00 AM – 10:30 AM',
      timeZone: 'Europe/London',
    });
    const ny = describeAppointment(start, end, 'America/New_York').local;
    expect(ny?.timeRange).toBe('5:00 AM – 5:30 AM');

    // The local date can differ from the Dhaka date.
    const late = new Date('2026-11-04T17:30:00Z'); // 11:30 PM Dhaka
    expect(
      describeAppointment(late, trialEnd(late), 'Europe/London').local?.date,
    ).toBe('Wednesday, 4 November 2026');
    expect(
      describeAppointment(late, trialEnd(late), 'Asia/Tokyo').local?.date,
    ).toBe('Thursday, 5 November 2026');
  });

  it('always labels the timezone', () => {
    expect(
      describeAppointment(start, trialEnd(start)).dhaka.timezoneLabel,
    ).toBe('Bangladesh Time (GMT+6)');
    expect(isValidTimeZone('Asia/Dhaka')).toBe(true);
    expect(isValidTimeZone('nope')).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });
});

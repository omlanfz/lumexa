import {
  ADMIN_ALERT_VARIABLES,
  PARENT_CONFIRMATION_VARIABLES,
  PARENT_REMINDER_VARIABLES,
  buildTemplateVariables,
  computeReminderAt,
} from './trial-whatsapp.templates';

const lead = {
  parentName: 'Sarah Rahman',
  parentEmail: 'sarah@example.com',
  parentPhone: '+8801712345678',
  childName: 'Alex',
  childAge: 10,
  subject: 'AI Builder (Ages 12–18)',
  message: 'He loves Minecraft.\nNo coding yet.',
  startAt: new Date('2026-11-04T10:00:00Z'),
  endAt: new Date('2026-11-04T10:30:00Z'),
};

describe('WhatsApp template variable mapping', () => {
  const byName = (kind: any, l: any = lead) =>
    Object.fromEntries(
      buildTemplateVariables(kind, l).map((v) => [v.name, v.value]),
    );

  it('parent confirmation: stable order and content', () => {
    const vars = buildTemplateVariables('PARENT_CONFIRMATION', lead);
    expect(vars.map((v) => v.name)).toEqual([...PARENT_CONFIRMATION_VARIABLES]);
    expect(vars.map((v) => v.name)).toEqual([
      'parent_name',
      'child_name',
      'appointment_date',
      'appointment_time',
      'duration',
      'program_interest',
      'programs_url',
    ]);
    const v = byName('PARENT_CONFIRMATION');
    expect(v.parent_name).toBe('Sarah Rahman');
    expect(v.child_name).toBe('Alex');
    expect(v.appointment_date).toBe('Wednesday, 4 November 2026');
    expect(v.appointment_time).toBe(
      '4:00 PM – 4:30 PM Bangladesh Time (GMT+6)',
    );
    expect(v.duration).toBe('30 minutes');
    expect(v.program_interest).toBe('AI Builder (Ages 12–18)');
    expect(v.programs_url).toMatch(/\/programs$/);
  });

  it('parent reminder: only what a reminder needs', () => {
    expect(
      buildTemplateVariables('PARENT_REMINDER', lead).map((v) => v.name),
    ).toEqual([...PARENT_REMINDER_VARIABLES]);
    const v = byName('PARENT_REMINDER');
    expect(v).toEqual({
      child_name: 'Alex',
      appointment_date: 'Wednesday, 4 November 2026',
      appointment_time: '4:00 PM – 4:30 PM Bangladesh Time (GMT+6)',
      duration: '30 minutes',
    });
    expect(v).not.toHaveProperty('parent_email');
  });

  it('admin alert: parent + child details, Bangladesh time, optional message', () => {
    expect(
      buildTemplateVariables('ADMIN_ALERT', lead).map((v) => v.name),
    ).toEqual([...ADMIN_ALERT_VARIABLES]);
    const v = byName('ADMIN_ALERT');
    expect(v.parent_email).toBe('sarah@example.com');
    expect(v.parent_whatsapp).toBe('+8801712345678');
    expect(v.child_age).toBe('10');
    expect(v.appointment_time).toContain('Bangladesh Time (GMT+6)');
    expect(v.parent_message).toBe('He loves Minecraft.\nNo coding yet.'); // raw; sanitised at send time
    expect(
      byName('ADMIN_ALERT', { ...lead, message: null }).parent_message,
    ).toBe('None provided');
    expect(
      byName('ADMIN_ALERT', { ...lead, message: '   ' }).parent_message,
    ).toBe('None provided');
  });

  it('falls back when no program was supplied', () => {
    expect(
      byName('PARENT_CONFIRMATION', { ...lead, subject: '' }).program_interest,
    ).toBe('Not specified');
  });

  it('refuses to build for a lead without an appointment', () => {
    expect(() =>
      buildTemplateVariables('PARENT_REMINDER', {
        ...lead,
        startAt: null,
        endAt: null,
      } as any),
    ).toThrow();
  });
});

describe('reminder timing', () => {
  const HOUR = 3600_000;
  const start = new Date('2026-11-10T10:00:00Z');

  it('24 hours before when booked more than 24h ahead', () => {
    const now = new Date(start.getTime() - 72 * HOUR);
    expect(computeReminderAt(start, now)?.toISOString()).toBe(
      '2026-11-09T10:00:00.000Z',
    );
  });

  it('1 hour before when booked less than 24h ahead', () => {
    const now = new Date(start.getTime() - 5 * HOUR);
    expect(computeReminderAt(start, now)?.toISOString()).toBe(
      '2026-11-10T09:00:00.000Z',
    );
    const justUnder24 = new Date(start.getTime() - 24 * HOUR + 1000);
    expect(computeReminderAt(start, justUnder24)?.toISOString()).toBe(
      '2026-11-10T09:00:00.000Z',
    );
  });

  it('never schedules a pointless reminder (inside the last hour / after the start)', () => {
    expect(
      computeReminderAt(start, new Date(start.getTime() - 30 * 60_000)),
    ).toBeNull();
    expect(
      computeReminderAt(start, new Date(start.getTime() - HOUR)),
    ).toBeNull();
    expect(
      computeReminderAt(start, new Date(start.getTime() + 60_000)),
    ).toBeNull();
  });
});

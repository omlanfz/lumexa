import {
  ADMIN_ALERT_VARIABLES,
  PARENT_CLASS_DETAILS_VARIABLES,
  PARENT_CONFIRMATION_VARIABLES,
  PARENT_REMINDER_VARIABLES,
  buildTemplateVariables,
} from './trial-whatsapp.templates';
import { reminderDueAt } from './trial-access.util';

const TOKEN = 'k3Jx9QmLw0pZ7vNc2RtYb5HdFgAe8UiOsXn1MqWjC4E';
const JOIN_URL = `https://lumexa-one.vercel.app/trial/join/${TOKEN}`;

beforeAll(() => {
  process.env.FRONTEND_URL = 'https://lumexa-one.vercel.app';
});

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
  guestToken: TOKEN as string | null,
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

  it('class details: the trial time plus the secure join link', () => {
    expect(
      buildTemplateVariables('PARENT_CLASS_DETAILS', lead).map((v) => v.name),
    ).toEqual([...PARENT_CLASS_DETAILS_VARIABLES]);
    expect(byName('PARENT_CLASS_DETAILS')).toEqual({
      parent_name: 'Sarah Rahman',
      child_name: 'Alex',
      appointment_date: 'Wednesday, 4 November 2026',
      appointment_time: '4:00 PM – 4:30 PM Bangladesh Time (GMT+6)',
      duration: '30 minutes',
      join_link: JOIN_URL,
    });
  });

  it('the confirmation (sent at booking) never contains the classroom link', () => {
    const values = Object.values(byName('PARENT_CONFIRMATION')).join(' ');
    expect(values).not.toContain('/trial/join/');
    expect(values).not.toContain(TOKEN);
  });

  it('the admin alert never contains the parent link either', () => {
    expect(Object.values(byName('ADMIN_ALERT')).join(' ')).not.toContain(TOKEN);
  });

  it('a link message cannot be built without a token', () => {
    for (const kind of ['PARENT_CLASS_DETAILS', 'PARENT_REMINDER']) {
      expect(() =>
        buildTemplateVariables(kind as any, { ...lead, guestToken: null }),
      ).toThrow(/token/i);
    }
  });

  it('parent reminder: only what a reminder needs, plus the same link', () => {
    expect(
      buildTemplateVariables('PARENT_REMINDER', lead).map((v) => v.name),
    ).toEqual([...PARENT_REMINDER_VARIABLES]);
    const v = byName('PARENT_REMINDER');
    expect(v).toEqual({
      child_name: 'Alex',
      appointment_date: 'Wednesday, 4 November 2026',
      appointment_time: '4:00 PM – 4:30 PM Bangladesh Time (GMT+6)',
      duration: '30 minutes',
      join_link: JOIN_URL,
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

  it('is exactly one hour before the start, however far ahead it is planned', () => {
    for (const hoursAhead of [72, 24, 5, 1.01]) {
      const now = new Date(start.getTime() - hoursAhead * HOUR);
      expect(reminderDueAt(start, now)?.toISOString()).toBe(
        '2026-11-10T09:00:00.000Z',
      );
    }
  });

  it('never schedules an outdated reminder (inside the last hour / after the start)', () => {
    expect(
      reminderDueAt(start, new Date(start.getTime() - 30 * 60_000)),
    ).toBeNull();
    expect(reminderDueAt(start, new Date(start.getTime() - HOUR))).toBeNull();
    expect(reminderDueAt(start, new Date(start.getTime() + 60_000))).toBeNull();
  });
});

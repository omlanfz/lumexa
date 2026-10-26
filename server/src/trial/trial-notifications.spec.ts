import { NotificationsService } from '../notifications/notifications.service';
import { TrialNotificationsService } from './trial-notifications.service';

const ADMIN_EMAIL = 'ops-private@example.com';
const appointment = {
  date: 'Wednesday, 4 November 2026',
  timeRange: '4:00 PM – 4:30 PM',
  timezoneLabel: 'Bangladesh Time (GMT+6)',
  duration: '30 minutes',
  local: null,
};
const JOIN_URL =
  'https://lumexa-one.vercel.app/trial/join/k3Jx9QmLw0pZ7vNc2RtYb5HdFgAe8UiOsXn1MqWjC4E';
const contact = {
  email: 'lumexa.school@gmail.com',
  whatsappDisplay: '+880 1522 122194',
  whatsappUrl: 'https://wa.me/8801522122194',
};

function setup() {
  const email = { send: jest.fn().mockResolvedValue(undefined) };
  const service = new NotificationsService(email as any);
  const sent = () => email.send.mock.calls.map((c) => c[0]);
  return { service, email, sent };
}

describe('trial emails — recipients, content and idempotency', () => {
  const saved = {
    admin: process.env.ADMIN_NOTIFICATION_EMAILS,
    fe: process.env.FRONTEND_URL,
  };
  beforeEach(() => {
    process.env.ADMIN_NOTIFICATION_EMAILS = ADMIN_EMAIL;
    process.env.FRONTEND_URL = 'https://lumexa-one.vercel.app';
  });
  afterAll(() => {
    saved.admin === undefined
      ? delete process.env.ADMIN_NOTIFICATION_EMAILS
      : (process.env.ADMIN_NOTIFICATION_EMAILS = saved.admin);
    saved.fe === undefined
      ? delete process.env.FRONTEND_URL
      : (process.env.FRONTEND_URL = saved.fe);
  });

  it('booking email goes to the PARENT only, says received + reserved, has NO classroom link, links to Programs', async () => {
    const { service, sent } = setup();
    await service.sendTrialBookingConfirmedToParent({
      leadId: 'lead-1',
      parentEmail: 'sarah@example.com',
      parentName: 'Sarah',
      childName: 'Alex',
      program: 'AI Builder',
      appointment,
      contact,
    });
    const [mail] = sent();
    expect(mail.to).toBe('sarah@example.com');
    expect(mail.to).not.toContain(ADMIN_EMAIL);
    expect(mail.category).toBe('TRIAL_BOOKING_CONFIRMED');
    expect(mail.dedupeKey).toBe('trial:lead-1:confirmation:parent');
    expect(mail.subject).toMatch(/^Trial class request received:/);
    expect(mail.html).toMatch(/received/i);
    expect(mail.html).toMatch(/reserved/i);
    // a teacher has not been assigned yet: no link, and it must not claim one
    expect(mail.html).not.toContain('/trial/join/');
    expect(mail.html).toMatch(/once a teacher|as soon as/i);
    expect(mail.html).toContain('Bangladesh Time (GMT+6)');
    expect(mail.html).toContain('30 minutes');
    expect(mail.html).toContain('https://lumexa-one.vercel.app/programs');
    expect(mail.html).toContain('lumexa.school@gmail.com');
    expect(mail.html).toContain('https://wa.me/8801522122194');
    expect(mail.html).toMatch(/no obligation/i);
    // admin's private details never appear in a parent email
    expect(mail.html).not.toContain(ADMIN_EMAIL);
    expect(mail.html).not.toContain('1999000111');
  });

  it('admin alert goes to the ADMIN recipient only and carries every booking detail', async () => {
    const { service, sent } = setup();
    await service.sendTrialBookingAlertToAdmins({
      leadId: 'lead-1',
      parentName: 'Sarah',
      parentEmail: 'sarah@example.com',
      parentPhone: '+8801712345678',
      childName: 'Alex',
      childAge: 10,
      program: 'AI Builder',
      message: 'Loves Minecraft',
      appointment,
      bookingReference: 'LEAD-1AB',
    });
    const [mail] = sent();
    expect(mail.to).toBe(ADMIN_EMAIL);
    expect(mail.to).not.toContain('sarah@example.com');
    expect(mail.category).toBe('TRIAL_ADMIN_ALERT');
    expect(mail.dedupeKey).toBe('trial:lead-1:admin-alert');
    for (const needle of [
      'Sarah',
      'sarah@example.com',
      '+8801712345678',
      'Alex',
      'age 10',
      'AI Builder',
      'Loves Minecraft',
      'Wednesday, 4 November 2026',
      'Bangladesh Time (GMT+6)',
      '/admin/trial-classes',
    ]) {
      expect(mail.html).toContain(needle);
    }
  });

  it('escapes parent-supplied text in admin and parent emails', async () => {
    const { service, sent } = setup();
    await service.sendTrialBookingAlertToAdmins({
      leadId: 'l',
      parentName: '<b>Eve</b>',
      parentEmail: 'e@example.com',
      parentPhone: '+8801712345678',
      childName: 'Kid',
      childAge: 8,
      program: 'P',
      message: '<script>alert(1)</script>',
      appointment,
      bookingReference: 'X',
    });
    expect(sent()[0].html).not.toContain('<script>');
    expect(sent()[0].html).not.toContain('<b>Eve</b>');
    expect(sent()[0].html).toContain('&lt;script&gt;');
  });

  it('reschedule → PARENT only, shows old and new time, dedupe keyed by revision', async () => {
    const { service, sent } = setup();
    const previous = { ...appointment, date: 'Tuesday, 3 November 2026' };
    await service.sendTrialRescheduledToParent({
      leadId: 'lead-1',
      revision: 2,
      parentEmail: 'sarah@example.com',
      parentName: 'Sarah',
      childName: 'Alex',
      program: 'AI',
      previous,
      appointment,
      contact,
    });
    const [mail] = sent();
    expect(mail.to).toBe('sarah@example.com');
    expect(mail.category).toBe('TRIAL_RESCHEDULED');
    expect(mail.dedupeKey).toBe('trial:lead-1:rescheduled:r2');
    expect(mail.html).toContain('Tuesday, 3 November 2026');
    expect(mail.html).toContain('Wednesday, 4 November 2026');
    expect(mail.html).toMatch(/still reserved/i);
    // not staffed yet → no link in the email
    expect(mail.html).not.toContain('/trial/join/');
  });

  it('reschedule of a staffed trial repeats the SAME private link', async () => {
    const { service, sent } = setup();
    await service.sendTrialRescheduledToParent({
      leadId: 'lead-1',
      revision: 1,
      parentEmail: 'sarah@example.com',
      parentName: 'Sarah',
      childName: 'Alex',
      program: 'AI',
      previous: appointment,
      appointment,
      contact,
      joinUrl: JOIN_URL,
    });
    expect(sent()[0].html).toContain(JOIN_URL);
  });

  it('class details → PARENT only, with the secure link, one email per time (revision)', async () => {
    const { service, sent } = setup();
    await service.sendTrialClassDetailsToParent({
      leadId: 'lead-1',
      revision: 0,
      parentEmail: 'sarah@example.com',
      parentName: 'Sarah',
      childName: 'Alex',
      program: 'AI Builder',
      appointment,
      joinUrl: JOIN_URL,
      contact,
    });
    const [mail] = sent();
    expect(mail.to).toBe('sarah@example.com');
    expect(mail.category).toBe('TRIAL_CLASS_DETAILS');
    expect(mail.dedupeKey).toBe('trial:lead-1:class-details:r0');
    expect(mail.html).toContain(JOIN_URL);
    expect(mail.html).toContain('Wednesday, 4 November 2026');
    expect(mail.html).toContain('Bangladesh Time (GMT+6)');
    expect(mail.html).toContain('10 minutes before');
    expect(mail.html).not.toContain(ADMIN_EMAIL);
  });

  it('one-hour reminder → PARENT only, same link, keyed by revision so it can only send once per time', async () => {
    const { service, sent } = setup();
    await service.sendTrialReminderToParent({
      leadId: 'lead-1',
      revision: 3,
      parentEmail: 'sarah@example.com',
      parentName: 'Sarah',
      childName: 'Alex',
      appointment,
      joinUrl: JOIN_URL,
      contact,
    });
    const [mail] = sent();
    expect(mail.to).toBe('sarah@example.com');
    expect(mail.category).toBe('TRIAL_REMINDER');
    expect(mail.dedupeKey).toBe('trial:lead-1:reminder:r3');
    expect(mail.subject).toMatch(/Starting in 1 hour/);
    expect(mail.html).toContain(JOIN_URL);
  });

  it('parent-supplied names are escaped in the link emails too', async () => {
    const { service, sent } = setup();
    await service.sendTrialClassDetailsToParent({
      leadId: 'lead-1',
      revision: 0,
      parentEmail: 's@example.com',
      parentName: '<img src=x>',
      childName: '<script>1</script>',
      program: '<b>p</b>',
      appointment,
      joinUrl: JOIN_URL,
      contact,
    });
    expect(sent()[0].html).not.toContain('<script>');
    expect(sent()[0].html).not.toContain('<img src=x>');
  });

  it('cancellation → PARENT only; only the parent-facing note is shown, never the internal reason', async () => {
    const { service, sent } = setup();
    await service.sendTrialCancelledToParent({
      leadId: 'lead-1',
      parentEmail: 'sarah@example.com',
      parentName: 'Sarah',
      childName: 'Alex',
      appointment,
      note: 'Teacher is unwell',
      contact,
    });
    const [mail] = sent();
    expect(mail.to).toBe('sarah@example.com');
    expect(mail.category).toBe('TRIAL_CANCELLED');
    expect(mail.dedupeKey).toBe('trial:lead-1:cancelled');
    expect(mail.html).toContain('Teacher is unwell');
    expect(mail.html).toContain('/trial');
  });

  it('no admin recipient configured: alert is dropped quietly, nothing thrown', async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAILS;
    const { service, email } = setup();
    await expect(
      service.sendTrialBookingAlertToAdmins({
        leadId: 'l',
        parentName: 'S',
        parentEmail: 's@example.com',
        parentPhone: '+8801712345678',
        childName: 'K',
        childAge: 8,
        program: 'P',
        appointment,
        bookingReference: 'X',
      }),
    ).resolves.toBeUndefined();
    expect(email.send).not.toHaveBeenCalled();
  });
});

describe('TrialNotificationsService (post-commit fan-out)', () => {
  beforeAll(() => {
    process.env.FRONTEND_URL = 'https://lumexa-one.vercel.app';
  });
  const lead: any = {
    id: 'lead-1',
    parentName: 'Sarah',
    parentEmail: 'sarah@example.com',
    parentPhone: '+8801712345678',
    childName: 'Alex',
    childAge: 10,
    subject: 'AI Builder',
    message: null,
    timezone: 'Europe/London',
    revision: 0,
    teacherId: null,
    guestToken: 'k3Jx9QmLw0pZ7vNc2RtYb5HdFgAe8UiOsXn1MqWjC4E',
    startAt: new Date('2026-11-04T10:00:00Z'),
    endAt: new Date('2026-11-04T10:30:00Z'),
  };
  const build = () => {
    const notifications = {
      sendTrialClassDetailsToParent: jest.fn().mockResolvedValue(undefined),
      sendTrialReminderToParent: jest.fn().mockResolvedValue(undefined),
      sendTrialBookingConfirmedToParent: jest.fn().mockResolvedValue(undefined),
      sendTrialBookingAlertToAdmins: jest.fn().mockResolvedValue(undefined),
      sendTrialRescheduledToParent: jest.fn().mockResolvedValue(undefined),
      sendTrialCancelledToParent: jest.fn().mockResolvedValue(undefined),
    };
    const whatsapp = { kick: jest.fn() };
    return {
      notifications,
      whatsapp,
      service: new TrialNotificationsService(
        notifications as any,
        whatsapp as any,
      ),
    };
  };

  it('parent booking: confirmation + admin alert (in Bangladesh time) + WhatsApp kick', () => {
    const { service, notifications, whatsapp } = build();
    service.afterBooked(lead, { alertAdmin: true });
    expect(
      notifications.sendTrialBookingConfirmedToParent,
    ).toHaveBeenCalledTimes(1);
    expect(notifications.sendTrialBookingAlertToAdmins).toHaveBeenCalledTimes(
      1,
    );
    expect(whatsapp.kick).toHaveBeenCalledTimes(1);
    const parentCall =
      notifications.sendTrialBookingConfirmedToParent.mock.calls[0][0];
    expect(parentCall.appointment.local?.timeZone).toBe('Europe/London'); // parent sees their own time too
    const adminCall =
      notifications.sendTrialBookingAlertToAdmins.mock.calls[0][0];
    expect(adminCall.appointment.local).toBeNull(); // admin always sees Dhaka only
    expect(adminCall.parentPhone).toBe('+8801712345678');
  });

  it('admin-created booking does not alert the admin', () => {
    const { service, notifications } = build();
    service.afterBooked(lead, { alertAdmin: false });
    expect(
      notifications.sendTrialBookingConfirmedToParent,
    ).toHaveBeenCalledTimes(1);
    expect(notifications.sendTrialBookingAlertToAdmins).not.toHaveBeenCalled();
  });

  it('an email failure is swallowed — it can never fail the booking', async () => {
    const { service, notifications } = build();
    notifications.sendTrialBookingConfirmedToParent.mockRejectedValue(
      new Error('smtp down'),
    );
    expect(() => service.afterBooked(lead, { alertAdmin: true })).not.toThrow();
    await new Promise((r) => setImmediate(r));
  });

  it('booking never sends the class link (no teacher yet)', () => {
    const { service, notifications } = build();
    service.afterBooked(lead, { alertAdmin: true });
    expect(notifications.sendTrialClassDetailsToParent).not.toHaveBeenCalled();
    expect(notifications.sendTrialReminderToParent).not.toHaveBeenCalled();
  });

  it('teacher assignment emails the details + link and releases the queued WhatsApp', () => {
    const { service, notifications, whatsapp } = build();
    service.afterTeacherAssigned({ ...lead, teacherId: 'teacher-1' });
    const call = notifications.sendTrialClassDetailsToParent.mock.calls[0][0];
    expect(call.joinUrl).toBe(
      'https://lumexa-one.vercel.app/trial/join/k3Jx9QmLw0pZ7vNc2RtYb5HdFgAe8UiOsXn1MqWjC4E',
    );
    expect(call.revision).toBe(0);
    expect(whatsapp.kick).toHaveBeenCalledTimes(1);
  });

  it('the reminder email is awaited (the sweep marks it done only after it was journaled)', async () => {
    const { service, notifications } = build();
    let resolved = false;
    notifications.sendTrialReminderToParent.mockImplementation(
      () =>
        new Promise<void>((r) =>
          setTimeout(() => {
            resolved = true;
            r();
          }, 5),
        ),
    );
    await service.sendReminderEmail({ ...lead, teacherId: 'teacher-1' });
    expect(resolved).toBe(true);
  });

  it('a trial without a token never produces a link email', async () => {
    const { service, notifications } = build();
    service.afterTeacherAssigned({ ...lead, guestToken: null });
    await service.sendReminderEmail({ ...lead, guestToken: null });
    expect(notifications.sendTrialClassDetailsToParent).not.toHaveBeenCalled();
    expect(notifications.sendTrialReminderToParent).not.toHaveBeenCalled();
  });

  it('a reschedule of a staffed trial carries the same link and nudges WhatsApp (updated details were queued)', () => {
    const { service, notifications, whatsapp } = build();
    service.afterRescheduled(
      { ...lead, revision: 1, teacherId: 'teacher-1' },
      {
        startAt: new Date('2026-11-03T10:00:00Z'),
        endAt: new Date('2026-11-03T10:30:00Z'),
      },
    );
    expect(
      notifications.sendTrialRescheduledToParent.mock.calls[0][0].joinUrl,
    ).toContain('/trial/join/');
    expect(whatsapp.kick).toHaveBeenCalled();
  });

  it('reschedule and cancel email the parent and never touch WhatsApp when no teacher is assigned', () => {
    const { service, notifications, whatsapp } = build();
    service.afterRescheduled(
      { ...lead, revision: 1 },
      {
        startAt: new Date('2026-11-03T10:00:00Z'),
        endAt: new Date('2026-11-03T10:30:00Z'),
      },
    );
    service.afterCancelled(lead, 'note');
    expect(notifications.sendTrialRescheduledToParent).toHaveBeenCalledTimes(1);
    expect(notifications.sendTrialCancelledToParent).toHaveBeenCalledTimes(1);
    expect(whatsapp.kick).not.toHaveBeenCalled();
  });
});

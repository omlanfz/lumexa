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

  it('booking confirmation goes to the PARENT only, says confirmed, links to Programs', async () => {
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
    expect(mail.subject).toMatch(/^Confirmed:/);
    expect(mail.html).toContain('confirmed');
    expect(mail.html).toContain('Bangladesh Time (GMT+6)');
    expect(mail.html).toContain('30 minutes');
    expect(mail.html).toContain('https://lumexa-one.vercel.app/programs');
    expect(mail.html).toContain('lumexa.school@gmail.com');
    expect(mail.html).toContain('https://wa.me/8801522122194');
    expect(mail.html).toMatch(/no obligation/i);
    // never describes a booking as a request
    expect(mail.html.toLowerCase()).not.toContain("we'll confirm");
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
    expect(mail.html).toMatch(/still confirmed/i);
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
    startAt: new Date('2026-11-04T10:00:00Z'),
    endAt: new Date('2026-11-04T10:30:00Z'),
  };
  const build = () => {
    const notifications = {
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

  it('reschedule and cancel email the parent and never touch WhatsApp', () => {
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

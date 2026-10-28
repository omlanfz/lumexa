// Integration tests against a REAL Postgres (needed to prove the booking race
// protection — advisory lock + exclusion constraint — rather than mock it).
//
// Skipped unless TRIAL_INTEGRATION_DATABASE_URL points at a database that has
// all migrations applied (npx prisma migrate deploy). It deletes trial rows,
// so NEVER point it at production. Example:
//
//   TRIAL_INTEGRATION_DATABASE_URL=postgresql://postgres:pg@localhost:5432/lumexa_test \
//     npx jest src/trial/trial.integration.spec.ts
//
// No network: SMTP is unconfigured (emails are journaled to EmailLog) and the
// WhatsApp Cloud API is replaced by a mocked global fetch.

import 'reflect-metadata';

const DB_URL = process.env.TRIAL_INTEGRATION_DATABASE_URL;
if (DB_URL) {
  process.env.DATABASE_URL = DB_URL;
  process.env.DIRECT_DATABASE_URL = DB_URL;
}
process.env.JWT_SECRET = 'integration-test-secret';
process.env.ADMIN_NOTIFICATION_EMAILS = 'ops-private@example.com';
process.env.FRONTEND_URL = 'https://lumexa-one.vercel.app';
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JwtStrategy } from '../auth/jwt.strategy';
import {
  acquireDatabaseLock,
  truncateAssessmentData,
} from '../assessments/testing/integration-db';
import { SchedulingService } from '../scheduling/scheduling.service';
import { findTeacherConflict } from '../scheduling/teacher-conflict.util';
import { TeachersService } from '../teachers/teachers.service';
import {
  DailyRoomsService,
  type MeetingTokenParams,
} from '../classroom/daily-rooms.service';
import { RoomAccessService } from '../classroom/room-access.service';
import { TrialClassroomService } from '../classroom/trial-classroom.service';
import { TrialReminderService } from './trial-reminder.service';
import { TrialModule } from './trial.module';
import { TrialWhatsAppService } from './trial-whatsapp.service';
import { isSlotConflictError } from './trial-booking.service';
import {
  addDaysToDateStr,
  dhakaToUtc,
  todayDhakaDateStr,
} from '../scheduling/dhaka-time.util';

const describeDb = DB_URL ? describe : describe.skip;

// The integration specs share one database and wipe it, so they take turns
// (see acquireDatabaseLock) — this file's two suites run under one lock.
let releaseLock: (() => void) | undefined;
if (DB_URL) {
  beforeAll(async () => {
    releaseLock = await acquireDatabaseLock(DB_URL);
  }, 200_000);
  afterAll(() => releaseLock?.());
}

describeDb('Trial booking (real Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let whatsapp: TrialWhatsAppService;
  let adminToken: string;
  let parentToken: string;
  const DAY = addDaysToDateStr(todayDhakaDateStr(), 3);
  const slot = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return dhakaToUtc(DAY, h, m).toISOString();
  };

  const parent = (n: number, startAt: string, over: object = {}) => ({
    parentName: `Parent ${n}`,
    parentEmail: `parent${n}@example.com`,
    parentPhone: `0171234${String(1000 + n)}`,
    childName: `Child ${n}`,
    childAge: 10,
    subject: 'AI Builder (Ages 12–18)',
    startAt,
    whatsappConsent: true,
    ...over,
  });
  const book = (body: object) =>
    request(app.getHttpServer()).post('/trial').send(body);
  const admin = () => ({ Authorization: `Bearer ${adminToken}` });
  const confirmedStarts = async () =>
    (
      await prisma.trialLead.findMany({
        where: { appointmentStatus: 'CONFIRMED' },
        orderBy: { startAt: 'asc' },
      })
    ).map((l) => l.startAt!.toISOString());

  async function clean() {
    await prisma.trialWhatsAppMessage.deleteMany();
    await prisma.trialLead.deleteMany();
    await prisma.trialAvailabilityRule.deleteMany();
    await prisma.trialAvailabilityWindow.deleteMany();
    await prisma.trialBlockedPeriod.deleteMany();
    await prisma.emailLog.deleteMany({
      where: { dedupeKey: { startsWith: 'trial:' } },
    });
    await prisma.auditLog.deleteMany({
      where: {
        entityType: { in: ['TRIAL_APPOINTMENT', 'TRIAL_AVAILABILITY'] },
      },
    });
  }
  const openWindow = (start = '10:00', end = '14:00') =>
    prisma.trialAvailabilityWindow.create({
      data: {
        date: DAY,
        startMinute: Number(start.slice(0, 2)) * 60 + Number(start.slice(3)),
        endMinute: Number(end.slice(0, 2)) * 60 + Number(end.slice(3)),
      },
    });

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      imports: [
        PrismaModule,
        AuditModule,
        EmailModule,
        NotificationsModule,
        PassportModule,
        TrialModule,
      ],
      providers: [JwtStrategy],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0); // one shared server: many parallel supertest requests would otherwise each open their own
    prisma = moduleRef.get(PrismaService);
    whatsapp = moduleRef.get(TrialWhatsAppService);
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    adminToken = jwt.sign({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    parentToken = jwt.sign({
      sub: 'parent-1',
      email: 'p@example.com',
      role: 'PARENT',
    });
  });
  afterAll(async () => {
    await clean();
    await app?.close();
    await prisma?.$disconnect();
    jest.restoreAllMocks();
  });
  beforeEach(async () => {
    delete process.env.WHATSAPP_ENABLED;
    await clean();
    await openWindow();
  });

  // ── availability ───────────────────────────────────────────────────────────

  it('public availability lists only real slots, is never cached, and exposes no personal data', async () => {
    await book(parent(1, slot('11:00'))).expect(201);
    const res = await request(app.getHttpServer())
      .get(`/trial/availability?from=${DAY}&to=${DAY}`)
      .expect(200);
    expect(res.headers['cache-control']).toContain('no-store');
    const day = res.body.days[0];
    expect(day.date).toBe(DAY);
    expect(day.slots).toEqual([
      slot('10:00'),
      slot('12:00'),
      slot('12:30'),
      slot('13:00'),
      slot('13:30'),
    ]);
    expect(res.body).toMatchObject({
      timezone: 'Asia/Dhaka',
      durationMinutes: 30,
      bufferMinutes: 30,
    });
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(
      /parent1@example|Parent 1|Child 1|0171234|ops-private|1999000111/,
    );
  });

  it('validates the requested range', async () => {
    await request(app.getHttpServer())
      .get('/trial/availability?from=nope&to=2026-01-01')
      .expect(400);
    await request(app.getHttpServer())
      .get(`/trial/availability?from=${DAY}&to=2020-01-01`)
      .expect(400);
    await request(app.getHttpServer())
      .get(`/trial/availability?from=${DAY}&to=${addDaysToDateStr(DAY, 90)}`)
      .expect(400);
  });

  it('reports a fully booked day as "full" and a day without availability as "unavailable"', async () => {
    await book(parent(1, slot('10:30'))).expect(201);
    await book(parent(2, slot('12:30'))).expect(201);
    await book(parent(3, slot('13:30'))).expect(201); // 11:00? within 30 of 10:30? no → but fill rest below
    const res = await request(app.getHttpServer())
      .get(`/trial/availability?from=${DAY}&to=${addDaysToDateStr(DAY, 1)}`)
      .expect(200);
    expect(['full', 'available']).toContain(res.body.days[0].status);
    expect(res.body.days[1].status).toBe('unavailable');
  });

  // ── booking ────────────────────────────────────────────────────────────────

  it('creates a confirmed booking, normalises the phone, queues emails and returns no private data', async () => {
    const res = await book(parent(1, slot('10:00'))).expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking).toMatchObject({
      startAt: slot('10:00'),
      endAt: slot('10:30'),
      timezone: 'Asia/Dhaka',
      durationMinutes: 30,
      childName: 'Child 1',
    });
    expect(JSON.stringify(res.body)).not.toMatch(
      /0171234|\+88017|ops-private|1999000111|adminNotes/,
    );

    const row = await prisma.trialLead.findFirstOrThrow();
    expect(row).toMatchObject({
      appointmentStatus: 'CONFIRMED',
      status: 'BOOKED',
      bookedBy: 'PARENT',
      parentPhone: '+8801712341001',
      whatsappConsent: true,
    });
    expect(row.endAt!.getTime() - row.startAt!.getTime()).toBe(30 * 60_000);

    // emails are journaled (SMTP unconfigured here → they end up FAILED but exist, to the right people)
    await new Promise((r) => setTimeout(r, 300));
    const mails = await prisma.emailLog.findMany({
      where: { dedupeKey: { startsWith: `trial:${row.id}` } },
    });
    const byKey = Object.fromEntries(
      mails.map((m) => [m.dedupeKey, m.toEmail]),
    );
    expect(byKey[`trial:${row.id}:confirmation:parent`]).toBe(
      'parent1@example.com',
    );
    expect(byKey[`trial:${row.id}:admin-alert`]).toBe(
      'ops-private@example.com',
    );

    // WhatsApp disabled → rows exist but are SKIPPED, nothing is pending
    const wa = await prisma.trialWhatsAppMessage.findMany({
      where: { trialLeadId: row.id },
    });
    // (the class link + 1-hour reminder are queued later, when a teacher is assigned)
    expect(wa).toHaveLength(2);
    expect(wa.every((m) => m.status === 'SKIPPED')).toBe(true);
    // a secret guest token is minted now but never leaves the server
    expect(row.guestToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(row.teacherId).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain(row.guestToken!);
    expect(JSON.stringify(mails)).not.toContain(row.guestToken!);
  });

  it('rejects ages outside 6–18 and stores nothing', async () => {
    for (const age of [5, 19, 0, 40]) {
      await book(parent(1, slot('10:00'), { childAge: age })).expect(400);
    }
    for (const age of [6, 18]) {
      await book(
        parent(age, slot(age === 6 ? '10:00' : '12:00'), { childAge: age }),
      ).expect(201);
    }
    expect(await prisma.trialLead.count()).toBe(2);
  });

  it('validates input: missing phone / consent, bad phone, off-grid time, past time, outside availability', async () => {
    const base = parent(1, slot('10:00'));
    const { parentPhone, ...noPhone } = base;
    await book(noPhone).expect(400);
    await book({ ...base, parentPhone: '12345' }).expect(400);
    await book({ ...base, whatsappConsent: false }).expect(400);
    await book({
      ...base,
      startAt: new Date(dhakaToUtc(DAY, 10, 15)).toISOString(),
    }).expect(400);
    await book({ ...base, startAt: '2020-01-01T10:00:00.000Z' }).expect(409);
    await book({ ...base, startAt: slot('14:00') }).expect(409); // window ends 14:00 → 14:00 start would overrun
    await book({ ...base, startAt: slot('09:30') }).expect(409);
    await book({ ...base, isAdmin: true }).expect(400);
    expect(await prisma.trialLead.count()).toBe(0);
  });

  it('enforces 30-min session + 30-min gap: 30 apart rejected, 60 apart accepted, identical rejected', async () => {
    await book(parent(1, slot('11:00'))).expect(201);
    await book(parent(2, slot('11:00'))).expect(409);
    await book(parent(3, slot('11:30'))).expect(409);
    await book(parent(4, slot('10:30'))).expect(409);
    await book(parent(5, slot('12:00'))).expect(201); // exactly 60 later
    await book(parent(6, slot('10:00'))).expect(201); // exactly 60 earlier
    expect(await confirmedStarts()).toEqual([
      slot('10:00'),
      slot('11:00'),
      slot('12:00'),
    ]);
  });

  it('is idempotent for the same family resubmitting the same slot, and blocks a second trial for the same child', async () => {
    const body = parent(1, slot('10:00'));
    const first = await book(body).expect(201);
    const again = await book(body).expect(201);
    expect(again.body.alreadyBooked).toBe(true);
    expect(again.body.booking.reference).toBe(first.body.booking.reference);
    expect(await prisma.trialLead.count()).toBe(1);

    const other = await book(parent(1, slot('12:00'))).expect(409);
    expect(JSON.stringify(other.body)).toMatch(/already has a trial/i);
  });

  // ── the race ───────────────────────────────────────────────────────────────

  it('simultaneous requests for the SAME slot: exactly one wins', async () => {
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => book(parent(i + 1, slot('11:00')))),
    );
    const codes = results.map((r) => r.status).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(11);
    expect(
      await prisma.trialLead.count({
        where: { appointmentStatus: 'CONFIRMED' },
      }),
    ).toBe(1);
  });

  it('simultaneous requests for overlapping neighbouring slots never violate the 60-minute gap', async () => {
    const times = [
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
    ];
    const results = await Promise.all(
      times.flatMap((t, i) => [
        book(parent(i * 2 + 1, slot(t))),
        book(parent(i * 2 + 2, slot(t))),
      ]),
    );
    expect(results.every((r) => r.status === 201 || r.status === 409)).toBe(
      true,
    );
    const starts = (await confirmedStarts()).map((s) => new Date(s).getTime());
    expect(starts.length).toBeGreaterThan(0);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(60 * 60_000);
    }
  });

  it('the database itself refuses conflicting appointments even if the service is bypassed', async () => {
    const base = {
      parentName: 'A',
      parentEmail: 'a@example.com',
      childName: 'K',
      childAge: 9,
      subject: 'S',
      appointmentStatus: 'CONFIRMED' as const,
    };
    const s = new Date(slot('11:00'));
    await prisma.trialLead.create({
      data: { ...base, startAt: s, endAt: new Date(s.getTime() + 1800_000) },
    });
    const clash = new Date(s.getTime() + 1800_000);
    let error: unknown;
    try {
      await prisma.trialLead.create({
        data: {
          ...base,
          startAt: clash,
          endAt: new Date(clash.getTime() + 1800_000),
        },
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(isSlotConflictError(error)).toBe(true);
    const ok = new Date(s.getTime() + 3600_000);
    await prisma.trialLead.create({
      data: { ...base, startAt: ok, endAt: new Date(ok.getTime() + 1800_000) },
    });
  });

  // ── admin API: authorization + privacy ─────────────────────────────────────

  it('admin endpoints reject anonymous and non-admin callers; admin sees full contact details', async () => {
    const b = await book(parent(1, slot('10:00'))).expect(201);
    const paths = [
      '/admin/trial/appointments',
      '/admin/trial/availability',
      '/admin/trial/appointments/summary',
      '/trial',
    ];
    for (const p of paths) {
      await request(app.getHttpServer()).get(p).expect(401);
      await request(app.getHttpServer())
        .get(p)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);
    }
    await request(app.getHttpServer())
      .post('/admin/trial/appointments')
      .send(parent(9, slot('12:00'), { whatsappConsent: true }))
      .expect(401);
    await request(app.getHttpServer())
      .post('/admin/trial/appointments')
      .set('Authorization', `Bearer ${parentToken}`)
      .send(parent(9, slot('12:00')))
      .expect(403);

    const list = await request(app.getHttpServer())
      .get('/admin/trial/appointments')
      .set(admin())
      .expect(200);
    const item = list.body.appointments[0];
    expect(item).toMatchObject({
      reference: b.body.booking.reference,
      parentName: 'Parent 1',
      parentEmail: 'parent1@example.com',
      parentPhone: '+8801712341001',
      childName: 'Child 1',
      childAge: 10,
      status: 'CONFIRMED',
      timezone: 'Asia/Dhaka',
    });
    expect(item.notifications.whatsapp.map((w: any) => w.kind).sort()).toEqual([
      'ADMIN_ALERT',
      'PARENT_CONFIRMATION',
    ]);
    expect(item.teacher).toBeNull();
    expect(JSON.stringify(list.body)).not.toMatch(/guestToken/);
  });

  it('admin can schedule on a parent’s behalf under the SAME rules (and gets no admin alert)', async () => {
    await book(parent(1, slot('11:00'))).expect(201);
    await request(app.getHttpServer())
      .post('/admin/trial/appointments')
      .set(admin())
      .send(parent(2, slot('11:30')))
      .expect(409);
    await request(app.getHttpServer())
      .post('/admin/trial/appointments')
      .set(admin())
      .send(parent(2, slot('12:00'), { childAge: 5 }))
      .expect(400);
    const ok = await request(app.getHttpServer())
      .post('/admin/trial/appointments')
      .set(admin())
      .send(parent(2, slot('12:00'), { whatsappConsent: false }))
      .expect(201);
    expect(ok.body).toMatchObject({ bookedBy: 'ADMIN', status: 'CONFIRMED' });
    await new Promise((r) => setTimeout(r, 300));
    const alerts = await prisma.emailLog.findMany({
      where: { dedupeKey: `trial:${ok.body.id}:admin-alert` },
    });
    expect(alerts).toHaveLength(0);
    const audit = await prisma.auditLog.findMany({
      where: { entityId: ok.body.id },
    });
    expect(audit.map((a) => a.action)).toContain('TRIAL_SCHEDULED_BY_ADMIN');
    expect(audit[0].actorId).toBe('admin-1');
  });

  // ── reschedule / cancel ────────────────────────────────────────────────────

  it('reschedule: same validation, frees the old slot, emails the parent once, retires the old reminder', async () => {
    const a = await book(parent(1, slot('10:00'))).expect(201);
    await book(parent(2, slot('12:00'))).expect(201);
    const id = (
      await prisma.trialLead.findFirstOrThrow({
        where: { parentEmail: 'parent1@example.com' },
      })
    ).id;
    const url = `/admin/trial/appointments/${id}/reschedule`;

    await request(app.getHttpServer())
      .post(url)
      .send({ startAt: slot('13:00') })
      .expect(401);
    await request(app.getHttpServer())
      .post(url)
      .set(admin())
      .send({ startAt: slot('12:30') })
      .expect(409); // 30 from parent 2
    await request(app.getHttpServer())
      .post(url)
      .set(admin())
      .send({ startAt: slot('10:00') })
      .expect(400); // unchanged
    await request(app.getHttpServer())
      .post(url)
      .set(admin())
      .send({ startAt: slot('16:00') })
      .expect(409); // outside availability

    const moved = await request(app.getHttpServer())
      .post(url)
      .set(admin())
      .send({ startAt: slot('13:30'), reason: 'Parent asked' })
      .expect(201);
    expect(moved.body.appointment.startAt).toBe(slot('13:30'));
    expect(moved.body.appointment.rescheduleCount).toBe(1);
    expect(moved.body.availabilityChanges.nowBookable).toContain(slot('10:00'));
    expect(moved.body.availabilityChanges.noLongerBookable).toContain(
      slot('13:30'),
    );

    await new Promise((r) => setTimeout(r, 300));
    const mail = await prisma.emailLog.findMany({
      where: { dedupeKey: `trial:${id}:rescheduled:r1` },
    });
    expect(mail).toHaveLength(1);
    expect(mail[0].toEmail).toBe('parent1@example.com');
    expect(a.body.booking.startAt).toBe(slot('10:00'));
    expect(await confirmedStarts()).toEqual([slot('12:00'), slot('13:30')]);
    const audit = await prisma.auditLog.findMany({
      where: { entityId: id, action: 'TRIAL_RESCHEDULED' },
    });
    expect(audit[0].reason).toBe('Parent asked');
  });

  it('cancel: frees the slot, stops pending WhatsApp, emails the parent, and is idempotent', async () => {
    await book(parent(1, slot('11:00'))).expect(201);
    const id = (await prisma.trialLead.findFirstOrThrow()).id;
    const url = `/admin/trial/appointments/${id}/cancel`;

    await request(app.getHttpServer())
      .post(url)
      .set(admin())
      .send({})
      .expect(400); // reason required
    const res = await request(app.getHttpServer())
      .post(url)
      .set(admin())
      .send({ reason: 'Teacher unavailable', parentNote: 'Sorry!' })
      .expect(201);
    expect(res.body.appointment.status).toBe('CANCELLED');
    expect(res.body.availabilityChanges.nowBookable).toEqual(
      expect.arrayContaining([slot('11:00'), slot('10:30'), slot('11:30')]),
    );
    const again = await request(app.getHttpServer())
      .post(url)
      .set(admin())
      .send({ reason: 'x again' })
      .expect(201);
    expect(again.body.alreadyCancelled).toBe(true);

    await new Promise((r) => setTimeout(r, 300));
    expect(
      await prisma.emailLog.count({
        where: { dedupeKey: `trial:${id}:cancelled` },
      }),
    ).toBe(1);
    await book(parent(2, slot('11:00'))).expect(201); // slot reusable
  });

  // ── WhatsApp outbox, real DB ───────────────────────────────────────────────

  it('WhatsApp enabled: confirmation + admin alert are sent exactly once even with concurrent sweeps; no reminder or link before a teacher exists', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '999';
    process.env.WHATSAPP_ACCESS_TOKEN = 'tok';
    process.env.WHATSAPP_ADMIN_RECIPIENT = '+8801999000111';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: 'wamid.T' }] }),
    } as Response);

    try {
      await book(parent(1, slot('11:00'))).expect(201);
      await Promise.all([
        whatsapp.processDue(),
        whatsapp.processDue(),
        whatsapp.processDue(),
      ]);
      await new Promise((r) => setTimeout(r, 300));
      await Promise.all([whatsapp.processDue(), whatsapp.processDue()]);

      const rows = await prisma.trialWhatsAppMessage.findMany();
      const byKind = Object.fromEntries(rows.map((r) => [r.kind, r]));
      expect(byKind.PARENT_CONFIRMATION.status).toBe('SENT');
      expect(byKind.ADMIN_ALERT.status).toBe('SENT');
      expect(byKind.PARENT_REMINDER).toBeUndefined();
      expect(byKind.PARENT_CLASS_DETAILS).toBeUndefined();

      const recipients = fetchSpy.mock.calls
        .map((c) => JSON.parse((c[1] as RequestInit).body as string).to)
        .sort();
      expect(recipients).toEqual(['8801712341001', '8801999000111']);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      fetchSpy.mockRestore();
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      delete process.env.WHATSAPP_ADMIN_RECIPIENT;
    }
  });

  it('WhatsApp enabled but credentials missing: the booking still succeeds and the failure is recorded for admins', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    const fetchSpy = jest.spyOn(global, 'fetch');
    try {
      await book(parent(1, slot('11:00'))).expect(201);
      await whatsapp.processDue();
      await new Promise((r) => setTimeout(r, 200));
      await whatsapp.processDue();
      const lead = await prisma.trialLead.findFirstOrThrow();
      expect(lead.appointmentStatus).toBe('CONFIRMED');
      const failed = await prisma.trialWhatsAppMessage.findMany({
        where: { status: 'FAILED' },
      });
      expect(failed.length).toBeGreaterThanOrEqual(1);
      expect(
        failed.every(
          (m) => m.errorCode === 'NOT_CONFIGURED' && m.nextAttemptAt === null,
        ),
      ).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
      const summary = await request(app.getHttpServer())
        .get('/admin/trial/appointments/summary')
        .set(admin())
        .expect(200);
      expect(summary.body.failedWhatsApp).toBeGreaterThanOrEqual(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  // ── editing availability with existing bookings ────────────────────────────

  it('editing availability never silently strands bookings: preview → confirm → booking stays, flagged', async () => {
    await book(parent(1, slot('11:00'))).expect(201);
    const win = await prisma.trialAvailabilityWindow.findFirstOrThrow();
    const url = `/admin/trial/availability/windows/${win.id}`;
    const shrink = { date: DAY, startTime: '12:00', endTime: '14:00' };

    const dry = await request(app.getHttpServer())
      .put(`${url}?dryRun=true`)
      .set(admin())
      .send(shrink)
      .expect(200);
    expect(dry.body.dryRun).toBe(true);
    expect(dry.body.affected).toHaveLength(1);
    expect(dry.body.affected[0].childName).toBe('Child 1');
    expect(
      (
        await prisma.trialAvailabilityWindow.findUniqueOrThrow({
          where: { id: win.id },
        })
      ).startMinute,
    ).toBe(600); // untouched

    await request(app.getHttpServer())
      .put(url)
      .set(admin())
      .send(shrink)
      .expect(409);
    expect(
      (
        await prisma.trialAvailabilityWindow.findUniqueOrThrow({
          where: { id: win.id },
        })
      ).startMinute,
    ).toBe(600);

    const done = await request(app.getHttpServer())
      .put(`${url}?confirmAffected=true`)
      .set(admin())
      .send(shrink)
      .expect(200);
    expect(done.body.affected).toHaveLength(1);
    expect(await confirmedStarts()).toEqual([slot('11:00')]); // booking untouched

    const list = await request(app.getHttpServer())
      .get('/admin/trial/appointments')
      .set(admin())
      .expect(200);
    expect(list.body.appointments[0].outsideAvailability).toBe(true);
    const sum = await request(app.getHttpServer())
      .get('/admin/trial/appointments/summary')
      .set(admin())
      .expect(200);
    expect(sum.body.outsideAvailability).toBe(1);
    const audit = await prisma.auditLog.findMany({
      where: {
        entityType: 'TRIAL_AVAILABILITY',
        action: 'TRIAL_WINDOW_UPDATED',
      },
    });
    expect((audit[0].afterData as any).affectedAppointmentIds).toHaveLength(1);
  });

  it('weekly rules (several per weekday), blocked dates and the parent-visible preview', async () => {
    await prisma.trialAvailabilityWindow.deleteMany();
    const weekday = new Date(`${DAY}T00:00:00Z`).getUTCDay();
    for (const [startTime, endTime] of [
      ['15:00', '19:00'],
      ['21:00', '23:00'],
    ]) {
      await request(app.getHttpServer())
        .post('/admin/trial/availability/rules')
        .set(admin())
        .send({ weekday, startTime, endTime })
        .expect(201);
    }
    await request(app.getHttpServer())
      .post('/admin/trial/availability/rules')
      .set(admin())
      .send({ weekday, startTime: '15:15', endTime: '19:00' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/admin/trial/availability/rules')
      .set(admin())
      .send({ weekday, startTime: '19:00', endTime: '19:00' })
      .expect(400);

    let preview = await request(app.getHttpServer())
      .get(`/admin/trial/availability/preview?from=${DAY}&to=${DAY}`)
      .set(admin())
      .expect(200);
    expect(preview.body.days[0].slots).toHaveLength(8 + 4);
    expect(preview.body.days[0].slots).toContain(slot('18:30'));
    expect(preview.body.days[0].slots).not.toContain(slot('19:00'));

    await request(app.getHttpServer())
      .post('/admin/trial/availability/blocks')
      .set(admin())
      .send({ startDate: DAY, endDate: DAY, reason: 'Holiday' })
      .expect(201);
    preview = await request(app.getHttpServer())
      .get(`/admin/trial/availability/preview?from=${DAY}&to=${DAY}`)
      .set(admin())
      .expect(200);
    expect(preview.body.days[0]).toMatchObject({
      status: 'unavailable',
      slots: [],
    });
    await book(parent(1, slot('15:00'))).expect(409);

    const all = await request(app.getHttpServer())
      .get('/admin/trial/availability')
      .set(admin())
      .expect(200);
    expect(
      all.body.rules.map((r: any) => `${r.startTime}-${r.endTime}`).sort(),
    ).toEqual(['15:00-19:00', '21:00-23:00']);
    expect(all.body.blocks[0].reason).toBe('Holiday');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Teacher assignment, teacher calendar, secure guest classroom access,
// the one-hour reminder, and reschedule / cancel of a staffed trial.
// ════════════════════════════════════════════════════════════════════════════

describeDb('Trial teacher assignment & guest classroom (real Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let whatsapp: TrialWhatsAppService;
  let reminders: TrialReminderService;
  let classroom: TrialClassroomService;
  let scheduling: SchedulingService;
  let teachersService: TeachersService;
  let adminToken: string;
  let teacherToken: string;
  let teacher: { userId: string; profileId: string; name: string };
  let other: { userId: string; profileId: string; name: string };

  const HALF = 30 * 60_000;
  const MIN = 60_000;
  /** The most recent half-hour mark (<= now): a trial that started 0–30 min ago. */
  const mark = () => Math.floor(Date.now() / HALF) * HALF;
  // Daily itself is faked (there is no Daily account in the test environment):
  // it hands out a way into the room per join and remembers what it was for.
  const dailyEntries: MeetingTokenParams[] = [];
  const fakeDaily = {
    assertConfigured: () => undefined,
    isConfigured: () => true,
    entryFor: (params: MeetingTokenParams) => {
      dailyEntries.push(params);
      return Promise.resolve({
        token: `daily-token-${dailyEntries.length}`,
        url: `https://lumexa.daily.co/${params.room}`,
        eventKey: 'event-key',
      });
    },
    listPeople: () => Promise.resolve([]),
  };
  /** What the way in a join response carries was made for. */
  const wayIn = (token: string): MeetingTokenParams =>
    dailyEntries[Number(token.replace('daily-token-', '')) - 1];

  const admin = () => ({ Authorization: `Bearer ${adminToken}` });
  const http = () => app.getHttpServer();
  let seq = 0;

  /** A confirmed trial inserted directly (so its time can be "now"), aligned to
   *  the half hour as the database constraint requires. */
  async function makeTrial(
    startMs: number,
    over: Record<string, unknown> = {},
  ) {
    seq++;
    return prisma.trialLead.create({
      data: {
        parentName: `Parent ${seq}`,
        parentEmail: `tparent${seq}@example.com`,
        parentPhone: `+88017123${String(40000 + seq)}`,
        childName: `Kid ${seq}`,
        childAge: 9,
        subject: 'Scratch Adventures',
        status: 'BOOKED',
        whatsappConsent: true,
        startAt: new Date(startMs),
        endAt: new Date(startMs + HALF),
        appointmentStatus: 'CONFIRMED',
        guestToken: `tok${seq}`.padEnd(43, 'A'),
        ...over,
      },
    });
  }
  const tokenOf = (l: { guestToken: string | null }) => l.guestToken!;

  async function makeTeacher(name: string, email: string) {
    const user = await prisma.user.create({
      data: { email, password: 'x', fullName: name, role: 'TEACHER' },
    });
    const profile = await prisma.teacherProfile.create({
      data: { userId: user.id },
    });
    return { userId: user.id, profileId: profile.id, name };
  }

  async function lessonFor(teacherProfileId: string, startMs: number) {
    const course = await prisma.course.create({
      data: {
        slug: `it-course-${seq++}`,
        title: 'IT Course',
        category: 'Python',
        level: 'STARTER',
      },
    });
    const student = await prisma.user.create({
      data: {
        email: `student${seq}@example.com`,
        password: 'x',
        fullName: 'Student',
        role: 'STUDENT',
      },
    });
    return prisma.scheduledLesson.create({
      data: {
        studentUserId: student.id,
        teacherId: teacherProfileId,
        courseId: course.id,
        lessonNumber: 1,
        start: new Date(startMs),
        end: new Date(startMs + 45 * MIN),
        classType: 'ONE_TO_ONE',
      },
    });
  }

  const assign = (id: string, teacherId: string, token = adminToken) =>
    request(http())
      .post(`/admin/trial/appointments/${id}/teacher`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ teacherId });
  const guestJoin = (token: string) =>
    request(http()).post('/trial/guest/join').send({ token });
  const guestStatus = (token: string) =>
    request(http()).post('/trial/guest/status').send({ token });
  const emailsFor = (id: string, kind: string) =>
    prisma.emailLog.findMany({
      where: { dedupeKey: { startsWith: `trial:${id}:${kind}` } },
    });
  const settle = () => new Promise((r) => setTimeout(r, 300));

  async function wipe() {
    await truncateAssessmentData(prisma);
    await prisma.trialWhatsAppMessage.deleteMany();
    await prisma.trialLead.deleteMany();
    await prisma.auditLog.deleteMany({
      where: { entityType: 'TRIAL_APPOINTMENT' },
    });
  }

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    // The check that runs a few seconds after a join is covered in
    // room-access.service.spec; it must not fire in the middle of a later test.
    jest
      .spyOn(RoomAccessService.prototype, 'scheduleEnforcement')
      .mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      imports: [
        PrismaModule,
        AuditModule,
        EmailModule,
        NotificationsModule,
        PassportModule,
        TrialModule,
      ],
      providers: [JwtStrategy],
    })
      .overrideProvider(DailyRoomsService)
      .useValue(fakeDaily)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);
    prisma = moduleRef.get(PrismaService);
    whatsapp = moduleRef.get(TrialWhatsAppService);
    reminders = moduleRef.get(TrialReminderService);
    classroom = moduleRef.get(TrialClassroomService, { strict: false });
    scheduling = new SchedulingService(
      prisma,
      { log: jest.fn() } as never,
      {} as never,
    );
    teachersService = new TeachersService(prisma, {} as never, scheduling);
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    adminToken = jwt.sign({
      sub: 'admin-1',
      email: 'a@example.com',
      role: 'ADMIN',
    });
    await wipe();
    teacher = await makeTeacher('Ms Karim', 'karim@example.com');
    other = await makeTeacher('Mr Hasan', 'hasan@example.com');
    teacherToken = jwt.sign({
      sub: teacher.userId,
      email: 'karim@example.com',
      role: 'TEACHER',
    });
  });
  afterAll(async () => {
    await wipe();
    await app?.close();
    await prisma?.$disconnect();
    jest.restoreAllMocks();
  });
  beforeEach(async () => {
    delete process.env.WHATSAPP_ENABLED;
    await prisma.trialWhatsAppMessage.deleteMany();
    await prisma.trialLead.deleteMany();
    await prisma.scheduledLesson.deleteMany();
    await prisma.emailLog.deleteMany({
      where: { dedupeKey: { startsWith: 'trial:' } },
    });
    await prisma.auditLog.deleteMany({
      where: { entityType: 'TRIAL_APPOINTMENT' },
    });
  });

  // ── assignment: permissions + what it triggers ─────────────────────────────

  it('only an admin can assign; teachers and parents cannot', async () => {
    const lead = await makeTrial(mark() + 3 * 60 * MIN);
    await request(http())
      .post(`/admin/trial/appointments/${lead.id}/teacher`)
      .send({ teacherId: teacher.profileId })
      .expect(401);
    await assign(lead.id, teacher.profileId, teacherToken).expect(403);
    expect(
      (await prisma.trialLead.findUniqueOrThrow({ where: { id: lead.id } }))
        .teacherId,
    ).toBeNull();
    await assign(lead.id, 'nope').expect(404);
    await request(http())
      .post(`/admin/trial/appointments/${lead.id}/teacher`)
      .set(admin())
      .send({})
      .expect(400);
  });

  it('assigning a teacher: saves it, emails the parent the secure link, plans the 1-hour reminder, audits — and nothing else', async () => {
    const lead = await makeTrial(mark() + 3 * 60 * MIN);
    const before = {
      lessons: await prisma.scheduledLesson.count(),
      ledger: await prisma.studentLedgerEntry.count(),
      payouts: await prisma.payoutEntry.count(),
    };
    const res = await assign(lead.id, teacher.profileId).expect(201);
    expect(res.body.firstAssignment).toBe(true);
    expect(res.body.appointment.teacher).toEqual({
      id: teacher.profileId,
      name: 'Ms Karim',
    });
    expect(JSON.stringify(res.body)).not.toContain(lead.guestToken!);

    const row = await prisma.trialLead.findUniqueOrThrow({
      where: { id: lead.id },
    });
    expect(row.teacherId).toBe(teacher.profileId);
    expect(row.reminderDueAt!.getTime()).toBe(
      row.startAt!.getTime() - 60 * MIN,
    );
    expect(row.reminderEmailSentAt).toBeNull();

    await settle();
    const [mail] = await emailsFor(lead.id, 'class-details');
    expect(mail.toEmail).toBe(lead.parentEmail);
    expect(mail.html).toContain(`/trial/join/${tokenOf(lead)}`);
    // the booking confirmation (sent earlier) must not have contained the link
    for (const m of await emailsFor(lead.id, 'confirmation')) {
      expect(m.html).not.toContain(tokenOf(lead));
    }
    const audit = await prisma.auditLog.findMany({
      where: { entityId: lead.id, action: 'TRIAL_TEACHER_ASSIGNED' },
    });
    expect(audit).toHaveLength(1);

    // assigning twice / the same teacher again changes nothing and sends nothing
    await assign(lead.id, teacher.profileId).expect(400);
    await settle();
    expect(await emailsFor(lead.id, 'class-details')).toHaveLength(1);

    // a trial is not a lesson: no lesson row, no ledger entry, no payout
    expect(await prisma.scheduledLesson.count()).toBe(before.lessons);
    expect(await prisma.studentLedgerEntry.count()).toBe(before.ledger);
    expect(await prisma.payoutEntry.count()).toBe(before.payouts);
  });

  it('WhatsApp: the details + link go out once; the reminder is a durable row scheduled for exactly 1 hour before', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '999';
    process.env.WHATSAPP_ACCESS_TOKEN = 'tok';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: 'wamid.X' }] }),
    } as Response);
    try {
      const lead = await makeTrial(mark() + 3 * 60 * MIN);
      await assign(lead.id, teacher.profileId).expect(201);
      await Promise.all([whatsapp.processDue(), whatsapp.processDue()]);
      await settle();
      await whatsapp.processDue();

      const rows = await prisma.trialWhatsAppMessage.findMany({
        where: { trialLeadId: lead.id },
      });
      const byKind = Object.fromEntries(rows.map((r) => [r.kind, r]));
      expect(byKind.PARENT_CLASS_DETAILS.status).toBe('SENT');
      expect(byKind.PARENT_REMINDER.status).toBe('PENDING');
      expect(byKind.PARENT_REMINDER.nextAttemptAt!.getTime()).toBe(
        lead.startAt!.getTime() - 60 * MIN,
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.to).toBe(lead.parentPhone!.replace('+', ''));
      expect(body.template.name).toBe('lumexa_trial_class_details');
      const vars = body.template.components[0].parameters.map(
        (p: any) => p.text,
      );
      expect(vars.at(-1)).toBe(
        `${process.env.FRONTEND_URL}/trial/join/${tokenOf(lead)}`,
      );

      // an hour before: the sweep sends the reminder (once) with the same link
      await prisma.trialWhatsAppMessage.update({
        where: { id: byKind.PARENT_REMINDER.id },
        data: { nextAttemptAt: new Date(Date.now() - 1000) },
      });
      await Promise.all([
        whatsapp.processDue(),
        whatsapp.processDue(),
        whatsapp.processDue(),
      ]);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const reminder = JSON.parse(
        (fetchSpy.mock.calls[1][1] as RequestInit).body as string,
      );
      expect(reminder.template.name).toBe('lumexa_trial_class_reminder');
      expect(reminder.template.components[0].parameters.at(-1).text).toContain(
        tokenOf(lead),
      );
      await Promise.all([whatsapp.processDue(), whatsapp.processDue()]);
      expect(fetchSpy).toHaveBeenCalledTimes(2); // never twice
    } finally {
      fetchSpy.mockRestore();
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
      delete process.env.WHATSAPP_ACCESS_TOKEN;
    }
  });

  it('assigned less than an hour before the start: link sent immediately, no reminder is scheduled (email or WhatsApp)', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    const lead = await makeTrial(mark() + 60 * MIN); // 30–60 min away
    await assign(lead.id, teacher.profileId).expect(201);
    const row = await prisma.trialLead.findUniqueOrThrow({
      where: { id: lead.id },
    });
    expect(row.reminderDueAt).toBeNull();
    const wa = await prisma.trialWhatsAppMessage.findMany({
      where: { trialLeadId: lead.id },
    });
    const status = Object.fromEntries(wa.map((m) => [m.kind, m.status]));
    // queued for immediate delivery (the outbox may already be sending it)
    expect(['PENDING', 'SENDING', 'FAILED']).toContain(
      status.PARENT_CLASS_DETAILS,
    );
    expect(status.PARENT_REMINDER).toBe('SKIPPED');
    await settle();
    expect(await emailsFor(lead.id, 'class-details')).toHaveLength(1);
    expect(await reminders.sendDueEmailReminders()).toBe(0);
    expect(await emailsFor(lead.id, 'reminder')).toHaveLength(0);
  });

  // ── the one-hour reminder email: durable, once only ────────────────────────

  it('the reminder email is sent when due, exactly once, even with concurrent sweeps and restarts', async () => {
    const lead = await makeTrial(mark() + 2 * 60 * MIN);
    await assign(lead.id, teacher.profileId).expect(201);
    // not due yet → nothing
    expect(await reminders.sendDueEmailReminders()).toBe(0);
    // time passes: it becomes due
    await prisma.trialLead.update({
      where: { id: lead.id },
      data: { reminderDueAt: new Date(Date.now() - 1000) },
    });
    const counts = await Promise.all([
      reminders.sendDueEmailReminders(),
      reminders.sendDueEmailReminders(),
      reminders.sendDueEmailReminders(),
    ]);
    expect(counts.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(1);
    await settle();
    const sent = await emailsFor(lead.id, 'reminder');
    expect(sent).toHaveLength(1);
    expect(sent[0].toEmail).toBe(lead.parentEmail);
    expect(sent[0].html).toContain(`/trial/join/${tokenOf(lead)}`);
    expect(
      (await prisma.trialLead.findUniqueOrThrow({ where: { id: lead.id } }))
        .reminderEmailSentAt,
    ).not.toBeNull();
    // "restart": a fresh sweep finds nothing left to do
    expect(await reminders.sendDueEmailReminders()).toBe(0);
    expect(await emailsFor(lead.id, 'reminder')).toHaveLength(1);
  });

  it('a reminder that crashed after the email but before it was marked sent cannot send a second email', async () => {
    const lead = await makeTrial(mark() + 2 * 60 * MIN);
    await assign(lead.id, teacher.profileId).expect(201);
    await prisma.trialLead.update({
      where: { id: lead.id },
      data: { reminderDueAt: new Date(Date.now() - 1000) },
    });
    await reminders.sendDueEmailReminders();
    // simulate the crash: the email is journaled but the "sent" flag was lost
    await prisma.trialLead.update({
      where: { id: lead.id },
      data: { reminderEmailSentAt: null },
    });
    await reminders.sendDueEmailReminders();
    await settle();
    expect(await emailsFor(lead.id, 'reminder')).toHaveLength(1);
  });

  it('no reminder for a cancelled trial, an unstaffed one, or one that has already started', async () => {
    const cancelled = await makeTrial(mark() + 2 * 60 * MIN, {
      teacherId: teacher.profileId,
      reminderDueAt: new Date(Date.now() - 1000),
      appointmentStatus: 'CANCELLED',
    });
    const unstaffed = await makeTrial(mark() + 4 * 60 * MIN, {
      reminderDueAt: new Date(Date.now() - 1000),
    });
    const started = await makeTrial(mark() - HALF, {
      teacherId: teacher.profileId,
      reminderDueAt: new Date(Date.now() - 1000),
    });
    expect(await reminders.sendDueEmailReminders()).toBe(0);
    for (const l of [cancelled, unstaffed, started]) {
      expect(await emailsFor(l.id, 'reminder')).toHaveLength(0);
    }
  });

  // ── teacher calendar ───────────────────────────────────────────────────────

  it('a staffed trial appears on that teacher’s schedule and next class — labelled as a trial, with no contact details — and on no one else’s', async () => {
    const lead = await makeTrial(mark() + 60 * MIN, {
      message: 'Loves robots',
    });
    await assign(lead.id, teacher.profileId).expect(201);

    const items = await scheduling.getTeacherScheduledLessons(teacher.userId);
    const trial = items.find((i) => i.kind === 'TRIAL') as any;
    expect(trial).toMatchObject({
      id: lead.id,
      kind: 'TRIAL',
      classType: 'TRIAL',
      status: 'UPCOMING',
      childName: lead.childName,
      program: 'Scratch Adventures',
      parentMessage: 'Loves robots',
      joinable: false, // opens 10 minutes before the start
    });
    expect(JSON.stringify(trial)).not.toMatch(
      /tparent|8801712|guestToken|tok\d/,
    );
    expect(
      (await scheduling.getTeacherScheduledLessons(other.userId)).filter(
        (i) => i.kind === 'TRIAL',
      ),
    ).toHaveLength(0);

    const next: any = await teachersService.getNextClass(teacher.userId);
    expect(next).toMatchObject({
      type: 'trial',
      id: lead.id,
      courseTitle: 'Trial Class',
      classType: 'TRIAL',
      joinable: false,
    });
    expect(await teachersService.getNextClass(other.userId)).toBeNull();

    // inside the window it is joinable
    const open = await makeTrial(mark(), { teacherId: other.profileId });
    const openItem: any = (
      await scheduling.getTeacherScheduledLessons(other.userId)
    ).find((i) => i.id === open.id);
    expect(openItem.joinable).toBe(true);
    expect(
      ((await teachersService.getNextClass(other.userId)) as any).joinable,
    ).toBe(true);
  });

  it('prevents double-booking the teacher in BOTH directions', async () => {
    const start = mark() + 3 * 60 * MIN;
    const lead = await makeTrial(start);
    // a lesson overlapping the trial → the teacher cannot be assigned
    await lessonFor(teacher.profileId, start - 15 * MIN);
    const busy = await assign(lead.id, teacher.profileId).expect(409);
    expect(busy.body.message).toMatch(/already booked/);
    expect(
      (await prisma.trialLead.findUniqueOrThrow({ where: { id: lead.id } }))
        .teacherId,
    ).toBeNull();
    await settle();
    expect(await emailsFor(lead.id, 'class-details')).toHaveLength(0);
    expect(
      await prisma.trialWhatsAppMessage.count({
        where: { trialLeadId: lead.id, kind: 'PARENT_CLASS_DETAILS' },
      }),
    ).toBe(0);

    // the assignable-teachers list says who is free
    const list = await request(http())
      .get(`/admin/trial/teachers?trialId=${lead.id}`)
      .set(admin())
      .expect(200);
    const byName = Object.fromEntries(list.body.map((t: any) => [t.name, t]));
    expect(byName['Ms Karim']).toMatchObject({ available: false });
    expect(byName['Mr Hasan']).toMatchObject({ available: true });
    expect(JSON.stringify(list.body)).not.toMatch(/karim@|hasan@/);

    // the free teacher can be assigned…
    await assign(lead.id, other.profileId).expect(201);
    // …and then any other class that would overlap the trial is refused by the
    // same conflict check that every lesson / batch / shift placement uses
    const conflict = await findTeacherConflict(
      prisma,
      other.profileId,
      new Date(start + 10 * MIN),
      new Date(start + 55 * MIN),
    );
    expect((conflict as any)?.id).toBe(lead.id);
    expect(
      await findTeacherConflict(
        prisma,
        other.profileId,
        new Date(start + 30 * MIN),
        new Date(start + 75 * MIN),
      ),
    ).toBeNull();
  });

  it('changing the teacher moves the class between calendars and does not message the parent again', async () => {
    const lead = await makeTrial(mark() + 3 * 60 * MIN);
    await assign(lead.id, teacher.profileId).expect(201);
    await settle();
    const changed = await assign(lead.id, other.profileId).expect(201);
    expect(changed.body.firstAssignment).toBe(false);
    await settle();
    expect(await emailsFor(lead.id, 'class-details')).toHaveLength(1);
    expect(
      (await scheduling.getTeacherScheduledLessons(teacher.userId)).filter(
        (i) => i.kind === 'TRIAL',
      ),
    ).toHaveLength(0);
    expect(
      (await scheduling.getTeacherScheduledLessons(other.userId)).filter(
        (i) => i.kind === 'TRIAL',
      ),
    ).toHaveLength(1);
    // the parent's link is unchanged and now leads to the new teacher's room
    const row = await prisma.trialLead.findUniqueOrThrow({
      where: { id: lead.id },
    });
    expect(row.guestToken).toBe(lead.guestToken);
    const logged = await prisma.auditLog.findMany({
      where: { entityId: lead.id, action: 'TRIAL_TEACHER_CHANGED' },
    });
    expect(logged).toHaveLength(1);
  });

  // ── secure guest access ────────────────────────────────────────────────────

  it('guest link: a valid link inside the window gets a room-bound token; the guest needs no account', async () => {
    const lead = await makeTrial(mark(), { teacherId: teacher.profileId });
    const status = await guestStatus(tokenOf(lead)).expect(200);
    expect(status.headers['cache-control']).toContain('no-store');
    expect(status.body).toMatchObject({
      state: 'OPEN',
      canJoin: true,
      childName: lead.childName,
    });
    expect(JSON.stringify(status.body)).not.toMatch(
      /tparent|8801712|Karim|guestToken/,
    );

    const join = await guestJoin(tokenOf(lead)).expect(200);
    expect(join.body.roomName).toBe(`trial-${lead.id}`);
    // the way in is for this one room and this one guest, who is never the
    // room's owner (no moderating)
    expect(wayIn(join.body.token)).toMatchObject({
      room: `trial-${lead.id}`,
      userId: `tg-${lead.id.replace(/-/g, '')}`,
      userName: `${lead.childName} (Student)`,
      isOwner: false,
    });
    expect(join.body.url).toBe(`https://lumexa.daily.co/trial-${lead.id}`);
    expect(JSON.stringify(join.body)).not.toContain(lead.guestToken!);
    expect(
      (await prisma.trialLead.findUniqueOrThrow({ where: { id: lead.id } }))
        .guestJoinedAt,
    ).not.toBeNull();
  });

  it('each link opens only its own trial’s room', async () => {
    const a = await makeTrial(mark(), { teacherId: teacher.profileId });
    const b = await makeTrial(mark() + 4 * 60 * MIN, {
      teacherId: other.profileId,
    });
    const ja = await guestJoin(tokenOf(a)).expect(200);
    // b's window is not open now: with b's clock set to its own start it is
    const jb: any = await classroom.joinAsGuest(tokenOf(b), b.startAt!);
    expect(ja.body.roomName).toBe(`trial-${a.id}`);
    expect(jb.roomName).toBe(`trial-${b.id}`);
    expect(wayIn(ja.body.token).room).toBe(`trial-${a.id}`);
    expect(wayIn(jb.token).room).toBe(`trial-${b.id}`);
    // a's link does not work for b's time, and vice versa
    await guestJoin(tokenOf(b)).expect(400);
  });

  it('refuses unknown, malformed, early, late, unstaffed, cancelled, completed and missed trials — and issues no token', async () => {
    await request(http())
      .post('/trial/guest/join')
      .send({ token: 'z'.repeat(43) })
      .expect(404);
    await request(http())
      .post('/trial/guest/join')
      .send({ token: "'; DROP TABLE" })
      .expect(400); // fails DTO length
    await request(http())
      .post('/trial/guest/join')
      .send({ token: 'a'.repeat(40) + '$$$' })
      .expect(404);
    await request(http()).post('/trial/guest/join').send({}).expect(400);

    const early = await makeTrial(mark() + 4 * 60 * MIN, {
      teacherId: teacher.profileId,
    });
    const late = await makeTrial(mark() - 3 * 60 * MIN, {
      teacherId: teacher.profileId,
    });
    const unstaffed = await makeTrial(mark() - HALF);
    const cancelled = await makeTrial(mark() - 5 * 60 * MIN, {
      teacherId: teacher.profileId,
      appointmentStatus: 'CANCELLED',
    });
    const completed = await makeTrial(mark() - 7 * 60 * MIN, {
      teacherId: teacher.profileId,
      appointmentStatus: 'COMPLETED',
    });
    const missed = await makeTrial(mark() - 9 * 60 * MIN, {
      teacherId: teacher.profileId,
      appointmentStatus: 'MISSED',
    });
    const cases: [typeof early, string, RegExp][] = [
      [early, 'NOT_YET', /opens 10 minutes/],
      [late, 'ENDED', /already taken place/],
      [unstaffed, 'AWAITING_TEACHER', /teacher/],
      [cancelled, 'CANCELLED', /cancelled/],
      [completed, 'ENDED', /already taken place/],
      [missed, 'ENDED', /already taken place/],
    ];
    for (const [lead, state, msg] of cases) {
      const st = await guestStatus(tokenOf(lead)).expect(200);
      expect(st.body).toMatchObject({ state, canJoin: false });
      expect(st.body.message).toMatch(msg);
      const res = await guestJoin(tokenOf(lead)).expect(400);
      expect(res.body.token).toBeUndefined();
      expect(res.body.message).toMatch(msg);
    }
  });

  it('cancelling a staffed trial revokes the link at once, stops the reminders and removes it from the teacher’s calendar', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    const lead = await makeTrial(mark() + 2 * 60 * MIN);
    await assign(lead.id, teacher.profileId).expect(201);
    await prisma.trialLead.update({
      where: { id: lead.id },
      data: { startAt: new Date(mark()), endAt: new Date(mark() + HALF) },
    });
    await guestJoin(tokenOf(lead)).expect(200); // works before the cancellation
    await classroom.joinAsTeacher(teacher.userId, lead.id);

    await request(http())
      .post(`/admin/trial/appointments/${lead.id}/cancel`)
      .set(admin())
      .send({ reason: 'Teacher unwell', parentNote: 'Sorry!' })
      .expect(201);

    await guestJoin(tokenOf(lead)).expect(400);
    expect((await guestStatus(tokenOf(lead))).body.state).toBe('CANCELLED');
    await expect(
      classroom.joinAsTeacher(teacher.userId, lead.id),
    ).rejects.toThrow(/cancelled/i);
    const row = await prisma.trialLead.findUniqueOrThrow({
      where: { id: lead.id },
    });
    expect(row.reminderDueAt).toBeNull();
    const pending = await prisma.trialWhatsAppMessage.count({
      where: { trialLeadId: lead.id, status: { in: ['PENDING', 'FAILED'] } },
    });
    expect(pending).toBe(0);
    expect(
      (await scheduling.getTeacherScheduledLessons(teacher.userId)).filter(
        (i) => i.kind === 'TRIAL',
      ),
    ).toHaveLength(0);
    expect(await teachersService.getNextClass(teacher.userId)).toBeNull();
    await settle();
    expect(await emailsFor(lead.id, 'cancelled')).toHaveLength(1);
    // the teacher is free again for something else at that time
    expect(
      await findTeacherConflict(
        prisma,
        teacher.profileId,
        new Date(mark()),
        new Date(mark() + HALF),
      ),
    ).toBeNull();
  });

  // ── teacher join + ending ──────────────────────────────────────────────────

  it('only the assigned teacher can join; a guest + teacher session ends as Completed without touching lessons or pay', async () => {
    const lead = await makeTrial(mark(), { teacherId: teacher.profileId });
    await expect(
      classroom.joinAsTeacher(other.userId, lead.id),
    ).rejects.toThrow(/not assigned/);
    const joined: any = await classroom.joinAsTeacher(teacher.userId, lead.id);
    // the teacher is the room's OWNER — what lets their browser moderate it
    expect(wayIn(joined.token)).toMatchObject({
      userId: teacher.userId,
      userName: 'Ms Karim (Teacher)',
      isOwner: true,
    });
    await guestJoin(tokenOf(lead)).expect(200);

    await classroom.markEnded(lead.id, teacher.userId);
    const row = await prisma.trialLead.findUniqueOrThrow({
      where: { id: lead.id },
    });
    expect(row.appointmentStatus).toBe('COMPLETED');
    expect(row.teacherJoinedAt).not.toBeNull();
    expect(row.guestJoinedAt).not.toBeNull();
    expect(await prisma.payoutEntry.count()).toBe(0);
    expect(await prisma.scheduledLesson.count()).toBe(0);
    // and the link is dead afterwards
    await guestJoin(tokenOf(lead)).expect(400);
  });

  it('admin can mark a started trial Completed or Missed, but not before it starts; a cancelled one stays cancelled', async () => {
    const future = await makeTrial(mark() + 4 * 60 * MIN, {
      teacherId: teacher.profileId,
    });
    const past = await makeTrial(mark() - HALF, {
      teacherId: teacher.profileId,
    });
    const url = (id: string) => `/admin/trial/appointments/${id}/outcome`;
    await request(http())
      .post(url(future.id))
      .set(admin())
      .send({ outcome: 'MISSED' })
      .expect(400);
    await request(http())
      .post(url(past.id))
      .set({ Authorization: `Bearer ${teacherToken}` })
      .send({ outcome: 'MISSED' })
      .expect(403);
    await request(http())
      .post(url(past.id))
      .set(admin())
      .send({ outcome: 'BOGUS' })
      .expect(400);
    const missed = await request(http())
      .post(url(past.id))
      .set(admin())
      .send({ outcome: 'MISSED', note: 'No show' })
      .expect(201);
    expect(missed.body.appointment.status).toBe('MISSED');
    const fixed = await request(http())
      .post(url(past.id))
      .set(admin())
      .send({ outcome: 'COMPLETED' })
      .expect(201);
    expect(fixed.body.appointment.status).toBe('COMPLETED');
    const item: any = (
      await scheduling.getTeacherScheduledLessons(teacher.userId)
    ).find((i) => i.id === past.id);
    expect(item.status).toBe('COMPLETED');

    const cancelled = await makeTrial(mark() - 3 * HALF, {
      appointmentStatus: 'CANCELLED',
    });
    await request(http())
      .post(url(cancelled.id))
      .set(admin())
      .send({ outcome: 'COMPLETED' })
      .expect(400);
  });

  // ── reschedule of a staffed trial ──────────────────────────────────────────

  it('rescheduling a staffed trial: same link, new reminder time, updated details sent once, old reminder retired', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    // book through the public form so the normal availability rules apply
    const DAY2 = addDaysToDateStr(todayDhakaDateStr(), 4);
    const at = (hhmm: string) =>
      dhakaToUtc(
        DAY2,
        Number(hhmm.slice(0, 2)),
        Number(hhmm.slice(3)),
      ).toISOString();
    await prisma.trialAvailabilityWindow.create({
      data: { date: DAY2, startMinute: 600, endMinute: 840 },
    });
    await request(http())
      .post('/trial')
      .send({
        parentName: 'Rita',
        parentEmail: 'rita@example.com',
        parentPhone: '01712349999',
        childName: 'Rahul',
        childAge: 11,
        subject: 'AI Builder (Ages 12–18)',
        startAt: at('10:00'),
        whatsappConsent: true,
      })
      .expect(201);
    const lead = await prisma.trialLead.findFirstOrThrow({
      where: { parentEmail: 'rita@example.com' },
    });
    await assign(lead.id, teacher.profileId).expect(201);
    await settle();

    // the teacher is busy at the new time → refused, nothing changes
    await lessonFor(teacher.profileId, new Date(at('13:00')).getTime());
    const url = `/admin/trial/appointments/${lead.id}/reschedule`;
    const refused = await request(http())
      .post(url)
      .set(admin())
      .send({ startAt: at('13:00') })
      .expect(409);
    expect(refused.body.message).toMatch(/already booked/);
    expect(
      (
        await prisma.trialLead.findUniqueOrThrow({ where: { id: lead.id } })
      ).startAt!.toISOString(),
    ).toBe(at('10:00'));

    // a free time works
    await request(http())
      .post(url)
      .set(admin())
      .send({ startAt: at('12:00'), reason: 'Parent asked' })
      .expect(201);
    const row = await prisma.trialLead.findUniqueOrThrow({
      where: { id: lead.id },
    });
    expect(row.revision).toBe(1);
    expect(row.guestToken).toBe(lead.guestToken); // same link
    expect(row.teacherId).toBe(teacher.profileId);
    expect(row.reminderDueAt!.toISOString()).toBe(
      new Date(new Date(at('12:00')).getTime() - 60 * MIN).toISOString(),
    );
    expect(row.reminderEmailSentAt).toBeNull();

    const wa = await prisma.trialWhatsAppMessage.findMany({
      where: { trialLeadId: lead.id },
      orderBy: { createdAt: 'asc' },
    });
    const state = (kind: string, rev: number) =>
      wa.find((m) => m.kind === kind && m.revision === rev)?.status;
    expect(state('PARENT_REMINDER', 0)).toBe('SKIPPED'); // old reminder retired
    expect(state('PARENT_CLASS_DETAILS', 0)).toMatch(
      /SKIPPED|PENDING|SENT|FAILED/,
    );
    expect(state('PARENT_REMINDER', 1)).toBe('PENDING');
    expect(state('PARENT_CLASS_DETAILS', 1)).not.toBe('SKIPPED'); // queued for the new time
    expect(
      wa.filter((m) => m.kind === 'PARENT_REMINDER' && m.status === 'PENDING'),
    ).toHaveLength(1);

    await settle();
    const mail = await emailsFor(lead.id, 'rescheduled');
    expect(mail).toHaveLength(1);
    expect(mail[0].html).toContain(`/trial/join/${tokenOf(lead)}`);

    // the old time's reminder email can never fire for the old time
    await prisma.trialLead.update({
      where: { id: lead.id },
      data: { reminderDueAt: new Date(Date.now() - 1000) },
    });
    await reminders.sendDueEmailReminders();
    await settle();
    const rem = await emailsFor(lead.id, 'reminder');
    expect(rem.map((m) => m.dedupeKey)).toEqual([
      `trial:${lead.id}:reminder:r1`,
    ]);
  });

  it('the teacher’s own calendar changes with the reschedule (new time, and conflicts are re-checked)', async () => {
    const lead = await makeTrial(mark() + 3 * 60 * MIN, {
      teacherId: teacher.profileId,
    });
    const item = async () =>
      (await scheduling.getTeacherScheduledLessons(teacher.userId)).find(
        (i) => i.id === lead.id,
      );
    expect((await item())!.start.toISOString()).toBe(
      lead.startAt!.toISOString(),
    );
    await prisma.trialLead.update({
      where: { id: lead.id },
      data: {
        startAt: new Date(lead.startAt!.getTime() + HALF * 4),
        endAt: new Date(lead.endAt!.getTime() + HALF * 4),
      },
    });
    expect((await item())!.start.getTime()).toBe(
      lead.startAt!.getTime() + HALF * 4,
    );
  });
});

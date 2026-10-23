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
import { TrialModule } from './trial.module';
import { TrialWhatsAppService } from './trial-whatsapp.service';
import { isSlotConflictError } from './trial-booking.service';
import {
  addDaysToDateStr,
  dhakaToUtc,
  todayDhakaDateStr,
} from '../scheduling/dhaka-time.util';

const describeDb = DB_URL ? describe : describe.skip;

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
    expect(wa).toHaveLength(3);
    expect(wa.every((m) => m.status === 'SKIPPED')).toBe(true);
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
      'PARENT_REMINDER',
    ]);
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

  it('WhatsApp enabled: confirmation + admin alert are sent exactly once even with concurrent sweeps; reminder is scheduled, not sent', async () => {
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
      expect(byKind.PARENT_REMINDER.status).toBe('PENDING');
      expect(byKind.PARENT_REMINDER.nextAttemptAt!.getTime()).toBeGreaterThan(
        Date.now(),
      );

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

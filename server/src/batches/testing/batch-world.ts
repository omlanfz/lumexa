// FILE PATH: server/src/batches/testing/batch-world.ts
//
// The services and the people of the batch integration specs, wired by hand
// against a REAL Postgres: the real batch, scheduling, payout, ledger and
// finalization services; fakes only for what leaves the process (email, alerts
// and the video room).

import { Role } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { ClassFinalizationService } from '../../classroom/class-finalization.service';
import { PayoutsService } from '../../payouts/payouts.service';
import { PrismaService } from '../../prisma.service';
import { SchedulingService } from '../../scheduling/scheduling.service';
import { utcToDhakaParts } from '../../scheduling/dhaka-time.util';
import { StudentProgressService } from '../../students/progress/student-progress.service';
import { StudentLedgerService } from '../../students/student-ledger.service';
import { BatchSessionsService } from '../batch-sessions.service';
import { BatchesService } from '../batches.service';

export interface Person {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  /** Teachers only. */
  profileId?: string;
}

/** Every method resolves — the way the real notification service never throws
 * into the code that sends. Calls are recorded for assertions. */
export function fakeNotifications() {
  const fns = new Map<string, jest.Mock>();
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (!fns.has(prop)) {
          fns.set(
            prop,
            jest.fn(() => Promise.resolve()),
          );
        }
        return fns.get(prop);
      },
    },
  ) as Record<string, jest.Mock>;
}

export interface BatchWorld {
  prisma: PrismaService;
  audit: AuditService;
  notifications: Record<string, jest.Mock>;
  alerts: { create: jest.Mock };
  ledger: StudentLedgerService;
  payouts: PayoutsService;
  scheduling: SchedulingService;
  sessions: BatchSessionsService;
  batches: BatchesService;
  finalization: ClassFinalizationService;
  recording: {
    stopActiveSegmentIfAny: jest.Mock;
    finalizeAtClassEnd: jest.Mock;
  };
}

export function buildBatchWorld(prisma: PrismaService): BatchWorld {
  const audit = new AuditService(prisma);
  const notifications = fakeNotifications();
  const alerts = { create: jest.fn(() => Promise.resolve()) };
  const recording = {
    stopActiveSegmentIfAny: jest.fn(() => Promise.resolve()),
    finalizeAtClassEnd: jest.fn(() => Promise.resolve()),
  };
  const ledger = new StudentLedgerService(prisma, audit);
  const payouts = new PayoutsService(prisma, audit, alerts as never);
  const scheduling = new SchedulingService(
    prisma,
    audit,
    notifications as never,
  );
  const sessions = new BatchSessionsService(
    prisma,
    audit,
    notifications as never,
  );
  const batches = new BatchesService(
    prisma,
    audit,
    notifications as never,
    sessions,
    ledger,
  );
  const finalization = new ClassFinalizationService(
    prisma,
    audit,
    alerts as never,
    notifications as never,
    payouts,
    ledger,
    scheduling,
    recording as never,
    sessions,
    // No video provider in these tests: closing a room is a no-op.
    { deleteRoom: () => Promise.resolve() } as never,
    new StudentProgressService(prisma, notifications as never),
  );
  return {
    prisma,
    audit,
    notifications,
    alerts,
    ledger,
    payouts,
    scheduling,
    sessions,
    batches,
    finalization,
    recording,
  };
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/** A first class date `daysAhead` days from now (an Asia/Dhaka calendar date)
 * with one weekly slot at `time` on that weekday. */
export function weeklyFrom(daysAhead: number, time = '17:00') {
  const d = utcToDhakaParts(new Date(Date.now() + daysAhead * 86_400_000));
  return {
    firstClassDate: d.dateStr,
    slots: [{ weekday: d.weekday, time }],
  };
}

/** The same weekday as `weeklyFrom(daysAhead)`, one more slot at `time`. */
export function weeklyWithSlots(daysAhead: number, times: string[]) {
  const d = utcToDhakaParts(new Date(Date.now() + daysAhead * 86_400_000));
  return {
    firstClassDate: d.dateStr,
    slots: times.map((time) => ({ weekday: d.weekday, time })),
  };
}

// ─── People and the curriculum ───────────────────────────────────────────────

let seq = 0;
const unique = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export async function makeUser(
  prisma: PrismaService,
  name: string,
  role: Role,
  extra: Record<string, unknown> = {},
): Promise<Person> {
  const email = `${name}-${unique()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      password: 'not-a-real-hash',
      fullName: name.replace(/-/g, ' '),
      role,
      ...extra,
    },
  });
  let profileId: string | undefined;
  if (role === Role.TEACHER) {
    profileId = (
      await prisma.teacherProfile.create({ data: { userId: user.id } })
    ).id;
  }
  return { id: user.id, email, role, fullName: user.fullName, profileId };
}

/** A small curriculum: `lessons` catalog lessons, numbered 1..lessons. */
export async function makeCourse(
  prisma: PrismaService,
  slug: string,
  lessons = 6,
) {
  const course = await prisma.course.create({
    data: {
      slug: `${slug}-${unique()}`,
      title: slug.replace(/-/g, ' '),
      category: 'Python',
      level: 'STARTER',
      sessions: lessons,
      priceCents: lessons * 100_000,
    },
  });
  for (let order = 1; order <= lessons; order++) {
    await prisma.lesson.create({
      data: {
        courseId: course.id,
        title: `Lesson ${order}`,
        order,
        homework: order % 2 === 0 ? `Homework ${order}` : null,
      },
    });
  }
  return course;
}

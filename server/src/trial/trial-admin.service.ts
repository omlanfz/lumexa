// FILE PATH: server/src/trial/trial-admin.service.ts
//
// Read side of the admin "Trial Classes" section: the appointment list /
// calendar feed, one appointment's full detail (with notification status and
// audit trail), internal notes, and WhatsApp retry. Everything returned here
// contains parent contact details, so it is only ever reachable through the
// ADMIN-guarded controller — never through the public trial endpoints.

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type TrialLead,
  type TrialWhatsAppMessage,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { addDaysToDateStr, dhakaToUtc } from '../scheduling/dhaka-time.util';
import { findTeacherConflict } from '../scheduling/teacher-conflict.util';
import { TRIAL_TIMEZONE, TRIAL_TIMEZONE_LABEL } from './trial.constants';
import { joinWindow, trialAccessState } from './trial-access.util';
import {
  isCoveredByAvailability,
  isValidDateStr,
  type AvailabilityConfig,
} from './trial-slots.util';
import { bookingReference } from './trial-notifications.service';
import { TrialBookingService } from './trial-booking.service';
import { TrialWhatsAppService } from './trial-whatsapp.service';
import { TRIAL_DURATION_MINUTES } from './trial.constants';

const TRIAL_SESSION_MS = TRIAL_DURATION_MINUTES * 60_000;

export interface AppointmentListParams {
  from?: string;
  to?: string;
  status?: string;
  scope?: string;
  /** "unassigned" or a TeacherProfile id. */
  teacher?: string;
  q?: string;
  page: number;
  limit: number;
}

/** A trial with the assigned teacher's name loaded. */
type WithTeacher = TrialLead & {
  teacher?: { id: string; user: { fullName: string } } | null;
};

const TEACHER_INCLUDE = {
  teacher: { select: { id: true, user: { select: { fullName: true } } } },
} as const;

const STATUS_FILTERS = ['CONFIRMED', 'CANCELLED', 'COMPLETED', 'MISSED'];

const EMAIL_KINDS = [
  {
    key: (id: string) => `trial:${id}:confirmation:parent`,
    kind: 'PARENT_CONFIRMATION',
  },
  { key: (id: string) => `trial:${id}:admin-alert`, kind: 'ADMIN_ALERT' },
  { key: (id: string) => `trial:${id}:cancelled`, kind: 'PARENT_CANCELLED' },
] as const;

type Appointment = TrialLead & { startAt: Date; endAt: Date };

interface EmailRow {
  dedupeKey: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  sentAt: Date | null;
}

@Injectable()
export class TrialAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly booking: TrialBookingService,
    private readonly whatsapp: TrialWhatsAppService,
  ) {}

  private emailKeysFor(lead: TrialLead): { key: string; kind: string }[] {
    const keys: { key: string; kind: string }[] = EMAIL_KINDS.map((e) => ({
      key: e.key(lead.id),
      kind: e.kind,
    }));
    for (let r = 0; r <= lead.revision; r++) {
      keys.push(
        {
          key: `trial:${lead.id}:class-details:r${r}`,
          kind: 'PARENT_CLASS_DETAILS',
        },
        { key: `trial:${lead.id}:reminder:r${r}`, kind: 'PARENT_REMINDER' },
      );
      if (r > 0) {
        keys.push({
          key: `trial:${lead.id}:rescheduled:r${r}`,
          kind: 'PARENT_RESCHEDULED',
        });
      }
    }
    return keys;
  }

  private async emailStatuses(
    leads: TrialLead[],
  ): Promise<Map<string, EmailRow>> {
    const wanted = leads.flatMap((l) => this.emailKeysFor(l));
    if (wanted.length === 0) return new Map<string, EmailRow>();
    const rows = await this.prisma.emailLog.findMany({
      where: { dedupeKey: { in: wanted.map((w) => w.key) } },
      select: {
        dedupeKey: true,
        status: true,
        attempts: true,
        lastError: true,
        sentAt: true,
        createdAt: true,
      },
    });
    return new Map(
      rows.map((r): [string, EmailRow] => [r.dedupeKey as string, r]),
    );
  }

  private shape(
    lead: Appointment & WithTeacher,
    cfg: AvailabilityConfig,
    whatsapp: TrialWhatsAppMessage[],
    emails: Map<string, EmailRow>,
  ) {
    const emailRows = this.emailKeysFor(lead).map(({ key, kind }) => {
      const row = emails.get(key);
      return {
        kind,
        status: row?.status ?? 'NOT_SENT',
        attempts: row?.attempts ?? 0,
        lastError: row?.lastError ?? null,
        sentAt: row?.sentAt ?? null,
      };
    });
    // A row only exists if the email was attempted; for events that have not
    // happened yet (cancelled / rescheduled) there is nothing to show.
    const shownEmails = emailRows.filter(
      (e) =>
        e.status !== 'NOT_SENT' ||
        e.kind === 'PARENT_CONFIRMATION' ||
        (e.kind === 'ADMIN_ALERT' && lead.bookedBy === 'PARENT'),
    );
    const waRows = whatsapp.map((m) => ({
      id: m.id,
      kind: m.kind,
      status: m.status,
      scheduledFor: m.scheduledFor,
      sentAt: m.sentAt,
      attempts: m.attempts,
      errorCode: m.errorCode,
      lastError: m.lastError,
      willRetry: m.status === 'FAILED' && m.nextAttemptAt !== null,
    }));

    const needsAttention =
      shownEmails.some((e) => e.status === 'FAILED') ||
      waRows.some((w) => w.status === 'FAILED' && !w.willRetry);

    return {
      id: lead.id,
      reference: bookingReference(lead.id),
      status: lead.appointmentStatus,
      teacher: lead.teacher
        ? { id: lead.teacher.id, name: lead.teacher.user.fullName }
        : null,
      teacherAssignedAt: lead.teacherAssignedAt,
      teacherJoinedAt: lead.teacherJoinedAt,
      guestJoinedAt: lead.guestJoinedAt,
      // Whether the parent has (or will be sent) a working classroom link. The
      // token itself is NEVER returned by any API.
      classroom: {
        state: trialAccessState(lead),
        opensAt: joinWindow(lead.startAt, lead.endAt).opensAt,
        closesAt: joinWindow(lead.startAt, lead.endAt).closesAt,
        reminderDueAt: lead.reminderDueAt,
        reminderEmailSentAt: lead.reminderEmailSentAt,
      },
      bookedBy: lead.bookedBy,
      startAt: lead.startAt.toISOString(),
      endAt: lead.endAt.toISOString(),
      timezone: TRIAL_TIMEZONE,
      timezoneLabel: TRIAL_TIMEZONE_LABEL,
      parentName: lead.parentName,
      parentEmail: lead.parentEmail,
      parentPhone: lead.parentPhone,
      whatsappConsent: lead.whatsappConsent,
      childName: lead.childName,
      childAge: lead.childAge,
      program: lead.subject,
      message: lead.message,
      parentTimezone: lead.timezone,
      adminNotes: lead.adminNotes,
      cancelledAt: lead.cancelledAt,
      cancelReason: lead.cancelReason,
      rescheduleCount: lead.revision,
      createdAt: lead.createdAt,
      outsideAvailability:
        lead.appointmentStatus === 'CONFIRMED' &&
        lead.startAt.getTime() > Date.now() &&
        !isCoveredByAvailability(cfg, lead.startAt),
      notifications: { emails: shownEmails, whatsapp: waRows, needsAttention },
    };
  }

  async list(params: AppointmentListParams) {
    const where: Prisma.TrialLeadWhereInput = {
      appointmentStatus: { not: null },
    };
    const now = new Date();

    if (params.status && STATUS_FILTERS.includes(params.status)) {
      where.appointmentStatus = params.status as
        | 'CONFIRMED'
        | 'CANCELLED'
        | 'COMPLETED'
        | 'MISSED';
    }
    if (params.teacher === 'unassigned') where.teacherId = null;
    else if (params.teacher) where.teacherId = params.teacher;
    const startAt: Prisma.DateTimeNullableFilter = {};
    if (params.from) {
      if (!isValidDateStr(params.from))
        throw new BadRequestException('from must be a date like 2026-11-05.');
      startAt.gte = dhakaToUtc(params.from, 0, 0);
    }
    if (params.to) {
      if (!isValidDateStr(params.to))
        throw new BadRequestException('to must be a date like 2026-11-05.');
      startAt.lt = dhakaToUtc(addDaysToDateStr(params.to, 1), 0, 0);
    }
    if (params.scope === 'upcoming')
      startAt.gte = startAt.gte && startAt.gte > now ? startAt.gte : now;
    if (params.scope === 'past')
      startAt.lt = startAt.lt && startAt.lt < now ? startAt.lt : now;
    if (Object.keys(startAt).length > 0) where.startAt = startAt;

    const q = params.q?.trim();
    if (q) {
      where.OR = [
        { parentName: { contains: q, mode: 'insensitive' } },
        { parentEmail: { contains: q, mode: 'insensitive' } },
        { parentPhone: { contains: q.replace(/[\s()-]/g, '') } },
        { childName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(Math.max(params.limit || 20, 1), 200);
    const page = Math.max(params.page || 1, 1);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.trialLead.findMany({
        where,
        orderBy: { startAt: params.scope === 'past' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          whatsappMessages: { orderBy: { createdAt: 'asc' } },
          ...TEACHER_INCLUDE,
        },
      }),
      this.prisma.trialLead.count({ where }),
    ]);

    const cfg = await this.booking.loadConfig();
    const emails = await this.emailStatuses(rows);
    return {
      appointments: rows.map((r) =>
        this.shape(r as Appointment, cfg, r.whatsappMessages, emails),
      ),
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  /** Header counts for the admin page: what needs a human. */
  async summary() {
    const now = new Date();
    const [upcoming, failedWhatsApp, needsTeacher] = await Promise.all([
      this.prisma.trialLead.findMany({
        where: { appointmentStatus: 'CONFIRMED', startAt: { gt: now } },
        select: { startAt: true },
      }),
      this.prisma.trialWhatsAppMessage.count({
        where: {
          status: 'FAILED',
          nextAttemptAt: null,
          trialLead: { appointmentStatus: 'CONFIRMED', startAt: { gt: now } },
        },
      }),
      this.prisma.trialLead.count({
        where: {
          appointmentStatus: 'CONFIRMED',
          teacherId: null,
          endAt: { gt: now },
        },
      }),
    ]);
    const cfg = await this.booking.loadConfig();
    return {
      upcoming: upcoming.length,
      needsTeacher,
      outsideAvailability: upcoming.filter(
        (u) => !isCoveredByAvailability(cfg, u.startAt as Date),
      ).length,
      failedWhatsApp,
    };
  }

  async detail(id: string) {
    const lead = await this.prisma.trialLead.findUnique({
      where: { id },
      include: {
        whatsappMessages: { orderBy: { createdAt: 'asc' } },
        ...TEACHER_INCLUDE,
      },
    });
    if (!lead || !lead.appointmentStatus || !lead.startAt) {
      throw new NotFoundException('Trial appointment not found.');
    }
    const cfg = await this.booking.loadConfig();
    const emails = await this.emailStatuses([lead]);
    const history = await this.audit.getHistory('TRIAL_APPOINTMENT', id);
    return {
      ...this.shape(lead as Appointment, cfg, lead.whatsappMessages, emails),
      history: history.map((h) => ({
        id: h.id,
        action: h.action,
        actorRole: h.actorRole,
        reason: h.reason,
        createdAt: h.createdAt,
        beforeData: h.beforeData,
        afterData: h.afterData,
      })),
    };
  }

  /**
   * Teachers the admin may pick for a trial, each with whether they are free
   * for its whole session — judged by the same conflict function the server
   * enforces on assignment (their lessons, batch classes, booked shifts and
   * other trials). `startAt` previews a different time (reschedule picker).
   * Only active, non-suspended teacher accounts are listed. Names only: no
   * contact details leave this endpoint.
   */
  async assignableTeachers(trialId?: string, startAt?: string) {
    let start: Date | null = null;
    let end: Date | null = null;
    if (startAt) {
      const d = new Date(startAt);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException('startAt must be a valid date-time.');
      }
      start = d;
      end = new Date(d.getTime() + TRIAL_SESSION_MS);
    } else if (trialId) {
      const lead = await this.prisma.trialLead.findUnique({
        where: { id: trialId },
        select: { startAt: true, endAt: true },
      });
      if (!lead?.startAt || !lead.endAt) {
        throw new NotFoundException('Trial appointment not found.');
      }
      start = lead.startAt;
      end = lead.endAt;
    }

    const teachers = await this.prisma.teacherProfile.findMany({
      where: {
        isSuspended: false,
        user: { role: 'TEACHER', accountStatus: 'ACTIVE' },
      },
      select: {
        id: true,
        subjects: true,
        user: { select: { fullName: true, avatarUrl: true } },
      },
      orderBy: { user: { fullName: 'asc' } },
      take: 200,
    });

    return Promise.all(
      teachers.map(async (t) => {
        const conflict =
          start && end
            ? await findTeacherConflict(this.prisma, t.id, start, end, {
                excludeTrialId: trialId,
              })
            : null;
        return {
          id: t.id,
          name: t.user.fullName,
          avatarUrl: t.user.avatarUrl,
          subjects: t.subjects,
          available: !conflict,
          busyReason: conflict ? 'Already has a class at this time' : null,
        };
      }),
    );
  }

  async updateNotes(
    id: string,
    adminNotes: string,
    actor: { id: string; role: string },
  ) {
    const existing = await this.prisma.trialLead.findUnique({
      where: { id },
      select: { id: true, appointmentStatus: true },
    });
    if (!existing || !existing.appointmentStatus) {
      throw new NotFoundException('Trial appointment not found.');
    }
    await this.prisma.trialLead.update({
      where: { id },
      data: { adminNotes: adminNotes || null },
    });
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'TRIAL_NOTES_UPDATED',
      entityType: 'TRIAL_APPOINTMENT',
      entityId: id,
    });
    return { success: true };
  }

  async retryWhatsApp(id: string, actor: { id: string; role: string }) {
    const revived = await this.whatsapp.retryFailed(id);
    if (revived > 0) {
      await this.audit.log({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'TRIAL_WHATSAPP_RETRY',
        entityType: 'TRIAL_APPOINTMENT',
        entityId: id,
        afterData: { revived },
      });
    }
    return { revived };
  }
}

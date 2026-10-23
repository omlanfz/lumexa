// FILE PATH: server/src/trial/trial-whatsapp.service.ts
//
// Durable outbox + sender for the three trial WhatsApp messages
// (parent confirmation, parent reminder, admin alert) — and nothing else.
//
// How it stays correct
//   • Rows are written inside the booking transaction, so a committed booking
//     always has its messages queued, and a rolled-back one has none.
//   • `dedupeKey` is unique: planning the same message twice is a no-op.
//   • A row is *claimed* with a conditional UPDATE (PENDING/FAILED → SENDING)
//     before anything is sent, so concurrent sweeps / instances can't both
//     send it. A crashed worker's stale SENDING row is reclaimed after 10 min.
//   • The reminder is just a row with a future `nextAttemptAt` that the
//     once-a-minute sweep picks up — it survives restarts and deploys.
//   • Sending happens after commit and never inside a booking transaction.
//   • WHATSAPP_ENABLED=false (the default) writes SKIPPED rows and never
//     touches the network, so booking works without any Meta setup.
// Known limit: WhatsApp has no idempotency key, so if the process dies in the
// instant between Meta accepting a message and us recording SENT, that one
// message can be re-sent when the stale lock expires.

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  Prisma,
  TrialWhatsAppKind,
  TrialWhatsAppStatus,
  type TrialLead,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  WhatsAppCloudService,
  type TemplateVariable,
} from '../whatsapp/whatsapp-cloud.service';
import { whatsappConfig } from '../whatsapp/whatsapp.config';
import { normalizePhone, maskPhone } from './phone.util';
import {
  buildTemplateVariables,
  computeReminderAt,
  templateKeyFor,
} from './trial-whatsapp.templates';

export const WHATSAPP_MAX_ATTEMPTS = 5;
const STALE_LOCK_MS = 10 * 60 * 1000;
const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
const BATCH_SIZE = 25;

type Db = Prisma.TransactionClient;

export interface PlannedMessage {
  kind: TrialWhatsAppKind;
  dedupeKey: string;
  status: TrialWhatsAppStatus;
  scheduledFor: Date;
  nextAttemptAt: Date | null;
  lastError: string | null;
}

export function whatsappDedupeKey(
  leadId: string,
  kind: TrialWhatsAppKind,
  revision: number,
): string {
  return kind === 'PARENT_REMINDER'
    ? `trial:${leadId}:${kind}:r${revision}`
    : `trial:${leadId}:${kind}`;
}

/** Decides, for one appointment, which WhatsApp rows to queue and in what
 *  state. Pure — the service persists the result. */
export function planTrialWhatsApp(params: {
  lead: Pick<
    TrialLead,
    'id' | 'revision' | 'startAt' | 'whatsappConsent' | 'parentPhone'
  >;
  now: Date;
  enabled: boolean;
  kinds: TrialWhatsAppKind[];
}): PlannedMessage[] {
  const { lead, now, enabled, kinds } = params;
  const out: PlannedMessage[] = [];

  for (const kind of kinds) {
    const base = {
      kind,
      dedupeKey: whatsappDedupeKey(lead.id, kind, lead.revision),
    };
    const skipped = (reason: string): PlannedMessage => ({
      ...base,
      status: 'SKIPPED',
      scheduledFor: now,
      nextAttemptAt: null,
      lastError: reason,
    });

    if (!enabled) {
      out.push(
        skipped('WhatsApp notifications are disabled (WHATSAPP_ENABLED).'),
      );
      continue;
    }
    if (kind !== 'ADMIN_ALERT') {
      if (!lead.whatsappConsent) {
        out.push(skipped('Parent did not consent to WhatsApp notifications.'));
        continue;
      }
      if (!lead.parentPhone) {
        out.push(skipped('No parent phone number on file.'));
        continue;
      }
    }
    if (kind === 'PARENT_REMINDER') {
      const at = lead.startAt ? computeReminderAt(lead.startAt, now) : null;
      if (!at) {
        out.push(skipped('Too close to the start time for a useful reminder.'));
        continue;
      }
      out.push({
        ...base,
        status: 'PENDING',
        scheduledFor: at,
        nextAttemptAt: at,
        lastError: null,
      });
      continue;
    }
    out.push({
      ...base,
      status: 'PENDING',
      scheduledFor: now,
      nextAttemptAt: now,
      lastError: null,
    });
  }
  return out;
}

@Injectable()
export class TrialWhatsAppService {
  private readonly logger = new Logger(TrialWhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloud: WhatsAppCloudService,
  ) {}

  /** Queue messages for an appointment inside the caller's transaction. */
  async enqueue(
    db: Db,
    lead: Pick<
      TrialLead,
      'id' | 'revision' | 'startAt' | 'whatsappConsent' | 'parentPhone'
    >,
    kinds: TrialWhatsAppKind[],
    now = new Date(),
  ): Promise<void> {
    const planned = planTrialWhatsApp({
      lead,
      now,
      enabled: whatsappConfig.isEnabled(),
      kinds,
    });
    if (planned.length === 0) return;
    await db.trialWhatsAppMessage.createMany({
      data: planned.map((m) => ({
        ...m,
        trialLeadId: lead.id,
        revision: lead.revision,
      })),
      skipDuplicates: true, // dedupeKey is unique → re-planning is harmless
    });
  }

  /** Stop anything not yet sent for this appointment (cancel / reschedule). */
  async skipUnsent(
    db: Db,
    leadId: string,
    reason: string,
    onlyKinds?: TrialWhatsAppKind[],
  ): Promise<number> {
    const res = await db.trialWhatsAppMessage.updateMany({
      where: {
        trialLeadId: leadId,
        status: { in: ['PENDING', 'FAILED'] },
        ...(onlyKinds ? { kind: { in: onlyKinds } } : {}),
      },
      data: { status: 'SKIPPED', nextAttemptAt: null, lastError: reason },
    });
    return res.count;
  }

  /** Fire-and-forget nudge so confirmations go out right after commit
   *  instead of waiting for the next minute's sweep. Never throws. */
  kick(): void {
    void this.processDue().catch((err: unknown) =>
      this.logger.error(
        `WhatsApp kick failed: ${String((err as Error)?.message ?? err)}`,
      ),
    );
  }

  @Cron('* * * * *')
  async sweep(): Promise<void> {
    await this.processDue();
  }

  async processDue(limit = BATCH_SIZE): Promise<number> {
    if (!this.cloud.isEnabled()) return 0;
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);

    const due = await this.prisma.trialWhatsAppMessage.findMany({
      where: {
        OR: [
          {
            status: { in: ['PENDING', 'FAILED'] },
            nextAttemptAt: { lte: now },
          },
          { status: 'SENDING', lockedAt: { lt: staleBefore } },
        ],
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    let processed = 0;
    for (const { id } of due) {
      const claimed = await this.prisma.trialWhatsAppMessage.updateMany({
        where: {
          id,
          OR: [
            {
              status: { in: ['PENDING', 'FAILED'] },
              nextAttemptAt: { lte: now },
            },
            { status: 'SENDING', lockedAt: { lt: staleBefore } },
          ],
        },
        data: { status: 'SENDING', lockedAt: now },
      });
      if (claimed.count !== 1) continue; // another worker got it
      await this.deliver(id);
      processed++;
    }
    return processed;
  }

  private async deliver(id: string): Promise<void> {
    const row = await this.prisma.trialWhatsAppMessage.findUnique({
      where: { id },
      include: { trialLead: true },
    });
    if (!row) return;
    const lead = row.trialLead;
    const now = new Date();

    const skip = (reason: string) =>
      this.finish(id, {
        status: 'SKIPPED',
        lastError: reason,
        nextAttemptAt: null,
      });

    if (lead.appointmentStatus !== 'CONFIRMED') {
      return skip('Appointment is no longer confirmed.');
    }
    if (!lead.startAt || lead.startAt.getTime() <= now.getTime()) {
      return skip('Appointment has already started.');
    }
    if (row.kind === 'PARENT_REMINDER' && row.revision !== lead.revision) {
      return skip('Superseded by a reschedule.');
    }
    if (row.kind !== 'ADMIN_ALERT' && !lead.whatsappConsent) {
      return skip('Parent did not consent to WhatsApp notifications.');
    }

    const rawTo =
      row.kind === 'ADMIN_ALERT'
        ? whatsappConfig.adminRecipient()
        : lead.parentPhone;
    if (!rawTo) {
      return this.fail(id, row.attempts, {
        retryable: false,
        code: 'NOT_CONFIGURED',
        message:
          row.kind === 'ADMIN_ALERT'
            ? 'WHATSAPP_ADMIN_RECIPIENT is not set.'
            : 'No parent phone number on file.',
      });
    }
    const phone = normalizePhone(rawTo);
    if (!phone.ok) {
      return this.fail(id, row.attempts, {
        retryable: false,
        code: 'INVALID_RECIPIENT',
        message: `Recipient number is not valid (${maskPhone(rawTo)}).`,
      });
    }

    let variables: TemplateVariable[];
    try {
      variables = buildTemplateVariables(row.kind, lead);
    } catch (e) {
      return this.fail(id, row.attempts, {
        retryable: false,
        code: 'BUILD_FAILED',
        message: String((e as Error).message),
      });
    }

    const result = await this.cloud.sendTemplate({
      to: phone.e164,
      templateName: whatsappConfig.templateName(templateKeyFor(row.kind)),
      languageCode: whatsappConfig.templateLanguage(),
      variables,
    });

    if (result.ok) {
      await this.finish(id, {
        status: 'SENT',
        sentAt: new Date(),
        providerMessageId: result.messageId,
        lastError: null,
        errorCode: null,
        nextAttemptAt: null,
        attempts: { increment: 1 },
      });
      return;
    }
    await this.fail(id, row.attempts, result);
  }

  private async fail(
    id: string,
    attemptsSoFar: number,
    err: { retryable: boolean; code: string; message: string },
  ): Promise<void> {
    const attempts = attemptsSoFar + 1;
    const willRetry = err.retryable && attempts < WHATSAPP_MAX_ATTEMPTS;
    const nextAttemptAt = willRetry
      ? new Date(
          Date.now() +
            BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)],
        )
      : null;

    await this.finish(id, {
      status: 'FAILED',
      lastError: err.message.slice(0, 500),
      errorCode: err.code,
      nextAttemptAt,
      attempts: { increment: 1 },
    });

    // Log the code, never the token or message contents.
    const line = `Trial WhatsApp message ${id} failed (code ${err.code}, attempt ${attempts}/${WHATSAPP_MAX_ATTEMPTS})${willRetry ? ' — will retry' : ' — giving up; visible in Admin → Trial Classes'}`;
    if (willRetry) this.logger.warn(line);
    else this.logger.error(line);
  }

  private async finish(
    id: string,
    data: Prisma.TrialWhatsAppMessageUpdateInput,
  ): Promise<void> {
    // The row is ours (status SENDING); a few retries protect against a DB
    // blip leaving a delivered message marked as still sending.
    for (let i = 0; i < 3; i++) {
      try {
        await this.prisma.trialWhatsAppMessage.update({
          where: { id },
          data: { ...data, lockedAt: null },
        });
        return;
      } catch (e) {
        if (i === 2) {
          this.logger.error(
            `Could not record outcome for WhatsApp message ${id}: ${String((e as Error).message)}`,
          );
        } else {
          await new Promise((r) => setTimeout(r, 200 * (i + 1)));
        }
      }
    }
  }

  /** Admin: revive messages that ran out of retries (after fixing config). */
  async retryFailed(leadId: string): Promise<number> {
    const lead = await this.prisma.trialLead.findUnique({
      where: { id: leadId },
      select: { appointmentStatus: true, startAt: true },
    });
    if (
      !lead ||
      lead.appointmentStatus !== 'CONFIRMED' ||
      !lead.startAt ||
      lead.startAt.getTime() <= Date.now()
    ) {
      return 0;
    }
    const res = await this.prisma.trialWhatsAppMessage.updateMany({
      where: { trialLeadId: leadId, status: 'FAILED', nextAttemptAt: null },
      data: { nextAttemptAt: new Date(), attempts: 0, errorCode: null },
    });
    if (res.count > 0) this.kick();
    return res.count;
  }
}

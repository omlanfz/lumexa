// FILE PATH: server/src/trial/trial-reminder.service.ts
//
// The one-hour reminder EMAIL. (The WhatsApp reminder is a durable outbox row
// that TrialWhatsAppService's own sweep delivers.)
//
// Why a database sweep and not a timer: the reminder is just a column
// (`reminderDueAt`) that a once-a-minute cron looks at, so it survives restarts
// and deployments — nothing lives in memory, and a backend that was down at the
// moment a reminder came due sends it as soon as it is back (as long as the
// class has not started).
//
// No duplicates, even with several instances or a crash mid-way:
//   1. the email is journaled under a dedupeKey that includes the trial's
//      revision (`trial:<id>:reminder:r<n>`) — a second attempt is a no-op;
//   2. only afterwards is `reminderEmailSentAt` recorded, with a compare on the
//      revision so a reschedule that happened meanwhile (which resets the
//      reminder for the new time) is never overwritten.
//
// A reminder is planned only when a teacher is assigned and the class is more
// than an hour away at that moment (see reminderDueAt in trial-access.util.ts);
// reassigning, rescheduling and cancelling update or clear it.

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { TrialNotificationsService } from './trial-notifications.service';

const BATCH_SIZE = 50;

@Injectable()
export class TrialReminderService {
  private readonly logger = new Logger(TrialReminderService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: TrialNotificationsService,
  ) {}

  @Cron('* * * * *')
  async sweep(): Promise<void> {
    // Never overlap with a slow previous run on this instance.
    if (this.running) return;
    this.running = true;
    try {
      await this.sendDueEmailReminders();
    } catch (err) {
      this.logger.error(
        `Trial reminder sweep failed: ${String((err as Error)?.message ?? err)}`,
      );
    } finally {
      this.running = false;
    }
  }

  /** Sends every reminder email that is due. Returns how many were handled. */
  async sendDueEmailReminders(now = new Date()): Promise<number> {
    const due = await this.prisma.trialLead.findMany({
      where: {
        appointmentStatus: 'CONFIRMED',
        teacherId: { not: null },
        guestToken: { not: null },
        reminderDueAt: { lte: now },
        reminderEmailSentAt: null,
        startAt: { gt: now },
      },
      orderBy: { reminderDueAt: 'asc' },
      take: BATCH_SIZE,
    });

    let handled = 0;
    for (const lead of due) {
      if (!lead.startAt || !lead.endAt) continue;
      try {
        await this.notifier.sendReminderEmail({
          ...lead,
          startAt: lead.startAt,
          endAt: lead.endAt,
        });
        await this.prisma.trialLead.updateMany({
          where: {
            id: lead.id,
            revision: lead.revision,
            reminderEmailSentAt: null,
          },
          data: { reminderEmailSentAt: new Date() },
        });
        handled++;
      } catch (err) {
        // Left unmarked: the next sweep tries again (the dedupeKey guarantees
        // it still cannot send twice).
        this.logger.error(
          `Trial reminder email for ${lead.id} failed: ${String((err as Error)?.message ?? err)}`,
        );
      }
    }
    return handled;
  }
}

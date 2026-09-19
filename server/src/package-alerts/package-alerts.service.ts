// FILE PATH: server/src/package-alerts/package-alerts.service.ts
//
// Daily sweep that turns each student's REAL current balance/rate (from
// StudentLedgerService — the same ledger the admin Payments tab reads, see
// student-ledger.service.ts) into a package "expiring soon" / "expired"
// email. Never hard-codes a lesson price: rateCents always comes from that
// student's own ledger (their actual course price ÷ sessions, or their
// last real payment's rate — see StudentLedgerEntry.rateCents).
//
// Idempotency: PackageAlertState.lastState only allows an email on an
// actual state TRANSITION (see checkStudent) — sitting in the same
// bracket for weeks never re-sends, and a payment that lifts the balance
// back up resets state silently (no "good news" email, just clears the
// gate so a future re-entry into EXPIRING_SOON/EXPIRED can email again).

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PackageAlertLevel } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { StudentLedgerService } from '../students/student-ledger.service';
import { NotificationsService } from '../notifications/notifications.service';

// "Less than 3 lessons remaining" ⇒ balance <= 2 lesson amounts.
const EXPIRING_SOON_LESSON_THRESHOLD = 2;

function monthBucket(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class PackageAlertsService {
  private readonly logger = new Logger(PackageAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: StudentLedgerService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 3 * * *') // 09:00 Asia/Dhaka
  async checkAllStudents() {
    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT', accountStatus: 'ACTIVE' },
      select: {
        id: true,
        fullName: true,
        email: true,
        billingContactEmail: true,
      },
    });

    let checked = 0;
    for (const student of students) {
      try {
        await this.checkStudent(student);
        checked++;
      } catch (err) {
        this.logger.error(
          `Package alert check failed for student ${student.id}: ${err}`,
        );
      }
    }
    this.logger.log(
      `Package balance check done. ${checked}/${students.length} student(s) checked.`,
    );
  }

  private async checkStudent(student: {
    id: string;
    fullName: string;
    email: string;
    billingContactEmail: string | null;
  }) {
    const summary = await this.ledger.getSummary(student.id);
    // No billing history yet, or a per-lesson rate isn't known — nothing to
    // threshold against (never invent a universal lesson price).
    if (summary.rateCents <= 0 || summary.lessonsRemaining === null) return;

    let level: PackageAlertLevel = 'NONE';
    if (summary.balanceCents < summary.rateCents) {
      level = 'EXPIRED';
    } else if (summary.lessonsRemaining <= EXPIRING_SOON_LESSON_THRESHOLD) {
      level = 'EXPIRING_SOON';
    }

    const state = await this.prisma.packageAlertState.upsert({
      where: { studentUserId: student.id },
      create: { studentUserId: student.id, lastState: 'NONE' },
      update: {},
    });

    if (level === state.lastState) return; // no transition — nothing to do

    await this.prisma.packageAlertState.update({
      where: { studentUserId: student.id },
      data: {
        lastState: level,
        lastSentAt: level === 'NONE' ? state.lastSentAt : new Date(),
      },
    });

    if (level === 'NONE') return; // dropped back below threshold (new payment) — reset silently, no email

    const to = student.billingContactEmail || student.email;
    const bucket = monthBucket(new Date());

    if (level === 'EXPIRING_SOON') {
      await this.notifications.sendPackageExpiringSoon(to, {
        studentUserId: student.id,
        studentName: student.fullName,
        billingContactName: student.fullName,
        lessonsRemaining: Math.max(1, Math.round(summary.lessonsRemaining)),
        courseName: summary.courseName ?? 'their curriculum',
        monthBucket: bucket,
      });
    } else {
      await this.notifications.sendPackageExpired(to, {
        studentUserId: student.id,
        studentName: student.fullName,
        billingContactName: student.fullName,
        courseName: summary.courseName ?? 'their curriculum',
        monthBucket: bucket,
      });
    }
  }
}

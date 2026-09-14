/**
 * One-time backfill: populate `User.assignedTeacherId` for STUDENT rows that
 * predate the Operations-controlled teacher assignment feature.
 *
 * WHY: existing students all have `assignedTeacherId = NULL`. This script
 * infers a reasonable *default* assignment from each student's booking
 * history (their most recently booked teacher, falling back to their most
 * frequently booked teacher on a tie) so Operations has a sane starting
 * point instead of a blank slate. This is a MIGRATION AID ONLY — at runtime
 * the app never infers a teacher from bookings, it only ever reads the
 * explicit `assignedTeacherId` relation (see admin.service.ts /
 * students module). Once this has run, ongoing assignment changes go
 * through the admin "assign teacher" endpoint.
 *
 * Idempotent / safe to re-run:
 *   - Only ever touches STUDENT rows where `assignedTeacherId IS NULL`.
 *   - Never overwrites an existing assignment.
 *   - Students with zero booking history are left untouched (NULL) — there
 *     is nothing to infer from, and Operations must assign them manually.
 *
 * Usage:
 *   Run once per environment, after `prisma migrate deploy` has applied the
 *   migration that added `assignedTeacherId` to `User`:
 *
 *     npm run backfill:assigned-teacher
 *
 * Not run automatically as part of `build`/`start` — it is a manual,
 * one-time operational step per environment (local, staging, production).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TeacherTally {
  teacherId: string;
  count: number;
  mostRecentShiftStart: Date;
}

async function main() {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', assignedTeacherId: null },
    select: { id: true, fullName: true },
  });

  console.log(
    `[backfill:assigned-teacher] Found ${students.length} STUDENT user(s) with no assignedTeacherId.`,
  );

  let updated = 0;
  let skippedNoHistory = 0;
  let skippedErrors = 0;

  for (const student of students) {
    try {
      // Pull every booking for this student (self-auth bookings via
      // studentUserId — the current student login model) together with the
      // teacher who owns the booked shift.
      const bookings = await prisma.booking.findMany({
        where: { studentUserId: student.id },
        select: {
          shift: {
            select: {
              start: true,
              teacherId: true,
            },
          },
        },
      });

      if (bookings.length === 0) {
        // No booking history at all — nothing to infer from. Leave null;
        // Operations must assign manually.
        skippedNoHistory++;
        continue;
      }

      // Tally bookings per teacher, tracking each teacher's most recent
      // shift start so we can break frequency ties by recency.
      const tallies = new Map<string, TeacherTally>();
      for (const booking of bookings) {
        const teacherId = booking.shift?.teacherId;
        const shiftStart = booking.shift?.start;
        if (!teacherId || !shiftStart) continue;

        const existing = tallies.get(teacherId);
        if (existing) {
          existing.count += 1;
          if (shiftStart > existing.mostRecentShiftStart) {
            existing.mostRecentShiftStart = shiftStart;
          }
        } else {
          tallies.set(teacherId, {
            teacherId,
            count: 1,
            mostRecentShiftStart: shiftStart,
          });
        }
      }

      if (tallies.size === 0) {
        // Bookings existed but none carried a resolvable teacher (shouldn't
        // normally happen — every shift belongs to a teacher).
        skippedNoHistory++;
        continue;
      }

      // Pick the teacher with the most bookings; break ties by most recent
      // booking. This favors "the teacher this student mainly works with"
      // while still preferring recency when it's genuinely a tie.
      const best = [...tallies.values()].sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.mostRecentShiftStart.getTime() - a.mostRecentShiftStart.getTime();
      })[0];

      // updateMany + a null-guard in the where clause (rather than a plain
      // update by id) so a concurrent run, or an assignment made in between
      // the read above and this write, can never clobber an assignment.
      const result = await prisma.user.updateMany({
        where: { id: student.id, assignedTeacherId: null },
        data: { assignedTeacherId: best.teacherId },
      });

      if (result.count > 0) updated++;
    } catch (err) {
      skippedErrors++;
      console.error(
        `[backfill:assigned-teacher] Failed to backfill student ${student.id} (${student.fullName}):`,
        err,
      );
    }
  }

  console.log('[backfill:assigned-teacher] Summary:');
  console.log(`  Total candidates:        ${students.length}`);
  console.log(`  Updated (assigned):      ${updated}`);
  console.log(`  Skipped (no history):    ${skippedNoHistory}`);
  console.log(`  Skipped (errors):        ${skippedErrors}`);
}

main()
  .catch((err) => {
    console.error('[backfill:assigned-teacher] Fatal error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

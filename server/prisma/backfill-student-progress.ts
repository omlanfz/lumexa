/**
 * Backfill: reconstruct EVERY existing student's gamified progress (total
 * sessions, Space Rank, weekly streak, badges) from their real class history.
 *
 * WHY: before this change only the legacy marketplace-booking flow ever moved
 * those numbers, so students taught through the curriculum / batch classes
 * (every current student) show rank "Starchild", 0 sessions, no streak and no
 * badges however many classes they have attended. Rank, streak, badges and
 * milestones are now derived from the class records by StudentProgressService;
 * this script runs that same derivation over all students once, so history is
 * not lost and nobody has to wait for their next class to be recognised.
 *
 * Rules (see src/students/progress/progress.rules.ts):
 *   - an attended class = a ScheduledLesson finalized COMPLETED or
 *     PARTIALLY_COMPLETED (a batch student who did not show up is finalized
 *     INCOMPLETE and never counts), plus legacy bookings whose payment was
 *     captured and whose class has ended;
 *   - nothing is invented: every badge is created with the date of the class
 *     that actually earned it, and a student with no attended class gets
 *     nothing;
 *   - a stored rank is never lowered, and a student whose stored numbers the
 *     records do not explain (or who has classes nobody settled) is listed
 *     under "needsReview" instead of being silently "fixed";
 *   - silent: no emails, no gem bonuses.
 *
 * Idempotent / safe to re-run: counters are overwritten with the same derived
 * value and a badge row is created at most once (unique [userId, type]) — a
 * second run reports 0 changed students.
 *
 * Usage (once per environment, after `prisma migrate deploy`):
 *
 *     npm run backfill:student-progress -- --dry-run     # preview only
 *     npm run backfill:student-progress                   # apply
 *     npm run backfill:student-progress -- --out report.json
 *
 * The same backfill can be run from the admin API:
 *     POST /admin/students/progress/backfill?dryRun=true
 */

import { writeFileSync } from 'fs';
import { PrismaService } from '../src/prisma.service';
import { StudentProgressService } from '../src/students/progress/student-progress.service';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

  const prisma = new PrismaService();
  await prisma.$connect();
  // Silent mode never sends anything, so no notifications transport is needed.
  const service = new StudentProgressService(prisma, {} as never);

  try {
    const report = await service.backfillAll({ dryRun });

    console.log(
      `[backfill:student-progress] ${dryRun ? 'DRY RUN — nothing written. ' : ''}` +
        `${report.studentsProcessed} student(s) processed, ` +
        `${report.studentsChanged} ${dryRun ? 'would change' : 'changed'}, ` +
        `${report.badgesCreated} badge(s) ${dryRun ? 'would be created' : 'created'}.`,
    );
    for (const s of report.students.filter((x) => x.changed)) {
      console.log(
        `  ${s.email}: ${s.sessions} class(es), rank ${s.rank}, streak ${s.streakWeeks}w, ` +
          `badges +[${s.badgesCreated.join(', ')}]`,
      );
    }
    if (report.needsReview.length > 0) {
      console.log(
        `\n[backfill:student-progress] ${report.needsReview.length} student(s) need MANUAL REVIEW:`,
      );
      for (const s of report.needsReview) {
        console.log(`  ${s.email} (${s.studentUserId})`);
        for (const r of s.reviewReasons) console.log(`    - ${r}`);
      }
    }
    if (outPath) {
      writeFileSync(outPath, JSON.stringify(report, null, 2));
      console.log(`\nFull report written to ${outPath}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

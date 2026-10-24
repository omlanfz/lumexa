// FILE PATH: server/src/assessments/testing/integration-db.ts
//
// Shared set-up for the assessment integration specs, which run against a REAL
// Postgres (row locks, unique constraints and advisory locks cannot be proven
// with a mock). They are skipped unless ASSESSMENT_INTEGRATION_DATABASE_URL is
// set, and they TRUNCATE the data tables, so the URL must point at a throwaway
// database that already has every migration applied:
//
//   createdb lumexa_it
//   DATABASE_URL=postgresql://…/lumexa_it DIRECT_DATABASE_URL=postgresql://…/lumexa_it \
//     npx prisma migrate deploy
//   ASSESSMENT_INTEGRATION_DATABASE_URL=postgresql://…/lumexa_it \
//     npx jest src/assessments/ --testPathPattern integration
//
// No network: SMTP is left unconfigured (or replaced by an in-process
// transporter in the specs that exercise delivery).

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from '../../prisma.service';

export const IT_DB_URL = process.env.ASSESSMENT_INTEGRATION_DATABASE_URL;

/** The database name must look like a test database — a typo'd URL must never
 *  be able to wipe a real one. */
const SAFE_NAME = /(?:^|[_-])(?:it|test|tests|integration)(?:$|[_-])/i;

export function assertThrowawayDatabase(url: string): void {
  const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  if (!SAFE_NAME.test(name)) {
    throw new Error(
      `Refusing to run: "${name}" does not look like a throwaway test database ` +
        '(its name must contain "it", "test" or "integration", e.g. lumexa_it).',
    );
  }
}

/** Point Prisma at the test database. Call before any module is created. */
export function useIntegrationDatabase(): void {
  if (!IT_DB_URL) return;
  assertThrowawayDatabase(IT_DB_URL);
  process.env.DATABASE_URL = IT_DB_URL;
  process.env.DIRECT_DATABASE_URL = IT_DB_URL;
}

/** Empties every table the assessment flow touches (and everything that
 *  references them). */
export async function truncateAssessmentData(
  prisma: PrismaService,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "User", "Course", "EmailLog" RESTART IDENTITY CASCADE',
  );
}

/** Jest runs spec files in parallel workers, but every integration spec wipes
 *  and refills the same database — so they take turns. A lock directory in the
 *  OS temp folder works across workers; one left behind by a killed run is
 *  treated as stale after ten minutes. Returns the function that releases it. */
export async function acquireDatabaseLock(
  url: string,
  timeoutMs = 180_000,
): Promise<() => void> {
  const id = createHash('sha1').update(url).digest('hex').slice(0, 12);
  const dir = path.join(os.tmpdir(), `lumexa-it-${id}.lock`);
  const staleAfterMs = 10 * 60_000;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      fs.mkdirSync(dir);
      return () => fs.rmSync(dir, { recursive: true, force: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
    try {
      if (Date.now() - fs.statSync(dir).mtimeMs > staleAfterMs)
        fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // released while we looked — try again straight away
    }
    if (Date.now() > deadline)
      throw new Error(
        'Timed out waiting for another integration spec to finish with the database.',
      );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

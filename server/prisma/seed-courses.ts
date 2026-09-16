/**
 * Manual/local runner for the default course catalog seed.
 *
 * The same seed also runs automatically on every server boot (see
 * CoursesService.onModuleInit), so this script exists only for local
 * development or a one-off manual run against an environment — it is not
 * part of the deploy pipeline.
 *
 * Usage (from server/):
 *   npm run seed:courses
 */

import { PrismaClient } from '@prisma/client';
import { seedCourseCatalog } from '../src/courses/course-catalog.seed';

const prisma = new PrismaClient();

async function main() {
  const results = await seedCourseCatalog(prisma);
  for (const r of results) {
    console.log(`  ${r.created ? '✓ created' : '· up to date'} — ${r.title}`);
  }
  console.log(`[seed:courses] Done. ${results.length} course(s) in the default catalog.`);
}

main()
  .catch((err) => {
    console.error('[seed:courses] Fatal error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

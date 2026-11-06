/**
 * Read-only audit of lesson content: what the structured-content upgrade did (or would
 * do) to every LEARNING lesson in the database, course by course — discovered from the
 * data, nothing hard-coded. Never writes.
 *
 *   npm run report:lesson-content            # lessons not yet upgraded (what the next boot will do)
 *   npm run report:lesson-content -- --all   # every learning lesson, as if re-upgraded from scratch
 *   npm run report:lesson-content -- --json report.json
 *
 * Test lessons (course / stage / final tests) are never inspected: the report only
 * reads LEARNING lessons, and the upgrade never touches an assessment page, route,
 * question bank, grading or result.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { planLessonUpgrades } from '../src/courses/lesson-content.backfill';
import { CONTENT_VERSION, extractVisualIds, readQuiz, readVisuals } from '../src/curriculum/lesson-content';

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const jsonAt = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
  const prisma = new PrismaClient();
  try {
    const total = await prisma.lesson.count({ where: { type: 'LEARNING' } });
    const upgradedAlready = await prisma.lesson.count({ where: { type: 'LEARNING', contentVersion: { gte: CONTENT_VERSION } } });
    const plan = await planLessonUpgrades(prisma, { force: all });

    const byCourse = new Map<string, typeof plan>();
    for (const e of plan) byCourse.set(e.courseTitle, [...(byCourse.get(e.courseTitle) ?? []), e]);

    const kinds: Record<string, number> = {};
    const review: Record<string, number> = {};
    const out: unknown[] = [];

    console.log(`Learning lessons in the database: ${total}   already at content version ${CONTENT_VERSION}: ${upgradedAlready}   in this report: ${plan.length}\n`);
    for (const [course, entries] of [...byCourse].sort(([a], [b]) => a.localeCompare(b))) {
      let changed = 0;
      let quizzes = 0;
      let visuals = 0;
      for (const e of entries) {
        const p = e.result.patch;
        const row = {
          course,
          order: e.order,
          title: p?.title ?? e.title,
          lineage: e.lineage,
          changes: e.result.changes.map((c) => ({ kind: c.kind, detail: c.detail })),
          needsReview: e.result.review.map((r) => ({ kind: r.kind, detail: r.detail })),
          quizQuestions: readQuiz(p?.miniQuiz).length,
          visuals: readVisuals(p?.visuals).length,
          visualsPlaced: extractVisualIds(p?.contentMarkdown ?? '').length,
        };
        out.push(row);
        if (e.result.changes.length > 0) changed++;
        if (row.quizQuestions > 0) quizzes++;
        if (row.visuals > 0) visuals++;
        for (const c of e.result.changes) kinds[c.kind] = (kinds[c.kind] ?? 0) + 1;
        for (const r of e.result.review) review[r.kind] = (review[r.kind] ?? 0) + 1;
      }
      console.log(`${course}: ${entries.length} lessons — ${changed} changed, ${quizzes} with a quiz, ${visuals} with visuals`);
    }

    console.log('\nWhat changed (count of changes by kind):');
    for (const [k, n] of Object.entries(kinds).sort()) console.log(`  ${k.padEnd(24)} ${n}`);
    console.log('\nNeeds a human look (kept on the lesson as sourceRefs.contentReview; nothing was discarded):');
    if (Object.keys(review).length === 0) console.log('  none');
    for (const [k, n] of Object.entries(review).sort()) console.log(`  ${k.padEnd(24)} ${n}`);
    for (const e of plan) {
      for (const r of e.result.review) console.log(`  · ${e.courseTitle} #${e.order} "${e.result.patch?.title ?? e.title}": [${r.kind}] ${r.detail.slice(0, 200)}`);
    }
    if (jsonAt) {
      fs.writeFileSync(jsonAt, JSON.stringify(out, null, 2));
      console.log(`\nFull report written to ${jsonAt}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

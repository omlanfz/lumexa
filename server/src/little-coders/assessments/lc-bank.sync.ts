// FILE PATH: server/src/little-coders/assessments/lc-bank.sync.ts
//
// Applies the six Little Coders assessment banks to the database. Runs on every boot (right after
// the generic bank sync) and is safe on a live database full of students and attempts:
//
//   * Only assessments of the Little Coders catalog course whose format is LITTLE_CODERS_V2 and
//     whose bankVersion is below LC_BANK_VERSION are touched — no other program's assessment is
//     ever read or written.
//   * Idempotent — a bank is applied once; questions are matched by their stable "LC2:" key.
//   * Non-destructive — a question a student has already answered is UNPUBLISHED, never deleted
//     (MCQAnswer keeps pointing at it, and every TestReport keeps its own frozen snapshot);
//     only never-answered old questions are deleted. The same for old practical projects.
//   * Admin-safe — a question an admin edited (editedByAdmin) and a practical an admin edited
//     (spec.adminEdited) are left exactly as the admin wrote them.
//   * Validated first — a bank that fails the standard is never written.
//   * Multi-instance safe — the write phase holds a Postgres advisory lock.

import { AssessmentFormat, Prisma, PrismaClient, SessionType } from '@prisma/client';
import { lcAssessmentInstructions } from './lc-instructions';
import { LC_BANK_VERSION, LC_COURSE_SLUG, isLittleCodersSlug } from '../lc.constants';
import { allLcBanks, LC_COURSE_BANKS, LC_FINAL_BANK } from './index';
import { materializeLcBank } from './lc-bank.materialize';
import { formatLcProblems, validateAcrossLcBanks, validateLcBank } from './lc-bank.validate';
import type { LcBank } from './lc-bank.types';

interface Logger {
  log: (msg: string) => void;
  warn: (msg: string) => void;
}

const LC_SYNC_LOCK_KEY = 7_315_204_913;

export interface LcSyncReport {
  synced: number;
  upToDate: number;
  created: number;
  updated: number;
  retired: number;
  deleted: number;
  invalidBanks: string[];
}

/** Which authored bank a Little Coders test lesson maps to (or null). */
export function resolveLcBank(lesson: { type: SessionType; module: { slug: string } | null }): LcBank | null {
  if (lesson.type === SessionType.FINAL_TEST) return LC_FINAL_BANK;
  if (lesson.type === SessionType.COURSE_TEST && lesson.module) return LC_COURSE_BANKS[lesson.module.slug] ?? null;
  return null;
}

export async function syncLittleCodersBanks(prisma: PrismaClient, logger: Logger = console): Promise<LcSyncReport> {
  const report: LcSyncReport = { synced: 0, upToDate: 0, created: 0, updated: 0, retired: 0, deleted: 0, invalidBanks: [] };

  const banks = allLcBanks();
  const invalid = new Set<string>();
  for (const b of banks) {
    const problems = validateLcBank(b);
    if (problems.length) {
      invalid.add(b.id);
      logger.warn(`[lc-bank-sync] ${b.id} fails the Little Coders assessment standard and was NOT applied:\n${formatLcProblems(problems)}`);
    }
  }
  for (const p of validateAcrossLcBanks(banks)) {
    invalid.add(p.bankId);
    logger.warn(`[lc-bank-sync] ${p.bankId} · ${p.where}: ${p.message} — bank NOT applied`);
  }
  report.invalidBanks = [...invalid];

  const owners = await prisma.assessment.findMany({
    where: {
      sourceAssessmentId: null,
      format: AssessmentFormat.LITTLE_CODERS_V2,
      lesson: { course: { isCustom: false } },
    },
    select: {
      id: true,
      bankVersion: true,
      lesson: { select: { type: true, module: { select: { slug: true } }, course: { select: { slug: true } } } },
    },
  });

  for (const owner of owners) {
    if (!isLittleCodersSlug(owner.lesson.course.slug)) continue; // never another program
    const bank = resolveLcBank(owner.lesson);
    if (!bank || invalid.has(bank.id)) continue;
    if (owner.bankVersion >= LC_BANK_VERSION) {
      report.upToDate++;
      continue;
    }
    try {
      const applied = await applyLcBank(prisma, owner.id, bank);
      if (!applied) continue; // another instance is syncing
      report.synced++;
      report.created += applied.created;
      report.updated += applied.updated;
      report.retired += applied.retired;
      report.deleted += applied.deleted;
    } catch (err) {
      logger.warn(`[lc-bank-sync] could not apply ${bank.id} to assessment ${owner.id}: ${(err as Error).message}`);
    }
  }

  // A custom curriculum that imports a Little Coders test is linked to its bank (see
  // linked-assessment.ts); bring those rows' settings along once the bank is current.
  await refreshLinkedLcAssessments(prisma);

  if (report.synced > 0 || report.invalidBanks.length > 0) {
    logger.log(
      `[lc-bank-sync] v${LC_BANK_VERSION}: applied ${report.synced} Little Coders assessment(s) ` +
        `(+${report.created} created, ${report.updated} updated, ${report.retired} retired, ${report.deleted} removed); ${report.invalidBanks.length} invalid bank(s).`,
    );
  }
  return report;
}

interface Applied {
  created: number;
  updated: number;
  retired: number;
  deleted: number;
}

async function applyLcBank(prisma: PrismaClient, assessmentId: string, bank: LcBank): Promise<Applied | null> {
  const mat = materializeLcBank(bank);
  return prisma.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>(Prisma.sql`SELECT pg_try_advisory_xact_lock(${LC_SYNC_LOCK_KEY}) AS locked`);
      if (!locked) return null;
      const out: Applied = { created: 0, updated: 0, retired: 0, deleted: 0 };

      // ── Objective questions ──
      const existing = await tx.mCQQuestion.findMany({
        where: { assessmentId },
        select: { id: true, bankKey: true, editedByAdmin: true, isPublished: true, _count: { select: { answers: true } } },
      });
      const desired = new Set(mat.questions.map((q) => q.bankKey));
      const byKey = new Map(existing.filter((q) => q.bankKey).map((q) => [q.bankKey as string, q]));
      const toDelete: string[] = [];
      const toRetire: string[] = [];
      for (const q of existing) {
        if (q.bankKey && desired.has(q.bankKey)) continue;
        if (!q.bankKey && q.editedByAdmin) continue; // an admin's own question — never touched
        if (q._count.answers > 0) {
          if (q.isPublished) toRetire.push(q.id);
        } else {
          toDelete.push(q.id);
        }
      }
      if (toDelete.length) {
        await tx.mCQQuestion.deleteMany({ where: { id: { in: toDelete } } });
        out.deleted += toDelete.length;
      }
      if (toRetire.length) {
        await tx.mCQQuestion.updateMany({ where: { id: { in: toRetire } }, data: { isPublished: false } });
        out.retired += toRetire.length;
      }
      const toCreate = mat.questions.filter((q) => !byKey.has(q.bankKey));
      if (toCreate.length) {
        await tx.mCQQuestion.createMany({
          data: toCreate.map((q) => ({
            assessmentId,
            bankKey: q.bankKey,
            questionType: q.questionType,
            questionText: q.questionText,
            options: q.options as unknown as Prisma.InputJsonValue,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            difficulty: q.difficulty,
            tags: q.tags,
            order: q.order,
            isPublished: true,
          })),
          skipDuplicates: true,
        });
        out.created += toCreate.length;
      }
      for (const q of mat.questions) {
        const ex = byKey.get(q.bankKey);
        if (!ex || ex.editedByAdmin) continue;
        await tx.mCQQuestion.update({
          where: { id: ex.id },
          data: {
            questionType: q.questionType,
            questionText: q.questionText,
            options: q.options as unknown as Prisma.InputJsonValue,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            difficulty: q.difficulty,
            tags: q.tags,
            order: q.order,
            isPublished: true,
          },
        });
        out.updated++;
      }

      // ── Practical project(s) ──
      const practicals = await tx.practicalQuestion.findMany({
        where: { assessmentId },
        select: { id: true, bankKey: true, isPublished: true, spec: true, _count: { select: { submissions: true } } },
      });
      const wanted = new Set(mat.practicals.map((p) => p.bankKey));
      for (const p of practicals) {
        if (p.bankKey && wanted.has(p.bankKey)) continue;
        if (p._count.submissions > 0) {
          if (p.isPublished) {
            await tx.practicalQuestion.update({ where: { id: p.id }, data: { isPublished: false } });
            out.retired++;
          }
        } else {
          await tx.practicalQuestion.delete({ where: { id: p.id } });
          out.deleted++;
        }
      }
      for (const p of mat.practicals) {
        const have = practicals.find((x) => x.bankKey === p.bankKey);
        const data = {
          title: p.title,
          instructions: p.instructions,
          language: p.language,
          starterCode: null,
          testCases: Prisma.DbNull,
          rubric: p.rubric as unknown as Prisma.InputJsonValue,
          maxScore: p.maxScore,
          order: p.order,
          isPublished: true,
          spec: p.spec as unknown as Prisma.InputJsonValue,
          variantKey: p.variantKey,
        };
        if (have) {
          const stored = have.spec as { adminEdited?: boolean } | null;
          if (stored?.adminEdited) continue; // an admin edited it — leave it exactly as written
          await tx.practicalQuestion.update({ where: { id: have.id }, data });
          out.updated++;
        } else {
          await tx.practicalQuestion.create({ data: { assessmentId, bankKey: p.bankKey, ...data } });
          out.created++;
        }
      }

      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          instructions: lcAssessmentInstructions(bank.kind),
          mcqCount: 0,
          vivaMaxScore: 0,
          format: AssessmentFormat.LITTLE_CODERS_V2,
          bankVersion: LC_BANK_VERSION,
        },
      });
      return out;
    },
    { timeout: 60_000, maxWait: 15_000 },
  );
}

/** Linked assessments (a custom curriculum's imported Little Coders test) mirror their bank's format. */
async function refreshLinkedLcAssessments(prisma: PrismaClient): Promise<void> {
  const stale = await prisma.assessment.findMany({
    where: { sourceAssessmentId: { not: null }, format: AssessmentFormat.STANDARD, sourceAssessment: { format: AssessmentFormat.LITTLE_CODERS_V2, bankVersion: { gte: LC_BANK_VERSION } } },
    select: { id: true, sourceAssessment: { select: { instructions: true, bankVersion: true, activeVariant: true } } },
  });
  for (const a of stale) {
    if (!a.sourceAssessment) continue;
    await prisma.assessment.update({
      where: { id: a.id },
      data: {
        format: AssessmentFormat.LITTLE_CODERS_V2,
        instructions: a.sourceAssessment.instructions,
        bankVersion: a.sourceAssessment.bankVersion,
        activeVariant: a.sourceAssessment.activeVariant,
      },
    });
  }
}

export { LC_COURSE_SLUG };

// FILE PATH: server/src/structured-assessments/structured.sync.ts
//
// Applies the authored structured banks (Pre-University CSE: eight course assessments and the final
// assessment) to the database. Runs on every boot, right after the standard and Little Coders bank
// syncs, and is safe on a live database full of students and attempts:
//
//   * Only assessments of the registry's catalog course whose bankVersion is below
//     STRUCTURED_BANK_VERSION are touched — no other program's assessment is ever read or written.
//   * Idempotent — a bank is applied once; questions are matched by their stable bank key.
//   * Non-destructive — a question a student already answered is UNPUBLISHED, never deleted
//     (every TestReport keeps its own frozen snapshot); only never-answered ones are deleted.
//   * Admin-safe — a multiple-choice question an admin edited (editedByAdmin), a short answer an
//     admin edited and a practical an admin edited (spec.adminEdited) are left exactly as written.
//   * Validated first — a bank that fails the standard is never written.
//   * Multi-instance safe — the write phase holds a Postgres advisory lock.

import { AssessmentFormat, Prisma, PrismaClient, SessionType } from '@prisma/client';
import { canonicalCourseSlug } from '../courses/course-slug';
import {
  STRUCTURED_BANK_VERSION,
  STRUCTURED_TIME_LIMIT_MINUTES,
  structuredInstructions,
} from './structured.constants';
import { materializeStructuredBank } from './structured.materialize';
import {
  formatStructuredProblems,
  validateAcrossStructuredBanks,
  validateStructuredBank,
} from './structured.validate';
import type { StructuredBank, StructuredRegistry } from './structured.types';
import { PUCSE_REGISTRY } from '../pre-university-cse/banks';

interface Logger {
  log: (msg: string) => void;
  warn: (msg: string) => void;
}

const STRUCTURED_SYNC_LOCK_KEY = 7_315_204_977;

export interface StructuredSyncReport {
  synced: number;
  upToDate: number;
  created: number;
  updated: number;
  retired: number;
  deleted: number;
  invalidBanks: string[];
}

export function allStructuredBanks(registry: StructuredRegistry): StructuredBank[] {
  return [...Object.values(registry.courseTests), registry.finalBank];
}

/** Which authored bank a test lesson of the program maps to (or null). */
export function resolveStructuredBank(
  registry: StructuredRegistry,
  lesson: { type: SessionType; module: { slug: string } | null },
): StructuredBank | null {
  if (lesson.type === SessionType.FINAL_TEST) return registry.finalBank;
  if (lesson.type === SessionType.COURSE_TEST && lesson.module) return registry.courseTests[lesson.module.slug] ?? null;
  return null;
}

export async function syncStructuredBanks(
  prisma: PrismaClient,
  logger: Logger = console,
  registry: StructuredRegistry = PUCSE_REGISTRY,
  version: number = STRUCTURED_BANK_VERSION,
): Promise<StructuredSyncReport> {
  const report: StructuredSyncReport = { synced: 0, upToDate: 0, created: 0, updated: 0, retired: 0, deleted: 0, invalidBanks: [] };

  const banks = allStructuredBanks(registry);
  const invalid = new Set<string>();
  for (const b of banks) {
    const problems = validateStructuredBank(b);
    if (problems.length) {
      invalid.add(b.id);
      logger.warn(`[structured-bank-sync] ${b.id} fails the structured assessment standard and was NOT applied:\n${formatStructuredProblems(problems)}`);
    }
  }
  for (const p of validateAcrossStructuredBanks(banks)) {
    invalid.add(p.bankId);
    logger.warn(`[structured-bank-sync] ${p.bankId} · ${p.where}: ${p.message} — bank NOT applied`);
  }
  report.invalidBanks = [...invalid];

  const owners = await prisma.assessment.findMany({
    where: { sourceAssessmentId: null, lesson: { course: { isCustom: false } } },
    select: {
      id: true,
      bankVersion: true,
      lesson: { select: { type: true, module: { select: { slug: true } }, course: { select: { slug: true } } } },
    },
  });

  for (const owner of owners) {
    // Never another program's assessment (a retired "-path" spelling still counts as this program).
    if (canonicalCourseSlug(owner.lesson.course.slug) !== registry.courseSlug) continue;
    const bank = resolveStructuredBank(registry, owner.lesson);
    if (!bank || invalid.has(bank.id)) continue;
    if (owner.bankVersion >= version) {
      report.upToDate++;
      continue;
    }
    try {
      const applied = await applyStructuredBank(prisma, owner.id, bank, version);
      if (!applied) continue; // another instance is syncing
      report.synced++;
      report.created += applied.created;
      report.updated += applied.updated;
      report.retired += applied.retired;
      report.deleted += applied.deleted;
    } catch (err) {
      logger.warn(`[structured-bank-sync] could not apply ${bank.id} to assessment ${owner.id}: ${(err as Error).message}`);
    }
  }

  // A custom curriculum that imports one of these test sessions is linked to its bank (see
  // linked-assessment.ts); bring those rows' settings along once the bank is current.
  await refreshLinkedStructuredAssessments(prisma, version);

  if (report.synced > 0 || report.invalidBanks.length > 0) {
    logger.log(
      `[structured-bank-sync] v${version}: applied ${report.synced} assessment(s) ` +
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

async function applyStructuredBank(
  prisma: PrismaClient,
  assessmentId: string,
  bank: StructuredBank,
  version: number,
): Promise<Applied | null> {
  const mat = materializeStructuredBank(bank);
  return prisma.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>(
        Prisma.sql`SELECT pg_try_advisory_xact_lock(${STRUCTURED_SYNC_LOCK_KEY}) AS locked`,
      );
      if (!locked) return null;
      const out: Applied = { created: 0, updated: 0, retired: 0, deleted: 0 };

      // ── Part A: multiple choice ──
      const existing = await tx.mCQQuestion.findMany({
        where: { assessmentId },
        select: { id: true, bankKey: true, editedByAdmin: true, isPublished: true, _count: { select: { answers: true } } },
      });
      const desired = new Set(mat.mcq.map((q) => q.bankKey));
      const byKey = new Map(existing.filter((q) => q.bankKey).map((q) => [q.bankKey as string, q]));
      const toDelete: string[] = [];
      const toRetire: string[] = [];
      for (const q of existing) {
        if (q.bankKey && desired.has(q.bankKey)) continue;
        if (!q.bankKey && q.editedByAdmin) continue; // an admin's own question — never touched
        if (q._count.answers > 0) {
          if (q.isPublished) toRetire.push(q.id);
        } else toDelete.push(q.id);
      }
      if (toDelete.length) {
        await tx.mCQQuestion.deleteMany({ where: { id: { in: toDelete } } });
        out.deleted += toDelete.length;
      }
      if (toRetire.length) {
        await tx.mCQQuestion.updateMany({ where: { id: { in: toRetire } }, data: { isPublished: false } });
        out.retired += toRetire.length;
      }
      for (const q of mat.mcq) {
        const data = {
          questionType: 'MCQ' as const,
          questionText: q.questionText,
          options: q.options as unknown as Prisma.InputJsonValue,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          difficulty: q.difficulty,
          tags: q.tags,
          order: q.order,
          isPublished: true,
        };
        const have = byKey.get(q.bankKey);
        if (!have) {
          await tx.mCQQuestion.create({ data: { assessmentId, bankKey: q.bankKey, ...data } });
          out.created++;
        } else if (!have.editedByAdmin) {
          await tx.mCQQuestion.update({ where: { id: have.id }, data });
          out.updated++;
        }
      }

      // ── Part B: short answers ──
      const shorts = await tx.shortAnswerQuestion.findMany({
        where: { assessmentId },
        select: { id: true, bankKey: true, editedByAdmin: true, isPublished: true, _count: { select: { responses: true } } },
      });
      const wantedShort = new Set(mat.shortAnswers.map((q) => q.bankKey));
      for (const q of shorts) {
        if (q.bankKey && wantedShort.has(q.bankKey)) continue;
        if (!q.bankKey && q.editedByAdmin) continue;
        if (q._count.responses > 0) {
          if (q.isPublished) {
            await tx.shortAnswerQuestion.update({ where: { id: q.id }, data: { isPublished: false } });
            out.retired++;
          }
        } else {
          await tx.shortAnswerQuestion.delete({ where: { id: q.id } });
          out.deleted++;
        }
      }
      for (const q of mat.shortAnswers) {
        const data = {
          prompt: q.prompt,
          maxScore: q.maxScore,
          rubric: q.rubric as unknown as Prisma.InputJsonValue,
          modelAnswer: q.modelAnswer,
          order: q.order,
          isPublished: true,
        };
        const have = shorts.find((x) => x.bankKey === q.bankKey);
        if (!have) {
          await tx.shortAnswerQuestion.create({ data: { assessmentId, bankKey: q.bankKey, ...data } });
          out.created++;
        } else if (!have.editedByAdmin) {
          await tx.shortAnswerQuestion.update({ where: { id: have.id }, data });
          out.updated++;
        }
      }

      // ── Part C: the practical ──
      const practicals = await tx.practicalQuestion.findMany({
        where: { assessmentId },
        select: { id: true, bankKey: true, isPublished: true, spec: true, _count: { select: { submissions: true } } },
      });
      const p = mat.practical;
      for (const have of practicals) {
        if (have.bankKey === p.bankKey) continue;
        if (have.bankKey === null && (have.spec as { adminEdited?: boolean } | null)?.adminEdited) continue;
        if (have._count.submissions > 0) {
          if (have.isPublished) {
            await tx.practicalQuestion.update({ where: { id: have.id }, data: { isPublished: false } });
            out.retired++;
          }
        } else {
          await tx.practicalQuestion.delete({ where: { id: have.id } });
          out.deleted++;
        }
      }
      const practicalData = {
        title: p.title,
        instructions: p.instructions,
        language: p.language,
        starterCode: p.starterCode,
        testCases: Prisma.DbNull,
        rubric: p.rubric as unknown as Prisma.InputJsonValue,
        maxScore: p.maxScore,
        order: p.order,
        isPublished: true,
        spec: p.spec as unknown as Prisma.InputJsonValue,
        variantKey: null,
      };
      const havePractical = practicals.find((x) => x.bankKey === p.bankKey);
      if (havePractical) {
        if (!(havePractical.spec as { adminEdited?: boolean } | null)?.adminEdited) {
          await tx.practicalQuestion.update({ where: { id: havePractical.id }, data: practicalData });
          out.updated++;
        }
      } else {
        await tx.practicalQuestion.create({ data: { assessmentId, bankKey: p.bankKey, ...practicalData } });
        out.created++;
      }

      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          title: bank.title,
          instructions: structuredInstructions(bank.kind),
          mcqCount: 0,
          vivaMaxScore: 0,
          format: AssessmentFormat.STRUCTURED_V1,
          timeLimitMinutes: STRUCTURED_TIME_LIMIT_MINUTES,
          bankVersion: version,
        },
      });
      return out;
    },
    { timeout: 60_000, maxWait: 15_000 },
  );
}

/** Linked assessments (a custom curriculum's imported test) mirror their bank's format and time limit. */
async function refreshLinkedStructuredAssessments(prisma: PrismaClient, version: number): Promise<void> {
  const stale = await prisma.assessment.findMany({
    where: {
      sourceAssessmentId: { not: null },
      format: { not: AssessmentFormat.STRUCTURED_V1 },
      sourceAssessment: { format: AssessmentFormat.STRUCTURED_V1, bankVersion: { gte: version } },
    },
    select: { id: true, sourceAssessment: { select: { instructions: true, bankVersion: true, timeLimitMinutes: true } } },
  });
  for (const a of stale) {
    if (!a.sourceAssessment) continue;
    await prisma.assessment.update({
      where: { id: a.id },
      data: {
        format: AssessmentFormat.STRUCTURED_V1,
        instructions: a.sourceAssessment.instructions,
        bankVersion: a.sourceAssessment.bankVersion,
        timeLimitMinutes: a.sourceAssessment.timeLimitMinutes,
      },
    });
  }
}

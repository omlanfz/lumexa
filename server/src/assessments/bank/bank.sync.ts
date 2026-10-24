// FILE PATH: server/src/assessments/bank/bank.sync.ts
//
// Applies the maintained question banks (this folder) to the database. Runs on
// every boot (CoursesService.onModuleInit → seedCourseCatalog) and from the
// standalone `npm run seed:courses` script, and is built to be safe to run on a
// live database full of real students and attempts:
//
//   * Idempotent — a bank is applied to an assessment only while
//     Assessment.bankVersion < BANK_CONTENT_VERSION; questions are matched by
//     their stable bankKey, so nothing is ever inserted twice.
//   * Non-destructive — a question that a student has already answered is
//     UNPUBLISHED, never deleted (MCQAnswer keeps pointing at it, so past
//     attempts and reports still read correctly). Only never-answered legacy
//     questions are deleted.
//   * Admin-safe — a question an admin has edited (editedByAdmin) is left
//     exactly as the admin wrote it.
//   * Validated first — a bank that fails the standard (bank.validate.ts) is
//     never written; the existing questions stay in place and the problem is
//     logged loudly.
//   * Multi-instance safe — the write phase holds a Postgres advisory lock, so
//     two instances booting together don't interleave.
//   * Linked-bank aware — custom curricula never get questions of their own;
//     the safety net here only (re)links their imported test lessons.

import { Prisma, PrismaClient, SessionType } from '@prisma/client';
import { BANK_CONTENT_VERSION, standardInstructions } from './bank.constants';
import { materializeBank } from './bank.materialize';
import { BankRegistry, DEFAULT_REGISTRY } from './bank.registry';
import { BankTestType, TestBank } from './bank.types';
import {
  formatProblems,
  validateAcrossBanks,
  validateBank,
} from './bank.validate';
import {
  BANK_OWNER_SELECT,
  ensureLinkedAssessment,
} from '../linked-assessment';

interface SyncLogger {
  log: (msg: string) => void;
  warn: (msg: string) => void;
}

export interface SyncReport {
  assessmentsSynced: number;
  assessmentsUpToDate: number;
  assessmentsUnmapped: number;
  assessmentsSkippedLocked: number;
  questionsCreated: number;
  questionsUpdated: number;
  questionsRetired: number;
  questionsDeleted: number;
  invalidBanks: string[];
  linksCreated: number;
  linkedRefreshed: number;
  titlesFixed: number;
}

// Arbitrary constant — the advisory lock namespace for "assessment bank sync".
const SYNC_LOCK_KEY = 7_315_204_911;

function emptyReport(): SyncReport {
  return {
    assessmentsSynced: 0,
    assessmentsUpToDate: 0,
    assessmentsUnmapped: 0,
    assessmentsSkippedLocked: 0,
    questionsCreated: 0,
    questionsUpdated: 0,
    questionsRetired: 0,
    questionsDeleted: 0,
    invalidBanks: [],
    linksCreated: 0,
    linkedRefreshed: 0,
    titlesFixed: 0,
  };
}

/** Which authored bank a catalog assessment's lesson maps to (or null). */
export function resolveBank(
  registry: BankRegistry,
  lesson: {
    type: SessionType;
    title: string;
    module: { slug: string } | null;
    course: { slug: string };
  },
): TestBank | null {
  if (!registry.courseSlugs.includes(lesson.course.slug)) return null;
  switch (lesson.type) {
    case SessionType.COURSE_TEST:
      return lesson.module
        ? (registry.courseTests[lesson.module.slug] ?? null)
        : null;
    case SessionType.FINAL_TEST:
      return registry.finalTests[lesson.course.slug] ?? null;
    case SessionType.STAGE_TEST: {
      const m = /stage\s*(\d+)/i.exec(lesson.title);
      return m ? (registry.stageTests[Number(m[1])] ?? null) : null;
    }
    default:
      return null;
  }
}

export async function syncAssessmentBanks(
  prisma: PrismaClient,
  logger: SyncLogger = console,
  registry: BankRegistry = DEFAULT_REGISTRY,
  version: number = BANK_CONTENT_VERSION,
): Promise<SyncReport> {
  const report = emptyReport();

  // 1. Only banks that meet the standard may be applied.
  const banks = [
    ...Object.values(registry.courseTests),
    ...Object.values(registry.stageTests),
    ...Object.values(registry.finalTests),
  ];
  const invalid = new Set<string>();
  for (const bank of banks) {
    const problems = validateBank(bank);
    if (problems.length > 0) {
      invalid.add(bank.id);
      logger.warn(
        `[bank-sync] ${bank.id} fails the test standard and was NOT applied:\n${formatProblems(problems)}`,
      );
    }
  }
  for (const p of validateAcrossBanks(banks)) {
    invalid.add(p.bankId);
    logger.warn(
      `[bank-sync] ${p.bankId} · ${p.where}: ${p.message} — bank NOT applied`,
    );
  }
  report.invalidBanks = [...invalid];

  // 2. Custom curricula: make sure every imported test lesson links to its bank.
  report.linksCreated = await linkImportedTestLessons(prisma);

  // 3. Catalog test lessons that still carry the internal pathway slug.
  report.titlesFixed = await fixLegacyFinalTestTitles(prisma);

  // 4. Apply banks to the catalog's own (non-linked) assessments.
  const owners = await prisma.assessment.findMany({
    where: {
      sourceAssessmentId: null,
      lesson: { course: { isCustom: false } },
    },
    select: {
      id: true,
      type: true,
      bankVersion: true,
      lesson: {
        select: {
          type: true,
          title: true,
          module: { select: { slug: true } },
          course: { select: { slug: true } },
        },
      },
    },
  });

  for (const owner of owners) {
    const bank = resolveBank(registry, owner.lesson);
    if (!bank) {
      report.assessmentsUnmapped++;
      continue;
    }
    if (invalid.has(bank.id)) continue;
    if (owner.bankVersion >= version) {
      report.assessmentsUpToDate++;
      continue;
    }
    try {
      const applied = await applyBank(prisma, owner.id, bank, version);
      if (!applied) {
        report.assessmentsSkippedLocked++;
        continue;
      }
      report.assessmentsSynced++;
      report.questionsCreated += applied.created;
      report.questionsUpdated += applied.updated;
      report.questionsRetired += applied.retired;
      report.questionsDeleted += applied.deleted;
    } catch (err) {
      logger.warn(
        `[bank-sync] could not apply ${bank.id} to assessment ${owner.id}: ${(err as Error).message}`,
      );
    }
  }

  // 5. Linked assessments pick up the standard instructions of their bank.
  report.linkedRefreshed = await refreshLinkedAssessments(prisma, version);

  if (
    report.assessmentsSynced > 0 ||
    report.linksCreated > 0 ||
    report.titlesFixed > 0 ||
    report.linkedRefreshed > 0 ||
    report.invalidBanks.length > 0
  ) {
    logger.log(
      `[bank-sync] v${version}: synced ${report.assessmentsSynced} assessment(s) ` +
        `(+${report.questionsCreated} created, ${report.questionsUpdated} updated, ` +
        `${report.questionsRetired} retired, ${report.questionsDeleted} removed), ` +
        `linked ${report.linksCreated} custom test lesson(s), refreshed ${report.linkedRefreshed} linked assessment(s), ` +
        `tidied ${report.titlesFixed} title(s); ${report.assessmentsUnmapped} unmapped, ${report.invalidBanks.length} invalid bank(s).`,
    );
  }
  return report;
}

// ─── Applying one bank to one assessment ────────────────────────────────────

interface Applied {
  created: number;
  updated: number;
  retired: number;
  deleted: number;
}

async function applyBank(
  prisma: PrismaClient,
  assessmentId: string,
  bank: TestBank,
  version: number,
): Promise<Applied | null> {
  const mat = materializeBank(bank);
  const type: BankTestType = bank.type;

  return prisma.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>(
        Prisma.sql`SELECT pg_try_advisory_xact_lock(${SYNC_LOCK_KEY}) AS locked`,
      );
      if (!locked) return null; // another instance is syncing right now

      const out: Applied = { created: 0, updated: 0, retired: 0, deleted: 0 };

      // ── Objective questions ────────────────────────────────────────────
      const existing = await tx.mCQQuestion.findMany({
        where: { assessmentId },
        select: {
          id: true,
          bankKey: true,
          editedByAdmin: true,
          isPublished: true,
          _count: { select: { answers: true } },
        },
      });
      const desiredKeys = new Set(mat.questions.map((q) => q.bankKey));
      const byKey = new Map(
        existing.filter((q) => q.bankKey).map((q) => [q.bankKey as string, q]),
      );

      const toDelete: string[] = [];
      const toRetire: string[] = [];
      for (const q of existing) {
        if (q.bankKey && desiredKeys.has(q.bankKey)) continue; // managed + still wanted
        if (!q.bankKey && q.editedByAdmin) continue; // an admin's own question — never touched
        if (q._count.answers > 0) {
          if (q.isPublished) toRetire.push(q.id); // answered before: keep for history, stop using
        } else {
          toDelete.push(q.id);
        }
      }
      if (toDelete.length) {
        await tx.mCQQuestion.deleteMany({ where: { id: { in: toDelete } } });
        out.deleted += toDelete.length;
      }
      if (toRetire.length) {
        await tx.mCQQuestion.updateMany({
          where: { id: { in: toRetire } },
          data: { isPublished: false },
        });
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

      // ── Coding project (Final Tests only) ─────────────────────────────
      const practicals = await tx.practicalQuestion.findMany({
        where: { assessmentId },
        select: {
          id: true,
          bankKey: true,
          isPublished: true,
          _count: { select: { submissions: true } },
        },
      });
      const wantedKey = mat.coding?.bankKey ?? null;
      for (const p of practicals) {
        if (wantedKey && p.bankKey === wantedKey) continue;
        if (p._count.submissions > 0) {
          if (p.isPublished) {
            await tx.practicalQuestion.update({
              where: { id: p.id },
              data: { isPublished: false },
            });
            out.retired++;
          }
        } else {
          await tx.practicalQuestion.delete({ where: { id: p.id } });
          out.deleted++;
        }
      }
      if (mat.coding) {
        const data = {
          title: mat.coding.title,
          instructions: mat.coding.instructions,
          language: mat.coding.language,
          starterCode: mat.coding.starterCode,
          testCases: Prisma.DbNull,
          rubric: mat.coding.rubric as unknown as Prisma.InputJsonValue,
          maxScore: mat.coding.maxScore,
          order: 0,
          isPublished: true,
        };
        const have = practicals.find((p) => p.bankKey === mat.coding!.bankKey);
        if (have) {
          await tx.practicalQuestion.update({ where: { id: have.id }, data });
          out.updated++;
        } else {
          await tx.practicalQuestion.create({
            data: { assessmentId, bankKey: mat.coding.bankKey, ...data },
          });
          out.created++;
        }
      }

      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          instructions: standardInstructions(type),
          mcqCount: 0,
          vivaMaxScore: 0,
          bankVersion: version,
        },
      });
      return out;
    },
    { timeout: 60_000, maxWait: 15_000 },
  );
}

// ─── Linked banks ───────────────────────────────────────────────────────────

/** Safety net for the SQL migration: any test lesson in a custom curriculum
 *  that was imported from a default curriculum's test session but has no
 *  Assessment yet gets one linked to the original bank. */
export async function linkImportedTestLessons(
  prisma: PrismaClient,
): Promise<number> {
  const orphans = await prisma.lesson.findMany({
    where: {
      course: { isCustom: true },
      type: { not: SessionType.LEARNING },
      assessment: null,
    },
    select: { id: true, type: true, sourceRefs: true },
  });
  let created = 0;
  for (const lesson of orphans) {
    const refs = lesson.sourceRefs as { importedFromLessonId?: unknown } | null;
    const sourceLessonId =
      typeof refs?.importedFromLessonId === 'string'
        ? refs.importedFromLessonId
        : null;
    if (!sourceLessonId) continue;
    const source = await prisma.assessment.findUnique({
      where: { lessonId: sourceLessonId },
      select: BANK_OWNER_SELECT,
    });
    if (!source) continue;
    if (await ensureLinkedAssessment(prisma, lesson.id, lesson.type, source))
      created++;
  }
  return created;
}

/** A linked assessment copies its bank's settings when it is created; once
 *  the bank itself is upgraded, bring the linked row's instructions along. */
async function refreshLinkedAssessments(
  prisma: PrismaClient,
  version: number,
): Promise<number> {
  const stale = await prisma.assessment.findMany({
    where: { sourceAssessmentId: { not: null }, bankVersion: { lt: version } },
    select: {
      id: true,
      sourceAssessment: { select: { bankVersion: true, instructions: true } },
    },
  });
  let refreshed = 0;
  for (const a of stale) {
    const src = a.sourceAssessment;
    if (!src || src.bankVersion < version) continue; // bank not upgraded (yet)
    await prisma.assessment.update({
      where: { id: a.id },
      data: {
        instructions: src.instructions,
        mcqCount: 0,
        vivaMaxScore: 0,
        bankVersion: version,
      },
    });
    refreshed++;
  }
  return refreshed;
}

// ─── Cosmetic: "<pathway-slug> — Final Test" → "<Pathway Title> — Final Test" ─

const LEGACY_FINAL_TITLE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\s+—\s+Final Test$/;

async function fixLegacyFinalTestTitles(prisma: PrismaClient): Promise<number> {
  const lessons = await prisma.lesson.findMany({
    where: {
      type: SessionType.FINAL_TEST,
      title: { endsWith: '— Final Test' },
    },
    select: { id: true, title: true },
  });
  if (lessons.length === 0) return 0;
  const courses = await prisma.course.findMany({
    where: { isCustom: false },
    select: { slug: true, title: true },
  });
  const titleBySlug = new Map(courses.map((c) => [c.slug, c.title]));
  let fixed = 0;
  for (const l of lessons) {
    const m = LEGACY_FINAL_TITLE.exec(l.title);
    const nice = m ? titleBySlug.get(m[1]) : undefined;
    if (!nice) continue;
    await prisma.lesson.update({
      where: { id: l.id },
      data: { title: `${nice} — Final Test` },
    });
    fixed++;
  }
  return fixed;
}

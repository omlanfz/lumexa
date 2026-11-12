// FILE PATH: server/src/assessments/assessment-files.service.ts
//
// Temporary file storage for an assessment's practical project (Little Coders: Stretch3 .sb3
// files, EduBlocks .py files, screenshots …). A reusable workflow: an assessment uses it only
// when its format has a file profile (see fileProfileFor) — every other assessment is untouched.
//
// Where the bytes live: the PRIVATE homework bucket (HOMEWORK_R2_BUCKET = `lumexa-homework`),
// reached through the existing HomeworkStorage (the same S3 client and credentials), under a
// prefix of their own:
//
//     assessments/<program>/<assessmentId>/<studentId>/<attemptId>/<fileId>-<name>
//
// so these objects can never be mistaken for homework (`homework/…`), and class recordings are
// in a different bucket altogether. Every object has an AssessmentFile row — the only record of
// it — and nothing outside `assessments/` is ever deleted by this service.
//
// Life of a file:
//   upload     student → this server → R2 (all or nothing). Row UPLOADED. Only while the attempt
//              is IN_PROGRESS; the student may take a file back (→ DELETE_PENDING).
//   submit     the attempt's UPLOADED files are checked to be really in R2 at their full size, and
//              become ATTACHED in the same transaction that submits the attempt.
//   review     the teacher opens / downloads files through short-lived signed links. Opening or
//              previewing NEVER changes a file's status.
//   finalise   when the teacher completes the practical evaluation and approves the report, the
//              attempt's files are marked DELETE_PENDING in the SAME transaction that saves the
//              final score (so a file is never marked before the score is safely stored), then
//              removed from R2. A failed removal stays DELETE_PENDING and a sweep retries it with a
//              growing delay, logging clearly. Repeating any step is a harmless no-op.
//   afterwards the row (name, size, times, why it was removed) stays as history; the contents are
//              gone.

import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import {
  AssessmentFile,
  AssessmentFileDeleteReason,
  AssessmentFileStatus,
  AssessmentFormat,
  AttemptStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { HOMEWORK_STORAGE } from '../submissions/homework-files.service';
import type { HomeworkStorage } from '../submissions/homework-storage.service';
import { describeStorageError } from '../submissions/homework-storage.service';
import {
  HomeworkViewKind,
  contentTypeFor,
  extensionOf,
  looksLikeText,
  safeFileName,
  signatureProblem,
  viewKindFor,
} from '../submissions/homework-file-types';
import { LC_FILE_LIMITS, LC_PROGRAM_KEY } from '../little-coders/lc.constants';
import { rootBankId } from './linked-assessment';

// ─── Profiles: which assessments use this workflow, and its limits ───────────

export interface AssessmentFileProfile {
  programKey: string;
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  allowedExtensions: ReadonlySet<string>;
}

/** What a Little Coders practical may be handed in as: a Scratch / Stretch3 project, EduBlocks
 *  Python, screenshots and documents. Nothing executable. */
export const LC_FILE_PROFILE: AssessmentFileProfile = {
  programKey: LC_PROGRAM_KEY,
  maxFiles: LC_FILE_LIMITS.maxFiles,
  maxFileBytes: LC_FILE_LIMITS.maxFileBytes,
  maxTotalBytes: LC_FILE_LIMITS.maxTotalBytes,
  allowedExtensions: new Set([
    'sb3',
    'sb2',
    'py',
    'txt',
    'md',
    'json',
    'zip',
    'pdf',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
  ]),
};

/** The file profile of an assessment format, or null when that format hands nothing in as files. */
export function fileProfileFor(
  format: AssessmentFormat,
): AssessmentFileProfile | null {
  return format === AssessmentFormat.LITTLE_CODERS_V2 ? LC_FILE_PROFILE : null;
}

/** The root key prefix every assessment object lives under. */
export const ASSESSMENT_KEY_ROOT = 'assessments/';

const seg = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, '_');

export function assessmentObjectKey(parts: {
  programKey: string;
  assessmentId: string;
  studentUserId: string;
  attemptId: string;
  fileId: string;
  fileName: string;
}): string {
  const name = safeFileName(parts.fileName).replace(/[^A-Za-z0-9._-]/g, '_');
  return `${ASSESSMENT_KEY_ROOT}${seg(parts.programKey)}/${seg(parts.assessmentId)}/${seg(parts.studentUserId)}/${seg(parts.attemptId)}/${seg(parts.fileId)}-${name}`;
}

/** Defence in depth: nothing outside the assessment prefix is ever deleted from here. */
export function isAssessmentKey(key: string): boolean {
  return (
    key.startsWith(ASSESSMENT_KEY_ROOT) &&
    !key.includes('..') &&
    key.split('/').length >= 6
  );
}

// ─── Retry / sweep tuning ───────────────────────────────────────────────────

const SWEEP_BATCH = 100;
const RETRY_BASE_MINUTES = 1;
const RETRY_MAX_MINUTES = 60;
export const VIEWER_MAX_TEXT_BYTES = 1024 * 1024;

export interface PresentedAssessmentFile {
  id: string;
  name: string;
  size: number;
  kind: HomeworkViewKind;
  status: AssessmentFileStatus;
  /** The contents were removed after the review was finalised (or taken back by the student). */
  removed: boolean;
}

export type AssessmentFileAccess =
  | { kind: 'SOURCE' | 'NOTEBOOK'; name: string; viewerPath: string }
  | { kind: HomeworkViewKind; name: string; url: string; expiresAt: Date };

export interface Actor {
  userId: string;
  role: Role;
}

export const presentAssessmentFile = (
  f: Pick<AssessmentFile, 'id' | 'originalName' | 'sizeBytes' | 'status'>,
): PresentedAssessmentFile => ({
  id: f.id,
  name: f.originalName,
  size: f.sizeBytes,
  kind: viewKindFor(f.originalName),
  status: f.status,
  removed:
    f.status === AssessmentFileStatus.DELETE_PENDING ||
    f.status === AssessmentFileStatus.DELETED,
});

@Injectable()
export class AssessmentFilesService {
  private readonly logger = new Logger(AssessmentFilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(HOMEWORK_STORAGE) private readonly storage: HomeworkStorage,
  ) {}

  // ─── Upload (student, while the test is in progress) ───────────────────────

  private async loadAttemptForUpload(attemptId: string, studentUserId: string) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        studentUserId: true,
        status: true,
        lockedAt: true,
        assessment: {
          select: { id: true, sourceAssessmentId: true, format: true },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentUserId !== studentUserId) throw new ForbiddenException();
    // The format lives on the bank the test reads from (a linked test mirrors it).
    const rootId = rootBankId(attempt.assessment);
    const root =
      rootId === attempt.assessment.id
        ? attempt.assessment
        : await this.prisma.assessment.findUniqueOrThrow({
            where: { id: rootId },
            select: { id: true, format: true, sourceAssessmentId: true },
          });
    const profile =
      fileProfileFor(attempt.assessment.format) ?? fileProfileFor(root.format);
    if (!profile)
      throw new BadRequestException('This test does not take file uploads.');
    return { attempt, profile };
  }

  private assertOpen(status: AttemptStatus, lockedAt: Date | null) {
    if (status !== AttemptStatus.IN_PROGRESS) {
      throw new ConflictException(
        lockedAt
          ? 'Your teacher locked this test, so files can no longer be changed.'
          : 'This test has already been submitted, so files can no longer be changed.',
      );
    }
  }

  /** Stores a student's practical files. All of them or none. */
  async uploadFiles(
    studentUserId: string,
    attemptId: string,
    files: Express.Multer.File[],
  ): Promise<PresentedAssessmentFile[]> {
    if (!files || files.length === 0)
      throw new BadRequestException('No file provided.');
    const { attempt, profile } = await this.loadAttemptForUpload(
      attemptId,
      studentUserId,
    );
    this.assertOpen(attempt.status, attempt.lockedAt);

    // Everything that can be wrong with the request is found before anything is stored.
    let total = 0;
    for (const file of files) {
      const name = safeFileName(file.originalname);
      const ext = extensionOf(name);
      if (!profile.allowedExtensions.has(ext)) {
        throw new BadRequestException(
          `“.${ext || 'unknown'}” files are not allowed here. You can hand in ${[...profile.allowedExtensions].map((e) => `.${e}`).join(', ')}.`,
        );
      }
      if (!file.buffer || file.size === 0)
        throw new BadRequestException(`“${name}” is empty.`);
      if (file.size > profile.maxFileBytes)
        throw new PayloadTooLargeException(
          `“${name}” is larger than ${Math.round(profile.maxFileBytes / 1024 / 1024)} MB.`,
        );
      const disguised = signatureProblem(name, file.buffer);
      if (disguised) throw new BadRequestException(disguised);
      total += file.size;
    }
    const existing = await this.prisma.assessmentFile.findMany({
      where: {
        attemptId,
        status: {
          in: [AssessmentFileStatus.UPLOADED, AssessmentFileStatus.ATTACHED],
        },
      },
      select: { sizeBytes: true },
    });
    if (existing.length + files.length > profile.maxFiles)
      throw new ConflictException(
        `You can hand in up to ${profile.maxFiles} files. Remove one first.`,
      );
    if (
      existing.reduce((s, f) => s + f.sizeBytes, 0) + total >
      profile.maxTotalBytes
    ) {
      throw new PayloadTooLargeException(
        `Your files add up to more than ${Math.round(profile.maxTotalBytes / 1024 / 1024)} MB.`,
      );
    }
    const problem = this.storage.configurationProblem();
    if (problem) {
      this.logger.error(
        `Assessment upload refused: storage not available — ${problem}.`,
      );
      throw new ServiceUnavailableException(
        'Uploading files is not available right now. Please share a link instead, or tell your teacher.',
      );
    }

    const stored: { id: string; key: string }[] = [];
    try {
      for (const file of files) {
        const name = safeFileName(file.originalname);
        const id = randomUUID();
        const key = assessmentObjectKey({
          programKey: profile.programKey,
          assessmentId: attempt.assessment.id,
          studentUserId,
          attemptId,
          fileId: id,
          fileName: name,
        });
        // The record first, so an object can never exist that nothing knows about.
        await this.prisma.assessmentFile.create({
          data: {
            id,
            attemptId,
            assessmentId: attempt.assessment.id,
            studentUserId,
            programKey: profile.programKey,
            objectKey: key,
            originalName: name,
            contentType: contentTypeFor(name),
            sizeBytes: file.size,
          },
        });
        stored.push({ id, key });
        await this.storage.putObject(key, file.buffer, contentTypeFor(name));
      }
      // The teacher may have locked the test while the bytes were on their way: then they are
      // not part of the submission, and the student is told rather than shown a false success.
      const now = await this.prisma.assessmentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        select: { status: true, lockedAt: true },
      });
      this.assertOpen(now.status, now.lockedAt);
    } catch (err) {
      await this.discard(stored);
      if (err instanceof ConflictException) throw err;
      this.logger.error(
        `Assessment upload failed for student ${studentUserId}: ${describeStorageError(err)}`,
      );
      throw new BadGatewayException(
        'Your file could not be uploaded. Nothing was handed in — please try again.',
      );
    }
    const rows = await this.prisma.assessmentFile.findMany({
      where: { id: { in: stored.map((s) => s.id) } },
    });
    return rows.map(presentAssessmentFile);
  }

  /** Takes back an upload that did not complete: the objects and their rows. */
  private async discard(stored: { id: string; key: string }[]): Promise<void> {
    for (const s of stored) {
      try {
        if (isAssessmentKey(s.key)) await this.storage.deleteObject(s.key);
        await this.prisma.assessmentFile.deleteMany({
          where: { id: s.id, status: AssessmentFileStatus.UPLOADED },
        });
      } catch (err) {
        // Could not even clean up: the row stays UPLOADED; the sweep removes unsubmitted leftovers.
        this.logger.warn(
          `Could not discard upload ${s.id} right away: ${describeStorageError(err)}`,
        );
      }
    }
  }

  /** The student takes a file back before submitting. */
  async removeOwnFile(
    studentUserId: string,
    attemptId: string,
    fileId: string,
  ): Promise<PresentedAssessmentFile[]> {
    const { attempt } = await this.loadAttemptForUpload(
      attemptId,
      studentUserId,
    );
    this.assertOpen(attempt.status, attempt.lockedAt);
    const row = await this.prisma.assessmentFile.findUnique({
      where: { id: fileId },
    });
    if (!row || row.attemptId !== attemptId)
      throw new NotFoundException('File not found.');
    const ids = await this.markForRemoval(
      { id: fileId, attemptId, status: AssessmentFileStatus.UPLOADED },
      AssessmentFileDeleteReason.REMOVED_BY_STUDENT,
    );
    await this.removeMarked(ids);
    return this.listFor(attemptId);
  }

  // ─── Reading ───────────────────────────────────────────────────────────────

  async listFor(attemptId: string): Promise<PresentedAssessmentFile[]> {
    const rows = await this.prisma.assessmentFile.findMany({
      // A file the student took back is not part of what was handed in. (An explicit OR: in SQL a
      // plain "NOT deleteReason = X" would also drop every row whose deleteReason is NULL.)
      where: {
        attemptId,
        OR: [
          { deleteReason: null },
          {
            deleteReason: {
              not: AssessmentFileDeleteReason.REMOVED_BY_STUDENT,
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(presentAssessmentFile);
  }

  // ─── Submitting ────────────────────────────────────────────────────────────

  /** Throws unless every file still waiting in the attempt is in R2 at its full size. */
  async assertUploadsStored(attemptId: string): Promise<void> {
    const rows = await this.prisma.assessmentFile.findMany({
      where: { attemptId, status: AssessmentFileStatus.UPLOADED },
    });
    for (const row of rows) {
      let stored: { sizeBytes: number } | null;
      try {
        stored = await this.storage.headObject(row.objectKey);
      } catch (err) {
        this.logger.error(
          `Could not check assessment file ${row.id}: ${describeStorageError(err)}`,
        );
        throw new ServiceUnavailableException(
          'Your files could not be checked just now. Please try submitting again.',
        );
      }
      if (!stored || stored.sizeBytes !== row.sizeBytes) {
        throw new BadRequestException(
          `“${row.originalName}” did not finish uploading. Please remove it and upload it again.`,
        );
      }
    }
  }

  /** Inside the submit transaction: the attempt's uploads become part of the submission. */
  async attachUploaded(
    tx: Prisma.TransactionClient,
    attemptId: string,
  ): Promise<number> {
    const r = await tx.assessmentFile.updateMany({
      where: { attemptId, status: AssessmentFileStatus.UPLOADED },
      data: { status: AssessmentFileStatus.ATTACHED, attachedAt: new Date() },
    });
    return r.count;
  }

  // ─── Removal ───────────────────────────────────────────────────────────────

  /** Marks files for removal. Only ever UPLOADED / ATTACHED files of THIS workflow move to DELETE_PENDING. */
  async markForRemoval(
    where: Prisma.AssessmentFileWhereInput,
    reason: AssessmentFileDeleteReason,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<string[]> {
    const rows = await tx.assessmentFile.findMany({
      where: {
        AND: [
          where,
          {
            status: {
              in: [
                AssessmentFileStatus.UPLOADED,
                AssessmentFileStatus.ATTACHED,
              ],
            },
          },
        ],
      },
      select: { id: true },
    });
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    await tx.assessmentFile.updateMany({
      where: {
        id: { in: ids },
        status: {
          in: [AssessmentFileStatus.UPLOADED, AssessmentFileStatus.ATTACHED],
        },
      },
      data: {
        status: AssessmentFileStatus.DELETE_PENDING,
        deleteReason: reason,
        deleteRequestedAt: new Date(),
      },
    });
    return ids;
  }

  /**
   * The teacher finalised the review: this attempt's files are no longer needed. Call it INSIDE the
   * transaction that saves the final score, then removeMarked() the returned ids after it commits.
   * Idempotent — files already marked or removed are not touched again.
   */
  finaliseAttempt(
    tx: Prisma.TransactionClient,
    attemptId: string,
  ): Promise<string[]> {
    return this.markForRemoval(
      { attemptId },
      AssessmentFileDeleteReason.REVIEW_FINALISED,
      tx,
    );
  }

  /**
   * Removes the given files from R2 — only those already DELETE_PENDING (re-read here, so a file that
   * is not marked is never touched) and only keys under the assessment prefix. Never throws: a failure
   * is recorded on the row and the sweep retries. Returns how many are still waiting.
   */
  async removeMarked(
    ids: string[],
  ): Promise<{ removed: number; pending: number }> {
    if (ids.length === 0) return { removed: 0, pending: 0 };
    let removed = 0;
    let pending = 0;
    const rows = await this.prisma.assessmentFile
      .findMany({
        where: { id: { in: ids }, status: AssessmentFileStatus.DELETE_PENDING },
      })
      .catch((err) => {
        this.logger.error(`Could not read assessment files to remove: ${err}`);
        return [] as AssessmentFile[];
      });
    for (const row of rows) {
      if (!isAssessmentKey(row.objectKey)) {
        // Can never happen for a row this service created. Refuse rather than delete something else.
        this.logger.error(
          `Refusing to delete “${row.objectKey}” (assessment file ${row.id}): it is not under ${ASSESSMENT_KEY_ROOT}.`,
        );
        pending++;
        continue;
      }
      try {
        await this.storage.deleteObject(row.objectKey);
        await this.prisma.assessmentFile.updateMany({
          where: { id: row.id, status: AssessmentFileStatus.DELETE_PENDING },
          data: {
            status: AssessmentFileStatus.DELETED,
            deletedAt: new Date(),
            lastDeleteError: null,
            lastDeleteAttemptAt: new Date(),
          },
        });
        removed++;
      } catch (err) {
        pending++;
        const message = describeStorageError(err).slice(0, 500);
        const attempts = row.deleteAttempts + 1;
        this.logger.warn(
          `Assessment file ${row.id} could not be removed (attempt ${attempts}): ${message}`,
        );
        if (attempts % 10 === 0)
          this.logger.error(
            `Assessment file ${row.id} has failed to be removed ${attempts} times — check the homework R2 settings.`,
          );
        await this.prisma.assessmentFile
          .updateMany({
            where: { id: row.id, status: AssessmentFileStatus.DELETE_PENDING },
            data: {
              deleteAttempts: { increment: 1 },
              lastDeleteError: message,
              lastDeleteAttemptAt: new Date(),
            },
          })
          .catch(() => undefined);
      }
    }
    return { removed, pending };
  }

  // ─── Scheduled cleanup ─────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sweep(): Promise<void> {
    try {
      await this.runSweep();
    } catch (err) {
      this.logger.error(`Assessment file sweep failed: ${err}`);
    }
  }

  /** Exposed (with a clock) so it can be exercised directly. */
  async runSweep(
    now: Date = new Date(),
  ): Promise<{ recovered: number; removed: number; stillPending: number }> {
    const ago = (ms: number) => new Date(now.getTime() - ms);
    // 1. A file that arrived while its attempt was being submitted is part of that submission.
    const recovered = await this.prisma.assessmentFile.updateMany({
      where: {
        status: AssessmentFileStatus.UPLOADED,
        createdAt: { lt: ago(5 * 60_000) },
        attempt: { status: { not: AttemptStatus.IN_PROGRESS } },
      },
      data: { status: AssessmentFileStatus.ATTACHED, attachedAt: now },
    });
    // 2. Everything waiting to be removed whose retry is due (failed removals never give up).
    const due = (
      await this.prisma.assessmentFile.findMany({
        where: { status: AssessmentFileStatus.DELETE_PENDING },
        orderBy: { lastDeleteAttemptAt: { sort: 'asc', nulls: 'first' } },
        take: SWEEP_BATCH * 3,
      })
    ).filter((r) => {
      if (!r.lastDeleteAttemptAt) return true;
      const waitMinutes = Math.min(
        RETRY_MAX_MINUTES,
        RETRY_BASE_MINUTES * 2 ** Math.min(r.deleteAttempts, 10),
      );
      return (
        r.lastDeleteAttemptAt.getTime() <= now.getTime() - waitMinutes * 60_000
      );
    });
    const result = await this.removeMarked(
      due.slice(0, SWEEP_BATCH).map((r) => r.id),
    );
    if (recovered.count || result.removed || result.pending) {
      this.logger.log(
        `Assessment file sweep: ${recovered.count} attached, ${result.removed} removed, ${result.pending} still waiting for R2.`,
      );
    }
    return {
      recovered: recovered.count,
      removed: result.removed,
      stillPending: result.pending,
    };
  }

  // ─── Opening a file (teacher, admin, or the student's own) ─────────────────

  /** The file, if this person may open it and it is still kept. Opening never changes its status. */
  private async openableFile(actor: Actor, fileId: string) {
    const row = await this.prisma.assessmentFile.findUnique({
      where: { id: fileId },
      include: {
        attempt: {
          select: {
            studentUserId: true,
            student: {
              select: { assignedTeacher: { select: { userId: true } } },
            },
            scheduledLesson: {
              select: { teacher: { select: { userId: true } } },
            },
            report: { select: { teacher: { select: { userId: true } } } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('File not found.');

    let allowed = false;
    if (actor.role === Role.ADMIN) allowed = true;
    else if (actor.role === Role.STUDENT)
      allowed = row.attempt.studentUserId === actor.userId;
    else if (actor.role === Role.TEACHER) {
      // The class's teacher, the teacher who evaluates the report, or the student's assigned teacher.
      const teachers = [
        row.attempt.scheduledLesson?.teacher.userId,
        row.attempt.report?.teacher.userId,
        row.attempt.student.assignedTeacher?.userId,
      ];
      allowed = teachers.includes(actor.userId);
    }
    if (!allowed)
      throw new ForbiddenException('You do not have access to this file.');
    if (
      row.status === AssessmentFileStatus.DELETE_PENDING ||
      row.status === AssessmentFileStatus.DELETED
    ) {
      throw new GoneException(
        'This file was removed after the teacher finished marking the project. The marks and feedback are kept.',
      );
    }
    // A teacher only ever sees what was handed in, never a file the student is still preparing.
    if (
      actor.role === Role.TEACHER &&
      row.status !== AssessmentFileStatus.ATTACHED
    )
      throw new NotFoundException('File not found.');
    return row;
  }

  async accessFor(
    actor: Actor,
    fileId: string,
    opts: { download?: boolean } = {},
  ): Promise<AssessmentFileAccess> {
    const row = await this.openableFile(actor, fileId);
    const kind = viewKindFor(row.originalName);
    if (!opts.download && (kind === 'SOURCE' || kind === 'NOTEBOOK')) {
      return {
        kind,
        name: row.originalName,
        viewerPath: `/homework-viewer/${row.id}?scope=assessment`,
      };
    }
    const inline = !opts.download && (kind === 'PDF' || kind === 'IMAGE');
    try {
      const { url, expiresAt } = await this.storage.createViewUrl(
        row.objectKey,
        {
          fileName: row.originalName,
          // Our own record of the type — never one the file or the browser claimed.
          contentType: inline
            ? contentTypeFor(row.originalName)
            : 'application/octet-stream',
          disposition: inline ? 'inline' : 'attachment',
        },
      );
      return { kind, name: row.originalName, url, expiresAt };
    } catch (err) {
      this.logger.error(
        `Could not sign a link for assessment file ${row.id}: ${describeStorageError(err)}`,
      );
      throw new ServiceUnavailableException(
        'The file could not be opened right now. Please try again.',
      );
    }
  }

  /** A code or text file's content, as JSON, for the viewer page (shown as plain text, never run). */
  async textFor(actor: Actor, fileId: string) {
    const row = await this.openableFile(actor, fileId);
    const kind = viewKindFor(row.originalName);
    if (kind !== 'SOURCE' && kind !== 'NOTEBOOK')
      throw new BadRequestException(
        'This kind of file is opened or downloaded, not shown as text.',
      );
    const base = { name: row.originalName, kind, size: row.sizeBytes } as const;
    if (row.sizeBytes > VIEWER_MAX_TEXT_BYTES)
      return { ...base, tooLarge: true };
    let bytes: Buffer;
    try {
      bytes = await this.storage.getObject(row.objectKey);
    } catch (err) {
      this.logger.error(
        `Could not read assessment file ${row.id}: ${describeStorageError(err)}`,
      );
      throw new ServiceUnavailableException(
        'The file could not be opened right now. Please try again.',
      );
    }
    if (!looksLikeText(bytes)) return { ...base, binary: true };
    return { ...base, text: bytes.toString('utf8') };
  }
}

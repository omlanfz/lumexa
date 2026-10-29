// FILE PATH: server/src/submissions/homework-files.service.ts
//
// The life of a homework file in the private homework bucket:
//
//   upload      The student's files are sent to this server, checked, stored in R2
//               and recorded as HomeworkFile rows (UPLOADED). If any file of an
//               upload fails, the ones already stored are removed again and
//               nothing is kept: an upload is all or nothing.
//   submit      Submitting checks each file is really in R2, at its full size,
//               and only then attaches it to the submission (ATTACHED). A file
//               that never finished uploading can therefore never be part of a
//               submission that looks successful.
//   review      The review (grade, feedback, status) is saved FIRST. Only after
//               that has been committed are the submission's files marked
//               DELETE_PENDING and removed from R2 (then DELETED). The submission
//               row, grade and feedback are never touched by the removal.
//   cleanup     If R2 refuses or is unreachable the file stays DELETE_PENDING and a
//               scheduled sweep retries with a growing delay. The same sweep
//               removes uploads that were never submitted, files replaced by a
//               newer hand-in, files of reviewed submissions that somehow still
//               stand, and files whose submission is gone.
//
// A file of a submission that is still waiting for review (ATTACHED, current) is
// never deleted by any path here: every deletion starts from DELETE_PENDING, which
// only the review, a replacement or the sweep above can set.

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
  HomeworkFile,
  HomeworkFileDeleteReason,
  HomeworkFileStatus,
  Prisma,
  Role,
  SubmissionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  HOMEWORK_MAX_FILES_PER_UPLOAD,
  HOMEWORK_MAX_FILE_BYTES,
  HOMEWORK_MAX_TOTAL_BYTES,
  HomeworkViewKind,
  contentTypeFor,
  extensionOf,
  isAllowedHomeworkFile,
  looksLikeText,
  safeFileName,
  signatureProblem,
  viewKindFor,
} from './homework-file-types';
import { resolveHomeworkTarget } from './homework-target';
import { describeStorageError } from './homework-storage.service';
import type { HomeworkStorage } from './homework-storage.service';

export const HOMEWORK_STORAGE = Symbol('HOMEWORK_STORAGE');

/** Uploaded but never submitted for this long: abandoned. */
export const ABANDONED_UPLOAD_HOURS = 24;
/** Most uploads waiting to be submitted, per student and lesson (stops a loop of
 * uploads that are never submitted from filling the bucket). */
const MAX_UNSUBMITTED_PER_LESSON = 20;
/** The largest text shown in the viewer. */
export const VIEWER_MAX_TEXT_BYTES = 1024 * 1024;
export const VIEWER_MAX_NOTEBOOK_BYTES = 8 * 1024 * 1024;
const SWEEP_BATCH = 100;
/** Failed removals are retried after 1, 2, 4 … minutes, at most an hour apart. */
const RETRY_BASE_MINUTES = 1;
const RETRY_MAX_MINUTES = 60;

export interface UploadedHomeworkFile {
  id: string;
  name: string;
  size: number;
  kind: HomeworkViewKind;
}

/** A file as the app shows it. Legacy (Cloudinary-era) files only have a `url`. */
export interface PresentedHomeworkFile {
  id?: string;
  url?: string;
  name: string | null;
  size?: number;
  kind?: HomeworkViewKind;
  /** The file is no longer kept: it was removed after the review (or is being). */
  removed?: boolean;
}

export type HomeworkFileAccess =
  | { kind: 'SOURCE' | 'NOTEBOOK'; name: string; viewerPath: string }
  | { kind: HomeworkViewKind; name: string; url: string; expiresAt: Date };

export interface HomeworkFileText {
  name: string;
  kind: 'SOURCE' | 'NOTEBOOK';
  /** The file's text — absent when it is too large or not text. */
  text?: string;
  tooLarge?: boolean;
  binary?: boolean;
  size: number;
}

/** What `submissions.files` shows for a submission: its Cloudinary-era links plus
 * the current homework files. Pure. */
export function presentFiles(
  legacy: unknown,
  rows:
    | Pick<
        HomeworkFile,
        | 'id'
        | 'originalName'
        | 'sizeBytes'
        | 'status'
        | 'supersededAt'
        | 'submissionId'
      >[]
    | undefined,
): PresentedHomeworkFile[] {
  const old = Array.isArray(legacy)
    ? (legacy as { url?: string; name?: string | null }[])
        .filter((f) => f && typeof f.url === 'string')
        .map((f) => ({ url: f.url as string, name: f.name ?? null }))
    : [];
  const current = (rows ?? [])
    .filter((r) => r.submissionId && !r.supersededAt)
    .map((r) => ({
      id: r.id,
      name: r.originalName,
      size: r.sizeBytes,
      kind: viewKindFor(r.originalName),
      removed: r.status !== HomeworkFileStatus.ATTACHED,
    }));
  return [...old, ...current];
}

/** Prisma `select` for the rows presentFiles needs. */
export const PRESENTABLE_FILE_SELECT = {
  id: true,
  originalName: true,
  sizeBytes: true,
  status: true,
  supersededAt: true,
  submissionId: true,
} satisfies Prisma.HomeworkFileSelect;

export interface UploadActor {
  userId: string;
  role: Role;
}

@Injectable()
export class HomeworkFilesService {
  private readonly logger = new Logger(HomeworkFilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(HOMEWORK_STORAGE) private readonly storage: HomeworkStorage,
  ) {}

  // ─── Upload ──────────────────────────────────────────────────────────────

  /** Stores a student's files for one homework. All of them or none. */
  async uploadFiles(
    studentUserId: string,
    scheduledLessonId: string | undefined,
    files: Express.Multer.File[],
  ): Promise<UploadedHomeworkFile[]> {
    if (!scheduledLessonId)
      throw new BadRequestException('scheduledLessonId is required.');
    if (!files || files.length === 0)
      throw new BadRequestException('No file provided.');
    if (files.length > HOMEWORK_MAX_FILES_PER_UPLOAD) {
      throw new BadRequestException(
        `You can attach up to ${HOMEWORK_MAX_FILES_PER_UPLOAD} files at a time.`,
      );
    }

    // Everything that can be wrong with the request is found before anything is stored.
    const target = await resolveHomeworkTarget(
      this.prisma,
      studentUserId,
      scheduledLessonId,
    );
    const problem = this.storage.configurationProblem();
    if (problem) {
      this.logger.error(
        `Homework upload refused: storage not available — ${problem}.`,
      );
      throw new ServiceUnavailableException(
        'Uploading files is not available right now. Please try again later, or share a link instead.',
      );
    }

    let total = 0;
    for (const file of files) {
      const name = safeFileName(file.originalname);
      if (!isAllowedHomeworkFile(name)) {
        throw new BadRequestException(
          `".${extensionOf(name) || 'unknown'}" files are not allowed. You can submit documents (PDF, Word, TXT), archives (ZIP), images (JPG, PNG), and coding/programming project files (e.g. .py, .ipynb, .html, .css, .js, .java, .sb3, .rbxl).`,
        );
      }
      if (!file.buffer || file.size === 0) {
        throw new BadRequestException(`"${name}" is empty.`);
      }
      if (file.size > HOMEWORK_MAX_FILE_BYTES) {
        throw new PayloadTooLargeException(
          `"${name}" is larger than ${HOMEWORK_MAX_FILE_BYTES / 1024 / 1024} MB.`,
        );
      }
      const disguised = signatureProblem(name, file.buffer);
      if (disguised) throw new BadRequestException(disguised);
      total += file.size;
    }
    if (total > HOMEWORK_MAX_TOTAL_BYTES) {
      throw new PayloadTooLargeException(
        `Those files add up to more than ${HOMEWORK_MAX_TOTAL_BYTES / 1024 / 1024} MB.`,
      );
    }

    const waiting = await this.prisma.homeworkFile.count({
      where: {
        studentUserId,
        scheduledLessonId: target.scheduledLessonId,
        status: HomeworkFileStatus.UPLOADED,
      },
    });
    if (waiting + files.length > MAX_UNSUBMITTED_PER_LESSON) {
      throw new ConflictException(
        'Too many files are waiting to be submitted. Submit your work, or try again later.',
      );
    }

    const stored: { id: string; key: string }[] = [];
    try {
      for (const file of files) {
        const name = safeFileName(file.originalname);
        const id = randomUUID();
        const key = this.storage.objectKeyFor({
          courseId: target.courseId,
          studentUserId,
          fileId: id,
          fileName: name,
        });
        // The record first, so an object can never exist that nothing knows about;
        // a record whose upload never happened is swept up as abandoned.
        await this.prisma.homeworkFile.create({
          data: {
            id,
            studentUserId,
            scheduledLessonId: target.scheduledLessonId,
            courseId: target.courseId,
            objectKey: key,
            originalName: name,
            contentType: contentTypeFor(name),
            sizeBytes: file.size,
          },
        });
        stored.push({ id, key });
        await this.storage.putObject(key, file.buffer, contentTypeFor(name));
      }
    } catch (err) {
      this.logger.error(
        `Homework upload failed for student ${studentUserId}: ${describeStorageError(err)}`,
      );
      await this.discard(stored);
      throw new BadGatewayException(
        'Your file could not be uploaded. Nothing was submitted — please try again.',
      );
    }

    return stored.map((s, i) => ({
      id: s.id,
      name: safeFileName(files[i].originalname),
      size: files[i].size,
      kind: viewKindFor(files[i].originalname),
    }));
  }

  /** Takes back an upload that did not complete: the objects and their rows. */
  private async discard(stored: { id: string; key: string }[]): Promise<void> {
    for (const s of stored) {
      try {
        await this.storage.deleteObject(s.key);
        await this.prisma.homeworkFile.deleteMany({
          where: { id: s.id, status: HomeworkFileStatus.UPLOADED },
        });
      } catch (err) {
        // Could not even clean up: leave the row for the sweep (it is UPLOADED
        // and never submitted, so it is abandoned in a day).
        this.logger.warn(
          `Could not discard upload ${s.id} right away: ${describeStorageError(err)}`,
        );
      }
    }
  }

  // ─── Attaching to a submission ───────────────────────────────────────────

  /** The uploaded files a hand-in names, checked: theirs, for this homework, not
   * used before, and really stored at their full size. */
  async verifyUploads(
    studentUserId: string,
    scheduledLessonId: string,
    ids: string[],
  ): Promise<HomeworkFile[]> {
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('The same file was attached twice.');
    const rows = await this.prisma.homeworkFile.findMany({
      where: { id: { in: ids } },
    });
    if (rows.length !== ids.length) {
      throw new BadRequestException(
        'One of the attached files could not be found. Please upload it again.',
      );
    }
    for (const row of rows) {
      if (
        row.studentUserId !== studentUserId ||
        row.scheduledLessonId !== scheduledLessonId
      ) {
        throw new ForbiddenException(
          'That file does not belong to this homework.',
        );
      }
    }
    return rows;
  }

  /** Throws unless each file is in R2 and as large as it was when it was uploaded. */
  async assertStored(rows: HomeworkFile[]): Promise<void> {
    for (const row of rows) {
      let stored: { sizeBytes: number } | null;
      try {
        stored = await this.storage.headObject(row.objectKey);
      } catch (err) {
        this.logger.error(
          `Could not check homework file ${row.id}: ${describeStorageError(err)}`,
        );
        throw new ServiceUnavailableException(
          'Your files could not be checked just now. Please try submitting again.',
        );
      }
      if (!stored || stored.sizeBytes !== row.sizeBytes) {
        throw new BadRequestException(
          `"${row.originalName}" did not finish uploading. Please upload it again.`,
        );
      }
    }
  }

  // ─── Removal ─────────────────────────────────────────────────────────────

  /**
   * Removes the given files from R2 — only those already marked DELETE_PENDING
   * (re-read here, so a file that is not marked is never touched). Never throws:
   * a failure is recorded on the row and the sweep tries again. Returns how many
   * are still waiting to be removed.
   */
  async removeMarked(
    ids: string[],
  ): Promise<{ removed: number; pending: number }> {
    if (ids.length === 0) return { removed: 0, pending: 0 };
    let removed = 0;
    let pending = 0;
    const rows = await this.prisma.homeworkFile
      .findMany({
        where: { id: { in: ids }, status: HomeworkFileStatus.DELETE_PENDING },
      })
      .catch((err) => {
        this.logger.error(`Could not read homework files to remove: ${err}`);
        return [] as HomeworkFile[];
      });
    for (const row of rows) {
      try {
        await this.storage.deleteObject(row.objectKey);
        await this.prisma.homeworkFile.updateMany({
          where: { id: row.id, status: HomeworkFileStatus.DELETE_PENDING },
          data: {
            status: HomeworkFileStatus.DELETED,
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
          `Homework file ${row.id} could not be removed (attempt ${attempts}): ${message}`,
        );
        if (attempts % 10 === 0) {
          this.logger.error(
            `Homework file ${row.id} has failed to be removed ${attempts} times — check the homework R2 settings.`,
          );
        }
        await this.prisma.homeworkFile
          .updateMany({
            where: { id: row.id, status: HomeworkFileStatus.DELETE_PENDING },
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

  /** Marks files for removal. Returns the ids actually marked. */
  async markForRemoval(
    where: Prisma.HomeworkFileWhereInput,
    reason: HomeworkFileDeleteReason,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<string[]> {
    const rows = await tx.homeworkFile.findMany({
      where,
      select: { id: true },
    });
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    await tx.homeworkFile.updateMany({
      where: { id: { in: ids } },
      data: {
        status: HomeworkFileStatus.DELETE_PENDING,
        deleteReason: reason,
        deleteRequestedAt: new Date(),
      },
    });
    return ids;
  }

  // ─── Scheduled cleanup ───────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sweep(): Promise<void> {
    try {
      await this.runSweep();
    } catch (err) {
      this.logger.error(`Homework file sweep failed: ${err}`);
    }
  }

  /** Exposed (with a clock) so it can be exercised directly. */
  async runSweep(
    now: Date = new Date(),
  ): Promise<{ marked: number; removed: number; stillPending: number }> {
    const ago = (ms: number) => new Date(now.getTime() - ms);
    let marked = 0;

    // 1. A reviewed submission whose files still stand (the review was saved but
    //    their removal was never recorded, e.g. the server restarted between the
    //    two). Reviewed — not waiting — so they are no longer needed.
    marked += (
      await this.markForRemoval(
        {
          status: HomeworkFileStatus.ATTACHED,
          supersededAt: null,
          submission: {
            is: {
              status: { not: SubmissionStatus.PENDING },
              reviewedAt: { lt: ago(5 * 60_000) },
            },
          },
        },
        HomeworkFileDeleteReason.REVIEWED,
      )
    ).length;

    // 2. Files whose submission no longer exists.
    marked += (
      await this.markForRemoval(
        {
          status: HomeworkFileStatus.ATTACHED,
          submissionId: null,
          createdAt: { lt: ago(60 * 60_000) },
        },
        HomeworkFileDeleteReason.ORPHANED,
      )
    ).length;

    // 3. Uploaded and never submitted.
    marked += (
      await this.markForRemoval(
        {
          status: HomeworkFileStatus.UPLOADED,
          createdAt: { lt: ago(ABANDONED_UPLOAD_HOURS * 3_600_000) },
        },
        HomeworkFileDeleteReason.ABANDONED,
      )
    ).length;

    // 4. Everything waiting to be removed whose retry is due.
    const due = (
      await this.prisma.homeworkFile.findMany({
        where: { status: HomeworkFileStatus.DELETE_PENDING },
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
    if (marked || result.removed || result.pending) {
      this.logger.log(
        `Homework file sweep: ${marked} newly marked, ${result.removed} removed, ${result.pending} still waiting for R2.`,
      );
    }
    return { marked, removed: result.removed, stillPending: result.pending };
  }

  // ─── Opening a file ──────────────────────────────────────────────────────

  /** The file, if this person may open it and it is still kept. */
  private async openableFile(actor: UploadActor, fileId: string) {
    const row = await this.prisma.homeworkFile.findUnique({
      where: { id: fileId },
      include: {
        submission: {
          select: { id: true, teacherId: true, studentUserId: true },
        },
      },
    });
    if (!row || !row.submission) throw new NotFoundException('File not found.');

    let allowed = false;
    if (actor.role === Role.ADMIN) allowed = true;
    else if (actor.role === Role.STUDENT)
      allowed = row.submission.studentUserId === actor.userId;
    else if (actor.role === Role.TEACHER) {
      const profile = await this.prisma.teacherProfile.findUnique({
        where: { userId: actor.userId },
        select: { id: true },
      });
      allowed = !!profile && profile.id === row.submission.teacherId;
    }
    if (!allowed)
      throw new ForbiddenException('You do not have access to this file.');

    if (row.supersededAt || row.status !== HomeworkFileStatus.ATTACHED) {
      throw new GoneException('This file was removed after the review.');
    }
    return row;
  }

  /** How to open a file: the viewer (code and notebooks), or a short-lived link
   * (PDFs and images in the browser; everything else downloads). */
  async accessFor(
    actor: UploadActor,
    fileId: string,
    opts: { download?: boolean } = {},
  ): Promise<HomeworkFileAccess> {
    const row = await this.openableFile(actor, fileId);
    const kind = viewKindFor(row.originalName);
    // `download`: the viewer's own "Download" button — any file, as a download.
    if (!opts.download && (kind === 'SOURCE' || kind === 'NOTEBOOK')) {
      return {
        kind,
        name: row.originalName,
        viewerPath: `/homework-viewer/${row.id}`,
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
        `Could not sign a link for homework file ${row.id}: ${describeStorageError(err)}`,
      );
      throw new ServiceUnavailableException(
        'The file could not be opened right now. Please try again.',
      );
    }
  }

  /** A code or notebook file's text for the viewer. It is sent as JSON and shown by
   * the viewer as plain text, so nothing in it is ever interpreted by a browser. */
  async textFor(actor: UploadActor, fileId: string): Promise<HomeworkFileText> {
    const row = await this.openableFile(actor, fileId);
    const kind = viewKindFor(row.originalName);
    if (kind !== 'SOURCE' && kind !== 'NOTEBOOK') {
      throw new BadRequestException(
        'This kind of file is opened or downloaded, not shown as text.',
      );
    }
    const limit =
      kind === 'NOTEBOOK' ? VIEWER_MAX_NOTEBOOK_BYTES : VIEWER_MAX_TEXT_BYTES;
    const base = { name: row.originalName, kind, size: row.sizeBytes } as const;
    if (row.sizeBytes > limit) return { ...base, tooLarge: true };

    let bytes: Buffer;
    try {
      bytes = await this.storage.getObject(row.objectKey);
    } catch (err) {
      this.logger.error(
        `Could not read homework file ${row.id}: ${describeStorageError(err)}`,
      );
      throw new ServiceUnavailableException(
        'The file could not be opened right now. Please try again.',
      );
    }
    if (!looksLikeText(bytes)) return { ...base, binary: true };
    return { ...base, text: bytes.toString('utf8') };
  }
}

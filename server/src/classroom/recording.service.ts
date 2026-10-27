// FILE PATH: server/src/classroom/recording.service.ts
//
// Class recordings. A class is recorded in the TEACHER'S BROWSER (a WebM file of
// their browser window plus the class's audio) and the browser uploads the
// finished file straight to a private Cloudflare R2 bucket. This server never
// sees the video: it keeps the books (one RecordingSegment row per recording),
// decides who may do what, signs the short-lived upload and playback URLs
// (RecordingStorageService), and checks that a file really arrived before
// anyone is told it can be watched.
//
// ─── One recording = one segment ("part") ────────────────────────────────────
// Every Record → Stop is its own RecordingSegment, kept as its own file and
// never merged or overwritten. Recording again in the same class simply adds
// another part. A student sees the parts of a class in order.
//
//   RECORDING  the teacher's browser is recording it           (POST …/start)
//   UPLOADING  recorded; waiting to be uploaded, or uploading  (…/stop, …/upload-url)
//   AVAILABLE  the file is in R2 and was checked: watchable    (…/complete)
//   FAILED     given up on — discarded, or never uploaded      (…/discard, the sweep)
//   EXPIRED    removed from storage by the retention policy
//
// The browser picks the segment's id (a UUID), so a retried request can never
// create a second segment; the file's key in R2 is derived from that id, so a
// retried upload can only ever replace the same file. Only the teacher whose
// browser made a segment may finish, upload or discard it.
//
// ScheduledLesson/Booking.recordingStatus is a summary of a class's segments
// (see deriveRecordingStatus), kept up to date here so the admin screens that
// read it keep working. The recordingUrl on those rows belongs to the retired
// server-side recorder: it is never written, and a class that has one is left
// exactly as it was.

import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ClassType,
  LessonStatus,
  Prisma,
  RecordingSegmentStatus,
  RecordingStatus,
  Role,
} from '@prisma/client';
import type { RecordingSegment } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import {
  RECORDING_CONTENT_TYPE,
  RecordingStorageService,
  describeStorageError,
} from './recording-storage.service';
import type { StoredObject } from './recording-storage.service';
import { getRoomRef } from './room-ref.util';

/** The most one segment may weigh: under what the 32-bit size column and a
 * single upload to R2 can hold. A browser auto-stops a segment before it gets
 * anywhere near this (see the recorder's bitrate and duration caps). */
export const MAX_SEGMENT_BYTES = 2_000_000_000;

/** Parts one class may have — a guard against a runaway loop, not a limit a
 * teacher should ever meet. */
export const MAX_SEGMENTS_PER_ROOM = 30;

/** Why a segment was given up on (shown to admins and in the teacher's list). */
export const FAILURE_DISCARDED =
  'Discarded by the teacher before it was uploaded.';
export const FAILURE_NOT_UPLOADED = 'The recording was not uploaded in time.';

/** A browser that started a recording and never reported back is given this
 * long past the maximum duration before its segment is closed. */
const RECORDING_GRACE_MINUTES = 10;
/** A segment waiting for its upload is left alone this long before the sweep
 * checks storage for it (an upload may well be running). */
const UPLOAD_SETTLE_MINUTES = 15;
/** A recording nobody has touched for this long is given up on (the file only
 * ever lived in a browser tab). The teacher can still upload it if that tab is
 * still open. */
const STALE_UPLOAD_HOURS = 12;
const STORAGE_WARNING_RATIO = 0.8;

/** What the browser needs to know about a segment. */
export interface SegmentView {
  id: string;
  status: RecordingSegmentStatus;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  uploadedAt: Date | null;
  failureReason: string | null;
}

export interface StartedSegment {
  segment: SegmentView;
  /** The browser stops a segment by itself at this length. */
  maxDurationMinutes: number;
  maxSegmentBytes: number;
  /** Whether a finished recording can be uploaded yet. Recording works either
   * way; an upload does not until R2 is configured. */
  storage: { configured: boolean; missing: string[] };
}

export interface UploadTarget {
  uploadUrl: string;
  method: 'PUT';
  /** Sent with the PUT exactly as given. */
  headers: Record<string, string>;
  expiresAt: Date;
  maxSegmentBytes: number;
}

export function toSegmentView(row: RecordingSegment): SegmentView {
  return {
    id: row.id,
    status: row.status,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationSeconds: row.durationSeconds,
    sizeBytes: row.fileSizeBytes,
    uploadedAt: row.uploadedAt,
    failureReason: row.failureReason,
  };
}

/** A class's recording as a whole, from the state of its segments. Something
 * watchable wins over "still uploading", so a class with one part up and
 * another on its way already counts as having a recording. */
export function deriveRecordingStatus(
  statuses: RecordingSegmentStatus[],
): RecordingStatus {
  const has = (s: RecordingSegmentStatus) => statuses.includes(s);
  if (has(RecordingSegmentStatus.RECORDING)) return RecordingStatus.RECORDING;
  if (has(RecordingSegmentStatus.AVAILABLE)) return RecordingStatus.AVAILABLE;
  if (has(RecordingSegmentStatus.UPLOADING)) return RecordingStatus.PROCESSING;
  if (has(RecordingSegmentStatus.FAILED)) return RecordingStatus.FAILED;
  if (has(RecordingSegmentStatus.EXPIRED)) return RecordingStatus.EXPIRED;
  return RecordingStatus.NONE;
}

function isWebm(contentType: string | null): boolean {
  return (
    !!contentType &&
    contentType.toLowerCase().startsWith(RECORDING_CONTENT_TYPE)
  );
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  private lastStorageWarningAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly storage: RecordingStorageService,
  ) {}

  // ─── Configuration ───────────────────────────────────────────────────────

  /** How long one segment may run, in minutes (RECORDING_MAX_DURATION_MINUTES).
   * The browser enforces it; the sweep closes a segment whose browser vanished. */
  maxDurationMinutes(): number {
    return Number(process.env.RECORDING_MAX_DURATION_MINUTES) || 70;
  }

  /** Total bytes of uploaded recordings kept before the oldest are removed. */
  storageLimitBytes(): number {
    return (
      Number(process.env.RECORDING_STORAGE_LIMIT_BYTES) ||
      50 * 1024 * 1024 * 1024
    );
  }

  storageStatus(): { configured: boolean; missing: string[] } {
    const missing = this.storage.missingEnvVars();
    return { configured: missing.length === 0, missing };
  }

  private limits() {
    return {
      maxDurationMinutes: this.maxDurationMinutes(),
      maxSegmentBytes: MAX_SEGMENT_BYTES,
    };
  }

  /** Uploading and watching need R2. Recording does not. */
  private requireStorage(): void {
    const { configured, missing } = this.storageStatus();
    if (configured) return;
    this.logger.error(
      `Recording storage is not configured — missing backend env var(s): ${missing.join(', ')}`,
    );
    throw new BadRequestException(
      `Recording storage is not set up on the server yet: missing ${missing.join(', ')}. ` +
        'Ask a Lumexa admin to add them to the backend settings (see server/.env.example). ' +
        'Your recording stays in this browser tab until it can be uploaded.',
    );
  }

  // ─── Rooms and the classes behind them ───────────────────────────────────

  /** The lessons a room's recording belongs to: the one lesson of a 1:1 class,
   * or every student's lesson of a batch (they all sat the same class). */
  private async lessonIdsForRoom(room: string): Promise<string[]> {
    const ref = getRoomRef(room);
    if (ref.kind === 'lesson') return [ref.scheduledLessonId];
    if (ref.kind === 'session') {
      const rows = await this.prisma.scheduledLesson.findMany({
        where: {
          batchSessionId: ref.batchSessionId,
          status: { not: LessonStatus.CANCELLED },
        },
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      return rows.map((r) => r.id);
    }
    if (ref.kind === 'batch') {
      const rows = await this.prisma.scheduledLesson.findMany({
        where: {
          teacherId: ref.teacherId,
          classType: ClassType.BATCH,
          start: new Date(ref.startMs),
          status: { not: LessonStatus.CANCELLED },
        },
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      return rows.map((r) => r.id);
    }
    return [];
  }

  /** Brings the class-level recordingStatus (what the admin screens read) in
   * line with the class's segments. A class with no segments, and a class that
   * has a recording from the retired server-side recorder (recordingUrl), is
   * left exactly as it is. The demo room has no class row to update. */
  private async syncMirror(room: string): Promise<void> {
    const ref = getRoomRef(room);
    if (ref.kind === 'demo' || ref.kind === 'trial') return;
    const rows = await this.prisma.recordingSegment.findMany({
      where: { room },
      select: { status: true },
    });
    if (rows.length === 0) return;
    const recordingStatus = deriveRecordingStatus(rows.map((r) => r.status));

    if (ref.kind === 'booking') {
      await this.prisma.booking.updateMany({
        where: { id: ref.bookingId, recordingUrl: null },
        data: { recordingStatus },
      });
      return;
    }
    const ids = await this.lessonIdsForRoom(room);
    if (ids.length > 0) {
      await this.prisma.scheduledLesson.updateMany({
        where: { id: { in: ids }, recordingUrl: null },
        data: { recordingStatus },
      });
    }
  }

  /** True while a teacher's browser is recording in this room (what the REC
   * badge everyone sees reflects). */
  async hasActiveSegment(room: string): Promise<boolean> {
    return (
      (await this.prisma.recordingSegment.count({
        where: { room, status: RecordingSegmentStatus.RECORDING },
      })) > 0
    );
  }

  /** A segment of this room made by this teacher, or a "not found" that does
   * not say whether it exists for somebody else. */
  private async ownedSegment(
    room: string,
    teacherUserId: string,
    segmentId: string,
  ): Promise<RecordingSegment> {
    const seg = await this.prisma.recordingSegment.findUnique({
      where: { id: segmentId },
    });
    if (!seg || seg.room !== room || seg.recordedByUserId !== teacherUserId) {
      throw new NotFoundException('Recording not found.');
    }
    return seg;
  }

  private async reload(id: string): Promise<RecordingSegment> {
    return this.prisma.recordingSegment.findUniqueOrThrow({ where: { id } });
  }

  // ─── The teacher's browser: record, stop, upload ─────────────────────────
  //
  // The caller has already checked that `teacherUserId` is this room's teacher
  // (ClassroomService.assertTeacherOfRoom); these check the segment is theirs.

  /** The teacher pressed Record. Idempotent per `requestedId`: the same id again
   * (a retried request) returns the segment it already made. Works without R2
   * being configured — only uploading needs it. */
  async startSegment(
    room: string,
    teacherUserId: string,
    requestedId?: string,
  ): Promise<StartedSegment> {
    const ref = getRoomRef(room);
    if (ref.kind === 'trial') {
      throw new BadRequestException('Trial classes are not recorded.');
    }
    const id = requestedId ?? randomUUID();

    let row = await this.prisma.recordingSegment.findUnique({ where: { id } });
    if (row && (row.room !== room || row.recordedByUserId !== teacherUserId)) {
      throw new ConflictException('That recording id is already in use.');
    }

    if (!row) {
      const parts = await this.prisma.recordingSegment.count({
        where: { room },
      });
      if (parts >= MAX_SEGMENTS_PER_ROOM) {
        throw new BadRequestException(
          `This class already has ${MAX_SEGMENTS_PER_ROOM} recordings, the most it can have.`,
        );
      }
      try {
        row = await this.prisma.recordingSegment.create({
          data: {
            id,
            room,
            bookingId: ref.kind === 'booking' ? ref.bookingId : undefined,
            // A batch's segments hang off its first lesson; the room name is
            // what ties them to the whole class.
            scheduledLessonId:
              ref.kind === 'lesson'
                ? ref.scheduledLessonId
                : ref.kind === 'batch' || ref.kind === 'session'
                  ? (await this.lessonIdsForRoom(room))[0]
                  : undefined,
            status: RecordingSegmentStatus.RECORDING,
            storagePath: this.storage.objectKeyFor(room, id),
            recordedByUserId: teacherUserId,
          },
        });
      } catch (err) {
        // Two identical requests raced: the other one made it.
        if (!isUniqueViolation(err)) throw err;
        row = await this.reload(id);
      }
    }

    await this.syncMirror(room);
    this.logger.log(`Recording segment ${id} started in ${room}`);
    return {
      segment: toSegmentView(row),
      ...this.limits(),
      storage: this.storageStatus(),
    };
  }

  /** The teacher pressed Stop (or the browser stopped it at the length cap): the
   * file now exists only in their browser until it is uploaded. Safe to repeat. */
  async stopSegment(
    room: string,
    teacherUserId: string,
    segmentId: string,
    info: { durationMs?: number; mimeType?: string } = {},
  ): Promise<SegmentView> {
    const seg = await this.ownedSegment(room, teacherUserId, segmentId);
    if (seg.status === RecordingSegmentStatus.AVAILABLE) {
      return toSegmentView(seg);
    }
    if (
      seg.status === RecordingSegmentStatus.FAILED ||
      seg.status === RecordingSegmentStatus.EXPIRED
    ) {
      throw new ConflictException('This recording can no longer be changed.');
    }
    await this.prisma.recordingSegment.updateMany({
      where: {
        id: seg.id,
        status: {
          in: [
            RecordingSegmentStatus.RECORDING,
            RecordingSegmentStatus.UPLOADING,
          ],
        },
      },
      data: {
        status: RecordingSegmentStatus.UPLOADING,
        endedAt: seg.endedAt ?? new Date(),
        ...(info.durationMs !== undefined
          ? { durationSeconds: Math.round(info.durationMs / 1000) }
          : {}),
        ...(info.mimeType ? { mimeType: info.mimeType } : {}),
      },
    });
    await this.syncMirror(room);
    return toSegmentView(await this.reload(seg.id));
  }

  /** A signed URL for the browser to PUT the finished file to. Can be asked for
   * again and again (a retry, an expired URL): the file always goes to the same
   * key, so the worst a repeat can do is replace itself. */
  async createUploadUrl(
    room: string,
    teacherUserId: string,
    segmentId: string,
    sizeBytes: number,
  ): Promise<UploadTarget> {
    this.requireStorage();
    if (!Number.isInteger(sizeBytes) || sizeBytes < 1) {
      throw new BadRequestException('The recording is empty.');
    }
    if (sizeBytes > MAX_SEGMENT_BYTES) {
      throw new BadRequestException(
        'This recording is too large to upload. Record shorter parts instead.',
      );
    }
    const seg = await this.ownedSegment(room, teacherUserId, segmentId);
    this.assertUploadable(seg);
    if (!seg.storagePath) {
      throw new ConflictException('This recording has no storage location.');
    }

    const moved = await this.prisma.recordingSegment.updateMany({
      where: { id: seg.id, status: { not: RecordingSegmentStatus.AVAILABLE } },
      data: {
        status: RecordingSegmentStatus.UPLOADING,
        endedAt: seg.endedAt ?? new Date(),
        failureReason: null,
        uploadAttempts: { increment: 1 },
      },
    });
    if (moved.count === 0) {
      throw new ConflictException('This recording has already been uploaded.');
    }

    const signed = await this.storage.createUploadUrl(seg.storagePath);
    await this.syncMirror(room);
    return {
      uploadUrl: signed.url,
      method: 'PUT',
      headers: signed.headers,
      expiresAt: signed.expiresAt,
      maxSegmentBytes: MAX_SEGMENT_BYTES,
    };
  }

  /** The browser says the upload finished. Believed only once R2 confirms the
   * file is there with the size the browser sent and the right type. Safe to
   * repeat: an already-available segment is simply returned. */
  async completeUpload(
    room: string,
    teacherUserId: string,
    segmentId: string,
    sizeBytes: number,
    durationMs?: number,
  ): Promise<SegmentView> {
    this.requireStorage();
    const seg = await this.ownedSegment(room, teacherUserId, segmentId);
    if (seg.status === RecordingSegmentStatus.AVAILABLE) {
      return toSegmentView(seg);
    }
    this.assertUploadable(seg);
    if (!seg.storagePath) {
      throw new ConflictException('This recording has no storage location.');
    }

    let stored: StoredObject | null;
    try {
      stored = await this.storage.headObject(seg.storagePath);
    } catch (err) {
      this.logger.error(
        `Could not check recording ${seg.id} in storage: ${describeStorageError(err)}`,
      );
      throw new ServiceUnavailableException(
        'Could not check the upload with storage. Please try again in a moment.',
      );
    }
    if (!stored) {
      throw new ConflictException(
        'The recording has not reached storage yet. Please upload it again.',
      );
    }
    if (!isWebm(stored.contentType) || stored.sizeBytes > MAX_SEGMENT_BYTES) {
      // Not what we signed for: never offered to anyone, and not kept.
      await this.storage
        .deleteObject(seg.storagePath)
        .catch((e) =>
          this.logger.warn(
            `Could not remove a rejected upload: ${describeStorageError(e)}`,
          ),
        );
      throw new ConflictException(
        'The uploaded file is not a valid recording. Please upload it again.',
      );
    }
    if (stored.sizeBytes !== sizeBytes) {
      throw new ConflictException(
        'The uploaded file is not the same size as the recording. Please upload it again.',
      );
    }

    await this.prisma.recordingSegment.updateMany({
      where: { id: seg.id, status: { not: RecordingSegmentStatus.AVAILABLE } },
      data: {
        status: RecordingSegmentStatus.AVAILABLE,
        fileSizeBytes: stored.sizeBytes,
        uploadedAt: new Date(),
        endedAt: seg.endedAt ?? new Date(),
        failureReason: null,
        ...(seg.durationSeconds === null && durationMs !== undefined
          ? { durationSeconds: Math.round(durationMs / 1000) }
          : {}),
      },
    });
    await this.syncMirror(room);
    this.logger.log(
      `Recording segment ${seg.id} uploaded for ${room} (${stored.sizeBytes} bytes)`,
    );
    return toSegmentView(await this.reload(seg.id));
  }

  /** The teacher gives a recording up (or the browser abandoned it). Not for a
   * recording that is already uploaded. Safe to repeat. */
  async discardSegment(
    room: string,
    teacherUserId: string,
    segmentId: string,
  ): Promise<SegmentView> {
    const seg = await this.ownedSegment(room, teacherUserId, segmentId);
    if (seg.status === RecordingSegmentStatus.AVAILABLE) {
      throw new ConflictException(
        'A recording that has been uploaded cannot be discarded here.',
      );
    }
    if (
      seg.status === RecordingSegmentStatus.FAILED ||
      seg.status === RecordingSegmentStatus.EXPIRED
    ) {
      return toSegmentView(seg);
    }
    await this.prisma.recordingSegment.updateMany({
      where: {
        id: seg.id,
        status: {
          in: [
            RecordingSegmentStatus.RECORDING,
            RecordingSegmentStatus.UPLOADING,
          ],
        },
      },
      data: {
        status: RecordingSegmentStatus.FAILED,
        failureReason: FAILURE_DISCARDED,
        endedAt: seg.endedAt ?? new Date(),
      },
    });
    // The file may have reached storage before it was given up on.
    if (seg.storagePath && this.storage.isConfigured()) {
      await this.storage
        .deleteObject(seg.storagePath)
        .catch((e) =>
          this.logger.warn(
            `Could not remove a discarded upload: ${describeStorageError(e)}`,
          ),
        );
    }
    await this.syncMirror(room);
    return toSegmentView(await this.reload(seg.id));
  }

  /** The class's segments, oldest first (the teacher's own list). */
  async listSegments(room: string): Promise<SegmentView[]> {
    const rows = await this.prisma.recordingSegment.findMany({
      where: { room },
      orderBy: { startedAt: 'asc' },
    });
    return rows.map(toSegmentView);
  }

  /** What may still be uploaded: a segment in flight, or one that was only given
   * up on because it sat too long (its file may well still be in the tab). */
  private assertUploadable(seg: RecordingSegment): void {
    if (seg.status === RecordingSegmentStatus.AVAILABLE) {
      throw new ConflictException('This recording has already been uploaded.');
    }
    if (seg.status === RecordingSegmentStatus.EXPIRED) {
      throw new ConflictException('This recording has been removed.');
    }
    if (
      seg.status === RecordingSegmentStatus.FAILED &&
      seg.failureReason !== FAILURE_NOT_UPLOADED
    ) {
      throw new ConflictException(
        'This recording was discarded and can no longer be uploaded.',
      );
    }
  }

  // ─── Class end ───────────────────────────────────────────────────────────

  /** The class is over: a browser still recording in it is being closed with
   * the room (and stops itself when it notices), so its segment now only waits
   * for its upload. Never uploads or deletes anything. Safe to repeat. */
  async stopActiveSegmentIfAny(room: string): Promise<void> {
    const { count } = await this.prisma.recordingSegment.updateMany({
      where: { room, status: RecordingSegmentStatus.RECORDING },
      data: { status: RecordingSegmentStatus.UPLOADING, endedAt: new Date() },
    });
    if (count > 0) {
      this.logger.log(
        `Class ended in ${room} with ${count} recording(s) still running; they now wait for their upload.`,
      );
    }
  }

  /** The class is over: bring its recording summary up to date. */
  async finalizeAtClassEnd(room: string): Promise<void> {
    await this.syncMirror(room);
  }

  // ─── Sweep: lost browsers, finished-but-unreported uploads, abandoned files ─

  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcileSegments(): Promise<void> {
    try {
      await this.runReconcile();
    } catch (err) {
      this.logger.error(`Recording sweep failed: ${err}`);
    }
  }

  /** Exposed (with a clock) so it can be exercised directly. */
  async runReconcile(now: Date = new Date()): Promise<{
    closed: number;
    completed: number;
    abandoned: number;
  }> {
    const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
    const touched = new Set<string>();
    let closed = 0;
    let completed = 0;
    let abandoned = 0;
    const cap = this.maxDurationMinutes();

    // 1. A browser that began recording and never said it stopped (closed the
    //    tab, crashed, lost its connection). Its file may still be in the tab,
    //    so it now waits for an upload like any other.
    const lost = await this.prisma.recordingSegment.findMany({
      where: {
        status: RecordingSegmentStatus.RECORDING,
        recordedByUserId: { not: null },
        startedAt: { lt: ago(cap + RECORDING_GRACE_MINUTES) },
      },
    });
    for (const seg of lost) {
      const moved = await this.prisma.recordingSegment.updateMany({
        where: { id: seg.id, status: RecordingSegmentStatus.RECORDING },
        data: {
          status: RecordingSegmentStatus.UPLOADING,
          endedAt: new Date(seg.startedAt.getTime() + cap * 60_000),
        },
      });
      if (moved.count > 0) {
        closed++;
        touched.add(seg.room);
      }
    }

    // 2. Segments waiting for an upload. If the file is in storage the upload
    //    finished and only its confirmation was lost: confirm it now. If it is
    //    not, and nobody has touched the segment for a long time, give up.
    const waiting = await this.prisma.recordingSegment.findMany({
      where: {
        status: RecordingSegmentStatus.UPLOADING,
        recordedByUserId: { not: null },
        updatedAt: { lt: ago(UPLOAD_SETTLE_MINUTES) },
      },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    });
    const staleBefore = ago(STALE_UPLOAD_HOURS * 60);
    for (const seg of waiting) {
      let checked = true;
      if (this.storage.isConfigured() && seg.storagePath) {
        try {
          const stored = await this.storage.headObject(seg.storagePath);
          if (
            stored &&
            stored.sizeBytes > 0 &&
            stored.sizeBytes <= MAX_SEGMENT_BYTES &&
            isWebm(stored.contentType)
          ) {
            const done = await this.prisma.recordingSegment.updateMany({
              where: { id: seg.id, status: RecordingSegmentStatus.UPLOADING },
              data: {
                status: RecordingSegmentStatus.AVAILABLE,
                fileSizeBytes: stored.sizeBytes,
                uploadedAt: now,
                failureReason: null,
              },
            });
            if (done.count > 0) {
              completed++;
              touched.add(seg.room);
            }
            continue;
          }
        } catch (err) {
          // Could not ask storage: say nothing about this segment this time.
          checked = false;
          this.logger.warn(
            `Sweep could not check recording ${seg.id}: ${describeStorageError(err)}`,
          );
        }
      }
      if (checked && seg.updatedAt < staleBefore) {
        const failed = await this.prisma.recordingSegment.updateMany({
          where: { id: seg.id, status: RecordingSegmentStatus.UPLOADING },
          data: {
            status: RecordingSegmentStatus.FAILED,
            failureReason: FAILURE_NOT_UPLOADED,
          },
        });
        if (failed.count > 0) {
          abandoned++;
          touched.add(seg.room);
          await this.notifyNotUploaded(seg).catch(() => undefined);
        }
      }
    }

    for (const room of touched) {
      await this.syncMirror(room).catch((err) =>
        this.logger.error(`Could not update the summary for ${room}: ${err}`),
      );
    }
    if (closed + completed + abandoned > 0) {
      this.logger.log(
        `Recording sweep: closed ${closed}, confirmed ${completed}, gave up on ${abandoned}.`,
      );
    }
    return { closed, completed, abandoned };
  }

  private async notifyNotUploaded(seg: RecordingSegment): Promise<void> {
    if (!seg.recordedByUserId) return;
    await this.alerts.create({
      userId: seg.recordedByUserId,
      role: Role.TEACHER,
      type: 'RECORDING_FAILED',
      title: 'A class recording was not uploaded',
      message:
        'A recording of one of your classes was never uploaded, so students cannot watch it. ' +
        'Recordings are kept in your browser until you upload them — after a class, press "Upload Class Recording" and keep the tab open until it finishes.',
      metadata: { segmentId: seg.id, room: seg.room },
    });
  }

  // ─── Storage retention ───────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async enforceRetention(): Promise<void> {
    if (!this.storage.isConfigured()) return;
    try {
      await this.runRetention();
    } catch (err) {
      this.logger.error(`Recording retention failed: ${err}`);
    }
  }

  /** Warns admins as stored recordings near the limit, and past it removes the
   * oldest ones first (their files, then marks them EXPIRED) until back under. */
  async runRetention(): Promise<void> {
    const limit = this.storageLimitBytes();
    const stored: Prisma.RecordingSegmentWhereInput = {
      status: RecordingSegmentStatus.AVAILABLE,
      recordedByUserId: { not: null },
    };
    const usage =
      (
        await this.prisma.recordingSegment.aggregate({
          where: stored,
          _sum: { fileSizeBytes: true },
        })
      )._sum.fileSizeBytes ?? 0;
    const ratio = usage / limit;

    if (
      ratio >= STORAGE_WARNING_RATIO &&
      Date.now() - this.lastStorageWarningAt > 6 * 60 * 60 * 1000
    ) {
      this.lastStorageWarningAt = Date.now();
      await this.warnAdminsOfStorage(usage, limit, ratio).catch((err) =>
        this.logger.error(String(err)),
      );
    }
    if (ratio < 1) return;

    let remaining = usage - limit;
    const oldest = await this.prisma.recordingSegment.findMany({
      where: stored,
      orderBy: { startedAt: 'asc' },
      take: 100,
    });
    const touched = new Set<string>();
    for (const seg of oldest) {
      if (remaining <= 0) break;
      try {
        if (seg.storagePath) await this.storage.deleteObject(seg.storagePath);
        await this.prisma.recordingSegment.update({
          where: { id: seg.id },
          data: { status: RecordingSegmentStatus.EXPIRED },
        });
        remaining -= seg.fileSizeBytes ?? 0;
        touched.add(seg.room);
        this.logger.log(
          `Retention: removed recording ${seg.id} (${seg.fileSizeBytes ?? 0} bytes) to stay under the storage limit`,
        );
      } catch (err) {
        // Left AVAILABLE, so the next hourly run tries again.
        this.logger.error(
          `Retention could not remove recording ${seg.id}: ${describeStorageError(err)}`,
        );
      }
    }
    for (const room of touched)
      await this.syncMirror(room).catch(() => undefined);
  }

  private async warnAdminsOfStorage(
    usage: number,
    limit: number,
    ratio: number,
  ): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });
    const gb = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(1);
    await Promise.all(
      admins.map((a) =>
        this.alerts.create({
          userId: a.id,
          role: Role.ADMIN,
          type: 'RECORDING_STORAGE_WARNING',
          title: 'Recording storage nearing capacity',
          message: `Classroom recordings are using ${gb(usage)} GB of the ${gb(limit)} GB limit (${Math.round(ratio * 100)}%). The oldest recordings will be removed once the limit is reached.`,
          metadata: { usageBytes: usage, limitBytes: limit },
        }),
      ),
    );
  }
}

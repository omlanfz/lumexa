// FILE PATH: server/src/classroom/recording.service.ts
//
// Segment-based classroom recording: LiveKit Egress → S3-compatible storage
// (self-hosted MinIO in production via S3_ENDPOINT, or plain AWS S3),
// FFmpeg concatenation into one final recording per class, and storage
// retention. Split out of ClassroomService because this is the single
// biggest, most operationally-sensitive slice of the classroom feature.
//
// ─── Why "segments" ──────────────────────────────────────────────────────
// The teacher can start/stop recording as many times as they like during a
// class (e.g. pause while reviewing sensitive material). Each start→stop is
// its own RecordingSegment row + its own LiveKit RoomCompositeEgress job —
// never one continuous egress paused/resumed, since LiveKit Egress has no
// pause/resume primitive. When the class ends, every segment for that room
// is concatenated in start-time order into a single final recording, which
// is what students actually see (see RecordingStatus on Booking/
// ScheduledLesson — the per-segment lifecycle is RecordingSegmentStatus).
//
// ─── Root cause of the "Recording is not configured" 400 ────────────────
// egressConfigured()/missingEgressEnvVars() below is the actual gate that
// produced the reported 400 (POST .../recording/start → 400 Bad Request,
// "Recording is not configured for this environment yet."). It requires
// LIVEKIT_URL + LIVEKIT_API_KEY + LIVEKIT_API_SECRET (LiveKit connection)
// AND S3_ACCESS_KEY/AWS_ACCESS_KEY + S3_SECRET_KEY/AWS_SECRET_KEY +
// S3_BUCKET/AWS_S3_BUCKET (Egress upload target) to ALL be set. The error
// message now names exactly which of these are missing in the deployed
// backend, instead of a generic message — see missingEgressEnvVars(). Set
// the missing variables in the Render backend's environment (see
// server/.env.example) and redeploy; there is no code path that can start
// an Egress job without them, by design (recording must never silently
// no-op).

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { Role, RecordingStatus, RecordingSegmentStatus } from '@prisma/client';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';
import { createWriteStream, createReadStream } from 'fs';
import { mkdtemp, writeFile, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { DEMO_ROOM_NAME, getRoomRef, roomForLesson } from './room-ref.util';

const RECORDING_MAX_DURATION_MINUTES = Number(process.env.RECORDING_MAX_DURATION_MINUTES) || 70;
const RECORDING_STORAGE_LIMIT_BYTES =
  Number(process.env.RECORDING_STORAGE_LIMIT_BYTES) || 50 * 1024 * 1024 * 1024; // 50 GB default
const STORAGE_WARNING_RATIO = 0.8;

type EntityKind = 'booking' | 'lesson';

interface RecordingMirror {
  recordingStatus: RecordingStatus;
}

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);

  // Per-room lock held for the duration of a start/stop call so a double
  // click (or a retried request) can never create two active egress jobs
  // for the same room — see startSegment/stopActiveSegment.
  private readonly roomLocks = new Set<string>();

  // In-memory recording state for the demo classroom only (see
  // ClassroomService's DEMO_ROOM_NAME block comment) — there is no
  // Booking/ScheduledLesson row to persist against.
  private demoMirror: RecordingMirror = { recordingStatus: RecordingStatus.NONE };
  private demoSegments: Array<{
    id: string;
    egressId: string | null;
    status: RecordingSegmentStatus;
    storagePath: string | null;
    startedAt: Date;
    endedAt: Date | null;
  }> = [];

  private lastStorageWarningAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  // ─── Configuration diagnostics ───────────────────────────────────────────

  missingEgressEnvVars(): string[] {
    const missing: string[] = [];
    if (!process.env.LIVEKIT_URL) missing.push('LIVEKIT_URL');
    if (!process.env.LIVEKIT_API_KEY) missing.push('LIVEKIT_API_KEY');
    if (!process.env.LIVEKIT_API_SECRET) missing.push('LIVEKIT_API_SECRET');
    if (!process.env.S3_ACCESS_KEY && !process.env.AWS_ACCESS_KEY) missing.push('S3_ACCESS_KEY');
    if (!process.env.S3_SECRET_KEY && !process.env.AWS_SECRET_KEY) missing.push('S3_SECRET_KEY');
    if (!process.env.S3_BUCKET && !process.env.AWS_S3_BUCKET) missing.push('S3_BUCKET');
    return missing;
  }

  egressConfigured(): boolean {
    return this.missingEgressEnvVars().length === 0;
  }

  private buildEgressS3Config() {
    const endpoint = process.env.S3_ENDPOINT || undefined;
    return {
      accessKey: process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY,
      secret: process.env.S3_SECRET_KEY || process.env.AWS_SECRET_KEY,
      bucket: process.env.S3_BUCKET || process.env.AWS_S3_BUCKET,
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    };
  }

  private s3Client(): S3Client {
    const endpoint = process.env.S3_ENDPOINT || undefined;
    return new S3Client({
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: (process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY)!,
        secretAccessKey: (process.env.S3_SECRET_KEY || process.env.AWS_SECRET_KEY)!,
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }

  private bucketName(): string {
    return (process.env.S3_BUCKET || process.env.AWS_S3_BUCKET)!;
  }

  private buildObjectUrl(key: string): string {
    const bucket = this.bucketName();
    const endpoint = process.env.S3_ENDPOINT;
    if (endpoint) return `${endpoint.replace(/\/+$/, '')}/${bucket}/${key}`;
    const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  // ─── Entity helpers (Booking | ScheduledLesson | demo, keyed by room) ───

  private entityKindForRoom(room: string): EntityKind | null {
    const ref = getRoomRef(room);
    if (ref.kind === 'demo') return null;
    return ref.kind === 'lesson' ? 'lesson' : 'booking';
  }

  private async readMirror(room: string): Promise<RecordingMirror | null> {
    if (room === DEMO_ROOM_NAME) return this.demoMirror;
    const ref = getRoomRef(room);
    if (ref.kind === 'lesson') {
      return this.prisma.scheduledLesson.findUnique({
        where: { id: ref.scheduledLessonId },
        select: { recordingStatus: true },
      });
    }
    if (ref.kind === 'booking') {
      return this.prisma.booking.findUnique({
        where: { id: ref.bookingId },
        select: { recordingStatus: true },
      });
    }
    return null;
  }

  private async writeMirror(room: string, recordingStatus: RecordingStatus): Promise<void> {
    if (room === DEMO_ROOM_NAME) {
      this.demoMirror = { recordingStatus };
      return;
    }
    const ref = getRoomRef(room);
    if (ref.kind === 'lesson') {
      await this.prisma.scheduledLesson.update({ where: { id: ref.scheduledLessonId }, data: { recordingStatus } });
    } else if (ref.kind === 'booking') {
      await this.prisma.booking.update({ where: { id: ref.bookingId }, data: { recordingStatus } });
    }
  }

  // ─── Segment start / stop (teacher clicks Record) ────────────────────────

  async startSegment(room: string): Promise<{ recordingStatus: RecordingStatus }> {
    const missing = this.missingEgressEnvVars();
    if (missing.length > 0) {
      this.logger.error(
        `Cannot start recording for room ${room} — missing backend env var(s): ${missing.join(', ')}`,
      );
      throw new BadRequestException(
        `Recording is not configured for this environment: missing ${missing.join(', ')}. ` +
          `Set these in the backend deployment (see server/.env.example) and redeploy.`,
      );
    }

    if (this.roomLocks.has(room)) {
      // A start/stop for this room is already in flight — treat a duplicate
      // click as a no-op rather than racing a second egress job.
      const mirror = await this.readMirror(room);
      return { recordingStatus: mirror?.recordingStatus ?? RecordingStatus.RECORDING };
    }
    this.roomLocks.add(room);
    try {
      const activeCount =
        room === DEMO_ROOM_NAME
          ? this.demoSegments.filter((s) => s.status === RecordingSegmentStatus.RECORDING).length
          : await this.prisma.recordingSegment.count({ where: { room, status: RecordingSegmentStatus.RECORDING } });
      if (activeCount > 0) {
        return { recordingStatus: RecordingStatus.RECORDING };
      }

      const ref = getRoomRef(room);
      const objectKey = `recordings/${room}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;

      const { EgressClient } = await import('livekit-server-sdk');
      const egress = new EgressClient(
        process.env.LIVEKIT_URL!,
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
      );

      let info: { egressId: string };
      try {
        info = await egress.startRoomCompositeEgress(room, {
          file: { fileType: 3, filepath: objectKey, s3: this.buildEgressS3Config() },
        } as any);
      } catch (err) {
        this.logger.error(`Egress start error for ${room}: ${err}`);
        throw new BadRequestException('Could not start recording. Please try again.');
      }

      const startedAt = new Date();
      if (room === DEMO_ROOM_NAME) {
        this.demoSegments.push({
          id: `demo-${Date.now()}`,
          egressId: info.egressId,
          status: RecordingSegmentStatus.RECORDING,
          storagePath: objectKey,
          startedAt,
          endedAt: null,
        });
      } else {
        await this.prisma.recordingSegment.create({
          data: {
            room,
            bookingId: ref.kind === 'booking' ? ref.bookingId : undefined,
            scheduledLessonId: ref.kind === 'lesson' ? ref.scheduledLessonId : undefined,
            egressId: info.egressId,
            status: RecordingSegmentStatus.RECORDING,
            storagePath: objectKey,
            startedAt,
          },
        });
      }

      await this.writeMirror(room, RecordingStatus.RECORDING);
      this.logger.log(`Recording segment started for room ${room} (egress ${info.egressId})`);
      return { recordingStatus: RecordingStatus.RECORDING };
    } finally {
      this.roomLocks.delete(room);
    }
  }

  /** Stops whatever segment is currently RECORDING for this room, if any.
   * Safe to call even when nothing is active (endClass/disconnect-sweep
   * call this unconditionally). Never marks a segment AVAILABLE here — only
   * the Egress webhook does that, once the upload is actually confirmed. */
  async stopActiveSegmentIfAny(room: string): Promise<void> {
    if (this.roomLocks.has(room)) return; // a start/stop is already in flight
    this.roomLocks.add(room);
    try {
      const active =
        room === DEMO_ROOM_NAME
          ? this.demoSegments.find((s) => s.status === RecordingSegmentStatus.RECORDING)
          : await this.prisma.recordingSegment.findFirst({
              where: { room, status: RecordingSegmentStatus.RECORDING },
              orderBy: { startedAt: 'desc' },
            });
      if (!active) return;

      try {
        const { EgressClient } = await import('livekit-server-sdk');
        const egress = new EgressClient(
          process.env.LIVEKIT_URL!,
          process.env.LIVEKIT_API_KEY,
          process.env.LIVEKIT_API_SECRET,
        );
        if (active.egressId) await egress.stopEgress(active.egressId);
      } catch (err) {
        this.logger.error(`Egress stop error for ${room}: ${err}`);
      }

      const endedAt = new Date();
      if (room === DEMO_ROOM_NAME) {
        active.status = RecordingSegmentStatus.UPLOADING;
        active.endedAt = endedAt;
      } else {
        await this.prisma.recordingSegment.update({
          where: { id: (active as { id: string }).id },
          data: { status: RecordingSegmentStatus.UPLOADING, endedAt },
        });
      }
      await this.writeMirror(room, RecordingStatus.NONE);
    } finally {
      this.roomLocks.delete(room);
    }
  }

  async stopSegment(room: string): Promise<{ recordingStatus: RecordingStatus }> {
    const active =
      room === DEMO_ROOM_NAME
        ? this.demoSegments.some((s) => s.status === RecordingSegmentStatus.RECORDING)
        : (await this.prisma.recordingSegment.count({ where: { room, status: RecordingSegmentStatus.RECORDING } })) >
          0;
    if (!active) {
      throw new BadRequestException('There is no active recording to stop.');
    }
    await this.stopActiveSegmentIfAny(room);
    return { recordingStatus: RecordingStatus.NONE };
  }

  // ─── 70-minute hard cap ───────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async enforceMaxSegmentDuration() {
    const cutoff = new Date(Date.now() - RECORDING_MAX_DURATION_MINUTES * 60_000);
    const overrunning = await this.prisma.recordingSegment.findMany({
      where: { status: RecordingSegmentStatus.RECORDING, startedAt: { lt: cutoff } },
      select: { room: true },
    });
    const demoOverrunning = this.demoSegments.some(
      (s) => s.status === RecordingSegmentStatus.RECORDING && s.startedAt < cutoff,
    );
    const rooms = new Set(overrunning.map((s) => s.room));
    if (demoOverrunning) rooms.add(DEMO_ROOM_NAME);
    for (const room of rooms) {
      this.logger.warn(`Recording for room ${room} hit the ${RECORDING_MAX_DURATION_MINUTES}-minute cap — auto-stopping segment`);
      await this.stopActiveSegmentIfAny(room).catch((err) =>
        this.logger.error(`Failed to auto-stop recording for room ${room}: ${err}`),
      );
    }
  }

  // ─── Egress webhook: per-segment status update ───────────────────────────

  async handleEgressEnded(egressInfo: {
    egressId?: string;
    roomName?: string;
    status?: number | string;
    file?: { location?: string; size?: number | string };
  }): Promise<void> {
    const egressId = egressInfo.egressId;
    if (!egressId) return;
    // EgressStatus.EGRESS_COMPLETE === 3 in livekit-server-sdk's proto enum.
    const succeeded = egressInfo.status === 3 || egressInfo.status === 'EGRESS_COMPLETE';
    const fileSizeBytes = egressInfo.file?.size !== undefined ? Number(egressInfo.file.size) : undefined;

    if (egressInfo.roomName === DEMO_ROOM_NAME) {
      const seg = this.demoSegments.find((s) => s.egressId === egressId);
      if (seg) seg.status = succeeded ? RecordingSegmentStatus.AVAILABLE : RecordingSegmentStatus.FAILED;
      return;
    }

    const segment = await this.prisma.recordingSegment.findFirst({ where: { egressId } });
    if (!segment) {
      this.logger.warn(`egress_ended for unknown egress ${egressId} (room ${egressInfo.roomName})`);
      return;
    }
    await this.prisma.recordingSegment.update({
      where: { id: segment.id },
      data: succeeded
        ? { status: RecordingSegmentStatus.AVAILABLE, fileSizeBytes: fileSizeBytes ?? null }
        : { status: RecordingSegmentStatus.FAILED, failureReason: `Egress status ${egressInfo.status}` },
    });
    if (!succeeded) {
      this.logger.warn(`Recording segment failed for room ${segment.room} (egress status ${egressInfo.status})`);
    }
  }

  // ─── Class-end finalization → async merge ────────────────────────────────

  /** Called once, right after the recording (if any) has been stopped, when
   * a class ends. Hands the room off to the merge sweep rather than merging
   * inline, so endClass stays fast and a server restart mid-merge can't
   * lose the job. */
  async finalizeAtClassEnd(room: string): Promise<void> {
    if (room === DEMO_ROOM_NAME) return; // QA room has nothing to persist/merge
    const hasAnySegment =
      (await this.prisma.recordingSegment.count({ where: { room } })) > 0;
    if (!hasAnySegment) return;
    await this.writeMirror(room, RecordingStatus.PROCESSING);
  }

  // ─── Merge sweep ──────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processMergeSweep() {
    const [bookings, lessons] = await Promise.all([
      this.prisma.booking.findMany({
        where: { recordingStatus: RecordingStatus.PROCESSING, recordingMergedAt: null },
        select: { id: true },
        take: 20,
      }),
      this.prisma.scheduledLesson.findMany({
        where: { recordingStatus: RecordingStatus.PROCESSING, recordingMergedAt: null },
        select: { id: true },
        take: 20,
      }),
    ]);
    for (const b of bookings) await this.tryMerge('booking', b.id).catch((e) => this.logger.error(String(e)));
    for (const l of lessons) await this.tryMerge('lesson', l.id).catch((e) => this.logger.error(String(e)));
  }

  private async tryMerge(kind: EntityKind, id: string): Promise<void> {
    const room = kind === 'lesson' ? roomForLesson(id) : id;
    const segments = await this.prisma.recordingSegment.findMany({ where: { room } });
    const stillSettling = segments.some(
      (s) => s.status === RecordingSegmentStatus.RECORDING || s.status === RecordingSegmentStatus.UPLOADING,
    );
    if (stillSettling) return; // wait for the Egress webhook (or the next sweep tick)
    await this.mergeEntity(kind, id, room, segments);
  }

  /** Admin-triggered retry for a FAILED merge. */
  async retryMerge(kind: EntityKind, id: string): Promise<{ ok: true }> {
    const current =
      kind === 'lesson'
        ? await this.prisma.scheduledLesson.findUnique({ where: { id }, select: { recordingStatus: true } })
        : await this.prisma.booking.findUnique({ where: { id }, select: { recordingStatus: true } });
    if (!current) throw new BadRequestException('Class not found.');
    if (current.recordingStatus !== RecordingStatus.FAILED) {
      throw new BadRequestException('Only a failed recording can be retried.');
    }
    const data = { recordingStatus: RecordingStatus.PROCESSING, recordingMergedAt: null, recordingMergeError: null };
    if (kind === 'lesson') await this.prisma.scheduledLesson.update({ where: { id }, data });
    else await this.prisma.booking.update({ where: { id }, data });
    return { ok: true };
  }

  private async mergeEntity(
    kind: EntityKind,
    id: string,
    room: string,
    segments: Array<{
      id: string;
      status: RecordingSegmentStatus;
      storagePath: string | null;
      startedAt: Date;
    }>,
  ): Promise<void> {
    const available = segments
      .filter((s) => s.status === RecordingSegmentStatus.AVAILABLE && s.storagePath)
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

    const fail = async (message: string) => {
      const attempts =
        (kind === 'lesson'
          ? await this.prisma.scheduledLesson.findUnique({ where: { id }, select: { recordingMergeAttempts: true } })
          : await this.prisma.booking.findUnique({ where: { id }, select: { recordingMergeAttempts: true } })
        )?.recordingMergeAttempts ?? 0;
      const data = {
        recordingStatus: RecordingStatus.FAILED,
        recordingMergeError: message,
        recordingMergeAttempts: attempts + 1,
      };
      if (kind === 'lesson') await this.prisma.scheduledLesson.update({ where: { id }, data });
      else await this.prisma.booking.update({ where: { id }, data });
      this.logger.error(`Recording merge failed for ${kind} ${id}: ${message}`);
      await this.notifyMergeFailure(kind, id, message).catch(() => {});
    };

    if (available.length === 0) {
      await fail('No recording segments were successfully uploaded — nothing to merge.');
      return;
    }

    let workDir: string | null = null;
    try {
      const s3 = this.s3Client();
      const bucket = this.bucketName();
      workDir = await mkdtemp(join(tmpdir(), 'lumexa-rec-'));

      const localFiles: string[] = [];
      for (let i = 0; i < available.length; i++) {
        const key = available[i].storagePath!;
        const localPath = join(workDir, `seg-${i}.mp4`);
        const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        await pipeline(obj.Body as NodeJS.ReadableStream, createWriteStream(localPath));
        localFiles.push(localPath);
      }

      const outputPath = join(workDir, 'final.mp4');
      if (localFiles.length === 1) {
        await rm(outputPath, { force: true });
        await this.copyFile(localFiles[0], outputPath);
      } else {
        const listPath = join(workDir, 'concat.txt');
        await writeFile(listPath, localFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
        try {
          await this.runFfmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-y', outputPath]);
        } catch {
          // Segments came from separately-started RoomCompositeEgress jobs and
          // should share codec/resolution, but fall back to a re-encode if a
          // stream copy ever refuses to concatenate them cleanly.
          await this.runFfmpeg([
            '-f', 'concat', '-safe', '0', '-i', listPath,
            '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-y', outputPath,
          ]);
        }
      }

      const { size } = await stat(outputPath);
      const finalKey = `recordings/final/${room}/${Date.now()}.mp4`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: finalKey,
          Body: createReadStream(outputPath),
          ContentType: 'video/mp4',
          ContentLength: size,
        }),
      );

      const finalUrl = this.buildObjectUrl(finalKey);
      const data = {
        recordingStatus: RecordingStatus.AVAILABLE,
        recordingUrl: finalUrl,
        recordingFileSizeBytes: size,
        recordingMergedAt: new Date(),
        recordingMergeError: null,
      };
      if (kind === 'lesson') await this.prisma.scheduledLesson.update({ where: { id }, data });
      else await this.prisma.booking.update({ where: { id }, data });
      this.logger.log(`Recording merged for ${kind} ${id} (${available.length} segment(s), ${size} bytes)`);

      // Raw per-segment files are no longer needed once folded into the
      // final recording — best-effort cleanup, never blocks success.
      for (const seg of available) {
        await s3
          .send(new DeleteObjectCommand({ Bucket: bucket, Key: seg.storagePath! }))
          .then(() => this.prisma.recordingSegment.update({ where: { id: seg.id }, data: { status: RecordingSegmentStatus.EXPIRED } }))
          .catch((err) => this.logger.warn(`Could not clean up raw segment ${seg.id}: ${err}`));
      }
    } catch (err) {
      await fail(err instanceof Error ? err.message : String(err));
    } finally {
      if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private async copyFile(src: string, dest: string): Promise<void> {
    await pipeline(createReadStream(src), createWriteStream(dest));
  }

  private runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn((ffmpegInstaller as { path: string }).path, args);
      let stderr = '';
      proc.stderr.on('data', (d) => (stderr += d.toString()));
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-800)}`));
      });
    });
  }

  private async notifyMergeFailure(kind: EntityKind, id: string, message: string): Promise<void> {
    const teacherUserId =
      kind === 'lesson'
        ? (
            await this.prisma.scheduledLesson.findUnique({
              where: { id },
              select: { teacher: { select: { userId: true } } },
            })
          )?.teacher.userId
        : (
            await this.prisma.booking.findUnique({
              where: { id },
              select: { shift: { select: { teacher: { select: { userId: true } } } } },
            })
          )?.shift.teacher.userId;
    if (!teacherUserId) return;
    await this.alerts.create({
      userId: teacherUserId,
      role: Role.TEACHER,
      type: 'RECORDING_FAILED',
      title: 'Recording failed',
      message: "This class's recording could not be finalized. Lumexa Ops has been notified and can retry it.",
      metadata: { kind, id, error: message },
    });

    const admins = await this.prisma.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
    await Promise.all(
      admins.map((a) =>
        this.alerts.create({
          userId: a.id,
          role: Role.ADMIN,
          type: 'RECORDING_MERGE_FAILED',
          title: 'Recording merge failed',
          message: `A class recording failed to finalize and needs a retry from Admin → Classes.`,
          metadata: { kind, id, error: message },
        }),
      ),
    ).catch(() => {});
  }

  // ─── Storage retention ────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async enforceRetention() {
    if (!this.egressConfigured()) return;

    const usage = await this.currentStorageUsageBytes();
    const ratio = usage / RECORDING_STORAGE_LIMIT_BYTES;

    if (ratio >= STORAGE_WARNING_RATIO && Date.now() - this.lastStorageWarningAt > 6 * 60 * 60 * 1000) {
      this.lastStorageWarningAt = Date.now();
      await this.warnAdminsOfStorage(usage, ratio).catch((err) => this.logger.error(String(err)));
    }

    if (ratio < 1) return;

    // Delete the oldest COMPLETED (never active/processing) recordings
    // first until we're back under the limit.
    let remaining = usage - RECORDING_STORAGE_LIMIT_BYTES;
    const candidates = await this.oldestCompletedRecordings(100);
    const s3 = this.s3Client();
    const bucket = this.bucketName();
    for (const rec of candidates) {
      if (remaining <= 0) break;
      const key = this.keyFromUrl(rec.recordingUrl);
      try {
        if (key) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        const data = { recordingStatus: RecordingStatus.EXPIRED, recordingUrl: null };
        if (rec.kind === 'lesson') await this.prisma.scheduledLesson.update({ where: { id: rec.id }, data });
        else await this.prisma.booking.update({ where: { id: rec.id }, data });
        remaining -= rec.size;
        this.logger.log(`Retention: expired ${rec.kind} ${rec.id} recording (${rec.size} bytes) to stay under the storage cap`);
      } catch (err) {
        // Retry-safe: leave the row AVAILABLE so the next hourly sweep tries
        // again rather than losing track of it half-deleted.
        this.logger.error(`Retention delete failed for ${rec.kind} ${rec.id}: ${err}`);
      }
    }
  }

  private keyFromUrl(url: string | null): string | null {
    if (!url) return null;
    const bucket = this.bucketName();
    const marker = `/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx >= 0) return url.slice(idx + marker.length);
    // Virtual-hosted AWS S3 URL: https://<bucket>.s3.<region>.amazonaws.com/<key>
    const afterHost = url.split('.amazonaws.com/')[1];
    return afterHost ?? null;
  }

  private async currentStorageUsageBytes(): Promise<number> {
    const [bookingAgg, lessonAgg, segmentAgg] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { recordingStatus: RecordingStatus.AVAILABLE },
        _sum: { recordingFileSizeBytes: true },
      }),
      this.prisma.scheduledLesson.aggregate({
        where: { recordingStatus: RecordingStatus.AVAILABLE },
        _sum: { recordingFileSizeBytes: true },
      }),
      this.prisma.recordingSegment.aggregate({
        where: { status: RecordingSegmentStatus.AVAILABLE },
        _sum: { fileSizeBytes: true },
      }),
    ]);
    return (
      (bookingAgg._sum.recordingFileSizeBytes ?? 0) +
      (lessonAgg._sum.recordingFileSizeBytes ?? 0) +
      (segmentAgg._sum.fileSizeBytes ?? 0)
    );
  }

  private async oldestCompletedRecordings(
    limit: number,
  ): Promise<Array<{ kind: EntityKind; id: string; recordingUrl: string | null; size: number }>> {
    const [bookings, lessons] = await Promise.all([
      this.prisma.booking.findMany({
        where: { recordingStatus: RecordingStatus.AVAILABLE, paymentStatus: 'CAPTURED' },
        orderBy: { recordingMergedAt: 'asc' },
        select: { id: true, recordingUrl: true, recordingFileSizeBytes: true, recordingMergedAt: true },
        take: limit,
      }),
      this.prisma.scheduledLesson.findMany({
        where: {
          recordingStatus: RecordingStatus.AVAILABLE,
          status: { in: ['COMPLETED', 'PARTIALLY_COMPLETED'] },
        },
        orderBy: { recordingMergedAt: 'asc' },
        select: { id: true, recordingUrl: true, recordingFileSizeBytes: true, recordingMergedAt: true },
        take: limit,
      }),
    ]);
    return [
      ...bookings.map((b) => ({
        kind: 'booking' as const,
        id: b.id,
        recordingUrl: b.recordingUrl,
        size: b.recordingFileSizeBytes ?? 0,
        mergedAt: b.recordingMergedAt ?? new Date(0),
      })),
      ...lessons.map((l) => ({
        kind: 'lesson' as const,
        id: l.id,
        recordingUrl: l.recordingUrl,
        size: l.recordingFileSizeBytes ?? 0,
        mergedAt: l.recordingMergedAt ?? new Date(0),
      })),
    ].sort((a, b) => a.mergedAt.getTime() - b.mergedAt.getTime());
  }

  private async warnAdminsOfStorage(usage: number, ratio: number): Promise<void> {
    const admins = await this.prisma.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
    const usageGb = (usage / (1024 * 1024 * 1024)).toFixed(1);
    const limitGb = (RECORDING_STORAGE_LIMIT_BYTES / (1024 * 1024 * 1024)).toFixed(1);
    await Promise.all(
      admins.map((a) =>
        this.alerts.create({
          userId: a.id,
          role: Role.ADMIN,
          type: 'RECORDING_STORAGE_WARNING',
          title: 'Recording storage nearing capacity',
          message: `Classroom recordings are using ${usageGb} GB of the ${limitGb} GB limit (${Math.round(ratio * 100)}%). The oldest completed recordings will be auto-deleted once the limit is reached.`,
          metadata: { usageBytes: usage, limitBytes: RECORDING_STORAGE_LIMIT_BYTES },
        }),
      ),
    );
  }
}

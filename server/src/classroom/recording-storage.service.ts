// FILE PATH: server/src/classroom/recording-storage.service.ts
//
// Class recordings live in a PRIVATE Cloudflare R2 bucket, reached through R2's
// S3-compatible API. This is the only file that talks to it.
//
// Nothing in the browser ever holds R2 credentials. The server signs short-lived
// URLs and hands them out:
//   - an UPLOAD url (PUT, 15 minutes) to the teacher who recorded the class — the
//     browser sends the finished WebM file straight to R2, never through this
//     server;
//   - a PLAYBACK url (GET, 2 hours) to someone allowed to watch it.
// Signing is local arithmetic (no request to R2), so it works — and is fast —
// whether or not R2 is reachable; only headObject/deleteObject make a request.
//
// Configuration (one set of names, see server/.env.example):
//   R2_ACCOUNT_ID         Cloudflare account id (builds the endpoint)
//   R2_ACCESS_KEY_ID      R2 API token — Access Key ID
//   R2_SECRET_ACCESS_KEY  R2 API token — Secret Access Key
//   R2_BUCKET             the (private) bucket's name
//   R2_ENDPOINT           optional: the full S3 endpoint, instead of the one built
//                         from R2_ACCOUNT_ID (EU-jurisdiction buckets, or a local
//                         S3-compatible server in tests)

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** The only kind of file a recording is. */
export const RECORDING_CONTENT_TYPE = 'video/webm';

/** How long an upload URL may be used to START the upload. (A request that has
 * started keeps going however long it takes; a retry asks for a fresh URL.) */
export const UPLOAD_URL_TTL_SECONDS = 15 * 60;

/** Long enough to watch a whole class, with room to pause. A viewer who needs
 * longer simply asks again. */
export const PLAYBACK_URL_TTL_SECONDS = 2 * 60 * 60;

export interface SignedUpload {
  url: string;
  /** Headers the browser MUST send with the PUT, exactly as given. */
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface SignedPlayback {
  url: string;
  expiresAt: Date;
}

export interface StoredObject {
  sizeBytes: number;
  contentType: string | null;
}

/** R2 refused or could not be reached. `status` is the HTTP status when there
 * was one (403 = the credentials, bucket or permissions are wrong). */
export class RecordingStorageError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'RecordingStorageError';
  }
}

@Injectable()
export class RecordingStorageService implements OnModuleInit {
  private readonly logger = new Logger(RecordingStorageService.name);
  private client: S3Client | null = null;
  private clientFor = '';

  // ─── Configuration ───────────────────────────────────────────────────────

  /** Names of the settings that are missing ([] when storage is configured). */
  missingEnvVars(): string[] {
    const missing: string[] = [];
    if (!process.env.R2_ENDPOINT && !process.env.R2_ACCOUNT_ID)
      missing.push('R2_ACCOUNT_ID');
    if (!process.env.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
    if (!process.env.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
    if (!process.env.R2_BUCKET) missing.push('R2_BUCKET');
    return missing;
  }

  isConfigured(): boolean {
    return this.missingEnvVars().length === 0;
  }

  bucket(): string {
    return process.env.R2_BUCKET ?? '';
  }

  endpoint(): string {
    const custom = process.env.R2_ENDPOINT?.trim();
    if (custom) return custom.replace(/\/+$/, '');
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }

  /** Where a segment's file lives: one object per segment, named by the
   * segment, so uploading the same segment again can only ever replace itself
   * (never another segment, never a duplicate). */
  objectKeyFor(room: string, segmentId: string): string {
    const safeRoom = room.replace(/[^A-Za-z0-9._-]/g, '_');
    return `recordings/${safeRoom}/${segmentId}.webm`;
  }

  private s3(): S3Client {
    const signature = [
      this.endpoint(),
      process.env.R2_ACCESS_KEY_ID,
      process.env.R2_SECRET_ACCESS_KEY,
    ].join('|');
    if (!this.client || this.clientFor !== signature) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.endpoint(),
        // `<bucket>.<account>.r2…` needs a certificate per bucket name, which a
        // bucket name with a dot in it cannot have; the path form always works.
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
        // Recent AWS SDKs add a CRC32 checksum to every upload by default,
        // which would turn into extra query parameters on the signed URL that a
        // browser upload does not satisfy. Only when an operation requires one.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
      this.clientFor = signature;
    }
    return this.client;
  }

  // ─── Signed URLs ─────────────────────────────────────────────────────────

  /** A URL the teacher's browser PUTs the finished WebM to. */
  async createUploadUrl(key: string): Promise<SignedUpload> {
    const url = await getSignedUrl(
      this.s3(),
      new PutObjectCommand({
        Bucket: this.bucket(),
        Key: key,
        ContentType: RECORDING_CONTENT_TYPE,
      }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );
    return {
      url,
      headers: { 'Content-Type': RECORDING_CONTENT_TYPE },
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000),
    };
  }

  /** A URL somebody allowed to watch the recording streams it from. */
  async createPlaybackUrl(key: string): Promise<SignedPlayback> {
    const url = await getSignedUrl(
      this.s3(),
      new GetObjectCommand({ Bucket: this.bucket(), Key: key }),
      { expiresIn: PLAYBACK_URL_TTL_SECONDS },
    );
    return {
      url,
      expiresAt: new Date(Date.now() + PLAYBACK_URL_TTL_SECONDS * 1000),
    };
  }

  // ─── Requests to R2 ──────────────────────────────────────────────────────

  /** What is stored under `key`, or null when nothing is. A PUT is atomic, so a
   * file that is there is a complete one. */
  async headObject(key: string): Promise<StoredObject | null> {
    try {
      const head = await this.s3().send(
        new HeadObjectCommand({ Bucket: this.bucket(), Key: key }),
      );
      return {
        sizeBytes: Number(head.ContentLength ?? 0),
        contentType: head.ContentType ?? null,
      };
    } catch (err) {
      if (isNotFound(err)) return null;
      throw toStorageError(err);
    }
  }

  /** Removes the file (a no-op when there is none). */
  async deleteObject(key: string): Promise<void> {
    try {
      await this.s3().send(
        new DeleteObjectCommand({ Bucket: this.bucket(), Key: key }),
      );
    } catch (err) {
      if (isNotFound(err)) return;
      throw toStorageError(err);
    }
  }

  // ─── Start-up diagnostics ────────────────────────────────────────────────

  /** Says in the log, once at boot, whether recordings can be stored — the
   * first place to look when an upload fails. Never delays or fails start-up. */
  onModuleInit(): void {
    const missing = this.missingEnvVars();
    if (missing.length > 0) {
      this.logger.warn(
        `Recording storage (Cloudflare R2) is not configured — missing ${missing.join(', ')}. ` +
          'Teachers can still record in their browser, but cannot upload, and students cannot watch.',
      );
      return;
    }
    void this.checkConnection();
  }

  /** Asks R2 about a file that should not exist: "not found" proves the
   * credentials, endpoint and bucket are right; anything else says what is
   * wrong. Logged, never thrown. */
  async checkConnection(): Promise<boolean> {
    try {
      await this.headObject('recordings/.lumexa-healthcheck');
      this.logger.log(
        `Recording storage is ready: bucket "${this.bucket()}" on ${this.endpoint()}.`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Recording storage check failed for bucket "${this.bucket()}" on ${this.endpoint()}: ${describeStorageError(err)}. ` +
          'Uploads will fail until the R2_* settings are corrected.',
      );
      return false;
    }
  }
}

// ─── Error handling ──────────────────────────────────────────────────────────

interface AwsLikeError {
  name?: string;
  message?: string;
  Code?: string;
  $metadata?: { httpStatusCode?: number };
}

function isNotFound(err: unknown): boolean {
  const e = err as AwsLikeError;
  return (
    e?.$metadata?.httpStatusCode === 404 ||
    e?.name === 'NotFound' ||
    e?.name === 'NoSuchKey'
  );
}

function toStorageError(err: unknown): RecordingStorageError {
  if (err instanceof RecordingStorageError) return err;
  const e = err as AwsLikeError;
  return new RecordingStorageError(
    e?.message ?? String(err),
    e?.Code ?? e?.name,
    e?.$metadata?.httpStatusCode,
  );
}

/** A one-line account of a storage failure for the log (never shown to users). */
export function describeStorageError(err: unknown): string {
  const e = toStorageError(err);
  const parts = [e.code, e.status ? `HTTP ${e.status}` : undefined, e.message]
    .filter(Boolean)
    .join(' — ');
  return parts || 'unknown error';
}

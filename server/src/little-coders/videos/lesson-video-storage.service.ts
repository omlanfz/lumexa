// FILE PATH: server/src/little-coders/videos/lesson-video-storage.service.ts
//
// The Little Coders "Your Learning Preview" videos live in their OWN Cloudflare R2 bucket
// (`lumexa-lesson-videos`), reached through R2's S3-compatible API. This is the only file that talks
// to it. Unlike homework files and class recordings, nothing in this bucket is ever deleted by
// Lumexa: there is deliberately no delete operation here, so a lesson video is kept indefinitely.
//
// It is separate from the other buckets on purpose: its own bucket, its own API token, its own
// LESSON_VIDEO_R2_* settings. A "lesson video bucket" that turns out to be the class-recordings or
// the homework bucket (both of which are cleaned up by their own lifecycles) is refused outright.
//
// Delivery: the bucket stays PRIVATE and the server hands out a signed link (six hours) every time a
// lesson is opened — or, if you put a public domain / CDN in front of the bucket, set
// LESSON_VIDEO_PUBLIC_BASE_URL and the plain public address is used instead (cheaper and cached).
//
// Configuration (see server/.env.example and docs/LESSON_VIDEOS_SETUP.md):
//   LESSON_VIDEO_R2_BUCKET             the bucket, e.g. lumexa-lesson-videos
//   LESSON_VIDEO_R2_ACCESS_KEY_ID      R2 API token for THAT bucket only (Object Read & Write)
//   LESSON_VIDEO_R2_SECRET_ACCESS_KEY  … its secret
//   LESSON_VIDEO_R2_ACCOUNT_ID         Cloudflare account id (falls back to R2_ACCOUNT_ID — an id, not a secret)
//   LESSON_VIDEO_R2_ENDPOINT           optional full S3 endpoint (EU jurisdiction, or a local server in tests)
//   LESSON_VIDEO_PUBLIC_BASE_URL       optional public address of the bucket (custom domain / r2.dev)

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { isLessonVideoKey, kindOfKey, CONTENT_TYPE } from './video-keys';

/** How long a signed link to a lesson video stays good. Long enough to watch it, rewind and finish the lesson. */
export const LESSON_VIDEO_URL_TTL_SECONDS = 6 * 60 * 60;

/** Buckets that have their own lifecycles: a lesson video must never share them. */
const FORBIDDEN_BUCKETS = ['lumexa-recordings'];

export const LESSON_VIDEO_STORAGE = 'LESSON_VIDEO_STORAGE';

export class LessonVideoStorageError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'LessonVideoStorageError';
  }
}

/** What the rest of the app depends on — tests stand in an in-memory version. */
export interface LessonVideoStorage {
  isConfigured(): boolean;
  /** Why it cannot be used, or null. */
  configurationProblem(): string | null;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  /** The size of what is stored under `key`, or null when nothing is. */
  headObject(key: string): Promise<{ sizeBytes: number } | null>;
  /** A playable address for a stored object (public, or signed). */
  urlFor(key: string): Promise<string>;
  /** Where the videos are kept and how they reach students, for the admin page (null when not set up). */
  describe(): { bucket: string; delivery: 'signed' | 'public' } | null;
}

@Injectable()
export class LessonVideoStorageService
  implements LessonVideoStorage, OnModuleInit
{
  private readonly logger = new Logger(LessonVideoStorageService.name);
  private client: S3Client | null = null;
  private clientFor = '';

  // ─── Configuration ───────────────────────────────────────────────────────

  missingEnvVars(): string[] {
    const missing: string[] = [];
    if (!process.env.LESSON_VIDEO_R2_ENDPOINT && !this.accountId())
      missing.push('LESSON_VIDEO_R2_ACCOUNT_ID');
    if (!process.env.LESSON_VIDEO_R2_ACCESS_KEY_ID)
      missing.push('LESSON_VIDEO_R2_ACCESS_KEY_ID');
    if (!process.env.LESSON_VIDEO_R2_SECRET_ACCESS_KEY)
      missing.push('LESSON_VIDEO_R2_SECRET_ACCESS_KEY');
    if (!process.env.LESSON_VIDEO_R2_BUCKET)
      missing.push('LESSON_VIDEO_R2_BUCKET');
    return missing;
  }

  configurationProblem(): string | null {
    const missing = this.missingEnvVars();
    if (missing.length > 0) return `missing ${missing.join(', ')}`;
    const bucket = this.bucket();
    const others = [
      ...FORBIDDEN_BUCKETS,
      process.env.R2_BUCKET,
      process.env.HOMEWORK_R2_BUCKET,
    ]
      .map((b) => (b ?? '').trim())
      .filter(Boolean);
    if (others.includes(bucket)) {
      return `LESSON_VIDEO_R2_BUCKET ("${bucket}") is another Lumexa bucket (recordings or homework) — lesson videos need a bucket of their own`;
    }
    return null;
  }

  isConfigured(): boolean {
    return this.configurationProblem() === null;
  }

  bucket(): string {
    return (process.env.LESSON_VIDEO_R2_BUCKET ?? '').trim();
  }

  private accountId(): string {
    return (
      process.env.LESSON_VIDEO_R2_ACCOUNT_ID ||
      process.env.HOMEWORK_R2_ACCOUNT_ID ||
      process.env.R2_ACCOUNT_ID ||
      ''
    ).trim();
  }

  endpoint(): string {
    const custom = process.env.LESSON_VIDEO_R2_ENDPOINT?.trim();
    if (custom) return custom.replace(/\/+$/, '');
    return `https://${this.accountId()}.r2.cloudflarestorage.com`;
  }

  describe(): { bucket: string; delivery: 'signed' | 'public' } | null {
    if (this.configurationProblem()) return null;
    return {
      bucket: this.bucket(),
      delivery: this.publicBaseUrl() ? 'public' : 'signed',
    };
  }

  /** The public address of the bucket (no trailing slash), when one is configured. */
  publicBaseUrl(): string | null {
    const base = (process.env.LESSON_VIDEO_PUBLIC_BASE_URL ?? '')
      .trim()
      .replace(/\/+$/, '');
    return /^https:\/\//.test(base) ? base : null;
  }

  private s3(): S3Client {
    const problem = this.configurationProblem();
    if (problem)
      throw new LessonVideoStorageError(
        `Lesson video storage is not configured: ${problem}.`,
        'NotConfigured',
      );
    const signature = [
      this.endpoint(),
      process.env.LESSON_VIDEO_R2_ACCESS_KEY_ID,
      process.env.LESSON_VIDEO_R2_SECRET_ACCESS_KEY,
    ].join('|');
    if (!this.client || this.clientFor !== signature) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.endpoint(),
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.LESSON_VIDEO_R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.LESSON_VIDEO_R2_SECRET_ACCESS_KEY!,
        },
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
      this.clientFor = signature;
    }
    return this.client;
  }

  // ─── Requests to R2 ──────────────────────────────────────────────────────

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    this.assertKey(key);
    try {
      await this.s3().send(
        new PutObjectCommand({
          Bucket: this.bucket(),
          Key: key,
          Body: body,
          ContentType: contentType,
          ContentLength: body.length,
          // The key contains the file's hash, so what is stored under it never changes.
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      throw toStorageError(err);
    }
  }

  async headObject(key: string): Promise<{ sizeBytes: number } | null> {
    this.assertKey(key);
    try {
      const head = await this.s3().send(
        new HeadObjectCommand({ Bucket: this.bucket(), Key: key }),
      );
      return { sizeBytes: Number(head.ContentLength ?? 0) };
    } catch (err) {
      if (isNotFound(err)) return null;
      throw toStorageError(err);
    }
  }

  async urlFor(key: string): Promise<string> {
    this.assertKey(key);
    const base = this.publicBaseUrl();
    if (base) return `${base}/${key}`;
    const kind = kindOfKey(key);
    return getSignedUrl(
      this.s3(),
      new GetObjectCommand({
        Bucket: this.bucket(),
        Key: key,
        ...(kind ? { ResponseContentType: CONTENT_TYPE[kind] } : {}),
      }),
      { expiresIn: LESSON_VIDEO_URL_TTL_SECONDS },
    );
  }

  private assertKey(key: string): void {
    if (!isLessonVideoKey(key))
      throw new LessonVideoStorageError(
        `"${key}" is not a lesson video key.`,
        'InvalidKey',
      );
  }

  // ─── Start-up diagnostics ────────────────────────────────────────────────

  /** Says in the log, once at boot, whether lesson videos can be stored and served. Never fails start-up. */
  onModuleInit(): void {
    const problem = this.configurationProblem();
    if (problem) {
      this.logger.warn(
        `Lesson video storage (Cloudflare R2) is not set up — ${problem}. Lessons keep showing "video coming soon" until it is (docs/LESSON_VIDEOS_SETUP.md).`,
      );
      return;
    }
    void this.checkConnection();
  }

  /** Asks R2 about a key that should not exist: "not found" proves the credentials, endpoint and bucket. */
  async checkConnection(): Promise<boolean> {
    try {
      await this.headObject('lesson-videos/little-coders/healthcheck/none.mp4');
      this.logger.log(
        `Lesson video storage is ready: bucket "${this.bucket()}" on ${this.endpoint()}${this.publicBaseUrl() ? ` (public address ${this.publicBaseUrl()})` : ' (signed links)'}.`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Lesson video storage check failed for bucket "${this.bucket()}" on ${this.endpoint()}: ${describeStorageError(err)}. Videos cannot be uploaded or played until the LESSON_VIDEO_R2_* settings are corrected.`,
      );
      return false;
    }
  }
}

// ─── Errors ──────────────────────────────────────────────────────────────────

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

function toStorageError(err: unknown): LessonVideoStorageError {
  if (err instanceof LessonVideoStorageError) return err;
  const e = err as AwsLikeError;
  return new LessonVideoStorageError(
    e?.message ?? String(err),
    e?.Code ?? e?.name,
    e?.$metadata?.httpStatusCode,
  );
}

export function describeStorageError(err: unknown): string {
  const e = toStorageError(err);
  return (
    [e.code, e.status ? `HTTP ${e.status}` : undefined, e.message]
      .filter(Boolean)
      .join(' — ') || 'unknown error'
  );
}

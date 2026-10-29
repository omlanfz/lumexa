// FILE PATH: server/src/submissions/homework-storage.service.ts
//
// Homework files live in their OWN private Cloudflare R2 bucket, reached through
// R2's S3-compatible API. This is the only file that talks to it.
//
// It is deliberately separate from the class-recording storage
// (classroom/recording-storage.service.ts, bucket `lumexa-recordings`): its own
// bucket, its own API token, its own HOMEWORK_R2_* settings. Nothing here reads
// the recordings' key, secret or bucket, and a homework bucket that turns out to
// be the recordings bucket is refused outright (see configurationProblem) — so
// homework can never end up beside, or be cleaned up together with, recordings.
//
// Nothing in the browser ever holds R2 credentials. Students' files are sent to
// THIS server, which stores them; a teacher (or the student) gets a short-lived
// signed URL — minutes, not hours — only to open or download one file.
//
// Configuration (see server/.env.example and docs/HOMEWORK_SUBMISSIONS_SETUP.md):
//   HOMEWORK_R2_BUCKET             the private homework bucket
//   HOMEWORK_R2_ACCESS_KEY_ID      R2 API token for THAT bucket only — Access Key ID
//   HOMEWORK_R2_SECRET_ACCESS_KEY  … Secret Access Key
//   HOMEWORK_R2_ACCOUNT_ID         Cloudflare account id (falls back to R2_ACCOUNT_ID —
//                                  an id, not a secret — when it is the same account)
//   HOMEWORK_R2_ENDPOINT           optional full S3 endpoint (EU jurisdiction, or a
//                                  local S3-compatible server in tests)

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { asciiFileName, safeFileName } from './homework-file-types';

/** How long a signed link to open or download one file stays good. */
export const HOMEWORK_VIEW_URL_TTL_SECONDS = 5 * 60;

/** The recordings bucket's name — homework must never be configured onto it. */
const RECORDINGS_BUCKET_NAME = 'lumexa-recordings';

/** R2 refused or could not be reached. `status` is the HTTP status when there was one. */
export class HomeworkStorageError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HomeworkStorageError';
  }
}

export interface StoredHomeworkObject {
  sizeBytes: number;
}

/** What the storage does — the part the rest of the app depends on, so tests can
 * stand in an in-memory version (see testing/memory-homework-storage.ts). */
export interface HomeworkStorage {
  isConfigured(): boolean;
  /** Why it cannot be used, or null. */
  configurationProblem(): string | null;
  objectKeyFor(parts: {
    courseId: string;
    studentUserId: string;
    fileId: string;
    fileName: string;
  }): string;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  /** The size of what is stored under `key`, or null when nothing is. */
  headObject(key: string): Promise<StoredHomeworkObject | null>;
  getObject(key: string): Promise<Buffer>;
  /** Removes the object; a no-op when there is none. Throws when R2 could not be asked. */
  deleteObject(key: string): Promise<void>;
  createViewUrl(
    key: string,
    opts: {
      fileName: string;
      contentType: string;
      disposition: 'inline' | 'attachment';
    },
  ): Promise<{ url: string; expiresAt: Date }>;
}

@Injectable()
export class HomeworkStorageService implements HomeworkStorage, OnModuleInit {
  private readonly logger = new Logger(HomeworkStorageService.name);
  private client: S3Client | null = null;
  private clientFor = '';

  // ─── Configuration ───────────────────────────────────────────────────────

  /** Names of the settings that are missing ([] when all are set). */
  missingEnvVars(): string[] {
    const missing: string[] = [];
    if (!process.env.HOMEWORK_R2_ENDPOINT && !this.accountId())
      missing.push('HOMEWORK_R2_ACCOUNT_ID');
    if (!process.env.HOMEWORK_R2_ACCESS_KEY_ID)
      missing.push('HOMEWORK_R2_ACCESS_KEY_ID');
    if (!process.env.HOMEWORK_R2_SECRET_ACCESS_KEY)
      missing.push('HOMEWORK_R2_SECRET_ACCESS_KEY');
    if (!process.env.HOMEWORK_R2_BUCKET) missing.push('HOMEWORK_R2_BUCKET');
    return missing;
  }

  /** Why homework storage cannot be used, or null when it can. */
  configurationProblem(): string | null {
    const missing = this.missingEnvVars();
    if (missing.length > 0) return `missing ${missing.join(', ')}`;
    const bucket = this.bucket();
    if (
      bucket === RECORDINGS_BUCKET_NAME ||
      bucket === (process.env.R2_BUCKET ?? '').trim()
    ) {
      return `HOMEWORK_R2_BUCKET ("${bucket}") is the class-recordings bucket — homework needs a bucket of its own`;
    }
    return null;
  }

  isConfigured(): boolean {
    return this.configurationProblem() === null;
  }

  bucket(): string {
    return (process.env.HOMEWORK_R2_BUCKET ?? '').trim();
  }

  private accountId(): string {
    return (
      process.env.HOMEWORK_R2_ACCOUNT_ID ||
      process.env.R2_ACCOUNT_ID ||
      ''
    ).trim();
  }

  endpoint(): string {
    const custom = process.env.HOMEWORK_R2_ENDPOINT?.trim();
    if (custom) return custom.replace(/\/+$/, '');
    return `https://${this.accountId()}.r2.cloudflarestorage.com`;
  }

  /** `homework/<course>/<student>/<file id>/<name>` — the id makes it unique, so
   * two uploads of "main.py" can never replace each other. */
  objectKeyFor(parts: {
    courseId: string;
    studentUserId: string;
    fileId: string;
    fileName: string;
  }): string {
    const seg = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, '_');
    const name = safeFileName(parts.fileName).replace(/[^A-Za-z0-9._-]/g, '_');
    return `homework/${seg(parts.courseId)}/${seg(parts.studentUserId)}/${seg(parts.fileId)}/${name}`;
  }

  private s3(): S3Client {
    const problem = this.configurationProblem();
    if (problem)
      throw new HomeworkStorageError(
        `Homework storage is not configured: ${problem}.`,
        'NotConfigured',
      );
    const signature = [
      this.endpoint(),
      process.env.HOMEWORK_R2_ACCESS_KEY_ID,
      process.env.HOMEWORK_R2_SECRET_ACCESS_KEY,
    ].join('|');
    if (!this.client || this.clientFor !== signature) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.endpoint(),
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.HOMEWORK_R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.HOMEWORK_R2_SECRET_ACCESS_KEY!,
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
    try {
      await this.s3().send(
        new PutObjectCommand({
          Bucket: this.bucket(),
          Key: key,
          Body: body,
          ContentType: contentType,
          ContentLength: body.length,
        }),
      );
    } catch (err) {
      throw toStorageError(err);
    }
  }

  async headObject(key: string): Promise<StoredHomeworkObject | null> {
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

  async getObject(key: string): Promise<Buffer> {
    try {
      const res = await this.s3().send(
        new GetObjectCommand({ Bucket: this.bucket(), Key: key }),
      );
      if (!res.Body)
        throw new HomeworkStorageError('R2 returned an empty body.');
      return Buffer.from(await res.Body.transformToByteArray());
    } catch (err) {
      throw toStorageError(err);
    }
  }

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

  /** A link good for a few minutes. The browser is told how to treat the file
   * (`inline` to show a PDF or image, `attachment` to download) and what it is —
   * both decided here, from our own record of the file, never by the file. */
  async createViewUrl(
    key: string,
    opts: {
      fileName: string;
      contentType: string;
      disposition: 'inline' | 'attachment';
    },
  ): Promise<{ url: string; expiresAt: Date }> {
    const url = await getSignedUrl(
      this.s3(),
      new GetObjectCommand({
        Bucket: this.bucket(),
        Key: key,
        ResponseContentType: opts.contentType,
        ResponseContentDisposition: contentDisposition(
          opts.disposition,
          opts.fileName,
        ),
      }),
      { expiresIn: HOMEWORK_VIEW_URL_TTL_SECONDS },
    );
    return {
      url,
      expiresAt: new Date(Date.now() + HOMEWORK_VIEW_URL_TTL_SECONDS * 1000),
    };
  }

  // ─── Start-up diagnostics ────────────────────────────────────────────────

  /** Says in the log, once at boot, whether homework files can be stored. Never
   * delays or fails start-up. */
  onModuleInit(): void {
    const problem = this.configurationProblem();
    if (problem) {
      this.logger.warn(
        `Homework file storage (Cloudflare R2) is not available — ${problem}. ` +
          'Students can still submit links, but cannot upload files.',
      );
      return;
    }
    void this.checkConnection();
  }

  /** Asks R2 about a file that should not exist: "not found" proves the credentials,
   * endpoint and bucket are right. Logged, never thrown. */
  async checkConnection(): Promise<boolean> {
    try {
      await this.headObject('homework/.lumexa-healthcheck');
      this.logger.log(
        `Homework storage is ready: bucket "${this.bucket()}" on ${this.endpoint()}.`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Homework storage check failed for bucket "${this.bucket()}" on ${this.endpoint()}: ${describeStorageError(err)}. ` +
          'File uploads will fail until the HOMEWORK_R2_* settings are corrected.',
      );
      return false;
    }
  }
}

/** `inline; filename="a.pdf"; filename*=UTF-8''a.pdf` */
export function contentDisposition(
  disposition: 'inline' | 'attachment',
  fileName: string,
): string {
  const encoded = encodeURIComponent(safeFileName(fileName)).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${disposition}; filename="${asciiFileName(fileName)}"; filename*=UTF-8''${encoded}`;
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

function toStorageError(err: unknown): HomeworkStorageError {
  if (err instanceof HomeworkStorageError) return err;
  const e = err as AwsLikeError;
  return new HomeworkStorageError(
    e?.message ?? String(err),
    e?.Code ?? e?.name,
    e?.$metadata?.httpStatusCode,
  );
}

/** A one-line account of a storage failure for the log (never shown to users). */
export function describeStorageError(err: unknown): string {
  const e = toStorageError(err);
  return (
    [e.code, e.status ? `HTTP ${e.status}` : undefined, e.message]
      .filter(Boolean)
      .join(' — ') || 'unknown error'
  );
}

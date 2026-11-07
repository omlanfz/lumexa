// FILE PATH: server/src/certificates/certificate-storage.service.ts
//
// Issued certificates (a PDF and a PNG each) live in their OWN private Cloudflare
// R2 bucket, `lumexa-certificates`, reached through R2's S3-compatible API. This
// is the only file that talks to it.
//
// ─── Permanent retention ────────────────────────────────────────────────────
// No issued certificate file is ever deleted or replaced, so this service HAS NO
// DELETE METHOD and no overwriting write:
//   • there is no deleteObject, no lifecycle/cleanup job, no admin endpoint that
//     reaches storage for removal (certificate-retention.spec.ts keeps it so);
//   • the only write is putObjectOnce, which sends `If-None-Match: *` so R2
//     itself refuses to replace an object that exists (HTTP 412);
//   • every key contains the certificate's unique ID, so no two issuances — and
//     no replacement — can ever share one.
// The bucket should also carry an indefinite Bucket Lock rule: R2 then refuses
// deletion and overwriting no matter what any code or credential does (R2 has no
// "write but never delete" token level, so the lock — not the token — is the real
// guarantee). docs/CERTIFICATES_SETUP.md has the exact steps.
//
// Separate from `lumexa-recordings` (classroom/recording-storage.service.ts),
// homework and chat: its own bucket, its own token, its own CERTIFICATE_R2_*
// settings. Nothing here reads those features' settings, and a certificate
// bucket that turns out to be one of their buckets is refused outright.
//
// Configuration (see server/.env.example and docs/CERTIFICATES_SETUP.md):
//   CERTIFICATE_R2_BUCKET             default "lumexa-certificates"
//   CERTIFICATE_R2_ACCESS_KEY_ID      R2 API token for THAT bucket only
//   CERTIFICATE_R2_SECRET_ACCESS_KEY  … Secret Access Key
//   CERTIFICATE_R2_ACCOUNT_ID         Cloudflare account id (falls back to
//                                     R2_ACCOUNT_ID — an id, not a secret)
//   CERTIFICATE_R2_ENDPOINT           optional full S3 endpoint (EU jurisdiction,
//                                     or a local S3-compatible server in tests)

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { utcToDhakaParts } from '../scheduling/dhaka-time.util';

/** The bucket's name: what the spec calls for. */
export const DEFAULT_CERTIFICATE_BUCKET = 'lumexa-certificates';

/** Other features' buckets a certificate bucket must never be configured onto. */
const OTHER_BUCKET_NAMES = ['lumexa-recordings'];

/** R2 refused or could not be reached. `status` is the HTTP status when there was one. */
export class CertificateStorageError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'CertificateStorageError';
  }
}

/** The key already holds an object. The write was refused; nothing was changed. */
export class CertificateObjectExistsError extends CertificateStorageError {
  constructor(key: string) {
    super(
      `A certificate file already exists at "${key}" and is never overwritten.`,
      'ObjectExists',
      412,
    );
    this.name = 'CertificateObjectExistsError';
  }
}

export interface CertificateObjectKeys {
  pdfKey: string;
  pngKey: string;
}

export interface StoredCertificateObject {
  sizeBytes: number;
}

/** What the certificate storage does — the part the rest of the app depends on,
 * so tests can stand in an in-memory version (testing/memory-certificate-storage.ts).
 * Note what is NOT here: delete, and any write that can replace an object. */
export interface CertificateStorage {
  isConfigured(): boolean;
  /** Why it cannot be used, or null. */
  configurationProblem(): string | null;
  bucket(): string;
  /** `certificates/<year>/<id>/<id>.pdf` and `.png` — unique because the ID is. */
  objectKeysFor(parts: {
    certificateId: string;
    issuedAt: Date;
  }): CertificateObjectKeys;
  /** Stores a NEW object. Throws CertificateObjectExistsError instead of replacing. */
  putObjectOnce(key: string, body: Buffer, contentType: string): Promise<void>;
  /** The size of what is stored under `key`, or null when nothing is. */
  headObject(key: string): Promise<StoredCertificateObject | null>;
  getObject(key: string): Promise<Buffer>;
}

/** Injection token: the certificate services depend on the interface, not on R2. */
export const CERTIFICATE_STORAGE = Symbol('CERTIFICATE_STORAGE');

@Injectable()
export class CertificateStorageService
  implements CertificateStorage, OnModuleInit
{
  private readonly logger = new Logger(CertificateStorageService.name);
  private client: S3Client | null = null;
  private clientFor = '';

  // ─── Configuration ───────────────────────────────────────────────────────

  /** Names of the settings that are missing ([] when all are set). */
  missingEnvVars(): string[] {
    const missing: string[] = [];
    if (!process.env.CERTIFICATE_R2_ENDPOINT && !this.accountId())
      missing.push('CERTIFICATE_R2_ACCOUNT_ID');
    if (!process.env.CERTIFICATE_R2_ACCESS_KEY_ID)
      missing.push('CERTIFICATE_R2_ACCESS_KEY_ID');
    if (!process.env.CERTIFICATE_R2_SECRET_ACCESS_KEY)
      missing.push('CERTIFICATE_R2_SECRET_ACCESS_KEY');
    return missing;
  }

  /** Why certificate storage cannot be used, or null when it can. */
  configurationProblem(): string | null {
    const missing = this.missingEnvVars();
    if (missing.length > 0) return `missing ${missing.join(', ')}`;
    const bucket = this.bucket();
    const others = [
      ...OTHER_BUCKET_NAMES,
      (process.env.R2_BUCKET ?? '').trim(),
      (process.env.HOMEWORK_R2_BUCKET ?? '').trim(),
      (process.env.CHAT_R2_BUCKET ?? '').trim(),
    ].filter(Boolean);
    if (others.includes(bucket)) {
      return `CERTIFICATE_R2_BUCKET ("${bucket}") is another feature's bucket — certificates need a bucket of their own`;
    }
    return null;
  }

  isConfigured(): boolean {
    return this.configurationProblem() === null;
  }

  bucket(): string {
    return (
      process.env.CERTIFICATE_R2_BUCKET?.trim() || DEFAULT_CERTIFICATE_BUCKET
    );
  }

  private accountId(): string {
    return (
      process.env.CERTIFICATE_R2_ACCOUNT_ID ||
      process.env.R2_ACCOUNT_ID ||
      ''
    ).trim();
  }

  endpoint(): string {
    const custom = process.env.CERTIFICATE_R2_ENDPOINT?.trim();
    if (custom) return custom.replace(/\/+$/, '');
    return `https://${this.accountId()}.r2.cloudflarestorage.com`;
  }

  /** `certificates/<issue year>/<certificate id>/<certificate id>.pdf|png` — the
   * certificate ID is unique (database constraint), so the key is too: one
   * issuance, one replacement, one pair of files, never shared, never rewritten. */
  objectKeysFor(parts: {
    certificateId: string;
    issuedAt: Date;
  }): CertificateObjectKeys {
    const id = parts.certificateId.replace(/[^A-Za-z0-9-]/g, '_');
    const year = utcToDhakaParts(parts.issuedAt).dateStr.slice(0, 4);
    const base = `certificates/${year}/${id}/${id}`;
    return { pdfKey: `${base}.pdf`, pngKey: `${base}.png` };
  }

  private s3(): S3Client {
    const problem = this.configurationProblem();
    if (problem)
      throw new CertificateStorageError(
        `Certificate storage is not configured: ${problem}.`,
        'NotConfigured',
      );
    const signature = [
      this.endpoint(),
      process.env.CERTIFICATE_R2_ACCESS_KEY_ID,
      process.env.CERTIFICATE_R2_SECRET_ACCESS_KEY,
    ].join('|');
    if (!this.client || this.clientFor !== signature) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.endpoint(),
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.CERTIFICATE_R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.CERTIFICATE_R2_SECRET_ACCESS_KEY!,
        },
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
      this.clientFor = signature;
    }
    return this.client;
  }

  // ─── Requests to R2 ──────────────────────────────────────────────────────

  async putObjectOnce(
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
          // R2 evaluates this atomically against what is committed: if anything
          // is stored under the key, the write fails with 412 and changes nothing.
          IfNoneMatch: '*',
        }),
      );
    } catch (err) {
      // 412 PreconditionFailed: the object exists. 409 ObjectLockedByBucketPolicy:
      // the bucket lock refused an overwrite (R2 checks the lock first).
      if (isPreconditionFailed(err) || isLocked(err))
        throw new CertificateObjectExistsError(key);
      throw toStorageError(err);
    }
  }

  async headObject(key: string): Promise<StoredCertificateObject | null> {
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
        throw new CertificateStorageError('R2 returned an empty body.');
      return Buffer.from(await res.Body.transformToByteArray());
    } catch (err) {
      throw toStorageError(err);
    }
  }

  // ─── Start-up diagnostics ────────────────────────────────────────────────

  /** Says in the log, once at boot, whether certificates can be stored. Never
   * delays or fails start-up. */
  onModuleInit(): void {
    const problem = this.configurationProblem();
    if (problem) {
      this.logger.warn(
        `Certificate storage (Cloudflare R2) is not available — ${problem}. ` +
          'Certificates cannot be issued until the CERTIFICATE_R2_* settings are complete.',
      );
      return;
    }
    void this.checkConnection();
  }

  /** Asks R2 about a file that should not exist: "not found" proves the credentials,
   * endpoint and bucket are right. Logged, never thrown. */
  async checkConnection(): Promise<boolean> {
    try {
      await this.headObject('certificates/.lumexa-healthcheck');
      this.logger.log(
        `Certificate storage is ready: bucket "${this.bucket()}" on ${this.endpoint()}.`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Certificate storage check failed for bucket "${this.bucket()}" on ${this.endpoint()}: ${describeStorageError(err)}. ` +
          'Certificates cannot be issued until the CERTIFICATE_R2_* settings are corrected.',
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

function isPreconditionFailed(err: unknown): boolean {
  const e = err as AwsLikeError;
  return (
    e?.$metadata?.httpStatusCode === 412 ||
    e?.name === 'PreconditionFailed' ||
    e?.Code === 'PreconditionFailed'
  );
}

function isLocked(err: unknown): boolean {
  const e = err as AwsLikeError;
  return (
    e?.name === 'ObjectLockedByBucketPolicy' ||
    e?.Code === 'ObjectLockedByBucketPolicy'
  );
}

function toStorageError(err: unknown): CertificateStorageError {
  if (err instanceof CertificateStorageError) return err;
  const e = err as AwsLikeError;
  return new CertificateStorageError(
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

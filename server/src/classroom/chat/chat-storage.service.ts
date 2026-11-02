// FILE PATH: server/src/classroom/chat/chat-storage.service.ts
//
// The classroom chat's history lives in its OWN private Cloudflare R2 bucket,
// reached through R2's S3-compatible API. This is the only file that talks to it.
//
// Like homework (submissions/homework-storage.service.ts) it is deliberately
// separate from every other bucket: its own bucket, its own API token, its own
// CHAT_R2_* settings. Nothing here reads the recordings' or homework's key, secret
// or bucket, and a chat bucket that turns out to be one of those is refused
// outright (see configurationProblem) — so chat can never end up beside, or be
// cleaned up together with, recordings or homework.
//
// Nothing in the browser ever holds R2 credentials: browsers talk to THIS server
// (see chat.controller.ts), which stores and reads the objects.
//
// Configuration (see server/.env.example and docs/CLASSROOM_CHAT_SETUP.md):
//   CHAT_R2_BUCKET             the private chat bucket
//   CHAT_R2_ACCESS_KEY_ID      R2 API token for THAT bucket only — Access Key ID
//   CHAT_R2_SECRET_ACCESS_KEY  … Secret Access Key
//   CHAT_R2_ACCOUNT_ID         Cloudflare account id (falls back to R2_ACCOUNT_ID —
//                              an id, not a secret — when it is the same account)
//   CHAT_R2_ENDPOINT           optional full S3 endpoint (EU jurisdiction, or a
//                              local S3-compatible server in tests)

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/** Bucket names chat must never be configured onto. */
const OTHER_BUCKET_NAMES = ['lumexa-recordings', 'lumexa-homework'];

/** R2 refused or could not be reached. `status` is the HTTP status when there was one. */
export class ChatStorageError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ChatStorageError';
  }
}

/** What the chat storage does — the part the rest of the app depends on, so
 * tests can stand in an in-memory version (testing/memory-chat-storage.ts). */
export interface ChatStorage {
  isConfigured(): boolean;
  /** Why it cannot be used, or null. */
  configurationProblem(): string | null;
  /** The text stored under `key`, or null when nothing is. */
  getText(key: string): Promise<string | null>;
  putText(key: string, body: string): Promise<void>;
  /** Every key that starts with `prefix` (all pages of R2's listing). */
  listKeys(prefix: string): Promise<string[]>;
  /** Removes the object; a no-op when there is none. Throws when R2 could not be asked. */
  deleteObject(key: string): Promise<void>;
}

/** Injection token: the chat service depends on the interface, not on R2. */
export const CHAT_STORAGE = Symbol('CHAT_STORAGE');

@Injectable()
export class ChatStorageService implements ChatStorage, OnModuleInit {
  private readonly logger = new Logger(ChatStorageService.name);
  private client: S3Client | null = null;
  private clientFor = '';

  // ─── Configuration ───────────────────────────────────────────────────────

  /** Names of the settings that are missing ([] when all are set). */
  missingEnvVars(): string[] {
    const missing: string[] = [];
    if (!process.env.CHAT_R2_ENDPOINT && !this.accountId())
      missing.push('CHAT_R2_ACCOUNT_ID');
    if (!process.env.CHAT_R2_ACCESS_KEY_ID)
      missing.push('CHAT_R2_ACCESS_KEY_ID');
    if (!process.env.CHAT_R2_SECRET_ACCESS_KEY)
      missing.push('CHAT_R2_SECRET_ACCESS_KEY');
    if (!process.env.CHAT_R2_BUCKET) missing.push('CHAT_R2_BUCKET');
    return missing;
  }

  /** Why chat storage cannot be used, or null when it can. */
  configurationProblem(): string | null {
    const missing = this.missingEnvVars();
    if (missing.length > 0) return `missing ${missing.join(', ')}`;
    const bucket = this.bucket();
    const others = [
      ...OTHER_BUCKET_NAMES,
      (process.env.R2_BUCKET ?? '').trim(),
      (process.env.HOMEWORK_R2_BUCKET ?? '').trim(),
    ].filter(Boolean);
    if (others.includes(bucket)) {
      return `CHAT_R2_BUCKET ("${bucket}") is the recordings or homework bucket — chat needs a bucket of its own`;
    }
    return null;
  }

  isConfigured(): boolean {
    return this.configurationProblem() === null;
  }

  bucket(): string {
    return (process.env.CHAT_R2_BUCKET ?? '').trim();
  }

  private accountId(): string {
    return (
      process.env.CHAT_R2_ACCOUNT_ID ||
      process.env.R2_ACCOUNT_ID ||
      ''
    ).trim();
  }

  endpoint(): string {
    const custom = process.env.CHAT_R2_ENDPOINT?.trim();
    if (custom) return custom.replace(/\/+$/, '');
    return `https://${this.accountId()}.r2.cloudflarestorage.com`;
  }

  private s3(): S3Client {
    const problem = this.configurationProblem();
    if (problem)
      throw new ChatStorageError(
        `Chat storage is not configured: ${problem}.`,
        'NotConfigured',
      );
    const signature = [
      this.endpoint(),
      process.env.CHAT_R2_ACCESS_KEY_ID,
      process.env.CHAT_R2_SECRET_ACCESS_KEY,
    ].join('|');
    if (!this.client || this.clientFor !== signature) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.endpoint(),
        // `<bucket>.<account>.r2…` needs a certificate per bucket name; the
        // path form always works.
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.CHAT_R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.CHAT_R2_SECRET_ACCESS_KEY!,
        },
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
      this.clientFor = signature;
    }
    return this.client;
  }

  // ─── Requests to R2 ──────────────────────────────────────────────────────

  async getText(key: string): Promise<string | null> {
    try {
      const res = await this.s3().send(
        new GetObjectCommand({ Bucket: this.bucket(), Key: key }),
      );
      if (!res.Body) return '';
      return await res.Body.transformToString('utf-8');
    } catch (err) {
      if (isNotFound(err)) return null;
      throw toStorageError(err);
    }
  }

  async putText(key: string, body: string): Promise<void> {
    const bytes = Buffer.from(body, 'utf-8');
    try {
      await this.s3().send(
        new PutObjectCommand({
          Bucket: this.bucket(),
          Key: key,
          Body: bytes,
          ContentType: 'application/json; charset=utf-8',
          ContentLength: bytes.length,
        }),
      );
    } catch (err) {
      throw toStorageError(err);
    }
  }

  async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let token: string | undefined;
    try {
      do {
        const res = await this.s3().send(
          new ListObjectsV2Command({
            Bucket: this.bucket(),
            Prefix: prefix,
            ContinuationToken: token,
          }),
        );
        for (const object of res.Contents ?? []) {
          if (object.Key) keys.push(object.Key);
        }
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (token);
    } catch (err) {
      throw toStorageError(err);
    }
    return keys;
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

  // ─── Start-up diagnostics ────────────────────────────────────────────────

  /** Says in the log, once at boot, whether chat history can be stored. Never
   * delays or fails start-up. */
  onModuleInit(): void {
    const problem = this.configurationProblem();
    if (problem) {
      this.logger.warn(
        `Classroom chat history (Cloudflare R2) is not available — ${problem}. ` +
          'Chat still works live, but nothing is saved or shown again later.',
      );
      return;
    }
    void this.checkConnection();
  }

  /** Asks R2 about a file that should not exist: "not found" proves the
   * credentials, endpoint and bucket are right. Logged, never thrown. */
  async checkConnection(): Promise<boolean> {
    try {
      await this.s3().send(
        new HeadObjectCommand({
          Bucket: this.bucket(),
          Key: 'chat/.lumexa-healthcheck',
        }),
      );
      return true;
    } catch (err) {
      if (isNotFound(err)) {
        this.logger.log(
          `Chat storage is ready: bucket "${this.bucket()}" on ${this.endpoint()}.`,
        );
        return true;
      }
      this.logger.error(
        `Chat storage check failed for bucket "${this.bucket()}" on ${this.endpoint()}: ${describeStorageError(err)}. ` +
          'Chat history will not be saved until the CHAT_R2_* settings are corrected.',
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

function toStorageError(err: unknown): ChatStorageError {
  if (err instanceof ChatStorageError) return err;
  const e = err as AwsLikeError;
  return new ChatStorageError(
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

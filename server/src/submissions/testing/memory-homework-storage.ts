// FILE PATH: server/src/submissions/testing/memory-homework-storage.ts
//
// An in-memory stand-in for the homework R2 bucket, for tests: the same contract
// as HomeworkStorageService, with switches to make a request fail so the failure
// paths (an upload that breaks, a deletion R2 refuses) can be exercised.

import {
  HomeworkStorage,
  HomeworkStorageError,
  StoredHomeworkObject,
  contentDisposition,
} from '../homework-storage.service';

export class MemoryHomeworkStorage implements HomeworkStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();
  configured = true;
  /** Keys whose upload is made to fail (or every upload, with '*'). */
  failPut = new Set<string>();
  /** When true, every deletion fails (R2 unreachable). */
  failDelete = false;
  deleted: string[] = [];

  isConfigured() {
    return this.configured;
  }
  configurationProblem() {
    return this.configured ? null : 'missing HOMEWORK_R2_BUCKET';
  }
  objectKeyFor(p: {
    courseId: string;
    studentUserId: string;
    fileId: string;
    fileName: string;
  }) {
    return `homework/${p.courseId}/${p.studentUserId}/${p.fileId}/${p.fileName}`;
  }
  async putObject(key: string, body: Buffer, contentType: string) {
    if (
      this.failPut.has('*') ||
      [...this.failPut].some((k) => key.includes(k))
    ) {
      throw new HomeworkStorageError('upload refused', 'InternalError', 500);
    }
    this.objects.set(key, { body, contentType });
  }
  async headObject(key: string): Promise<StoredHomeworkObject | null> {
    const o = this.objects.get(key);
    return o ? { sizeBytes: o.body.length } : null;
  }
  async getObject(key: string) {
    const o = this.objects.get(key);
    if (!o) throw new HomeworkStorageError('no such key', 'NoSuchKey', 404);
    return o.body;
  }
  async deleteObject(key: string) {
    if (this.failDelete)
      throw new HomeworkStorageError('R2 unreachable', 'InternalError', 503);
    this.objects.delete(key);
    this.deleted.push(key);
  }
  async createViewUrl(
    key: string,
    opts: {
      fileName: string;
      contentType: string;
      disposition: 'inline' | 'attachment';
    },
  ) {
    return {
      url: `https://r2.test/${key}?type=${encodeURIComponent(opts.contentType)}&cd=${encodeURIComponent(
        contentDisposition(opts.disposition, opts.fileName),
      )}`,
      expiresAt: new Date(Date.now() + 5 * 60_000),
    };
  }
}

// FILE PATH: server/src/classroom/testing/memory-recording-storage.ts
//
// R2, in memory, for the specs: the real RecordingStorageService (so the URLs it
// signs are real, with fake credentials) with the two calls that would leave the
// process — checking a file and deleting it — replaced by a Map. `put` plays the
// part of the browser's finished upload.

import {
  RecordingStorageError,
  RecordingStorageService,
} from '../recording-storage.service';
import type { StoredObject } from '../recording-storage.service';

export const TEST_R2_ENV = {
  R2_ACCOUNT_ID: 'acct123',
  R2_ACCESS_KEY_ID: 'AKIATESTKEY',
  R2_SECRET_ACCESS_KEY: 'a-test-secret-key',
  R2_BUCKET: 'lumexa-recordings',
};

export class MemoryRecordingStorage extends RecordingStorageService {
  objects = new Map<string, StoredObject>();
  deleted: string[] = [];
  /** Makes every request to "R2" fail, as if it were unreachable. */
  down = false;

  override headObject(key: string): Promise<StoredObject | null> {
    if (this.down) {
      return Promise.reject(
        new RecordingStorageError('R2 is down', 'InternalError', 500),
      );
    }
    return Promise.resolve(this.objects.get(key) ?? null);
  }

  override deleteObject(key: string): Promise<void> {
    this.deleted.push(key);
    this.objects.delete(key);
    return Promise.resolve();
  }

  /** What storage holds once the browser's upload has finished. */
  put(
    key: string,
    sizeBytes: number,
    contentType: string | null = 'video/webm',
  ): void {
    this.objects.set(key, { sizeBytes, contentType });
  }
}

// An in-memory stand-in for the lesson-video bucket, for tests.

import type { LessonVideoStorage } from '../lesson-video-storage.service';
import { isLessonVideoKey } from '../video-keys';

export class MemoryLessonVideoStorage implements LessonVideoStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();
  /** Every key written, in order — to prove an upload stored (or did not store) something. */
  readonly writes: string[] = [];
  problem: string | null = null;
  /** Make the next urlFor() fail, as a storage outage would. */
  failUrls = false;

  configurationProblem(): string | null {
    return this.problem;
  }

  isConfigured(): boolean {
    return this.problem === null;
  }

  describe(): { bucket: string; delivery: 'signed' | 'public' } | null {
    return this.problem === null
      ? { bucket: 'memory', delivery: 'signed' }
      : null;
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    if (!isLessonVideoKey(key))
      throw new Error(`not a lesson video key: ${key}`);
    this.objects.set(key, { body, contentType });
    this.writes.push(key);
  }

  async headObject(key: string): Promise<{ sizeBytes: number } | null> {
    const o = this.objects.get(key);
    return o ? { sizeBytes: o.body.length } : null;
  }

  async urlFor(key: string): Promise<string> {
    if (this.failUrls) throw new Error('storage is down');
    if (!isLessonVideoKey(key))
      throw new Error(`not a lesson video key: ${key}`);
    return `https://videos.test/${key}?sig=test`;
  }
}

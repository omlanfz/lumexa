// FILE PATH: server/src/classroom/chat/testing/memory-chat-storage.ts
//
// The chat bucket, in memory, for the specs.

import { ChatStorageError } from '../chat-storage.service';
import type { ChatStorage } from '../chat-storage.service';

export class MemoryChatStorage implements ChatStorage {
  objects = new Map<string, string>();
  configured = true;
  /** Makes every request fail, as if R2 were unreachable. */
  down = false;

  isConfigured(): boolean {
    return this.configured;
  }

  configurationProblem(): string | null {
    return this.configured ? null : 'missing CHAT_R2_BUCKET';
  }

  private check(): void {
    if (this.down)
      throw new ChatStorageError('R2 is down', 'InternalError', 500);
  }

  getText(key: string): Promise<string | null> {
    try {
      this.check();
    } catch (err) {
      return Promise.reject(err as Error);
    }
    return Promise.resolve(this.objects.get(key) ?? null);
  }

  putText(key: string, body: string): Promise<void> {
    try {
      this.check();
    } catch (err) {
      return Promise.reject(err as Error);
    }
    this.objects.set(key, body);
    return Promise.resolve();
  }

  listKeys(prefix: string): Promise<string[]> {
    try {
      this.check();
    } catch (err) {
      return Promise.reject(err as Error);
    }
    return Promise.resolve(
      [...this.objects.keys()].filter((k) => k.startsWith(prefix)).sort(),
    );
  }

  deleteObject(key: string): Promise<void> {
    try {
      this.check();
    } catch (err) {
      return Promise.reject(err as Error);
    }
    this.objects.delete(key);
    return Promise.resolve();
  }
}

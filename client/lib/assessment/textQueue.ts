// FILE PATH: client/lib/assessment/textQueue.ts
//
// Reliable autosave for the WRITTEN parts of a structured assessment (Part B answers). It follows the
// same rules as the answer queue of the multiple-choice questions (answerQueue.ts), with a short pause
// before sending because a student types a lot more often than they click:
//
//   * a save waits until the student pauses typing (`debounceMs`), so one answer is not sent per key;
//   * ONE request per answer is in flight at a time, and a newer text waits for it — requests for the
//     same answer can never arrive out of order, so the server always ends with the LAST text;
//   * a failed save is retried with exponential backoff until it works (the UI says "not saved yet");
//   * a "fatal" failure (the test is already handed in) stops retrying;
//   * `flushNow()` skips the pause — the hand-in uses it so nothing waits on a timer.
//
// Pure TypeScript, no React/DOM, so it is unit-tested with Node's test runner. (No TS parameter
// properties: this file is also run by Node's type-stripping test runner.)

export type TextSaveState = 'saving' | 'saved' | 'error';

export interface TextQueueSnapshot {
  states: Record<string, TextSaveState>;
  /** Answers whose latest text has not reached the server yet. */
  unsaved: number;
  /** At least one answer is currently failing to save. */
  hasError: boolean;
  /** The server refused further saves (the test is already handed in). */
  fatal: boolean;
}

export interface TextQueueOptions {
  send: (key: string, text: string) => Promise<void>;
  onChange?: (snapshot: TextQueueSnapshot) => void;
  /** True when retrying can never succeed (e.g. HTTP 409). */
  isFatal?: (err: unknown) => boolean;
  /** How long the student must stop typing before the text is sent. */
  debounceMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Injected in tests. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

interface Entry {
  desired: string;
  /** The text the server confirmed; undefined = never confirmed. */
  confirmed: string | undefined;
  inflight: boolean;
  attempts: number;
  /** Either the typing pause or the retry delay. */
  timer: unknown;
  state: TextSaveState;
}

export class TextSaveQueue {
  private readonly entries = new Map<string, Entry>();
  private fatal = false;
  private disposed = false;
  private readonly opts: TextQueueOptions;
  private readonly debounce: number;
  private readonly base: number;
  private readonly max: number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;

  constructor(opts: TextQueueOptions) {
    this.opts = opts;
    this.debounce = opts.debounceMs ?? 900;
    this.base = opts.baseDelayMs ?? 1000;
    this.max = opts.maxDelayMs ?? 12_000;
    this.setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  }

  /** Tell the queue what the server already has (so it is not sent again). */
  hydrate(key: string, serverText: string) {
    this.entries.set(key, { desired: serverText, confirmed: serverText, inflight: false, attempts: 0, timer: null, state: 'saved' });
  }

  /** The student typed: send `text` once they pause. */
  enqueue(key: string, text: string) {
    if (this.disposed) return;
    let e = this.entries.get(key);
    if (!e) {
      e = { desired: text, confirmed: undefined, inflight: false, attempts: 0, timer: null, state: 'saving' };
      this.entries.set(key, e);
    }
    e.desired = text;
    this.clear(e);
    if (e.confirmed === text && !e.inflight) {
      e.state = 'saved';
      this.emit();
      return;
    }
    e.state = 'saving';
    this.emit();
    if (e.inflight) return; // the newer text is sent right after the one in flight
    e.timer = this.setTimer(() => {
      e!.timer = null;
      this.pump(key);
    }, this.debounce);
  }

  /** Send every waiting text now, without the typing pause. */
  flushNow() {
    for (const [key, e] of this.entries) {
      if (e.confirmed === e.desired || e.inflight) continue;
      this.clear(e);
      this.pump(key);
    }
  }

  /** Retry every failed answer right now (e.g. the connection came back). */
  retryNow() {
    for (const [key, e] of this.entries) {
      if (e.state === 'error' && !e.inflight) {
        this.clear(e);
        this.pump(key);
      }
    }
  }

  snapshot(): TextQueueSnapshot {
    const states: Record<string, TextSaveState> = {};
    let unsaved = 0;
    let hasError = false;
    for (const [key, e] of this.entries) {
      states[key] = e.state;
      if (e.state !== 'saved') unsaved++;
      if (e.state === 'error') hasError = true;
    }
    return { states, unsaved, hasError, fatal: this.fatal };
  }

  dispose() {
    this.disposed = true;
    for (const e of this.entries.values()) this.clear(e);
  }

  private clear(e: Entry) {
    if (e.timer !== null) {
      this.clearTimer(e.timer);
      e.timer = null;
    }
  }

  private pump(key: string) {
    const e = this.entries.get(key);
    if (!e || e.inflight || this.fatal || this.disposed) return;
    if (e.confirmed === e.desired) {
      e.state = 'saved';
      this.emit();
      return;
    }
    e.inflight = true;
    const value = e.desired;
    this.opts
      .send(key, value)
      .then(() => {
        e.inflight = false;
        e.confirmed = value;
        e.attempts = 0;
        if (e.desired !== value) {
          e.state = 'saving';
          this.emit();
          this.pump(key); // the student kept typing meanwhile
        } else {
          e.state = 'saved';
          this.emit();
        }
      })
      .catch((err: unknown) => {
        e.inflight = false;
        if (this.opts.isFatal?.(err)) {
          this.fatal = true;
          e.state = 'error';
          this.emit();
          return;
        }
        e.attempts++;
        e.state = 'error';
        this.emit();
        if (this.disposed) return;
        const delay = Math.min(this.max, this.base * 2 ** Math.min(e.attempts - 1, 8));
        e.timer = this.setTimer(() => {
          e.timer = null;
          this.pump(key);
        }, delay);
      });
  }

  private emit() {
    this.opts.onChange?.(this.snapshot());
  }
}

// FILE PATH: client/lib/assessment/answerQueue.ts
//
// Reliable autosave for a test's answers. Every click is sent to the server,
// but a network blip must never lose or reorder an answer:
//
//   * ONE request per question is in flight at a time. If the student changes
//     their mind while it is in flight, the newer choice waits and is sent
//     right after — requests for the same question can never arrive out of
//     order, so the server always ends with the student's LAST choice.
//   * A failed save is retried with exponential backoff, forever (until the
//     test is submitted), and the UI is told so it can say "not saved yet".
//   * A "fatal" failure (the server says the test is already submitted) stops
//     retrying — there is nothing left to save.
//
// Pure TypeScript, no React/DOM, so it is unit-tested with Node's test runner.

export type SaveState = 'saving' | 'saved' | 'error';

export interface QueueSnapshot {
  states: Record<string, SaveState>;
  /** Questions whose latest choice has not reached the server yet. */
  unsaved: number;
  /** At least one question is currently failing to save. */
  hasError: boolean;
  /** The server refused further saves (test already submitted). */
  fatal: boolean;
}

export interface AnswerQueueOptions {
  send: (questionId: string, selectedIndex: number | null) => Promise<void>;
  onChange?: (snapshot: QueueSnapshot) => void;
  /** True when retrying can never succeed (e.g. HTTP 409). */
  isFatal?: (err: unknown) => boolean;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Injected in tests. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

interface Entry {
  desired: number | null;
  /** Last value the server confirmed; undefined = never confirmed. */
  confirmed: number | null | undefined;
  inflight: boolean;
  attempts: number;
  timer: unknown;
  state: SaveState;
}

export class AnswerQueue {
  private readonly entries = new Map<string, Entry>();
  private fatal = false;
  private disposed = false;
  private readonly opts: AnswerQueueOptions;
  private readonly base: number;
  private readonly max: number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;

  // (No TS parameter properties: this file is also run directly by Node's
  // type-stripping test runner, which only supports erasable syntax.)
  constructor(opts: AnswerQueueOptions) {
    this.opts = opts;
    this.base = opts.baseDelayMs ?? 600;
    this.max = opts.maxDelayMs ?? 10_000;
    this.setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  }

  /** Tell the queue what the server already has (so it is not re-sent). */
  hydrate(questionId: string, serverValue: number | null) {
    this.entries.set(questionId, {
      desired: serverValue,
      confirmed: serverValue,
      inflight: false,
      attempts: 0,
      timer: null,
      state: 'saved',
    });
  }

  /** The student chose (or cleared) an answer. */
  enqueue(questionId: string, selectedIndex: number | null) {
    if (this.disposed) return;
    let e = this.entries.get(questionId);
    if (!e) {
      e = { desired: selectedIndex, confirmed: undefined, inflight: false, attempts: 0, timer: null, state: 'saving' };
      this.entries.set(questionId, e);
    }
    e.desired = selectedIndex;
    if (e.timer !== null) {
      this.clearTimer(e.timer);
      e.timer = null;
    }
    if (e.confirmed === selectedIndex && !e.inflight) {
      e.state = 'saved';
      this.emit();
      return;
    }
    e.state = 'saving';
    this.emit();
    this.pump(questionId);
  }

  /** Retry every failed question right now (e.g. the connection came back). */
  retryNow() {
    for (const [id, e] of this.entries) {
      if (e.state === 'error' && !e.inflight) {
        if (e.timer !== null) {
          this.clearTimer(e.timer);
          e.timer = null;
        }
        this.pump(id);
      }
    }
  }

  snapshot(): QueueSnapshot {
    const states: Record<string, SaveState> = {};
    let unsaved = 0;
    let hasError = false;
    for (const [id, e] of this.entries) {
      states[id] = e.state;
      if (e.state !== 'saved') unsaved++;
      if (e.state === 'error') hasError = true;
    }
    return { states, unsaved, hasError, fatal: this.fatal };
  }

  dispose() {
    this.disposed = true;
    for (const e of this.entries.values()) {
      if (e.timer !== null) this.clearTimer(e.timer);
      e.timer = null;
    }
  }

  private pump(questionId: string) {
    const e = this.entries.get(questionId);
    if (!e || e.inflight || this.fatal || this.disposed) return;
    if (e.confirmed === e.desired) {
      e.state = 'saved';
      this.emit();
      return;
    }
    e.inflight = true;
    const value = e.desired;
    this.opts
      .send(questionId, value)
      .then(() => {
        e.inflight = false;
        e.confirmed = value;
        e.attempts = 0;
        if (e.desired !== value) {
          e.state = 'saving';
          this.emit();
          this.pump(questionId); // the student changed their mind meanwhile
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
          this.pump(questionId);
        }, delay);
      });
  }

  private emit() {
    this.opts.onChange?.(this.snapshot());
  }
}

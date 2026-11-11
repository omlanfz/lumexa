// FILE PATH: client/lib/classroom/pointer.ts
//
// The teacher's Pointer, without React or Daily: where a point on a shared screen
// is, and what the room remembers about the Pointer.
//
// A student's shared screen is shown in a box of whatever shape the layout gives
// it (a grid tile, or the whole window), with the picture letterboxed inside — so
// a position is never "where in the box" but "where in the PICTURE", as a share of
// its width and height. That is what travels between browsers, which is why the dot
// lands on the same spot of the same window on every screen, however the tiles
// differ in size or aspect ratio (see containedRect / toNormalized).
//
// Pointer updates arrive many times a second, so they live in a small store the
// overlay subscribes to (PointerStore), not in React state of the whole classroom.

import type { PointerMessage } from './daily/protocol.ts';

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Where the picture of an `object-fit: contain` video sits inside its box: the
 * largest rectangle of the picture's shape that fits, centred. Null while either
 * size is not known yet (the video has not reported its size). */
export function containedRect(box: Size, media: Size): Rect | null {
  if (!(box.width > 0 && box.height > 0 && media.width > 0 && media.height > 0)) return null;
  const scale = Math.min(box.width / media.width, box.height / media.height);
  const width = media.width * scale;
  const height = media.height * scale;
  return { left: (box.width - width) / 2, top: (box.height - height) / 2, width, height };
}

/** A point in the box (pixels from its top-left corner) as a share of the picture
 * (0–1 each way) — or null when it is on a letterbox bar, off the picture. */
export function toNormalized(point: Point, picture: Rect): Point | null {
  const x = (point.x - picture.left) / picture.width;
  const y = (point.y - picture.top) / picture.height;
  if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) return null;
  return { x, y };
}

/** A share of the picture, back to pixels in the box. */
export function fromNormalized(point: Point, picture: Rect): Point {
  return { x: picture.left + point.x * picture.width, y: picture.top + point.y * picture.height };
}

// ─── Sending ────────────────────────────────────────────────────────────────

/** How often a moving cursor is reported, at most (once every 40 ms: 25 a second
 * looks continuous with the dot's own easing, and is light on the call). */
export const MOVE_INTERVAL_MS = 40;
/** A still cursor is reported again this often, so a participant who joins (or
 * whose connection recovers) a moment later still finds the dot, and a dot whose
 * "off" never arrived does not stay up for ever. */
export const HEARTBEAT_MS = 8_000;
/** A dot that has heard nothing for this long is taken down (a few missed
 * heartbeats: the teacher's connection is gone). */
export const STALE_MS = HEARTBEAT_MS * 3;

interface ThrottleOptions<T> {
  intervalMs: number;
  send: (value: T) => void;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

/** Sends the first value at once, then at most one value per interval — always
 * the LATEST one, and always the last one (a cursor that stops is reported where it
 * stopped, not where the last report happened to be). */
export class MoveThrottle<T> {
  private lastSentAt = Number.NEGATIVE_INFINITY;
  private pending: { value: T } | null = null;
  private timer: unknown = null;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;

  constructor(private readonly options: ThrottleOptions<T>) {
    this.now = options.now ?? (() => Date.now());
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  }

  push(value: T): void {
    const wait = this.lastSentAt + this.options.intervalMs - this.now();
    if (wait <= 0 && this.timer === null) {
      this.emit(value);
      return;
    }
    this.pending = { value };
    if (this.timer === null) {
      this.timer = this.setTimer(() => {
        this.timer = null;
        this.flush();
      }, Math.max(0, wait));
    }
  }

  /** Sends what is waiting, now. */
  flush(): void {
    if (this.timer !== null) {
      this.clearTimer(this.timer);
      this.timer = null;
    }
    const waiting = this.pending;
    this.pending = null;
    if (waiting) this.emit(waiting.value);
  }

  /** Forgets what is waiting. */
  cancel(): void {
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
    this.pending = null;
  }

  private emit(value: T): void {
    this.lastSentAt = this.now();
    this.options.send(value);
  }
}

// ─── What the room remembers ───────────────────────────────────────────────

/** How long the highlight a click makes lasts. */
export const PULSE_MS = 1_100;
/** A burst of clicks shows at most this many rings at once. */
export const MAX_PULSES = 5;

export interface Pulse {
  id: number;
  x: number;
  y: number;
}

/** The Pointer over one shared screen. */
export interface SharePointer {
  /** Where, as a share of the picture. */
  x: number;
  y: number;
  /** The dot is showing (the cursor is over the picture). */
  visible: boolean;
  pulses: readonly Pulse[];
}

export interface PointerSnapshot {
  /** Keyed by the sharer's Daily session id. */
  byShare: Readonly<Record<string, SharePointer>>;
  /** The connection whose Pointer this is (the teacher's), or null when none. */
  fromSessionId: string | null;
}

const NOTHING: PointerSnapshot = { byShare: {}, fromSessionId: null };

interface StoreOptions {
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

export class PointerStore {
  private snapshot: PointerSnapshot = NOTHING;
  private readonly listeners = new Set<() => void>();
  private nextPulseId = 1;
  private readonly pulseTimers = new Map<number, unknown>();
  private staleTimer: unknown = null;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;

  constructor(options: StoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  }

  // ─── What React reads ─────────────────────────────────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): PointerSnapshot => this.snapshot;

  // ─── Changes ──────────────────────────────────────────────────────────

  /** Takes a Pointer message in. `shares` are the screens that may be pointed at
   * right now (a student's share): a message about any other screen is dropped. */
  apply(message: PointerMessage, shares: ReadonlySet<string>): void {
    if (message.type === 'off') {
      this.clear();
      return;
    }
    if (!shares.has(message.sid)) return;
    const previous = this.snapshot.byShare[message.sid];
    const base: SharePointer = previous ?? { x: 0, y: 0, visible: false, pulses: [] };

    if (message.type === 'hide') {
      if (!previous || !previous.visible) return;
      this.set({ byShare: { ...this.snapshot.byShare, [message.sid]: { ...base, visible: false } }, fromSessionId: message.fromSessionId });
      return;
    }

    if (message.type === 'move') {
      this.set({
        byShare: { ...this.snapshot.byShare, [message.sid]: { ...base, x: message.x, y: message.y, visible: true } },
        fromSessionId: message.fromSessionId,
      });
    } else {
      const pulse: Pulse = { id: this.nextPulseId++, x: message.x, y: message.y };
      const pulses = [...base.pulses, pulse].slice(-MAX_PULSES);
      this.set({
        byShare: { ...this.snapshot.byShare, [message.sid]: { x: message.x, y: message.y, visible: true, pulses } },
        fromSessionId: message.fromSessionId,
      });
      this.pulseTimers.set(
        pulse.id,
        this.setTimer(() => this.endPulse(message.sid, pulse.id), PULSE_MS + 60),
      );
    }
    this.armStale();
  }

  /** Takes down the Pointer over screens that are no longer being shared. */
  prune(shares: ReadonlySet<string>): void {
    const kept: Record<string, SharePointer> = {};
    let changed = false;
    for (const [sid, state] of Object.entries(this.snapshot.byShare)) {
      if (shares.has(sid)) kept[sid] = state;
      else changed = true;
    }
    if (!changed) return;
    if (Object.keys(kept).length === 0) this.clear();
    else this.set({ ...this.snapshot, byShare: kept });
  }

  /** Takes down the Pointer if it belongs to a connection that is no longer in the
   * room (the teacher left or lost their connection with the dot showing). */
  dropIfGone(sessionIds: ReadonlySet<string>): void {
    const from = this.snapshot.fromSessionId;
    if (from !== null && !sessionIds.has(from)) this.clear();
  }

  /** Everything off. */
  clear(): void {
    for (const timer of this.pulseTimers.values()) this.clearTimer(timer);
    this.pulseTimers.clear();
    if (this.staleTimer !== null) this.clearTimer(this.staleTimer);
    this.staleTimer = null;
    this.set(NOTHING);
  }

  private endPulse(sid: string, id: number): void {
    this.pulseTimers.delete(id);
    const state = this.snapshot.byShare[sid];
    if (!state || !state.pulses.some((p) => p.id === id)) return;
    this.set({
      ...this.snapshot,
      byShare: { ...this.snapshot.byShare, [sid]: { ...state, pulses: state.pulses.filter((p) => p.id !== id) } },
    });
  }

  /** Every update from the teacher (re)starts the countdown to "gone quiet": see
   * STALE_MS. */
  private armStale(): void {
    if (this.staleTimer !== null) this.clearTimer(this.staleTimer);
    this.staleTimer = this.setTimer(() => {
      this.staleTimer = null;
      this.clear();
    }, STALE_MS);
  }

  private set(next: PointerSnapshot): void {
    if (next === this.snapshot) return;
    this.snapshot = next;
    for (const listener of [...this.listeners]) listener();
  }
}

// FILE PATH: client/lib/classroom/pointer.ts
//
// The teacher's Pointer, without React or Daily: where a point on a shared screen
// is, how a moving cursor is sent, and what the room remembers about it.
//
// A student's shared screen is shown in a box of whatever shape the layout gives
// it (a grid tile, or the whole window), with the picture letterboxed inside — so
// a position is never "where in the box" but "where in the PICTURE", as a share of
// its width and height. That is what travels between browsers, which is why the dot
// lands on the same spot of the same window on every screen, however the tiles
// differ in size or aspect ratio (see containedRect / toNormalized).
//
// What people see is three things made of those positions over time: a small dot
// that follows the teacher's cursor, a thin line that follows it while the mouse
// button is held (and fades), and a ring where it clicks. So positions travel as
// TIMED points:
//
//   sender    PointerBatcher gathers the cursor's points for 40 ms and sends them as one
//             message, each with how long ago it was — the same few messages a second as
//             before, but carrying the real path, so a quick curve is still a curve.
//   receiver  PointerStore plays them back a beat late (PLAYOUT_DELAY_MS) on the sender's
//             own timing, so the dot glides instead of stepping at network speed, and
//             builds the fading lines and the rings. The overlay asks it for a `frame`
//             once per animation frame, and only while something is moving or fading;
//             nothing here uses React or timers to animate.

import { MAX_POINTER_POINTS } from './daily/protocol.ts';
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

/** How often a moving cursor is reported, at most (once every 40 ms: 25 messages a
 * second, as light on the call as a single dot ever was — and each carries every
 * point since the last, so nothing is lost). */
export const MOVE_INTERVAL_MS = 40;
/** A still cursor is reported again this often, so a participant who joins (or
 * whose connection recovers) a moment later still finds the dot, and a dot whose
 * "off" never arrived does not stay up for ever. */
export const HEARTBEAT_MS = 8_000;
/** A dot that has heard nothing for this long is taken down (a few missed
 * heartbeats: the teacher's connection is gone). */
export const STALE_MS = HEARTBEAT_MS * 3;
/** Points closer than this (a share of the picture: ~3 px on a 1080p screen) are
 * not both sent — a hand resting on the mouse sends nothing, and a fast one sends
 * a few well-spread points rather than a thousand. */
export const MIN_POINT_STEP = 0.0015;

/** A press that moves less than this (in screen pixels) is a click, not the start of a
 * line — a hand is never perfectly still. */
export const DRAG_THRESHOLD_PX = 4;

/** A point of the cursor's path, and when it was (a clock in milliseconds: the same
 * one the batcher reads). */
export interface TimedPoint extends Point {
  t: number;
}

/** What goes out in one message: the path since the last one. */
export interface PointerBatch {
  /** The shared screen it is over. */
  sid: string;
  /** The line being drawn (mouse button held), or null for a cursor that just moves. */
  stroke: number | null;
  /** Oldest first; `age` is how many milliseconds before sending the cursor was there.
   * The last one is where it is now. */
  points: Array<Point & { age: number }>;
}

/** The points worth sending: the first and the last always, the ones between only
 * when they are a real step from the last one kept — and if that is still more than
 * a message may carry, an even spread of them. */
export function simplifyPoints(
  points: readonly TimedPoint[],
  minStep: number = MIN_POINT_STEP,
  max: number = MAX_POINTER_POINTS,
): TimedPoint[] {
  if (points.length <= 2) return [...points];
  const kept: TimedPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const last = kept[kept.length - 1];
    if (Math.hypot(points[i].x - last.x, points[i].y - last.y) >= minStep) kept.push(points[i]);
  }
  kept.push(points[points.length - 1]);
  if (kept.length <= max) return kept;
  const spread: TimedPoint[] = [];
  for (let i = 0; i < max; i++) spread.push(kept[Math.round((i * (kept.length - 1)) / (max - 1))]);
  return spread;
}

interface BatcherOptions {
  intervalMs: number;
  send: (batch: PointerBatch) => void;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

function defaultClock(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** Gathers the cursor's points and sends them at most once an interval: the first
 * point of a quiet spell at once, then everything gathered each interval — and always
 * the last, so a cursor that stops is reported where it stopped. A message never
 * mixes a line with a plain move, nor two shared screens: a change of either sends
 * what is waiting first. */
export class PointerBatcher {
  private sid: string | null = null;
  private stroke: number | null = null;
  private pending: TimedPoint[] = [];
  private lastSentAt = Number.NEGATIVE_INFINITY;
  private timer: unknown = null;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;

  constructor(private readonly options: BatcherOptions) {
    this.now = options.now ?? defaultClock;
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  }

  push(sid: string, stroke: number | null, point: TimedPoint): void {
    if (this.pending.length > 0 && (sid !== this.sid || stroke !== this.stroke)) this.flush();
    this.sid = sid;
    this.stroke = stroke;
    this.pending.push(point);
    const wait = this.lastSentAt + this.options.intervalMs - this.now();
    if (wait <= 0 && this.timer === null) {
      this.flush();
      return;
    }
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
    if (this.pending.length === 0 || this.sid === null) return;
    const now = this.now();
    const points = simplifyPoints(this.pending).map((p) => ({ x: p.x, y: p.y, age: Math.max(0, Math.round(now - p.t)) }));
    const batch: PointerBatch = { sid: this.sid, stroke: this.stroke, points };
    this.pending = [];
    this.lastSentAt = now;
    this.options.send(batch);
  }

  /** Forgets what is waiting. */
  cancel(): void {
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
    this.pending = [];
  }
}

// ─── What the room remembers ───────────────────────────────────────────────

/** The line drawn with the mouse button held fades over this long: each point of it
 * is gone this long after the cursor was there. */
export const TRAIL_MS = 700;
/** How long the ring a click makes lasts. */
export const RING_MS = 800;
/** A burst of clicks shows at most this many rings at once. */
export const MAX_RINGS = 5;
/** Viewers see the pointer this much after it moved — a beat that lets the dot
 * glide through the points of a message (and through a late one) instead of stepping
 * from one to the next as they happen to arrive. */
export const PLAYOUT_DELAY_MS = 70;
/** If messages pile up further ahead than this (a stall, then everything at once),
 * the dot catches up in one go rather than lagging for good. */
export const MAX_BACKLOG_MS = 300;
/** The most points one line keeps — more than a fast mouse (1000 samples a second) makes in
 * the time a line takes to fade; past it the oldest points go first. */
const MAX_STROKE_POINTS = 1_000;
/** What waits to be played back is bounded too (a tab that is not being drawn). */
const MAX_QUEUED = 600;

/** A point of a line, and when it was drawn (the store's clock). */
export interface TrailPoint extends Point {
  t: number;
}

/** One line: from the mouse button going down to it coming up. */
export interface Stroke {
  id: number;
  points: TrailPoint[];
}

export interface Ring {
  x: number;
  y: number;
  /** When it started (the store's clock). */
  start: number;
}

/** What to draw over one shared screen at one moment. Read-only: it is the store's
 * own data, valid until the next `frame`. */
export interface PointerFrame {
  /** Where the dot is, or null while the cursor is off the picture. */
  dot: Point | null;
  /** The lines still showing, oldest first. */
  strokes: readonly Stroke[];
  /** The line the mouse button is drawing right now, if any: the dot is its head. */
  activeStroke: Stroke | null;
  rings: readonly Ring[];
  /** Something is still moving or fading, so another frame is due. */
  animating: boolean;
}

type QueueItem =
  | { kind: 'point'; at: number; x: number; y: number; k: number | null }
  | { kind: 'ring'; at: number; x: number; y: number }
  | { kind: 'hide'; at: number };

interface ShareState {
  /** Waiting to be played back, in time order. */
  queue: QueueItem[];
  /** When the last item in the queue is due (never goes backwards). */
  lastAt: number;
  /** The last point played: where the dot is coming from. */
  from: (Point & { at: number }) | null;
  visible: boolean;
  strokes: Stroke[];
  current: Stroke | null;
  rings: Ring[];
}

function emptyState(): ShareState {
  return { queue: [], lastAt: Number.NEGATIVE_INFINITY, from: null, visible: false, strokes: [], current: null, rings: [] };
}

interface StoreOptions {
  /** The clock, in milliseconds (the same one `frame` is given). */
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

interface ApplyOptions {
  /** The teacher's own browser: shown at once, as it happens, not a beat late. */
  local?: boolean;
  /** When a local move happened (the clock `now` reads); defaults to now. */
  at?: number;
}

type MoveMessage = Extract<PointerMessage, { type: 'move' }>;

/** The points a move message carries (a message from before paths is one point). */
function pathOf(message: MoveMessage): Array<Point & { age: number }> {
  const p = message.p;
  if (p && p.length >= 3 && p.length % 3 === 0) {
    const out: Array<Point & { age: number }> = [];
    for (let i = 0; i < p.length; i += 3) out.push({ x: p[i], y: p[i + 1], age: p[i + 2] });
    return out;
  }
  return [{ x: message.x, y: message.y, age: 0 }];
}

export class PointerStore {
  private readonly states = new Map<string, ShareState>();
  private from: string | null = null;
  private readonly listeners = new Set<() => void>();
  private staleTimer: unknown = null;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;

  constructor(options: StoreOptions = {}) {
    this.now = options.now ?? defaultClock;
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  }

  // ─── What the overlay reads ───────────────────────────────────────────

  /** Told whenever something changes that the overlay should draw (it then asks for
   * a `frame`). */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** The connection whose Pointer this is (the teacher's), or null when none. */
  get fromSessionId(): string | null {
    return this.from;
  }

  /** What to draw over the screen shared by `sid` at time `now`, or null when the
   * Pointer is not on it. Plays back what is due, and takes down what has faded. */
  frame(sid: string, now: number): PointerFrame | null {
    const state = this.states.get(sid);
    if (!state) return null;
    this.advance(state, now);

    const cutoff = now - TRAIL_MS;
    for (const stroke of state.strokes) {
      let drop = 0;
      while (drop < stroke.points.length && stroke.points[drop].t < cutoff) drop++;
      if (drop > 0) stroke.points.splice(0, drop);
    }
    state.strokes = state.strokes.filter((stroke) => stroke.points.length > 0 || stroke === state.current);
    state.rings = state.rings.filter((ring) => now - ring.start < RING_MS);

    let dot: Point | null = null;
    if (state.visible && state.from) {
      dot = { x: state.from.x, y: state.from.y };
      const next = state.queue[0];
      if (next && next.kind === 'point' && next.at > state.from.at) {
        const u = Math.min(1, Math.max(0, (now - state.from.at) / (next.at - state.from.at)));
        dot = { x: state.from.x + (next.x - state.from.x) * u, y: state.from.y + (next.y - state.from.y) * u };
      }
    }
    const lines = state.strokes.filter((stroke) => stroke.points.length > 0);
    return {
      dot,
      strokes: lines,
      activeStroke: state.current && state.current.points.length > 0 ? state.current : null,
      rings: state.rings,
      animating: state.queue.length > 0 || lines.length > 0 || state.rings.length > 0,
    };
  }

  // ─── Changes ──────────────────────────────────────────────────────────

  /** Takes a Pointer message in. `shares` are the screens that may be pointed at
   * right now (a student's share): a message about any other screen is dropped. */
  apply(message: PointerMessage, shares: ReadonlySet<string>, options: ApplyOptions = {}): void {
    if (message.type === 'off') {
      this.clear();
      return;
    }
    if (!shares.has(message.sid)) return;
    const now = this.now();
    const local = options.local === true;
    let state = this.states.get(message.sid);

    if (message.type === 'hide') {
      if (!state || (!state.visible && state.queue.length === 0)) return;
      if (local) this.play(state, { kind: 'hide', at: now });
      else state.queue.push({ kind: 'hide', at: this.slot(state, now) });
      this.touched(message.fromSessionId);
      return;
    }

    if (!state) {
      state = emptyState();
      this.states.set(message.sid, state);
    }

    if (message.type === 'click') {
      if (local) this.play(state, { kind: 'ring', at: now, x: message.x, y: message.y });
      else state.queue.push({ kind: 'ring', at: this.slot(state, now), x: message.x, y: message.y });
    } else if (local) {
      const lastAt = state.from?.at ?? Number.NEGATIVE_INFINITY;
      const at = Math.max(options.at ?? now, lastAt);
      this.play(state, { kind: 'point', at, x: message.x, y: message.y, k: message.k ?? null });
    } else {
      this.advance(state, now); // a tab nobody draws still keeps its queue short
      if (state.lastAt - now > MAX_BACKLOG_MS) {
        this.advance(state, state.lastAt, now); // everything waiting is overdue: catch up, as of now
        state.lastAt = Math.min(state.lastAt, now);
      }
      const path = pathOf(message);
      const times = this.plan(state, now, path);
      for (let i = 0; i < path.length; i++) {
        state.queue.push({ kind: 'point', at: times[i], x: path[i].x, y: path[i].y, k: message.k ?? null });
      }
      if (state.queue.length > MAX_QUEUED) state.queue.splice(0, state.queue.length - MAX_QUEUED);
    }
    this.touched(message.fromSessionId);
  }

  /** Takes down the Pointer over screens that are no longer being shared. */
  prune(shares: ReadonlySet<string>): void {
    let changed = false;
    for (const sid of [...this.states.keys()]) {
      if (!shares.has(sid)) {
        this.states.delete(sid);
        changed = true;
      }
    }
    if (!changed) return;
    if (this.states.size === 0) {
      this.clear();
      return;
    }
    this.notify();
  }

  /** Takes down the Pointer if it belongs to a connection that is no longer in the
   * room (the teacher left or lost their connection with the dot showing). */
  dropIfGone(sessionIds: ReadonlySet<string>): void {
    if (this.from !== null && !sessionIds.has(this.from)) this.clear();
  }

  /** Everything off: dot, lines and rings, on every screen. */
  clear(): void {
    if (this.staleTimer !== null) this.clearTimer(this.staleTimer);
    this.staleTimer = null;
    const hadSomething = this.states.size > 0 || this.from !== null;
    this.states.clear();
    this.from = null;
    if (hadSomething) this.notify();
  }

  // ─── Playing back ─────────────────────────────────────────────────────

  /** Plays what is due by `until`. Items played ahead of their time (`until` is in
   * their future: catching up) are stamped no later than `stamp` — they happen now. */
  private advance(state: ShareState, until: number, stamp: number = Number.POSITIVE_INFINITY): void {
    while (state.queue.length > 0 && state.queue[0].at <= until) {
      this.play(state, state.queue.shift() as QueueItem, stamp);
    }
  }

  /** Makes one item part of what is showing. Time only goes forward on a screen: a
   * point is never stamped earlier than the one before it. */
  private play(state: ShareState, item: QueueItem, stamp: number = Number.POSITIVE_INFINITY): void {
    switch (item.kind) {
      case 'point': {
        const at = Math.max(Math.min(item.at, stamp), state.from?.at ?? Number.NEGATIVE_INFINITY);
        state.visible = true;
        state.from = { x: item.x, y: item.y, at };
        if (item.k === null) {
          state.current = null;
          return;
        }
        if (!state.current || state.current.id !== item.k) {
          state.current = { id: item.k, points: [] };
          state.strokes.push(state.current);
        }
        const points = state.current.points;
        points.push({ x: item.x, y: item.y, t: at });
        if (points.length > MAX_STROKE_POINTS) points.splice(0, points.length - MAX_STROKE_POINTS);
        return;
      }
      case 'ring':
        state.rings.push({ x: item.x, y: item.y, start: Math.min(item.at, stamp) });
        if (state.rings.length > MAX_RINGS) state.rings.splice(0, state.rings.length - MAX_RINGS);
        return;
      case 'hide':
        state.visible = false;
        state.from = null;
        state.current = null; // the line stops where it was; what is drawn fades out
        return;
    }
  }

  /** When one more item (a ring, a "hide") is due: a beat after it arrived, and never
   * before what is already waiting. */
  private slot(state: ShareState, now: number): number {
    const at = Math.max(now + PLAYOUT_DELAY_MS, state.lastAt);
    state.lastAt = at;
    return at;
  }

  /** When each point of a message is due. The message arrived now, its newest point as
   * fresh as `age` says; each is played a beat later, on the sender's own timing. If
   * the queue is already ahead of that, the whole message moves back as one block, so
   * its internal spacing survives. */
  private plan(state: ShareState, now: number, path: ReadonlyArray<{ age: number }>): number[] {
    const raw = path.map((point) => now + PLAYOUT_DELAY_MS - point.age);
    const shift = Math.max(0, state.lastAt - raw[0]);
    const times: number[] = [];
    let floor = Number.NEGATIVE_INFINITY;
    for (const r of raw) {
      const at = Math.max(r + shift, floor);
      times.push(at);
      floor = at;
    }
    state.lastAt = Math.max(state.lastAt, floor);
    return times;
  }

  /** Every update from the teacher (re)starts the countdown to "gone quiet": see
   * STALE_MS. */
  private touched(fromSessionId: string): void {
    this.from = fromSessionId;
    if (this.staleTimer !== null) this.clearTimer(this.staleTimer);
    this.staleTimer = this.setTimer(() => {
      this.staleTimer = null;
      this.clear();
    }, STALE_MS);
    this.notify();
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

// FILE PATH: client/lib/classroom/daily/store.ts
//
// What the classroom knows about a Daily call, as a store React can read
// (useSyncExternalStore): who is in the room and what each connection is doing,
// who is speaking, the room's shared state, how the local connection is doing,
// and how the meeting ended. It listens to the call object's events and publishes
// a new snapshot only when something on screen would differ.
//
// It is deliberately plain TypeScript with no React and no Daily import: it is
// given anything shaped like a call (CallLike — a DailyCall fits), which is also
// what lets the tests drive it with a fake.
//
// It reads the call when it is made, and listens to the call only between attach()
// and detach() — so React can attach it in an effect and detach it in the cleanup,
// as often as it likes (it does both twice in development), and the same store
// keeps working.
//
// App messages (chat, hands, the server's messages) are not state: they are passed
// on to whoever subscribed with onMessage, each with the connection Daily says sent
// it, and then forgotten.

import { parseClassroomState } from '../types.ts';
import type { ClassroomState } from '../types.ts';
import { reconcilePeers, toPeers } from './peers.ts';
import type { ParticipantLike, Peer } from './peers.ts';

export type MeetingState =
  | 'new'
  | 'loading'
  | 'loaded'
  | 'joining-meeting'
  | 'joined-meeting'
  | 'left-meeting'
  | 'error';

/** Why this browser is no longer in the meeting. */
export interface CallEnd {
  /** left: this browser left · ejected: the teacher removed this person (or the
   * room was closed under them) · ended: the room is gone or has run out · error:
   * the connection failed. */
  reason: 'left' | 'ejected' | 'ended' | 'error';
  message: string;
}

export type NetworkState = 'good' | 'low' | 'bad' | 'unknown';

export interface CallSnapshot {
  meetingState: MeetingState;
  /** Every connection in the room — yours, the other people's and an observer's. */
  peers: Peer[];
  localSessionId: string | null;
  localUserId: string | null;
  /** The connections (session ids) whose microphone is loud right now. */
  speaking: ReadonlySet<string>;
  /** How this browser's connection is doing. */
  network: NetworkState;
  /** The room's shared state, as the server last set it. */
  classState: ClassroomState;
  ended: CallEnd | null;
}

export interface IncomingAppMessage {
  data: unknown;
  /** The connection Daily says sent it; null when it is no longer in the room. */
  from: Peer | null;
}

/** What the store needs from a call object (a DailyCall fits). */
export interface CallLike {
  participants(): Record<string, ParticipantLike>;
  meetingState(): MeetingState;
  meetingSessionState?(): { data: unknown };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Daily's handlers are typed per event
  on(event: any, handler: (e: any) => void): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: any, handler: (e: any) => void): unknown;
  startLocalAudioLevelObserver?(intervalMs?: number): Promise<void>;
  stopLocalAudioLevelObserver?(): void;
  startRemoteParticipantsAudioLevelObserver?(intervalMs?: number): Promise<void>;
  stopRemoteParticipantsAudioLevelObserver?(): void;
}

/** Louder than this (0–1, Daily's scale) counts as speaking. */
export const SPEAKING_LEVEL = 0.05;
/** A speaker stays highlighted this long after their level drops, so the
 * highlight does not flicker between words. */
export const SPEAKING_HOLD_MS = 500;
/** How often Daily reports audio levels. */
const LEVEL_INTERVAL_MS = 200;

/** Everything on the call that can change what a tile or a list shows. */
const PEER_EVENTS = [
  'joining-meeting',
  'participant-joined',
  'participant-updated',
  'participant-left',
  'track-started',
  'track-stopped',
  'started-camera',
  'camera-error',
  'input-settings-updated',
  'selected-devices-updated',
  'local-screen-share-started',
  'local-screen-share-stopped',
] as const;

const NO_ONE: ReadonlySet<string> = new Set();

interface StoreOptions {
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

export class CallStore {
  private snapshot: CallSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly messageListeners = new Set<(m: IncomingAppMessage) => void>();
  private readonly registered: [string, (e: never) => void][] = [];
  private attached = false;
  private readonly speakingUntil = new Map<string, number>();
  private sweepTimer: unknown = null;
  private refreshQueued = false;
  private disposed = false;
  /** Why the meeting is ending, known from an error that precedes `left-meeting`. */
  private pendingEnd: CallEnd | null = null;
  private localAudioTrackId: string | null = null;

  private readonly call: CallLike;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;

  constructor(call: CallLike, options: StoreOptions = {}) {
    this.call = call;
    this.now = options.now ?? (() => Date.now());
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
    this.snapshot = {
      meetingState: this.readMeetingState(),
      peers: [],
      localSessionId: null,
      localUserId: null,
      speaking: NO_ONE,
      network: 'unknown',
      classState: {},
      ended: null,
    };

    // The room as it is now (the person may already be in the meeting).
    this.refreshNow();
  }

  /** Starts listening to the call. Safe to repeat; returns the store. */
  attach(): this {
    if (this.attached || this.disposed) return this;
    this.attached = true;
    for (const event of PEER_EVENTS) this.listen(event, () => this.scheduleRefresh());
    this.listen('joined-meeting', () => this.onJoined());
    this.listen('left-meeting', () => this.onLeft());
    this.listen('error', (e: FatalErrorPayload) => this.onFatalError(e));
    this.listen('app-message', (e: AppMessageEvent) => this.onAppMessage(e));
    this.listen('meeting-session-state-updated', (e: SessionStateEvent) =>
      this.setClassState(e?.meetingSessionState?.data),
    );
    this.listen('network-quality-change', (e: NetworkEvent) => this.setNetwork(e?.networkState));
    this.listen('remote-participants-audio-level', (e: LevelsEvent) => this.onRemoteLevels(e));
    this.listen('local-audio-level', (e: LocalLevelEvent) => this.onLocalLevel(e));

    // Things that happened before this store was listening.
    this.refreshNow();
    if (this.snapshot.meetingState === 'joined-meeting') this.onJoined();
    return this;
  }

  /** Stops listening to the call and watching audio levels. A detached store can
   * be attached again. */
  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    for (const [event, handler] of this.registered) this.call.off(event, handler as never);
    this.registered.length = 0;
    if (this.sweepTimer !== null) this.clearTimer(this.sweepTimer);
    this.sweepTimer = null;
    this.speakingUntil.clear();
    this.refreshQueued = false;
    try {
      this.call.stopLocalAudioLevelObserver?.();
      this.call.stopRemoteParticipantsAudioLevelObserver?.();
    } catch {
      // the call may already be gone
    }
    // Nobody is "speaking" while nothing is being watched.
    this.update({ speaking: NO_ONE });
  }

  // ─── What React reads ───────────────────────────────────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): CallSnapshot => this.snapshot;

  /** Calls `listener` with every app message that arrives (never stored). */
  onMessage(listener: (m: IncomingAppMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  /** Reads the call again now rather than at the end of this tick. */
  refreshNow(): void {
    this.refreshQueued = false;
    this.refresh();
  }

  /** Finished with the store for good: detaches and forgets every subscriber. */
  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.messageListeners.clear();
    this.detach();
  }

  // ─── Events ─────────────────────────────────────────────────────────────

  private listen<E>(event: string, handler: (e: E) => void): void {
    const wrapped = (e: E) => {
      if (!this.disposed) handler(e);
    };
    this.call.on(event, wrapped);
    this.registered.push([event, wrapped as (e: never) => void]);
  }

  private onJoined(): void {
    this.refreshNow();
    this.readClassState();
    this.startObservers();
  }

  private onLeft(): void {
    this.refreshNow();
    const end = this.pendingEnd ?? { reason: 'left' as const, message: 'You have left the class.' };
    this.update({ meetingState: this.readMeetingState(), ended: this.snapshot.ended ?? end });
  }

  private onFatalError(e: FatalErrorPayload): void {
    const type = e?.error?.type;
    const message = e?.errorMsg || e?.error?.msg || 'The connection to the classroom was lost.';
    let reason: CallEnd['reason'] = 'error';
    if (type === 'ejected') reason = 'ejected';
    else if (type === 'no-room' || type === 'exp-room' || type === 'end-of-life') reason = 'ended';
    this.pendingEnd = { reason, message };
    // `left-meeting` usually follows; when the call has already stopped, it will not.
    const state = this.readMeetingState();
    if (state === 'left-meeting' || state === 'error') {
      this.update({ meetingState: state, ended: this.snapshot.ended ?? this.pendingEnd });
    }
  }

  private onAppMessage(e: AppMessageEvent): void {
    if (this.messageListeners.size === 0) return;
    let from: Peer | null = null;
    try {
      // Read the room as it is this instant: the sender may have joined a moment ago.
      from = toPeers(this.call.participants()).find((p) => p.sessionId === e?.fromId) ?? null;
    } catch {
      from = null;
    }
    for (const listener of [...this.messageListeners]) listener({ data: e?.data, from });
  }

  // ─── The room ───────────────────────────────────────────────────────────

  private scheduleRefresh(): void {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    queueMicrotask(() => {
      if (!this.refreshQueued) return;
      this.refreshQueued = false;
      this.refresh();
    });
  }

  private refresh(): void {
    if (this.disposed) return;
    let participants: Record<string, ParticipantLike>;
    try {
      participants = this.call.participants();
    } catch {
      return; // the call object is gone
    }
    const peers = reconcilePeers(this.snapshot.peers, toPeers(participants));
    const local = peers.find((p) => p.isLocal) ?? null;
    this.update({
      meetingState: this.readMeetingState(),
      peers,
      localSessionId: local?.sessionId ?? null,
      localUserId: local?.userId ?? null,
    });
    // A new microphone track (the person switched device, or unmuted after the
    // camera and microphone were stopped) is a new audio level to observe.
    const trackId = local?.audio.track?.id ?? null;
    if (trackId !== this.localAudioTrackId) {
      const first = this.localAudioTrackId === null;
      this.localAudioTrackId = trackId;
      if (!first && trackId !== null && this.snapshot.meetingState === 'joined-meeting') this.restartLocalObserver();
    }
  }

  private readMeetingState(): MeetingState {
    try {
      return this.call.meetingState();
    } catch {
      return 'left-meeting';
    }
  }

  private readClassState(): void {
    try {
      this.setClassState(this.call.meetingSessionState?.().data);
    } catch {
      // not available (yet): the join response has the lock; the rest is off
    }
  }

  private setClassState(data: unknown): void {
    this.update({ classState: sameClassState(this.snapshot.classState, parseClassroomState(data)) });
  }

  private setNetwork(state: unknown): void {
    const network: NetworkState = state === 'good' || state === 'low' || state === 'bad' ? state : 'unknown';
    this.update({ network });
  }

  // ─── Who is speaking ────────────────────────────────────────────────────

  private startObservers(): void {
    this.run(() => this.call.startRemoteParticipantsAudioLevelObserver?.(LEVEL_INTERVAL_MS));
    this.run(() => this.call.startLocalAudioLevelObserver?.(LEVEL_INTERVAL_MS));
  }

  private restartLocalObserver(): void {
    try {
      this.call.stopLocalAudioLevelObserver?.();
    } catch {
      // not running
    }
    this.run(() => this.call.startLocalAudioLevelObserver?.(LEVEL_INTERVAL_MS));
  }

  /** Runs something that may throw or reject — an observer that cannot start
   * (no microphone) just means nobody is highlighted for it. */
  private run(fn: () => Promise<void> | void): void {
    try {
      void Promise.resolve(fn()).catch(() => undefined);
    } catch {
      // see above
    }
  }

  private onRemoteLevels(e: LevelsEvent): void {
    const now = this.now();
    for (const [sessionId, level] of Object.entries(e?.participantsAudioLevel ?? {})) {
      this.noteLevel(sessionId, level, now);
    }
    this.publishSpeaking(now);
  }

  private onLocalLevel(e: LocalLevelEvent): void {
    const now = this.now();
    if (this.snapshot.localSessionId) this.noteLevel(this.snapshot.localSessionId, e?.audioLevel, now);
    this.publishSpeaking(now);
  }

  private noteLevel(sessionId: string, level: unknown, now: number): void {
    const value = levelOf(level);
    if (value !== null && value >= SPEAKING_LEVEL) {
      this.speakingUntil.set(sessionId, now + SPEAKING_HOLD_MS);
    }
  }

  /** Who is speaking at `now`; also schedules the moment the next one stops. */
  publishSpeaking(now: number = this.now()): void {
    let nextExpiry = Infinity;
    const speaking = new Set<string>();
    for (const [id, until] of this.speakingUntil) {
      if (until > now) {
        speaking.add(id);
        nextExpiry = Math.min(nextExpiry, until);
      } else {
        this.speakingUntil.delete(id);
      }
    }
    const current = this.snapshot.speaking;
    const same = speaking.size === current.size && [...speaking].every((id) => current.has(id));
    if (!same) this.update({ speaking: speaking.size === 0 ? NO_ONE : speaking });
    if (this.sweepTimer !== null) {
      this.clearTimer(this.sweepTimer);
      this.sweepTimer = null;
    }
    if (nextExpiry !== Infinity && !this.disposed) {
      this.sweepTimer = this.setTimer(() => {
        this.sweepTimer = null;
        this.publishSpeaking();
      }, nextExpiry - now + 20);
    }
  }

  // ─── Publishing ─────────────────────────────────────────────────────────

  private update(patch: Partial<CallSnapshot>): void {
    const next = { ...this.snapshot, ...patch };
    const keys = Object.keys(next) as (keyof CallSnapshot)[];
    if (keys.every((k) => Object.is(next[k], this.snapshot[k]))) return;
    this.snapshot = next;
    for (const listener of [...this.listeners]) listener();
  }
}

/** An audio level as a number. Daily documents levels as numbers, but daily-js
 * 0.93 delivers them as numeric strings ("0.006551") — so either is read, and
 * anything else is no level at all. */
export function levelOf(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** `next`, unless it says the same as `current` — then `current` itself, so
 * nothing re-renders for an update that changed nothing. */
function sameClassState(current: ClassroomState, next: ClassroomState): ClassroomState {
  const keys = new Set([...Object.keys(current), ...Object.keys(next)]) as Set<keyof ClassroomState>;
  for (const key of keys) if (current[key] !== next[key]) return next;
  return current;
}

// ─── Daily's event payloads, as far as they are read here ────────────────────

interface FatalErrorPayload {
  errorMsg?: string;
  error?: { type?: string; msg?: string };
}
interface AppMessageEvent {
  data?: unknown;
  fromId?: string;
}
interface SessionStateEvent {
  meetingSessionState?: { data?: unknown };
}
interface NetworkEvent {
  networkState?: string;
}
interface LevelsEvent {
  participantsAudioLevel?: Record<string, number>;
}
interface LocalLevelEvent {
  audioLevel?: number;
}

// FILE PATH: client/lib/classroom/usePointer.ts
//
// The teacher's Pointer: a dot that follows their cursor over a student's shared
// screen, a thin line they draw by holding the mouse button, and a ring where they
// click — for everyone in the room.
//
// It is carried by the room's existing app messages (see daily/protocol.ts), like
// raised hands and reactions, and is the TEACHER'S alone: a message is only
// believed when Daily says it came from the room's owner. What is sent is where
// the cursor is on the PICTURE of the shared screen, as a share of its width and
// height (see pointer.ts), so it lands on the same spot everywhere. A moving cursor
// goes out as one message every 40 ms carrying every point since the last, each with
// its age, so the others see the real path (see PointerBatcher) — and a line being
// drawn is told apart from a plain move by its number.
//
// Pointer mode belongs to the teacher's browser and starts off. It ends by itself
// when nobody is presenting any more (the presenter stopped or left), and ending it
// — any way — tells the room to take everything down.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCall, useCallSnapshot, useCallStore, useLocalPeer } from './daily/CallContext';
import { authorizePointer, parseAppPayload, pointerPayload, senderOf } from './daily/protocol';
import type { PointerWire } from './daily/protocol';
import type { Peer } from './daily/peers';
import { HEARTBEAT_MS, MOVE_INTERVAL_MS, PointerBatcher, PointerStore } from './pointer';
import type { Point } from './pointer';
import { claimsToBeServer } from './serverEvents';

/** The latest value of something, for code that runs outside a render (a message
 * arriving, a timer) and must not be torn down and rebuilt each time it changes. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

export interface PointerMoveOptions {
  /** The mouse button is held: this point is part of a line being drawn. */
  stroke?: boolean;
  /** When it happened, on the clock of `performance.now()` (an event's `timeStamp`).
   * Defaults to now. */
  at?: number;
}

export interface PointerControls {
  /** The Pointer button is shown: this is the teacher's browser and a student is
   * presenting. */
  available: boolean;
  /** Pointer mode is on (always false for anyone but the teacher). */
  active: boolean;
  toggle: () => void;
  /** What the overlay over each shared screen reads. */
  store: PointerStore;
  /** The teacher's cursor is at `point` (a share of the picture) over the screen
   * shared by `sessionId`. */
  move: (sessionId: string, point: Point, options?: PointerMoveOptions) => void;
  /** The teacher clicked there. */
  click: (sessionId: string, point: Point) => void;
  /** The mouse button came up (or the press was interrupted): the line is over. */
  endStroke: () => void;
  /** The cursor left the picture. */
  leave: (sessionId: string) => void;
}

interface UsePointerOptions {
  isTeacher: boolean;
  /** The screens that may be pointed at: those shared by students. */
  shares: Peer[];
}

export function usePointer({ isTeacher, shares }: UsePointerOptions): PointerControls {
  const call = useCall();
  const callStore = useCallStore();
  const local = useLocalPeer();
  const { peers } = useCallSnapshot();
  const store = useMemo(() => new PointerStore(), []);
  const [on, setOn] = useState(false);

  const shareKey = shares.map((p) => p.sessionId).join(',');
  const shareIds = useMemo(() => new Set(shareKey ? shareKey.split(',') : []), [shareKey]);
  const shareIdsRef = useLatest(shareIds);
  const localSessionRef = useLatest(local?.sessionId ?? '');

  const available = isTeacher && shareIds.size > 0;
  // Pointer mode switches itself off when its reason is gone (nobody presents any
  // more), so it does not come back on by itself when someone next presents.
  if (on && !available) setOn(false);
  const active = on && available;

  // ─── Receiving ─────────────────────────────────────────────────────────

  // What the room sends — believed only from the teacher (see protocol.ts).
  useEffect(
    () =>
      callStore.onMessage(({ data, from }) => {
        if (!from || claimsToBeServer(data)) return;
        const payload = parseAppPayload(data);
        if (!payload || payload.kind !== 'pointer') return;
        const message = authorizePointer(payload.pointer, senderOf(from));
        if (message) store.apply(message, shareIdsRef.current);
      }),
    [callStore, store, shareIdsRef],
  );

  // The dot only ever sits on a screen that is still being shared…
  useEffect(() => {
    store.prune(shareIds);
  }, [store, shareIds]);

  // …and only while the teacher who is pointing is still in the room.
  const connectionKey = peers.map((p) => p.sessionId).join(',');
  useEffect(() => {
    store.dropIfGone(new Set(connectionKey ? connectionKey.split(',') : []));
  }, [store, connectionKey]);

  // Leaving the classroom leaves nothing on any screen.
  useEffect(() => () => store.clear(), [store]);

  // ─── Sending ───────────────────────────────────────────────────────────

  const send = useCallback(
    (wire: PointerWire) => {
      try {
        call.sendAppMessage(pointerPayload(wire), '*');
      } catch {
        // best-effort, like every classroom signal: one that does not go out is
        // just not shown to the others
      }
    },
    [call],
  );

  /** Also shown on the teacher's own screen — at once, not a beat late like everyone
   * else's: Daily does not hand a message back to its sender. */
  const showLocally = useCallback(
    (wire: PointerWire, at?: number) => {
      store.apply({ ...wire, fromSessionId: localSessionRef.current }, shareIdsRef.current, { local: true, at });
    },
    [store, localSessionRef, shareIdsRef],
  );

  /** The line being drawn (its number), while the mouse button is held. */
  const strokeRef = useRef<number | null>(null);
  const strokeCountRef = useRef(0);

  const batcher = useMemo(
    () =>
      new PointerBatcher({
        intervalMs: MOVE_INTERVAL_MS,
        send: ({ sid, stroke, points }) => {
          const last = points[points.length - 1];
          const wire: PointerWire = { type: 'move', sid, x: last.x, y: last.y };
          if (stroke !== null) wire.k = stroke;
          // a lone point is as fresh as a message gets; only a path needs its ages
          if (points.length > 1) wire.p = points.flatMap((point) => [point.x, point.y, point.age]);
          send(wire);
        },
      }),
    [send],
  );
  /** Where the cursor was last seen, for the heartbeat. */
  const lastRef = useRef<{ sid: string; point: Point } | null>(null);

  const move = useCallback(
    (sid: string, point: Point, options: PointerMoveOptions = {}) => {
      const at = options.at ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
      let k: number | null = null;
      if (options.stroke) {
        if (strokeRef.current === null) strokeRef.current = ++strokeCountRef.current;
        k = strokeRef.current;
      } else {
        strokeRef.current = null; // a plain move: any line is over
      }
      lastRef.current = { sid, point };
      const wire: PointerWire = { type: 'move', sid, x: point.x, y: point.y };
      if (k !== null) wire.k = k;
      showLocally(wire, at);
      batcher.push(sid, k, { x: point.x, y: point.y, t: at });
    },
    [showLocally, batcher],
  );

  const click = useCallback(
    (sid: string, point: Point) => {
      lastRef.current = { sid, point };
      batcher.flush(); // the dot is where the click is
      const wire: PointerWire = { type: 'click', sid, x: point.x, y: point.y };
      send(wire);
      showLocally(wire);
    },
    [send, showLocally, batcher],
  );

  const endStroke = useCallback(() => {
    batcher.flush(); // the last of the line goes out before anything else
    strokeRef.current = null;
  }, [batcher]);

  const leave = useCallback(
    (sid: string) => {
      batcher.flush(); // the dot gets to where it left before it hides
      strokeRef.current = null;
      if (lastRef.current?.sid === sid) lastRef.current = null;
      const wire: PointerWire = { type: 'hide', sid };
      send(wire);
      showLocally(wire);
    },
    [send, showLocally, batcher],
  );

  // A still cursor is announced again now and then (see HEARTBEAT_MS).
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      const last = lastRef.current;
      if (!last || !shareIdsRef.current.has(last.sid)) return;
      const wire: PointerWire = { type: 'move', sid: last.sid, x: last.point.x, y: last.point.y };
      if (strokeRef.current !== null) wire.k = strokeRef.current;
      send(wire);
      showLocally(wire);
    }, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [active, send, showLocally, shareIdsRef]);

  // Pointer mode ending — turned off, or because nobody is presenting — takes the
  // dot down everywhere.
  useEffect(() => {
    if (!active) return;
    return () => {
      batcher.cancel();
      strokeRef.current = null;
      lastRef.current = null;
      send({ type: 'off' });
      store.clear();
    };
  }, [active, send, store, batcher]);

  const toggle = useCallback(() => setOn((value) => !value), []);

  return useMemo(
    () => ({ available, active, toggle, store, move, click, endStroke, leave }),
    [available, active, toggle, store, move, click, endStroke, leave],
  );
}

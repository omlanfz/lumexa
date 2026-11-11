// FILE PATH: client/lib/classroom/usePointer.ts
//
// The teacher's Pointer: a dot that follows their cursor over a student's shared
// screen, and a pulse where they click — for everyone in the room.
//
// It is carried by the room's existing app messages (see daily/protocol.ts), like
// raised hands and reactions, and is the TEACHER'S alone: a message is only
// believed when Daily says it came from the room's owner. What is sent is where
// the cursor is on the PICTURE of the shared screen, as a share of its width and
// height (see pointer.ts), so it lands on the same spot everywhere.
//
// Pointer mode belongs to the teacher's browser and starts off. It ends by itself
// when nobody is presenting any more (the presenter stopped or left), and ending it
// — any way — tells the room to take the dot down.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCall, useCallSnapshot, useCallStore, useLocalPeer } from './daily/CallContext';
import { authorizePointer, parseAppPayload, pointerPayload, senderOf } from './daily/protocol';
import type { PointerWire } from './daily/protocol';
import type { Peer } from './daily/peers';
import { HEARTBEAT_MS, MOVE_INTERVAL_MS, MoveThrottle, PointerStore } from './pointer';
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
  move: (sessionId: string, point: Point) => void;
  /** The teacher clicked there. */
  click: (sessionId: string, point: Point) => void;
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

  /** Also shown on the teacher's own screen: Daily does not hand a message back to
   * its sender. */
  const showLocally = useCallback(
    (wire: PointerWire) => {
      store.apply({ ...wire, fromSessionId: localSessionRef.current }, shareIdsRef.current);
    },
    [store, localSessionRef, shareIdsRef],
  );

  const throttle = useMemo(
    () =>
      new MoveThrottle<{ sid: string; point: Point }>({
        intervalMs: MOVE_INTERVAL_MS,
        send: ({ sid, point }) => send({ type: 'move', sid, x: point.x, y: point.y }),
      }),
    [send],
  );
  /** Where the cursor was last seen, for the heartbeat. */
  const lastRef = useRef<{ sid: string; point: Point } | null>(null);

  const move = useCallback(
    (sid: string, point: Point) => {
      lastRef.current = { sid, point };
      showLocally({ type: 'move', sid, x: point.x, y: point.y });
      throttle.push({ sid, point });
    },
    [showLocally, throttle],
  );

  const click = useCallback(
    (sid: string, point: Point) => {
      lastRef.current = { sid, point };
      throttle.flush(); // the dot is where the click is
      const wire: PointerWire = { type: 'click', sid, x: point.x, y: point.y };
      send(wire);
      showLocally(wire);
    },
    [send, showLocally, throttle],
  );

  const leave = useCallback(
    (sid: string) => {
      throttle.cancel();
      if (lastRef.current?.sid === sid) lastRef.current = null;
      const wire: PointerWire = { type: 'hide', sid };
      send(wire);
      showLocally(wire);
    },
    [send, showLocally, throttle],
  );

  // A still cursor is announced again now and then (see HEARTBEAT_MS).
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      const last = lastRef.current;
      if (!last || !shareIdsRef.current.has(last.sid)) return;
      const wire: PointerWire = { type: 'move', sid: last.sid, x: last.point.x, y: last.point.y };
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
      throttle.cancel();
      lastRef.current = null;
      send({ type: 'off' });
      store.clear();
    };
  }, [active, send, store, throttle]);

  const toggle = useCallback(() => setOn((value) => !value), []);

  return useMemo(
    () => ({ available, active, toggle, store, move, click, leave }),
    [available, active, toggle, store, move, click, leave],
  );
}

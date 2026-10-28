// FILE PATH: client/lib/classroom/daily/CallContext.tsx
//
// Puts the Daily call into React: the call object itself, a CallStore that keeps
// what the screen shows (who is in the room, who is speaking, the shared state…),
// and the key this browser uses to tell a message from the server from anyone
// else's. Mount <CallProvider> once the person is in the meeting, around the
// whole classroom; everything below reads it through the hooks here.

'use client';

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import { CallStore } from './store';
import type { CallSnapshot } from './store';
import { groupPeople } from '../people';
import type { Person } from '../people';
import type { Peer } from './peers';

interface CallContextValue {
  call: DailyCall;
  store: CallStore;
  eventKey: string;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({
  call,
  eventKey,
  children,
}: {
  call: DailyCall;
  /** From this person's join response: proves a message came from the server. */
  eventKey: string;
  children: ReactNode;
}) {
  // The store reads the call when it is made and listens to it only while it is
  // attached, so React can attach it in an effect and detach it in the cleanup —
  // which it does twice in development — and the same store keeps working.
  const store = useMemo(() => new CallStore(call), [call]);
  useEffect(() => {
    store.attach();
    return () => store.detach();
  }, [store]);

  const value = useMemo(() => ({ call, store, eventKey }), [call, store, eventKey]);
  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

function useCallContext(): CallContextValue {
  const value = useContext(CallContext);
  if (!value) throw new Error('This component must be inside <CallProvider>.');
  return value;
}

/** The Daily call object: for sending (app messages) and for the controls. */
export function useCall(): DailyCall {
  return useCallContext().call;
}

export function useCallStore(): CallStore {
  return useCallContext().store;
}

/** The key that proves a message came from the server. */
export function useEventKey(): string {
  return useCallContext().eventKey;
}

/** Everything the screen knows about the call. Re-renders when any of it changes. */
export function useCallSnapshot(): CallSnapshot {
  const { store } = useCallContext();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** Every connection in the room (an admin observer's included — see usePeople
 * for who is a person in the class). */
export function usePeers(): Peer[] {
  return useCallSnapshot().peers;
}

/** This browser's own connection. */
export function useLocalPeer(): Peer | null {
  const { peers, localSessionId } = useCallSnapshot();
  return useMemo(() => peers.find((p) => p.sessionId === localSessionId) ?? null, [peers, localSessionId]);
}

/** The people in the class, one per person however many devices they use. */
export function usePeople(): Person[] {
  const { peers, localUserId } = useCallSnapshot();
  return useMemo(() => groupPeople(peers, localUserId), [peers, localUserId]);
}

/** Whether any of these connections is speaking — re-renders only when that
 * answer changes, not whenever anyone's level moves. */
export function useIsSpeaking(sessionIds: string[]): boolean {
  const { store } = useCallContext();
  const key = sessionIds.join(',');
  return useSyncExternalStore(
    store.subscribe,
    () => {
      const { speaking } = store.getSnapshot();
      return key.length > 0 && key.split(',').some((id) => speaking.has(id));
    },
    () => false,
  );
}

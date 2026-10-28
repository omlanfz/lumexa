// FILE PATH: client/lib/classroom/useClassroomControls.ts
//
// Ephemeral, best-effort classroom signals — raised hands, quick reactions, and
// the teacher's spotlight — sent as Daily app messages. None of this is persisted
// server-side; it's UI courtesy state, not an access control mechanism
// (moderation — muting, removing — goes through Daily's owner controls and the
// authenticated REST endpoints instead: see ./daily/moderation.ts and ./api.ts).
//
// Everything here is keyed by PERSON (their user id), not by connection: a student
// on two devices has one raised hand, and lowering it on either device lowers it
// on both. And a message never decides who it is about: a raised hand or a
// reaction is the sender's, and only the teacher can lower a hand or spotlight
// someone (see ./daily/protocol.ts).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCall, useCallStore, useLocalPeer } from './daily/CallContext';
import { authorizeControl, controlPayload, parseAppPayload, senderOf } from './daily/protocol';
import type { ControlWire } from './daily/protocol';
import { claimsToBeServer } from './serverEvents';
import type { ControlMessage } from './types';

export interface Reaction {
  id: string;
  emoji: string;
  /** The person who sent it (their user id). */
  userId: string;
  at: number;
}

const REACTION_TTL_MS = 4000;

export function useClassroomControls() {
  const call = useCall();
  const store = useCallStore();
  const local = useLocalPeer();
  const localKey = local?.userId ?? '';
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [spotlightUserId, setSpotlightState] = useState<string | null>(null);
  const reactionCounter = useRef(0);

  const apply = useCallback((msg: ControlMessage) => {
    switch (msg.type) {
      case 'raise-hand':
        setRaisedHands((prev) => ({ ...prev, [msg.userId]: msg.raised }));
        break;
      case 'lower-hand':
        setRaisedHands((prev) => ({ ...prev, [msg.userId]: false }));
        break;
      case 'reaction': {
        reactionCounter.current += 1;
        const id = `${msg.userId}-${reactionCounter.current}`;
        setReactions((prev) => [...prev, { id, emoji: msg.emoji, userId: msg.userId, at: Date.now() }]);
        break;
      }
      case 'spotlight':
        setSpotlightState(msg.userId);
        break;
    }
  }, []);

  // What everyone else sends — never taken at its word (see ./daily/protocol.ts).
  useEffect(
    () =>
      store.onMessage(({ data, from }) => {
        if (!from || claimsToBeServer(data)) return;
        const payload = parseAppPayload(data);
        if (!payload || payload.kind !== 'control') return;
        const msg = authorizeControl(payload.control, senderOf(from));
        if (msg) apply(msg);
      }),
    [store, apply],
  );

  // Reactions expire on their own so the floating-emoji layer stays small.
  useEffect(() => {
    if (reactions.length === 0) return;
    const id = setTimeout(() => {
      const cutoff = Date.now() - REACTION_TTL_MS;
      setReactions((prev) => prev.filter((r) => r.at > cutoff));
    }, REACTION_TTL_MS);
    return () => clearTimeout(id);
  }, [reactions]);

  const broadcast = useCallback(
    (control: ControlWire) => {
      try {
        call.sendAppMessage(controlPayload(control), '*');
      } catch {
        // best-effort: a signal that does not go out is just not shown to others
      }
    },
    [call],
  );

  const setOwnHandRaised = useCallback(
    (raised: boolean) => {
      setRaisedHands((prev) => ({ ...prev, [localKey]: raised }));
      broadcast({ type: 'raise-hand', raised });
    },
    [broadcast, localKey],
  );

  const lowerHand = useCallback(
    (userId: string) => {
      setRaisedHands((prev) => ({ ...prev, [userId]: false }));
      broadcast({ type: 'lower-hand', userId });
    },
    [broadcast],
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      reactionCounter.current += 1;
      const id = `${localKey}-${reactionCounter.current}`;
      setReactions((prev) => [...prev, { id, emoji, userId: localKey, at: Date.now() }]);
      broadcast({ type: 'reaction', emoji });
    },
    [broadcast, localKey],
  );

  const setSpotlight = useCallback(
    (userId: string | null) => {
      setSpotlightState(userId);
      broadcast({ type: 'spotlight', userId });
    },
    [broadcast],
  );

  return {
    raisedHands,
    reactions,
    spotlightUserId,
    setOwnHandRaised,
    lowerHand,
    sendReaction,
    setSpotlight,
  };
}

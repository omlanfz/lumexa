// FILE PATH: client/lib/classroom/useClassroomControls.ts
//
// Ephemeral, best-effort classroom signals — raised hands, quick reactions,
// and teacher spotlight — broadcast over LiveKit's data channel. None of
// this is persisted server-side; it's UI courtesy state, not an access
// control mechanism (moderation actions like mute/remove go through the
// authenticated REST endpoints in ./api.ts instead).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataChannel, useLocalParticipant } from '@livekit/components-react';
import { CLASSROOM_CONTROL_TOPIC, ControlMessage } from './types';

export interface Reaction {
  id: string;
  emoji: string;
  identity: string;
  at: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const REACTION_TTL_MS = 4000;

export function useClassroomControls() {
  const { localParticipant } = useLocalParticipant();
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [spotlightIdentity, setSpotlightIdentityState] = useState<string | null>(null);
  const reactionCounter = useRef(0);

  const handleIncoming = useCallback((raw: Uint8Array) => {
    let msg: ControlMessage;
    try {
      msg = JSON.parse(decoder.decode(raw));
    } catch {
      return;
    }
    switch (msg.type) {
      case 'raise-hand':
        setRaisedHands((prev) => ({ ...prev, [msg.identity]: msg.raised }));
        break;
      case 'lower-hand':
        setRaisedHands((prev) => ({ ...prev, [msg.identity]: false }));
        break;
      case 'reaction': {
        reactionCounter.current += 1;
        const id = `${msg.identity}-${reactionCounter.current}`;
        setReactions((prev) => [...prev, { id, emoji: msg.emoji, identity: msg.identity, at: Date.now() }]);
        break;
      }
      case 'spotlight':
        setSpotlightIdentityState(msg.identity);
        break;
    }
  }, []);

  const { send } = useDataChannel(CLASSROOM_CONTROL_TOPIC, (m) => handleIncoming(m.payload));

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
    (msg: ControlMessage) => {
      send(encoder.encode(JSON.stringify(msg)), { reliable: true });
    },
    [send],
  );

  const setOwnHandRaised = useCallback(
    (raised: boolean) => {
      const identity = localParticipant.identity;
      setRaisedHands((prev) => ({ ...prev, [identity]: raised }));
      broadcast({ type: 'raise-hand', raised, identity });
    },
    [broadcast, localParticipant.identity],
  );

  const lowerHand = useCallback(
    (identity: string) => {
      setRaisedHands((prev) => ({ ...prev, [identity]: false }));
      broadcast({ type: 'lower-hand', identity });
    },
    [broadcast],
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      const identity = localParticipant.identity;
      reactionCounter.current += 1;
      const id = `${identity}-${reactionCounter.current}`;
      setReactions((prev) => [...prev, { id, emoji, identity, at: Date.now() }]);
      broadcast({ type: 'reaction', emoji, identity });
    },
    [broadcast, localParticipant.identity],
  );

  const setSpotlight = useCallback(
    (identity: string | null) => {
      setSpotlightIdentityState(identity);
      broadcast({ type: 'spotlight', identity });
    },
    [broadcast],
  );

  return {
    raisedHands,
    reactions,
    spotlightIdentity,
    setOwnHandRaised,
    lowerHand,
    sendReaction,
    setSpotlight,
  };
}

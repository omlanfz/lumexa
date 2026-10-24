// FILE PATH: client/lib/classroom/useClassroomControls.ts
//
// Ephemeral, best-effort classroom signals — raised hands, quick reactions,
// and teacher spotlight — broadcast over LiveKit's data channel. None of
// this is persisted server-side; it's UI courtesy state, not an access
// control mechanism (moderation actions like mute/remove go through the
// authenticated REST endpoints in ./api.ts instead).
//
// Everything here is keyed by PERSON (see ./identity.ts), not by connection: a
// student on two devices has one raised hand, and lowering it on either device
// lowers it on both. The `identity` in each message is a person key; a full
// `<userId>~<deviceId>` identity from an older client is reduced to one.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataChannel, useLocalParticipant } from '@livekit/components-react';
import { CLASSROOM_CONTROL_TOPIC, ControlMessage } from './types';
import { personKey } from './identity';

export interface Reaction {
  id: string;
  emoji: string;
  identity: string;
  at: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const REACTION_TTL_MS = 4000;

/** Optional callback fired when THIS participant is told (over the data
 * channel) that the teacher has forcibly stopped their screen share — see
 * ClassroomService.stopParticipantScreenShare. Server-side mute already
 * cuts the stream to everyone else; this is what lets the presenter's own
 * client stop the capture and flip their local UI back off cleanly. */
export function useClassroomControls(onForceStopScreenShare?: () => void) {
  const { localParticipant } = useLocalParticipant();
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [spotlightIdentity, setSpotlightIdentityState] = useState<string | null>(null);
  const reactionCounter = useRef(0);
  const localKey = personKey(localParticipant.identity);
  const localKeyRef = useRef(localKey);
  const onForceStopScreenShareRef = useRef(onForceStopScreenShare);
  useEffect(() => {
    localKeyRef.current = localKey;
    onForceStopScreenShareRef.current = onForceStopScreenShare;
  });

  const handleIncoming = useCallback((raw: Uint8Array) => {
    let msg: ControlMessage;
    try {
      msg = JSON.parse(decoder.decode(raw));
    } catch {
      return;
    }
    switch (msg.type) {
      case 'raise-hand':
        setRaisedHands((prev) => ({ ...prev, [personKey(msg.identity)]: msg.raised }));
        break;
      case 'lower-hand':
        setRaisedHands((prev) => ({ ...prev, [personKey(msg.identity)]: false }));
        break;
      case 'reaction': {
        reactionCounter.current += 1;
        const who = personKey(msg.identity);
        const id = `${who}-${reactionCounter.current}`;
        setReactions((prev) => [...prev, { id, emoji: msg.emoji, identity: who, at: Date.now() }]);
        break;
      }
      case 'spotlight':
        setSpotlightIdentityState(msg.identity === null ? null : personKey(msg.identity));
        break;
      case 'stop-screen-share':
        // The teacher stopped this PERSON's sharing: every device of theirs stops.
        if (personKey(msg.identity) === localKeyRef.current) onForceStopScreenShareRef.current?.();
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
      setRaisedHands((prev) => ({ ...prev, [localKey]: raised }));
      broadcast({ type: 'raise-hand', raised, identity: localKey });
    },
    [broadcast, localKey],
  );

  const lowerHand = useCallback(
    (identity: string) => {
      const who = personKey(identity);
      setRaisedHands((prev) => ({ ...prev, [who]: false }));
      broadcast({ type: 'lower-hand', identity: who });
    },
    [broadcast],
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      reactionCounter.current += 1;
      const id = `${localKey}-${reactionCounter.current}`;
      setReactions((prev) => [...prev, { id, emoji, identity: localKey, at: Date.now() }]);
      broadcast({ type: 'reaction', emoji, identity: localKey });
    },
    [broadcast, localKey],
  );

  const setSpotlight = useCallback(
    (identity: string | null) => {
      const who = identity === null ? null : personKey(identity);
      setSpotlightIdentityState(who);
      broadcast({ type: 'spotlight', identity: who });
    },
    [broadcast],
  );

  const notifyStopScreenShare = useCallback(
    (identity: string) => {
      broadcast({ type: 'stop-screen-share', identity: personKey(identity) });
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
    notifyStopScreenShare,
  };
}

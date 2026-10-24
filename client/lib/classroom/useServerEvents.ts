// FILE PATH: client/lib/classroom/useServerEvents.ts
//
// Listens for the messages the SERVER sends this participant (a badge
// celebration; being told why they are being removed). Only messages with no
// sending participant are accepted: on this topic the server is the one and
// only speaker, so nothing another participant sends can ever pass for it.

import { useEffect, useRef } from 'react';
import { RoomEvent, type DataPacket_Kind, type RemoteParticipant } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { parseServerEvent, SERVER_EVENT_TOPIC, type ServerEvent } from './serverEvents';

export function useServerEvents(onEvent: (event: ServerEvent) => void): void {
  const room = useRoomContext();
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  });

  useEffect(() => {
    const onData = (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      _kind?: DataPacket_Kind,
      topic?: string,
    ) => {
      if (topic !== SERVER_EVENT_TOPIC) return;
      if (participant) return; // sent by a participant, not the server
      const event = parseServerEvent(payload);
      if (event) handlerRef.current(event);
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);
}

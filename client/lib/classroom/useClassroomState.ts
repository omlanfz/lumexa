// FILE PATH: client/lib/classroom/useClassroomState.ts
//
// Reads the persisted, shared classroom state (chat lock, "students muted"
// policy) from the LiveKit room's JSON metadata and keeps it live via the
// RoomMetadataChanged event. Teacher writes go through the authenticated
// PATCH /classroom/:room/state endpoint (see ./api.ts) — clients never
// write room metadata directly, they don't hold the credentials for it.
//
// Built on useSyncExternalStore since the Room's metadata is exactly that —
// state owned by an external system (the LiveKit connection), not React.

import { useCallback, useSyncExternalStore } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { ClassroomState, parseClassroomState } from './types';
import { updateClassroomState } from './api';

function subscribe(room: Room, onChange: () => void) {
  room.on(RoomEvent.RoomMetadataChanged, onChange);
  return () => {
    room.off(RoomEvent.RoomMetadataChanged, onChange);
  };
}

export function useClassroomState(roomName: string, isTeacher: boolean) {
  const room = useRoomContext();
  const state = useSyncExternalStore(
    useCallback((onChange) => subscribe(room, onChange), [room]),
    () => room.metadata,
  );

  const patch = async (next: ClassroomState) => {
    if (!isTeacher) return;
    // The server call updates the room's real metadata, which fires
    // RoomMetadataChanged for every participant (including this one) —
    // that round trip is what actually updates `state` above.
    try {
      await updateClassroomState(roomName, next);
    } catch {
      // Transient failure — the toggle just won't move; nothing to roll back
      // since we never applied it optimistically.
    }
  };

  return { state: parseClassroomState(state), patch };
}

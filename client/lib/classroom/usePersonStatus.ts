// FILE PATH: client/lib/classroom/usePersonStatus.ts
//
// What a PERSON is doing, across all the devices they are connected from: is
// any microphone on, any camera on, any screen being shared, is any speaking.
// A student with the camera on their phone and the microphone on their laptop
// is one student with both on. Re-renders when any of their devices changes.

import { useEffect, useReducer } from 'react';
import { ParticipantEvent, type Participant } from 'livekit-client';

const STATUS_EVENTS = [
  ParticipantEvent.TrackMuted,
  ParticipantEvent.TrackUnmuted,
  ParticipantEvent.TrackPublished,
  ParticipantEvent.TrackUnpublished,
  ParticipantEvent.LocalTrackPublished,
  ParticipantEvent.LocalTrackUnpublished,
  ParticipantEvent.IsSpeakingChanged,
] as const;

export interface PersonStatus {
  micEnabled: boolean;
  cameraEnabled: boolean;
  sharingScreen: boolean;
  speaking: boolean;
}

export function usePersonStatus(peers: Participant[]): PersonStatus {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const watched = peers.map((p) => p.identity).join('|');

  useEffect(() => {
    const onChange = () => rerender();
    for (const p of peers) {
      for (const event of STATUS_EVENTS) p.on(event, onChange as never);
    }
    return () => {
      for (const p of peers) {
        for (const event of STATUS_EVENTS) p.off(event, onChange as never);
      }
    };
    // `peers` is a new array every render; the identities are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched]);

  return {
    micEnabled: peers.some((p) => p.isMicrophoneEnabled),
    cameraEnabled: peers.some((p) => p.isCameraEnabled),
    sharingScreen: peers.some((p) => p.isScreenShareEnabled),
    speaking: peers.some((p) => p.isSpeaking),
  };
}

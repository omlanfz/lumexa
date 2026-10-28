// FILE PATH: client/lib/classroom/daily/testing.ts
//
// Builders for the node tests: Daily participants and tracks without Daily.

import type { ParticipantLike, TrackStateLike } from './peers.ts';

export function fakeTrack(id: string, kind: 'audio' | 'video' = 'audio', readyState: 'live' | 'ended' = 'live') {
  return { id, kind, readyState, enabled: true } as unknown as MediaStreamTrack;
}

export const OFF: TrackStateLike = { state: 'off' };

/** A track that is on, carrying `track`. */
export function playing(track: MediaStreamTrack): TrackStateLike {
  return { state: 'playable', persistentTrack: track, track };
}

export function participant(
  sessionId: string,
  over: Partial<Omit<ParticipantLike, 'tracks'>> & { tracks?: Partial<ParticipantLike['tracks']> } = {},
): ParticipantLike {
  const { tracks, ...rest } = over;
  return {
    session_id: sessionId,
    user_id: `user-${sessionId}`,
    user_name: `Person ${sessionId} (Student)`,
    local: false,
    owner: false,
    joined_at: new Date(1_700_000_000_000),
    permissions: { canSend: true },
    tracks: { audio: OFF, video: OFF, screenAudio: OFF, screenVideo: OFF, ...tracks },
    ...rest,
  };
}

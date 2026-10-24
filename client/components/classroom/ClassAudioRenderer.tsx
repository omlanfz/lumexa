// FILE PATH: client/components/classroom/ClassAudioRenderer.tsx
//
// Plays the other people's audio — LiveKit's own <RoomAudioRenderer> with one
// difference. A person in the classroom on two devices (say microphone on the
// phone, everything else on the laptop) would otherwise hear THEMSELVES from
// their other device: their own voice, delayed, out of the laptop's speakers.
// So audio from any of your own devices is never played back to you.

'use client';

import { Track } from 'livekit-client';
import { AudioTrack, useTracks } from '@livekit/components-react';
import { getTrackReferenceId } from '@livekit/components-core';
import { samePerson } from '@/lib/classroom/identity';

export default function ClassAudioRenderer({ selfIdentity }: { selfIdentity: string }) {
  const tracks = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio, Track.Source.Unknown], {
    updateOnlyOn: [],
    onlySubscribed: true,
  }).filter(
    (ref) =>
      !ref.participant.isLocal &&
      !samePerson(ref.participant.identity, selfIdentity) &&
      ref.publication.kind === Track.Kind.Audio,
  );

  return (
    <div style={{ display: 'none' }}>
      {tracks.map((trackRef) => (
        <AudioTrack key={getTrackReferenceId(trackRef)} trackRef={trackRef} />
      ))}
    </div>
  );
}

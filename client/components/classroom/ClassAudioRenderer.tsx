// FILE PATH: client/components/classroom/ClassAudioRenderer.tsx
//
// Plays the other people's audio — their microphones, and the sound of a screen
// they share. (Daily's call object does not play anything itself; the classroom
// does, so it can choose the speaker and leave out what must not be heard.) One
// difference from a plain "play every track": a person in the classroom on two
// devices (say microphone on the phone, everything else on the laptop) would
// otherwise hear THEMSELVES from their other device — their own voice, delayed,
// out of the laptop's speakers. So audio from any of your own devices is never
// played back to you.

'use client';

import { useCallSnapshot } from '@/lib/classroom/daily/CallContext';
import { AudioView } from './MediaViews';

export default function ClassAudioRenderer() {
  const { peers, localUserId } = useCallSnapshot();
  const tracks: { key: string; track: MediaStreamTrack }[] = [];
  for (const peer of peers) {
    if (peer.isLocal || peer.userId === localUserId) continue;
    if (peer.audio.on && peer.audio.track) tracks.push({ key: `${peer.sessionId}:mic`, track: peer.audio.track });
    if (peer.screenAudio.on && peer.screenAudio.track) {
      tracks.push({ key: `${peer.sessionId}:screen`, track: peer.screenAudio.track });
    }
  }

  return (
    <div style={{ display: 'none' }} data-testid="class-audio">
      {tracks.map(({ key, track }) => (
        <AudioView key={`${key}:${track.id}`} track={track} />
      ))}
    </div>
  );
}

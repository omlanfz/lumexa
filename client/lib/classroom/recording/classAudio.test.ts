import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectClassAudioTracks,
  diffTrackIds,
  type ClassAudioSource,
  type ParticipantAudio,
} from './classAudio.ts';

const track = (id: string, state: 'live' | 'ended' = 'live', kind = 'audio') =>
  ({ id, kind, readyState: state }) as unknown as MediaStreamTrack;

const participant = (...tracks: (MediaStreamTrack | null)[]): ParticipantAudio => ({
  audioTrackPublications: new Map(
    tracks.map((t, i) => [`pub${i}`, { track: t ? { mediaStreamTrack: t } : undefined }]),
  ),
});

const room = (local: ParticipantAudio, remote: Record<string, ParticipantAudio>): ClassAudioSource => ({
  localParticipant: local,
  remoteParticipants: new Map(Object.entries(remote)),
});

test('the class’s audio is the teacher’s own microphone and every student’s', () => {
  const r = room(participant(track('teacher-mic')), {
    ada: participant(track('ada-mic')),
    ben: participant(track('ben-mic')),
  });
  assert.deepEqual(collectClassAudioTracks(r).map((t) => t.id), ['teacher-mic', 'ada-mic', 'ben-mic']);
});

test('shared-screen audio counts too — it is part of what the class hears', () => {
  const r = room(participant(track('mic'), track('screen-audio')), {
    ada: participant(track('ada-mic'), track('ada-screen-audio')),
  });
  assert.deepEqual(collectClassAudioTracks(r).map((t) => t.id), ['mic', 'screen-audio', 'ada-mic', 'ada-screen-audio']);
});

test('a track that is not subscribed yet, or has ended, is left out', () => {
  const r = room(participant(track('mic')), {
    pending: participant(null),
    gone: participant(track('gone-mic', 'ended')),
    here: participant(track('here-mic')),
  });
  assert.deepEqual(collectClassAudioTracks(r).map((t) => t.id), ['mic', 'here-mic']);
});

test('each track is mixed once, however many places it is listed', () => {
  const shared = track('same');
  const r = room(participant(shared), { dup: participant(shared, shared) });
  assert.deepEqual(collectClassAudioTracks(r).map((t) => t.id), ['same']);
});

test('only audio tracks are ever mixed', () => {
  const r = room(participant(track('mic'), track('cam', 'live', 'video')), {});
  assert.deepEqual(collectClassAudioTracks(r).map((t) => t.id), ['mic']);
});

test('an empty class has nothing to mix', () => {
  assert.deepEqual(collectClassAudioTracks(room(participant(), {})), []);
});

test('the mix changes by exactly what changed: a student arrives, another leaves', () => {
  assert.deepEqual(diffTrackIds(['t', 'a'], ['t', 'a', 'b']), { add: ['b'], remove: [] });
  assert.deepEqual(diffTrackIds(['t', 'a', 'b'], ['t', 'b']), { add: [], remove: ['a'] });
  assert.deepEqual(diffTrackIds(['t', 'a'], ['t', 'c']), { add: ['c'], remove: ['a'] });
  assert.deepEqual(diffTrackIds(['t'], ['t']), { add: [], remove: [] });
  assert.deepEqual(diffTrackIds([], ['x', 'y']), { add: ['x', 'y'], remove: [] });
  assert.deepEqual(diffTrackIds(['x', 'y'], []), { add: [], remove: ['x', 'y'] });
});

test('a microphone that was switched (a new track with a new id) replaces the old one', () => {
  assert.deepEqual(diffTrackIds(['mic-old'], ['mic-new']), { add: ['mic-new'], remove: ['mic-old'] });
});

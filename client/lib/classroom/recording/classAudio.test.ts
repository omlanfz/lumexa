import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectClassAudioTracks,
  diffTrackIds,
  type AudioTrackState,
  type ClassAudioSource,
  type ParticipantAudio,
} from './classAudio.ts';

const track = (id: string, state: 'live' | 'ended' = 'live', kind = 'audio') =>
  ({ id, kind, readyState: state }) as unknown as MediaStreamTrack;

/** Daily's track state for a track that is flowing. */
const flowing = (t: MediaStreamTrack): AudioTrackState => ({ persistentTrack: t, track: t });

const participant = (mic?: AudioTrackState, screenAudio?: AudioTrackState): ParticipantAudio => ({
  tracks: { audio: mic, screenAudio },
});

const call = (local: ParticipantAudio, remote: Record<string, ParticipantAudio> = {}): ClassAudioSource => ({
  participants: () => ({ local, ...remote }),
});

test('the class’s audio is the teacher’s own microphone and every student’s', () => {
  const c = call(participant(flowing(track('teacher-mic'))), {
    ada: participant(flowing(track('ada-mic'))),
    ben: participant(flowing(track('ben-mic'))),
  });
  assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['teacher-mic', 'ada-mic', 'ben-mic']);
});

test('shared-screen audio counts too — it is part of what the class hears', () => {
  const c = call(participant(flowing(track('mic')), flowing(track('screen-audio'))), {
    ada: participant(flowing(track('ada-mic')), flowing(track('ada-screen-audio'))),
  });
  assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['mic', 'screen-audio', 'ada-mic', 'ada-screen-audio']);
});

test('a track Daily has not delivered yet, or that has ended, is left out', () => {
  const c = call(participant(flowing(track('mic'))), {
    pending: participant({}), // subscribed, nothing yet
    absent: participant(undefined), // no microphone at all
    gone: participant(flowing(track('gone-mic', 'ended'))),
    here: participant(flowing(track('here-mic'))),
  });
  assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['mic', 'here-mic']);
});

test('the persistent track is used while Daily is still bringing the track up or it has stalled — silence at worst', () => {
  for (const state of ['loading', 'interrupted', 'sendable', 'playable', undefined]) {
    const c = call(participant({ state, persistentTrack: track('t') }));
    assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['t'], String(state));
  }
});

test('a microphone Daily says is off is NOT recorded, even though its track is still live underneath', () => {
  // Muting keeps the microphone warm: the track lives on. It must still not be heard.
  const mutedTeacher: AudioTrackState = { state: 'off', persistentTrack: track('teacher-mic') };
  const c = call(participant(mutedTeacher), {
    ada: participant({ state: 'off', persistentTrack: track('ada-mic') }), // muted by the teacher
    ben: participant({ state: 'off', persistentTrack: track('ben-mic') }), // not allowed to send audio
    cat: participant(flowing(track('cat-mic'))),
  });
  assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['cat-mic']);
});

test('a blocked microphone (no device, no permission) is not in the mix either', () => {
  const c = call(participant({ state: 'blocked', persistentTrack: track('mic') }));
  assert.deepEqual(collectClassAudioTracks(c), []);
});

test('the sound of a screen share is in the mix only while the share is on', () => {
  const sharing = call(participant(flowing(track('mic')), { state: 'playable', persistentTrack: track('share-audio') }));
  assert.deepEqual(collectClassAudioTracks(sharing).map((t) => t.id), ['mic', 'share-audio']);
  const stopped = call(participant(flowing(track('mic')), { state: 'off', persistentTrack: track('share-audio') }));
  assert.deepEqual(collectClassAudioTracks(stopped).map((t) => t.id), ['mic']);
});

test('muting and unmuting takes a microphone out of the mix and back in, as the call changes', () => {
  const mic = track('mic');
  const me: ParticipantAudio = participant({ state: 'playable', persistentTrack: mic });
  const c: ClassAudioSource = { participants: () => ({ local: me }) };
  assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['mic']);
  me.tracks.audio = { state: 'off', persistentTrack: mic };
  assert.deepEqual(collectClassAudioTracks(c), []);
  me.tracks.audio = { state: 'playable', persistentTrack: mic };
  assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['mic']);
});

test('a track that is only offered as the playable one still counts', () => {
  const c = call(participant({ track: track('only-playable') }));
  assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['only-playable']);
});

test('each track is mixed once, however many places it is listed', () => {
  const shared = track('same');
  const c = call(participant(flowing(shared)), { dup: participant(flowing(shared), flowing(shared)) });
  assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['same']);
});

test('only audio tracks are ever mixed', () => {
  const c = call(participant(flowing(track('mic')), flowing(track('cam', 'live', 'video'))));
  assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['mic']);
});

test('an empty class has nothing to mix', () => {
  assert.deepEqual(collectClassAudioTracks(call(participant())), []);
  assert.deepEqual(collectClassAudioTracks({ participants: () => ({}) as Record<string, ParticipantAudio> }), []);
});

test('it reads the call as it is now: someone joining later is in the next read', () => {
  const people: Record<string, ParticipantAudio> = { local: participant(flowing(track('mic'))) };
  const c: ClassAudioSource = { participants: () => people };
  assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['mic']);
  people.ada = participant(flowing(track('ada-mic')));
  assert.deepEqual(collectClassAudioTracks(c).map((t) => t.id), ['mic', 'ada-mic']);
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

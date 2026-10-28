import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePeers, toPeer, toPeers } from './peers.ts';
import { OFF, fakeTrack, participant, playing } from './testing.ts';

test('a connection becomes a peer: person, session, name without the suffix, role from the owner flag', () => {
  const peer = toPeer(
    participant('s1', {
      user_id: 'u-ada',
      user_name: 'Ada Lovelace (Student)',
      joined_at: new Date('2026-11-02T10:00:00Z'),
    }),
  );
  assert.equal(peer.sessionId, 's1');
  assert.equal(peer.userId, 'u-ada');
  assert.equal(peer.name, 'Ada Lovelace (Student)');
  assert.equal(peer.displayName, 'Ada Lovelace');
  assert.equal(peer.role, 'STUDENT');
  assert.equal(peer.isOwner, false);
  assert.equal(peer.joinedAtMs, Date.parse('2026-11-02T10:00:00Z'));
});

test('the teacher is the room’s owner — a name that says "(Teacher)" does not make anyone one', () => {
  const owner = toPeer(participant('t', { owner: true, user_name: 'Ms Karim (Teacher)' }));
  assert.equal(owner.role, 'TEACHER');
  assert.equal(owner.isOwner, true);
  const impostor = toPeer(participant('s', { owner: false, user_name: 'Sneaky (Teacher)' }));
  assert.equal(impostor.role, 'STUDENT');
  assert.equal(impostor.isOwner, false);
});

test('an admin observer is recognised by its user id', () => {
  assert.equal(toPeer(participant('o', { user_id: 'admin-observer-170' })).isObserver, true);
  assert.equal(toPeer(participant('s', { user_id: 'u1' })).isObserver, false);
});

test('a participant with no user id falls back to its session id, and a name always has something to show', () => {
  const peer = toPeer(participant('s9', { user_id: '', user_name: '' }));
  assert.equal(peer.userId, 's9');
  assert.equal(peer.displayName, 'Guest');
});

test('a track is on unless it is off or blocked, and carries the media Daily has for it', () => {
  const mic = fakeTrack('mic');
  const cam = fakeTrack('cam', 'video');
  const peer = toPeer(
    participant('s1', {
      tracks: {
        audio: playing(mic),
        video: { state: 'blocked', persistentTrack: cam },
        screenVideo: { state: 'loading' },
        screenAudio: { state: 'interrupted' },
      },
    }),
  );
  assert.equal(peer.audio.on, true);
  assert.equal(peer.audio.track, mic);
  assert.equal(peer.video.on, false);
  assert.equal(peer.video.track, cam);
  assert.equal(peer.screenVideo.on, true);
  assert.equal(peer.screenVideo.track, null);
  assert.equal(peer.screenAudio.on, true);
  assert.equal(toPeer(participant('s2')).audio.on, false);
  assert.equal(toPeer(participant('s3', { tracks: { audio: undefined } })).audio.on, false);
});

test('the persistent track is preferred over the playable one, and either will do', () => {
  const a = fakeTrack('a');
  const b = fakeTrack('b');
  assert.equal(toPeer(participant('s', { tracks: { audio: { state: 'playable', persistentTrack: a, track: b } } })).audio.track, a);
  assert.equal(toPeer(participant('s', { tracks: { audio: { state: 'playable', track: b } } })).audio.track, b);
});

test('a microphone the teacher turned off is told apart from one switched off by its owner', () => {
  const locked = toPeer(
    participant('s', {
      permissions: { canSend: new Set(['video', 'screenVideo']) },
      tracks: { audio: { state: 'off', off: { byCanSendPermission: true } } },
    }),
  );
  assert.equal(locked.micLocked, true);
  assert.equal(locked.audio.lockedByTeacher, true);
  assert.equal(locked.audio.on, false);

  const muted = toPeer(participant('s', { tracks: { audio: { state: 'off', off: { byUser: true } } } }));
  assert.equal(muted.micLocked, false);
  assert.equal(muted.audio.lockedByTeacher, false);
});

test('the right to send a microphone: everything, a set that has it, a set that lacks it, nothing', () => {
  const lockedFor = (canSend: ReadonlySet<string> | boolean | undefined) =>
    toPeer(participant('s', { permissions: { canSend } })).micLocked;
  assert.equal(lockedFor(true), false);
  assert.equal(lockedFor(undefined), false);
  assert.equal(lockedFor(new Set(['audio', 'video'])), false);
  assert.equal(lockedFor(new Set(['video', 'screenVideo'])), true);
  assert.equal(lockedFor(false), true);
  assert.equal(toPeer({ ...participant('s'), permissions: undefined }).micLocked, false);
});

test('peers come out with you first, then in the order people joined', () => {
  const peers = toPeers({
    a: participant('a', { joined_at: new Date(3000) }),
    local: participant('me', { local: true, joined_at: new Date(5000) }),
    b: participant('b', { joined_at: new Date(1000) }),
    c: participant('c', { joined_at: new Date(1000) }),
  });
  assert.deepEqual(peers.map((p) => p.sessionId), ['me', 'b', 'c', 'a']);
});

test('network quality is what Daily reports, unknown when it says nothing', () => {
  assert.equal(toPeer(participant('s', { networkQualityState: 'bad' })).quality, 'bad');
  assert.equal(toPeer(participant('s')).quality, 'unknown');
});

test('reconciling keeps the very same objects — and array — when nothing changed', () => {
  const first = toPeers({ a: participant('a'), b: participant('b') });
  const again = toPeers({ a: participant('a'), b: participant('b') });
  assert.equal(reconcilePeers(first, again), first);
});

test('reconciling replaces only what changed', () => {
  const first = toPeers({ a: participant('a'), b: participant('b') });
  const mic = fakeTrack('mic-b');
  const next = toPeers({ a: participant('a'), b: participant('b', { tracks: { audio: playing(mic) } }) });
  const merged = reconcilePeers(first, next);
  assert.notEqual(merged, first);
  const byId = (peers: typeof first, id: string) => peers.find((p) => p.sessionId === id)!;
  assert.equal(byId(merged, 'a'), byId(first, 'a'));
  assert.notEqual(byId(merged, 'b'), byId(first, 'b'));
  assert.equal(byId(merged, 'b').audio.track, mic);
});

test('reconciling follows people arriving and leaving', () => {
  const first = toPeers({ a: participant('a'), b: participant('b') });
  assert.deepEqual(reconcilePeers(first, toPeers({ a: participant('a') })).map((p) => p.sessionId), ['a']);
  assert.deepEqual(
    reconcilePeers(first, toPeers({ a: participant('a'), b: participant('b'), c: participant('c') })).map((p) => p.sessionId),
    ['a', 'b', 'c'],
  );
});

test('a new track on the same connection is a change; the same track is not', () => {
  const a1 = toPeers({ a: participant('a', { tracks: { video: playing(fakeTrack('cam-1', 'video')) } }) });
  const same = toPeers({ a: participant('a', { tracks: { video: playing(fakeTrack('cam-1', 'video')) } }) });
  const swapped = toPeers({ a: participant('a', { tracks: { video: playing(fakeTrack('cam-2', 'video')) } }) });
  assert.equal(reconcilePeers(a1, same), a1);
  assert.notEqual(reconcilePeers(a1, swapped), a1);
  void OFF;
});

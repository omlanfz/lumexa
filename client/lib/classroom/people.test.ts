import test from 'node:test';
import assert from 'node:assert/strict';
import { activeScreenShares, connectionQuality, countPeople, groupPeople, listStudents } from './people.ts';
import { toPeers } from './daily/peers.ts';
import { fakeTrack, participant, playing } from './daily/testing.ts';

const peersOf = (...ps: ReturnType<typeof participant>[]) => toPeers(Object.fromEntries(ps.map((p) => [p.session_id, p])));

test('connections are grouped by person, in the order people first appeared', () => {
  const peers = peersOf(
    participant('a1', { user_id: 'a', joined_at: new Date(1) }),
    participant('b1', { user_id: 'b', joined_at: new Date(2) }),
    participant('a2', { user_id: 'a', joined_at: new Date(3) }),
    participant('c1', { user_id: 'c', joined_at: new Date(4) }),
    participant('b2', { user_id: 'b', joined_at: new Date(5) }),
  );
  const people = groupPeople(peers, null);
  assert.deepEqual(people.map((p) => p.userId), ['a', 'b', 'c']);
  assert.deepEqual(people[0].peers.map((p) => p.sessionId), ['a1', 'a2']);
  assert.deepEqual(people[1].peers.map((p) => p.sessionId), ['b1', 'b2']);
});

test('two devices are one person in the count; the admin observer is nobody', () => {
  const peers = peersOf(
    participant('a1', { user_id: 'a' }),
    participant('a2', { user_id: 'a' }),
    participant('b1', { user_id: 'b' }),
    participant('o', { user_id: 'admin-observer-1' }),
  );
  assert.equal(countPeople(peers), 2);
  assert.equal(countPeople([]), 0);
  assert.deepEqual(groupPeople(peers, null).map((p) => p.userId), ['a', 'b']);
});

test('a person with the camera on one device and only a microphone on another shows the camera', () => {
  const cam = fakeTrack('cam', 'video');
  const people = groupPeople(
    peersOf(
      participant('a-laptop', { user_id: 'a', joined_at: new Date(1), tracks: { audio: playing(fakeTrack('mic')) } }),
      participant('a-phone', { user_id: 'a', joined_at: new Date(2), tracks: { video: playing(cam) } }),
      participant('b', { user_id: 'b', joined_at: new Date(3) }),
    ),
    null,
  );
  assert.equal(people[0].shown.sessionId, 'a-phone');
  assert.equal(people[0].shown.video.track, cam);
  assert.equal(people[0].cameraOn, true);
  assert.equal(people[0].micOn, true); // the microphone is on the other device
  assert.equal(people[1].shown.sessionId, 'b');
});

test('on a tie the first connection keeps the tile (it does not flicker between devices)', () => {
  const people = groupPeople(
    peersOf(
      participant('a1', { user_id: 'a', joined_at: new Date(1), tracks: { video: playing(fakeTrack('c1', 'video')) } }),
      participant('a2', { user_id: 'a', joined_at: new Date(2), tracks: { video: playing(fakeTrack('c2', 'video')) } }),
    ),
    null,
  );
  assert.equal(people[0].shown.sessionId, 'a1');
});

test('a person’s status is across all their devices: any microphone, any camera, any screen', () => {
  const people = groupPeople(
    peersOf(
      participant('a1', { user_id: 'a', tracks: { audio: playing(fakeTrack('m')) } }),
      participant('a2', { user_id: 'a', tracks: { screenVideo: playing(fakeTrack('s', 'video')) } }),
      participant('b1', { user_id: 'b' }),
    ),
    null,
  );
  assert.deepEqual(
    [people[0].micOn, people[0].cameraOn, people[0].sharingScreen],
    [true, false, true],
  );
  assert.deepEqual(
    [people[1].micOn, people[1].cameraOn, people[1].sharingScreen],
    [false, false, false],
  );
});

test('you are yourself on every device of yours; the teacher is whoever owns the room on any of theirs', () => {
  const people = groupPeople(
    peersOf(
      participant('me', { user_id: 'u-me', local: true, joined_at: new Date(1) }),
      participant('me-phone', { user_id: 'u-me', joined_at: new Date(2) }),
      participant('t', { user_id: 'u-t', owner: true, user_name: 'Ms Karim (Teacher)', joined_at: new Date(3) }),
      participant('s', { user_id: 'u-s', joined_at: new Date(4) }),
    ),
    'u-me',
  );
  assert.deepEqual(people.map((p) => [p.userId, p.isSelf, p.role]), [
    ['u-me', true, 'STUDENT'],
    ['u-t', false, 'TEACHER'],
    ['u-s', false, 'STUDENT'],
  ]);
  // …and from another device of mine with no local peer yet, the user id still says it is me
  assert.equal(groupPeople(peersOf(participant('x', { user_id: 'u-me' })), 'u-me')[0].isSelf, true);
});

test('the students in the room are people, not connections, and never the teacher', () => {
  const students = listStudents(
    peersOf(
      participant('t', { user_id: 't', owner: true, user_name: 'Ms Karim (Teacher)', joined_at: new Date(1) }),
      participant('s1a', { user_id: 's1', user_name: 'Ada Lovelace (Student)', joined_at: new Date(2) }),
      participant('s1b', { user_id: 's1', user_name: 'Ada Lovelace (Student)', joined_at: new Date(3) }),
      participant('s2', { user_id: 's2', user_name: 'Ben Carson (Student)', joined_at: new Date(4) }),
      participant('o', { user_id: 'admin-observer-1', user_name: 'Lumexa Ops (Observer)', joined_at: new Date(5) }),
    ),
  );
  assert.deepEqual(students, [
    { userId: 's1', name: 'Ada Lovelace' },
    { userId: 's2', name: 'Ben Carson' },
  ]);
  assert.deepEqual(listStudents([]), []);
});

test('screens being shared: only connections with a screen to show, in the order they joined, never an observer’s', () => {
  const shares = activeScreenShares(
    peersOf(
      participant('late', { joined_at: new Date(3), tracks: { screenVideo: playing(fakeTrack('s2', 'video')) } }),
      participant('early', { joined_at: new Date(1), tracks: { screenVideo: playing(fakeTrack('s1', 'video')) } }),
      participant('loading', { joined_at: new Date(2), tracks: { screenVideo: { state: 'loading' } } }), // no media yet
      participant('quiet', { joined_at: new Date(4) }),
      participant('obs', {
        user_id: 'admin-observer-1',
        joined_at: new Date(5),
        tracks: { screenVideo: playing(fakeTrack('s3', 'video')) },
      }),
    ),
  );
  assert.deepEqual(shares.map((p) => p.sessionId), ['early', 'late']);
});

test('a person’s microphone counts as locked only when it is locked on every device of theirs', () => {
  const locked = { permissions: { canSend: new Set(['video']) } };
  const people = groupPeople(
    peersOf(
      participant('a1', { user_id: 'a', ...locked }),
      participant('a2', { user_id: 'a', ...locked }),
      participant('b1', { user_id: 'b', ...locked }),
      participant('b2', { user_id: 'b' }),
    ),
    null,
  );
  assert.equal(people[0].micLocked, true);
  assert.equal(people[1].micLocked, false);
});

test('connection quality: yours is what Daily measures on your own connection', () => {
  const me = groupPeople(peersOf(participant('me', { user_id: 'u-me', local: true })), 'u-me')[0];
  assert.equal(connectionQuality(me, 'bad'), 'poor');
  assert.equal(connectionQuality(me, 'low'), 'unstable');
  assert.equal(connectionQuality(me, 'good'), 'good');
  assert.equal(connectionQuality(me, 'unknown'), 'unknown');
});

test('connection quality: others’ is what Daily knows of theirs, the worst of their devices, unknown when it says nothing', () => {
  const others = groupPeople(
    peersOf(
      participant('x1', { user_id: 'x', networkQualityState: 'good' }),
      participant('x2', { user_id: 'x', networkQualityState: 'warning' }),
      participant('y', { user_id: 'y', networkQualityState: 'bad' }),
      participant('z', { user_id: 'z' }),
      participant('w', { user_id: 'w', networkQualityState: 'good' }),
    ),
    'someone-else',
  );
  const by = (id: string) => others.find((p) => p.userId === id)!;
  assert.equal(connectionQuality(by('x'), 'bad'), 'unstable', 'my own network says nothing about theirs');
  assert.equal(connectionQuality(by('y'), 'good'), 'poor');
  assert.equal(connectionQuality(by('z'), 'good'), 'unknown');
  assert.equal(connectionQuality(by('w'), 'good'), 'good');
});

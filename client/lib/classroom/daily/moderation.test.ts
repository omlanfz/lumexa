import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SENDABLE_WITHOUT_MIC,
  isPersonMicLocked,
  mutePerson,
  muteAllStudents,
  setPersonMicLocked,
  stopPersonScreenShare,
} from './moderation.ts';
import type { ModerationCall, ParticipantUpdate } from './moderation.ts';
import { toPeers } from './peers.ts';
import { fakeTrack, participant, playing } from './testing.ts';

function recorder() {
  const calls: Record<string, ParticipantUpdate>[] = [];
  const call: ModerationCall = {
    updateParticipants: (updates) => {
      calls.push(updates);
    },
  };
  return { call, calls };
}

const mic = () => playing(fakeTrack(`mic-${Math.random()}`));
const cam = () => playing(fakeTrack(`cam-${Math.random()}`, 'video'));
const screen = () => playing(fakeTrack(`screen-${Math.random()}`, 'video'));

function classroom() {
  return toPeers({
    me: participant('me', { local: true, owner: true, user_id: 'u-t', tracks: { audio: mic(), video: cam() } }),
    a1: participant('a1', { user_id: 'u-a', joined_at: new Date(1), tracks: { audio: mic() } }),
    a2: participant('a2', { user_id: 'u-a', joined_at: new Date(2), tracks: { video: cam(), screenVideo: screen() } }),
    b: participant('b', { user_id: 'u-b', joined_at: new Date(3), tracks: { audio: mic(), video: cam() } }),
    obs: participant('obs', { user_id: 'admin-observer-1', joined_at: new Date(4) }),
  });
}

test('muting a person’s microphone reaches every device of theirs that has it on', () => {
  const { call, calls } = recorder();
  assert.equal(mutePerson(call, classroom(), 'u-a', 'audio'), 1);
  assert.deepEqual(calls, [{ a1: { setAudio: false } }]);
});

test('turning a person’s camera off reaches only the device with a camera on', () => {
  const { call, calls } = recorder();
  assert.equal(mutePerson(call, classroom(), 'u-a', 'video'), 1);
  assert.deepEqual(calls, [{ a2: { setVideo: false } }]);
});

test('nothing is sent when there is nothing to switch off', () => {
  const { call, calls } = recorder();
  const peers = toPeers({ x: participant('x', { user_id: 'u-x' }) });
  assert.equal(mutePerson(call, peers, 'u-x', 'audio'), 0);
  assert.equal(mutePerson(call, peers, 'nobody', 'audio'), 0);
  assert.deepEqual(calls, []);
});

test('the teacher can never be muted by their own controls, nor can an observer or this browser', () => {
  const { call, calls } = recorder();
  const peers = classroom();
  assert.equal(mutePerson(call, peers, 'u-t', 'audio'), 0);
  assert.equal(mutePerson(call, peers, 'admin-observer-1', 'audio'), 0);
  assert.equal(setPersonMicLocked(call, peers, 'u-t', true), 0);
  assert.deepEqual(calls, []);
});

test('muting everyone mutes every student with a microphone on — one batch, never the teacher', () => {
  const { call, calls } = recorder();
  assert.equal(muteAllStudents(call, classroom()), 2);
  assert.deepEqual(calls, [{ a1: { setAudio: false }, b: { setAudio: false } }]);
  assert.ok(!('me' in calls[0]));
});

test('stopping a share reaches the device that is sharing', () => {
  const { call, calls } = recorder();
  assert.equal(stopPersonScreenShare(call, classroom(), 'u-a'), 1);
  assert.deepEqual(calls, [{ a2: { setScreenShare: false } }]);
  assert.equal(stopPersonScreenShare(call, classroom(), 'u-b'), 0);
  assert.equal(calls.length, 1);
});

test('locking a microphone mutes it and takes away the right to send one, on every device', () => {
  const { call, calls } = recorder();
  assert.equal(setPersonMicLocked(call, classroom(), 'u-a', true), 2);
  assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(calls[0]).sort(), ['a1', 'a2']);
  for (const update of Object.values(calls[0])) {
    assert.equal(update.setAudio, false);
    const canSend = update.updatePermissions!.canSend as Set<string>;
    assert.deepEqual([...canSend].sort(), [...SENDABLE_WITHOUT_MIC].sort());
    assert.ok(!canSend.has('audio'));
  }
});

test('unlocking gives the right back without switching anything on', () => {
  const { call, calls } = recorder();
  assert.equal(setPersonMicLocked(call, classroom(), 'u-a', false), 2);
  for (const update of Object.values(calls[0])) {
    assert.deepEqual(update, { updatePermissions: { canSend: true } });
    assert.ok(!('setAudio' in update));
  }
});

test('a person is locked when none of their devices may send a microphone', () => {
  const locked = toPeers({
    a1: participant('a1', { user_id: 'u-a', permissions: { canSend: new Set(['video']) } }),
    a2: participant('a2', { user_id: 'u-a', permissions: { canSend: new Set(['video']) } }),
    b1: participant('b1', { user_id: 'u-b', permissions: { canSend: new Set(['video']) } }),
    b2: participant('b2', { user_id: 'u-b', permissions: { canSend: true } }),
  });
  assert.equal(isPersonMicLocked(locked, 'u-a'), true);
  assert.equal(isPersonMicLocked(locked, 'u-b'), false);
  assert.equal(isPersonMicLocked(locked, 'nobody'), false);
});

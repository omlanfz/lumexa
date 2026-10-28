import test from 'node:test';
import assert from 'node:assert/strict';
import { activeDeviceId, deviceLabel, devicesOfKind } from './devices.ts';

const d = (deviceId: string, kind: string, label: string) => ({ deviceId, kind, label });

test('a menu lists the devices of its own kind only', () => {
  const all = [d('m1', 'audioinput', 'USB mic'), d('c1', 'videoinput', 'Webcam'), d('s1', 'audiooutput', 'Speakers')];
  assert.deepEqual(devicesOfKind(all, 'audioinput').map((x) => x.deviceId), ['m1']);
  assert.deepEqual(devicesOfKind(all, 'videoinput').map((x) => x.deviceId), ['c1']);
  assert.deepEqual(devicesOfKind(all, 'audiooutput').map((x) => x.deviceId), ['s1']);
});

test('devices with no id (no permission yet) are not offered', () => {
  assert.deepEqual(devicesOfKind([d('', 'audioinput', ''), d('m1', 'audioinput', 'Mic')], 'audioinput').map((x) => x.deviceId), ['m1']);
});

test('Chrome’s "default" copy of a microphone is dropped when the microphone is listed itself', () => {
  const mics = [
    d('default', 'audioinput', 'Default - Built-in Microphone'),
    d('communications', 'audioinput', 'Communications - Built-in Microphone'),
    d('abc', 'audioinput', 'Built-in Microphone'),
    d('def', 'audioinput', 'USB mic'),
  ];
  assert.deepEqual(devicesOfKind(mics, 'audioinput').map((x) => x.deviceId), ['abc', 'def']);
});

test('a "default" device that has no named twin stays — it may be the only way to choose it', () => {
  assert.deepEqual(devicesOfKind([d('default', 'audioinput', 'Default - Headset')], 'audioinput').map((x) => x.deviceId), ['default']);
});

test('the device in use is whatever Daily says, and nothing when it says nothing', () => {
  const infos = { camera: { deviceId: 'c1' }, mic: { deviceId: 'm1' }, speaker: {} };
  assert.equal(activeDeviceId(infos, 'videoinput'), 'c1');
  assert.equal(activeDeviceId(infos, 'audioinput'), 'm1');
  assert.equal(activeDeviceId(infos, 'audiooutput'), '');
  assert.equal(activeDeviceId(null, 'audioinput'), '');
  assert.equal(activeDeviceId({}, 'videoinput'), '');
});

test('an unlabelled device still has a name in the menu', () => {
  assert.equal(deviceLabel(d('x', 'audioinput', 'USB mic'), 'audioinput'), 'USB mic');
  assert.equal(deviceLabel(d('x', 'audioinput', ''), 'audioinput'), 'Microphone');
  assert.equal(deviceLabel(d('x', 'videoinput', ''), 'videoinput'), 'Camera');
  assert.equal(deviceLabel(d('x', 'audiooutput', ''), 'audiooutput'), 'Speaker');
});

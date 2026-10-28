// FILE PATH: client/lib/classroom/daily/deviceStore.test.ts
//
// Run with: node --test lib/classroom/daily/deviceStore.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeviceListStore, NO_DEVICES } from './deviceStore.ts';
import type { DeviceCall } from './deviceStore.ts';
import type { DeviceLike, InputDevicesLike } from './devices.ts';

const mic = (id: string, label = `Mic ${id}`): DeviceLike => ({ deviceId: id, kind: 'audioinput', label });
const cam = (id: string, label = `Cam ${id}`): DeviceLike => ({ deviceId: id, kind: 'videoinput', label });
const speaker = (id: string): DeviceLike => ({ deviceId: id, kind: 'audiooutput', label: `Speaker ${id}` });

/** A call whose devices the test controls, and whose answers it can hold back. */
function fakeCall(initial: { devices: DeviceLike[]; input: InputDevicesLike }) {
  const handlers = new Map<string, Set<(e: unknown) => void>>();
  const state = { ...initial, enumerateCalls: 0, fail: false };
  const holds: Array<() => void> = [];
  let hold = false;

  const call: DeviceCall = {
    async enumerateDevices() {
      state.enumerateCalls += 1;
      const devices = state.devices; // what exists when asked, not when answered
      if (state.fail) throw new Error('no permission');
      if (hold) await new Promise<void>((resolve) => holds.push(resolve));
      return { devices };
    },
    async getInputDevices() {
      return state.input;
    },
    on(event: string, handler: (e: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    },
    off(event: string, handler: (e: unknown) => void) {
      handlers.get(event)?.delete(handler);
    },
  };
  return {
    call,
    state,
    emit: (event: string) => handlers.get(event)?.forEach((h) => h({})),
    listenerCount: () => [...handlers.values()].reduce((n, set) => n + set.size, 0),
    holdAnswers: () => {
      hold = true;
    },
    /** Delivers the held answers, the latest question's first when `newestFirst`. */
    releaseAnswers: (newestFirst = false) => {
      hold = false;
      const waiting = holds.splice(0);
      (newestFirst ? waiting.reverse() : waiting).forEach((release) => release());
    },
  };
}

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test('nothing is listened to and nothing is asked until something watches', () => {
  const fake = fakeCall({ devices: [mic('a')], input: { mic: { deviceId: 'a' } } });
  const store = new DeviceListStore(fake.call, 'audioinput');
  assert.equal(fake.listenerCount(), 0);
  assert.equal(fake.state.enumerateCalls, 0);
  assert.equal(store.getSnapshot(), NO_DEVICES);
});

test('the first watcher loads the devices of its kind and the one in use', async () => {
  const fake = fakeCall({
    devices: [mic('a'), mic('b'), cam('c'), speaker('s')],
    input: { mic: { deviceId: 'b' }, camera: { deviceId: 'c' } },
  });
  const store = new DeviceListStore(fake.call, 'audioinput');
  let notified = 0;
  store.subscribe(() => (notified += 1));
  await tick();
  assert.deepEqual(
    store.getSnapshot().devices.map((d) => d.deviceId),
    ['a', 'b'],
  );
  assert.equal(store.getSnapshot().activeId, 'b');
  assert.equal(notified, 1);
});

test('a camera store reads the camera, and a speaker store has no device "in use"', async () => {
  const fake = fakeCall({
    devices: [mic('a'), cam('c'), cam('d'), speaker('s')],
    input: { mic: { deviceId: 'a' }, camera: { deviceId: 'd' }, speaker: { deviceId: 's' } },
  });
  const cameras = new DeviceListStore(fake.call, 'videoinput');
  const speakers = new DeviceListStore(fake.call, 'audiooutput');
  cameras.subscribe(() => undefined);
  speakers.subscribe(() => undefined);
  await tick();
  assert.deepEqual(cameras.getSnapshot().devices.map((d) => d.deviceId), ['c', 'd']);
  assert.equal(cameras.getSnapshot().activeId, 'd');
  assert.deepEqual(speakers.getSnapshot().devices.map((d) => d.deviceId), ['s']);
  assert.equal(speakers.getSnapshot().activeId, ''); // the classroom plays its own audio
});

test('it follows Daily when a device is plugged in or switched', async () => {
  const fake = fakeCall({ devices: [mic('a')], input: { mic: { deviceId: 'a' } } });
  const store = new DeviceListStore(fake.call, 'audioinput');
  let notified = 0;
  store.subscribe(() => (notified += 1));
  await tick();

  fake.state.devices = [mic('a'), mic('b')];
  fake.emit('available-devices-updated');
  await tick();
  assert.deepEqual(store.getSnapshot().devices.map((d) => d.deviceId), ['a', 'b']);

  fake.state.input = { mic: { deviceId: 'b' } };
  fake.emit('selected-devices-updated');
  await tick();
  assert.equal(store.getSnapshot().activeId, 'b');
  assert.equal(notified, 3);
});

test('the snapshot keeps its identity — and watchers are not woken — when nothing changed', async () => {
  const fake = fakeCall({ devices: [mic('a')], input: { mic: { deviceId: 'a' } } });
  const store = new DeviceListStore(fake.call, 'audioinput');
  let notified = 0;
  store.subscribe(() => (notified += 1));
  await tick();
  const before = store.getSnapshot();

  fake.emit('started-camera'); // Daily says something happened; the devices are the same
  await tick();
  assert.equal(store.getSnapshot(), before);
  assert.equal(notified, 1);
});

test('only the active device changing keeps the same list object', async () => {
  const fake = fakeCall({ devices: [mic('a'), mic('b')], input: { mic: { deviceId: 'a' } } });
  const store = new DeviceListStore(fake.call, 'audioinput');
  store.subscribe(() => undefined);
  await tick();
  const list = store.getSnapshot().devices;

  fake.state.input = { mic: { deviceId: 'b' } };
  fake.emit('selected-devices-updated');
  await tick();
  assert.equal(store.getSnapshot().activeId, 'b');
  assert.equal(store.getSnapshot().devices, list);
});

test('setActive shows a choice at once, and the next refresh replaces it with the truth', async () => {
  const fake = fakeCall({ devices: [mic('a'), mic('b')], input: { mic: { deviceId: 'a' } } });
  const store = new DeviceListStore(fake.call, 'audioinput');
  let notified = 0;
  store.subscribe(() => (notified += 1));
  await tick();

  store.setActive('b');
  assert.equal(store.getSnapshot().activeId, 'b');
  assert.equal(notified, 2);

  await store.refresh(); // the switch did not happen
  assert.equal(store.getSnapshot().activeId, 'a');
});

test('the answer to the latest question wins when answers arrive out of order', async () => {
  const fake = fakeCall({ devices: [mic('a')], input: { mic: { deviceId: 'a' } } });
  const store = new DeviceListStore(fake.call, 'audioinput');
  store.subscribe(() => undefined);
  await tick();

  fake.holdAnswers();
  fake.state.devices = [mic('a'), mic('b')];
  const older = store.refresh();
  fake.state.devices = [mic('a'), mic('b'), mic('c')];
  const newer = store.refresh();
  fake.releaseAnswers(true); // the newer answer arrives first, the older one after it
  await Promise.all([older, newer]);

  assert.deepEqual(store.getSnapshot().devices.map((d) => d.deviceId), ['a', 'b', 'c']);
});

test('an older answer arriving first does not stop the newer one being shown', async () => {
  const fake = fakeCall({ devices: [mic('a')], input: { mic: { deviceId: 'a' } } });
  const store = new DeviceListStore(fake.call, 'audioinput');
  store.subscribe(() => undefined);
  await tick();

  fake.holdAnswers();
  fake.state.devices = [mic('a'), mic('b')];
  const older = store.refresh();
  fake.state.devices = [mic('a'), mic('b'), mic('c')];
  const newer = store.refresh();
  fake.releaseAnswers();
  await Promise.all([older, newer]);

  assert.deepEqual(store.getSnapshot().devices.map((d) => d.deviceId), ['a', 'b', 'c']);
});

test('a failed question keeps what was known', async () => {
  const fake = fakeCall({ devices: [mic('a')], input: { mic: { deviceId: 'a' } } });
  const store = new DeviceListStore(fake.call, 'audioinput');
  store.subscribe(() => undefined);
  await tick();
  const before = store.getSnapshot();

  fake.state.fail = true;
  await store.refresh();
  assert.equal(store.getSnapshot(), before);
});

test('the last watcher leaving stops the listening and drops an answer still on its way', async () => {
  const fake = fakeCall({ devices: [mic('a')], input: { mic: { deviceId: 'a' } } });
  const store = new DeviceListStore(fake.call, 'audioinput');

  const first = store.subscribe(() => undefined);
  const second = store.subscribe(() => undefined);
  assert.equal(fake.state.enumerateCalls, 1); // only the first watcher starts it
  assert.equal(fake.listenerCount(), 3);

  first();
  assert.equal(fake.listenerCount(), 3); // the second is still watching

  fake.holdAnswers();
  const pending = store.refresh();
  second();
  assert.equal(fake.listenerCount(), 0);
  fake.releaseAnswers();
  await pending;
  assert.equal(store.getSnapshot(), NO_DEVICES);
});

test('leaving twice does not stop a later watcher, and watching again starts afresh', async () => {
  const fake = fakeCall({ devices: [mic('a')], input: { mic: { deviceId: 'a' } } });
  const store = new DeviceListStore(fake.call, 'audioinput');

  const leave = store.subscribe(() => undefined);
  leave();
  leave(); // StrictMode runs a cleanup twice in development
  assert.equal(fake.listenerCount(), 0);

  store.subscribe(() => undefined);
  assert.equal(fake.listenerCount(), 3);
  await tick();
  assert.equal(store.getSnapshot().activeId, 'a');
});

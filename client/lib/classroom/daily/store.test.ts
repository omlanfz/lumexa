import test from 'node:test';
import assert from 'node:assert/strict';
import { CallStore, SPEAKING_HOLD_MS, SPEAKING_LEVEL, levelOf } from './store.ts';
import type { CallLike, IncomingAppMessage, MeetingState } from './store.ts';
import type { ParticipantLike } from './peers.ts';
import { fakeTrack, participant, playing } from './testing.ts';

class FakeCall implements CallLike {
  handlers = new Map<string, Set<(e: unknown) => void>>();
  parts: Record<string, ParticipantLike> = {};
  state: MeetingState = 'joined-meeting';
  sessionData: unknown = {};
  observers: string[] = [];
  failObservers = false;

  participants() {
    return this.parts;
  }
  meetingState() {
    return this.state;
  }
  meetingSessionState() {
    return { data: this.sessionData };
  }
  on(event: string, handler: (e: unknown) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }
  off(event: string, handler: (e: unknown) => void) {
    this.handlers.get(event)?.delete(handler);
  }
  emit(event: string, payload?: unknown) {
    for (const h of [...(this.handlers.get(event) ?? [])]) h(payload);
  }
  listenerCount() {
    return [...this.handlers.values()].reduce((n, set) => n + set.size, 0);
  }
  async startLocalAudioLevelObserver(ms?: number) {
    this.observers.push(`start-local:${ms}`);
    if (this.failObservers) throw new Error('no microphone');
  }
  stopLocalAudioLevelObserver() {
    this.observers.push('stop-local');
  }
  async startRemoteParticipantsAudioLevelObserver(ms?: number) {
    this.observers.push(`start-remote:${ms}`);
    if (this.failObservers) throw new Error('nobody');
  }
  stopRemoteParticipantsAudioLevelObserver() {
    this.observers.push('stop-remote');
  }
}

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

function room() {
  const call = new FakeCall();
  call.parts = {
    local: participant('me', { local: true, user_id: 'u-me', user_name: 'Ada (Student)', joined_at: new Date(1) }),
    t: participant('t', { owner: true, user_id: 'u-t', user_name: 'Ms Karim (Teacher)', joined_at: new Date(0) }),
  };
  return call;
}

/** A store with a clock and timers the test controls. */
function controlled(call: FakeCall) {
  let now = 1_000;
  const timers: { at: number; fn: () => void; id: number }[] = [];
  let nextId = 1;
  const store = new CallStore(call, {
    now: () => now,
    setTimer: (fn, ms) => {
      const id = nextId++;
      timers.push({ at: now + ms, fn, id });
      return id;
    },
    clearTimer: (id) => {
      const i = timers.findIndex((t) => t.id === id);
      if (i >= 0) timers.splice(i, 1);
    },
  }).attach();
  return {
    store,
    advance(ms: number) {
      now += ms;
      for (const t of timers.filter((x) => x.at <= now).sort((a, b) => a.at - b.at)) {
        timers.splice(timers.indexOf(t), 1);
        t.fn();
      }
    },
    pendingTimers: () => timers.length,
  };
}

test('a store made on a call already in progress reads the room, who you are, and the shared state', () => {
  const call = room();
  call.sessionData = { chatLocked: true, roomLocked: false, junk: 1 };
  const store = new CallStore(call).attach();
  const s = store.getSnapshot();
  assert.equal(s.meetingState, 'joined-meeting');
  assert.deepEqual(s.peers.map((p) => p.sessionId), ['me', 't']);
  assert.equal(s.localSessionId, 'me');
  assert.equal(s.localUserId, 'u-me');
  assert.deepEqual(s.classState, { chatLocked: true, roomLocked: false });
  assert.equal(s.ended, null);
  // and the audio levels are being watched
  assert.deepEqual(call.observers, ['start-remote:200', 'start-local:200']);
});

test('people arriving, changing and leaving update the snapshot — once per burst of events', async () => {
  const call = room();
  const store = new CallStore(call).attach();
  let notified = 0;
  store.subscribe(() => notified++);

  call.parts.b = participant('b', { user_id: 'u-b', joined_at: new Date(5) });
  call.emit('participant-joined', {});
  call.emit('participant-updated', {});
  call.emit('track-started', {});
  assert.equal(notified, 0, 'nothing is published until the tick ends');
  await tick();
  assert.equal(notified, 1);
  assert.deepEqual(store.getSnapshot().peers.map((p) => p.sessionId), ['me', 't', 'b']);

  delete call.parts.b;
  call.emit('participant-left', {});
  await tick();
  assert.deepEqual(store.getSnapshot().peers.map((p) => p.sessionId), ['me', 't']);
  assert.equal(notified, 2);
});

test('an event that changes nothing on screen publishes nothing, and keeps the same snapshot', async () => {
  const call = room();
  const store = new CallStore(call).attach();
  const before = store.getSnapshot();
  let notified = 0;
  store.subscribe(() => notified++);
  call.emit('participant-updated', {});
  await tick();
  assert.equal(notified, 0);
  assert.equal(store.getSnapshot(), before);
});

test('a microphone turning on is a change to that connection only', async () => {
  const call = room();
  const store = new CallStore(call).attach();
  const before = store.getSnapshot().peers;
  call.parts.t = participant('t', {
    owner: true,
    user_id: 'u-t',
    user_name: 'Ms Karim (Teacher)',
    joined_at: new Date(0),
    tracks: { audio: playing(fakeTrack('t-mic')) },
  });
  call.emit('participant-updated', {});
  await tick();
  const after = store.getSnapshot().peers;
  assert.equal(after.find((p) => p.sessionId === 'me'), before.find((p) => p.sessionId === 'me'));
  assert.equal(after.find((p) => p.sessionId === 't')!.audio.on, true);
});

test('the shared state follows the server’s updates, ignores garbage, and does not change for a repeat', async () => {
  const call = room();
  const store = new CallStore(call).attach();
  let notified = 0;
  store.subscribe(() => notified++);

  call.emit('meeting-session-state-updated', { meetingSessionState: { data: { chatLocked: true, recording: true } } });
  assert.deepEqual(store.getSnapshot().classState, { chatLocked: true, recording: true });
  assert.equal(notified, 1);

  const state = store.getSnapshot().classState;
  call.emit('meeting-session-state-updated', { meetingSessionState: { data: { recording: true, chatLocked: true } } });
  assert.equal(store.getSnapshot().classState, state);
  assert.equal(notified, 1);

  call.emit('meeting-session-state-updated', { meetingSessionState: { data: { chatLocked: 'yes', studentsMuted: 1 } } });
  assert.deepEqual(store.getSnapshot().classState, {});
  call.emit('meeting-session-state-updated', { meetingSessionState: { data: null } });
  call.emit('meeting-session-state-updated', {});
  assert.deepEqual(store.getSnapshot().classState, {});
});

test('a network warning is the local connection’s, with anything else unknown', () => {
  const store = new CallStore(room()).attach();
  const call = (store as unknown as { call: FakeCall }).call;
  call.emit('network-quality-change', { networkState: 'bad' });
  assert.equal(store.getSnapshot().network, 'bad');
  call.emit('network-quality-change', { networkState: 'low' });
  assert.equal(store.getSnapshot().network, 'low');
  call.emit('network-quality-change', { networkState: 'good' });
  assert.equal(store.getSnapshot().network, 'good');
  call.emit('network-quality-change', { networkState: 'strange' });
  assert.equal(store.getSnapshot().network, 'unknown');
});

test('who is speaking: loud enough counts, and the highlight holds a moment before it drops', () => {
  const call = room();
  const { store, advance } = controlled(call);
  assert.equal(store.getSnapshot().speaking.size, 0);

  call.emit('remote-participants-audio-level', { participantsAudioLevel: { t: 0.2, other: 0.01 } });
  assert.deepEqual([...store.getSnapshot().speaking], ['t']);

  // quieter, but within the hold: still highlighted
  advance(SPEAKING_HOLD_MS - 100);
  call.emit('remote-participants-audio-level', { participantsAudioLevel: { t: 0.0 } });
  assert.deepEqual([...store.getSnapshot().speaking], ['t']);

  // the hold runs out with no further event at all: the timer takes the highlight away
  advance(200);
  assert.equal(store.getSnapshot().speaking.size, 0);
});

test('your own level lights your own connection, and the threshold is exactly where it is documented', () => {
  const call = room();
  const { store } = controlled(call);
  call.emit('local-audio-level', { audioLevel: SPEAKING_LEVEL - 0.001 });
  assert.equal(store.getSnapshot().speaking.size, 0);
  call.emit('local-audio-level', { audioLevel: SPEAKING_LEVEL });
  assert.deepEqual([...store.getSnapshot().speaking], ['me']);
});

test('levels arrive as numeric STRINGS from the real daily-js ("0.006551"): they count, for yourself and for others', () => {
  // Daily's documentation says number; daily-js 0.93 sends strings (seen in a real browser).
  const call = room();
  const { store } = controlled(call);
  call.emit('local-audio-level', { audioLevel: '0.004100' });
  assert.equal(store.getSnapshot().speaking.size, 0);
  call.emit('local-audio-level', { audioLevel: '0.149356' });
  assert.deepEqual([...store.getSnapshot().speaking], ['me']);
  call.emit('remote-participants-audio-level', { participantsAudioLevel: { t: '0.200000', other: '0.010000' } });
  assert.deepEqual([...store.getSnapshot().speaking].sort(), ['me', 't']);
});

test('a level that is not a number at all is ignored, never a crash or a false highlight', () => {
  const call = room();
  const { store } = controlled(call);
  call.emit('local-audio-level', { audioLevel: 'loud' });
  call.emit('local-audio-level', { audioLevel: '' });
  call.emit('local-audio-level', { audioLevel: null });
  call.emit('local-audio-level', {});
  call.emit('remote-participants-audio-level', { participantsAudioLevel: { t: undefined, u: NaN, v: {} } });
  call.emit('remote-participants-audio-level', {});
  assert.equal(store.getSnapshot().speaking.size, 0);
});

test('levelOf reads numbers and numeric strings, nothing else', () => {
  assert.equal(levelOf(0.25), 0.25);
  assert.equal(levelOf('0.006551'), 0.006551);
  assert.equal(levelOf(' 1 '), 1);
  for (const bad of ['', '  ', 'x', NaN, Infinity, null, undefined, {}, [], true]) assert.equal(levelOf(bad), null, String(bad));
});

test('several people speaking at once are all highlighted; a new report leaves the others’ highlights alone', () => {
  const call = room();
  const { store, advance } = controlled(call);
  call.emit('remote-participants-audio-level', { participantsAudioLevel: { a: 0.3, b: 0.3 } });
  advance(300);
  call.emit('remote-participants-audio-level', { participantsAudioLevel: { a: 0.3 } });
  assert.deepEqual([...store.getSnapshot().speaking].sort(), ['a', 'b']);
  advance(300); // b's hold has run out, a's was renewed
  assert.deepEqual([...store.getSnapshot().speaking], ['a']);
});

test('a speaking snapshot is only published when the set of speakers changes', () => {
  const call = room();
  const { store } = controlled(call);
  let notified = 0;
  store.subscribe(() => notified++);
  call.emit('remote-participants-audio-level', { participantsAudioLevel: { t: 0.2 } });
  call.emit('remote-participants-audio-level', { participantsAudioLevel: { t: 0.25 } });
  call.emit('remote-participants-audio-level', { participantsAudioLevel: { t: 0.3 } });
  assert.equal(notified, 1);
});

test('app messages are passed on with the connection Daily says sent them', () => {
  const call = room();
  const store = new CallStore(call).attach();
  const got: IncomingAppMessage[] = [];
  const off = store.onMessage((m) => got.push(m));

  call.emit('app-message', { data: { hello: 1 }, fromId: 't' });
  assert.equal(got.length, 1);
  assert.deepEqual(got[0].data, { hello: 1 });
  assert.equal(got[0].from?.userId, 'u-t');
  assert.equal(got[0].from?.isOwner, true);

  // a sender who has already left, or who Daily gave no id for
  call.emit('app-message', { data: 'x', fromId: 'gone' });
  call.emit('app-message', { data: 'y' });
  assert.equal(got[1].from, null);
  assert.equal(got[2].from, null);

  off();
  call.emit('app-message', { data: 'z', fromId: 't' });
  assert.equal(got.length, 3);
});

test('a sender who joined an instant ago is found even before the room has been re-read', () => {
  const call = room();
  const store = new CallStore(call).attach();
  const got: IncomingAppMessage[] = [];
  store.onMessage((m) => got.push(m));
  call.parts.fresh = participant('fresh', { user_id: 'u-fresh' });
  call.emit('app-message', { data: 'hi', fromId: 'fresh' });
  assert.equal(got[0].from?.userId, 'u-fresh');
});

test('leaving the meeting ends it, saying so', () => {
  const call = room();
  const store = new CallStore(call).attach();
  call.state = 'left-meeting';
  call.emit('left-meeting', {});
  const s = store.getSnapshot();
  assert.equal(s.meetingState, 'left-meeting');
  assert.equal(s.ended?.reason, 'left');
});

test('being removed is told apart from leaving — the error comes first, then the call stops', () => {
  const call = room();
  const store = new CallStore(call).attach();
  call.emit('error', { errorMsg: 'Meeting ended due to ejection', error: { type: 'ejected', msg: 'ejected' } });
  assert.equal(store.getSnapshot().ended, null, 'still in until the call stops');
  call.state = 'left-meeting';
  call.emit('left-meeting', {});
  assert.equal(store.getSnapshot().ended?.reason, 'ejected');
  assert.match(store.getSnapshot().ended!.message, /ejection/);
});

test('a room that is gone or expired is “ended”; anything else that kills the connection is an error', () => {
  for (const [type, reason] of [
    ['no-room', 'ended'],
    ['exp-room', 'ended'],
    ['end-of-life', 'ended'],
    ['connection-error', 'error'],
    [undefined, 'error'],
  ] as const) {
    const call = room();
    const store = new CallStore(call).attach();
    call.state = 'error';
    call.emit('error', { errorMsg: 'bad', error: type ? { type } : undefined });
    assert.equal(store.getSnapshot().ended?.reason, reason, String(type));
  }
});

test('the first reason a meeting ended for is kept', () => {
  const call = room();
  const store = new CallStore(call).attach();
  call.state = 'left-meeting';
  call.emit('error', { errorMsg: 'ejected', error: { type: 'ejected' } });
  call.emit('left-meeting', {});
  assert.equal(store.getSnapshot().ended?.reason, 'ejected');
});

test('an observer that cannot start (no microphone) is no trouble to anyone', async () => {
  const call = room();
  call.failObservers = true;
  new CallStore(call).attach();
  await tick();
  assert.deepEqual(call.observers, ['start-remote:200', 'start-local:200']);
});

test('a new microphone track restarts the local level observer', async () => {
  const call = room();
  call.parts.local = participant('me', { local: true, user_id: 'u-me', tracks: { audio: playing(fakeTrack('mic-1')) } });
  const store = new CallStore(call).attach();
  call.observers.length = 0;
  call.parts.local = participant('me', { local: true, user_id: 'u-me', tracks: { audio: playing(fakeTrack('mic-2')) } });
  call.emit('participant-updated', {});
  await tick();
  assert.deepEqual(call.observers, ['stop-local', 'start-local:200']);
  assert.equal(store.getSnapshot().peers[0].audio.track?.id, 'mic-2');
});

test('disposing stops listening and watching, and publishes nothing more', async () => {
  const call = room();
  const { store, pendingTimers } = controlled(call);
  call.emit('remote-participants-audio-level', { participantsAudioLevel: { t: 0.3 } });
  assert.ok(call.listenerCount() > 5);
  let notified = 0;
  store.subscribe(() => notified++);
  store.dispose();
  assert.equal(call.listenerCount(), 0);
  assert.equal(pendingTimers(), 0);
  assert.ok(call.observers.includes('stop-local') && call.observers.includes('stop-remote'));
  call.parts.b = participant('b');
  call.emit('participant-joined', {});
  await tick();
  assert.equal(notified, 0);
});

test('a destroyed call (it throws when asked) does not break the store', () => {
  const call = room();
  const store = new CallStore(call).attach();
  call.participants = () => {
    throw new Error('call object destroyed');
  };
  call.meetingState = () => {
    throw new Error('call object destroyed');
  };
  assert.doesNotThrow(() => call.emit('participant-updated', {}));
  assert.doesNotThrow(() => store.refreshNow());
});

test('a store listens only while attached: made alone it reads the room once and no more', async () => {
  const call = room();
  const store = new CallStore(call);
  assert.deepEqual(store.getSnapshot().peers.map((p) => p.sessionId), ['me', 't']);
  assert.equal(call.listenerCount(), 0);
  call.parts.b = participant('b', { user_id: 'u-b', joined_at: new Date(5) });
  call.emit('participant-joined', {});
  await tick();
  assert.equal(store.getSnapshot().peers.length, 2);
});

test('attaching twice listens once; detaching stops everything and can be undone', async () => {
  const call = room();
  const store = new CallStore(call);
  store.attach();
  store.attach();
  const listening = call.listenerCount();
  assert.ok(listening > 5);

  store.detach();
  assert.equal(call.listenerCount(), 0);
  assert.ok(call.observers.includes('stop-local') && call.observers.includes('stop-remote'));
  store.detach(); // harmless

  // while detached the room changes; attaching again catches up at once
  call.parts.b = participant('b', { user_id: 'u-b', joined_at: new Date(5) });
  call.sessionData = { recording: true };
  call.observers.length = 0;
  store.attach();
  assert.deepEqual(store.getSnapshot().peers.map((p) => p.sessionId), ['me', 't', 'b']);
  assert.deepEqual(store.getSnapshot().classState, { recording: true });
  assert.equal(call.listenerCount(), listening);
  assert.deepEqual(call.observers, ['start-remote:200', 'start-local:200']);

  // and it follows events again
  delete call.parts.b;
  call.emit('participant-left', {});
  await tick();
  assert.deepEqual(store.getSnapshot().peers.map((p) => p.sessionId), ['me', 't']);
});

test('nobody is shown speaking once the store stops watching', () => {
  const call = room();
  const { store } = controlled(call);
  call.emit('remote-participants-audio-level', { participantsAudioLevel: { t: 0.3 } });
  assert.equal(store.getSnapshot().speaking.size, 1);
  store.detach();
  assert.equal(store.getSnapshot().speaking.size, 0);
});

test('a disposed store cannot be attached again', () => {
  const call = room();
  const store = new CallStore(call);
  store.dispose();
  store.attach();
  assert.equal(call.listenerCount(), 0);
});

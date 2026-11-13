import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_APPEARANCE, VideoEffectsController } from './videoEffects.ts';
import type { CameraRequest, ControllerOptions, EffectsCall, EffectsDeps } from './videoEffects.ts';
import type { PipelineEvents, PipelineHandle } from './effects/pipeline.ts';
import type { EffectSettings } from './effects/options.ts';
import type { ParticipantLike, TrackStateLike } from './daily/peers.ts';
import { participant } from './daily/testing.ts';

// ─── Fakes ──────────────────────────────────────────────────────────────────

let trackCount = 0;

/** A camera or processed track. */
class FakeTrack {
  readonly kind = 'video';
  readyState: 'live' | 'ended' = 'live';
  readonly id: string;
  constructor(
    label: string,
    readonly deviceId: string = 'cam-1',
  ) {
    this.id = `${label}#${++trackCount}`;
  }
  clone() {
    return new FakeTrack(`clone-of-${this.id}`, this.deviceId);
  }
  stop() {
    this.readyState = 'ended';
  }
  getSettings() {
    return { deviceId: this.deviceId, width: 1280, height: 720, frameRate: 30 };
  }
  addEventListener() {}
  removeEventListener() {}
}
const asTrack = (t: FakeTrack) => t as unknown as MediaStreamTrack;

/** Daily, as it was measured to behave on the real call machine: a custom track
 * stays through the camera going off and on; handing back with no device means the
 * DEFAULT camera, and naming the device brings that camera back. */
class FakeDaily implements EffectsCall {
  cameraOn = true;
  /** The camera Daily would open: the person's choice. */
  selectedDevice = 'cam-default';
  native: FakeTrack | null = null;
  custom: FakeTrack | null = null;
  /** What Daily was asked, in order. */
  calls: string[] = [];
  failNext: Error | null = null;
  /** Daily never takes a custom track (the handover does not happen). */
  ignoreCustom = false;
  private handlers = new Map<string, Set<(e: unknown) => void>>();

  constructor() {
    this.startNative();
  }

  private startNative() {
    this.native?.stop();
    this.native = new FakeTrack('daily-camera', this.selectedDevice);
  }

  video(): TrackStateLike {
    if (!this.cameraOn) return { state: 'off', off: { byUser: true } };
    const track = this.custom ?? this.native;
    return track ? { state: 'playable', persistentTrack: asTrack(track), track: asTrack(track) } : { state: 'loading' };
  }

  async updateInputSettings(settings: Parameters<EffectsCall['updateInputSettings']>[0]) {
    const s = settings.video.settings as { customTrack?: FakeTrack | MediaStreamTrack; deviceId?: string };
    if (s.customTrack) {
      const track = s.customTrack as unknown as FakeTrack;
      this.calls.push(`custom:${track.id}`);
      if (this.failNext) {
        const error = this.failNext;
        this.failNext = null;
        throw error;
      }
      if (!this.ignoreCustom) {
        this.native?.stop();
        this.native = null;
        this.custom = track;
      }
    } else {
      this.calls.push(s.deviceId ? `device:${s.deviceId}` : 'default-camera');
      if (this.failNext) {
        const error = this.failNext;
        this.failNext = null;
        throw error;
      }
      this.custom = null;
      this.selectedDevice = s.deviceId ?? 'cam-default';
      if (this.cameraOn) this.startNative();
      else {
        this.native?.stop();
        this.native = null;
      }
    }
    this.emit('participant-updated', {});
    return {};
  }

  participants(): Record<string, ParticipantLike> {
    return { local: participant('me', { local: true, tracks: { video: this.video() } }) };
  }

  on(event: string, handler: (e: unknown) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }
  off(event: string, handler: (e: unknown) => void) {
    this.handlers.get(event)?.delete(handler);
  }
  emit(event: string, payload: unknown = {}) {
    for (const h of [...(this.handlers.get(event) ?? [])]) h(payload);
  }

  /** The person's own camera button. */
  setCamera(on: boolean) {
    this.cameraOn = on;
    if (!on) {
      this.native?.stop();
      if (!this.custom) this.native = null;
    } else if (!this.custom) {
      this.startNative();
    }
    this.emit('participant-updated', {});
  }

  /** Something else (not the effects) makes Daily send another camera. */
  externalSwitch(device: string) {
    this.custom = null;
    this.selectedDevice = device;
    this.startNative();
    this.emit('participant-updated', {});
  }
}

class FakePipeline implements PipelineHandle {
  readonly output = new FakeTrack('effects-output') as unknown as MediaStreamTrack;
  input: MediaStreamTrack | null;
  updates: EffectSettings[] = [];
  paused = false;
  stopped = false;
  resumed: MediaStreamTrack[] = [];
  swapped: MediaStreamTrack[] = [];
  constructor(
    input: MediaStreamTrack,
    readonly startSettings: EffectSettings,
    readonly events: PipelineEvents,
  ) {
    this.input = input;
  }
  update(settings: EffectSettings) {
    this.updates.push(settings);
  }
  pauseInput() {
    this.paused = true;
    this.input?.stop();
    this.input = null;
  }
  resumeInput(track: MediaStreamTrack) {
    this.resumed.push(track);
    this.input = track;
    this.paused = false;
  }
  swapInput(track: MediaStreamTrack) {
    this.swapped.push(track);
    this.input?.stop();
    this.input = track;
  }
  stop() {
    this.stopped = true;
    this.input?.stop();
    (this.output as unknown as FakeTrack).stop();
  }
}

interface Rig {
  daily: FakeDaily;
  controller: VideoEffectsController;
  pipelines: FakePipeline[];
  opened: CameraRequest[];
  failStart: { error: Error | null };
  failOpen: { error: Error | null };
  duringStart: { run: ((events: PipelineEvents) => void) | null };
}

function setup(over: { supported?: boolean; reason?: string; options?: ControllerOptions } = {}): Rig {
  const daily = new FakeDaily();
  const pipelines: FakePipeline[] = [];
  const opened: CameraRequest[] = [];
  const failStart = { error: null as Error | null };
  const failOpen = { error: null as Error | null };
  const duringStart = { run: null as ((events: PipelineEvents) => void) | null };
  const deps: EffectsDeps = {
    startPipeline: async (input, settings, events) => {
      if (failStart.error) {
        input.stop(); // a pipeline that cannot start gives its input back
        throw failStart.error;
      }
      const pipeline = new FakePipeline(input, settings, events);
      pipelines.push(pipeline);
      duringStart.run?.(events);
      return pipeline;
    },
    openCamera: async (request) => {
      opened.push(request);
      if (failOpen.error) throw failOpen.error;
      return asTrack(new FakeTrack('reopened', request.deviceId ?? 'cam-default'));
    },
    support: async () => ({ supported: over.supported ?? true, reason: over.reason ?? null }),
  };
  // (restarts after a failure are immediate here: the tests do not wait for the pauses)
  const controller = new VideoEffectsController(daily, deps, { handoffTimeoutMs: 250, pollMs: 2, restartPausesMs: [0, 0, 0], ...over.options });
  return { daily, controller, pipelines, opened, failStart, failOpen, duringStart };
}

const tick = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function ready(rig: Rig) {
  await tick(); // `support` answers
  await rig.controller.settled();
}
const BLUR = { mode: 'blur' } as const;
const light = (lighting: number) => ({ ...DEFAULT_APPEARANCE, lighting });

// ─── Tests ──────────────────────────────────────────────────────────────────

test('nothing is on to begin with, and nothing is asked of Daily', async () => {
  const rig = setup();
  await ready(rig);
  const s = rig.controller.getSnapshot();
  assert.deepEqual([s.settings.background.mode, s.running, s.busy, s.error, s.supported], ['none', false, false, null, true]);
  assert.deepEqual(rig.daily.calls, []);
});

test('turning an effect on puts a COPY of the camera into the pipeline, and Daily on its output — once', async () => {
  const rig = setup();
  await ready(rig);
  const camera = rig.daily.native!;
  await rig.controller.setAppearance(light(0.7));
  assert.equal(rig.pipelines.length, 1);
  const [pipeline] = rig.pipelines;
  assert.ok((pipeline.startSettings.appearance.lighting) === 0.7);
  assert.ok(String((pipeline.input as unknown as FakeTrack).id).startsWith(`clone-of-${camera.id}`), 'the pipeline got a clone, not Daily’s own track');
  assert.deepEqual(rig.daily.calls, [`custom:${(pipeline.output as unknown as FakeTrack).id}`]);
  assert.equal(rig.controller.getSnapshot().running, true);
  assert.equal(rig.controller.getSnapshot().cameraDeviceId, 'cam-default');
  assert.equal(rig.controller.getSnapshot().settings.appearance.lighting, 0.7);
});

test('after that, choices only change the pipeline: Daily and the camera are never touched again', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setAppearance(light(0.5));
  const callsAfterStart = [...rig.daily.calls];
  const cameraBefore = rig.daily.custom;
  await rig.controller.setBackground(BLUR);
  await rig.controller.setBackground({ mode: 'image', imagePath: '/classroom-backgrounds/space-lab.jpg', label: 'Space' });
  await rig.controller.setAppearance({ lighting: 0.9, touchUp: true, autoFraming: false });
  await rig.controller.setAppearance({ lighting: 0.9, touchUp: true, autoFraming: true });
  await rig.controller.setBackground({ mode: 'blur-slight' });
  assert.deepEqual(rig.daily.calls, callsAfterStart, 'Daily was told something it did not need to be');
  assert.equal(rig.daily.custom, cameraBefore, 'the track Daily sends changed');
  assert.equal(rig.pipelines.length, 1, 'a second pipeline was made');
  assert.equal(rig.pipelines[0].updates.length, 5);
  assert.equal(rig.pipelines[0].updates.at(-1)!.background.mode, 'blur-slight');
  assert.equal(rig.pipelines[0].stopped, false);
});

test('turning every effect off gives the camera back BY NAME — the person’s own camera, not the default one', async () => {
  const rig = setup();
  rig.daily.selectedDevice = 'cam-external'; // the person chose their external camera
  rig.daily.native = new FakeTrack('daily-camera', 'cam-external');
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  assert.equal(rig.controller.getSnapshot().cameraDeviceId, 'cam-external');
  await rig.controller.setBackground({ mode: 'none' });
  assert.deepEqual(rig.daily.calls.slice(1), ['device:cam-external'], 'handing back with no camera named would have switched to the default one');
  assert.equal(rig.daily.native?.deviceId, 'cam-external');
  assert.equal(rig.daily.custom, null);
  assert.equal(rig.pipelines[0].stopped, true);
  assert.deepEqual([rig.controller.getSnapshot().running, rig.controller.getSnapshot().cameraDeviceId], [false, null]);
});

test('the pipeline is stopped only after Daily has its own camera track again — the picture is never left without one', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  const pipeline = rig.pipelines[0];
  let stoppedBeforeDailyHadCamera = false;
  const original = rig.daily.updateInputSettings.bind(rig.daily);
  rig.daily.updateInputSettings = async (s) => {
    const r = await original(s);
    stoppedBeforeDailyHadCamera = pipeline.stopped;
    return r;
  };
  await rig.controller.setBackground({ mode: 'none' });
  assert.equal(stoppedBeforeDailyHadCamera, false);
  assert.equal(pipeline.stopped, true);
  assert.equal(rig.daily.video().state, 'playable');
});

test('the camera going off lets go of the device (its light goes out) and keeps everything else; coming back opens it again', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  const [pipeline] = rig.pipelines;
  const callsBefore = [...rig.daily.calls];
  const sentBefore = rig.daily.custom;

  rig.daily.setCamera(false);
  await rig.controller.settled();
  assert.equal(pipeline.paused, true);
  assert.equal(pipeline.stopped, false, 'the pipeline must outlive the camera being off');
  assert.equal(pipeline.input, null, 'the device is released');
  assert.deepEqual(rig.daily.calls, callsBefore, 'turning the camera off must not involve Daily’s input settings');

  rig.daily.setCamera(true);
  await tick(10);
  await rig.controller.settled();
  assert.equal(pipeline.resumed.length, 1);
  assert.deepEqual(rig.opened, [{ deviceId: 'cam-default', width: 1280, height: 720, frameRate: 30 }], 'the same camera, at the same size');
  assert.equal(pipeline.paused, false);
  assert.deepEqual(rig.daily.calls, callsBefore);
  assert.equal(rig.daily.custom, sentBefore, 'the track Daily sends is still the pipeline’s');
  assert.equal(rig.controller.getSnapshot().running, true);
});

test('a camera that goes off and on again while it is being reopened is not left running', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  const [pipeline] = rig.pipelines;
  rig.daily.setCamera(false);
  const reopened: FakeTrack[] = [];
  // the next open takes a while, and the camera goes off again meanwhile
  const realOpen = (rig.controller as unknown as { deps: EffectsDeps }).deps.openCamera;
  (rig.controller as unknown as { deps: EffectsDeps }).deps.openCamera = async (request) => {
    const track = await realOpen(request);
    reopened.push(track as unknown as FakeTrack);
    await tick(20);
    return track;
  };
  rig.daily.setCamera(true);
  await tick(5);
  rig.daily.setCamera(false);
  await tick(40);
  await rig.controller.settled();
  assert.equal(pipeline.resumed.length, 0, 'a camera that is off again must not be resumed');
  assert.equal(reopened[0].readyState, 'ended', 'the just-opened camera must be let go of');
  assert.equal(pipeline.paused, true);
});

test('asked for while the camera is off, the effects wait — and start when it comes on', async () => {
  const rig = setup();
  rig.daily.setCamera(false);
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  assert.equal(rig.pipelines.length, 0);
  assert.deepEqual(rig.daily.calls, []);
  assert.equal(rig.controller.getSnapshot().settings.background.mode, 'blur', 'the choice is kept');
  assert.equal(rig.controller.getSnapshot().running, false);
  rig.daily.setCamera(true);
  await tick(10);
  await rig.controller.settled();
  assert.equal(rig.pipelines.length, 1);
  assert.equal(rig.controller.getSnapshot().running, true);
});

test('switching camera while the effects have it: done in the pipeline, with no Daily call and no break in the picture', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  const [pipeline] = rig.pipelines;
  const callsBefore = [...rig.daily.calls];
  let daily = 0;
  await rig.controller.selectCamera('cam-2', async () => void daily++);
  assert.equal(daily, 0, 'Daily cannot switch a camera under a custom track');
  assert.deepEqual(rig.opened.at(-1), { deviceId: 'cam-2', width: 1280, height: 720, frameRate: 30 });
  assert.equal(pipeline.swapped.length, 1);
  assert.deepEqual(rig.daily.calls, callsBefore);
  assert.equal(rig.controller.getSnapshot().cameraDeviceId, 'cam-2');
  // and giving the camera back now names the NEW camera
  await rig.controller.setBackground({ mode: 'none' });
  assert.deepEqual(rig.daily.calls.at(-1), 'device:cam-2');
});

test('a camera that will not open leaves the old one running, and says so', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  const [pipeline] = rig.pipelines;
  rig.failOpen.error = new Error('NotReadableError');
  await assert.rejects(rig.controller.selectCamera('cam-2', async () => undefined));
  assert.equal(pipeline.swapped.length, 0);
  assert.equal(rig.controller.getSnapshot().cameraDeviceId, 'cam-default');
  rig.failOpen.error = null;
  // …and the old camera is what comes back later
  await rig.controller.setBackground({ mode: 'none' });
  assert.equal(rig.daily.calls.at(-1), 'device:cam-default');
});

test('with no effects on, the camera is switched by Daily as always', async () => {
  const rig = setup();
  await ready(rig);
  let daily = 0;
  await rig.controller.selectCamera('cam-2', async () => void daily++);
  assert.equal(daily, 1);
  assert.equal(rig.opened.length, 0);
});

test('switching camera while it is off is remembered for when it comes back', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  rig.daily.setCamera(false);
  await rig.controller.settled();
  await rig.controller.selectCamera('cam-3', async () => undefined);
  assert.equal(rig.opened.length, 0, 'nothing is opened while the camera is off');
  rig.daily.setCamera(true);
  await tick(10);
  await rig.controller.settled();
  assert.equal(rig.opened.at(-1)!.deviceId, 'cam-3');
  assert.equal(rig.pipelines[0].resumed.length, 1);
});

test('a pipeline that cannot start leaves the camera exactly as it was, takes the choice back, and tells the person', async () => {
  const rig = setup();
  await ready(rig);
  const camera = rig.daily.native!;
  rig.failStart.error = new Error('WebGL 2 is not available');
  await rig.controller.setBackground(BLUR);
  assert.deepEqual(rig.daily.calls, [], 'Daily must not have been touched');
  assert.equal(rig.daily.native, camera);
  assert.equal(camera.readyState, 'live', 'Daily’s own camera track must not have been stopped');
  const s = rig.controller.getSnapshot();
  assert.equal(s.settings.background.mode, 'none', 'the control must not say On when nothing is happening');
  assert.equal(s.running, false);
  assert.match(s.error ?? '', /couldn't start/i);
});

test('Daily refusing the output stops the pipeline, leaves the camera alone and takes the choice back', async () => {
  const rig = setup();
  await ready(rig);
  rig.daily.failNext = new Error('input-settings-error');
  await rig.controller.setBackground(BLUR);
  assert.equal(rig.pipelines[0].stopped, true);
  assert.equal(rig.daily.native?.readyState, 'live');
  assert.equal(rig.controller.getSnapshot().settings.background.mode, 'none');
  assert.ok(rig.controller.getSnapshot().error);
});

test('Daily accepting the output but never sending it is put right: the camera is handed back and nothing is left running', async () => {
  const rig = setup();
  await ready(rig);
  rig.daily.ignoreCustom = true; // the call resolves, but Daily keeps sending its own camera
  await rig.controller.setBackground(BLUR);
  assert.equal(rig.pipelines[0].stopped, true);
  assert.equal(rig.controller.getSnapshot().running, false);
  assert.equal(rig.controller.getSnapshot().settings.background.mode, 'none');
  assert.equal(rig.daily.native?.readyState, 'live');
  assert.equal(rig.daily.video().state, 'playable');
});

const stalled = { reason: 'stalled', message: 'stalled', recoverable: true } as const;

test('effects that break are started again, quietly: the camera goes back to Daily by name for a moment, the effects restart, and the person’s choice never changes', async () => {
  const rig = setup();
  rig.daily.selectedDevice = 'cam-external';
  rig.daily.native = new FakeTrack('daily-camera', 'cam-external');
  await ready(rig);
  await rig.controller.setAppearance({ lighting: 0.6, touchUp: true, autoFraming: true });
  await rig.controller.setBackground(BLUR);
  const first = rig.pipelines[0];
  first.events.onFailure(stalled);
  await tick(5);
  await rig.controller.settled();

  assert.equal(rig.pipelines.length, 2, 'a new pipeline was started');
  assert.equal(first.stopped, true, 'the one that broke is let go of');
  const second = rig.pipelines[1];
  assert.equal(second.stopped, false);
  assert.equal(rig.daily.custom?.id, (second.output as unknown as FakeTrack).id, 'Daily sends the new output');
  assert.ok(rig.daily.calls.includes('device:cam-external'), 'the camera went back to Daily by name — the person’s own camera');
  assert.equal(rig.daily.calls.at(-1), `custom:${(second.output as unknown as FakeTrack).id}`);
  const s = rig.controller.getSnapshot();
  assert.equal(s.settings.background.mode, 'blur', 'the background is still what the person chose');
  assert.deepEqual([s.settings.appearance.lighting, s.settings.appearance.touchUp, s.settings.appearance.autoFraming], [0.6, true, true]);
  assert.equal(s.running, true);
  assert.equal(s.error, null, 'and nothing is shown: it was mended');
  assert.deepEqual(second.startSettings, s.settings, 'the new pipeline starts with everything that was asked for');
});

test('each kind of break that a restart can mend is mended: a lost graphics context, errors, a camera that stopped', async () => {
  for (const reason of ['gpu-lost', 'errors', 'input-ended', 'stalled'] as const) {
    const rig = setup();
    await ready(rig);
    await rig.controller.setBackground(BLUR);
    rig.pipelines[0].events.onFailure({ reason, message: reason, recoverable: true });
    await tick(5);
    await rig.controller.settled();
    assert.equal(rig.pipelines.length, 2, reason);
    assert.equal(rig.controller.getSnapshot().settings.background.mode, 'blur', reason);
    assert.equal(rig.controller.getSnapshot().error, null, reason);
    rig.daily.emit('left-meeting');
  }
});

test('effects that keep breaking are given up on after a few tries: the camera stays with Daily, the controls go Off, and the person is told', async () => {
  const rig = setup();
  rig.daily.selectedDevice = 'cam-external';
  rig.daily.native = new FakeTrack('daily-camera', 'cam-external');
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  for (let attempt = 0; attempt < 3; attempt++) {
    rig.pipelines.at(-1)!.events.onFailure(stalled);
    await tick(5);
    await rig.controller.settled();
    assert.equal(rig.controller.getSnapshot().settings.background.mode, 'blur', `still on after break ${attempt + 1}`);
  }
  assert.equal(rig.pipelines.length, 4, 'the first, and three restarts');
  rig.pipelines.at(-1)!.events.onFailure(stalled); // the fourth within the window
  await tick(5);
  await rig.controller.settled();
  assert.equal(rig.pipelines.length, 4, 'no more restarts');
  assert.equal(rig.pipelines.at(-1)!.stopped, true);
  assert.equal(rig.daily.calls.at(-1), 'device:cam-external');
  assert.equal(rig.daily.video().state, 'playable');
  const s = rig.controller.getSnapshot();
  assert.deepEqual([s.settings.background.mode, s.running], ['none', false]);
  assert.match(s.error ?? '', /stopped working.*camera is still on/i);
});

test('a video that has all but stopped for cost is not started again — it would only come back — and says why', async () => {
  const rig = setup();
  rig.daily.selectedDevice = 'cam-external';
  rig.daily.native = new FakeTrack('daily-camera', 'cam-external');
  await ready(rig);
  await rig.controller.setAppearance({ lighting: 0.6, touchUp: true, autoFraming: true });
  rig.pipelines[0].events.onFailure({ reason: 'too-slow', message: 'slow', recoverable: false });
  await tick(5);
  await rig.controller.settled();
  assert.equal(rig.pipelines.length, 1, 'no second pipeline');
  assert.equal(rig.daily.calls.at(-1), 'device:cam-external');
  assert.equal(rig.daily.video().state, 'playable');
  assert.equal(rig.pipelines[0].stopped, true);
  const s = rig.controller.getSnapshot();
  assert.deepEqual([s.settings.appearance.touchUp, s.settings.appearance.autoFraming, s.settings.appearance.lighting], [false, false, 0]);
  assert.match(s.error ?? '', /couldn't keep up.*camera is still on/i);
});

test('a restart waits for its pause, with Daily’s own camera meanwhile — and a choice made in the meantime starts the effects at once', async () => {
  const rig = setup({ options: { restartPausesMs: [200, 200, 200] } });
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  rig.pipelines[0].events.onFailure(stalled);
  await tick(30);
  await rig.controller.settled();
  assert.equal(rig.pipelines.length, 1, 'not yet');
  assert.equal(rig.daily.custom, null, 'the camera is Daily’s own meanwhile');
  assert.equal(rig.daily.video().state, 'playable');
  const s = rig.controller.getSnapshot();
  assert.deepEqual([s.settings.background.mode, s.running, s.error], ['blur', false, null], 'the choice is still shown');
  // the person chooses something themselves: no waiting
  await rig.controller.setBackground({ mode: 'blur-slight' });
  assert.equal(rig.pipelines.length, 2);
  assert.equal(rig.controller.getSnapshot().running, true);
  rig.daily.emit('left-meeting');
});

test('left to itself, the pause ends and the effects start again', async () => {
  const rig = setup({ options: { restartPausesMs: [60, 60, 60] } });
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  rig.pipelines[0].events.onFailure(stalled);
  await tick(20);
  assert.equal(rig.pipelines.length, 1);
  await tick(150);
  await rig.controller.settled();
  assert.equal(rig.pipelines.length, 2);
  assert.equal(rig.controller.getSnapshot().running, true);
  rig.daily.emit('left-meeting');
});

test('effects that break while the camera is off start again when the camera comes back — and not before', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  rig.daily.setCamera(false);
  await tick(5);
  rig.pipelines[0].events.onFailure({ reason: 'gpu-lost', message: 'lost', recoverable: true });
  await tick(5);
  await rig.controller.settled();
  assert.equal(rig.pipelines.length, 1, 'nothing is started on a camera that is off');
  assert.equal(rig.controller.getSnapshot().settings.background.mode, 'blur', 'the choice is kept');
  rig.daily.setCamera(true);
  await tick(5);
  await rig.controller.settled();
  assert.equal(rig.pipelines.length, 2);
  assert.equal(rig.controller.getSnapshot().running, true);
  rig.daily.emit('left-meeting');
});

test('if Daily will not take the camera back for the restart, the picture is left flowing, the effects look off, and the hand-back is tried again', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  rig.daily.failNext = new Error('could not switch');
  rig.pipelines[0].events.onFailure(stalled);
  await tick(5);
  await rig.controller.settled();
  const [pipeline] = rig.pipelines;
  assert.equal(pipeline.stopped, false, 'the picture is not left without a source');
  assert.equal(rig.daily.video().state, 'playable');
  assert.equal(pipeline.updates.at(-1)!.background.mode, 'none', 'the effects look off');
  assert.equal(rig.controller.getSnapshot().settings.background.mode, 'none');
  assert.match(rig.controller.getSnapshot().error ?? '', /couldn't switch the effects off/i);
  rig.daily.emit('left-meeting');
});

test('an effect whose model cannot be loaded is taken back by itself; the others carry on', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setAppearance(light(0.8));
  // the background is asked for, and its model turns out to be unavailable
  await rig.controller.setBackground(BLUR);
  rig.pipelines[0].events.onUnavailable('background', 'Background effects could not be loaded.');
  await tick(5);
  await rig.controller.settled();
  const s = rig.controller.getSnapshot();
  assert.equal(s.settings.background.mode, 'none', 'the control must go back to None');
  assert.equal(s.settings.appearance.lighting, 0.8, 'lighting carries on');
  assert.equal(s.running, true);
  assert.equal(rig.pipelines[0].stopped, false);
  assert.match(s.error ?? '', /could not be loaded/);
});

test('an effect that was the only one on, and cannot be loaded, gives the camera back', async () => {
  const rig = setup();
  await ready(rig);
  rig.duringStart.run = (events) => events.onUnavailable('background', 'Background effects could not be loaded.');
  await rig.controller.setBackground(BLUR);
  await rig.controller.settled();
  assert.equal(rig.controller.getSnapshot().settings.background.mode, 'none');
  assert.equal(rig.controller.getSnapshot().running, false);
  assert.equal(rig.daily.video().state, 'playable');
  assert.equal(rig.daily.custom, null, 'Daily must be back on its own camera');
  assert.equal(rig.pipelines[0].stopped, true);
});

test('a hand-back that fails leaves the picture flowing, looks off, and is tried again', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  rig.daily.failNext = new Error('could not switch');
  await rig.controller.setBackground({ mode: 'none' });
  const [pipeline] = rig.pipelines;
  assert.equal(pipeline.stopped, false, 'the picture must not be left without a source');
  assert.equal(rig.daily.video().state, 'playable');
  assert.equal(pipeline.updates.at(-1)!.background.mode, 'none', 'the effects look off');
  assert.match(rig.controller.getSnapshot().error ?? '', /couldn't switch the effects off/i);
  // the next time it is asked for, it completes
  await rig.controller.setBackground({ mode: 'none' });
  assert.equal(pipeline.stopped, true);
  assert.equal(rig.daily.custom, null);
});

test('leaving the call lets go of the camera at once, and asks Daily nothing', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  const calls = [...rig.daily.calls];
  rig.daily.emit('left-meeting');
  assert.equal(rig.controller.isDisposed, true);
  assert.equal(rig.pipelines[0].stopped, true);
  assert.equal((rig.pipelines[0].output as unknown as FakeTrack).readyState, 'ended', 'the output is stopped too');
  assert.deepEqual(rig.daily.calls, calls);
  // a controller that is finished does nothing more
  await rig.controller.setBackground({ mode: 'none' });
  assert.deepEqual(rig.daily.calls, calls);
});

test('a burst of choices is applied once, as the last of them', async () => {
  const rig = setup();
  await ready(rig);
  void rig.controller.setAppearance(light(0.2));
  void rig.controller.setAppearance(light(0.4));
  void rig.controller.setBackground(BLUR);
  void rig.controller.setAppearance({ lighting: 0.9, touchUp: true, autoFraming: false });
  await rig.controller.settled();
  assert.equal(rig.pipelines.length, 1);
  assert.equal(rig.daily.calls.length, 1);
  assert.equal(rig.pipelines[0].startSettings.appearance.lighting, 0.9);
  assert.equal(rig.pipelines[0].startSettings.background.mode, 'blur');
  assert.equal(rig.controller.getSnapshot().settings.appearance.touchUp, true);
});

test('turning an effect on and straight off again never leaves anything running or Daily on the wrong camera', async () => {
  const rig = setup();
  await ready(rig);
  void rig.controller.setBackground(BLUR);
  void rig.controller.setBackground({ mode: 'none' });
  await rig.controller.settled();
  assert.equal(rig.daily.custom, null);
  assert.equal(rig.daily.video().state, 'playable');
  for (const p of rig.pipelines) assert.equal(p.stopped, true);
});

test('something else switching Daily’s camera under the effects is put right, not left as an On that does nothing', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  const output = rig.pipelines[0].output as unknown as FakeTrack;
  rig.daily.externalSwitch('cam-9'); // Daily now sends its own camera again
  for (let i = 0; i < 4; i++) rig.daily.emit('participant-updated');
  await tick(20);
  await rig.controller.settled();
  assert.equal(rig.daily.custom, output, 'the effects’ output must be put back');
  assert.equal(rig.controller.getSnapshot().running, true);
});

test('…and if Daily will not take it back, the effects are switched off with the reason shown', async () => {
  const rig = setup();
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  rig.daily.externalSwitch('cam-9');
  rig.daily.ignoreCustom = true;
  for (let i = 0; i < 4; i++) rig.daily.emit('participant-updated');
  await tick(400);
  await rig.controller.settled();
  assert.equal(rig.controller.getSnapshot().settings.background.mode, 'none');
  assert.equal(rig.pipelines[0].stopped, true);
  assert.equal(rig.daily.video().state, 'playable');
  assert.ok(rig.controller.getSnapshot().error);
});

test('a browser that cannot do effects keeps the choice, applies nothing, and says why', async () => {
  const rig = setup({ supported: false, reason: 'Video effects aren’t available on phones.' });
  await ready(rig);
  await rig.controller.setBackground(BLUR);
  const s = rig.controller.getSnapshot();
  assert.deepEqual([s.supported, s.unsupportedReason, s.settings.background.mode], [false, 'Video effects aren’t available on phones.', 'blur']);
  assert.deepEqual(rig.daily.calls, []);
  assert.equal(rig.pipelines.length, 0);
});

test('a choice made before it is known whether the browser can do effects is applied once it is known', async () => {
  const rig = setup();
  // no tick yet: `support` has not answered
  void rig.controller.setBackground(BLUR);
  await tick();
  await rig.controller.settled();
  assert.equal(rig.pipelines.length, 1);
  assert.equal(rig.controller.getSnapshot().running, true);
});

test('the error is shown, then goes by itself, and a new choice clears it at once', async () => {
  const rig = setup();
  await ready(rig);
  rig.failStart.error = new Error('nope');
  await rig.controller.setBackground(BLUR);
  assert.ok(rig.controller.getSnapshot().error);
  rig.failStart.error = null;
  await rig.controller.setBackground(BLUR);
  assert.equal(rig.controller.getSnapshot().error, null);
  assert.equal(rig.controller.getSnapshot().running, true);
});

test('subscribers hear of changes, and nothing after they unsubscribe', async () => {
  const rig = setup();
  await ready(rig);
  let heard = 0;
  const off = rig.controller.subscribe(() => heard++);
  await rig.controller.setBackground(BLUR);
  assert.ok(heard > 0);
  off();
  const before = heard;
  await rig.controller.setBackground({ mode: 'none' });
  assert.equal(heard, before);
});

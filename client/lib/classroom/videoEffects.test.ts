import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLUR_FULL_STRENGTH,
  BLUR_SLIGHT_STRENGTH,
  DEFAULT_LIGHTING,
  VideoEffectsController,
  isAppearanceNeutral,
} from './videoEffects.ts';
import type { EffectsCall, EffectsDeps, VideoInputSettings } from './videoEffects.ts';
import type { AppearanceOptions, AppearancePipeline } from './appearanceProcessor.ts';
import type { ParticipantLike, TrackStateLike } from './daily/peers.ts';
import { fakeTrack, participant } from './daily/testing.ts';

class FakeCall implements EffectsCall {
  settingsLog: VideoInputSettings[] = [];
  handlers = new Map<string, Set<(e: unknown) => void>>();
  video: TrackStateLike = { state: 'playable', persistentTrack: fakeTrack('cam-1', 'video'), track: undefined };
  failNext: Error | null = null;
  /** Lets a test hold an update open to see what runs meanwhile. */
  gate: Promise<void> | null = null;

  async updateInputSettings(settings: VideoInputSettings) {
    this.settingsLog.push(settings);
    if (this.gate) await this.gate;
    if (this.failNext) {
      const err = this.failNext;
      this.failNext = null;
      throw err;
    }
    return {};
  }
  participants(): Record<string, ParticipantLike> {
    return { local: participant('me', { local: true, tracks: { video: this.video } }) };
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
  setCamera(state: 'playable' | 'off', id = 'cam-1') {
    this.video = state === 'off' ? { state: 'off', off: { byUser: true } } : { state: 'playable', persistentTrack: fakeTrack(id, 'video') };
    this.emit('participant-updated', {});
  }
  summary() {
    return this.settingsLog.map((s) => {
      if (s.video.processor) return s.video.processor.type;
      if (s.video.settings && 'customTrack' in s.video.settings) return 'custom-track';
      return 'daily-camera';
    });
  }
}

function setup(over: { supported?: boolean; resolveImage?: EffectsDeps['resolveImage'] } = {}) {
  const call = new FakeCall();
  const pipelines: (AppearancePipeline & { input: MediaStreamTrack; options: AppearanceOptions[]; stopped: boolean })[] = [];
  const deps: EffectsDeps = {
    createPipeline: (input, options) => {
      const p = {
        input,
        options: [options],
        stopped: false,
        output: fakeTrack(`processed-${pipelines.length + 1}`, 'video'),
        update(o: AppearanceOptions) {
          this.options.push(o);
        },
        stop() {
          this.stopped = true;
        },
      };
      pipelines.push(p);
      return p;
    },
    resolveImage: over.resolveImage ?? (async (path) => `https://lumexa.test${path}`),
    supported: async () => over.supported ?? true,
  };
  // the camera the pipeline is given is a clone of Daily's
  (call.video.persistentTrack as unknown as { clone: () => MediaStreamTrack }).clone = () => fakeTrack('clone-of-cam-1', 'video');
  const controller = new VideoEffectsController(call, deps);
  return { call, controller, pipelines };
}

const ready = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const bright: AppearanceOptions = { ...DEFAULT_LIGHTING, brightness: 1.2 };

test('nothing is on to begin with', async () => {
  const { controller } = setup();
  await ready();
  const s = controller.getSnapshot();
  assert.deepEqual([s.backgroundEffect.mode, s.pending, s.error, s.supported], ['none', false, null, true]);
  assert.equal(isAppearanceNeutral(s.lighting), true);
});

test('a browser that cannot do effects keeps the choice but applies nothing', async () => {
  const { controller, call } = setup({ supported: false });
  await ready();
  assert.equal(controller.getSnapshot().supported, false);
  await controller.setBackground({ mode: 'blur' });
  await controller.setLighting(bright);
  assert.equal(controller.getSnapshot().backgroundEffect.mode, 'blur');
  assert.deepEqual(call.settingsLog, []);
});

test('blur is a Daily processor with the strength for the choice', async () => {
  const { controller, call } = setup();
  await ready();
  await controller.setBackground({ mode: 'blur-slight' });
  await controller.setBackground({ mode: 'blur' });
  assert.deepEqual(call.settingsLog.map((s) => s.video.processor), [
    { type: 'background-blur', config: { strength: BLUR_SLIGHT_STRENGTH } },
    { type: 'background-blur', config: { strength: BLUR_FULL_STRENGTH } },
  ]);
});

test('a virtual background hands Daily the image in the form it takes — a public address, or the bytes of an uploaded picture', async () => {
  const bytes = new ArrayBuffer(8);
  const { controller, call } = setup({ resolveImage: async (path) => (path.startsWith('blob:') ? bytes : `https://lumexa.test${path}`) });
  await ready();
  await controller.setBackground({ mode: 'image', imagePath: '/classroom-backgrounds/space-lab.jpg', label: 'Space' });
  await controller.setBackground({ mode: 'image', imagePath: 'blob:http://x/abc', label: 'Custom' });
  assert.deepEqual(call.settingsLog.map((s) => s.video.processor), [
    { type: 'background-image', config: { source: 'https://lumexa.test/classroom-backgrounds/space-lab.jpg' } },
    { type: 'background-image', config: { source: bytes } },
  ]);
});

test('choosing no background takes the processor away — and does nothing when there was none', async () => {
  const { controller, call } = setup();
  await ready();
  await controller.setBackground({ mode: 'none' });
  assert.deepEqual(call.settingsLog, []);
  await controller.setBackground({ mode: 'blur' });
  await controller.setBackground({ mode: 'none' });
  assert.deepEqual(call.summary(), ['background-blur', 'none']);
});

test('lighting runs a pipeline on a copy of the camera and tells Daily to send its output', async () => {
  const { controller, call, pipelines } = setup();
  await ready();
  await controller.setLighting(bright);
  assert.equal(pipelines.length, 1);
  assert.equal(pipelines[0].input.id, 'clone-of-cam-1', 'a clone, so Daily keeps its own track');
  assert.deepEqual(pipelines[0].options, [bright]);
  assert.deepEqual(call.summary(), ['custom-track']);
  assert.equal((call.settingsLog[0].video.settings as { customTrack: MediaStreamTrack }).customTrack, pipelines[0].output);
});

test('changing lighting again updates the running pipeline instead of starting another', async () => {
  const { controller, call, pipelines } = setup();
  await ready();
  await controller.setLighting(bright);
  const more = { ...bright, touchUp: true };
  await controller.setLighting(more);
  assert.equal(pipelines.length, 1);
  assert.deepEqual(pipelines[0].options, [bright, more]);
  assert.deepEqual(call.summary(), ['custom-track']);
});

test('putting the sliders back to neutral hands the camera back to Daily and stops the pipeline', async () => {
  const { controller, call, pipelines } = setup();
  await ready();
  await controller.setLighting(bright);
  await controller.setLighting(DEFAULT_LIGHTING);
  assert.deepEqual(call.summary(), ['custom-track', 'daily-camera']);
  assert.equal(pipelines[0].stopped, true);
});

test('a background and the appearance bundle exclude each other, whichever came first', async () => {
  const { controller, call, pipelines } = setup();
  await ready();
  await controller.setLighting(bright);
  await controller.setBackground({ mode: 'blur' });
  assert.deepEqual(call.summary(), ['custom-track', 'daily-camera', 'background-blur']);
  assert.equal(pipelines[0].stopped, true);
  assert.equal(isAppearanceNeutral(controller.getSnapshot().lighting), true);

  await controller.setLighting(bright);
  assert.deepEqual(call.summary().slice(3), ['none', 'custom-track']);
  assert.equal(controller.getSnapshot().backgroundEffect.mode, 'none');
  assert.equal(pipelines.length, 2);
});

test('turning the camera off lets go of it (nothing may hold it) and turning it on brings the effect back', async () => {
  const { controller, call, pipelines } = setup();
  await ready();
  await controller.setLighting(bright);

  call.setCamera('off');
  await controller.settled();
  assert.equal(pipelines[0].stopped, true);
  assert.deepEqual(call.summary(), ['custom-track', 'daily-camera'], 'Daily is not left pointing at a stopped track');

  (call.video as { persistentTrack?: MediaStreamTrack }).persistentTrack = undefined;
  call.setCamera('playable', 'cam-2');
  (call.video.persistentTrack as unknown as { clone: () => MediaStreamTrack }).clone = () => fakeTrack('clone-of-cam-2', 'video');
  call.emit('participant-updated', {});
  await controller.settled();
  assert.equal(pipelines.length, 2);
  assert.equal(pipelines[1].input.id, 'clone-of-cam-2');
  assert.deepEqual(pipelines[1].options, [bright]);
  assert.deepEqual(call.summary(), ['custom-track', 'daily-camera', 'custom-track']);
});

test('lighting chosen while the camera is off waits for the camera', async () => {
  const { controller, call, pipelines } = setup();
  await ready();
  call.setCamera('off');
  await controller.setLighting(bright);
  assert.equal(pipelines.length, 0);
  assert.deepEqual(call.settingsLog, []);
  call.setCamera('playable', 'cam-3');
  (call.video.persistentTrack as unknown as { clone: () => MediaStreamTrack }).clone = () => fakeTrack('clone-of-cam-3', 'video');
  call.emit('participant-updated', {});
  await controller.settled();
  assert.equal(pipelines.length, 1);
  assert.equal(pipelines[0].input.id, 'clone-of-cam-3');
});

test('the camera going on and off does not touch a Daily background — Daily keeps those itself', async () => {
  const { controller, call } = setup();
  await ready();
  await controller.setBackground({ mode: 'blur' });
  call.setCamera('off');
  call.setCamera('playable', 'cam-2');
  await controller.settled();
  assert.deepEqual(call.summary(), ['background-blur']);
});

test('switching camera takes the pipeline down first and puts it back after', async () => {
  const { controller, call, pipelines } = setup();
  await ready();
  await controller.setLighting(bright);
  const log: string[] = [];
  const result = await controller.withCameraSwitch(async () => {
    log.push(`switching with pipeline stopped=${pipelines[0].stopped}`);
    call.video = { state: 'playable', persistentTrack: fakeTrack('cam-new', 'video') };
    (call.video.persistentTrack as unknown as { clone: () => MediaStreamTrack }).clone = () => fakeTrack('clone-of-cam-new', 'video');
    return 'switched';
  });
  await controller.settled();
  assert.equal(result, 'switched');
  assert.deepEqual(log, ['switching with pipeline stopped=true']);
  assert.equal(pipelines.length, 2);
  assert.equal(pipelines[1].input.id, 'clone-of-cam-new');
});

test('switching camera with no effect running just switches it', async () => {
  const { controller, call, pipelines } = setup();
  await ready();
  assert.equal(await controller.withCameraSwitch(async () => 42), 42);
  await controller.settled();
  assert.equal(pipelines.length, 0);
  assert.deepEqual(call.settingsLog, []);
});

test('when Daily refuses an effect the person is told, the pipeline does not leak, and the next try works', async () => {
  const { controller, call, pipelines } = setup();
  await ready();
  call.failNext = new Error('refused');
  await controller.setLighting(bright);
  assert.match(controller.getSnapshot().error!, /Could not apply/);
  assert.equal(pipelines[0].stopped, true);
  assert.equal(controller.getSnapshot().pending, false);

  await controller.setLighting({ ...bright, contrast: 1.1 });
  assert.equal(controller.getSnapshot().error, null);
  assert.equal(pipelines.length, 2);
  assert.equal(pipelines[1].stopped, false);
});

test('a background that cannot be applied says so', async () => {
  const { controller, call } = setup();
  await ready();
  call.failNext = new Error('refused');
  await controller.setBackground({ mode: 'blur' });
  assert.match(controller.getSnapshot().error!, /background/);
  call.emit('nonfatal-error', { type: 'video-processor-error' });
  assert.match(controller.getSnapshot().error!, /background/);
});

test('an image that cannot be read is a failed background, not a crash', async () => {
  const { controller, call } = setup({
    resolveImage: async () => {
      throw new Error('not an image');
    },
  });
  await ready();
  await controller.setBackground({ mode: 'image', imagePath: '/x.jpg', label: 'x' });
  assert.match(controller.getSnapshot().error!, /background/);
  assert.deepEqual(call.settingsLog, []);
});

test('changes are applied one at a time, in the order they were asked for', async () => {
  const { controller, call } = setup();
  await ready();
  let release: () => void = () => undefined;
  call.gate = new Promise<void>((resolve) => (release = resolve));
  const a = controller.setBackground({ mode: 'blur-slight' });
  const b = controller.setBackground({ mode: 'blur' });
  await ready();
  assert.equal(call.settingsLog.length, 1, 'the second waits for the first');
  assert.equal(controller.getSnapshot().pending, true);
  release();
  await Promise.all([a, b]);
  assert.equal(call.settingsLog.length, 2);
  assert.equal(controller.getSnapshot().pending, false);
  assert.equal((call.settingsLog[1].video.processor as { config: { strength: number } }).config.strength, BLUR_FULL_STRENGTH);
});

test('leaving the call lets go of the camera and ends all effects work', async () => {
  const { controller, call, pipelines } = setup();
  await ready();
  await controller.setLighting(bright);
  call.emit('left-meeting', {});
  assert.equal(pipelines[0].stopped, true);
  assert.equal(controller.isDisposed, true);
  assert.equal([...call.handlers.values()].reduce((n, s) => n + s.size, 0), 0);
  await controller.setBackground({ mode: 'blur' });
  assert.equal(call.settingsLog.length, 1, 'nothing more is sent to a finished call');
});

test('subscribers hear about every change', async () => {
  const { controller } = setup();
  await ready();
  let heard = 0;
  controller.subscribe(() => heard++);
  await controller.setBackground({ mode: 'blur' });
  assert.ok(heard >= 2, 'the choice, then pending on/off');
});

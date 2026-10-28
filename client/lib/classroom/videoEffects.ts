// FILE PATH: client/lib/classroom/videoEffects.ts
//
// Background blur / virtual backgrounds and the Appearance bundle (lighting,
// touch-up, auto-framing) for the local camera, on a Daily call. There is one
// controller per call (effectsFor), so the choice made on the pre-join screen is
// the very same one the classroom shows and changes afterwards.
//
//   - Background blur and virtual backgrounds are Daily's own video processors
//     (call.updateInputSettings), which Daily keeps applied across camera
//     off/on. Daily supports them on desktop browsers only.
//   - The Appearance bundle is ours (appearanceProcessor.ts): a processed copy of
//     the camera that Daily is told to send instead of its own — its "custom
//     track". The pipeline owns a CLONE of Daily's camera track; stopping it hands
//     the camera back to Daily.
//
// Only one of the two can be active, as before (picking one clears the other).
// While the camera is off nothing may hold it, so a running Appearance pipeline is
// taken down then and started again when the camera comes back on.
//
// Plain TypeScript with no Daily import and no browser APIs of its own (they come
// in as `deps`), so the sequencing can be tested with fakes.

import { DEFAULT_BACKGROUND_EFFECT } from './backgrounds.ts';
import type { BackgroundEffect } from './backgrounds.ts';
import type { AppearanceOptions, AppearancePipeline } from './appearanceProcessor.ts';
import type { ParticipantLike } from './daily/peers.ts';

export const DEFAULT_LIGHTING: AppearanceOptions = {
  brightness: 1,
  contrast: 1,
  touchUp: false,
  autoFraming: false,
};

/** Daily's blur strength (0–1, 1 strongest) for each of the two blur choices. */
export const BLUR_SLIGHT_STRENGTH = 0.35;
export const BLUR_FULL_STRENGTH = 1;

export function isAppearanceNeutral(o: AppearanceOptions): boolean {
  return o.brightness === 1 && o.contrast === 1 && !o.touchUp && !o.autoFraming;
}

export interface EffectsState {
  backgroundEffect: BackgroundEffect;
  lighting: AppearanceOptions;
  /** Something is being applied. */
  pending: boolean;
  /** The last thing that went wrong, for the person to see; null when all is well. */
  error: string | null;
  /** This browser can do video effects at all. */
  supported: boolean;
}

/** The video input settings Daily is given. */
export interface VideoInputSettings {
  video: {
    processor?:
      | { type: 'none' }
      | { type: 'background-blur'; config: { strength: number } }
      | { type: 'background-image'; config: { source: string | ArrayBuffer } };
    settings?: { customTrack: MediaStreamTrack } | Record<string, never>;
  };
}

/** The part of a Daily call the effects use (a DailyCall fits). */
export interface EffectsCall {
  updateInputSettings(settings: VideoInputSettings): Promise<unknown>;
  participants(): Record<string, ParticipantLike>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Daily's handlers are typed per event
  on(event: any, handler: (e: any) => void): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: any, handler: (e: any) => void): unknown;
}

/** What the controller needs from the browser. */
export interface EffectsDeps {
  createPipeline(input: MediaStreamTrack, options: AppearanceOptions): AppearancePipeline;
  /** The image for a virtual background, in the form Daily takes it. */
  resolveImage(path: string): Promise<string | ArrayBuffer>;
  /** Whether video effects work in this browser. */
  supported(): Promise<boolean>;
}

type Active = 'background' | 'appearance' | null;

const APPLY_FAILED = 'Could not apply this on your device.';
const BACKGROUND_FAILED = 'Could not apply this background on your device.';

export class VideoEffectsController {
  private state: EffectsState = {
    backgroundEffect: DEFAULT_BACKGROUND_EFFECT,
    lighting: DEFAULT_LIGHTING,
    pending: false,
    error: null,
    supported: false,
  };
  private readonly listeners = new Set<() => void>();
  private active: Active = null;
  private pipeline: AppearancePipeline | null = null;
  /** The person wants the Appearance bundle, even while the camera is off. */
  private wantsAppearance = false;
  private queue: Promise<void> = Promise.resolve();
  private disposed = false;
  private readonly registered: [string, (e: never) => void][] = [];

  private readonly call: EffectsCall;
  private readonly deps: EffectsDeps;

  constructor(call: EffectsCall, deps: EffectsDeps) {
    this.call = call;
    this.deps = deps;
    this.listen('participant-updated', () => this.onParticipantUpdated());
    this.listen('nonfatal-error', (e: { type?: string }) => {
      // A video processor failing is a background; anything else in the input
      // settings (the custom camera track) is the appearance bundle.
      if (e?.type === 'video-processor-error') this.set({ error: BACKGROUND_FAILED });
      else if (e?.type === 'input-settings-error') this.set({ error: APPLY_FAILED });
    });
    // The call is over: nothing may keep holding the camera.
    this.listen('left-meeting', () => this.dispose());
    this.listen('call-instance-destroyed', () => this.dispose());
    void deps
      .supported()
      .then((supported) => this.set({ supported }))
      .catch(() => undefined);
  }

  /** The call is over (or the controller was told to let go): it does nothing more. */
  get isDisposed(): boolean {
    return this.disposed;
  }

  // ─── What React reads ───────────────────────────────────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): EffectsState => this.state;

  /** Resolves when everything asked for so far has been applied (or has failed). */
  settled(): Promise<void> {
    return this.queue;
  }

  // ─── Choices ────────────────────────────────────────────────────────────

  setBackground(next: BackgroundEffect): Promise<void> {
    this.set({ backgroundEffect: next, error: null });
    if (!this.state.supported) return Promise.resolve();
    return this.enqueue(async () => {
      try {
        if (next.mode === 'none') {
          if (this.active === 'background') await this.clearProcessor();
          return;
        }
        // Background and the Appearance bundle share one slot: picking a
        // background clears any active Appearance settings.
        await this.stopAppearance();
        await this.call.updateInputSettings({ video: { processor: await this.backgroundProcessor(next) } });
        this.active = 'background';
        this.wantsAppearance = false;
        this.set({ lighting: DEFAULT_LIGHTING });
      } catch (err) {
        console.error('Failed to apply background effect', err);
        this.set({ error: BACKGROUND_FAILED });
      }
    });
  }

  setLighting(next: AppearanceOptions): Promise<void> {
    this.set({ lighting: next, error: null });
    if (!this.state.supported) return Promise.resolve();
    return this.enqueue(async () => {
      try {
        if (isAppearanceNeutral(next)) {
          this.wantsAppearance = false;
          if (this.active === 'appearance') await this.stopAppearance();
          return;
        }
        this.wantsAppearance = true;
        if (this.active === 'background') await this.clearProcessor();
        if (this.pipeline) {
          this.pipeline.update(next);
        } else if (this.cameraIsOn()) {
          await this.startAppearance(next);
        } // else: started when the camera comes on (onParticipantUpdated)
        this.active = 'appearance';
        this.set({ backgroundEffect: DEFAULT_BACKGROUND_EFFECT });
      } catch (err) {
        console.error('Failed to apply appearance effect', err);
        this.set({ error: APPLY_FAILED });
      }
    });
  }

  /**
   * Runs `change` (switching the camera) with the Appearance pipeline out of the
   * way: it holds a copy of the old camera, and Daily cannot switch devices under
   * a custom track. The pipeline is rebuilt on the new camera afterwards.
   */
  async withCameraSwitch<T>(change: () => Promise<T>): Promise<T> {
    await this.enqueue(async () => {
      if (this.pipeline) await this.stopAppearance({ keepWanting: true });
    });
    try {
      return await change();
    } finally {
      void this.enqueue(() => this.resumeAppearance());
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const [event, handler] of this.registered) this.call.off(event, handler as never);
    this.registered.length = 0;
    this.pipeline?.stop();
    this.pipeline = null;
    this.listeners.clear();
  }

  // ─── Applying ───────────────────────────────────────────────────────────

  private async backgroundProcessor(effect: BackgroundEffect): Promise<NonNullable<VideoInputSettings['video']['processor']>> {
    if (effect.mode === 'image') {
      return { type: 'background-image', config: { source: await this.deps.resolveImage(effect.imagePath) } };
    }
    return {
      type: 'background-blur',
      config: { strength: effect.mode === 'blur-slight' ? BLUR_SLIGHT_STRENGTH : BLUR_FULL_STRENGTH },
    };
  }

  private async clearProcessor(): Promise<void> {
    await this.call.updateInputSettings({ video: { processor: { type: 'none' } } });
    if (this.active === 'background') this.active = null;
  }

  /** The camera track Daily itself holds, if the camera is on. */
  private ownCameraTrack(): MediaStreamTrack | null {
    const local = this.local();
    const video = local?.tracks.video;
    if (!video || video.state === 'off' || video.state === 'blocked') return null;
    return video.persistentTrack ?? video.track ?? null;
  }

  private local(): ParticipantLike | undefined {
    try {
      const all = this.call.participants();
      return all.local ?? Object.values(all).find((p) => p.local);
    } catch {
      return undefined;
    }
  }

  private cameraIsOn(): boolean {
    return this.ownCameraTrack() !== null;
  }

  private async startAppearance(options: AppearanceOptions): Promise<void> {
    const own = this.ownCameraTrack();
    if (!own) return;
    const pipeline = this.deps.createPipeline(own.clone(), options);
    try {
      await this.call.updateInputSettings({ video: { settings: { customTrack: pipeline.output } } });
    } catch (err) {
      pipeline.stop();
      throw err;
    }
    this.pipeline = pipeline;
  }

  /** Takes the Appearance pipeline down and hands the camera back to Daily. */
  private async stopAppearance(opts: { keepWanting?: boolean } = {}): Promise<void> {
    const pipeline = this.pipeline;
    if (!opts.keepWanting) this.wantsAppearance = false;
    if (!pipeline) {
      if (this.active === 'appearance' && !opts.keepWanting) this.active = null;
      return;
    }
    this.pipeline = null;
    try {
      await this.call.updateInputSettings({ video: { settings: {} } });
    } finally {
      pipeline.stop();
      if (!opts.keepWanting) this.active = null;
    }
  }

  private async resumeAppearance(): Promise<void> {
    if (this.disposed || !this.wantsAppearance || this.pipeline || !this.cameraIsOn()) return;
    try {
      await this.startAppearance(this.state.lighting);
    } catch (err) {
      console.error('Failed to bring the appearance effects back', err);
      this.set({ error: APPLY_FAILED });
    }
  }

  // ─── The camera going off and on ────────────────────────────────────────

  private onParticipantUpdated(): void {
    if (this.disposed) return;
    const cameraOn = this.cameraIsOn();
    if (!cameraOn && this.pipeline) {
      // Nothing may hold the camera while it is off — and Daily must not be left
      // pointing at a track that is about to end.
      void this.enqueue(async () => {
        try {
          await this.stopAppearance({ keepWanting: true });
        } catch (err) {
          console.error('Failed to let go of the camera', err);
        }
      });
    } else if (cameraOn && this.wantsAppearance && !this.pipeline) {
      void this.enqueue(() => this.resumeAppearance());
    }
  }

  // ─── Plumbing ───────────────────────────────────────────────────────────

  private listen<E>(event: string, handler: (e: E) => void): void {
    this.call.on(event, handler);
    this.registered.push([event, handler as (e: never) => void]);
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.queue.then(async () => {
      if (this.disposed) return;
      this.set({ pending: true });
      try {
        await task();
      } finally {
        this.set({ pending: false });
      }
    });
    this.queue = run.catch(() => undefined);
    return run.catch(() => undefined);
  }

  private set(patch: Partial<EffectsState>): void {
    const next = { ...this.state, ...patch };
    const keys = Object.keys(next) as (keyof EffectsState)[];
    if (keys.every((k) => Object.is(next[k], this.state[k]))) return;
    this.state = next;
    for (const listener of [...this.listeners]) listener();
  }
}

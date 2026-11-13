// FILE PATH: client/lib/classroom/videoEffects.ts
//
// The video effects (background blur and replacement, lighting adjustment, touch-up,
// auto-framing) for the local camera on a Daily call, from Daily's side: when the
// effects take over the camera, when they give it back, and what happens to the
// camera while they have it. The pictures themselves are made by the pipeline
// (effects/pipeline.ts). There is one controller per call (effectsFor), so what is
// chosen on the pre-join screen is the very thing the classroom shows and changes.
//
// How the camera is handled — and why it can no longer be switched off by an effect:
//
//   - Nothing is changed in Daily until there is something to do (an effect is asked
//     for while the camera is on). Then a CLONE of Daily's own camera track goes into
//     the pipeline, and only when the pipeline is producing pictures is Daily told to
//     send its output (`customTrack`). Daily is then asked whether it really is — if
//     not, everything is put back.
//   - From then on, turning effects on and off, changing the blur or the background,
//     does not touch Daily or the camera at all: it only changes the pipeline's
//     settings. The track Daily sends stays the same one.
//   - The camera going off and on (Daily's own button) is followed inside the
//     pipeline: it lets go of the camera when it goes off (the light goes out) and
//     opens it again when it comes on. Switching camera is done there too, by
//     selectCamera: the output carries on without a break. No Daily call is made.
//   - Only when every effect is off, or something has failed, is the camera given back
//     to Daily — by naming the camera explicitly, so the person's choice of camera is
//     kept — and the pipeline is stopped only once Daily has its own camera track
//     again.
//   - The person's choice outlasts hiccups. When the effects break (a stall, a lost
//     graphics context, a camera that stopped, a handover that came undone) the camera
//     goes back to Daily for a moment and the effects are started again — quietly, a
//     little later each time if it keeps happening — so the background does not
//     disappear a while into a class. Only when that has been tried a few times, or when
//     the cause is a video that has all but stopped for cost (a restart would only bring
//     it back), does the camera go to Daily for good and the control back to Off, with the
//     reason in `error` for the person to see.
//   - Anything that cannot be mended (a model that cannot load, a handover that will not
//     complete) ends the same way. Never a camera left off, a black picture, or a control
//     that says On while nothing is happening.
//
// Plain TypeScript with no Daily import and no browser APIs of its own (they come in as
// `deps`), so the sequencing can be tested with fakes.

import { DEFAULT_BACKGROUND_EFFECT } from './backgrounds.ts';
import type { BackgroundEffect } from './backgrounds.ts';
import { DEFAULT_SETTINGS, isNeutral } from './effects/options.ts';
import type { AppearanceOptions, EffectSettings } from './effects/options.ts';
import type { PipelineEvents, PipelineHandle } from './effects/pipeline.ts';
import { RetryBudget } from './effects/retry.ts';
import type { ParticipantLike } from './daily/peers.ts';

export { DEFAULT_APPEARANCE, DEFAULT_SETTINGS } from './effects/options.ts';

export interface EffectsState {
  /** What the person has asked for, and what is happening (a choice that cannot be
   * provided is taken back, with the reason in `error`). */
  settings: EffectSettings;
  /** Something is being started or switched. */
  busy: boolean;
  /** A model or a picture is being loaded (the first use takes a moment). */
  loading: boolean;
  /** The effects are running on the camera. (Asked for while the camera is off, they
   * start when it comes on.) */
  running: boolean;
  /** The last thing that went wrong, for the person to see; null when all is well. */
  error: string | null;
  /** This browser can do video effects at all. */
  supported: boolean;
  /** Why not, when it cannot. */
  unsupportedReason: string | null;
  /** The camera in use while the effects have it (Daily cannot say then); else null. */
  cameraDeviceId: string | null;
}

/** The part of a Daily call the effects use (a DailyCall fits). */
export interface EffectsCall {
  updateInputSettings(settings: { video: { settings: { customTrack: MediaStreamTrack } | { deviceId: string } | Record<string, never> } }): Promise<unknown>;
  participants(): Record<string, ParticipantLike>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Daily's handlers are typed per event
  on(event: any, handler: (e: any) => void): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: any, handler: (e: any) => void): unknown;
}

/** A camera to open. */
export interface CameraRequest {
  deviceId?: string;
  width?: number;
  height?: number;
  frameRate?: number;
}

/** What the controller needs from the browser. */
export interface EffectsDeps {
  /** Starts a pipeline on `input` (which it owns from then on); resolves when it is
   * producing pictures. */
  startPipeline(input: MediaStreamTrack, settings: EffectSettings, events: PipelineEvents): Promise<PipelineHandle>;
  /** Opens a camera. */
  openCamera(request: CameraRequest): Promise<MediaStreamTrack>;
  /** Whether video effects work in this browser, and if not, why. */
  support(): Promise<{ supported: boolean; reason: string | null }>;
}

export interface ControllerOptions {
  /** How long to wait for Daily to take up or let go of the output (ms). */
  handoffTimeoutMs?: number;
  /** How often to look while waiting (ms). */
  pollMs?: number;
  /** The pause (ms) before the 1st, 2nd, 3rd … time the effects are started again after they
   * broke; the number of pauses is the number of tries allowed in five minutes. */
  restartPausesMs?: readonly number[];
}

/** How the effects are started again after they broke: at once, then a little later each time. */
const DEFAULT_RESTART_PAUSES_MS = [0, 2_000, 8_000] as const;
/** Tries count over this long (ms): a hiccup an hour is mended each time; a failure that will
 * not go away is given up on. */
const RESTART_WINDOW_MS = 5 * 60_000;

/** An error whose message is fit for the person to read. */
export class EffectsError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'EffectsError';
  }
}

const START_FAILED = "Video effects couldn't start on this device. Your camera is unaffected.";
const STOPPED_WORKING = 'Video effects were turned off because they stopped working. Your camera is still on.';
const HAND_BACK_FAILED = "Couldn't switch the effects off just now. Your video is unaffected.";
const TOO_SLOW = "Video effects were turned off because this computer couldn't keep up with them. Your camera is still on.";
const CAMERA_FAILED = "The camera couldn't be restarted with effects, so they were turned off.";

const NEUTRAL: EffectSettings = DEFAULT_SETTINGS;

interface Installed {
  pipeline: PipelineHandle;
  /** The camera the pipeline reads (Daily cannot report it while the output is sent). */
  deviceId: string | null;
  /** How to open that camera again. */
  request: CameraRequest;
  /** The camera is off: the pipeline has let go of it. */
  inputPaused: boolean;
}

export class VideoEffectsController {
  private state: EffectsState = {
    settings: NEUTRAL,
    busy: false,
    loading: false,
    running: false,
    error: null,
    supported: false,
    unsupportedReason: null,
    cameraDeviceId: null,
  };
  private readonly listeners = new Set<() => void>();
  private readonly registered: [string, (e: never) => void][] = [];

  /** What the person last asked for. */
  private desired: EffectSettings = NEUTRAL;
  /** The camera is in the pipeline's hands. */
  private installed: Installed | null = null;
  private queue: Promise<void> = Promise.resolve();
  private reconcileQueued = false;
  private inFlight = 0;
  /** A handover is being made: camera events are looked at again once it is done. */
  private transitioning = false;
  private resuming = false;
  /** The effects broke: what to tell the person if they are not started again, and whether
   * starting them again may mend it. */
  private failure: { message: string; restart: boolean } | null = null;
  private readonly restartBudget: RetryBudget;
  /** The effects are not started again before this time (after a failure). */
  private installAfter = 0;
  private installTimer: ReturnType<typeof setTimeout> | null = null;
  private drift = 0;
  private errorTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  private readonly call: EffectsCall;
  private readonly deps: EffectsDeps;
  private readonly handoffTimeoutMs: number;
  private readonly pollMs: number;

  constructor(call: EffectsCall, deps: EffectsDeps, options: ControllerOptions = {}) {
    this.call = call;
    this.deps = deps;
    this.handoffTimeoutMs = options.handoffTimeoutMs ?? 4_000;
    this.pollMs = options.pollMs ?? 50;
    const pauses = options.restartPausesMs ?? DEFAULT_RESTART_PAUSES_MS;
    this.restartBudget = new RetryBudget(pauses.length, RESTART_WINDOW_MS, pauses);
    this.listen('participant-updated', () => this.syncCamera());
    // The call is over: nothing may keep holding the camera.
    this.listen('left-meeting', () => this.dispose());
    this.listen('call-instance-destroyed', () => this.dispose());
    void deps
      .support()
      .then(({ supported, reason }) => {
        this.set({ supported, unsupportedReason: supported ? null : reason });
        // choices made before support was known (a pre-join click) are applied now
        if (supported && !isNeutral(this.desired)) void this.requestReconcile();
      })
      .catch(() => this.set({ supported: false, unsupportedReason: "Video effects aren't available in this browser." }));
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
  async settled(): Promise<void> {
    let current: Promise<void>;
    do {
      current = this.queue;
      await current;
    } while (current !== this.queue);
  }

  // ─── Choices ────────────────────────────────────────────────────────────

  setBackground(background: BackgroundEffect): Promise<void> {
    return this.ask({ ...this.desired, background });
  }

  setAppearance(appearance: AppearanceOptions): Promise<void> {
    return this.ask({ ...this.desired, appearance });
  }

  private ask(next: EffectSettings): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.desired = next;
    this.failure = null;
    // their own choice starts afresh: no waiting, and every try is available again
    this.restartBudget.reset();
    this.installAfter = 0;
    this.clearInstallTimer();
    this.clearError();
    this.set({ settings: next });
    if (!this.state.supported) return Promise.resolve(); // kept, and applied if support is confirmed
    return this.requestReconcile();
  }

  /** Switches the camera. While the effects have the camera, that is done inside the
   * pipeline and the picture goes on without a break; otherwise `viaDaily` does it. */
  selectCamera(deviceId: string, viaDaily: () => Promise<unknown>): Promise<void> {
    return this.enqueue(async () => {
      const installed = this.installed;
      if (!installed) {
        await viaDaily();
        return;
      }
      const request = { ...installed.request, deviceId };
      if (installed.inputPaused || !this.cameraIsOn()) {
        // the camera is off: it is opened, on this one, when it comes back on
        installed.request = request;
        installed.deviceId = deviceId;
        this.set({ cameraDeviceId: deviceId });
        return;
      }
      const track = await this.deps.openCamera(request); // if it will not open, nothing has changed
      if (this.installed !== installed || this.disposed) {
        track.stop();
        return;
      }
      installed.pipeline.swapInput(track);
      installed.request = request;
      installed.deviceId = deviceId;
      this.set({ cameraDeviceId: deviceId });
    });
  }

  /** Shows the person a message (for something the effects did not do themselves, like
   * a picture that was not usable). */
  reportError(message: string): void {
    if (!this.disposed) this.showError(message);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const [event, handler] of this.registered) this.call.off(event, handler as never);
    this.registered.length = 0;
    this.clearError();
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.clearInstallTimer();
    // The call is over: no more telling Daily anything — just let go of the camera.
    this.installed?.pipeline.stop();
    this.installed = null;
    this.listeners.clear();
  }

  // ─── Making what was asked for so ───────────────────────────────────────

  private requestReconcile(): Promise<void> {
    if (this.reconcileQueued) return this.queue;
    this.reconcileQueued = true;
    return this.enqueue(async () => {
      this.reconcileQueued = false;
      await this.reconcile();
    });
  }

  /** Brings the camera to what the person last asked for. Reads `desired` when it
   * runs, so a burst of choices is applied once, as the last of them. */
  private async reconcile(): Promise<void> {
    if (this.disposed || !this.state.supported) return;
    let want = this.desired;
    try {
      if (this.failure) {
        const { message, restart } = this.failure;
        this.failure = null;
        const pause = restart ? this.restartBudget.take(Date.now()) : null;
        if (pause !== null) {
          // The effects broke; the person's choice did not. The camera goes back to Daily for
          // a moment and the effects are started again (a little later if it keeps happening).
          // (The pipeline has already logged why they broke.)
          console.warn(`The video effects broke and are being started again${pause > 0 ? ` in ${pause} ms` : ''}.`);
          try {
            await this.uninstall();
          } catch (error) {
            // not even the camera could be handed back: effects off, and the hand-back retried
            want = this.desired = NEUTRAL;
            this.set({ settings: NEUTRAL });
            throw error;
          }
          this.installAfter = Date.now() + pause;
          this.set({ settings: this.desired, running: false });
          return; // (uninstall asked for another look, which starts them again)
        }
        // not to be mended, or mended enough times already: effects off, and the reason shown
        want = this.desired = NEUTRAL;
        this.set({ settings: NEUTRAL });
        await this.uninstall();
        this.showError(message);
        return;
      }
      if (isNeutral(want)) {
        await this.uninstall();
        this.set({ settings: want, running: false });
        return;
      }
      if (!this.installed) {
        if (!this.cameraIsOn()) {
          // asked for while the camera is off: it starts when the camera comes on
          this.set({ settings: want });
          return;
        }
        const wait = this.installAfter - Date.now();
        if (wait > 0) {
          // started again after a failure, but not just yet
          this.scheduleInstall(wait);
          this.set({ settings: want, running: false });
          return;
        }
        await this.install(want);
      } else {
        this.installed.pipeline.update(want);
      }
      // What is shown is what was asked for LAST: while the pipeline started, an effect
      // may have been taken back (its model could not be loaded), or chosen again.
      this.set({ settings: this.desired, running: this.installed !== null });
    } catch (error) {
      console.error('Video effects could not be applied', error);
      // The camera is as it was. The choice is taken back, and the person told.
      const message = error instanceof EffectsError ? error.message : START_FAILED;
      if (this.installed) {
        // still running (a failed hand-back): effects look off, and the hand-back is retried
        this.installed.pipeline.update(NEUTRAL);
        this.scheduleRetry();
      } else {
        this.desired = NEUTRAL;
        this.set({ settings: NEUTRAL, running: false });
      }
      this.showError(message);
    }
  }

  /** Puts the pipeline on the camera and Daily on the pipeline's output. */
  private async install(want: EffectSettings): Promise<void> {
    // Daily may still be starting the camera (it is on, but has no track yet).
    await this.until(() => this.nativeCameraTrack() !== null, 'The camera is not ready yet. Try again in a moment.');
    const native = this.nativeCameraTrack();
    if (!native) throw new EffectsError('The camera is not ready yet. Try again in a moment.');
    const current = native.getSettings?.() ?? {};
    const request: CameraRequest = {
      deviceId: current.deviceId,
      width: current.width,
      height: current.height,
      frameRate: current.frameRate,
    };

    this.transitioning = true;
    // a copy of the camera: Daily goes on with its own until it is told otherwise
    const input = native.clone();
    let pipeline: PipelineHandle | null = null;
    try {
      pipeline = await this.deps.startPipeline(input, want, this.pipelineEvents());
      if (this.disposed) {
        pipeline.stop();
        return;
      }
      await this.call.updateInputSettings({ video: { settings: { customTrack: pipeline.output } } });
      await this.until(() => this.outgoingTrack()?.id === pipeline!.output.id, 'Daily did not start sending the effects.');
      this.installed = { pipeline, deviceId: request.deviceId ?? null, request, inputPaused: false };
      this.set({ cameraDeviceId: request.deviceId ?? null });
    } catch (error) {
      if (pipeline) await this.takeBack(pipeline, request.deviceId ?? null);
      else input.stop();
      throw error instanceof EffectsError ? error : new EffectsError(START_FAILED, error);
    } finally {
      this.transitioning = false;
      this.syncCamera();
    }
  }

  /** Gives the camera back to Daily, naming it so the person's own choice of camera
   * is kept, and stops the pipeline once Daily has it. */
  private async uninstall(): Promise<void> {
    const installed = this.installed;
    if (!installed) return;
    this.transitioning = true;
    try {
      const cameraWasOn = this.cameraIsOn();
      await this.call.updateInputSettings({ video: { settings: installed.deviceId ? { deviceId: installed.deviceId } : {} } });
      if (cameraWasOn) {
        await this.until(() => {
          const track = this.outgoingTrack();
          return !!track && track.id !== installed.pipeline.output.id && track.readyState === 'live';
        }, "Daily did not get the camera back.");
      }
      this.installed = null;
      installed.pipeline.stop();
      this.set({ cameraDeviceId: null, running: false });
    } catch (error) {
      // Daily did not take the camera back. If it let go of our output meanwhile, put
      // the output back, so the picture keeps flowing.
      if (this.outgoingTrack()?.id !== installed.pipeline.output.id && this.cameraIsOn()) {
        try {
          await this.call.updateInputSettings({ video: { settings: { customTrack: installed.pipeline.output } } });
        } catch {
          // nothing more can be done from here
        }
      }
      throw new EffectsError(HAND_BACK_FAILED, error);
    } finally {
      this.transitioning = false;
      this.syncCamera();
    }
  }

  /** A handover that did not complete: whatever Daily took, give it back. */
  private async takeBack(pipeline: PipelineHandle, deviceId: string | null): Promise<void> {
    try {
      if (this.outgoingTrack()?.id === pipeline.output.id) {
        await this.call.updateInputSettings({ video: { settings: deviceId ? { deviceId } : {} } });
        await this.until(() => {
          const track = this.outgoingTrack();
          return !!track && track.id !== pipeline.output.id;
        }, 'Daily did not get the camera back.').catch(() => undefined);
      }
    } catch (error) {
      console.error('Could not put the camera back after a failed start', error);
    } finally {
      pipeline.stop();
    }
  }

  private pipelineEvents(): PipelineEvents {
    return {
      onFailure: (failure) => {
        if (this.disposed) return;
        console.error('The video effects pipeline failed', failure);
        this.failure = { message: failure.reason === 'too-slow' ? TOO_SLOW : STOPPED_WORKING, restart: failure.recoverable };
        void this.requestReconcile();
      },
      onUnavailable: (effect, message) => {
        if (this.disposed) return;
        // that one effect is taken back; the others carry on
        const settings: EffectSettings =
          effect === 'background'
            ? { ...this.desired, background: DEFAULT_BACKGROUND_EFFECT }
            : { ...this.desired, appearance: { ...this.desired.appearance, autoFraming: false } };
        this.desired = settings;
        this.set({ settings });
        this.showError(message);
        void this.requestReconcile();
      },
      onLoading: (loading) => this.set({ loading }),
    };
  }

  // ─── The camera going off and on ────────────────────────────────────────

  /** Looks at what Daily says about the camera and the pipeline, and brings them
   * together: the camera went off (let go of it), came on (open it, or start the
   * effects that were waiting), or something other than us changed what Daily
   * sends. */
  private syncCamera(): void {
    if (this.disposed || this.transitioning) return;
    const on = this.cameraIsOn();
    const installed = this.installed;

    if (!installed) {
      this.drift = 0;
      if (on && this.state.supported && !isNeutral(this.desired)) void this.requestReconcile();
      return;
    }
    if (!on) {
      this.drift = 0;
      if (!installed.inputPaused) {
        installed.pipeline.pauseInput();
        installed.inputPaused = true;
      }
      return;
    }
    if (installed.inputPaused) {
      void this.resumeCamera();
      return;
    }
    // Daily is sending something that is not the output (something else switched the
    // camera): after a moment, put the output back rather than leave the effects
    // switched on and doing nothing.
    const outgoing = this.outgoingTrack();
    if (outgoing && outgoing.id !== installed.pipeline.output.id) {
      this.drift += 1;
      if (this.drift >= 3) {
        this.drift = 0;
        void this.enqueue(() => this.reassert());
      }
    } else {
      this.drift = 0;
    }
  }

  private async resumeCamera(): Promise<void> {
    const installed = this.installed;
    if (!installed || this.resuming) return;
    this.resuming = true;
    try {
      await this.enqueue(async () => {
        if (this.installed !== installed || !installed.inputPaused || !this.cameraIsOn() || this.disposed) return;
        const track = await this.deps.openCamera(installed.request);
        if (this.installed !== installed || this.disposed || !this.cameraIsOn()) {
          track.stop(); // the camera went off again, or the effects ended, while it opened
          return;
        }
        installed.pipeline.resumeInput(track);
        installed.inputPaused = false;
      });
    } catch (error) {
      console.error('Could not reopen the camera for the effects', error);
      this.failure = { message: CAMERA_FAILED, restart: false };
      void this.requestReconcile();
    } finally {
      this.resuming = false;
      this.syncCamera();
    }
  }

  /** Daily stopped sending our output: tell it again; if it will not, give the camera back. */
  private async reassert(): Promise<void> {
    const installed = this.installed;
    if (!installed || this.disposed || !this.cameraIsOn() || installed.inputPaused) return;
    if (this.outgoingTrack()?.id === installed.pipeline.output.id) return;
    this.transitioning = true;
    try {
      await this.call.updateInputSettings({ video: { settings: { customTrack: installed.pipeline.output } } });
      await this.until(() => this.outgoingTrack()?.id === installed.pipeline.output.id, 'Daily did not start sending the effects.');
    } catch (error) {
      console.error('The effects could not be put back on the camera', error);
      this.failure = { message: STOPPED_WORKING, restart: true };
      void this.requestReconcile();
    } finally {
      this.transitioning = false;
    }
  }

  // ─── What Daily says ────────────────────────────────────────────────────

  private local(): ParticipantLike | undefined {
    try {
      const all = this.call.participants();
      return all.local ?? Object.values(all).find((p) => p.local);
    } catch {
      return undefined;
    }
  }

  /** The camera is on: not switched off, and not blocked. */
  private cameraIsOn(): boolean {
    const video = this.local()?.tracks.video;
    return !!video && video.state !== 'off' && video.state !== 'blocked';
  }

  /** The track Daily is sending as the camera. */
  private outgoingTrack(): MediaStreamTrack | null {
    const video = this.local()?.tracks.video;
    if (!video || video.state === 'off' || video.state === 'blocked') return null;
    return video.persistentTrack ?? video.track ?? null;
  }

  /** Daily's own camera track — only meaningful while the effects do not have the camera. */
  private nativeCameraTrack(): MediaStreamTrack | null {
    const track = this.outgoingTrack();
    return track && track.readyState === 'live' ? track : null;
  }

  /** Waits for `condition`, looking now and every poll; throws `message` when it has
   * not come true in time. */
  private async until(condition: () => boolean, message: string): Promise<void> {
    const deadline = Date.now() + this.handoffTimeoutMs;
    while (!condition()) {
      if (this.disposed) throw new EffectsError('The call ended.');
      if (Date.now() > deadline) throw new EffectsError(message);
      await new Promise((resolve) => setTimeout(resolve, this.pollMs));
    }
  }

  // ─── Plumbing ───────────────────────────────────────────────────────────

  private listen<E>(event: string, handler: (e: E) => void): void {
    this.call.on(event, handler);
    this.registered.push([event, handler as (e: never) => void]);
  }

  /** Runs `task` after everything before it; one at a time. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    this.inFlight += 1;
    this.set({ busy: true });
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run.finally(() => {
      this.inFlight -= 1;
      if (this.inFlight === 0) this.set({ busy: false });
    });
  }

  /** Looks again when it is time to start the effects again. */
  private scheduleInstall(inMs: number): void {
    if (this.installTimer !== null || this.disposed) return;
    this.installTimer = setTimeout(() => {
      this.installTimer = null;
      if (!this.disposed) void this.requestReconcile();
    }, inMs);
  }

  private clearInstallTimer(): void {
    if (this.installTimer !== null) clearTimeout(this.installTimer);
    this.installTimer = null;
  }

  /** Tries again, once, a little later (a hand-back that did not complete). */
  private scheduleRetry(): void {
    if (this.retryTimer !== null || this.disposed) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.disposed && this.installed && isNeutral(this.desired)) void this.requestReconcile();
    }, 5_000);
  }

  private showError(message: string): void {
    this.clearError();
    this.set({ error: message });
    // an error is for reading, not for ever
    this.errorTimer = setTimeout(() => this.set({ error: null }), 12_000);
  }

  private clearError(): void {
    if (this.errorTimer !== null) clearTimeout(this.errorTimer);
    this.errorTimer = null;
    if (this.state.error !== null) this.set({ error: null });
  }

  private set(patch: Partial<EffectsState>): void {
    if (this.disposed && this.listeners.size === 0) return;
    const next = { ...this.state, ...patch };
    const keys = Object.keys(next) as (keyof EffectsState)[];
    if (keys.every((k) => Object.is(next[k], this.state[k]))) return;
    this.state = next;
    for (const listener of [...this.listeners]) listener();
  }
}

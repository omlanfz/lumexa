// FILE PATH: client/lib/classroom/effects/pipeline.ts
//
// The live video pipeline: a camera track goes in, a processed track comes out, and
// that is what Daily is told to send (see ../videoEffects.ts). Everything the person
// can ask of their video happens here, in one pass, so the effects combine:
//
//     camera ─► frame ─► [segmentation · face · light, a few times a second]
//                    └─► WebGL compositor (renderer.ts) ─► output track
//
// The rules this file keeps, because a classroom's video must never break:
//
//   - A frame is ALWAYS closed, and a frame the effects cannot handle goes out as it
//     came in (unprocessed) rather than not at all. A processing error never stops the
//     video; many in a row make the pipeline report a failure — which the controller
//     mends by starting the effects again, and only gives up on if that keeps failing.
//   - A watchdog notices output that has stopped (a stalled GPU, a camera that stopped
//     delivering) and reports it.
//   - The effects are NEVER dropped for being slow. A computer that cannot make 30 pictures
//     a second makes as many as it can, with lighter work (see governor.ts); only a video
//     that has all but stopped is given up on. A failing segmentation model is loaded again
//     rather than the background taken away.
//   - Models load lazily and fail softly: an effect whose model cannot be loaded is
//     reported as unavailable (events.onUnavailable); the rest carry on.
//   - It owns its input track and its output track and nothing else; stop() gives all
//     of it back — the device, the GL context, the models, the timers.
//
// Two ways to move frames, whichever the browser has:
//   - insertable streams (MediaStreamTrackProcessor / Generator — Chromium, Safari):
//     frames flow straight through, and keep flowing when the tab is in the background
//     (a teacher presenting another window);
//   - a hidden <video> drawn by the compositor onto a canvas whose stream is captured,
//     ticked by a worker timer (a page timer is slowed to once a second in the
//     background): Firefox, and anything older.

import { EffectsRenderer } from './renderer.ts';
import type { RenderParams } from './renderer.ts';
import { FULL_FRAME, FramingController, cropOf } from './framing.ts';
import type { FaceBox } from './framing.ts';
import { ExposureController, downsampleRgba, meterLuma } from './exposure.ts';
import { canAffordHighQuality, loadFaceFinder, loadSegmenter } from './models.ts';
import type { FaceFinder, PersonSegmenter } from './models.ts';
import { needsFaceDetection, needsSegmentation } from './options.ts';
import type { EffectSettings } from './options.ts';
import { Governor } from './governor.ts';
import { RetryBudget } from './retry.ts';

/** The width the segmentation model and the face finder are shown (they work on a
 * small picture anyway; showing them less means a smaller mask to read back). */
const MODEL_INPUT_WIDTH = 320;
const FACE_INTERVAL_MS = 100;
const METER_INTERVAL_MS = 200;
/** No output for this long: the pipeline has stalled. */
const STALL_MS = 3_500;
/** This many failed frames in a row: the pipeline is not working. */
const MAX_CONSECUTIVE_ERRORS = 8;
/** The most the pipeline waits at start for its models, before carrying on without. */
const MODEL_WAIT_MS = 20_000;
/** How long the first frame may take. */
const FIRST_FRAME_MS = 8_000;
/** A segmentation model that, tried out, takes longer than this (ms) is too slow for
 * this computer: the light model is the least that is offered… */
const STANDARD_MAX_BENCHMARK_MS = 70;
/** …and the better one is only taken up if it costs less than this. */
const HIGH_MAX_BENCHMARK_MS = 30;
/** The governor looks at what a picture costs every this long (ms) — wall-clock, so that
 * it reacts as fast to a computer making 5 pictures a second as to one making 30 — and
 * only once it has seen at least GOVERN_MIN_FRAMES. */
const GOVERN_EVERY_MS = 1_500;
const GOVERN_MIN_FRAMES = 6;
/** A mask older than this (ms) is not trusted: the person has surely moved. (The last mask
 * carries a failing model through the moment it takes to be loaded again.) */
const MASK_STALE_MS = 6_000;
/** This many segmentations failing in a row: the model is loaded afresh. */
const SEGMENTATION_ERRORS_BEFORE_RELOAD = 3;
/** The face finder failing this many times in a row is let go of. */
const FACE_ERRORS_BEFORE_DROP = 5;
/** Strength of the touch-up when it is on: visible, never plastic. */
const TOUCH_UP_AMOUNT = 0.7;
/** The blur's sigma in pixels of a 720-line picture. */
const BLUR_SIGMA_SLIGHT = 5;
const BLUR_SIGMA_FULL = 18;
const FALLBACK_FPS = 30;

export type PipelineFailureReason = 'gpu-lost' | 'stalled' | 'errors' | 'input-ended' | 'too-slow';

export interface PipelineFailure {
  reason: PipelineFailureReason;
  message: string;
  /** Starting the effects again may mend it (a stall, a lost graphics context, a camera that
   * stopped) — unlike a video that has all but stopped for cost, which a restart would only
   * bring back. */
  recoverable: boolean;
}

/** An effect that cannot be provided. */
export type UnavailableEffect = 'background' | 'autoFraming';

export interface PipelineEvents {
  /** The pipeline can no longer produce video. It keeps passing the camera through
   * until stopped, so there is time to hand the camera back. */
  onFailure(failure: PipelineFailure): void;
  /** An effect cannot be provided (a model could not be loaded, a picture not read).
   * The others carry on. */
  onUnavailable(effect: UnavailableEffect, message: string): void;
  /** Something is being loaded (for a "starting…" hint). */
  onLoading(loading: boolean): void;
}

/** What the controller needs of a running pipeline (so it can be tested with a fake). */
export interface PipelineHandle {
  readonly output: MediaStreamTrack;
  /** The camera track this reads from (null while the camera is off). */
  readonly input: MediaStreamTrack | null;
  update(settings: EffectSettings): void;
  /** The camera went off: let go of the device (its light goes out), keep the output. */
  pauseInput(): void;
  /** The camera came back on, as this track. */
  resumeInput(track: MediaStreamTrack): void;
  /** The camera was switched to this one; the output carries on without a break. */
  swapInput(track: MediaStreamTrack): void;
  /** Gives everything back: the output, the camera it holds, the GL context, the models. */
  stop(): void;
  /** What it is costing (for tests and diagnosis). */
  readonly metrics?: PipelineMetrics;
}

/** What the pipeline is costing, for tests and diagnosis. */
export interface PipelineMetrics {
  /** Average time to make a picture and take it off the GPU (ms). */
  frameMs: number;
  /** Average time spent waiting for the camera's next picture (ms). */
  waitMs: number;
  /** Average time the browser took to accept the finished picture (ms). */
  handOnMs: number;
  /** Average time to segment (ms), 0 when not segmenting. */
  segmentationMs: number;
  /** Average time between the camera's pictures (ms). */
  intervalMs: number;
  renderScale: number;
  /** How many steps of quality have been given up to keep up (0 = full quality). */
  rung: number;
  tier: string | null;
  delegate: string | null;
  software: boolean;
  framesMade: number;
}

// ─── Frame drivers ──────────────────────────────────────────────────────────

/** Draws a frame: true if the finished picture is on the driver's canvas. */
type Process = (source: TexImageSource, width: number, height: number) => boolean;

/** What a driver tells the pipeline about each picture, in ms: how long it waited for
 * the camera's picture, what making it cost (the pipeline's drawing and taking the
 * picture off the GPU), and how long handing it on took (the browser's consumer of the
 * output, which can be slow to take it). */
interface DriverReport {
  (timing: { waitMs: number; costMs: number; handOnMs: number }): void;
}

interface Driver {
  readonly output: MediaStreamTrack;
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  /** Starts reading `input`, replacing whatever was being read. `reportCost` is told,
   * for each picture made, what making and handing it on cost (ms). */
  start(input: MediaStreamTrack, process: Process, report: DriverReport): void;
  /** Stops reading the input. */
  pause(): void;
  stop(): void;
}

interface TrackProcessorCtor {
  new (init: { track: MediaStreamTrack }): { readable: ReadableStream<VideoFrame> };
}
interface TrackGeneratorCtor {
  new (init: { kind: 'video' }): MediaStreamTrack & { writable: WritableStream<VideoFrame> };
}

export function insertableStreamsAvailable(): boolean {
  const g = globalThis as unknown as { MediaStreamTrackProcessor?: unknown; MediaStreamTrackGenerator?: unknown };
  return !!(g.MediaStreamTrackProcessor && g.MediaStreamTrackGenerator && typeof VideoFrame !== 'undefined' && typeof OffscreenCanvas !== 'undefined');
}

class StreamsDriver implements Driver {
  readonly canvas = new OffscreenCanvas(2, 2);
  readonly output: MediaStreamTrack;
  private readonly generator: MediaStreamTrack & { writable: WritableStream<VideoFrame> };
  private readonly writer: WritableStreamDefaultWriter<VideoFrame>;
  private reader: ReadableStreamDefaultReader<VideoFrame> | null = null;
  private generation = 0;
  private stopped = false;

  constructor() {
    const Generator = (globalThis as unknown as { MediaStreamTrackGenerator: TrackGeneratorCtor }).MediaStreamTrackGenerator;
    this.generator = new Generator({ kind: 'video' });
    this.writer = this.generator.writable.getWriter();
    this.output = this.generator;
  }

  start(input: MediaStreamTrack, process: Process, report: DriverReport): void {
    this.pause();
    if (this.stopped) return;
    const Processor = (globalThis as unknown as { MediaStreamTrackProcessor: TrackProcessorCtor }).MediaStreamTrackProcessor;
    const reader = new Processor({ track: input }).readable.getReader();
    this.reader = reader;
    const generation = ++this.generation;
    void (async () => {
      try {
        while (generation === this.generation && !this.stopped) {
          const waitStarted = performance.now();
          const { value: frame, done } = await reader.read();
          if (done || !frame) return;
          const waitMs = performance.now() - waitStarted;
          // Hand the picture on — finished if the effects could draw it, as it came
          // otherwise — and close whatever is not handed on.
          let passedThrough = false;
          try {
            if (generation !== this.generation || this.stopped) return;
            let drawn = false;
            const started = performance.now();
            try {
              drawn = process(frame, frame.displayWidth, frame.displayHeight);
            } catch {
              drawn = false;
            }
            if (drawn) {
              const finished = new VideoFrame(this.canvas, { timestamp: frame.timestamp, duration: frame.duration ?? undefined });
              const costMs = performance.now() - started;
              const handStarted = performance.now();
              try {
                await this.writer.write(finished);
              } catch (error) {
                finished.close();
                throw error;
              }
              report({ waitMs, costMs, handOnMs: performance.now() - handStarted });
            } else {
              passedThrough = true;
              await this.writer.write(frame);
            }
          } finally {
            if (!passedThrough) frame.close();
          }
        }
      } catch {
        // the camera went away, or the output was stopped: the loop is over
      } finally {
        reader.releaseLock?.();
      }
    })();
  }

  pause(): void {
    this.generation++;
    const reader = this.reader;
    this.reader = null;
    reader?.cancel().catch(() => undefined);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.pause();
    this.writer.close().catch(() => undefined);
    this.generator.stop();
  }
}

/** Calls `tick` up to `fps` times a second, from a worker where possible so a hidden tab
 * does not slow it to once a second. The ticker WAITS for each tick to be finished before
 * it gives the next: a picture that takes longer than the interval to make must not
 * leave a queue of ticks behind it, which would keep the page busy for ever (and starve
 * everything else on it — the timers, the network, the controls). */
function startTicker(fps: number, tick: () => void): () => void {
  const interval = Math.round(1000 / fps);
  try {
    const url = URL.createObjectURL(
      new Blob(
        [
          'let id,waiting=false;' +
            'onmessage=(e)=>{' +
            'if(e.data==="stop"){clearInterval(id);}' +
            'else if(e.data==="done"){waiting=false;}' +
            'else{id=setInterval(()=>{if(!waiting){waiting=true;postMessage(0);}},e.data);}' +
            '};',
        ],
        { type: 'text/javascript' },
      ),
    );
    const worker = new Worker(url);
    worker.onmessage = () => {
      try {
        tick();
      } finally {
        worker.postMessage('done');
      }
    };
    worker.postMessage(interval);
    return () => {
      worker.postMessage('stop');
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }
}

class CanvasDriver implements Driver {
  readonly canvas = document.createElement('canvas');
  readonly output: MediaStreamTrack;
  private video: HTMLVideoElement | null = null;
  private stopTicker: (() => void) | null = null;
  private lastTime = -1;
  private stopped = false;

  constructor() {
    this.canvas.width = 2;
    this.canvas.height = 2;
    this.output = this.canvas.captureStream(FALLBACK_FPS).getVideoTracks()[0];
  }

  start(input: MediaStreamTrack, process: Process, report: DriverReport): void {
    this.pause();
    if (this.stopped) return;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream([input]);
    void video.play().catch(() => undefined);
    this.video = video;
    this.lastTime = -1;
    this.stopTicker = startTicker(FALLBACK_FPS, () => {
      if (video.readyState < 2 || !video.videoWidth || video.currentTime === this.lastTime) return;
      this.lastTime = video.currentTime;
      const started = performance.now();
      try {
        if (process(video, video.videoWidth, video.videoHeight)) report({ waitMs: 0, costMs: performance.now() - started, handOnMs: 0 });
      } catch {
        // the picture of this tick is lost; the next one will do
      }
    });
  }

  pause(): void {
    this.stopTicker?.();
    this.stopTicker = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.pause();
    this.output.stop();
  }
}

// ─── The pipeline ───────────────────────────────────────────────────────────

/** The limits the pipeline holds itself to. The defaults are what the classroom runs
 * with; tests of a pipeline on a computer that could not meet them (software graphics)
 * move them. */
export interface PipelineTuning {
  /** A light model that takes longer than this to try out is refused (ms). */
  standardMaxBenchmarkMs: number;
  /** The better model is taken up only if it takes less than this (ms). */
  highMaxBenchmarkMs: number;
  /** Try for the better model even where the graphics are software (it will be slow). */
  allowHighOnSoftware: boolean;
}

const DEFAULT_TUNING: PipelineTuning = {
  standardMaxBenchmarkMs: STANDARD_MAX_BENCHMARK_MS,
  highMaxBenchmarkMs: HIGH_MAX_BENCHMARK_MS,
  allowHighOnSoftware: false,
};

export interface PipelineOptions {
  /** The camera. The pipeline owns it from here: stop() stops it. */
  input: MediaStreamTrack;
  settings: EffectSettings;
  /** How to load a virtual background's picture (by default: fetch it). */
  loadImage?: (path: string) => Promise<ImageBitmap>;
  tuning?: Partial<PipelineTuning>;
}

async function defaultLoadImage(path: string): Promise<ImageBitmap> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return createImageBitmap(await response.blob());
}

export class EffectsPipeline implements PipelineHandle {
  private readonly renderer: EffectsRenderer;
  private readonly driver: Driver;
  private readonly framing = new FramingController();
  private readonly exposure = new ExposureController();
  private readonly loadImage: (path: string) => Promise<ImageBitmap>;
  private readonly tuning: PipelineTuning;

  private settings: EffectSettings;
  private inputTrack: MediaStreamTrack | null;
  private segmenter: PersonSegmenter | null = null;
  private faceFinder: FaceFinder | null = null;
  private segLoading = false;
  private faceLoading = false;
  private imageLoading = false;
  private upgrading = false;
  private highQualityTried = false;
  private bgPath: string | null = null;
  private loadAbort = new AbortController();

  private stopped = false;
  private failed = false;
  private hasMask = false;
  private face: FaceBox | null = null;
  private lastFaceSeenAt = Number.NEGATIVE_INFINITY;
  private lastFaceAt = Number.NEGATIVE_INFINITY;
  private lastMeterAt = Number.NEGATIVE_INFINITY;
  private pendingMeasure: number | null = null;
  private lastFrameAt = 0;
  private lastOutputAt = 0;
  private frameIndex = 0;
  private errors = 0;
  private segMs = 0;
  private slowSegmentations = 0;
  private segmentationErrors = 0;
  private faceErrors = 0;
  /** When the last mask arrived. */
  private lastMaskAt = 0;
  /** A segmentation model has worked here: one that stops is mended, not given up on. */
  private hadSegmenter = false;
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly segmenterRetries = new RetryBudget(4, 120_000, [300, 2_000, 8_000, 20_000]);
  /** Segmentation is never run more often than every this many frames (the governor raises it). */
  private segFloor = 1;
  private frameMs = 0;
  private waitMs = 0;
  private handOnMs = 0;
  private intervalMs = 33;
  private lastProcessStart = 0;
  private framesMade = 0;
  /** What has been given up to keep up (see lighten / restore), and the judge of when. */
  private rung = 0;
  private readonly governor: Governor;
  /** What can be given up, the lightest loss first; each step knows how to be taken back. */
  private readonly rungs: ReadonlyArray<{ apply: () => void; undo: () => void }> = [
    { apply: () => { this.segFloor = 3; }, undo: () => { this.segFloor = 1; } },
    { apply: () => this.renderer.setRenderScale(0.75), undo: () => this.renderer.setRenderScale(1) },
    { apply: () => this.renderer.setRenderScale(0.5), undo: () => this.renderer.setRenderScale(0.75) },
    { apply: () => { this.segFloor = 6; }, undo: () => { this.segFloor = 3; } },
    { apply: () => this.renderer.setRenderScale(0.35), undo: () => this.renderer.setRenderScale(0.5) },
  ];
  private lastGovernAt = 0;
  private framesSinceGovern = 0;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private inputActive = false;
  private firstFrame: { promise: Promise<void>; resolve: () => void };
  private lastLoading = false;
  private imageData: ImageData | null = null;
  private readonly onInputEnded = () => {
    if (!this.stopped && this.inputActive) this.fail('input-ended', 'The camera stopped.');
  };

  private constructor(
    options: PipelineOptions,
    private readonly events: PipelineEvents,
  ) {
    this.settings = options.settings;
    this.governor = new Governor({ lighten: () => this.lighten(), restore: () => this.restore() });
    this.inputTrack = options.input;
    this.loadImage = options.loadImage ?? defaultLoadImage;
    this.tuning = { ...DEFAULT_TUNING, ...options.tuning };
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>((r) => (resolve = r));
    this.firstFrame = { promise, resolve };

    const lost = () => this.fail('gpu-lost', 'The graphics card stopped the effects.');
    const streams = insertableStreamsAvailable();
    let driver: Driver | null = null;
    let renderer: EffectsRenderer | null = null;
    if (streams) {
      try {
        driver = new StreamsDriver();
        renderer = new EffectsRenderer(driver.canvas, { onContextLost: lost });
      } catch {
        // no WebGL 2 on an OffscreenCanvas here: the page-canvas way may still work
        driver?.stop();
        driver = null;
        renderer = null;
      }
    }
    if (!driver || !renderer) {
      driver = new CanvasDriver();
      try {
        renderer = new EffectsRenderer(driver.canvas, { onContextLost: lost });
      } catch (error) {
        driver.stop();
        throw error;
      }
    }
    this.driver = driver;
    this.renderer = renderer;
  }

  /** Starts a pipeline on `options.input`. Resolves once it is producing pictures and
   * the models its settings need are loaded or have failed — so what comes next
   * (handing the output to Daily) does not show a half-ready picture. Rejects, having
   * given everything back, if it cannot start. */
  static async start(options: PipelineOptions, events: PipelineEvents): Promise<EffectsPipeline> {
    let pipeline: EffectsPipeline;
    try {
      pipeline = new EffectsPipeline(options, events);
    } catch (error) {
      options.input.stop();
      throw error;
    }
    try {
      await pipeline.begin();
      return pipeline;
    } catch (error) {
      pipeline.stop();
      throw error;
    }
  }

  private async begin(): Promise<void> {
    this.attachInput(this.inputTrack!);
    this.watchdog = setInterval(() => this.checkAlive(), 1000);
    this.update(this.settings);
    // The models, as far as they are needed.
    await this.modelsSettled();
    // …and the first picture out.
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.firstFrame.promise,
        new Promise<void>((_, reject) => {
          timer = setTimeout(() => reject(new Error('The camera sent no picture to the effects.')), FIRST_FRAME_MS);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── What the controller uses ───────────────────────────────────────────

  get output(): MediaStreamTrack {
    return this.driver.output;
  }

  get input(): MediaStreamTrack | null {
    return this.inputTrack;
  }

  update(settings: EffectSettings): void {
    if (this.stopped) return;
    const before = this.settings.appearance;
    this.settings = settings;

    if (before.autoFraming && !settings.appearance.autoFraming) this.framing.release();
    if (!needsSegmentation(settings)) {
      this.hasMask = false;
      this.renderer.clearMask();
    }
    if (!needsFaceDetection(settings)) this.face = null;
    this.loadBackgroundImage();
    this.ensureModels();
    this.reportLoading();
  }

  pauseInput(): void {
    if (this.stopped) return;
    this.inputActive = false;
    this.driver.pause();
    this.releaseInput();
    this.exposure.reset();
    this.face = null;
  }

  resumeInput(track: MediaStreamTrack): void {
    if (this.stopped) {
      track.stop();
      return;
    }
    this.releaseInput();
    this.inputTrack = track;
    this.attachInput(track);
  }

  swapInput(track: MediaStreamTrack): void {
    if (this.stopped) {
      track.stop();
      return;
    }
    const previous = this.inputTrack;
    this.inputTrack = track;
    this.attachInput(track);
    if (previous && previous !== track) {
      previous.removeEventListener('ended', this.onInputEnded);
      previous.stop();
    }
    this.exposure.reset();
    this.face = null;
    this.hasMask = false;
    this.renderer.clearMask();
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.loadAbort.abort();
    if (this.watchdog !== null) clearInterval(this.watchdog);
    this.watchdog = null;
    if (this.reloadTimer !== null) clearTimeout(this.reloadTimer);
    this.reloadTimer = null;
    this.driver.stop();
    this.releaseInput();
    this.segmenter?.close();
    this.faceFinder?.close();
    this.segmenter = null;
    this.faceFinder = null;
    this.renderer.dispose();
  }

  // ─── The camera ─────────────────────────────────────────────────────────

  private attachInput(track: MediaStreamTrack): void {
    track.addEventListener('ended', this.onInputEnded);
    this.inputActive = true;
    this.lastOutputAt = performance.now();
    this.driver.start(track, this.process, this.noteCost);
  }

  private releaseInput(): void {
    const track = this.inputTrack;
    this.inputTrack = null;
    if (!track) return;
    track.removeEventListener('ended', this.onInputEnded);
    track.stop();
  }

  private checkAlive(): void {
    if (this.stopped || this.failed || !this.inputActive) return;
    if (performance.now() - this.lastOutputAt > STALL_MS) this.fail('stalled', 'The video effects stopped producing pictures.');
  }

  private fail(reason: PipelineFailureReason, message: string): void {
    if (this.stopped || this.failed) return;
    this.failed = true;
    this.events.onFailure({ reason, message, recoverable: reason !== 'too-slow' });
  }

  // ─── One frame ──────────────────────────────────────────────────────────

  /** What a picture cost to make and hand on (the driver tells us): the number the
   * governor weighs against the time the camera gives for each. */
  private readonly noteCost: DriverReport = ({ waitMs, costMs, handOnMs }) => {
    const ema = (previous: number, next: number) => (previous === 0 ? next : previous * 0.9 + next * 0.1);
    this.frameMs = ema(this.frameMs, costMs);
    this.waitMs = ema(this.waitMs, waitMs);
    this.handOnMs = ema(this.handOnMs, handOnMs);
    this.framesMade += 1;
    this.framesSinceGovern += 1;
    const now = performance.now();
    if (this.lastGovernAt === 0) this.lastGovernAt = now;
    if (now - this.lastGovernAt >= GOVERN_EVERY_MS && this.framesSinceGovern >= GOVERN_MIN_FRAMES) {
      this.lastGovernAt = now;
      this.framesSinceGovern = 0;
      this.govern();
    }
  };

  private readonly process: Process = (source, width, height) => {
    if (this.stopped || this.failed) return false;
    const now = performance.now();
    if (this.lastProcessStart > 0) this.intervalMs = this.intervalMs * 0.9 + Math.min(200, now - this.lastProcessStart) * 0.1;
    this.lastProcessStart = now;
    try {
      const renderer = this.renderer;
      renderer.prepare(width, height);
      renderer.uploadFrame(source);
      this.analyse(now, width, height);
      renderer.draw(this.paramsFor(now));
      this.errors = 0;
      this.lastOutputAt = performance.now();
      this.firstFrame.resolve();
      return true;
    } catch (error) {
      console.error('A video-effects frame failed', error);
      this.errors += 1;
      if (this.errors >= MAX_CONSECUTIVE_ERRORS) this.fail('errors', 'The video effects could not process the camera.');
      return false;
    }
  };

  /** Segmentation, the face and the light: the parts that look at the picture. Each
   * runs as often as it needs to, not every frame. */
  private analyse(now: number, width: number, height: number): void {
    const settings = this.settings;
    const wantSegmentation = needsSegmentation(settings) && this.segmenter !== null;
    const segmentationDue = wantSegmentation && this.frameIndex % this.segmentEvery() === 0;
    const faceDue = needsFaceDetection(settings) && this.faceFinder !== null && now - this.lastFaceAt >= FACE_INTERVAL_MS;
    const meterDue = settings.appearance.lighting > 0 && now - this.lastMeterAt >= METER_INTERVAL_MS;
    this.frameIndex += 1;
    if (!segmentationDue && !faceDue && !meterDue) return;

    const modelHeight = Math.max(2, Math.round(((MODEL_INPUT_WIDTH * height) / width) / 2) * 2);
    const small = this.renderer.readSmall(MODEL_INPUT_WIDTH, modelHeight);
    if (!small) return;
    // One ImageData over the renderer's own buffer (no copy) — made again whenever that
    // buffer is a different one (the camera changed size).
    if (
      !this.imageData ||
      this.imageData.width !== small.width ||
      this.imageData.height !== small.height ||
      this.imageData.data.buffer !== small.rgba.buffer
    ) {
      this.imageData = new ImageData(new Uint8ClampedArray(small.rgba.buffer as ArrayBuffer), small.width, small.height);
    }
    const image = this.imageData;

    if (segmentationDue && this.segmenter) {
      const started = performance.now();
      try {
        const result = this.segmenter.segment(image);
        this.noteSegmentationTime(performance.now() - started);
        this.segmentationErrors = 0;
        if (result) {
          this.renderer.setMask(result.mask, result.width, result.height);
          this.hasMask = true;
          this.lastMaskAt = now;
        }
      } catch (error) {
        // The model is failing (its own graphics context was lost, say). This picture goes
        // on with the last mask; if it keeps failing the model is loaded afresh. The
        // background is not taken away for it.
        console.error('Segmentation failed', error);
        this.segmentationErrors += 1;
        if (this.segmentationErrors >= SEGMENTATION_ERRORS_BEFORE_RELOAD) this.reloadSegmenter();
      }
    }

    if (faceDue && this.faceFinder) {
      this.lastFaceAt = now;
      let face: FaceBox | null = null;
      try {
        face = this.faceFinder.find(image);
        this.faceErrors = 0;
      } catch (error) {
        // not this picture's problem: it goes on without a face, and a finder that keeps
        // failing is let go of
        console.error('Face finding failed', error);
        this.faceErrors += 1;
        if (this.faceErrors >= FACE_ERRORS_BEFORE_DROP) this.dropFaceFinder();
      }
      if (face) {
        this.face = face;
        this.lastFaceSeenAt = now;
        if (settings.appearance.autoFraming) this.framing.observe(face, now);
      } else if (now - this.lastFaceSeenAt > 1_500) {
        this.face = null;
      }
    }

    if (meterDue) {
      this.lastMeterAt = now;
      const tiny = downsampleRgba(small.rgba, small.width, small.height, 8);
      const region = this.face ? { kind: 'face' as const, box: this.face } : { kind: 'centre' as const };
      this.pendingMeasure = meterLuma(tiny.rgba, tiny.width, tiny.height, region);
    }
  }

  private paramsFor(now: number): RenderParams {
    const settings = this.settings;
    const appearance = settings.appearance;
    const dt = this.lastFrameAt > 0 ? Math.min(0.25, (now - this.lastFrameAt) / 1000) : 1 / 30;
    this.lastFrameAt = now;

    // framing: follow the person while auto-framing is on, and ease out when it is turned off
    let crop = cropOf(FULL_FRAME);
    if (appearance.autoFraming || !this.framing.settled) {
      crop = cropOf(this.framing.step(now));
    }

    const measure = this.pendingMeasure;
    this.pendingMeasure = null;
    const { gain, lift } = this.exposure.update(measure, now, appearance.lighting);

    const mode = settings.background.mode;
    const background = mode === 'none' ? 'none' : mode === 'image' ? 'image' : 'blur';
    return {
      crop,
      background,
      blurSigma: mode === 'blur-slight' ? BLUR_SIGMA_SLIGHT : BLUR_SIGMA_FULL,
      hasMask: this.hasMask && now - this.lastMaskAt < MASK_STALE_MS && background !== 'none',
      dt,
      gain,
      lift,
      touchUp: appearance.touchUp ? TOUCH_UP_AMOUNT : 0,
      face: appearance.touchUp ? this.face : null,
    };
  }

  /** How many frames between segmentations: every frame when it is cheap, less as it
   * costs more, so the picture itself never drops frames for it. */
  private segmentEvery(): number {
    const wanted = this.segMs < 12 ? 1 : this.segMs < 24 ? 2 : this.segMs < 40 ? 3 : this.segMs < 80 ? 4 : 6;
    return Math.max(this.segFloor, wanted);
  }

  /** Looks at what a picture costs against the time the camera gives for it and acts on the
   * verdict (see governor.ts): lighter work when it does not fit, a step back toward full
   * quality when there is plenty of room — and a give-up only for a video that has all but
   * stopped. A computer that can do 20 pictures a second keeps the effect at 20. */
  private govern(): void {
    const verdict = this.governor.evaluate(this.frameMs + this.handOnMs, this.nominalIntervalMs());
    if (verdict === 'lightened' || verdict === 'restored') {
      this.frameMs = 0; // measured afresh at the new setting
      this.handOnMs = 0;
    } else if (verdict === 'give-up') {
      this.fail('too-slow', "This computer can't keep up with the video effects.");
    }
  }

  /** One step lighter: the better model goes first, then what can be given up in order. */
  private lighten(): boolean {
    if (this.segmenter?.tier === 'high') {
      this.downgrade();
      return true;
    }
    const step = this.rungs[this.rung];
    if (!step) return false;
    step.apply();
    this.rung += 1;
    return true;
  }

  /** One step back toward full quality (the better model, once given up, stays given up). */
  private restore(): boolean {
    if (this.rung === 0) return false;
    this.rung -= 1;
    this.rungs[this.rung].undo();
    return true;
  }

  /** The time the camera gives for each picture, from its own frame rate. (The time
   * between pictures that reach us is no guide: it grows when we are slow.) */
  private nominalIntervalMs(): number {
    const fps = this.inputTrack?.getSettings?.().frameRate;
    return Math.min(50, Math.max(16, fps && fps > 0 ? 1000 / fps : 33));
  }

  get metrics(): PipelineMetrics {
    return {
      frameMs: this.frameMs,
      waitMs: this.waitMs,
      handOnMs: this.handOnMs,
      segmentationMs: this.segMs,
      intervalMs: this.intervalMs,
      renderScale: this.renderer.currentRenderScale,
      rung: this.rung,
      tier: this.segmenter?.tier ?? null,
      delegate: this.segmenter?.delegate ?? null,
      software: this.renderer.isSoftware,
      framesMade: this.framesMade,
    };
  }

  private noteSegmentationTime(ms: number): void {
    this.segMs = this.segMs === 0 ? ms : this.segMs * 0.9 + ms * 0.1;
    // The high-quality model on a computer that cannot keep up with it: back to the light one.
    if (this.segmenter?.tier === 'high' && this.segMs > 45) {
      this.slowSegmentations += 1;
      if (this.slowSegmentations > 60) this.downgrade();
    } else {
      this.slowSegmentations = 0;
    }
  }

  // ─── Models ─────────────────────────────────────────────────────────────

  private ensureModels(): void {
    const settings = this.settings;
    if (needsSegmentation(settings) && !this.segmenter && !this.segLoading) {
      this.segLoading = true;
      this.reportLoading();
      loadSegmenter('standard', { signal: this.loadAbort.signal, cpuOnly: this.renderer.isSoftware })
        .then((segmenter) => {
          if (this.stopped) {
            segmenter.close();
            return;
          }
          if (!this.hadSegmenter && segmenter.benchmarkMs > this.tuning.standardMaxBenchmarkMs) {
            // too slow to run on live video here: say so now, rather than freeze the camera
            // (a model being loaded again is let through — the governor looks after speed)
            segmenter.close();
            this.events.onUnavailable('background', 'Background effects need a faster computer than this one.');
            return;
          }
          this.segmenter = segmenter;
          this.hadSegmenter = true;
          this.upgradeInTheBackground();
        })
        .catch((error) => {
          if (this.stopped) return;
          console.error('Could not load the person segmentation model', error);
          // A model that worked and has to be loaded again is tried again, a little later;
          // one that never loaded is reported at once.
          if (this.hadSegmenter && this.scheduleReload()) return;
          this.events.onUnavailable('background', 'Background effects could not be loaded. Check your connection and try again.');
        })
        .finally(() => {
          this.segLoading = false;
          this.reportLoading();
        });
    }
    if (needsFaceDetection(settings) && !this.faceFinder && !this.faceLoading) {
      this.faceLoading = true;
      this.reportLoading();
      loadFaceFinder(this.loadAbort.signal)
        .then((finder) => {
          if (this.stopped) {
            finder.close();
            return;
          }
          this.faceFinder = finder;
        })
        .catch((error) => {
          if (this.stopped) return;
          console.error('Could not load the face finder', error);
          // Touch-up and lighting still work without it (they fall back to colour and
          // the middle of the picture); framing cannot.
          if (this.settings.appearance.autoFraming) {
            this.events.onUnavailable('autoFraming', 'Auto-framing could not be loaded. Check your connection and try again.');
          }
        })
        .finally(() => {
          this.faceLoading = false;
          this.reportLoading();
        });
    }
  }

  /** The better segmentation model is fetched while the light one already works; when
   * it arrives it takes over, and the person never sees a pause. */
  private upgradeInTheBackground(): void {
    // A computer with only software graphics has nothing to spare for the better model.
    if (this.highQualityTried || this.upgrading || this.stopped || (this.renderer.isSoftware && !this.tuning.allowHighOnSoftware) || !canAffordHighQuality()) return;
    this.highQualityTried = true;
    this.upgrading = true;
    loadSegmenter('high', { signal: this.loadAbort.signal, cpuOnly: this.renderer.isSoftware })
      .then((high) => {
        if (this.stopped || high.benchmarkMs > this.tuning.highMaxBenchmarkMs) {
          // not wanted (the pipeline ended), or too slow here: the light model carries on
          high.close();
          return;
        }
        const previous = this.segmenter;
        this.segmenter = high;
        this.segMs = 0;
        this.slowSegmentations = 0;
        previous?.close();
      })
      .catch(() => {
        // the light model carries on: nothing to tell anyone
      })
      .finally(() => {
        this.upgrading = false;
      });
  }

  /** The segmentation model keeps failing: it is loaded afresh, a moment later — and a little
   * longer after each time it fails again. The picture goes on with the last mask meanwhile.
   * Only if that keeps failing too is the background effect taken back. */
  private reloadSegmenter(): void {
    const broken = this.segmenter;
    this.segmenter = null;
    this.segmentationErrors = 0;
    this.segMs = 0;
    this.slowSegmentations = 0;
    broken?.close();
    if (!this.scheduleReload()) this.dropSegmentation();
  }

  /** Arranges for the model to be loaded again. False when it has been tried enough. */
  private scheduleReload(): boolean {
    const pause = this.segmenterRetries.take(performance.now());
    if (pause === null) return false;
    console.warn(`The person segmentation model will be loaded again in ${pause} ms.`);
    if (this.reloadTimer !== null) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      this.reloadTimer = null;
      if (!this.stopped) this.ensureModels();
    }, pause);
    return true;
  }

  /** The model could not be mended: the background effect is taken back (the controller turns
   * its control off and says so), and the rest carries on. */
  private dropSegmentation(): void {
    if (this.reloadTimer !== null) clearTimeout(this.reloadTimer);
    this.reloadTimer = null;
    this.segmenter?.close();
    this.segmenter = null;
    this.hasMask = false;
    this.renderer.clearMask();
    this.segmentationErrors = 0;
    this.events.onUnavailable('background', 'Background effects stopped working and were turned off.');
  }

  /** The face finder keeps failing: it is let go of (touch-up and the light go on without it). */
  private dropFaceFinder(): void {
    this.faceFinder?.close();
    this.faceFinder = null;
    this.face = null;
    this.faceErrors = 0;
    if (this.settings.appearance.autoFraming) {
      this.events.onUnavailable('autoFraming', 'Auto-framing stopped working and was turned off.');
    }
  }

  /** The high-quality model is too slow here: back to the light one. */
  private downgrade(): void {
    const slow = this.segmenter;
    if (!slow || slow.tier !== 'high') return;
    this.segmenter = null;
    this.segMs = 0;
    this.slowSegmentations = 0;
    this.highQualityTried = true; // do not try again
    slow.close();
    this.ensureModels();
  }

  private loadBackgroundImage(): void {
    const background = this.settings.background;
    if (background.mode !== 'image') {
      if (this.bgPath !== null) {
        this.bgPath = null;
        this.renderer.setBackgroundImage(null);
      }
      return;
    }
    const path = background.imagePath;
    if (path === this.bgPath) return;
    this.bgPath = path;
    this.imageLoading = true;
    this.reportLoading();
    this.loadImage(path)
      .then((bitmap) => {
        if (this.stopped || this.bgPath !== path) {
          bitmap.close?.();
          return;
        }
        this.renderer.setBackgroundImage(bitmap, bitmap.width, bitmap.height);
      })
      .catch((error) => {
        if (this.stopped || this.bgPath !== path) return;
        console.error('Could not load the background picture', error);
        this.events.onUnavailable('background', 'That background picture could not be loaded.');
      })
      .finally(() => {
        this.imageLoading = false;
        this.reportLoading();
      });
  }

  private reportLoading(): void {
    const loading = this.segLoading || this.faceLoading || this.imageLoading;
    if (loading !== this.lastLoading) {
      this.lastLoading = loading;
      this.events.onLoading(loading);
    }
  }

  /** Waits for what is being loaded to be loaded — or to have failed, or for a while
   * (a model that takes ages is carried on without: it joins in when it arrives). */
  private async modelsSettled(): Promise<void> {
    const deadline = performance.now() + MODEL_WAIT_MS;
    while ((this.segLoading || this.faceLoading || this.imageLoading) && !this.stopped && performance.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

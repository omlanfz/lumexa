// FILE PATH: client/lib/classroom/appearanceProcessor.ts
//
// The "Appearance" section of the Video Effects panel, as a video pipeline: a
// camera track goes in, a processed track comes out, and that is what Daily sends
// (see videoEffects.ts, which hands it over as the call's custom video track).
// Background blur and virtual backgrounds are Daily's own processors; these are
// ours:
//
//   - Lighting adjustment: brightness/contrast via Canvas2D's `filter`.
//   - Touch-up: a soft, low-opacity blur blended back over the frame — a
//     simple "soft focus" smoothing pass, not per-pixel face-only
//     retouching (that would need a face mesh model; this is deliberately
//     the lighter-weight, always-reliable version of the effect).
//   - Auto-framing: detects the presenter's face with MediaPipe's
//     lightweight BlazeFace short-range model (lazy-loaded only once
//     turned on) and smoothly pans/zooms the canvas draw region to keep
//     them centered and reasonably framed, cropping back to the original
//     frame size so publish resolution never changes (the arithmetic is in
//     appearanceMath.ts).
//
// Order per frame: auto-framing crop → lighting filter (applied on the
// same draw call) → touch-up blend. Runs entirely in-browser; the face
// detector is the only piece that needs a network fetch (WASM + model,
// same CDN pattern the background processor already uses), and only once
// auto-framing is actually turned on.
//
// Two ways to drive it, whichever the browser has:
//   - insertable streams (MediaStreamTrackProcessor / MediaStreamTrackGenerator,
//     Chromium): frames flow through a TransformStream, so it keeps running when
//     the tab is in the background (a teacher sharing another window);
//   - a hidden <video> drawn onto a <canvas> whose stream is captured, ticked by
//     a worker timer (a page timer is throttled to once a second in the
//     background, which would freeze the picture the class sees).

import type { FaceDetector } from '@mediapipe/tasks-vision';
import {
  DETECT_INTERVAL_MS,
  FACE_LOST_RESET_MS,
  cropForFace,
  easeCrop,
  lightingFilter,
} from './appearanceMath';
import type { CropRect } from './appearanceMath';

export interface AppearanceOptions extends Record<string, unknown> {
  /** 1 = unchanged, >1 = brighter */
  brightness: number;
  /** 1 = unchanged, >1 = more contrast */
  contrast: number;
  /** Soft-focus skin/skin-texture smoothing. */
  touchUp: boolean;
  /** Keep the presenter's face centered/framed via a live crop + zoom. */
  autoFraming: boolean;
}

/** A running pipeline: take `output` as the camera track, stop it when done. */
export interface AppearancePipeline {
  readonly output: MediaStreamTrack;
  update(options: AppearanceOptions): void;
  /** Stops the pipeline and the input track it was given. Safe to repeat. */
  stop(): void;
}

const TASKS_VISION_VERSION = '0.10.14';
const FACE_DETECTOR_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';
const FALLBACK_FPS = 30;

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type CanvasLike = HTMLCanvasElement | OffscreenCanvas;

/** Draws frames with the effects applied. Knows nothing about where frames come
 * from. */
class AppearanceRenderer {
  private brightness = 1;
  private contrast = 1;
  private touchUp = false;
  private autoFraming = false;

  private faceDetector?: FaceDetector;
  private faceDetectorLoading = false;
  private destroyed = false;
  private lastDetectAt = 0;
  private lastFaceSeenAt = 0;
  private currentCrop: CropRect | null = null;
  private targetCrop: CropRect | null = null;

  update(options: AppearanceOptions) {
    if (typeof options.brightness === 'number') this.brightness = options.brightness;
    if (typeof options.contrast === 'number') this.contrast = options.contrast;
    if (typeof options.touchUp === 'boolean') this.touchUp = options.touchUp;
    if (typeof options.autoFraming === 'boolean') {
      this.autoFraming = options.autoFraming;
      if (this.autoFraming) void this.ensureFaceDetector();
      else {
        // Snap back out to the full frame rather than leaving it zoomed in
        // once the feature is turned off.
        this.targetCrop = null;
      }
    }
  }

  private async ensureFaceDetector() {
    if (this.faceDetector || this.faceDetectorLoading) return;
    this.faceDetectorLoading = true;
    try {
      const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(
        `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`,
      );
      const detector = await FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_DETECTOR_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
      });
      if (this.destroyed) detector.close();
      else this.faceDetector = detector;
    } catch (err) {
      // Auto-framing just stays off (full frame) — never breaks the rest
      // of the pipeline over a model-load failure (offline, blocked CDN…).
      console.error('Could not load the auto-framing face detector', err);
    } finally {
      this.faceDetectorLoading = false;
    }
  }

  private detectFace(source: TexImageSource, w: number, h: number) {
    if (!this.faceDetector) return;
    const now = performance.now();
    if (now - this.lastDetectAt < DETECT_INTERVAL_MS) return;
    this.lastDetectAt = now;

    let box;
    try {
      box = this.faceDetector.detectForVideo(source, now).detections[0]?.boundingBox;
    } catch {
      return;
    }
    if (!box) return;

    this.lastFaceSeenAt = now;
    this.targetCrop = cropForFace(box, w, h);
  }

  private smoothedCrop(source: TexImageSource, w: number, h: number): CropRect {
    const full: CropRect = { x: 0, y: 0, w, h };
    if (!this.autoFraming) {
      this.currentCrop = null;
      return full;
    }

    this.detectFace(source, w, h);

    // No face for a while — ease back out to the full frame instead of
    // staying stuck zoomed in on wherever it was last seen.
    if (this.targetCrop && performance.now() - this.lastFaceSeenAt > FACE_LOST_RESET_MS) {
      this.targetCrop = full;
    }

    this.currentCrop = easeCrop(this.currentCrop, this.targetCrop ?? full);
    return this.currentCrop;
  }

  /** Draws `frame` (`w`×`h`) onto `ctx`/`canvas` with the effects applied.
   * `detectSource` is what the face detector looks at. */
  draw(ctx: Context2D, canvas: CanvasLike, frame: CanvasImageSource, detectSource: TexImageSource, w: number, h: number) {
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const crop = this.smoothedCrop(detectSource, w, h);

    // CanvasRenderingContext2D#filter isn't on the OffscreenCanvas 2D context lib.dom typings yet.
    const filtered = ctx as unknown as { filter: string };
    filtered.filter = lightingFilter(this.brightness, this.contrast);
    ctx.drawImage(frame, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);

    if (this.touchUp) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      filtered.filter = 'blur(3px) brightness(1.04)';
      ctx.drawImage(canvas as CanvasImageSource, 0, 0);
      ctx.restore();
    }
  }

  destroy() {
    this.destroyed = true;
    this.faceDetector?.close();
    this.faceDetector = undefined;
  }
}

// ─── Driver 1: insertable streams ───────────────────────────────────────────

interface TrackProcessorCtor {
  new (init: { track: MediaStreamTrack }): { readable: ReadableStream<VideoFrame> };
}
interface TrackGeneratorCtor {
  new (init: { kind: 'video' }): MediaStreamTrack & { writable: WritableStream<VideoFrame> };
}

function startWithInsertableStreams(input: MediaStreamTrack, renderer: AppearanceRenderer): AppearancePipeline | null {
  const g = globalThis as unknown as {
    MediaStreamTrackProcessor?: TrackProcessorCtor;
    MediaStreamTrackGenerator?: TrackGeneratorCtor;
  };
  if (!g.MediaStreamTrackProcessor || !g.MediaStreamTrackGenerator) return null;
  if (typeof VideoFrame === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;

  const canvas = new OffscreenCanvas(2, 2);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const processor = new g.MediaStreamTrackProcessor({ track: input });
  const generator = new g.MediaStreamTrackGenerator({ kind: 'video' });
  const transform = new TransformStream<VideoFrame, VideoFrame>({
    transform: (frame, controller) => {
      try {
        const w = frame.displayWidth;
        const h = frame.displayHeight;
        renderer.draw(ctx, canvas, frame, frame, w, h);
        controller.enqueue(new VideoFrame(canvas, { timestamp: frame.timestamp }));
      } finally {
        frame.close();
      }
    },
  });
  processor.readable
    .pipeThrough(transform)
    .pipeTo(generator.writable)
    .catch(() => undefined); // the camera went away, or we stopped

  let stopped = false;
  return {
    output: generator,
    update: (options) => renderer.update(options),
    stop: () => {
      if (stopped) return;
      stopped = true;
      generator.stop();
      input.stop();
      renderer.destroy();
    },
  };
}

// ─── Driver 2: a hidden <video> drawn onto a <canvas> ───────────────────────

/** Calls `tick` about `fps` times a second, from a worker where possible so a
 * hidden tab does not slow it to once a second. */
function startTicker(fps: number, tick: () => void): () => void {
  const interval = Math.round(1000 / fps);
  try {
    const url = URL.createObjectURL(
      new Blob(['let id;onmessage=(e)=>{if(e.data==="stop"){clearInterval(id);}else{id=setInterval(()=>postMessage(0),e.data);}}'], {
        type: 'text/javascript',
      }),
    );
    const worker = new Worker(url);
    worker.onmessage = tick;
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

function startWithCanvas(input: MediaStreamTrack, renderer: AppearanceRenderer): AppearancePipeline {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([input]);
  void video.play().catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const ctx = canvas.getContext('2d');
  const output = canvas.captureStream(FALLBACK_FPS).getVideoTracks()[0];

  const stopTicker = startTicker(FALLBACK_FPS, () => {
    if (!ctx || video.readyState < 2 || !video.videoWidth) return;
    renderer.draw(ctx, canvas, video, video, video.videoWidth, video.videoHeight);
  });

  let stopped = false;
  return {
    output,
    update: (options) => renderer.update(options),
    stop: () => {
      if (stopped) return;
      stopped = true;
      stopTicker();
      video.srcObject = null;
      output.stop();
      input.stop();
      renderer.destroy();
    },
  };
}

/**
 * Starts applying `options` to the camera track `input`. The pipeline owns
 * `input` from here (give it a clone of the call's own camera track): stopping the
 * pipeline stops it.
 */
export function createAppearancePipeline(input: MediaStreamTrack, options: AppearanceOptions): AppearancePipeline {
  const renderer = new AppearanceRenderer();
  renderer.update(options);
  return startWithInsertableStreams(input, renderer) ?? startWithCanvas(input, renderer);
}

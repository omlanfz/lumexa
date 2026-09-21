// FILE PATH: client/lib/classroom/appearanceProcessor.ts
//
// A custom LiveKit track processor (built on the same @livekit/track-
// processors primitives as the background blur/virtual-bg processor) that
// bundles everything in the "Appearance" section of the Video Effects
// panel into one pass, since they all occupy the track's single processor
// slot alongside background blur/replace:
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
//     frame size so publish resolution never changes.
//
// Order per frame: auto-framing crop → lighting filter (applied on the
// same draw call) → touch-up blend. Runs entirely in-browser; the face
// detector is the only piece that needs a network fetch (WASM + model,
// same CDN pattern the background processor already uses), and only once
// auto-framing is actually turned on.

import { ProcessorWrapper, VideoTransformer } from '@livekit/track-processors';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

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

const TASKS_VISION_VERSION = '0.10.14';
const FACE_DETECTOR_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DETECT_INTERVAL_MS = 200;
const FACE_LOST_RESET_MS = 2500;
const CROP_LERP = 0.12;
const MIN_CROP_WIDTH_RATIO = 0.38;
const FACE_PADDING = 2.6;

class AppearanceTransformer extends VideoTransformer<AppearanceOptions> {
  private ctx?: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  private brightness = 1;
  private contrast = 1;
  private touchUp = false;
  private autoFraming = false;

  private faceDetector?: FaceDetector;
  private faceDetectorLoading = false;
  private lastDetectAt = 0;
  private lastFaceSeenAt = 0;
  private currentCrop: CropRect | null = null;
  private targetCrop: CropRect | null = null;

  // Deliberately NOT calling super.init()/super.restart(): the base
  // VideoTransformer always calls setupWebGL(canvas), which binds a WebGL2
  // context to the output canvas. A <canvas>/OffscreenCanvas can only ever
  // be bound to one context type — once WebGL2 claims it, the getContext
  // ('2d') call below permanently returns null, so `this.ctx` stayed
  // undefined and transform() below hit its `!this.ctx` guard and dropped
  // every frame without ever enqueuing one, which is what made the local
  // video go solid black the moment any Appearance option (lighting,
  // touch-up, auto-framing) was turned on. This transformer only ever
  // draws with Canvas2D, so it sets up its own minimal init/restart
  // instead of reusing the WebGL-oriented base implementation.
  async init({ outputCanvas, inputElement: inputVideo }: Parameters<VideoTransformer<AppearanceOptions>['init']>[0]) {
    if (!(inputVideo instanceof HTMLVideoElement)) {
      throw TypeError('Video transformer needs a HTMLVideoElement as input');
    }
    this.transformer = new TransformStream({
      transform: (frame, controller) => this.transform(frame, controller),
    });
    this.canvas = outputCanvas;
    this.inputVideo = inputVideo;
    this.ctx = this.canvas?.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
  }

  async restart({ outputCanvas, inputElement: inputVideo }: Parameters<VideoTransformer<AppearanceOptions>['restart']>[0]) {
    this.canvas = outputCanvas;
    this.inputVideo = inputVideo;
    this.ctx = this.canvas?.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
  }

  async destroy() {
    this.faceDetector?.close();
    this.faceDetector = undefined;
    this.canvas = undefined;
  }

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
      const fileset = await FilesetResolver.forVisionTasks(
        `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`,
      );
      this.faceDetector = await FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_DETECTOR_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
      });
    } catch (err) {
      // Auto-framing just stays off (full frame) — never breaks the rest
      // of the pipeline over a model-load failure (offline, blocked CDN…).
      console.error('Could not load the auto-framing face detector', err);
    } finally {
      this.faceDetectorLoading = false;
    }
  }

  private detectFace(w: number, h: number) {
    if (!this.faceDetector || !this.inputVideo) return;
    const now = performance.now();
    if (now - this.lastDetectAt < DETECT_INTERVAL_MS) return;
    this.lastDetectAt = now;

    let result: ReturnType<FaceDetector['detectForVideo']> | undefined;
    try {
      result = this.faceDetector.detectForVideo(this.inputVideo, now);
    } catch {
      return;
    }
    const box = result?.detections[0]?.boundingBox;
    if (!box) return;

    this.lastFaceSeenAt = now;
    const cx = box.originX + box.width / 2;
    const cy = box.originY + box.height / 2;
    const frameAspect = w / h;

    let cropW = Math.min(w, Math.max(box.width * FACE_PADDING, w * MIN_CROP_WIDTH_RATIO));
    let cropH = cropW / frameAspect;
    if (cropH > h) {
      cropH = h;
      cropW = cropH * frameAspect;
    }
    // Bias the crop up slightly so there's headroom above the face rather
    // than centering it dead in the middle of the frame.
    let x = cx - cropW / 2;
    let y = cy - cropH / 2 - box.height * 0.15;
    x = Math.min(Math.max(0, x), Math.max(0, w - cropW));
    y = Math.min(Math.max(0, y), Math.max(0, h - cropH));
    this.targetCrop = { x, y, w: cropW, h: cropH };
  }

  private smoothedCrop(w: number, h: number): CropRect {
    const full: CropRect = { x: 0, y: 0, w, h };
    if (!this.autoFraming) {
      this.currentCrop = null;
      return full;
    }

    this.detectFace(w, h);

    // No face for a while — ease back out to the full frame instead of
    // staying stuck zoomed in on wherever it was last seen.
    if (this.targetCrop && performance.now() - this.lastFaceSeenAt > FACE_LOST_RESET_MS) {
      this.targetCrop = full;
    }

    const target = this.targetCrop ?? full;
    if (!this.currentCrop) this.currentCrop = target;
    this.currentCrop = {
      x: this.currentCrop.x + (target.x - this.currentCrop.x) * CROP_LERP,
      y: this.currentCrop.y + (target.y - this.currentCrop.y) * CROP_LERP,
      w: this.currentCrop.w + (target.w - this.currentCrop.w) * CROP_LERP,
      h: this.currentCrop.h + (target.h - this.currentCrop.h) * CROP_LERP,
    };
    return this.currentCrop;
  }

  transform(frame: VideoFrame, controller: TransformStreamDefaultController<VideoFrame>) {
    if (!this.ctx || !this.canvas) {
      frame.close();
      return;
    }
    const w = frame.displayWidth;
    const h = frame.displayHeight;
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;

    const crop = this.smoothedCrop(w, h);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CanvasRenderingContext2D#filter isn't on the OffscreenCanvas 2D context lib.dom typings yet
    (this.ctx as any).filter = `brightness(${this.brightness}) contrast(${this.contrast})`;
    this.ctx.drawImage(frame, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);

    if (this.touchUp) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.35;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.ctx as any).filter = 'blur(3px) brightness(1.04)';
      this.ctx.drawImage(this.canvas as CanvasImageSource, 0, 0);
      this.ctx.restore();
    }

    const out = new VideoFrame(this.canvas as CanvasImageSource as HTMLCanvasElement, {
      timestamp: frame.timestamp,
    });
    frame.close();
    controller.enqueue(out);
  }
}

export function createAppearanceProcessor(): ProcessorWrapper<AppearanceOptions> {
  return new ProcessorWrapper(new AppearanceTransformer(), 'lumexa-appearance');
}

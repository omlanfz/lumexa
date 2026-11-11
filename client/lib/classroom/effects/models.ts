// FILE PATH: client/lib/classroom/effects/models.ts
//
// The machine-learning models behind the video effects, and nothing else: loading
// them, running them on a small picture, and giving them back. They are MediaPipe's
// (Google, Apache 2.0), run in the browser — no picture ever leaves the computer.
//
//   Person segmentation   which pixels are the person. Two tiers:
//       standard  selfie_segmenter_landscape (~250 KB, kept in public/models): quick to
//                 load and to run; a good outline.
//       high      selfie_multiclass_256x256 (~16 MB, fetched on demand from Google's
//                 model storage): a clearly better outline round hair, ears and
//                 shoulders, and ~3× the work. The pipeline starts on `standard` and
//                 upgrades when this has arrived, if the computer and the network can
//                 afford it (see canAffordHighQuality).
//   Face finding          where the face is (BlazeFace short range, ~230 KB, public/models).
//                 For auto-framing, touch-up, and measuring the light on the face.
//
// The runtime (WebAssembly) is served from this app's own origin when present
// (scripts/copy-mediapipe-wasm.mjs puts it in public/mediapipe), and from a pinned CDN
// when not. Everything is loaded lazily, only when an effect needs it, and a model
// that cannot be loaded is an Error the caller turns into "this effect is not
// available" — never into a broken camera.

import type { FaceDetector, ImageSegmenter, MPMask } from '@mediapipe/tasks-vision';
import type { FaceBox } from './framing.ts';

/** Must match the installed @mediapipe/tasks-vision (scripts/copy-mediapipe-wasm.mjs
 * checks that it does). */
export const TASKS_VISION_VERSION = '0.10.14';

const WASM_SAME_ORIGIN = `/mediapipe/${TASKS_VISION_VERSION}/wasm`;
const WASM_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;

const STORAGE = 'https://storage.googleapis.com/mediapipe-models';
export const MODEL_URLS = {
  high: [`${STORAGE}/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite`],
  standard: [
    '/models/selfie_segmenter_landscape.tflite',
    `${STORAGE}/image_segmenter/selfie_segmenter_landscape/float16/1/selfie_segmenter_landscape.tflite`,
  ],
  face: [
    '/models/blaze_face_short_range.tflite',
    `${STORAGE}/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
  ],
} as const;

/** How long to wait for a model's bytes, and for it to start up. */
const SMALL_MODEL_TIMEOUT_MS = 20_000;
const LARGE_MODEL_TIMEOUT_MS = 90_000;
const START_TIMEOUT_MS = 20_000;

export type SegmenterTier = 'standard' | 'high';

export class ModelLoadError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ModelLoadError';
  }
}

export interface SegmentationResult {
  /** The share of each pixel that is person, 0–1, `width`×`height`, top row first.
   * Valid until the next call. */
  mask: Float32Array;
  width: number;
  height: number;
}

export interface PersonSegmenter {
  readonly tier: SegmenterTier;
  readonly delegate: 'GPU' | 'CPU';
  /** How long one segmentation took on this computer when it was tried out (ms). */
  readonly benchmarkMs: number;
  segment(image: ImageData): SegmentationResult | null;
  close(): void;
}

export interface FaceFinder {
  /** The largest face in the picture (as shares of it), or null when there is none. */
  find(image: ImageData): FaceBox | null;
  close(): void;
}

type Vision = typeof import('@mediapipe/tasks-vision');

let visionPromise: Promise<Vision> | null = null;
function vision(): Promise<Vision> {
  visionPromise ??= import('@mediapipe/tasks-vision').catch((error) => {
    visionPromise = null;
    throw new ModelLoadError('The video effects library could not be loaded.', error);
  });
  return visionPromise;
}

let wasmBase: Promise<string> | null = null;
/** Where the runtime is served from: this app, if the copy is there, else the CDN. */
function runtimeBase(): Promise<string> {
  wasmBase ??= (async () => {
    try {
      const response = await fetch(`${WASM_SAME_ORIGIN}/vision_wasm_internal.wasm`, { method: 'HEAD', cache: 'force-cache' });
      if (response.ok) return WASM_SAME_ORIGIN;
    } catch {
      // not served here
    }
    return WASM_CDN;
  })();
  return wasmBase;
}

/** Races `promise` against a timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ModelLoadError(`${what} took too long.`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function aborted(signal?: AbortSignal): never {
  throw new ModelLoadError('Loading was cancelled.', signal?.reason);
}

/** A model's bytes: the first of `urls` that answers. */
async function fetchModel(urls: readonly string[], timeoutMs: number, signal?: AbortSignal): Promise<Uint8Array> {
  let last: unknown;
  for (const url of urls) {
    if (signal?.aborted) aborted(signal);
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length < 1024) throw new Error('empty model');
      return bytes;
    } catch (error) {
      last = error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  if (signal?.aborted) aborted(signal);
  throw new ModelLoadError('A video-effects model could not be downloaded.', last);
}

/** Creates a MediaPipe task on the GPU, or — where that cannot be done, or when
 * `cpuOnly` says the GPU is only emulated — on the CPU. */
async function withDelegate<T>(
  create: (delegate: 'GPU' | 'CPU') => Promise<T>,
  cpuOnly: boolean,
): Promise<{ task: T; delegate: 'GPU' | 'CPU' }> {
  if (cpuOnly) {
    try {
      return { task: await withTimeout(create('CPU'), START_TIMEOUT_MS, 'Starting a video-effects model'), delegate: 'CPU' };
    } catch (error) {
      throw new ModelLoadError('A video-effects model could not be started.', error);
    }
  }
  try {
    return { task: await withTimeout(create('GPU'), START_TIMEOUT_MS, 'Starting a video-effects model'), delegate: 'GPU' };
  } catch (gpuError) {
    try {
      return { task: await withTimeout(create('CPU'), START_TIMEOUT_MS, 'Starting a video-effects model'), delegate: 'CPU' };
    } catch (cpuError) {
      throw new ModelLoadError('A video-effects model could not be started.', cpuError ?? gpuError);
    }
  }
}

/** Whether the high-quality model is worth fetching and running here: a computer
 * with some power, and a connection that is not metered or slow. */
export function canAffordHighQuality(env: {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  saveData?: boolean;
  effectiveType?: string;
} = browserEnvironment()): boolean {
  if ((env.hardwareConcurrency ?? 4) < 4) return false;
  if (env.deviceMemory !== undefined && env.deviceMemory < 4) return false;
  if (env.saveData) return false;
  return !(env.effectiveType === 'slow-2g' || env.effectiveType === '2g' || env.effectiveType === '3g');
}

function browserEnvironment() {
  if (typeof navigator === 'undefined') return {};
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  return {
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    saveData: nav.connection?.saveData,
    effectiveType: nav.connection?.effectiveType,
  };
}

/** The person mask of a segmentation result, whichever model made it. The
 * multiclass model gives one mask per class, class 0 being the background. */
function personOf(masks: MPMask[], into: Float32Array | null): Float32Array {
  const first = masks[0].getAsFloat32Array();
  const out = into && into.length === first.length ? into : new Float32Array(first.length);
  if (masks.length === 1) {
    out.set(first);
  } else {
    for (let i = 0; i < first.length; i++) out[i] = 1 - first[i];
  }
  return out;
}

export interface LoadOptions {
  signal?: AbortSignal;
  /** The GL here is software emulation: run on the CPU, do not try the GPU. */
  cpuOnly?: boolean;
}

/** A picture to try a model out on: the middle of a flat grey frame is not a person, but
 * it costs what a real frame costs. */
function benchmarkImage(): ImageData {
  const width = 320;
  const height = 180;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 120;
    data[i + 1] = 110;
    data[i + 2] = 105;
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

export async function loadSegmenter(tier: SegmenterTier, options: LoadOptions = {}): Promise<PersonSegmenter> {
  const { signal, cpuOnly = false } = options;
  const [lib, base, bytes] = await Promise.all([
    vision(),
    runtimeBase(),
    fetchModel(MODEL_URLS[tier], tier === 'high' ? LARGE_MODEL_TIMEOUT_MS : SMALL_MODEL_TIMEOUT_MS, signal),
  ]);
  if (signal?.aborted) aborted(signal);
  const fileset = await lib.FilesetResolver.forVisionTasks(base);
  const { task, delegate } = await withDelegate<ImageSegmenter>((delegate) =>
    lib.ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: bytes, delegate },
      runningMode: 'VIDEO',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    }),
    cpuOnly,
  );
  if (signal?.aborted) {
    task.close();
    aborted(signal);
  }

  let person: Float32Array | null = null;
  let lastTimestamp = 0;
  let closed = false;
  const segmenter: PersonSegmenter = {
    tier,
    delegate,
    benchmarkMs: 0,
    segment(image) {
      if (closed) return null;
      lastTimestamp = Math.max(lastTimestamp + 1, Math.floor(performance.now()));
      const result = task.segmentForVideo(image, lastTimestamp);
      try {
        const masks = result.confidenceMasks;
        if (!masks || masks.length === 0) return null;
        person = personOf(masks, person);
        return { mask: person, width: masks[0].width, height: masks[0].height };
      } finally {
        result.close();
      }
    },
    close() {
      if (closed) return;
      closed = true;
      try {
        task.close();
      } catch {
        // already gone
      }
    },
  };
  // Try it out before it is given live video: the first run warms it up, the second
  // says what a frame costs here. A computer that cannot run it fast enough finds out
  // now, not as a frozen camera.
  const probe = benchmarkImage();
  segmenter.segment(probe);
  const started = performance.now();
  segmenter.segment(probe);
  (segmenter as { benchmarkMs: number }).benchmarkMs = performance.now() - started;
  return segmenter;
}

export async function loadFaceFinder(signal?: AbortSignal): Promise<FaceFinder> {
  const [lib, base, bytes] = await Promise.all([vision(), runtimeBase(), fetchModel(MODEL_URLS.face, SMALL_MODEL_TIMEOUT_MS, signal)]);
  if (signal?.aborted) aborted(signal);
  const fileset = await lib.FilesetResolver.forVisionTasks(base);
  // A tiny model: the CPU is as quick as the GPU for it, and costs no extra GPU context.
  let task: FaceDetector;
  try {
    task = await withTimeout(
      lib.FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetBuffer: bytes, delegate: 'CPU' },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.55,
      }),
      START_TIMEOUT_MS,
      'Starting the face finder',
    );
  } catch (error) {
    throw new ModelLoadError('The face finder could not be started.', error);
  }
  if (signal?.aborted) {
    task.close();
    aborted(signal);
  }

  let lastTimestamp = 0;
  let closed = false;
  return {
    find(image) {
      if (closed) return null;
      lastTimestamp = Math.max(lastTimestamp + 1, Math.floor(performance.now()));
      const { detections } = task.detectForVideo(image, lastTimestamp);
      let best: FaceBox | null = null;
      for (const detection of detections) {
        const box = detection.boundingBox;
        if (!box) continue;
        const face: FaceBox = {
          x: Math.min(1, Math.max(0, box.originX / image.width)),
          y: Math.min(1, Math.max(0, box.originY / image.height)),
          w: Math.min(1, box.width / image.width),
          h: Math.min(1, box.height / image.height),
        };
        if (!best || face.w * face.h > best.w * best.h) best = face;
      }
      return best;
    },
    close() {
      if (closed) return;
      closed = true;
      try {
        task.close();
      } catch {
        // already gone
      }
    },
  };
}

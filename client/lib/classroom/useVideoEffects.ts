// FILE PATH: client/lib/classroom/useVideoEffects.ts
//
// React's view of the video-effects controller for a call (see videoEffects.ts), and
// the browser side of it: what this browser can do, opening a camera, and starting the
// pipeline (loaded only when an effect is first used — it is the heaviest code in the
// classroom). The pre-join screen and the classroom both call this with the same call
// object, so they share one controller: the effect picked before joining is the one the
// in-class panel shows and changes.

import { useCallback, useSyncExternalStore } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import { browserSupport } from './daily/loader';
import { VideoEffectsController } from './videoEffects';
import type { CameraRequest, EffectsCall, EffectsDeps } from './videoEffects';
import type { BackgroundEffect } from './backgrounds';
import type { AppearanceOptions } from './effects/options';

export { DEFAULT_APPEARANCE } from './videoEffects';

/** The largest picture accepted as a background (it is only ever shown at camera size). */
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function canMakeWebGl2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** A way to take frames from a camera track and give them back as a track. */
function canMoveFrames(): boolean {
  const g = globalThis as unknown as { MediaStreamTrackProcessor?: unknown; MediaStreamTrackGenerator?: unknown };
  const streams = !!(g.MediaStreamTrackProcessor && g.MediaStreamTrackGenerator && typeof VideoFrame !== 'undefined' && typeof OffscreenCanvas !== 'undefined');
  const captured = typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function' && typeof Worker !== 'undefined';
  return streams || captured;
}

async function support(): Promise<{ supported: boolean; reason: string | null }> {
  const info = await browserSupport();
  if (!info) return { supported: false, reason: "Video effects aren't available in this browser. Try the latest Chrome, Edge, Firefox or Safari." };
  // Processing video on a phone's processor would drain it; not offered there.
  if (info.mobile) return { supported: false, reason: "Video effects aren't available on phones and tablets yet. Use a laptop or desktop computer." };
  if (typeof WebAssembly === 'undefined') return { supported: false, reason: "Video effects aren't available in this browser. Try the latest Chrome, Edge, Firefox or Safari." };
  if (!canMakeWebGl2()) {
    return { supported: false, reason: 'Video effects need graphics acceleration, which is turned off in this browser or on this computer.' };
  }
  if (!canMoveFrames()) return { supported: false, reason: "This browser can't process video for effects. Try the latest Chrome, Edge, Firefox or Safari." };
  return { supported: true, reason: null };
}

async function openCamera(request: CameraRequest): Promise<MediaStreamTrack> {
  const size = (ideal: number | undefined) => (ideal ? { ideal } : undefined);
  const constraints = (deviceId: MediaTrackConstraints['deviceId']): MediaStreamConstraints => ({
    audio: false,
    video: { deviceId, width: size(request.width), height: size(request.height), frameRate: size(request.frameRate) },
  });
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints(request.deviceId ? { exact: request.deviceId } : undefined));
  } catch (error) {
    // the camera's id is not what it was (it was unplugged and plugged back in): any camera will do
    const name = (error as { name?: string })?.name;
    if (request.deviceId && (name === 'OverconstrainedError' || name === 'NotFoundError')) {
      stream = await navigator.mediaDevices.getUserMedia(constraints(undefined));
    } else {
      throw error;
    }
  }
  const [track, ...extra] = stream.getVideoTracks();
  for (const t of extra) t.stop();
  if (!track) throw new Error('The camera sent no video.');
  return track;
}

const browserDeps: EffectsDeps = {
  startPipeline: async (input, settings, events) => {
    const { EffectsPipeline } = await import('./effects/pipeline');
    return EffectsPipeline.start({ input, settings }, events);
  },
  openCamera,
  support,
};

const controllers = new WeakMap<DailyCall, VideoEffectsController>();

/** The one controller for this call (a new one if the last was let go of). */
export function effectsFor(call: DailyCall): VideoEffectsController {
  const existing = controllers.get(call);
  if (existing && !existing.isDisposed) return existing;
  const made = new VideoEffectsController(call as unknown as EffectsCall, browserDeps);
  controllers.set(call, made);
  return made;
}

/** A picture the person chose from their computer, as a background: the object URL
 * of the file, each one let go of when the next is chosen (it lives only in this
 * browser). */
const uploads = new WeakMap<VideoEffectsController, string>();

export function useVideoEffects(call: DailyCall) {
  const controller = effectsFor(call);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  const setBackground = useCallback((background: BackgroundEffect) => controller.setBackground(background), [controller]);
  const setAppearance = useCallback((appearance: AppearanceOptions) => controller.setAppearance(appearance), [controller]);

  /** Chooses a picture from the person's computer as the background. */
  const uploadBackground = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        controller.reportError('That file is not a picture. Choose a JPG or PNG.');
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        controller.reportError('That picture is too large. Choose one under 12 MB.');
        return;
      }
      const url = URL.createObjectURL(file);
      const previous = uploads.get(controller);
      uploads.set(controller, url);
      void controller.setBackground({ mode: 'image', imagePath: url, label: 'Custom' }).finally(() => {
        // the old picture is no longer wanted by anything
        if (previous && previous !== url) URL.revokeObjectURL(previous);
      });
    },
    [controller],
  );

  return {
    ...state,
    background: state.settings.background,
    appearance: state.settings.appearance,
    setBackground,
    setAppearance,
    uploadBackground,
    /** Switches the camera (see VideoEffectsController.selectCamera). */
    selectCamera: controller.selectCamera.bind(controller),
  };
}

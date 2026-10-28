// FILE PATH: client/lib/classroom/useVideoEffects.ts
//
// React's view of the video-effects controller for a call (see videoEffects.ts).
// The pre-join screen and the classroom both call this with the same call object,
// so they share one controller — the effect picked before joining is the one the
// in-class panel shows and changes.

import { useSyncExternalStore } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import { createAppearancePipeline } from './appearanceProcessor';
import { browserSupport } from './daily/loader';
import { VideoEffectsController } from './videoEffects';
import type { EffectsCall, EffectsDeps } from './videoEffects';

export { DEFAULT_LIGHTING } from './videoEffects';

/** The form Daily takes a virtual background image in: a public URL, or the file's
 * bytes (for a picture the person uploaded, which lives only in their browser). */
async function resolveImage(path: string): Promise<string | ArrayBuffer> {
  if (path.startsWith('blob:') || path.startsWith('data:')) {
    return (await fetch(path)).arrayBuffer();
  }
  return new URL(path, window.location.origin).href;
}

const browserDeps: EffectsDeps = {
  createPipeline: createAppearancePipeline,
  resolveImage,
  // Daily's video processors work on desktop browsers only.
  supported: async () => {
    const info = await browserSupport();
    return !!info && info.supportsVideoProcessing && !info.mobile;
  },
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

export function useVideoEffects(call: DailyCall) {
  const controller = effectsFor(call);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  return {
    ...state,
    setBackground: controller.setBackground.bind(controller),
    setLighting: controller.setLighting.bind(controller),
    /** Runs a camera switch (see VideoEffectsController.withCameraSwitch). */
    withCameraSwitch: controller.withCameraSwitch.bind(controller),
  };
}

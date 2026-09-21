// FILE PATH: client/lib/classroom/useVideoEffects.ts
//
// Applies background blur / virtual backgrounds and the Appearance bundle
// (lighting, touch-up, auto-framing) to a local video track via
// @livekit/track-processors + our own appearance processor. Works for both
// the pre-join preview track and the in-room published camera track —
// callers just hand it whichever LocalVideoTrack is currently live.
//
// LiveKit tracks hold one processor at a time, so background effects and
// the appearance bundle are mutually exclusive here — picking one clears
// the other. This keeps the pipeline to what's actually needed rather than
// a multi-pass compositor mixing both ML segmentation and our own canvas
// passes at once.

import { useCallback, useRef, useState } from 'react';
import type { LocalVideoTrack } from 'livekit-client';
import {
  BackgroundProcessor,
  type BackgroundProcessorWrapper,
  type ProcessorWrapper,
  supportsBackgroundProcessors,
} from '@livekit/track-processors';
import { BackgroundEffect, DEFAULT_BACKGROUND_EFFECT } from './backgrounds';
import { createAppearanceProcessor, AppearanceOptions } from './appearanceProcessor';

const BLUR_SLIGHT_RADIUS = 8;
const BLUR_FULL_RADIUS = 20;
export const DEFAULT_LIGHTING: AppearanceOptions = {
  brightness: 1,
  contrast: 1,
  touchUp: false,
  autoFraming: false,
};

function isAppearanceNeutral(o: AppearanceOptions): boolean {
  return o.brightness === 1 && o.contrast === 1 && !o.touchUp && !o.autoFraming;
}

function isSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return supportsBackgroundProcessors();
  } catch {
    return false;
  }
}

type ActiveProcessor =
  | { kind: 'background'; wrapper: BackgroundProcessorWrapper }
  | { kind: 'lighting'; wrapper: ProcessorWrapper<AppearanceOptions> }
  | null;

export function useVideoEffects() {
  const processorRef = useRef<ActiveProcessor>(null);
  const [backgroundEffect, setBackgroundEffectState] = useState<BackgroundEffect>(DEFAULT_BACKGROUND_EFFECT);
  const [lighting, setLightingState] = useState<AppearanceOptions>(DEFAULT_LIGHTING);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(isSupported);

  const clearProcessor = useCallback(async (track: LocalVideoTrack) => {
    if (processorRef.current) {
      await track.stopProcessor();
      processorRef.current = null;
    }
  }, []);

  const setBackground = useCallback(
    async (track: LocalVideoTrack | undefined | null, next: BackgroundEffect) => {
      setBackgroundEffectState(next);
      if (!supported || !track) return;
      setPending(true);
      setError(null);
      try {
        if (next.mode === 'none') {
          if (processorRef.current?.kind === 'background') await clearProcessor(track);
        } else {
          const opts =
            next.mode === 'image'
              ? ({ mode: 'virtual-background', imagePath: next.imagePath } as const)
              : ({
                  mode: 'background-blur',
                  blurRadius: next.mode === 'blur-slight' ? BLUR_SLIGHT_RADIUS : BLUR_FULL_RADIUS,
                } as const);
          if (processorRef.current?.kind === 'background') {
            await processorRef.current.wrapper.switchTo(opts);
          } else {
            if (processorRef.current) await track.stopProcessor();
            const wrapper = BackgroundProcessor(opts);
            await track.setProcessor(wrapper);
            processorRef.current = { kind: 'background', wrapper };
          }
          // Background and the appearance bundle share one processor slot
          // — picking a background clears any active appearance settings.
          setLightingState(DEFAULT_LIGHTING);
        }
      } catch (err) {
        console.error('Failed to apply background effect', err);
        setError('Could not apply this background on your device.');
      } finally {
        setPending(false);
      }
    },
    [clearProcessor, supported],
  );

  const setLighting = useCallback(
    async (track: LocalVideoTrack | undefined | null, next: AppearanceOptions) => {
      setLightingState(next);
      if (!supported || !track) return;
      setPending(true);
      setError(null);
      try {
        if (isAppearanceNeutral(next)) {
          if (processorRef.current?.kind === 'lighting') await clearProcessor(track);
          return;
        }
        if (processorRef.current?.kind === 'lighting') {
          await processorRef.current.wrapper.updateTransformerOptions(next);
        } else {
          if (processorRef.current) await track.stopProcessor();
          const wrapper = createAppearanceProcessor();
          await track.setProcessor(wrapper);
          await wrapper.updateTransformerOptions(next);
          processorRef.current = { kind: 'lighting', wrapper };
        }
        // The appearance bundle and background share one processor slot.
        setBackgroundEffectState(DEFAULT_BACKGROUND_EFFECT);
      } catch (err) {
        console.error('Failed to apply appearance effect', err);
        setError('Could not apply this on your device.');
      } finally {
        setPending(false);
      }
    },
    [clearProcessor, supported],
  );

  /** Re-applies whatever effect is currently selected to a freshly (re)published
   * track — used when the camera is toggled back on after being off. */
  const reapply = useCallback(
    (track: LocalVideoTrack | undefined | null) => {
      processorRef.current = null;
      if (backgroundEffect.mode !== 'none') void setBackground(track, backgroundEffect);
      else if (!isAppearanceNeutral(lighting)) void setLighting(track, lighting);
    },
    [backgroundEffect, lighting, setBackground, setLighting],
  );

  return {
    backgroundEffect,
    setBackground,
    lighting,
    setLighting,
    reapply,
    pending,
    error,
    supported,
  };
}

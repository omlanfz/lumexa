// FILE PATH: client/lib/classroom/useVideoEffects.ts
//
// Applies background blur / virtual backgrounds and lighting adjustment to a
// local video track via @livekit/track-processors + our own lighting
// processor. Works for both the pre-join preview track and the in-room
// published camera track — callers just hand it whichever LocalVideoTrack is
// currently live.
//
// LiveKit tracks hold one processor at a time, so background effects and
// lighting are mutually exclusive here — picking one clears the other. This
// keeps the pipeline to what's actually needed rather than a multi-pass
// compositor.

import { useCallback, useRef, useState } from 'react';
import type { LocalVideoTrack } from 'livekit-client';
import {
  BackgroundProcessor,
  type BackgroundProcessorWrapper,
  type ProcessorWrapper,
  supportsBackgroundProcessors,
} from '@livekit/track-processors';
import { BackgroundEffect, DEFAULT_BACKGROUND_EFFECT } from './backgrounds';
import { createLightingProcessor, LightingOptions } from './lightingProcessor';

const BLUR_SLIGHT_RADIUS = 8;
const BLUR_FULL_RADIUS = 20;
export const DEFAULT_LIGHTING: LightingOptions = { brightness: 1, contrast: 1 };

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
  | { kind: 'lighting'; wrapper: ProcessorWrapper<LightingOptions> }
  | null;

export function useVideoEffects() {
  const processorRef = useRef<ActiveProcessor>(null);
  const [backgroundEffect, setBackgroundEffectState] = useState<BackgroundEffect>(DEFAULT_BACKGROUND_EFFECT);
  const [lighting, setLightingState] = useState<LightingOptions>(DEFAULT_LIGHTING);
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
          // Background and lighting share one processor slot — picking a
          // background clears any active lighting adjustment.
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
    async (track: LocalVideoTrack | undefined | null, next: LightingOptions) => {
      setLightingState(next);
      if (!supported || !track) return;
      const isNeutral = next.brightness === 1 && next.contrast === 1;
      setPending(true);
      setError(null);
      try {
        if (isNeutral) {
          if (processorRef.current?.kind === 'lighting') await clearProcessor(track);
          return;
        }
        if (processorRef.current?.kind === 'lighting') {
          await processorRef.current.wrapper.updateTransformerOptions(next);
        } else {
          if (processorRef.current) await track.stopProcessor();
          const wrapper = createLightingProcessor();
          await track.setProcessor(wrapper);
          await wrapper.updateTransformerOptions(next);
          processorRef.current = { kind: 'lighting', wrapper };
        }
        // Lighting and background share one processor slot.
        setBackgroundEffectState(DEFAULT_BACKGROUND_EFFECT);
      } catch (err) {
        console.error('Failed to apply lighting effect', err);
        setError('Could not apply lighting adjustment on your device.');
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
      else if (lighting.brightness !== 1 || lighting.contrast !== 1) void setLighting(track, lighting);
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

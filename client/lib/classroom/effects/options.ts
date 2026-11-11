// FILE PATH: client/lib/classroom/effects/options.ts
//
// What the person can ask of their video, and what each choice needs. Plain
// values and pure functions: nothing here touches a camera or the browser.

import type { BackgroundEffect } from '../backgrounds.ts';
import { DEFAULT_BACKGROUND_EFFECT } from '../backgrounds.ts';

/** The "Appearance" choices of the Video Effects panel. */
export interface AppearanceOptions {
  /** Lighting adjustment: 0 is off; up to 1. The picture is measured and brightened
   * as far as it needs — never past a natural look — by this much. */
  lighting: number;
  /** A light touch-up of the skin. */
  touchUp: boolean;
  /** Keep the person comfortably framed: a gentle crop that follows them. */
  autoFraming: boolean;
}

export const DEFAULT_APPEARANCE: AppearanceOptions = { lighting: 0, touchUp: false, autoFraming: false };

/** Everything the person has asked for. The effects combine: any of them with any
 * of the others. */
export interface EffectSettings {
  background: BackgroundEffect;
  appearance: AppearanceOptions;
}

export const DEFAULT_SETTINGS: EffectSettings = {
  background: DEFAULT_BACKGROUND_EFFECT,
  appearance: DEFAULT_APPEARANCE,
};

/** Nothing is asked for: the camera goes out as it is. */
export function isNeutral(settings: EffectSettings): boolean {
  const a = settings.appearance;
  return settings.background.mode === 'none' && a.lighting <= 0 && !a.touchUp && !a.autoFraming;
}

/** Whether the person has to be told apart from the background. */
export function needsSegmentation(settings: EffectSettings): boolean {
  return settings.background.mode !== 'none';
}

/** Whether the face is looked for: to frame it, to retouch only it, and to measure
 * the light on it rather than on the room. */
export function needsFaceDetection(settings: EffectSettings): boolean {
  const a = settings.appearance;
  return a.autoFraming || a.touchUp || a.lighting > 0;
}

/** A lighting strength from a slider's 0–100 (clamped, so a stray value never
 * reaches the shader). */
export function lightingFromPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(1, Math.max(0, percent / 100));
}

export function sameSettings(a: EffectSettings, b: EffectSettings): boolean {
  return (
    sameBackground(a.background, b.background) &&
    a.appearance.lighting === b.appearance.lighting &&
    a.appearance.touchUp === b.appearance.touchUp &&
    a.appearance.autoFraming === b.appearance.autoFraming
  );
}

export function sameBackground(a: BackgroundEffect, b: BackgroundEffect): boolean {
  if (a.mode !== b.mode) return false;
  return a.mode === 'image' && b.mode === 'image' ? a.imagePath === b.imagePath : true;
}

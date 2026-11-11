// FILE PATH: client/lib/classroom/effects/exposure.ts
//
// Automatic lighting adjustment, without a camera or a browser in it: how bright is
// the person, how much brighter should they be, and how fast to get there.
//
// What it is meant to feel like (a meeting app's "adjust for low light"): a dim or
// unevenly lit picture is brought up to a normal level; a picture that is already
// fine is left alone (a hint of brightness at most). It is measured on the PERSON —
// their face — not on the room, so a bright window behind them does not make it
// think they are well lit. It follows changes in the light slowly (a cloud, a lamp
// switched on) and ignores a hand waved in front of the camera, so it never pumps.
//
// The gain is in linear light (what a camera's exposure really does), applied the
// same to red, green and blue so skin keeps its colour; the shader rolls the
// highlights off softly so a bright forehead or a window does not blow out.

import type { FaceBox } from './framing.ts';

/** The brightness (0–1, as displayed) a face should have. Mid-way between a dim
 * face and a bright one: "well exposed". */
export const TARGET_LUMA = 0.44;
/** The most the picture is brightened, in linear light (+1.1 stops). */
export const MAX_GAIN = 2.2;
/** A picture this dark is mostly sensor noise: brightening it far only shows noise. */
const NEAR_BLACK = 0.06;
const NEAR_BLACK_MAX_GAIN = 1.6;
/** At full strength, even a well-lit picture is brightened this much (in stops), so
 * the slider always does something you can see. */
const EXTRA_STOPS = 0.08;
/** The most the shadows are given on top of the gain — a share more — at full
 * strength. (Applied as a gain, so black stays black.) */
const MAX_LIFT = 0.3;

export function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** How much to brighten a picture whose person measures `measured` (0–1,
 * displayed brightness), at `strength` (0–1). 1 = leave as it is. */
export function desiredGain(measured: number, strength: number): number {
  const s = clamp(strength, 0, 1);
  if (s <= 0) return 1;
  const y = clamp(measured, 0.03, 1);
  const cap = y < NEAR_BLACK ? NEAR_BLACK_MAX_GAIN : MAX_GAIN;
  const needed = clamp(srgbToLinear(TARGET_LUMA) / srgbToLinear(y), 1, cap);
  // `strength` is how much of the way, in stops (so half is half as many stops)
  return Math.pow(needed, s) * Math.pow(2, EXTRA_STOPS * s);
}

/** How much extra the shadows get (0 – MAX_LIFT, a share): more when the person is dark. */
export function desiredLift(measured: number, strength: number): number {
  const s = clamp(strength, 0, 1);
  return s * MAX_LIFT * clamp((0.45 - measured) / 0.3, 0, 1);
}

/** What the shader is told. */
export interface Exposure {
  gain: number;
  lift: number;
}

const READINGS = 5;
/** Changes smaller than this (a ratio, in log terms: 3.5%) are not followed. */
const DEADBAND = 0.035;
/** How long, in seconds, to follow a change: brightening is slower than dimming. */
const RISE_S = 1.4;
const FALL_S = 0.8;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export class ExposureController {
  private readings: number[] = [];
  private gain = 1;
  private lift = 0;
  private lastAt: number | null = null;

  /** Feeds one frame. `measured` is a new reading of the person's brightness (0–1)
   * or null when there is none this frame; `now` in ms. Returns what to apply. */
  update(measured: number | null, now: number, strength: number): Exposure {
    const dt = this.lastAt === null ? 0 : clamp((now - this.lastAt) / 1000, 0, 0.25);
    this.lastAt = now;
    if (measured !== null && Number.isFinite(measured)) {
      this.readings.push(clamp(measured, 0, 1));
      if (this.readings.length > READINGS) this.readings.shift();
    }
    // The median of the last few readings: a hand waved past is not a change of light.
    const metered = this.readings.length ? median(this.readings) : null;
    const wantedGain = metered === null ? 1 : desiredGain(metered, strength);
    const wantedLift = metered === null ? 0 : desiredLift(metered, strength);

    const change = Math.log(wantedGain / this.gain);
    // Turning the effect off is always followed; small wobbles are not.
    if (Math.abs(change) > DEADBAND || strength <= 0) {
      const seconds = change > 0 ? RISE_S : FALL_S;
      const k = this.lastAt === null || dt === 0 ? 0 : 1 - Math.exp(-dt / seconds);
      this.gain = Math.exp(Math.log(this.gain) + change * k);
      this.lift += (wantedLift - this.lift) * k;
    }
    if (strength <= 0 && Math.abs(this.gain - 1) < 0.002) {
      this.gain = 1;
      this.lift = 0;
    }
    return { gain: this.gain, lift: this.lift };
  }

  /** Forget everything measured (the camera changed). */
  reset(): void {
    this.readings = [];
    this.gain = 1;
    this.lift = 0;
    this.lastAt = null;
  }

  get current(): Exposure {
    return { gain: this.gain, lift: this.lift };
  }
}

// ─── Measuring ──────────────────────────────────────────────────────────────

/** Where to look for the person's light. */
export type MeterRegion = { kind: 'face'; box: FaceBox } | { kind: 'centre' };

/** The weight of the picture at (x, y), both 0–1: a soft spot over the face, or a
 * soft spot over the middle of the frame when no face is known. */
export function meterWeight(region: MeterRegion, x: number, y: number): number {
  if (region.kind === 'face') {
    // Nearly flat over the face and falling away fast just outside it (a detected
    // face box is already tight), so the hair, the wall and the window barely count.
    const { box } = region;
    const dx = (x - (box.x + box.w / 2)) / (box.w / 2);
    const dy = (y - (box.y + box.h / 2)) / (box.h / 2);
    const r2 = dx * dx + dy * dy;
    return Math.exp(-r2 * r2 * 0.8);
  }
  const dx = (x - 0.5) / 0.26;
  const dy = (y - 0.45) / 0.3;
  return 0.04 + Math.exp(-(dx * dx + dy * dy) * 1.2);
}

/** The average brightness (0–1, as displayed) of `rgba` (a `width`×`height` picture,
 * 4 bytes a pixel, top row first), weighted by where the person is. */
export function meterLuma(rgba: ArrayLike<number>, width: number, height: number, region: MeterRegion): number {
  let sum = 0;
  let weights = 0;
  for (let j = 0; j < height; j++) {
    const y = (j + 0.5) / height;
    for (let i = 0; i < width; i++) {
      const w = meterWeight(region, (i + 0.5) / width, y);
      const o = (j * width + i) * 4;
      const luma = (0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2]) / 255;
      sum += w * luma;
      weights += w;
    }
  }
  return weights > 0 ? sum / weights : 0;
}

/** `rgba` (a `width`×`height` picture) averaged down by a whole `factor` each way — a
 * small picture is all the light needs measuring on, and cheap to weigh. */
export function downsampleRgba(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  factor: number,
): { rgba: Uint8Array; width: number; height: number } {
  const f = Math.max(1, Math.floor(factor));
  const w = Math.max(1, Math.floor(width / f));
  const h = Math.max(1, Math.floor(height / f));
  const out = new Uint8Array(w * h * 4);
  const area = f * f;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const o = ((j * f + dy) * width + (i * f + dx)) * 4;
          r += rgba[o];
          g += rgba[o + 1];
          b += rgba[o + 2];
        }
      }
      const q = (j * w + i) * 4;
      out[q] = r / area;
      out[q + 1] = g / area;
      out[q + 2] = b / area;
      out[q + 3] = 255;
    }
  }
  return { rgba: out, width: w, height: h };
}

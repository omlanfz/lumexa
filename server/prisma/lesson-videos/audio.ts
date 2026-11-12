// The sound of a lesson preview video: the narrator (recorded sentence by sentence by tts.py), a
// soft instrumental bed and a handful of small sound effects. The music and every effect are
// synthesised here from scratch — no samples, no third-party recordings — so there is nothing to
// license: Lumexa owns them outright.

import * as fs from 'fs';
import * as path from 'path';
import type { SfxEvent, SfxKind } from './engine/plan';

export const SAMPLE_RATE = 48000;

// ─── WAV ────────────────────────────────────────────────────────────────────

export interface Wav {
  rate: number;
  data: Float32Array;
}

/** Reads a mono PCM16 / float32 WAV file. */
export function readWav(file: string): Wav {
  const buf = fs.readFileSync(file);
  if (
    buf.toString('ascii', 0, 4) !== 'RIFF' ||
    buf.toString('ascii', 8, 12) !== 'WAVE'
  )
    throw new Error(`${file} is not a WAV file`);
  let pos = 12;
  let rate = 0;
  let channels = 1;
  let bits = 16;
  let format = 1;
  let data: Float32Array | null = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      format = buf.readUInt16LE(body);
      channels = buf.readUInt16LE(body + 2);
      rate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
    } else if (id === 'data') {
      const bytes = bits / 8;
      const frames = Math.floor(size / (bytes * channels));
      const out = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        const at = body + i * bytes * channels;
        out[i] =
          format === 3
            ? buf.readFloatLE(at)
            : bits === 16
              ? buf.readInt16LE(at) / 32768
              : buf.readInt32LE(at) / 2147483648;
      }
      data = out;
    }
    pos = body + size + (size % 2);
  }
  if (!data || !rate) throw new Error(`${file}: no audio data`);
  return { rate, data };
}

export function writeWavStereo(
  file: string,
  left: Float32Array,
  right: Float32Array,
  rate = SAMPLE_RATE,
): void {
  const frames = left.length;
  const buf = Buffer.alloc(44 + frames * 4);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + frames * 4, 4);
  buf.write('WAVEfmt ', 8, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(frames * 4, 40);
  const clip = (v: number) =>
    Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  for (let i = 0; i < frames; i++) {
    buf.writeInt16LE(clip(left[i]), 44 + i * 4);
    buf.writeInt16LE(clip(right[i]), 46 + i * 4);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}

export function resample(
  data: Float32Array,
  from: number,
  to: number,
): Float32Array {
  if (from === to) return data;
  const n = Math.round((data.length * to) / from);
  const out = new Float32Array(n);
  const ratio = from / to;
  for (let i = 0; i < n; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const f = x - i0;
    const a = data[i0] ?? 0;
    const b = data[i0 + 1] ?? a;
    out[i] = a + (b - a) * f;
  }
  return out;
}

// ─── Deterministic random numbers ───────────────────────────────────────────

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;

// ─── Music: a soft, cheerful, exploratory bed ───────────────────────────────

/** I – V – vi – IV, as semitone offsets from the key's root. */
const PROGRESSION: number[][] = [
  [0, 4, 7],
  [7, 11, 14],
  [9, 12, 16],
  [5, 9, 12],
];

export function synthMusic(
  seconds: number,
  seed: number,
): { l: Float32Array; r: Float32Array } {
  const n = Math.ceil(seconds * SAMPLE_RATE);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  const rand = rng(seed * 2654435761);
  const roots = [55, 57, 58, 60, 62];
  const root = roots[seed % roots.length];
  const bpm = 92 + (seed % 4) * 4;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const bars = Math.ceil(seconds / bar) + 1;

  const add = (
    at: number,
    dur: number,
    fn: (t: number, i: number) => number,
    pan: number,
    gain: number,
  ) => {
    const start = Math.floor(at * SAMPLE_RATE);
    const len = Math.floor(dur * SAMPLE_RATE);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < len; i++) {
      const k = start + i;
      if (k >= n) break;
      const v = fn(i / SAMPLE_RATE, i);
      l[k] += v * gl;
      r[k] += v * gr;
    }
  };

  const patterns = [
    [0, 2, 1, 2, 0, 2, 1, 2],
    [0, 1, 2, 1, 2, 1, 0, 1],
    [2, 1, 0, 1, 2, 3, 2, 1],
  ];
  const pattern = patterns[seed % patterns.length];

  for (let b = 0; b < bars; b++) {
    const chord = PROGRESSION[b % PROGRESSION.length].map((o) => root + o);
    const t0 = b * bar;

    // warm pad: each chord tone as two slightly detuned sines with a slow swell
    for (const m of chord) {
      const f = midi(m);
      add(
        t0,
        bar + 0.6,
        (t) => {
          const env =
            Math.min(1, t / 0.7) *
            Math.min(1, Math.max(0, (bar + 0.6 - t) / 0.7));
          return (
            (Math.sin(TAU * f * t) +
              Math.sin(TAU * f * 1.004 * t) +
              0.22 * Math.sin(TAU * 2 * f * t)) *
            0.5 *
            env
          );
        },
        (m % 3) - 1 > 0 ? 0.4 : -0.4,
        0.05,
      );
    }

    // bass: root on one and three
    for (const beatIndex of [0, 2]) {
      const f = midi(chord[0] - 12);
      add(
        t0 + beatIndex * beat,
        beat * 1.8,
        (t) => Math.sin(TAU * f * t) * Math.exp(-t * 2.4),
        0,
        0.12,
      );
    }

    // marimba-like arpeggio on the eighth notes
    pattern.forEach((p, i) => {
      if (rand() < 0.16 && i % 4 !== 0) return;
      const m = chord[p % chord.length] + 12 + (i === 7 ? 12 : 0);
      const f = midi(m);
      const accent = i % 4 === 0 ? 1 : 0.72;
      add(
        t0 + (i * beat) / 2,
        0.9,
        (t) => {
          const env = Math.exp(-t * 5.2) * Math.min(1, t / 0.004);
          return (
            (Math.sin(TAU * f * t) +
              0.38 * Math.sin(TAU * 3 * f * t) * Math.exp(-t * 11) +
              0.12 * Math.sin(TAU * 5.4 * f * t) * Math.exp(-t * 22)) *
            env
          );
        },
        i % 2 ? 0.32 : -0.32,
        0.085 * accent,
      );
    });

    // a whisper of shaker on the off-beats
    for (let q = 0; q < 4; q++) {
      const r0 = rng(seed + b * 31 + q);
      add(
        t0 + q * beat + beat / 2,
        0.05,
        (t) => (r0() * 2 - 1) * Math.exp(-t * 90),
        q % 2 ? 0.5 : -0.5,
        0.012,
      );
    }
  }

  // fade in and out
  const fadeIn = Math.floor(1.6 * SAMPLE_RATE);
  const fadeOut = Math.floor(2.4 * SAMPLE_RATE);
  for (let i = 0; i < n; i++) {
    const g = Math.min(1, i / fadeIn) * Math.min(1, (n - i) / fadeOut);
    l[i] *= g;
    r[i] *= g;
  }
  return { l, r };
}

// ─── Sound effects ──────────────────────────────────────────────────────────

function sfxSamples(kind: SfxKind, seed: number): Float32Array {
  const rand = rng(seed);
  const make = (seconds: number, fn: (t: number) => number) => {
    const out = new Float32Array(Math.floor(seconds * SAMPLE_RATE));
    for (let i = 0; i < out.length; i++) out[i] = fn(i / SAMPLE_RATE);
    return out;
  };
  switch (kind) {
    case 'whoosh': {
      let lp = 0;
      return make(0.6, (t) => {
        const u = t / 0.6;
        const cutoff = 0.02 + 0.5 * Math.pow(u, 1.6);
        lp += cutoff * (rand() * 2 - 1 - lp);
        return lp * Math.pow(Math.sin(Math.PI * Math.min(1, u)), 1.6) * 1.6;
      });
    }
    case 'pop':
      return make(0.16, (t) => {
        const f = 260 + 520 * Math.exp(-t * 34);
        return (
          (Math.sin(TAU * f * t) * Math.exp(-t * 26) +
            (rand() * 2 - 1) * 0.12 * Math.exp(-t * 300)) *
          0.9
        );
      });
    case 'click':
      return make(
        0.07,
        (t) =>
          ((rand() * 2 - 1) * 0.35 + Math.sin(TAU * 1600 * t) * 0.5) *
          Math.exp(-t * 95),
      );
    case 'chime':
      return make(
        1.3,
        (t) =>
          (Math.sin(TAU * 880 * t) * Math.exp(-t * 3.2) +
            0.5 * Math.sin(TAU * 1760 * t) * Math.exp(-t * 5.5) +
            0.25 * Math.sin(TAU * 2640 * t) * Math.exp(-t * 9)) *
          0.6,
      );
    case 'success': {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      return make(1.6, (t) => {
        let v = 0;
        notes.forEach((f, i) => {
          const tt = t - i * 0.09;
          if (tt > 0)
            v +=
              (Math.sin(TAU * f * tt) * Math.exp(-tt * 3.6) +
                0.3 * Math.sin(TAU * 2 * f * tt) * Math.exp(-tt * 7)) *
              0.4;
        });
        return v;
      });
    }
    default: {
      const tones = Array.from({ length: 7 }, () => ({
        f: 2500 + rand() * 3500,
        at: rand() * 0.45,
      }));
      return make(0.9, (t) =>
        tones.reduce(
          (v, k) =>
            t > k.at
              ? v +
                Math.sin(TAU * k.f * (t - k.at)) *
                  Math.exp(-(t - k.at) * 14) *
                  0.2
              : v,
          0,
        ),
      );
    }
  }
}

// ─── The mix ────────────────────────────────────────────────────────────────

export interface MixInput {
  duration: number;
  seed: number;
  /** Narrated sentences: where each starts, and its audio file. */
  voice: { start: number; file: string }[];
  sfx: SfxEvent[];
  outPath: string;
}

export interface MixReport {
  peak: number;
  voiceRms: number;
  voiceSeconds: number;
}

const TARGET_VOICE_RMS = 0.13;

export function mixLessonAudio(input: MixInput): MixReport {
  const n = Math.ceil(input.duration * SAMPLE_RATE);
  const voice = new Float32Array(n);
  let voiceSeconds = 0;
  for (const v of input.voice) {
    const wav = readWav(v.file);
    let s = resample(wav.data, wav.rate, SAMPLE_RATE);
    // bring every sentence to the same loudness (speech only), without clipping
    let sum = 0;
    let count = 0;
    let peak = 0;
    for (const x of s) {
      if (Math.abs(x) > 0.01) {
        sum += x * x;
        count++;
      }
      peak = Math.max(peak, Math.abs(x));
    }
    const rms = count ? Math.sqrt(sum / count) : 0;
    const gain =
      rms > 0
        ? Math.min(TARGET_VOICE_RMS / rms, 0.92 / Math.max(peak, 1e-6))
        : 1;
    s = s.map((x) => x * gain);
    const at = Math.round(v.start * SAMPLE_RATE);
    for (let i = 0; i < s.length && at + i < n; i++) voice[at + i] += s[i];
    voiceSeconds += s.length / SAMPLE_RATE;
  }

  // duck the music while the narrator speaks
  const env = new Float32Array(n);
  let e = 0;
  const attack = 1 - Math.exp(-1 / (0.02 * SAMPLE_RATE));
  const release = 1 - Math.exp(-1 / (0.35 * SAMPLE_RATE));
  for (let i = 0; i < n; i++) {
    const a = Math.abs(voice[i]);
    e += (a > e ? attack : release) * (a - e);
    env[i] = e;
  }
  const music = synthMusic(input.duration, input.seed);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const duck = 1 - 0.68 * Math.min(1, env[i] / 0.05);
    const m = 0.46 * duck;
    l[i] = voice[i] + music.l[i] * m;
    r[i] = voice[i] + music.r[i] * m;
  }
  input.sfx.forEach((event, index) => {
    const s = sfxSamples(event.kind, input.seed + index * 17);
    const at = Math.round(event.t * SAMPLE_RATE);
    const gain =
      event.kind === 'whoosh'
        ? 0.2
        : event.kind === 'success'
          ? 0.2
          : event.kind === 'click'
            ? 0.16
            : 0.18;
    for (let i = 0; i < s.length && at + i < n; i++) {
      l[at + i] += s[i] * gain;
      r[at + i] += s[i] * gain;
    }
  });

  let peak = 0;
  for (let i = 0; i < n; i++) {
    l[i] = Math.tanh(l[i] * 0.95);
    r[i] = Math.tanh(r[i] * 0.95);
    peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  }
  writeWavStereo(input.outPath, l, r);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++)
    if (Math.abs(voice[i]) > 0.01) {
      sum += voice[i] * voice[i];
      count++;
    }
  return { peak, voiceRms: count ? Math.sqrt(sum / count) : 0, voiceSeconds };
}

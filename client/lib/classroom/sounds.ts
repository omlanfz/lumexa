// FILE PATH: client/lib/classroom/sounds.ts
//
// The classroom's short, soft sound effects: someone joining or leaving, a raised
// hand, a chat message, a badge, the scheduled time running out. Synthesized on
// the fly with the Web Audio API (a few sine notes with a quick decay, pitched
// differently per event so each is recognisable) rather than shipping audio
// files — nothing to download, nothing to keep in step.
//
// What keeps them kind to a class:
//   - They only ever go to this person's own speakers. They are never added to
//     the call, so they cannot reach the microphone track others hear, and the
//     class recording (which mixes the call's own audio tracks, see
//     recording/classAudio.ts) never contains them.
//   - One switch per person, remembered on this device (see SoundToggle).
//   - A sound that is a repeat, comes too soon after its own kind or would play
//     over another is skipped (see ./soundPolicy.ts).
//   - Browsers keep an AudioContext silent until the person has interacted with
//     the page; nothing plays (and nothing is queued to burst out later) until
//     then. Joining the class is such an interaction, and any click or key press
//     afterwards unlocks it too.

import { createSoundGate, type SoundRule } from './soundPolicy';

export type ClassroomToneEvent =
  | 'teacher-join'
  | 'student-join'
  | 'teacher-leave'
  | 'student-leave'
  | 'class-expired'
  | 'hand-raised'
  | 'admission-request'
  | 'timer-milestone'
  | 'chat-message'
  | 'badge-awarded';

interface ToneProfile {
  freqs: number[];
  /** Total length of the sound, in seconds. */
  duration: number;
  gain: number;
  /** A faint octave above each note — a little sparkle (the badge). */
  shimmer?: boolean;
  rule: SoundRule;
}

// Ascending pairs read as "arriving", descending pairs as "departing" — a
// gentle two-note chime, never a jingle. class-expired is a slightly longer,
// three-note descending tone so it reads as a distinct, calmer cue.
const PROFILES: Record<ClassroomToneEvent, ToneProfile> = {
  'teacher-join': { freqs: [660, 880], duration: 0.22, gain: 0.05, rule: { priority: 1, cooldownMs: 1500, durationMs: 300 } },
  'student-join': { freqs: [520, 720], duration: 0.2, gain: 0.045, rule: { priority: 1, cooldownMs: 1500, durationMs: 300 } },
  'teacher-leave': { freqs: [660, 440], duration: 0.22, gain: 0.045, rule: { priority: 1, cooldownMs: 1500, durationMs: 300 } },
  'student-leave': { freqs: [520, 380], duration: 0.2, gain: 0.04, rule: { priority: 1, cooldownMs: 1500, durationMs: 300 } },
  'class-expired': { freqs: [520, 440, 360], duration: 0.55, gain: 0.05, rule: { priority: 3, cooldownMs: 5000, durationMs: 650 } },
  // A single bright, brief "ping" — distinct from the two-note join/leave
  // chimes so a raised hand never gets mistaken for someone arriving.
  'hand-raised': { freqs: [980], duration: 0.14, gain: 0.045, rule: { priority: 3, cooldownMs: 1200, durationMs: 250 } },
  // A soft rising three-note knock, longer than hand-raised so it reads as
  // "someone at the door" rather than a quick alert.
  'admission-request': { freqs: [440, 600, 760], duration: 0.4, gain: 0.045, rule: { priority: 3, cooldownMs: 2000, durationMs: 500 } },
  // A single low, short tick — meant to be barely noticeable, just enough
  // to accompany the timer turning red.
  'timer-milestone': { freqs: [300], duration: 0.18, gain: 0.035, rule: { priority: 1, cooldownMs: 3000, durationMs: 250 } },
  // A quick, soft two-note "blip" — distinct from every presence/alert tone
  // above (none of them share this pitch pair) so a new chat message never
  // gets mistaken for someone joining or a raised hand.
  'chat-message': { freqs: [700, 900], duration: 0.12, gain: 0.035, rule: { priority: 2, cooldownMs: 1500, durationMs: 200 } },
  // The achievement sound: a bright C-major arpeggio, a touch longer and
  // sparkling, the one sound in the class that is allowed to stand out.
  'badge-awarded': { freqs: [523, 659, 784, 1047], duration: 0.62, gain: 0.07, shimmer: true, rule: { priority: 4, cooldownMs: 2500, durationMs: 800 } },
};

const gate = createSoundGate(
  Object.fromEntries(Object.entries(PROFILES).map(([event, p]) => [event, p.rule])) as Record<ClassroomToneEvent, SoundRule>,
);

// ─── The person's switch ─────────────────────────────────────────────────────

const PREF_KEY = 'lumexa_classroom_sounds';
let enabled = true;
let preferenceLoaded = false;
const listeners = new Set<() => void>();

function loadPreference(): void {
  if (preferenceLoaded) return;
  preferenceLoaded = true;
  try {
    enabled = window.localStorage.getItem(PREF_KEY) !== 'off';
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

/** Whether classroom sounds are on for this person (on until they turn them off). */
export function soundsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  loadPreference();
  return enabled;
}

export function setSoundsEnabled(on: boolean): void {
  loadPreference();
  enabled = on;
  try {
    window.localStorage.setItem(PREF_KEY, on ? 'on' : 'off');
  } catch {
    // see loadPreference
  }
  listeners.forEach((l) => l());
}

/** For useSyncExternalStore. */
export function subscribeSounds(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== PREF_KEY) return;
    enabled = e.newValue !== 'off'; // another tab changed it
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

// ─── Audio ───────────────────────────────────────────────────────────────────

let sharedContext: AudioContext | null = null;
let unlockArmed = false;

function newContext(): AudioContext | null {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctor ? new Ctor() : null;
  } catch {
    return null;
  }
}

/**
 * Lets sounds play from now on. Call it from a click or key press (the browsers'
 * rule: no audio before the person has interacted). It is also armed on the first
 * pointer/key/touch event after the classroom opens (see armSoundUnlock).
 */
export function unlockClassroomSounds(): void {
  if (typeof window === 'undefined') return;
  if (!sharedContext) sharedContext = newContext();
  if (sharedContext && sharedContext.state === 'suspended') void sharedContext.resume().catch(() => {});
}

/** Unlocks on the person's next interaction with the page. Safe to call often. */
export function armSoundUnlock(): void {
  if (typeof window === 'undefined' || unlockArmed) return;
  unlockArmed = true;
  const events = ['pointerdown', 'keydown', 'touchend'] as const;
  const onInteract = () => {
    unlockClassroomSounds();
    if (sharedContext?.state === 'running') events.forEach((e) => window.removeEventListener(e, onInteract, true));
  };
  events.forEach((e) => window.addEventListener(e, onInteract, true));
  // The join click that brought them here already counts in most browsers.
  unlockClassroomSounds();
}

/** A new class: forget which sounds were already played. */
export function resetClassroomSounds(): void {
  gate.reset();
}

/**
 * Plays the event's sound — if sounds are on, the browser lets audio play, and it
 * is not a repeat. `key` names the thing announced (a chat message id, a badge
 * award id): the same key plays once, however often it is announced again.
 * Returns whether it played.
 */
export function playClassroomTone(event: ClassroomToneEvent, key?: string): boolean {
  if (typeof window === 'undefined' || !soundsEnabled()) return false;
  const ctx = sharedContext ?? (sharedContext = newContext());
  if (!ctx) return false;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  // Not unlocked yet: stay silent rather than queue a sound for later.
  if (ctx.state !== 'running') return false;
  if (!gate.tryPlay(event, key)) return false;

  try {
    const { freqs, duration, gain, shimmer } = PROFILES[event];
    const now = ctx.currentTime;
    const step = duration / freqs.length;
    // Each note rings a little past its slot, so a run of notes blends.
    const ring = Math.max(step * 1.8, 0.12);

    // A soft low-pass keeps every tone round and gentle.
    const master = ctx.createGain();
    master.gain.value = 1;
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 3600;
    master.connect(soften);
    soften.connect(ctx.destination);

    freqs.forEach((freq, i) => {
      const t = now + i * step;
      const note = ctx.createGain();
      note.gain.setValueAtTime(0.0001, t);
      note.gain.exponentialRampToValueAtTime(gain, t + 0.02);
      note.gain.exponentialRampToValueAtTime(0.0001, t + ring);
      note.connect(master);

      const partials = shimmer ? [{ f: freq, a: 1 }, { f: freq * 2, a: 0.22 }] : [{ f: freq, a: 1 }];
      for (const { f, a } of partials) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        if (a === 1) {
          osc.connect(note);
        } else {
          const g = ctx.createGain();
          g.gain.value = a;
          osc.connect(g);
          g.connect(note);
        }
        osc.start(t);
        osc.stop(t + ring + 0.05);
      }
    });
    return true;
  } catch {
    // A missed chime should never break the classroom experience.
    return false;
  }
}

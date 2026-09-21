// FILE PATH: client/lib/classroom/sounds.ts
//
// Very short, subtle space-themed presence tones for the classroom (teacher/
// student join or leave, scheduled time expiring). Synthesized on the fly
// with the Web Audio API rather than shipping binary audio assets — a soft
// sine sweep with a quick decay, pitched differently per event so they're
// distinguishable without ever being intrusive during a live class.

export type ClassroomToneEvent =
  | 'teacher-join'
  | 'student-join'
  | 'teacher-leave'
  | 'student-leave'
  | 'class-expired'
  | 'hand-raised'
  | 'admission-request'
  | 'timer-milestone';

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedContext) sharedContext = new Ctor();
    if (sharedContext.state === 'suspended') void sharedContext.resume();
    return sharedContext;
  } catch {
    return null;
  }
}

interface ToneProfile {
  freqs: number[];
  duration: number;
  gain: number;
}

// Ascending pairs read as "arriving", descending pairs as "departing" — a
// gentle two-note chime, never a jingle. class-expired is a slightly longer,
// three-note descending tone so it reads as a distinct, calmer cue.
const PROFILES: Record<ClassroomToneEvent, ToneProfile> = {
  'teacher-join': { freqs: [660, 880], duration: 0.22, gain: 0.05 },
  'student-join': { freqs: [520, 720], duration: 0.2, gain: 0.045 },
  'teacher-leave': { freqs: [660, 440], duration: 0.22, gain: 0.045 },
  'student-leave': { freqs: [520, 380], duration: 0.2, gain: 0.04 },
  'class-expired': { freqs: [520, 440, 360], duration: 0.55, gain: 0.05 },
  // A single bright, brief "ping" — distinct from the two-note join/leave
  // chimes so a raised hand never gets mistaken for someone arriving.
  'hand-raised': { freqs: [980], duration: 0.14, gain: 0.045 },
  // A soft rising three-note knock, longer than hand-raised so it reads as
  // "someone at the door" rather than a quick alert.
  'admission-request': { freqs: [440, 600, 760], duration: 0.4, gain: 0.045 },
  // A single low, short tick — meant to be barely noticeable, just enough
  // to accompany the timer turning red.
  'timer-milestone': { freqs: [300], duration: 0.18, gain: 0.035 },
};

export function playClassroomTone(event: ClassroomToneEvent): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const { freqs, duration, gain } = PROFILES[event];
    const now = ctx.currentTime;
    const step = duration / freqs.length;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(gain, now + 0.03);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(ctx.destination);

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const t = now + i * step;
      osc.frequency.setValueAtTime(freq, t);
      osc.connect(master);
      osc.start(t);
      osc.stop(t + step + 0.05);
    });
  } catch {
    // A missed chime should never break the classroom experience.
  }
}

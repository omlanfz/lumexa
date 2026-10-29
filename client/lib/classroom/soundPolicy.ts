// FILE PATH: client/lib/classroom/soundPolicy.ts
//
// When a classroom sound may play — and when it must stay quiet. Pure (the clock
// is passed in), so the rules that keep a busy class from turning into a racket
// can be tested without a browser or any audio:
//
//   - An event with a `key` (a chat message id, a badge award id, one raising of
//     a hand) plays once however many times it is announced: a reconnection or a
//     repeated delivery is not a second chime.
//   - The same kind of sound is not repeated within its own cool-down, so ten
//     people joining at once, or a flurry of chat, is one soft sound — not ten.
//   - Sounds never pile on top of each other: while one is playing, a lower
//     priority one is skipped, and an equal or higher one (a badge over a chat
//     blip) may follow once the window is clear.

export type SoundPriority = 1 | 2 | 3 | 4;

export interface SoundRule {
  /** Higher wins when two sounds would overlap. */
  priority: SoundPriority;
  /** The least time between two sounds of this kind. */
  cooldownMs: number;
  /** How long the sound occupies the speakers. */
  durationMs: number;
}

/** How many played keys are remembered (a long class does not grow without bound). */
const REMEMBER_KEYS = 200;

export interface SoundGate<E extends string> {
  /** Records the sound and returns true if it should play now; false (and
   * records nothing) if it is a repeat, too soon, or would overlap. */
  tryPlay(event: E, key?: string): boolean;
  /** Forgets everything (a new class). */
  reset(): void;
}

export function createSoundGate<E extends string>(
  rules: Record<E, SoundRule>,
  now: () => number = Date.now,
): SoundGate<E> {
  const lastByEvent = new Map<E, number>();
  const seen = new Set<string>();
  let busyUntil = 0;
  let busyPriority = 0;

  return {
    tryPlay(event, key) {
      const rule = rules[event];
      const t = now();
      const memo = key === undefined ? null : `${event}:${key}`;
      if (memo && seen.has(memo)) return false;

      const last = lastByEvent.get(event);
      if (last !== undefined && t - last < rule.cooldownMs) return false;
      // Something is still sounding: only a more important sound may cut in.
      if (t < busyUntil && rule.priority <= busyPriority) return false;

      if (memo) {
        seen.add(memo);
        if (seen.size > REMEMBER_KEYS) seen.delete(seen.values().next().value as string);
      }
      lastByEvent.set(event, t);
      busyUntil = t + rule.durationMs;
      busyPriority = rule.priority;
      return true;
    },
    reset() {
      lastByEvent.clear();
      seen.clear();
      busyUntil = 0;
      busyPriority = 0;
    },
  };
}

// FILE PATH: client/lib/classroom/effects/retry.ts
//
// How many times something that broke is mended before it is given up on, and how long to
// leave between the tries: a few tries inside a window of time, each after a longer pause.
// Used for the segmentation model (pipeline.ts) and for the effects as a whole
// (../videoEffects.ts), so that a hiccup — a camera that stuttered, a graphics driver that
// restarted — is mended quietly, while something that keeps breaking is still given up on
// and the person told. Time is passed in, so it can be tested without a clock.

export class RetryBudget {
  private tries: number[] = [];

  /**
   * @param max       the most tries inside `windowMs`
   * @param windowMs  how far back tries count
   * @param pausesMs  the pause before the 1st, 2nd, 3rd … try inside the window (the last
   *                  one repeats if there are more tries than pauses)
   */
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly pausesMs: readonly number[],
  ) {}

  /** Uses up one try: how long to wait before making it (ms), or null when there are no
   * more for now. */
  take(now: number): number | null {
    this.tries = this.tries.filter((at) => now - at < this.windowMs);
    if (this.tries.length >= this.max) return null;
    const pause = this.pausesMs[Math.min(this.tries.length, this.pausesMs.length - 1)] ?? 0;
    this.tries.push(now);
    return pause;
  }

  /** A fresh start (the person chose something themselves): every try is available again. */
  reset(): void {
    this.tries = [];
  }
}

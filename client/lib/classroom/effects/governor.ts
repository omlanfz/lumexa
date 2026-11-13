// FILE PATH: client/lib/classroom/effects/governor.ts
//
// The pipeline's sense of "can this computer keep up?", as a decision apart from the work.
// Every moment or two the pipeline tells it what a picture costs (ms) against the time the
// camera gives for each (ms), and it says what to do:
//
//   - the work does not fit: make it lighter, a step at a time (the caller knows the steps:
//     the better model goes, segmentation runs less often, the picture is made smaller);
//   - there is plenty of room for a good while: take a step back toward full quality, so a
//     brief load (a screen share starting, another program) does not leave the picture
//     poorer for the rest of the class;
//   - and only when it is already as light as it gets AND a picture still takes so long that
//     the video has all but stopped, give up — the one case where no effect is better than
//     the effect.
//
// A video that runs at 15–20 pictures a second with the effect on is a good video. The
// effects used to be dropped as soon as that was the best this computer could do (the
// background simply disappeared a while into the class); a computer that cannot do 30 a
// second now does as many as it can, and keeps the effect.
//
// Pure: no clock, no browser — fed numbers, answering with a verdict — so it is tested as such.

/** The work is "keeping up" when a picture costs less than this share of the camera's interval. */
export const BUDGET_SHARE = 0.9;
/** A picture that costs this much (ms) — a handful a second — is worse than no effect. */
export const FROZEN_COST_MS = 250;
/** …and it has to stay that way for this many looks (a few seconds) before it is given up on. */
export const FROZEN_WINDOWS = 4;
/** Over budget this many looks in a row: lighten the work. */
const OVER_BEFORE_LIGHTENING = 2;
/** "Plenty of room" is a cost under this share of the budget. */
const HEADROOM_SHARE = 0.4;
/** Plenty of room for this many looks in a row (nine seconds at the usual rate) before a
 * step is taken back; it doubles each time the work has had to be lightened again, so a
 * computer that sits on the edge does not bounce between the two. */
const RESTORE_AFTER = 6;
const MAX_RESTORE_AFTER = 40;

export type Verdict = 'ok' | 'lightened' | 'restored' | 'give-up';

export interface GovernorHooks {
  /** Makes the work lighter by one step. False when there is nothing left to give up. */
  lighten(): boolean;
  /** Takes one step back toward full quality. False when it is already there. */
  restore(): boolean;
}

export class Governor {
  private over = 0;
  private under = 0;
  private frozen = 0;
  private restoreAfter = RESTORE_AFTER;
  /** Everything that can be given up has been: there is no step left to take. */
  private atLightest = false;

  constructor(private readonly hooks: GovernorHooks) {}

  /** A look at the work: what a picture costs now (ms) and the time the camera gives for each. */
  evaluate(costMs: number, nominalMs: number): Verdict {
    const budget = nominalMs * BUDGET_SHARE;

    if (costMs > budget) {
      this.under = 0;
      if (!this.atLightest) {
        this.over += 1;
        if (this.over < OVER_BEFORE_LIGHTENING) return 'ok';
        this.over = 0;
        if (this.hooks.lighten()) {
          this.frozen = 0;
          this.restoreAfter = Math.min(MAX_RESTORE_AFTER, this.restoreAfter * 2);
          return 'lightened';
        }
        this.atLightest = true;
      }
      // As light as it gets. It still does not fit — but a picture that comes 15 times a
      // second is a good one. Only one that has all but stopped is worse than no effect.
      if (costMs > FROZEN_COST_MS) {
        this.frozen += 1;
        return this.frozen >= FROZEN_WINDOWS ? 'give-up' : 'ok';
      }
      this.frozen = 0;
      return 'ok';
    }

    this.over = 0;
    this.frozen = 0;
    if (costMs < budget * HEADROOM_SHARE) {
      this.under += 1;
      if (this.under >= this.restoreAfter) {
        this.under = 0;
        if (this.hooks.restore()) {
          this.atLightest = false;
          return 'restored';
        }
      }
    } else {
      this.under = 0;
    }
    return 'ok';
  }
}

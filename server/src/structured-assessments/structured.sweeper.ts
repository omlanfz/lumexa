// FILE PATH: server/src/structured-assessments/structured.sweeper.ts
//
// The server's own clock for structured assessments. A student whose 40 minutes run out is handed in
// by the browser at 00:00, but a closed laptop, a lost connection or a crashed tab must not leave an
// attempt open for ever, so every 30 seconds the server hands in whatever has expired — exactly as it
// was last saved — and the teacher's report card appears as usual.

import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AssessmentsService } from '../assessments/assessments.service';

export const SWEEP_INTERVAL_MS = 30_000;

@Injectable()
export class StructuredAttemptSweeper {
  private readonly logger = new Logger(StructuredAttemptSweeper.name);
  private running = false;

  constructor(private readonly assessments: AssessmentsService) {}

  @Interval(SWEEP_INTERVAL_MS)
  async sweep(): Promise<number> {
    if (this.running) return 0; // never overlap with the previous run
    this.running = true;
    try {
      const handedIn = await this.assessments.submitExpiredAttempts();
      if (handedIn > 0) this.logger.log(`Handed in ${handedIn} expired structured attempt(s).`);
      return handedIn;
    } catch (err) {
      this.logger.warn(`Sweep of expired structured attempts failed: ${err}`);
      return 0;
    } finally {
      this.running = false;
    }
  }
}

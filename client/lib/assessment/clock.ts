// FILE PATH: client/lib/assessment/clock.ts
//
// A test's stopwatch counts from the moment the SERVER created the attempt, not
// from whatever this computer's clock says. A student's laptop can be minutes
// fast or slow; measured naively that would start their test at "03:12" (or
// "-02:40"). The server sends its clock with every response, so we work out how
// far ours is off and correct for it.
//
// Pure functions, no DOM — unit-tested with Node's test runner.

/** Server clock minus this computer's clock, in ms. The server stamped its
 *  response somewhere between our request leaving and the answer arriving, so
 *  the middle of that window is the best estimate of "now" on this computer. */
export function clockOffsetMs(serverTime: string | undefined | null, requestSentAt: number, responseReceivedAt: number): number {
  if (!serverTime) return 0;
  const server = Date.parse(serverTime);
  if (Number.isNaN(server)) return 0;
  return server - (requestSentAt + responseReceivedAt) / 2;
}

/** Milliseconds from `startedAt` to now (corrected by `offsetMs`) or, once the
 *  test has ended, to `endedAt`. Never negative. Null when there is no start. */
export function elapsedMs(
  startedAt: string | null | undefined,
  now: number,
  offsetMs: number,
  endedAt?: string | null,
): number | null {
  if (!startedAt) return null;
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return null;
  const end = endedAt ? Date.parse(endedAt) : now + offsetMs;
  if (Number.isNaN(end)) return null;
  return Math.max(0, end - start);
}

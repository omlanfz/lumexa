// FILE PATH: client/lib/useLiveClass.ts
//
// Keeps a dashboard's "next class" card in step with the clock: the countdown
// ticks on the second, the card turns Live (badge, elapsed time, Join button)
// the moment the start arrives, and whenever what it shows changes — the
// classroom opening, the class starting, the class running out — the server is
// asked again, so what stays on screen is what the server says, not just a timer
// that reached zero (a class cancelled, ended or moved meanwhile is dropped or
// replaced by that answer). The rules live in ./liveClass.ts.
//
// Used with the time the answer arrived (`receivedAtMs`), which lets the device
// clock be corrected by the server's own "until start". A tab that slept, was in
// the background or was opened late recalculates the moment it is looked at.

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { classState, clockSkewMs, msToNextTick, stateKey, type ClassState, type ClassTiming } from './liveClass';

export function useLiveClass(
  timing: ClassTiming | null,
  receivedAtMs: number,
  /** Asked once each time the card's state changes: re-read the class from the server. */
  onStateChange: () => void,
): ClassState | null {
  const start = timing?.start;
  const end = timing?.end;
  const msUntilStart = timing?.msUntilStart;
  const skew = useMemo(
    () => (start && end ? clockSkewMs({ start, end, msUntilStart }, receivedAtMs) : 0),
    [start, end, msUntilStart, receivedAtMs],
  );

  const [deviceNow, setDeviceNow] = useState(() => Date.now());
  const onChangeRef = useRef(onStateChange);
  useEffect(() => {
    onChangeRef.current = onStateChange;
  });

  // Tick on the beat of the timer; and straight away when the tab is looked at
  // again (timers are throttled or frozen in the background).
  useEffect(() => {
    if (!start || !end) return;
    const timing: ClassTiming = { start, end };
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = Date.now();
      setDeviceNow(now);
      timer = setTimeout(tick, msToNextTick(timing, now + skew));
    };
    const wake = () => {
      if (document.visibilityState === 'hidden') return;
      clearTimeout(timer);
      tick();
    };
    tick();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
    };
  }, [start, end, skew]);

  const state = start && end ? classState({ start, end }, deviceNow + skew) : null;

  // The server is asked again each time the state changes — not on the first
  // reading of a class (that answer is what was just received).
  const key = start && end && state ? `${start}|${end}|${stateKey(state)}` : null;
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    const previous = lastKey.current;
    lastKey.current = key;
    if (!key || !previous) return;
    const sameClass = previous.split('|', 2).join('|') === key.split('|', 2).join('|');
    if (sameClass && previous !== key) onChangeRef.current();
  }, [key]);

  return state;
}

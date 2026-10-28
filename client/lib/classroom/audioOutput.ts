// FILE PATH: client/lib/classroom/audioOutput.ts
//
// Which speaker the class is played through. The classroom plays other people's
// audio itself (ClassAudioRenderer), so the choice lives here and is applied to
// each audio element with setSinkId, where the browser supports it (Chromium;
// not Safari or Firefox, which simply play through the system's default).

import { useSyncExternalStore } from 'react';

let speakerId = '';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSpeakerId(id: string): void {
  if (id === speakerId) return;
  speakerId = id;
  listeners.forEach((l) => l());
}

/** The chosen speaker's device id; '' means the system default. */
export function useSpeakerId(): string {
  return useSyncExternalStore(
    subscribe,
    () => speakerId,
    () => '',
  );
}

/** Whether this browser can send audio to a chosen speaker. */
export function canChooseSpeaker(): boolean {
  return typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
}

/** Points an audio element at a speaker (best effort: a device that has gone away
 * just leaves it on the default). */
export async function applySpeaker(el: HTMLMediaElement, id: string): Promise<void> {
  const sink = el as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };
  if (!sink.setSinkId) return;
  try {
    await sink.setSinkId(id);
  } catch {
    // keep playing through the default speaker
  }
}

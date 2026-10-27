// FILE PATH: client/lib/classroom/recording/capture.ts
//
// Capturing the teacher's browser window, and knowing whether this browser can.
//
// What the platform allows — stated plainly, because the recording is built
// around it:
//   - A web page cannot silently record the screen. The browser always asks the
//     teacher what to share, and only they can answer: this module can suggest
//     "window" (a hint, which Chrome and Edge honour by opening that tab of the
//     picker) but not choose it. They may pick the browser window, a single tab,
//     or the whole screen; which one it was is reported back so it can be shown.
//   - Audio is NOT taken from the capture (see classAudio.ts for why), so the
//     capture is asked for video only — which also keeps the browser from
//     offering to share the computer's other sounds.
//   - Only a desktop browser can capture a screen. Phones and tablets cannot, and
//     Safari (before 18.4) cannot record WebM — there the Record button explains
//     itself instead of failing.

/** What the teacher chose to share. */
export type CaptureSurface = 'browser' | 'window' | 'monitor' | 'unknown';

/** Video bitrate for a class: screen content at 15 frames a second is mostly
 * still, so ~1.2 Mbit/s looks sharp at 720p and keeps an hour near 600 MB —
 * the file a teacher uploads from home. */
export const VIDEO_BITS_PER_SECOND = 1_200_000;
export const AUDIO_BITS_PER_SECOND = 96_000;

/** VP8 first: it encodes in real time on any laptop, which matters because the
 * teacher's computer is also running the live class. */
export const RECORDER_MIME_CANDIDATES = [
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm',
] as const;

/** The first WebM type this browser can record, or null if it cannot record WebM. */
export function pickRecorderMimeType(
  isTypeSupported: (type: string) => boolean = (t) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t),
): string | null {
  return RECORDER_MIME_CANDIDATES.find((t) => isTypeSupported(t)) ?? null;
}

/** What this browser offers — a parameter so it can be tested without one. */
export interface SupportEnvironment {
  hasGetDisplayMedia: boolean;
  hasMediaRecorder: boolean;
  hasAudioContext: boolean;
  /** The WebM type it can record (null: none). */
  mimeType: string | null;
}

function browserEnvironment(): SupportEnvironment {
  const hasWindow = typeof window !== 'undefined';
  return {
    hasGetDisplayMedia:
      hasWindow &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getDisplayMedia === 'function',
    hasMediaRecorder: hasWindow && typeof MediaRecorder !== 'undefined',
    hasAudioContext: hasWindow && typeof AudioContext !== 'undefined',
    mimeType: hasWindow ? pickRecorderMimeType() : null,
  };
}

export interface RecordingSupport {
  supported: boolean;
  /** Why not, in words the teacher can act on. */
  reason?: string;
}

export function recordingSupport(
  env: SupportEnvironment = browserEnvironment(),
): RecordingSupport {
  if (!env.hasGetDisplayMedia) {
    return {
      supported: false,
      reason:
        'Recording needs Chrome, Edge or Firefox on a laptop or desktop computer. Phones and tablets cannot record their screen.',
    };
  }
  if (!env.hasMediaRecorder || !env.hasAudioContext || !env.mimeType) {
    return {
      supported: false,
      reason:
        'This browser cannot record a class as a WebM video. Use a recent Chrome, Edge or Firefox.',
    };
  }
  return { supported: true };
}

/** The teacher dismissed the browser's "choose what to share" box. */
export class CaptureCancelled extends Error {
  constructor() {
    super('Recording was not started: no window was chosen to share.');
    this.name = 'CaptureCancelled';
  }
}

export interface ScreenCapture {
  stream: MediaStream;
  track: MediaStreamTrack;
  surface: CaptureSurface;
}

/** Asks the browser to share the window. Must be called straight from the
 * teacher's click: the browser only shows its box for a user action. */
export async function requestScreenCapture(): Promise<ScreenCapture> {
  // `displaySurface`, `selfBrowserSurface` and `surfaceSwitching` are hints and
  // permissions Chrome and Edge understand and other browsers ignore.
  const options = {
    video: {
      displaySurface: 'window',
      frameRate: { ideal: 15, max: 30 },
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
    },
    audio: false,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'include',
  };
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia(
      options as DisplayMediaStreamOptions,
    );
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'NotAllowedError' || name === 'AbortError') {
      throw new CaptureCancelled();
    }
    throw err;
  }
  // The capture's own sound (if a browser gave any anyway) is never recorded.
  for (const audio of stream.getAudioTracks()) {
    audio.stop();
    stream.removeTrack(audio);
  }
  const track = stream.getVideoTracks()[0];
  if (!track) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error('The browser did not share any video.');
  }
  const shared = (track.getSettings() as { displaySurface?: string })
    .displaySurface;
  const surface: CaptureSurface =
    shared === 'browser' || shared === 'window' || shared === 'monitor'
      ? shared
      : 'unknown';
  return { stream, track, surface };
}

/** What was shared, for the teacher to read. */
export function describeSurface(surface: CaptureSurface): string {
  switch (surface) {
    case 'window':
      return 'a window';
    case 'browser':
      return 'a browser tab';
    case 'monitor':
      return 'your whole screen';
    default:
      return 'your screen';
  }
}

/** A recording error in words a teacher can act on. */
export function captureErrorMessage(err: unknown): string {
  if (err instanceof CaptureCancelled) return err.message;
  const name = (err as { name?: string })?.name;
  if (name === 'NotReadableError') {
    return 'Your browser could not read the screen to record it. Close other screen-sharing or recording apps and try again.';
  }
  if (name === 'NotSupportedError' || name === 'TypeError') {
    return 'This browser cannot record the screen. Use a recent Chrome, Edge or Firefox on a laptop or desktop.';
  }
  return 'Recording could not start. Please try again.';
}

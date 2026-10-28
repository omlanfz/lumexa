// FILE PATH: client/lib/classroom/daily/errors.ts
//
// Turning what Daily says when joining (or being in) a meeting fails into
// something a student, a parent or a teacher can act on. Pure, so it is tested.
//
// `join()` rejects with, and the call's `error` event carries, an object like
// `{ errorMsg, error: { type, msg } }` — or, for a plain failure, an Error.

/** What the camera and microphone check (`camera-error`) found, for the pre-join
 * screen. */
export function describeCameraError(error: { type?: string } | undefined, blocked?: Array<'video' | 'audio'>): string {
  const what = blocked?.length === 1 ? (blocked[0] === 'video' ? 'Camera' : 'Microphone') : 'Camera or microphone';
  switch (error?.type) {
    case 'permissions':
      return `${what} blocked — allow it in your browser’s permissions, then reload this page.`;
    case 'not-found':
      return `${what} not found — plug one in, or join without it.`;
    case 'cam-in-use':
      return 'Your camera is being used by another app — close it, or join without your camera.';
    case 'mic-in-use':
      return 'Your microphone is being used by another app — close it, or join without your microphone.';
    case 'cam-mic-in-use':
      return 'Your camera and microphone are being used by another app — close it, or join without them.';
    case 'undefined-mediadevices':
      return 'This browser cannot use a camera or microphone here — open the class in Chrome, Edge, Safari or Firefox over a secure (https) connection.';
    default:
      return `${what} unavailable — check your browser permissions.`;
  }
}

const GENERIC = 'Could not connect to the classroom. Check your internet connection and try again.';

/** A message for the person when joining the classroom failed. */
export function describeJoinError(err: unknown): string {
  const e = err as { error?: { type?: string; msg?: string }; errorMsg?: string; message?: string } | null | undefined;
  switch (e?.error?.type) {
    case 'nbf-room':
    case 'nbf-token':
      return 'This class has not opened yet. Please come back a little closer to the start time.';
    case 'exp-room':
    case 'exp-token':
      return 'This class link has expired. Go back and open the class again.';
    case 'no-room':
    case 'end-of-life':
      return 'This classroom is no longer open.';
    case 'meeting-full':
      return 'This classroom is full. Please try again when someone leaves.';
    case 'not-allowed':
      return 'You are not allowed to join this classroom.';
    case 'ejected':
      return 'You were removed from this class.';
    default:
      return GENERIC;
  }
}

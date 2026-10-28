// FILE PATH: client/lib/classroom/identity.ts
//
// One person can be in the same classroom from several devices or tabs — say
// one for the camera and one for the microphone. Daily gives every connection
// its own `session_id`, and the meeting token the server signs carries the
// person's `user_id` (see server/src/classroom/room-ref.util.ts). Everything
// the screen shows per person — a tile, a raised hand, a spotlight, the
// participant count — is keyed by that user id, so two devices are one person.

/** Most people (teacher included) one classroom holds. The server enforces it;
 * this is for showing "n of 10". */
export const MAX_PEOPLE_PER_CLASSROOM = 10;

/** The user id of an admin watching the class (see ClassroomService.
 * adminJoinLiveClass): "admin-observer-" and a timestamp. An observer is not a
 * person in the class — it has no tile and is never counted. */
export const ADMIN_OBSERVER_PREFIX = 'admin-observer-';

export function isAdminObserver(userId: string): boolean {
  return userId.startsWith(ADMIN_OBSERVER_PREFIX);
}

// FILE PATH: client/lib/classroom/identity.ts
//
// One person can be in the same classroom from several devices or tabs — say
// one for the camera and one for the microphone. Every connection has its own
// LiveKit identity, `<userId>~<deviceId>` (issued by the server, see
// server/src/classroom/room-ref.util.ts), and everything the screen shows per
// person — a tile, a raised hand, a spotlight, the participant count — is keyed
// by personKey(), the userId part.

export const IDENTITY_SEPARATOR = '~';

/** Most people (teacher included) one classroom holds. The server enforces it;
 * this is for showing "n of 10". */
export const MAX_PEOPLE_PER_CLASSROOM = 10;

/** The person behind a LiveKit identity (their userId). */
export function personKey(identity: string): string {
  const cut = identity.indexOf(IDENTITY_SEPARATOR);
  return cut === -1 ? identity : identity.slice(0, cut);
}

export function samePerson(a: string, b: string): boolean {
  return personKey(a) === personKey(b);
}

/** A fresh id for THIS page load — 16 hex characters, which is what the server
 * accepts. It is deliberately not remembered: a refreshed tab is a new
 * connection (the old one drops within seconds), and a duplicated tab can never
 * share an identity with the original and push it out of the room. */
export function newDeviceId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

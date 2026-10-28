// FILE PATH: client/lib/classroom/daily/moderation.ts
//
// What the teacher does to the people in the room: mute them, turn a camera off,
// stop a screen share, take away (or give back) the right to unmute. They are
// done by the TEACHER'S OWN BROWSER, straight through Daily: the teacher's meeting
// token is the room's owner token (the server only ever issues one to the class's
// teacher), and Daily refuses these calls from anyone else. So a student who
// calls them from their own browser's console changes nothing.
//
// Everything acts on a PERSON — every connection of theirs, however many devices —
// and never on the teacher or an observer. Removing someone is not here: it needs
// the server (the knock-to-rejoin bookkeeping), see lib/classroom/api.ts.

import type { Peer } from './peers.ts';

export interface ParticipantUpdate {
  setAudio?: boolean;
  setVideo?: boolean;
  setScreenShare?: false;
  updatePermissions?: { canSend?: string[] | Set<string> | boolean };
}

/** The part of a Daily call the teacher's controls use (a DailyCall fits). */
export interface ModerationCall {
  updateParticipants(updates: Record<string, ParticipantUpdate>): unknown;
}

/** What a student may send while their microphone is locked: everything but audio. */
export const SENDABLE_WITHOUT_MIC = ['video', 'screenVideo', 'screenAudio'];

/** The connections a teacher may act on for this person: all of theirs, unless
 * that person is the teacher themselves, an observer, or not here. */
function connectionsOf(peers: Peer[], userId: string): Peer[] {
  return peers.filter((p) => p.userId === userId && !p.isOwner && !p.isObserver && !p.isLocal);
}

function apply(call: ModerationCall, targets: Peer[], update: ParticipantUpdate): number {
  if (targets.length === 0) return 0;
  call.updateParticipants(Object.fromEntries(targets.map((p) => [p.sessionId, update])));
  return targets.length;
}

/** Switches a person's microphone or camera off, on every device they are on. */
export function mutePerson(call: ModerationCall, peers: Peer[], userId: string, kind: 'audio' | 'video'): number {
  const targets = connectionsOf(peers, userId).filter((p) => (kind === 'audio' ? p.audio.on : p.video.on));
  return apply(call, targets, kind === 'audio' ? { setAudio: false } : { setVideo: false });
}

/** Mutes every student's microphone; returns how many connections were muted. */
export function muteAllStudents(call: ModerationCall, peers: Peer[]): number {
  const targets = peers.filter((p) => !p.isOwner && !p.isObserver && !p.isLocal && p.audio.on);
  return apply(call, targets, { setAudio: false });
}

/** Stops a person's screen share, on every device they are sharing from. */
export function stopPersonScreenShare(call: ModerationCall, peers: Peer[], userId: string): number {
  const targets = connectionsOf(peers, userId).filter((p) => p.screenVideo.on);
  return apply(call, targets, { setScreenShare: false });
}

/**
 * Takes away (`locked`) or gives back the right to send a microphone, on every
 * device of the person. Daily enforces it: with the right gone, the microphone
 * stops sending and the person's own browser cannot turn it back on. Giving it
 * back does not unmute them — they choose when.
 */
export function setPersonMicLocked(call: ModerationCall, peers: Peer[], userId: string, locked: boolean): number {
  const targets = connectionsOf(peers, userId);
  const update: ParticipantUpdate = locked
    ? { setAudio: false, updatePermissions: { canSend: new Set(SENDABLE_WITHOUT_MIC) } }
    : { updatePermissions: { canSend: true } };
  return apply(call, targets, update);
}

/** Whether a person's microphone is locked on every connection of theirs we can see. */
export function isPersonMicLocked(peers: Peer[], userId: string): boolean {
  const theirs = peers.filter((p) => p.userId === userId);
  return theirs.length > 0 && theirs.every((p) => p.micLocked);
}

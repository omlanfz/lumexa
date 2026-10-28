// FILE PATH: client/lib/classroom/daily/peers.ts
//
// Turning Daily's participants into the people on screen. Pure functions, so
// they can be tested without a call.
//
// Daily describes a CONNECTION (a `session_id`): one participant per device or
// tab. A person on two devices is two participants with the same `user_id` — and
// one tile, one entry in the participant list, one seat in the count. So there
// are two levels here:
//
//   Peer     one connection, as Daily reports it (toPeers)
//   Person   everything one `user_id` is doing across their connections (groupPeople)
//
// Who is the teacher is decided by Daily's room-owner flag, which only the
// server's meeting token can set — never by the name, which anyone can change.

import { isAdminObserver } from '../identity.ts';
import { displayNameOf } from '../types.ts';
import type { ClassroomRole } from '../types.ts';

/** The part of Daily's `DailyTrackState` the classroom reads. */
export interface TrackStateLike {
  state: 'blocked' | 'off' | 'sendable' | 'loading' | 'interrupted' | 'playable';
  off?: { byCanSendPermission?: boolean; [reason: string]: boolean | undefined };
  persistentTrack?: MediaStreamTrack;
  track?: MediaStreamTrack;
}

/** The part of a Daily participant the classroom reads (a `DailyParticipant`
 * fits it). */
export interface ParticipantLike {
  session_id: string;
  user_id?: string;
  user_name?: string;
  local: boolean;
  owner?: boolean;
  joined_at?: Date | string | number;
  networkQualityState?: 'good' | 'warning' | 'bad' | 'unknown';
  permissions?: { canSend?: ReadonlySet<string> | boolean };
  tracks: {
    audio?: TrackStateLike;
    video?: TrackStateLike;
    screenAudio?: TrackStateLike;
    screenVideo?: TrackStateLike;
  };
}

export interface PeerTrack {
  /** Being sent (or received) — not switched off, not blocked. */
  on: boolean;
  /** Daily's state, for the odd case that needs the detail. */
  state: TrackStateLike['state'];
  /** The media itself, whenever Daily has any. It is the same object for as long
   * as the track lives, so it can be attached once. */
  track: MediaStreamTrack | null;
  /** Off because the teacher took away the right to send it. */
  lockedByTeacher: boolean;
}

export type NetworkQuality = 'good' | 'warning' | 'bad' | 'unknown';

/** One connection to the classroom. */
export interface Peer {
  /** Daily's id for this one connection. */
  sessionId: string;
  /** The person (the meeting token's `user_id`): the same on every device. */
  userId: string;
  /** The name the server signed in, e.g. "Ada (Student)". */
  name: string;
  /** The name without the "(Student)" suffix. */
  displayName: string;
  role: ClassroomRole;
  /** This connection is this browser tab. */
  isLocal: boolean;
  /** The room's owner: the class's teacher. */
  isOwner: boolean;
  /** An admin watching silently. Not a person in the class. */
  isObserver: boolean;
  joinedAtMs: number;
  audio: PeerTrack;
  video: PeerTrack;
  screenAudio: PeerTrack;
  screenVideo: PeerTrack;
  /** The teacher took away this connection's right to send a microphone. */
  micLocked: boolean;
  quality: NetworkQuality;
}

const MISSING: TrackStateLike = { state: 'off' };

function peerTrack(t: TrackStateLike | undefined): PeerTrack {
  const s = t ?? MISSING;
  return {
    on: s.state !== 'off' && s.state !== 'blocked',
    state: s.state,
    track: s.persistentTrack ?? s.track ?? null,
    lockedByTeacher: s.state === 'off' && s.off?.byCanSendPermission === true,
  };
}

function canSendAudio(p: ParticipantLike): boolean {
  const canSend = p.permissions?.canSend;
  if (canSend === undefined || canSend === true) return true;
  if (canSend === false) return false;
  return canSend.has('audio');
}

function toMs(joined: ParticipantLike['joined_at']): number {
  if (joined === undefined || joined === null) return 0;
  const ms = joined instanceof Date ? joined.getTime() : new Date(joined).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function toPeer(p: ParticipantLike): Peer {
  const userId = p.user_id || p.session_id;
  const name = p.user_name ?? '';
  const isOwner = p.owner === true;
  return {
    sessionId: p.session_id,
    userId,
    name,
    displayName: displayNameOf(name) || 'Guest',
    role: isOwner ? 'TEACHER' : 'STUDENT',
    isLocal: p.local === true,
    isOwner,
    isObserver: isAdminObserver(userId),
    joinedAtMs: toMs(p.joined_at),
    audio: peerTrack(p.tracks.audio),
    video: peerTrack(p.tracks.video),
    screenAudio: peerTrack(p.tracks.screenAudio),
    screenVideo: peerTrack(p.tracks.screenVideo),
    micLocked: !canSendAudio(p),
    quality: p.networkQualityState ?? 'unknown',
  };
}

/** Everyone Daily reports, you first, then in the order they joined. */
export function toPeers(participants: Record<string, ParticipantLike>): Peer[] {
  const peers = Object.values(participants).map(toPeer);
  return peers.sort((a, b) => {
    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
    return a.joinedAtMs - b.joinedAtMs || a.sessionId.localeCompare(b.sessionId);
  });
}

function trackSignature(t: PeerTrack): string {
  return `${t.state}:${t.track?.id ?? '-'}:${t.track?.enabled === false ? 'd' : 'e'}:${t.lockedByTeacher ? 'L' : ''}`;
}

/** What makes a peer look different on screen. Two peers with the same signature
 * can be told apart by nobody. */
export function peerSignature(p: Peer): string {
  return [
    p.sessionId,
    p.userId,
    p.name,
    p.role,
    p.isLocal ? 'self' : 'other',
    p.joinedAtMs,
    p.micLocked ? 'locked' : 'free',
    p.quality,
    trackSignature(p.audio),
    trackSignature(p.video),
    trackSignature(p.screenAudio),
    trackSignature(p.screenVideo),
  ].join('|');
}

/** `next`, but keeping the very objects (and the very array) of `previous`
 * wherever nothing changed — so React only redraws what did. */
export function reconcilePeers(previous: Peer[], next: Peer[]): Peer[] {
  const before = new Map(previous.map((p) => [p.sessionId, p]));
  let same = previous.length === next.length;
  const out = next.map((p, i) => {
    const old = before.get(p.sessionId);
    const kept = old && peerSignature(old) === peerSignature(p) ? old : p;
    if (same && previous[i] !== kept) same = false;
    return kept;
  });
  return same ? previous : out;
}

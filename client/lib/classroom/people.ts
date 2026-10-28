// FILE PATH: client/lib/classroom/people.ts
//
// Turning Daily's connections into the people on screen. A person on two devices
// is two connections (see daily/peers.ts) but one tile, one entry in the
// participant list, one seat in the count. Pure functions, so they can be tested
// without a call.

import type { ClassroomRole } from './types.ts';
import type { Peer } from './daily/peers.ts';
import type { NetworkState } from './daily/store.ts';

/** Everything one person is doing across all their connections. */
export interface Person {
  userId: string;
  /** Every connection of this person, the one with the longest history first. */
  peers: Peer[];
  /** The connection to show: one with the camera on, else the first. */
  shown: Peer;
  role: ClassroomRole;
  displayName: string;
  /** You — on this device or on another device of yours. */
  isSelf: boolean;
  micOn: boolean;
  cameraOn: boolean;
  sharingScreen: boolean;
  /** The teacher took away the right to unmute, on every device of theirs. */
  micLocked: boolean;
}

/** The people in the class (an observer is not one), in the order they first
 * appear in `peers`. */
export function groupPeople(peers: Peer[], localUserId: string | null): Person[] {
  const groups = new Map<string, Peer[]>();
  for (const peer of peers) {
    if (peer.isObserver) continue;
    const group = groups.get(peer.userId);
    if (group) group.push(peer);
    else groups.set(peer.userId, [peer]);
  }
  return [...groups].map(([userId, connections]) => {
    const shown = connections.find((c) => c.video.on) ?? connections[0];
    const isOwner = connections.some((c) => c.isOwner);
    return {
      userId,
      peers: connections,
      shown,
      role: isOwner ? 'TEACHER' : 'STUDENT',
      displayName: shown.displayName,
      isSelf: connections.some((c) => c.isLocal) || userId === localUserId,
      micOn: connections.some((c) => c.audio.on),
      cameraOn: connections.some((c) => c.video.on),
      sharingScreen: connections.some((c) => c.screenVideo.on),
      micLocked: connections.every((c) => c.micLocked),
    };
  });
}

export function countPeople(peers: Peer[]): number {
  return groupPeople(peers, null).length;
}

/** The screens being shared right now, one per connection that has the video
 * to show, in the order the sharers joined. */
export function activeScreenShares(peers: Peer[]): Peer[] {
  return peers
    .filter((p) => !p.isObserver && p.screenVideo.on && p.screenVideo.track)
    .sort((a, b) => a.joinedAtMs - b.joinedAtMs || a.sessionId.localeCompare(b.sessionId));
}

export interface StudentInRoom {
  userId: string;
  name: string;
}

/** The students currently in the room, one entry each — who the teacher can give
 * a badge to. */
export function listStudents(peers: Peer[]): StudentInRoom[] {
  return groupPeople(peers, null)
    .filter((p) => p.role === 'STUDENT')
    .map((p) => ({ userId: p.userId, name: p.displayName }));
}

export type ConnectionQuality = 'good' | 'unstable' | 'poor' | 'unknown';

/** How a person's connection is doing. For you it is what Daily measures on your
 * own connection; for everyone else, what it knows of theirs (which may be
 * nothing). */
export function connectionQuality(person: Person, localNetwork: NetworkState): ConnectionQuality {
  if (person.isSelf) {
    if (localNetwork === 'bad') return 'poor';
    if (localNetwork === 'low') return 'unstable';
    return localNetwork === 'good' ? 'good' : 'unknown';
  }
  const worst = person.peers.map((p) => p.quality);
  if (worst.includes('bad')) return 'poor';
  if (worst.includes('warning')) return 'unstable';
  return worst.includes('good') ? 'good' : 'unknown';
}

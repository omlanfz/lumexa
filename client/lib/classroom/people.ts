// FILE PATH: client/lib/classroom/people.ts
//
// Turning LiveKit's connections into the people on screen. A person on two
// devices is two connections but one tile, one entry in the participant list,
// one seat in the count. Pure functions, so they can be tested without a room.

import { personKey } from './identity.ts';
import { parseParticipantMeta } from './types.ts';

/** Anything with an identity — a LiveKit Participant. */
export interface HasIdentity {
  identity: string;
}

/** Connections grouped by person, people in the order they first appeared. */
export function groupByPerson<T extends HasIdentity>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = personKey(item.identity);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export function countPeople(items: HasIdentity[]): number {
  return groupByPerson(items).size;
}

/** A camera tile as LiveKit hands them out: one per connection, a placeholder
 * (no publication) when that connection has no camera. */
export interface TileLike {
  participant: HasIdentity;
  publication?: { isMuted: boolean } | undefined;
}

// Higher wins: live video, then a camera that is switched off, then none.
function tileRank(tile: TileLike): number {
  if (!tile.publication) return 0;
  return tile.publication.isMuted ? 1 : 2;
}

/** One tile per person. Someone with the camera on one device and only the
 * microphone on another shows the camera. */
export function pickPersonTiles<T extends TileLike>(tiles: T[]): T[] {
  const order: string[] = [];
  const best = new Map<string, T>();
  for (const tile of tiles) {
    const key = personKey(tile.participant.identity);
    const current = best.get(key);
    if (!current) {
      order.push(key);
      best.set(key, tile);
    } else if (tileRank(tile) > tileRank(current)) {
      best.set(key, tile);
    }
  }
  return order.map((key) => best.get(key)!);
}

export interface StudentInRoom {
  userId: string;
  name: string;
}

/** The students currently in the room, one entry each — who the teacher can
 * give a badge to. Told apart from the teacher by the "(Student)" suffix the
 * server puts on every name. */
export function listStudents(participants: { identity: string; name?: string }[]): StudentInRoom[] {
  const students: StudentInRoom[] = [];
  for (const [userId, connections] of groupByPerson(participants)) {
    const meta = parseParticipantMeta(connections[0].identity, connections[0].name ?? '');
    if (meta.role === 'STUDENT') students.push({ userId, name: meta.displayName });
  }
  return students;
}

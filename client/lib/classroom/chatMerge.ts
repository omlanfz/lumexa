// FILE PATH: client/lib/classroom/chatMerge.ts
//
// How the saved history and the live messages are put together on screen. Pure, so
// the rules can be tested on their own.
//
// Saved messages carry the SERVER's time and live ones the time they arrived on this
// device, and the two clocks can differ. So the two lists are never sorted together:
// saved history always goes BEFORE what is already on screen (it is older by
// construction), and live messages keep their order of arrival.

import { chatKey } from './daily/protocol.ts';
import type { ChatEntry } from './daily/protocol.ts';
import type { SavedChatMessage } from './api.ts';

/** The most messages kept on screen: a long class does not grow without bound. */
export const KEEP_MESSAGES = 2000;

export function entryFromSaved(m: SavedChatMessage): ChatEntry {
  return {
    key: chatKey(m.fromUserId, m.id),
    id: m.id,
    text: m.text,
    sentAt: m.sentAt,
    fromUserId: m.fromUserId,
    fromName: m.fromName,
    fromRole: m.fromRole,
    saved: true,
  };
}

/** `older` (oldest first) placed before `current`, leaving out any message that is
 * already on screen (a message sent during the class is both live and saved). */
export function prependOlder(current: ChatEntry[], older: ChatEntry[]): ChatEntry[] {
  const have = new Set(current.map((m) => m.key));
  const fresh = older.filter((m) => !have.has(m.key));
  return fresh.length === 0 ? current : [...fresh, ...current].slice(-KEEP_MESSAGES);
}

/** A message that has just happened, unless it is already on screen. */
export function appendLive(current: ChatEntry[], entry: ChatEntry): ChatEntry[] {
  return current.some((m) => m.key === entry.key) ? current : [...current, entry].slice(-KEEP_MESSAGES);
}

export function removeByKey(current: ChatEntry[], key: string): ChatEntry[] {
  return current.some((m) => m.key === key) ? current.filter((m) => m.key !== key) : current;
}

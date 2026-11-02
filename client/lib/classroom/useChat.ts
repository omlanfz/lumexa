// FILE PATH: client/lib/classroom/useChat.ts
//
// The class chat. Two things meet here:
//
//   LIVE   messages other people send (Daily app messages, delivered to whoever is
//          in the room right now) and the one this person sends. Everything that
//          arrives is attributed to the connection Daily says sent it, and a
//          student's message is dropped while the teacher has locked the chat (see
//          ./daily/protocol.ts).
//   SAVED  the conversation so far, kept by the server (R2) for as long as it is
//          the same teacher with the same student / the same batch. It is loaded
//          when the chat opens, older pages on request, and every message sent is
//          also sent to the server to be kept. Who may read what (a student who
//          left a batch, one who joined late, a new teacher) is decided by the
//          server — see server/src/classroom/chat.
//
// The teacher can delete one message or clear the chat: the server is asked first,
// and only when it has done it is everyone in the class told (so a failed delete is
// never shown as done). Someone who joins later simply gets the saved history.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCall, useCallStore, useLocalPeer, useCallSnapshot } from './daily/CallContext';
import {
  MAX_CHAT_CHARS,
  acceptChat,
  chatClearPayload,
  chatKey,
  chatPayload,
  chatRemovePayload,
  mayRemoveChat,
  normalizeChatText,
  parseAppPayload,
  senderOf,
} from './daily/protocol';
import type { ChatEntry } from './daily/protocol';
import { claimsToBeServer } from './serverEvents';
import { clearChat, deleteChatMessage, fetchChatHistory, saveChatMessage } from './api';
import { appendLive, entryFromSaved, prependOlder, removeByKey } from './chatMerge';

/** How many saved messages are fetched at a time. */
const PAGE_SIZE = 100;
/** How long before saving a message is tried a second time. */
const SAVE_RETRY_MS = 2_000;

function newMessageId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** True when a failed request is worth repeating (no answer, or the server was
 * briefly unable) rather than one the server refused. */
function isTransient(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === undefined || status >= 500;
}

export type HistoryStatus = 'loading' | 'ready' | 'error';

export function useChat(opts: {
  isTeacher: boolean;
  roomName: string;
  /** False where the chat is not saved (a free trial, the silent admin observer). */
  persist: boolean;
}) {
  const { isTeacher, roomName, persist } = opts;
  const call = useCall();
  const store = useCallStore();
  const local = useLocalPeer();
  const { classState } = useCallSnapshot();
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [status, setStatus] = useState<HistoryStatus>(persist ? 'loading' : 'ready');
  const [hasMore, setHasMore] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  // The handlers below are made once; they read these when a message arrives.
  const lockedRef = useRef(false);
  useEffect(() => {
    lockedRef.current = !!classState.chatLocked;
  });
  /** Server time of the oldest saved message on screen: where "earlier" starts. */
  const oldestSavedAt = useRef<number | null>(null);
  const loadingEarlierRef = useRef(false);

  // ── Saved history ────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    if (!persist) return;
    setStatus('loading');
    try {
      const page = await fetchChatHistory(roomName, { limit: PAGE_SIZE });
      const saved = page.messages.map(entryFromSaved);
      setMessages((prev) => prependOlder(prev, saved));
      oldestSavedAt.current = page.messages.length > 0 ? page.messages[0].sentAt : null;
      setHasMore(page.enabled && page.hasMore);
      setStatus('ready');
    } catch (err) {
      // 403: the server says this person has no saved chat here (a student who left
      // the batch). That is an answer, not a failure — nothing to retry.
      if ((err as { response?: { status?: number } })?.response?.status === 403) {
        setHasMore(false);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    }
  }, [persist, roomName]);

  useEffect(() => {
    // The saved chat is loaded as the chat appears.
    void loadHistory();
  }, [loadHistory]);

  const loadEarlier = useCallback(async () => {
    const before = oldestSavedAt.current;
    if (!persist || before === null || loadingEarlierRef.current) return;
    loadingEarlierRef.current = true;
    setLoadingEarlier(true);
    try {
      const page = await fetchChatHistory(roomName, { before, limit: PAGE_SIZE });
      setMessages((prev) => prependOlder(prev, page.messages.map(entryFromSaved)));
      const oldest = page.messages.length > 0 ? page.messages[0].sentAt : null;
      if (oldest !== null) oldestSavedAt.current = oldest;
      // No older message came back although the server says more exists (they all
      // share one instant): stop asking rather than ask the same thing forever.
      setHasMore(page.hasMore && oldest !== null && oldest < before);
    } catch {
      // The button stays; trying again is up to the person.
    } finally {
      loadingEarlierRef.current = false;
      setLoadingEarlier(false);
    }
  }, [persist, roomName]);

  // ── Live messages ────────────────────────────────────────────────────────

  const add = useCallback((entry: ChatEntry) => {
    setMessages((prev) => appendLive(prev, entry));
  }, []);

  useEffect(
    () =>
      store.onMessage(({ data, from }) => {
        if (!from || claimsToBeServer(data)) return;
        const payload = parseAppPayload(data);
        if (!payload) return;
        const sender = senderOf(from);

        if (payload.kind === 'chat') {
          const entry = acceptChat(payload, sender, { chatLocked: lockedRef.current }, Date.now());
          if (entry) add(entry);
        } else if (payload.kind === 'chat-remove') {
          // Only the teacher's word removes a message; anyone else's is ignored.
          if (mayRemoveChat(sender)) {
            setMessages((prev) => removeByKey(prev, chatKey(payload.userId, payload.id)));
          }
        } else if (payload.kind === 'chat-clear') {
          if (mayRemoveChat(sender)) {
            setMessages([]);
            setHasMore(false);
            oldestSavedAt.current = null;
          }
        }
      }),
    [store, add],
  );

  // ── Sending ──────────────────────────────────────────────────────────────

  const send = useCallback(
    (raw: string) => {
      const text = normalizeChatText(raw);
      if (!text || text.length > MAX_CHAT_CHARS || !local) return;
      if (lockedRef.current && !isTeacher) return;
      const id = newMessageId();
      try {
        call.sendAppMessage(chatPayload(id, text), '*');
      } catch {
        return; // not sent: not shown as sent either
      }
      // Daily does not hand a message back to its sender, so it is added here.
      add({
        key: chatKey(local.userId, id),
        id,
        text,
        sentAt: Date.now(),
        fromUserId: local.userId,
        fromName: local.name,
        fromRole: local.role,
      });
      // Keep it for later, in the background; the class has already seen it.
      if (persist) {
        void saveChatMessage(roomName, id, text).catch((err) => {
          if (!isTransient(err)) return;
          setTimeout(() => void saveChatMessage(roomName, id, text).catch(() => {}), SAVE_RETRY_MS);
        });
      }
    },
    [add, call, local, isTeacher, persist, roomName],
  );

  // ── Teacher: deleting ────────────────────────────────────────────────────

  /** Deletes one message for everyone. Resolves false when it could not be done
   * (nothing changes on screen then). */
  const removeMessage = useCallback(
    async (entry: ChatEntry): Promise<boolean> => {
      if (!isTeacher) return false;
      try {
        if (persist) await deleteChatMessage(roomName, entry.fromUserId, entry.id);
        call.sendAppMessage(chatRemovePayload(entry.fromUserId, entry.id), '*');
      } catch {
        return false;
      }
      setMessages((prev) => removeByKey(prev, entry.key));
      return true;
    },
    [call, isTeacher, persist, roomName],
  );

  /** Clears the whole chat for everyone. Resolves false when it could not be done. */
  const clearAll = useCallback(async (): Promise<boolean> => {
    if (!isTeacher) return false;
    try {
      if (persist) await clearChat(roomName);
      call.sendAppMessage(chatClearPayload(), '*');
    } catch {
      return false;
    }
    setMessages([]);
    setHasMore(false);
    oldestSavedAt.current = null;
    return true;
  }, [call, isTeacher, persist, roomName]);

  return {
    messages,
    send,
    removeMessage,
    clearAll,
    /** Whether the saved history has loaded (or could not be). */
    historyStatus: status,
    retryHistory: loadHistory,
    hasEarlier: hasMore,
    loadEarlier,
    loadingEarlier,
  };
}

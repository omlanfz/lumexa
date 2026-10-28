// FILE PATH: client/lib/classroom/useChat.ts
//
// The class chat: messages other people send (Daily app messages, which are not
// stored — someone who joins later sees only what is said after they arrive, as
// before) and the one this person sends. Everything that arrives is attributed to
// the connection Daily says sent it, and a student's message is dropped while the
// teacher has locked the chat (see ./daily/protocol.ts).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCall, useCallSnapshot, useCallStore, useLocalPeer } from './daily/CallContext';
import { MAX_CHAT_CHARS, acceptChat, chatPayload, parseAppPayload, senderOf } from './daily/protocol';
import type { ChatEntry } from './daily/protocol';
import { claimsToBeServer } from './serverEvents';

/** The most messages kept on screen: a long class does not grow without bound. */
const KEEP_MESSAGES = 300;

function newMessageId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function useChat(opts: { isTeacher: boolean }) {
  const call = useCall();
  const store = useCallStore();
  const local = useLocalPeer();
  const { classState } = useCallSnapshot();
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  // The handlers below are made once; they read these when a message arrives.
  const lockedRef = useRef(false);
  useEffect(() => {
    lockedRef.current = !!classState.chatLocked;
  });

  const add = useCallback((entry: ChatEntry) => {
    setMessages((prev) => (prev.some((m) => m.key === entry.key) ? prev : [...prev, entry].slice(-KEEP_MESSAGES)));
  }, []);

  useEffect(
    () =>
      store.onMessage(({ data, from }) => {
        if (!from || claimsToBeServer(data)) return;
        const payload = parseAppPayload(data);
        if (!payload || payload.kind !== 'chat') return;
        const entry = acceptChat(payload, senderOf(from), { chatLocked: lockedRef.current }, Date.now());
        if (entry) add(entry);
      }),
    [store, add],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || text.length > MAX_CHAT_CHARS || !local) return;
      if (lockedRef.current && !opts.isTeacher) return;
      const id = newMessageId();
      try {
        call.sendAppMessage(chatPayload(id, text), '*');
      } catch {
        return; // not sent: not shown as sent either
      }
      // Daily does not hand a message back to its sender, so it is added here.
      add({
        key: `${local.sessionId}:${id}`,
        text,
        sentAt: Date.now(),
        fromUserId: local.userId,
        fromName: local.name,
        fromRole: local.role,
      });
    },
    [add, call, local, opts.isTeacher],
  );

  return { messages, send };
}

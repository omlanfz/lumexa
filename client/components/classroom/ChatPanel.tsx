// FILE PATH: client/components/classroom/ChatPanel.tsx
//
// Classroom chat side panel — message hierarchy, timestamps, teacher
// announcements visually distinguished, scroll-to-latest, and a small
// reaction bar (broadcast to everyone, not attached to individual messages —
// keeps this classroom-focused rather than a full Discord-style chat).

'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Lock, Unlock, X, ThumbsUp, PartyPopper, Heart, Smile } from 'lucide-react';
import type { ReceivedChatMessage } from '@livekit/components-core';
import { parseParticipantMeta } from '@/lib/classroom/types';

interface ChatPanelProps {
  messages: ReceivedChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
  locked: boolean;
  isTeacher: boolean;
  onToggleLock: () => void;
  onReact: (emoji: string) => void;
  localIdentity: string;
}

const REACTIONS = ['👍', '🎉', '❤️', '🙂'];
const REACTION_ICONS: Record<string, typeof ThumbsUp> = {
  '👍': ThumbsUp,
  '🎉': PartyPopper,
  '❤️': Heart,
  '🙂': Smile,
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function ChatPanel({
  messages,
  onSend,
  onClose,
  locked,
  isTeacher,
  onToggleLock,
  onReact,
  localIdentity,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    if (atBottom) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, atBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  };

  const canType = !locked || isTeacher;

  const submit = () => {
    const text = draft.trim();
    if (!text || !canType) return;
    onSend(text);
    setDraft('');
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--cr-surface)]">
      <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--cr-border)] flex-shrink-0">
        <p className="text-sm font-semibold text-[var(--cr-text)]">Chat</p>
        <div className="flex items-center gap-1">
          {isTeacher && (
            <button
              onClick={onToggleLock}
              data-tooltip={locked ? 'Unlock chat' : 'Lock chat'}
              data-tooltip-pos="bottom"
              className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] transition-colors"
            >
              {locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto cr-scroll px-3.5 py-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-[var(--cr-text-faint)] mt-6">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((m) => {
            const isSelf = m.from?.identity === localIdentity;
            const meta = m.from
              ? parseParticipantMeta(m.from.identity, m.from.name || m.from.identity)
              : { displayName: 'Unknown', role: 'STUDENT' as const };
            const isTeacherMsg = meta.role === 'TEACHER';
            return (
              <div key={m.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1 px-0.5">
                  <span
                    className={`text-xs font-semibold ${
                      isTeacherMsg ? 'text-violet-300' : 'text-[var(--cr-text-muted)]'
                    }`}
                  >
                    {isSelf ? 'You' : meta.displayName}
                  </span>
                  {isTeacherMsg && (
                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                      Teacher
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--cr-text-faint)]">{formatTime(m.timestamp)}</span>
                </div>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm break-words ${
                    isSelf
                      ? 'bg-[var(--cr-accent)] text-black rounded-tr-sm'
                      : isTeacherMsg
                        ? 'bg-violet-500/12 border border-violet-500/25 text-[var(--cr-text)] rounded-tl-sm'
                        : 'bg-[var(--cr-surface-2)] text-[var(--cr-text)] rounded-tl-sm'
                  }`}
                >
                  {m.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {!atBottom && messages.length > 0 && (
        <button
          onClick={() => {
            setAtBottom(true);
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }}
          className="mx-auto mb-1.5 px-3 py-1 rounded-full bg-[var(--cr-surface-3)] text-[var(--cr-text-muted)] text-[11px] hover:text-[var(--cr-text)] transition-colors"
        >
          Jump to latest ↓
        </button>
      )}

      <div className="px-3 pt-2 flex items-center gap-1.5 border-t border-[var(--cr-border)] flex-shrink-0">
        {REACTIONS.map((emoji) => {
          const Icon = REACTION_ICONS[emoji];
          return (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              data-tooltip={`React ${emoji}`}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--cr-text-muted)] hover:text-[var(--cr-accent)] hover:bg-[var(--cr-surface-2)] transition-colors"
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>

      <div className="p-3 pt-2 flex-shrink-0">
        {locked && !isTeacher ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--cr-surface-2)] text-[var(--cr-text-faint)] text-xs">
            <Lock size={13} /> Chat is locked by the teacher.
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Message the class…"
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--cr-surface-2)] border border-[var(--cr-border)] text-sm text-[var(--cr-text)] placeholder:text-[var(--cr-text-faint)] focus:outline-none focus:border-[var(--cr-accent)]/50"
            />
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="w-9 h-9 flex-shrink-0 rounded-xl bg-[var(--cr-accent)] disabled:opacity-30 text-black flex items-center justify-center transition-opacity"
            >
              <Send size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

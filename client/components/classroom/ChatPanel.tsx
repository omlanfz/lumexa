// FILE PATH: client/components/classroom/ChatPanel.tsx
//
// Classroom chat side panel — message hierarchy, timestamps and day separators,
// teacher announcements visually distinguished, links that open in a new tab, a
// multi-line message box (Enter sends, Shift+Enter starts a new line), the saved
// history (always opens at the latest message; older ones load on request), the
// teacher's delete / "Clear all chats", and a small reaction bar (broadcast to
// everyone, not attached to individual messages — keeps this classroom-focused
// rather than a full Discord-style chat).

'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Send, Lock, Unlock, X, ThumbsUp, PartyPopper, Heart, Smile, Trash2, Eraser } from 'lucide-react';
import { displayNameOf } from '@/lib/classroom/types';
import { MAX_CHAT_CHARS } from '@/lib/classroom/daily/protocol';
import type { ChatEntry } from '@/lib/classroom/daily/protocol';
import { linkify } from '@/lib/classroom/linkify';

interface ChatPanelProps {
  messages: ChatEntry[];
  onSend: (text: string) => void;
  onClose: () => void;
  locked: boolean;
  isTeacher: boolean;
  onToggleLock: () => void;
  onReact: (emoji: string) => void;
  /** This person's user id, so their messages (from any of their devices) are "You". */
  localUserId: string;
  /** The saved history: still loading, loaded, or could not be loaded. */
  historyStatus: 'loading' | 'ready' | 'error';
  onRetryHistory: () => void;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  onLoadEarlier: () => void;
  /** Teacher only. Resolve false when it could not be done. */
  onRemoveMessage: (message: ChatEntry) => Promise<boolean>;
  onClearAll: () => Promise<boolean>;
}

const REACTIONS = ['👍', '🎉', '❤️', '🙂'];
const REACTION_ICONS: Record<string, typeof ThumbsUp> = {
  '👍': ThumbsUp,
  '🎉': PartyPopper,
  '❤️': Heart,
  '🙂': Smile,
};

/** The message box grows with what is typed, up to about five lines. */
const MAX_INPUT_HEIGHT_PX = 120;
/** "At the bottom" means within this many pixels of it. */
const BOTTOM_SLACK_PX = 60;

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(ts: number) {
  const now = Date.now();
  if (dayKey(ts) === dayKey(now)) return 'Today';
  if (dayKey(ts) === dayKey(now - 24 * 60 * 60 * 1000)) return 'Yesterday';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() === new Date(now).getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** A message's text: line breaks kept, and any link a real link that opens in a
 * new tab. Built from React elements (never HTML), and only http(s) links exist
 * (see linkify). */
function MessageText({ text, onAccent }: { text: string; onAccent: boolean }) {
  const parts = useMemo(() => linkify(text), [text]);
  return (
    <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <span key={i}>{part.text}</span>
        ) : (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className={
              onAccent
                ? 'font-medium underline underline-offset-2 decoration-black/50 hover:decoration-black'
                : 'text-[var(--cr-accent)] underline underline-offset-2 hover:brightness-125'
            }
          >
            {part.text}
          </a>
        ),
      )}
    </span>
  );
}

/** The teacher's delete button for one message: a trash icon on hover, then a
 * "Delete?" confirmation that goes away by itself. */
function DeleteMessageButton({ onDelete }: { onDelete: () => Promise<boolean> }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'busy' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const later = (next: 'idle', ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStep(next), ms);
  };

  if (step === 'idle') {
    return (
      <button
        type="button"
        aria-label="Delete message"
        data-tooltip="Delete message"
        onClick={() => {
          setStep('confirm');
          later('idle', 3000);
        }}
        className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[var(--cr-text-faint)] hover:text-red-400 hover:bg-[var(--cr-surface-2)] transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Trash2 size={13} />
      </button>
    );
  }
  if (step === 'failed') {
    return <span className="flex-shrink-0 text-[10px] text-red-400">Couldn’t delete</span>;
  }
  return (
    <button
      type="button"
      disabled={step === 'busy'}
      onClick={async () => {
        if (timer.current) clearTimeout(timer.current);
        setStep('busy');
        const ok = await onDelete();
        if (!ok) {
          setStep('failed');
          later('idle', 2500);
        }
      }}
      className="flex-shrink-0 px-1.5 h-6 rounded-md text-[10px] font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50 transition-colors"
    >
      {step === 'busy' ? 'Deleting…' : 'Delete?'}
    </button>
  );
}

export default function ChatPanel({
  messages,
  onSend,
  onClose,
  locked,
  isTeacher,
  onToggleLock,
  onReact,
  localUserId,
  historyStatus,
  onRetryHistory,
  hasEarlier,
  loadingEarlier,
  onLoadEarlier,
  onRemoveMessage,
  onClearAll,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const atBottomRef = useRef(true);
  const shownCount = useRef(0);
  /** Set while older messages are being added above, so the view stays where it was. */
  const keepPlace = useRef<{ height: number; top: number } | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearState, setClearState] = useState<'idle' | 'busy' | 'failed'>('idle');

  const setBottom = (value: boolean) => {
    atBottomRef.current = value;
    setAtBottom(value);
  };

  // Opening the chat always shows the latest message, whatever has piled up.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // New messages, the saved history arriving, a message being deleted: follow the
  // bottom if that is where the person is; if older messages were added above, stay
  // where they were reading.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const added = messages.length - shownCount.current;
    shownCount.current = messages.length;
    if (!el) return;
    if (keepPlace.current) {
      el.scrollTop = keepPlace.current.top + (el.scrollHeight - keepPlace.current.height);
      keepPlace.current = null;
      return;
    }
    if (atBottomRef.current) {
      // One new message slides in; a whole history appears at once, already at the end.
      el.scrollTo({ top: el.scrollHeight, behavior: added === 1 ? 'smooth' : 'auto' });
    }
  }, [messages]);

  // Loading older messages is over (it added some, which the effect above has
  // already used, or it failed): forget where the view was to be kept.
  useLayoutEffect(() => {
    if (!loadingEarlier) keepPlace.current = null;
  }, [loadingEarlier]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setBottom(el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_SLACK_PX);
  };

  const canType = !locked || isTeacher;

  // The box grows with the text (and shrinks back when it is sent).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX)}px`;
    el.style.overflowY = el.scrollHeight > MAX_INPUT_HEIGHT_PX ? 'auto' : 'hidden';
  }, [draft, canType]);

  const submit = () => {
    const text = draft.trim();
    if (!text || !canType) return;
    onSend(text);
    setDraft('');
    setBottom(true);
    inputRef.current?.focus();
  };

  const loadEarlier = () => {
    const el = scrollRef.current;
    if (el) keepPlace.current = { height: el.scrollHeight, top: el.scrollTop };
    onLoadEarlier();
  };

  const clearAll = async () => {
    setClearState('busy');
    const ok = await onClearAll();
    if (ok) {
      setConfirmingClear(false);
      setClearState('idle');
    } else {
      setClearState('failed');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--cr-surface)]">
      <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--cr-border)] flex-shrink-0">
        <p className="text-sm font-semibold text-[var(--cr-text)]">Chat</p>
        <div className="flex items-center gap-1">
          {isTeacher && (
            <button
              onClick={() => {
                setClearState('idle');
                setConfirmingClear((v) => !v);
              }}
              disabled={messages.length === 0}
              aria-label="Clear all chats"
              data-tooltip="Clear all chats"
              data-tooltip-pos="bottom"
              className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Eraser size={14} />
            </button>
          )}
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

      {isTeacher && confirmingClear && messages.length > 0 && (
        <div className="px-3.5 py-2.5 border-b border-[var(--cr-border)] bg-red-500/8 flex-shrink-0">
          <p className="text-xs text-[var(--cr-text)]">
            Delete <strong>all</strong> messages for everyone? This can’t be undone.
          </p>
          {clearState === 'failed' && (
            <p className="mt-1 text-[11px] text-red-400">Couldn’t clear the chat. Please try again.</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={clearAll}
              disabled={clearState === 'busy'}
              className="px-2.5 py-1 rounded-md bg-red-500/80 hover:bg-red-500 disabled:opacity-60 text-white text-[11px] font-semibold transition-colors"
            >
              {clearState === 'busy' ? 'Clearing…' : 'Clear all chats'}
            </button>
            <button
              onClick={() => setConfirmingClear(false)}
              disabled={clearState === 'busy'}
              className="px-2.5 py-1 rounded-md text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] text-[11px] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto cr-scroll px-3.5 py-3 space-y-3">
        {hasEarlier && (
          <button
            onClick={loadEarlier}
            disabled={loadingEarlier}
            className="block mx-auto px-3 py-1 rounded-full bg-[var(--cr-surface-2)] text-[var(--cr-text-muted)] text-[11px] hover:text-[var(--cr-text)] disabled:opacity-60 transition-colors"
          >
            {loadingEarlier ? 'Loading…' : 'Load earlier messages'}
          </button>
        )}
        {historyStatus === 'error' && (
          <p className="text-center text-[11px] text-[var(--cr-text-faint)]">
            Couldn’t load earlier messages.{' '}
            <button onClick={onRetryHistory} className="underline hover:text-[var(--cr-text)]">
              Try again
            </button>
          </p>
        )}
        {messages.length === 0 ? (
          historyStatus === 'loading' ? (
            <p className="text-center text-xs text-[var(--cr-text-faint)] mt-6">Loading chat…</p>
          ) : (
            <p className="text-center text-xs text-[var(--cr-text-faint)] mt-6">No messages yet. Say hello!</p>
          )
        ) : (
          messages.map((m, i) => {
            // "You" includes your other devices.
            const isSelf = m.fromUserId === localUserId;
            const isTeacherMsg = m.fromRole === 'TEACHER';
            const newDay = i === 0 || dayKey(messages[i - 1].sentAt) !== dayKey(m.sentAt);
            return (
              <div key={m.key} className="space-y-3">
                {newDay && (
                  <div className="flex items-center gap-2 text-[10px] text-[var(--cr-text-faint)]">
                    <span className="flex-1 h-px bg-[var(--cr-border)]" />
                    {dayLabel(m.sentAt)}
                    <span className="flex-1 h-px bg-[var(--cr-border)]" />
                  </div>
                )}
                <div className={`group flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1 px-0.5">
                    <span
                      className={`text-xs font-semibold ${
                        isTeacherMsg ? 'text-violet-300' : 'text-[var(--cr-text-muted)]'
                      }`}
                    >
                      {isSelf ? 'You' : displayNameOf(m.fromName)}
                    </span>
                    {isTeacherMsg && (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                        Teacher
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--cr-text-faint)]">{formatTime(m.sentAt)}</span>
                  </div>
                  <div className={`flex items-center gap-1 w-full ${isSelf ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`min-w-0 max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                        isSelf
                          ? 'bg-[var(--cr-accent)] text-black rounded-tr-sm'
                          : isTeacherMsg
                            ? 'bg-violet-500/12 border border-violet-500/25 text-[var(--cr-text)] rounded-tl-sm'
                            : 'bg-[var(--cr-surface-2)] text-[var(--cr-text)] rounded-tl-sm'
                      }`}
                    >
                      <MessageText text={m.text} onAccent={isSelf} />
                    </div>
                    {isTeacher && <DeleteMessageButton onDelete={() => onRemoveMessage(m)} />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!atBottom && messages.length > 0 && (
        <button
          onClick={() => {
            setBottom(true);
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
          <>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends; Shift+Enter is left alone, so it starts a new line.
                  // (Not while an input method — Bangla, Japanese… — is composing.)
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Message the class…"
                maxLength={MAX_CHAT_CHARS}
                className="flex-1 min-w-0 resize-none px-3 py-2 rounded-xl bg-[var(--cr-surface-2)] border border-[var(--cr-border)] text-sm leading-5 text-[var(--cr-text)] placeholder:text-[var(--cr-text-faint)] focus:outline-none focus:border-[var(--cr-accent)]/50 cr-scroll"
              />
              <button
                onClick={submit}
                disabled={!draft.trim()}
                aria-label="Send message"
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-[var(--cr-accent)] disabled:opacity-30 text-black flex items-center justify-center transition-opacity"
              >
                <Send size={15} />
              </button>
            </div>
            <p className="mt-1 px-1 text-[10px] leading-none text-[var(--cr-text-faint)] select-none">
              Shift + Enter for a new line
            </p>
          </>
        )}
      </div>
    </div>
  );
}

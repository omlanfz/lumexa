// FILE PATH: client/components/classroom/AwardBadgePanel.tsx
//
// The teacher's "Award Badge" popover — opened from the control bar, never
// shown permanently. A grid of the 16 classroom badges, each with a tooltip
// (and, on a phone where there is no hover, its criteria printed on the tile).
//
//   1:1 class   one tap on a badge awards it to the student — fast. The
//               confirmation and its Undo appear in a small toast afterwards.
//   batch       pick a badge, tick the students (or "Select all"), then press
//               "Award Badge". Only the ticked students receive it.
//
// Safe against double taps and flaky networks: while a request is in flight
// nothing else can be sent, and a retry of the same action reuses its request
// id so the server can never award twice (see lib/classroom/badgeAward.ts).
// No points, no levels — a badge is recognition.

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Check, Loader2, X } from 'lucide-react';
import {
  awardSignature,
  requestFor,
  type AwardResponse,
  type ClassroomBadge,
  type PendingRequest,
} from '@/lib/classroom/badgeAward';
import { awardBadges, fetchBadgeCatalog } from '@/lib/classroom/badgesApi';
import type { StudentInRoom } from '@/lib/classroom/people';

function messageOf(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const m = e.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) ?? fallback;
}

export default function AwardBadgePanel({
  roomName,
  isBatch,
  students,
  onClose,
  onAwarded,
}: {
  roomName: string;
  isBatch: boolean;
  /** The students in the classroom right now. */
  students: StudentInRoom[];
  onClose: () => void;
  onAwarded: (result: AwardResponse) => void;
}) {
  const [badges, setBadges] = useState<ClassroomBadge[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const pending = useRef<PendingRequest | null>(null);

  useEffect(() => {
    let alive = true;
    setLoadFailed(false);
    fetchBadgeCatalog()
      .then((list) => alive && setBadges(list))
      .catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // A student who leaves the class can no longer be ticked.
  const presentIds = useMemo(() => new Set(students.map((s) => s.userId)), [students]);
  useEffect(() => {
    setPicked((prev) => {
      const next = new Set([...prev].filter((id) => presentIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [presentIds]);

  // In a 1:1 class there is only one person it can go to, so a tap is enough.
  const quick = !isBatch && students.length === 1;

  const submit = async (badgeId: string, studentUserIds: string[]) => {
    if (inFlight.current || studentUserIds.length === 0) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    // The same action again (a retry, a double tap) keeps its request id.
    pending.current = requestFor(pending.current, awardSignature(badgeId, studentUserIds));
    try {
      const result = await awardBadges(roomName, {
        badgeId,
        studentUserIds,
        requestId: pending.current.requestId,
      });
      pending.current = null;
      onAwarded(result);
      onClose();
    } catch (err) {
      setError(messageOf(err, 'Could not award the badge. Please try again.'));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const onPickBadge = (badge: ClassroomBadge) => {
    if (submitting) return;
    setChosen(badge.id);
    setError(null);
    if (quick) void submit(badge.id, [students[0].userId]);
  };

  const toggleStudent = (userId: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  const allPicked = students.length > 0 && students.every((s) => picked.has(s.userId));
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(students.map((s) => s.userId)));

  const shown = badges?.find((b) => b.id === (focused ?? chosen)) ?? null;
  const noStudent = students.length === 0;
  const ready = !!chosen && picked.size > 0 && !submitting;

  return (
    <div
      className="flex max-h-[min(34rem,calc(100vh-7rem))] w-full flex-col overflow-hidden rounded-xl border border-[var(--cr-border)] bg-[var(--cr-surface)] shadow-2xl cr-fade-in"
      role="dialog"
      aria-label="Award a badge"
      data-testid="award-badge-panel"
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--cr-border)] px-3.5 py-2.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--cr-text)]">
          <Award size={15} className="text-[var(--cr-accent)]" />
          Award a badge
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--cr-text-muted)] transition-colors hover:bg-[var(--cr-surface-2)] hover:text-[var(--cr-text)]"
        >
          <X size={14} />
        </button>
      </div>

      <div className="cr-scroll flex-1 overflow-y-auto px-3 py-3">
        {noStudent ? (
          <p className="py-6 text-center text-sm text-[var(--cr-text-muted)]">
            No student is in the class yet. Badges can be awarded once they join.
          </p>
        ) : !badges ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--cr-text-muted)]">
            {loadFailed ? (
              <span role="alert">
                Couldn&apos;t load the badges.{' '}
                <button
                  type="button"
                  className="font-medium text-[var(--cr-accent)] underline"
                  onClick={() => {
                    setLoadFailed(false);
                    fetchBadgeCatalog()
                      .then(setBadges)
                      .catch(() => setLoadFailed(true));
                  }}
                >
                  Try again
                </button>
              </span>
            ) : (
              <>
                <Loader2 size={14} className="animate-spin" /> Loading badges…
              </>
            )}
          </div>
        ) : (
          <>
            <div
              role="radiogroup"
              aria-label="Badges"
              className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
              onMouseLeave={() => setFocused(null)}
            >
              {badges.map((b) => {
                const selected = chosen === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${b.name}: ${b.criteria}`}
                    title={b.criteria}
                    data-testid={`badge-${b.id}`}
                    disabled={submitting}
                    onClick={() => onPickBadge(b)}
                    onMouseEnter={() => setFocused(b.id)}
                    onFocus={() => setFocused(b.id)}
                    onBlur={() => setFocused(null)}
                    className={`flex flex-col items-center gap-0.5 rounded-lg border px-1.5 py-2 text-center transition-colors disabled:opacity-60 ${
                      selected
                        ? 'border-[var(--cr-accent)] bg-[var(--cr-accent)]/15'
                        : 'border-[var(--cr-border)] bg-[var(--cr-surface-2)] hover:border-[var(--cr-border-strong)] hover:bg-[var(--cr-surface-3)]'
                    }`}
                  >
                    <span className="text-2xl leading-none" aria-hidden>
                      {b.emoji}
                    </span>
                    <span className="text-[11px] font-semibold leading-tight text-[var(--cr-text)]">{b.name}</span>
                    {/* No hover on a phone: print what the badge is for. */}
                    <span className="text-[10px] leading-tight text-[var(--cr-text-muted)] sm:hidden">
                      {b.criteria}
                    </span>
                  </button>
                );
              })}
            </div>

            <p
              className="mt-2 hidden min-h-[1.25rem] text-center text-xs text-[var(--cr-text-muted)] sm:block"
              aria-live="polite"
            >
              {shown ? (
                <>
                  <span className="font-medium text-[var(--cr-text)]">
                    {shown.emoji} {shown.name}
                  </span>{' '}
                  — {shown.criteria}
                </>
              ) : quick ? (
                `Tap a badge to give it to ${students[0].name.split(' ')[0]}.`
              ) : (
                'Choose a badge.'
              )}
            </p>

            {!quick && (
              <div className="mt-3 border-t border-[var(--cr-border)] pt-3" data-testid="award-recipients">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[var(--cr-text)]">
                    Who gets it?{' '}
                    <span className="font-normal text-[var(--cr-text-muted)]">
                      {picked.size} of {students.length}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={toggleAll}
                    disabled={submitting}
                    data-testid="select-all"
                    className="rounded-md px-2 py-1 text-xs font-medium text-[var(--cr-accent)] hover:bg-[var(--cr-surface-2)] disabled:opacity-60"
                  >
                    {allPicked ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <ul className="flex flex-col gap-1">
                  {students.map((s) => {
                    const on = picked.has(s.userId);
                    return (
                      <li key={s.userId}>
                        <label
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm transition-colors ${
                            on
                              ? 'border-[var(--cr-accent)]/60 bg-[var(--cr-accent)]/10'
                              : 'border-[var(--cr-border)] hover:bg-[var(--cr-surface-2)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={submitting}
                            onChange={() => toggleStudent(s.userId)}
                            data-testid={`recipient-${s.name}`}
                            className="h-4 w-4 accent-[var(--cr-accent)]"
                          />
                          <span className="min-w-0 flex-1 truncate text-[var(--cr-text)]">{s.name}</span>
                          {on && <Check size={14} className="text-[var(--cr-accent)]" />}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}

        {error && (
          <p
            className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
            role="alert"
            data-testid="award-error"
          >
            {error}
          </p>
        )}
      </div>

      {badges && !quick && !noStudent && (
        <div className="flex-shrink-0 border-t border-[var(--cr-border)] p-3">
          <button
            type="button"
            disabled={!ready}
            onClick={() => chosen && void submit(chosen, [...picked])}
            data-testid="award-confirm"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--cr-accent)] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />}
            {submitting ? 'Awarding…' : 'Award Badge'}
          </button>
          {!ready && !submitting && (
            <p className="mt-1.5 text-center text-[11px] text-[var(--cr-text-faint)]">
              {!chosen ? 'Choose a badge, then who gets it.' : 'Tick at least one student.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

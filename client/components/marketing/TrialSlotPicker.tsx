// FILE PATH: client/components/marketing/TrialSlotPicker.tsx
//
// The parent-facing trial scheduler: pick a date on a month calendar, then
// pick one of that day's real, open start times.
//
// Everything shown comes from GET /trial/availability, which the server
// computes from the admin's availability settings minus existing bookings, so
// the picker never offers a time that is not actually bookable. To avoid
// showing stale availability it never caches: it refetches on every month
// change, when the tab becomes visible again, every few minutes, and whenever
// the parent page bumps `refreshKey` (e.g. after "that time was just taken").
// The server still re-validates the chosen slot when the form is submitted.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  AvailabilityDay,
  AvailabilityResponse,
  TRIAL_DURATION_MINUTES,
  TRIAL_TIMEZONE_LABEL,
  apiErrorMessage,
  formatDhakaTime,
  formatViewerRange,
  longDayLabel,
  monthBounds,
  monthLabel,
  shiftMonth,
  todayDhakaDateStr,
  weekdayOf,
} from "@/lib/trial";

interface Props {
  /** Selected slot start (ISO, UTC) or null. */
  value: string | null;
  onChange: (iso: string | null) => void;
  /** Increment to force a refetch. */
  refreshKey?: number;
  /** Called when a previously chosen time turned out to be gone. */
  onSlotLost?: () => void;
  invalid?: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REFRESH_MS = 3 * 60_000;

function dhakaDateOf(iso: string): string {
  return new Date(new Date(iso).getTime() + 6 * 3_600_000).toISOString().slice(0, 10);
}

export default function TrialSlotPicker({ value, onChange, refreshKey = 0, onSlotLost, invalid }: Props) {
  const today = todayDhakaDateStr();
  const [month, setMonth] = useState(() => (value ? dhakaDateOf(value).slice(0, 7) : today.slice(0, 7)));
  const [selectedDate, setSelectedDate] = useState<string | null>(value ? dhakaDateOf(value) : null);
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lostNotice, setLostNotice] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoAdvanced = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  // Latest callbacks, so an unstable prop never re-triggers the fetch effect.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSlotLostRef = useRef(onSlotLost);
  onSlotLostRef.current = onSlotLost;

  const load = useCallback(
    async (opts?: { quiet?: boolean }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!opts?.quiet) setLoading(true);
      setError(null);
      try {
        const { first, last } = monthBounds(month);
        const res = await axios.get<AvailabilityResponse>(`${process.env.NEXT_PUBLIC_API_URL}/trial/availability`, {
          // `_` defeats any intermediary cache; a custom header would trigger a CORS preflight.
          params: { from: first, to: last, _: Date.now() },
          signal: controller.signal,
        });
        setData(res.data);

        // If the time the parent had chosen is gone, say so and clear it.
        const chosen = valueRef.current;
        if (chosen) {
          const day = res.data.days.find((d) => d.date === dhakaDateOf(chosen));
          if (day && !day.slots.includes(chosen)) {
            onChangeRef.current(null);
            setLostNotice(true);
            onSlotLostRef.current?.();
          }
        }
      } catch (err) {
        if (axios.isCancel(err)) return;
        setError(apiErrorMessage(err, "We couldn't load the available times. Please check your connection and try again."));
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [month],
  );

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load, refreshKey]);

  // Keep the picture fresh while the page stays open.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load({ quiet: true });
    };
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(timer);
    };
  }, [load]);

  const days = useMemo(() => {
    const map = new Map<string, AvailabilityDay>();
    data?.days.forEach((d) => map.set(d.date, d));
    return map;
  }, [data]);

  const minMonth = today.slice(0, 7);
  const maxMonth = data?.maxDate ? data.maxDate.slice(0, 7) : null;
  const canGoPrev = month > minMonth;
  const canGoNext = maxMonth ? month < maxMonth : true;
  const anyOpenDay = data?.days.some((d) => d.status === "available") ?? false;

  // First visit and nothing open this month → jump to next month once, so a
  // parent isn't greeted by an empty calendar when next month has times.
  useEffect(() => {
    if (!data || loading || autoAdvanced.current || value) return;
    autoAdvanced.current = true;
    if (!anyOpenDay && canGoNext) setMonth((m) => shiftMonth(m, 1));
  }, [data, loading, anyOpenDay, canGoNext, value]);

  const { first } = monthBounds(month);
  const lead = weekdayOf(first);
  const dayCount = Number(monthBounds(month).last.slice(8, 10));
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: dayCount }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  const selectedDay = selectedDate ? days.get(selectedDate) : undefined;
  const viewerRange =
    value && formatViewerRange(value, new Date(new Date(value).getTime() + TRIAL_DURATION_MINUTES * 60_000).toISOString());

  return (
    <div
      className={`rounded-xl border bg-white dark:bg-black/40 p-3 sm:p-4 ${
        invalid ? "border-red-400 dark:border-red-500/70" : "border-[#E2E8F0] dark:border-gray-700"
      }`}
    >
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => canGoPrev && setMonth(shiftMonth(month, -1))}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className="w-9 h-9 rounded-lg border border-[#E2E8F0] dark:border-gray-700 text-[#64748B] dark:text-gray-300 disabled:opacity-30 hover:bg-[#F1F5F9] dark:hover:bg-gray-800 transition-colors"
        >
          ‹
        </button>
        <div className="text-sm font-bold text-[#0F172A] dark:text-white" aria-live="polite">
          {monthLabel(month)}
        </div>
        <button
          type="button"
          onClick={() => canGoNext && setMonth(shiftMonth(month, 1))}
          disabled={!canGoNext}
          aria-label="Next month"
          className="w-9 h-9 rounded-lg border border-[#E2E8F0] dark:border-gray-700 text-[#64748B] dark:text-gray-300 disabled:opacity-30 hover:bg-[#F1F5F9] dark:hover:bg-gray-800 transition-colors"
        >
          ›
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] dark:text-gray-500">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className={`grid grid-cols-7 gap-1 ${loading ? "animate-pulse" : ""}`} aria-busy={loading}>
            {cells.map((date, i) => {
              if (!date) return <div key={`b${i}`} />;
              const day = days.get(date);
              const status = loading || !day ? "loading" : day.status;
              const isSelected = selectedDate === date;
              const open = status === "available";
              const label = open
                ? `${longDayLabel(date)}, ${day!.slots.length} time${day!.slots.length === 1 ? "" : "s"} available`
                : status === "full"
                  ? `${longDayLabel(date)}, fully booked`
                  : `${longDayLabel(date)}, not available`;
              return (
                <button
                  key={date}
                  type="button"
                  disabled={!open}
                  aria-label={label}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedDate(date);
                    setLostNotice(false);
                  }}
                  className={`relative h-11 rounded-lg text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-purple-600 text-white shadow"
                      : open
                        ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                        : status === "full"
                          ? "bg-[#F1F5F9] dark:bg-gray-800/60 text-[#94A3B8] dark:text-gray-600 line-through"
                          : "text-[#CBD5E1] dark:text-gray-700"
                  } ${date === today && !isSelected ? "ring-1 ring-purple-300 dark:ring-purple-700" : ""}`}
                >
                  {Number(date.slice(8, 10))}
                  {open && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#94A3B8] dark:text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Times available
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="line-through">12</span> Fully booked
            </span>
          </p>

          {!loading && data && !anyOpenDay && (
            <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 p-3 text-xs text-amber-800 dark:text-amber-300">
              No trial times are open in {monthLabel(month)}.{" "}
              {canGoNext ? (
                <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className="font-semibold underline underline-offset-2">
                  Check next month
                </button>
              ) : (
                <>Please check back soon, or message us on WhatsApp and we&apos;ll find a time for you.</>
              )}
            </div>
          )}
        </>
      )}

      {/* Times for the chosen day */}
      {!error && selectedDate && (
        <div className="mt-4 border-t border-[#E2E8F0] dark:border-gray-800 pt-4">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">{longDayLabel(selectedDate)}</h3>
            <span className="text-[11px] text-[#94A3B8] dark:text-gray-500">{TRIAL_DURATION_MINUTES}-minute session</span>
          </div>
          {loading ? (
            <p className="text-xs text-[#94A3B8]">Loading times…</p>
          ) : selectedDay && selectedDay.slots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="group" aria-label={`Start times on ${longDayLabel(selectedDate)}`}>
              {selectedDay.slots.map((iso) => {
                const active = value === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      onChange(iso);
                      setLostNotice(false);
                    }}
                    className={`py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                      active
                        ? "bg-purple-600 border-purple-600 text-white shadow"
                        : "border-[#E2E8F0] dark:border-gray-700 text-[#0F172A] dark:text-white hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    }`}
                  >
                    {formatDhakaTime(iso)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#64748B] dark:text-gray-400">
              {selectedDay?.status === "full"
                ? "All times on this day are booked. Please pick another day."
                : "No times are open on this day. Please pick another day."}
            </p>
          )}
          <p className="mt-2 text-[11px] text-[#94A3B8] dark:text-gray-500">
            Times are in <strong>{TRIAL_TIMEZONE_LABEL}</strong>.
          </p>
        </div>
      )}

      {!error && !selectedDate && !loading && anyOpenDay && (
        <p className="mt-4 text-xs text-[#64748B] dark:text-gray-400">Tap a highlighted day to see its start times.</p>
      )}

      {lostNotice && (
        <p role="alert" className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
          That time is no longer available. Please pick another one.
        </p>
      )}

      {value && viewerRange && (
        <p className="mt-2 text-[11px] text-[#64748B] dark:text-gray-400">
          In your time zone ({viewerRange.zone}): {viewerRange.text}
        </p>
      )}
    </div>
  );
}

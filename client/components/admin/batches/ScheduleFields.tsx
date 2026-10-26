// FILE PATH: client/components/admin/batches/ScheduleFields.tsx
//
// A first class date and weekly time slots (Asia/Dhaka) — the same fields the
// student's own 1-to-1 schedule uses, shared by the 1-to-1 form, creating a
// batch, rescheduling one and creating a batch for a student.

"use client";

import { WEEKDAY_NAMES, todayDhakaDateStr } from "@/components/admin/AdminUI";

export interface ScheduleSlotDraft {
  weekday: number;
  time: string; // "HH:mm", Asia/Dhaka
}

export interface ScheduleDraft {
  firstClassDate: string;
  slots: ScheduleSlotDraft[];
}

export const EMPTY_SCHEDULE: ScheduleDraft = {
  firstClassDate: "",
  slots: [{ weekday: 1, time: "17:00" }],
};

/** The weekday (0 = Sunday) of a 'YYYY-MM-DD' calendar date. */
export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** The first problem with a schedule, in the words the admin should read — or
 * null. The server checks the same rules (and the teacher's calendar). */
export function scheduleProblem(s: ScheduleDraft): string | null {
  if (!s.firstClassDate) return "Select the first class date.";
  if (s.firstClassDate < todayDhakaDateStr()) return "The first class date can't be in the past.";
  if (s.slots.length === 0) return "Add at least one weekly time slot.";
  if (!s.slots.some((slot) => slot.weekday === weekdayOf(s.firstClassDate))) {
    return `The first class date must fall on one of the selected weekdays. ${s.firstClassDate} is a ${WEEKDAY_NAMES[weekdayOf(s.firstClassDate)]}.`;
  }
  return null;
}

const FIELD =
  "px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus";

export default function ScheduleFields({
  value,
  onChange,
  dateHint,
}: {
  value: ScheduleDraft;
  onChange: (next: ScheduleDraft) => void;
  dateHint?: string;
}) {
  const { firstClassDate, slots } = value;
  const set = (patch: Partial<ScheduleDraft>) => onChange({ ...value, ...patch });
  const updateSlot = (i: number, patch: Partial<ScheduleSlotDraft>) =>
    set({ slots: slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

  const firstWeekday = firstClassDate ? weekdayOf(firstClassDate) : null;
  const mismatch =
    !!firstClassDate && slots.length > 0 && !slots.some((s) => s.weekday === firstWeekday);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-2">
          First Class Date <span className="normal-case font-normal">(Asia/Dhaka)</span>
        </p>
        <input
          type="date"
          value={firstClassDate}
          min={todayDhakaDateStr()}
          onChange={(e) => set({ firstClassDate: e.target.value })}
          className={FIELD}
        />
        {dateHint && <p className="text-xs text-[var(--a-text-faint)] mt-1.5">{dateHint}</p>}
        {firstClassDate && firstClassDate < todayDhakaDateStr() && (
          <p className="text-xs text-[var(--a-danger)] mt-1.5">The first class date can&rsquo;t be in the past.</p>
        )}
        {mismatch && (
          <p className="text-xs text-[var(--a-danger)] mt-1.5">
            This date is a {WEEKDAY_NAMES[firstWeekday!]} — pick a date on one of the weekdays below, or add that
            weekday to the schedule.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
            Weekly Time Slots <span className="normal-case font-normal">(Asia/Dhaka)</span>
          </p>
          <button
            type="button"
            onClick={() => set({ slots: [...slots, { weekday: 1, time: "17:00" }] })}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
          >
            + Add slot
          </button>
        </div>
        <div className="space-y-2">
          {slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              <select
                value={slot.weekday}
                onChange={(e) => updateSlot(i, { weekday: Number(e.target.value) })}
                className={FIELD}
                aria-label="Weekday"
              >
                {WEEKDAY_NAMES.map((d, idx) => (
                  <option key={idx} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={slot.time}
                onChange={(e) => updateSlot(i, { time: e.target.value })}
                className={FIELD}
                aria-label="Time"
              />
              <button
                type="button"
                onClick={() => set({ slots: slots.filter((_, idx) => idx !== i) })}
                className="px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--a-danger)] hover:bg-[var(--a-nav-hover)]"
              >
                Remove
              </button>
            </div>
          ))}
          {slots.length === 0 && (
            <p className="text-sm text-[var(--a-text-muted)]">No slots yet — add at least one.</p>
          )}
        </div>
      </div>
    </div>
  );
}

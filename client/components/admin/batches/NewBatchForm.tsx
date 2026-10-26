// FILE PATH: client/components/admin/batches/NewBatchForm.tsx
//
// "Create a new batch" from a student's Schedule tab: the student's own teacher
// and curriculum become the batch's, and it starts at the student's next lesson,
// so the admin only supplies a name, a size and when it meets.

"use client";

import { useState } from "react";
import ScheduleFields, { EMPTY_SCHEDULE, scheduleProblem, type ScheduleDraft } from "./ScheduleFields";
import type { NewBatchPayload } from "./useEnrollFlow";

const FIELD =
  "w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus";

export default function NewBatchForm({
  defaultName,
  teacherName,
  courseTitle,
  nextLesson,
  busy,
  onSubmit,
  onCancel,
}: {
  defaultName?: string;
  teacherName: string | null;
  courseTitle: string | null;
  nextLesson?: number | null;
  busy?: boolean;
  onSubmit: (payload: NewBatchPayload) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(defaultName ?? "");
  const [maxStudents, setMaxStudents] = useState(4);
  const [schedule, setSchedule] = useState<ScheduleDraft>(EMPTY_SCHEDULE);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (name.trim().length < 2) {
      setError("Give the batch a name (at least 2 characters).");
      return;
    }
    const problem = scheduleProblem(schedule);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onSubmit({
      name: name.trim(),
      maxStudents,
      firstClassDate: schedule.firstClassDate,
      slots: schedule.slots,
    });
  };

  return (
    <div className="space-y-4 p-4 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface-2)]">
      <p className="text-sm text-[var(--a-text-muted)]">
        A new batch with {teacherName ?? "the student's teacher"} on {courseTitle ?? "the student's curriculum"}
        {nextLesson ? `, starting at lesson ${nextLesson}` : ""}. More students can be added to it afterwards.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
            Batch name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. AI Builders — Evening"
            className={FIELD}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
            Students (max)
          </label>
          <select value={maxStudents} onChange={(e) => setMaxStudents(Number(e.target.value))} className={FIELD}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                {n}
                {n === 4 ? " (ideal)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ScheduleFields value={schedule} onChange={setSchedule} />
      {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create batch and place student"}
        </button>
      </div>
    </div>
  );
}

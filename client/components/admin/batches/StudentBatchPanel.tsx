// FILE PATH: client/components/admin/batches/StudentBatchPanel.tsx
//
// The "Batch" half of a student's Schedule tab. A batch student has no weekly
// slots of their own — they follow their batch's — so instead of a schedule
// form this shows the batch they are in (with Move / Remove), or lets the admin
// pick a compatible batch or create a new one. Every placement goes through
// useEnrollFlow, so what it changes is confirmed explicitly.

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import { Card, Modal, formatDhakaDate, formatDhakaTime } from "@/components/admin/AdminUI";
import { parseApiError, type BatchOption } from "@/lib/batches";
import BatchOptionsList from "./BatchOptionsList";
import { BatchStatusBadge, Notice } from "./BatchUI";
import NewBatchForm from "./NewBatchForm";
import { useEnrollFlow } from "./useEnrollFlow";

export interface StudentBatchInfo {
  id: string;
  name: string;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  teacherName: string;
  memberCount: number;
  maxStudents: number;
  joinedAt: string;
  joinedAtLesson: number | null;
  alignment: string | null;
  nextSession: { id: string; start: string; end: string; lessonNumber: number } | null;
}

export default function StudentBatchPanel({
  studentUserId,
  studentName,
  batch,
  teacherName,
  courseTitle,
  hasOneToOneClasses,
  notice,
  onNotice,
  onChanged,
}: {
  studentUserId: string;
  studentName: string;
  /** The batch the student is in now (null when not placed). */
  batch: StudentBatchInfo | null;
  teacherName: string | null;
  courseTitle: string | null;
  /** The student has upcoming 1-to-1 classes a placement would replace. */
  hasOneToOneClasses: boolean;
  /** What the last change did, shown above the panel. Held by the parent: a
   * placement changes the student's batch, which refreshes this panel. */
  notice: string | null;
  onNotice: (message: string | null) => void;
  onChanged: () => void;
}) {
  const [options, setOptions] = useState<BatchOption[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "choose">(batch ? "view" : "choose");
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const flow = useEnrollFlow({
    studentUserId,
    studentName,
    onDone: (r) => {
      onNotice(
        r.movedFrom
          ? `Moved from ${r.movedFrom} to ${r.batchName} — starts at lesson ${r.startsAtLesson}.`
          : `Placed in ${r.batchName} — starts at lesson ${r.startsAtLesson}.`,
      );
      setCreating(false);
      setMode("view");
      onChanged();
    },
  });

  const loadOptions = useCallback(() => {
    setLoadError(null);
    api
      .get<{ options: BatchOption[] }>(`/admin/students/${studentUserId}/batch-options`)
      .then((res) => setOptions(res.data.options))
      .catch((err) => setLoadError(parseApiError(err, "Could not load the batches.").message));
  }, [studentUserId]);

  useEffect(() => {
    if (mode === "choose") loadOptions();
  }, [mode, loadOptions]);

  const remove = async () => {
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      await api.delete(`/admin/students/${studentUserId}/batch`);
      setRemoving(false);
      onNotice(`Removed from ${batch?.name}. Choose another batch, or switch to 1-to-1.`);
      setMode("choose");
      onChanged();
    } catch (err) {
      setRemoveError(parseApiError(err, "Could not remove this student.").message);
    } finally {
      setRemoveBusy(false);
    }
  };

  const choices = (options ?? []).filter((o) => o.batch.id !== batch?.id);

  return (
    <div className="space-y-4">
      {notice && <Notice tone="success">{notice}</Notice>}
      {flow.error && <Notice tone="danger">{flow.error}</Notice>}

      {batch && mode === "view" && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">Batch</p>
              <Link
                href={`/admin/batches/${batch.id}`}
                className="text-lg font-semibold text-[var(--a-text)] hover:text-[var(--a-accent)]"
              >
                {batch.name}
              </Link>
              <p className="text-sm text-[var(--a-text-muted)] mt-0.5">
                {batch.teacherName} · {batch.memberCount} of {batch.maxStudents} students
              </p>
            </div>
            <BatchStatusBadge status={batch.status} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">Next class</p>
              <p className="text-[var(--a-text)]">
                {batch.nextSession
                  ? `Lesson ${batch.nextSession.lessonNumber} · ${formatDhakaDate(batch.nextSession.start)} ${formatDhakaTime(batch.nextSession.start)}`
                  : "None scheduled"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">Joined at</p>
              <p className="text-[var(--a-text)]">
                {batch.joinedAtLesson ? `Lesson ${batch.joinedAtLesson}` : "—"}
                {batch.alignment === "SKIPPED_TO_BATCH" && (
                  <span className="text-[var(--a-text-faint)]"> (skipped ahead to the batch)</span>
                )}
                {batch.alignment === "BATCH_REBASED" && (
                  <span className="text-[var(--a-text-faint)]"> (batch started here)</span>
                )}
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--a-text-faint)]">
            A batch student follows the batch&rsquo;s schedule, teacher and lessons. Attendance, homework, test results and
            progress stay their own.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                onNotice(null);
                setMode("choose");
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
            >
              Move to another batch
            </button>
            <button
              onClick={() => setRemoving(true)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--a-border)] text-[var(--a-danger)] hover:bg-[var(--a-danger-bg)]"
            >
              Remove from batch
            </button>
          </div>
        </Card>
      )}

      {mode === "choose" && (
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--a-text)]">
                {batch ? "Move to another batch" : "Choose a batch"}
              </p>
              <p className="text-xs text-[var(--a-text-muted)] mt-0.5">
                Only batches that teach {courseTitle ?? "this curriculum"} can take {studentName}. Anything a placement
                changes is listed for your confirmation first.
              </p>
            </div>
            {batch && (
              <button
                onClick={() => setMode("view")}
                className="text-sm text-[var(--a-text-muted)] hover:text-[var(--a-text)]"
              >
                Cancel
              </button>
            )}
          </div>

          {hasOneToOneClasses && !batch && (
            <Notice tone="info">
              {studentName} has upcoming 1-to-1 classes. Joining a batch replaces them with the batch&rsquo;s classes
              (completed classes are kept) — you&rsquo;ll be asked to confirm.
            </Notice>
          )}
          {loadError && <p className="text-sm text-[var(--a-danger)]">{loadError}</p>}
          {!options && !loadError && <p className="text-sm text-[var(--a-text-muted)]">Loading batches…</p>}
          {options && (
            <BatchOptionsList
              options={choices}
              busy={flow.busy}
              onChoose={(o) => flow.start({ batchId: o.batch.id }, o.batch.name, o.issues)}
            />
          )}

          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="px-3 py-2 rounded-lg text-sm font-semibold border border-dashed border-[var(--a-border-strong)] text-[var(--a-accent)] hover:bg-[var(--a-nav-hover)]"
            >
              + Create a new batch for {studentName}
            </button>
          ) : (
            <NewBatchForm
              teacherName={teacherName}
              courseTitle={courseTitle}
              nextLesson={null}
              busy={flow.busy}
              onCancel={() => setCreating(false)}
              onSubmit={(payload) => flow.start({ newBatch: payload }, payload.name, [])}
            />
          )}
        </Card>
      )}

      {removing && (
        <Modal title="Remove from batch" onClose={removeBusy ? () => {} : () => setRemoving(false)}>
          <div className="space-y-4">
            <p className="text-sm text-[var(--a-text)]">
              Remove <strong>{studentName}</strong> from <strong>{batch?.name}</strong>?
            </p>
            <ul className="text-sm text-[var(--a-text-muted)] list-disc list-inside space-y-1">
              <li>Their upcoming classes in this batch are removed.</li>
              <li>Everything already taught stays on their record — attendance, homework, tests and badges.</li>
              <li>They stay a Batch student until you place them in another batch or switch them to 1-to-1.</li>
            </ul>
            {removeError && <p className="text-sm text-[var(--a-danger)]">{removeError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRemoving(false)}
                disabled={removeBusy}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={remove}
                disabled={removeBusy}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-danger)] hover:opacity-90 disabled:opacity-60"
              >
                {removeBusy ? "Removing…" : "Remove from batch"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {flow.modal}
    </div>
  );
}

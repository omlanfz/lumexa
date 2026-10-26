// FILE PATH: client/components/admin/batches/useEnrollFlow.tsx
//
// The one way the admin screens place a student in a batch — from the student's
// Schedule tab, from a batch's "Add student", and when moving a student — so
// they all behave the same:
//
//   1. If the placement changes anything the admin must decide (the student's
//      teacher, lessons they will not take, the 1-to-1 classes it replaces),
//      the confirmation dialog lists each one with its own tick box. Nothing is
//      accepted on the admin's behalf, and nothing is sent until every box is
//      ticked.
//   2. The server checks the same rules again. If the screen was out of date and
//      it answers "decision required", the dialog opens with what it found; a
//      refusal ("not possible") is shown as the reason, changing nothing.

"use client";

import { useState, type ReactNode } from "react";
import api from "@/lib/axios";
import { Modal } from "@/components/admin/AdminUI";
import {
  allDecisionsAccepted,
  decisionsFrom,
  decisionsOf,
  parseApiError,
  type EnrollmentDecisions,
  type EnrollmentIssue,
} from "@/lib/batches";
import { IssueList } from "./BatchUI";

export interface NewBatchPayload {
  name: string;
  notes?: string;
  maxStudents?: number;
  firstClassDate: string;
  slots: { weekday: number; time: string }[];
}

export type EnrollTarget = { batchId: string } | { newBatch: NewBatchPayload };

export interface EnrollResult {
  batchId: string;
  batchName: string;
  movedFrom: string | null;
  alignment: string;
  startsAtLesson: number;
}

function EnrollmentConfirmModal({
  title,
  studentName,
  batchLabel,
  issues,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  studentName: string;
  batchLabel: string;
  issues: EnrollmentIssue[];
  busy: boolean;
  error: string | null;
  onConfirm: (decisions: EnrollmentDecisions) => void;
  onClose: () => void;
}) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const ready = allDecisionsAccepted(issues, accepted);
  const count = decisionsOf(issues).length;

  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text-muted)]">
          Placing <strong className="text-[var(--a-text)]">{studentName}</strong> in{" "}
          <strong className="text-[var(--a-text)]">{batchLabel}</strong> changes {count === 1 ? "one thing" : `${count} things`}.
          Their completed classes, homework, test results and badges are never touched — confirm each change to go ahead.
        </p>
        <IssueList
          issues={issues}
          accepted={accepted}
          onToggle={(code, value) => setAccepted((a) => ({ ...a, [code]: value }))}
        />
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(decisionsFrom(issues, accepted))}
            disabled={!ready || busy}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] transition-colors disabled:opacity-50"
          >
            {busy ? "Placing…" : "Confirm and place student"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function useEnrollFlow({
  studentUserId,
  studentName,
  onDone,
}: {
  studentUserId: string;
  studentName: string;
  onDone: (result: EnrollResult) => void;
}): {
  /** Place the student. `issues` (from the options/candidates list) lets the
   * screen ask for confirmation up front instead of after a refused request. */
  start: (target: EnrollTarget, batchLabel: string, issues?: EnrollmentIssue[]) => void;
  /** Render this somewhere in the screen. */
  modal: ReactNode;
  busy: boolean;
  /** A refusal of the last attempt, in words (null when there is none). */
  error: string | null;
  clearError: () => void;
} {
  const [pending, setPending] = useState<null | {
    target: EnrollTarget;
    label: string;
    issues: EnrollmentIssue[];
  }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const submit = async (
    target: EnrollTarget,
    label: string,
    decisions: EnrollmentDecisions,
    fromDialog: boolean,
  ) => {
    setBusy(true);
    setError(null);
    setDialogError(null);
    try {
      const res = await api.post<EnrollResult>(`/admin/students/${studentUserId}/batch`, {
        ...target,
        decisions,
      });
      setPending(null);
      onDone(res.data);
    } catch (err) {
      const parsed = parseApiError(err, "Could not place this student.");
      if (parsed.code === "DECISION_REQUIRED" && !fromDialog) {
        // The screen was out of date: ask about what the server found.
        setPending({ target, label, issues: parsed.issues });
      } else if (fromDialog) {
        setDialogError(parsed.message);
      } else {
        setError(parsed.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const start = (target: EnrollTarget, label: string, issues: EnrollmentIssue[] = []) => {
    setError(null);
    if (decisionsOf(issues).length > 0) {
      setDialogError(null);
      setPending({ target, label, issues });
      return;
    }
    void submit(target, label, {}, false);
  };

  const modal = pending ? (
    <EnrollmentConfirmModal
      title="Confirm batch placement"
      studentName={studentName}
      batchLabel={pending.label}
      issues={pending.issues}
      busy={busy}
      error={dialogError}
      onConfirm={(decisions) => void submit(pending.target, pending.label, decisions, true)}
      onClose={() => {
        setPending(null);
        setDialogError(null);
      }}
    />
  ) : null;

  return { start, modal, busy, error, clearError: () => setError(null) };
}

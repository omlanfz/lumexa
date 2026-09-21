"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { DropdownMenu, DropdownItem, Modal, ReasonActionModal, StatusBadge, formatDateTime, CLASS_TYPE_LABELS } from "@/components/admin/AdminUI";

export interface ClassRow {
  id: string;
  kind: "BOOKING" | "LESSON";
  start: string;
  end: string;
  studentName: string;
  studentEmail: string | null;
  studentUserId: string | null;
  teacherName: string;
  teacherId: string | null;
  courseTitle: string;
  courseId: string | null;
  classType: string | null;
  lessonNumber: number | null;
  paymentStatus: string | null;
  amountCents: number | null;
  recordingUrl: string | null;
  recordingStatus: string;
  recordingMergeError: string | null;
  isLive: boolean;
  displayStatus: string;
}

// Kept as an alias so nothing outside this file needs to know the type was
// renamed from the old Booking-only shape.
export type Booking = ClassRow;

export default function ClassRowActions({
  row,
  onChanged,
}: {
  row: ClassRow;
  onChanged: () => void;
}) {
  const [modal, setModal] = useState<
    null | "reschedule" | "cancel" | "refund" | "recording" | "history" | "details" | "delete"
  >(null);

  const canModify = !["CANCELLED", "REFUNDED"].includes(row.displayStatus);

  return (
    <div className="flex items-center justify-end gap-1.5">
      <DropdownMenu
        align="right"
        trigger={({ toggle }) => (
          <button
            onClick={toggle}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] transition-colors"
          >
            Actions ▾
          </button>
        )}
      >
        {(close) => (
          <>
            <DropdownItem onClick={() => { setModal("details"); close(); }}>View details</DropdownItem>
            {canModify && (
              <DropdownItem onClick={() => { setModal("reschedule"); close(); }}>Reschedule</DropdownItem>
            )}
            {canModify && (
              <DropdownItem onClick={() => { setModal("cancel"); close(); }} danger>
                Cancel
              </DropdownItem>
            )}
            {row.kind === "BOOKING" && row.paymentStatus === "CAPTURED" && (
              <DropdownItem onClick={() => { setModal("refund"); close(); }} danger>
                Refund
              </DropdownItem>
            )}
            <DropdownItem onClick={() => { setModal("recording"); close(); }}>View recording</DropdownItem>
            {row.recordingStatus === "FAILED" && (
              <DropdownItem
                onClick={async () => {
                  close();
                  await api.post(`/admin/classes/${row.kind}/${row.id}/recording-retry`);
                  onChanged();
                }}
              >
                Retry recording
              </DropdownItem>
            )}
            {row.kind === "BOOKING" && (
              <DropdownItem onClick={() => { setModal("history"); close(); }}>Reschedule history</DropdownItem>
            )}
          </>
        )}
      </DropdownMenu>

      <button
        onClick={() => setModal("delete")}
        title="Delete this class log"
        aria-label="Delete this class log"
        className="p-1.5 rounded-lg border border-[var(--a-border)] text-[var(--a-danger)] hover:bg-[var(--a-danger-bg)] transition-colors"
      >
        <TrashIcon />
      </button>

      {modal === "details" && <DetailsModal row={row} onClose={() => setModal(null)} />}
      {modal === "reschedule" && (
        <RescheduleModal row={row} onClose={() => setModal(null)} onDone={onChanged} />
      )}
      {modal === "cancel" && (
        <ReasonActionModal
          title="Cancel this class"
          actionLabel="Cancel class"
          danger
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            const path = row.kind === "BOOKING" ? `/admin/bookings/${row.id}/cancel` : `/admin/lessons/${row.id}/cancel`;
            await api.post(path, { reason });
            onChanged();
          }}
        />
      )}
      {modal === "refund" && (
        <RefundModal row={row} onClose={() => setModal(null)} onDone={onChanged} />
      )}
      {modal === "recording" && (
        <RecordingModal row={row} onClose={() => setModal(null)} />
      )}
      {modal === "history" && (
        <HistoryModal row={row} onClose={() => setModal(null)} />
      )}
      {modal === "delete" && (
        <ConfirmDeleteModal row={row} onClose={() => setModal(null)} onDone={onChanged} />
      )}
    </div>
  );
}

function ConfirmDeleteModal({
  row,
  onClose,
  onDone,
}: {
  row: ClassRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const path = row.kind === "BOOKING" ? `/admin/bookings/${row.id}` : `/admin/lessons/${row.id}`;
      await api.delete(path);
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Delete this class log" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text)]">
          Permanently delete the {formatDateTime(row.start)} class ({row.studentName} · {row.teacherName})?
          This removes it from the class log entirely and can&rsquo;t be undone.
        </p>
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-danger)] hover:opacity-90 transition-colors disabled:opacity-60"
          >
            {submitting ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function DetailsModal({ row, onClose }: { row: ClassRow; onClose: () => void }) {
  return (
    <Modal title="Class details" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <Row label="Student" value={`${row.studentName}${row.studentEmail ? ` (${row.studentEmail})` : ""}`} />
        <Row label="Teacher" value={row.teacherName} />
        <Row label="Course" value={row.courseTitle} />
        <Row label="Scheduled" value={`${formatDateTime(row.start)} → ${formatDateTime(row.end)}`} />
        <Row label="Status" value={<StatusBadge status={row.displayStatus} />} />
        {row.kind === "BOOKING" && row.paymentStatus && (
          <Row label="Payment status" value={<StatusBadge status={row.paymentStatus} />} />
        )}
        {row.kind === "LESSON" && (
          <>
            <Row label="Lesson #" value={row.lessonNumber ?? "—"} />
            <Row label="Class type" value={row.classType ? (CLASS_TYPE_LABELS[row.classType] ?? row.classType) : "—"} />
            <p className="text-xs text-[var(--a-text-faint)] pt-1">
              Billed against the student&rsquo;s BDT ledger balance, not per-class — see the student&rsquo;s Payments tab.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--a-border)] last:border-0 pb-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">{label}</span>
      <span className="text-[var(--a-text)] text-right">{value}</span>
    </div>
  );
}

function RescheduleModal({
  row,
  onClose,
  onDone,
}: {
  row: ClassRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const toLocalInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
  const [start, setStart] = useState(toLocalInput(row.start));
  const [end, setEnd] = useState(toLocalInput(row.end));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (row.kind === "BOOKING" && !reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (row.kind === "BOOKING") {
        await api.post(`/admin/bookings/${row.id}/reschedule`, {
          newStart: new Date(start).toISOString(),
          newEnd: new Date(end).toISOString(),
          reason: reason.trim(),
        });
      } else {
        await api.post(`/admin/lessons/${row.id}/reschedule`, {
          newStart: new Date(start).toISOString(),
          newEnd: new Date(end).toISOString(),
        });
      }
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Admin override — reschedule" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
              New start
            </label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
              New end
            </label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
            />
          </div>
        </div>
        {row.kind === "BOOKING" && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
              placeholder="Explain why Operations is rescheduling this class."
            />
          </div>
        )}
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] transition-colors disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Reschedule"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RefundModal({
  row,
  onClose,
  onDone,
}: {
  row: ClassRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const maxCents = row.amountCents ?? 0;
  const [amount, setAmount] = useState(String((maxCents / 100).toFixed(2)));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const cents = Math.round(parseFloat(amount || "0") * 100);
    if (!cents || cents <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/admin/bookings/${row.id}/refund`, {
        refundCents: cents,
        reason: reason.trim(),
      });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Issue refund" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
            Refund amount (BDT)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
            Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          />
        </div>
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-danger)] hover:opacity-90 transition-colors disabled:opacity-60"
          >
            {submitting ? "Processing…" : "Issue refund"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RecordingModal({ row, onClose }: { row: ClassRow; onClose: () => void }) {
  return (
    <Modal title="Class recording" onClose={onClose}>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
          Status: {row.recordingStatus}
        </p>
        {row.recordingStatus === "PROCESSING" && (
          <p className="text-sm text-[var(--a-text-muted)]">Processing recording… check back shortly.</p>
        )}
        {row.recordingStatus === "FAILED" && (
          <p className="text-sm text-[var(--a-danger)]">
            {row.recordingMergeError || "Merging this recording failed."} Use &ldquo;Retry recording&rdquo; from the
            Actions menu.
          </p>
        )}
        {row.recordingUrl ? (
          <a
            href={row.recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--a-accent)] hover:underline break-all"
          >
            {row.recordingUrl}
          </a>
        ) : (
          row.recordingStatus !== "PROCESSING" &&
          row.recordingStatus !== "FAILED" && (
            <p className="text-sm text-[var(--a-text-muted)]">No recording available for this class.</p>
          )
        )}
      </div>
    </Modal>
  );
}

function HistoryModal({ row, onClose }: { row: ClassRow; onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/bookings/${row.id}/reschedule-history`)
      .then((res) => setItems(res.data ?? []))
      .finally(() => setLoading(false));
  }, [row.id]);

  return (
    <Modal title="Reschedule history" onClose={onClose}>
      {loading && <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-[var(--a-text-muted)]">No reschedule events for this class.</p>
      )}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {items.map((r) => (
          <div key={r.id} className="p-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)]">
            <div className="flex items-center justify-between text-xs text-[var(--a-text-faint)] mb-1">
              <span>{new Date(r.createdAt).toLocaleString()}</span>
              <span className="font-semibold">{r.action} · {r.category}</span>
            </div>
            <p className="text-sm text-[var(--a-text)]">
              {new Date(r.oldStart).toLocaleString()} → {new Date(r.newStart).toLocaleString()}
            </p>
            <p className="text-xs text-[var(--a-text-muted)] mt-1">
              Initiated by {r.initiatedByRole}
              {r.reason ? ` — ${r.reason}` : ""}
            </p>
            {r.penaltyStatus !== "NONE" && (
              <p className="text-xs mt-1 font-medium text-[var(--a-warning-text)]">
                Penalty: {r.penaltyStatus} ({(r.penaltyAmountCents / 100).toFixed(2)} BDT)
              </p>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

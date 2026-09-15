"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/axios";
import { Modal, ReasonActionModal } from "@/components/admin/AdminUI";

export interface Booking {
  id: string;
  paymentStatus: string;
  displayStatus: string;
  amountCents: number | null;
  recordingUrl: string | null;
  studentUser?: { id: string; fullName: string; email: string; assignedCourse?: { id: string; title: string } | null } | null;
  student?: { name: string } | null;
  shift?: {
    start: string;
    end: string;
    teacher?: { id: string; user: { fullName: string } };
  };
}

export default function ClassRowActions({
  booking,
  onChanged,
  onView,
}: {
  booking: Booking;
  onChanged: () => void;
  onView: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<
    null | "reschedule" | "cancel" | "refund" | "recording" | "history"
  >(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const canModify = !["CANCELLED", "REFUNDED"].includes(booking.displayStatus);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] transition-colors"
      >
        Actions ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-52 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl z-20 overflow-hidden fade-in">
          <MenuItem onClick={() => { onView(); setOpen(false); }}>View details</MenuItem>
          {canModify && (
            <MenuItem onClick={() => { setModal("reschedule"); setOpen(false); }}>Reschedule</MenuItem>
          )}
          {canModify && (
            <MenuItem onClick={() => { setModal("cancel"); setOpen(false); }} danger>
              Cancel
            </MenuItem>
          )}
          {booking.paymentStatus === "CAPTURED" && (
            <MenuItem onClick={() => { setModal("refund"); setOpen(false); }} danger>
              Refund
            </MenuItem>
          )}
          <MenuItem onClick={() => { setModal("recording"); setOpen(false); }}>View recording</MenuItem>
          <MenuItem onClick={() => { setModal("history"); setOpen(false); }}>Reschedule history</MenuItem>
        </div>
      )}

      {modal === "reschedule" && (
        <RescheduleModal booking={booking} onClose={() => setModal(null)} onDone={onChanged} />
      )}
      {modal === "cancel" && (
        <ReasonActionModal
          title="Cancel this class"
          actionLabel="Cancel class"
          danger
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            await api.post(`/admin/bookings/${booking.id}/cancel`, { reason });
            onChanged();
          }}
        />
      )}
      {modal === "refund" && (
        <RefundModal booking={booking} onClose={() => setModal(null)} onDone={onChanged} />
      )}
      {modal === "recording" && (
        <RecordingModal booking={booking} onClose={() => setModal(null)} />
      )}
      {modal === "history" && (
        <HistoryModal booking={booking} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--a-nav-hover)] ${
        danger ? "text-[var(--a-danger)]" : "text-[var(--a-text)]"
      }`}
    >
      {children}
    </button>
  );
}

function RescheduleModal({
  booking,
  onClose,
  onDone,
}: {
  booking: Booking;
  onClose: () => void;
  onDone: () => void;
}) {
  const toLocalInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
  const [start, setStart] = useState(toLocalInput(booking.shift?.start));
  const [end, setEnd] = useState(toLocalInput(booking.shift?.end));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/admin/bookings/${booking.id}/reschedule`, {
        newStart: new Date(start).toISOString(),
        newEnd: new Date(end).toISOString(),
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
  booking,
  onClose,
  onDone,
}: {
  booking: Booking;
  onClose: () => void;
  onDone: () => void;
}) {
  const maxCents = booking.amountCents ?? 0;
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
      await api.post(`/admin/bookings/${booking.id}/refund`, {
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

function RecordingModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [url, setUrl] = useState<string | null | undefined>(booking.recordingUrl);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/bookings/${booking.id}/recording`)
      .then((res) => setUrl(res.data.recordingUrl))
      .finally(() => setLoading(false));
  }, [booking.id]);

  return (
    <Modal title="Class recording" onClose={onClose}>
      {loading && <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>}
      {!loading && url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[var(--a-accent)] hover:underline break-all"
        >
          {url}
        </a>
      )}
      {!loading && !url && (
        <p className="text-sm text-[var(--a-text-muted)]">No recording available for this class.</p>
      )}
    </Modal>
  );
}

function HistoryModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/bookings/${booking.id}/reschedule-history`)
      .then((res) => setItems(res.data ?? []))
      .finally(() => setLoading(false));
  }, [booking.id]);

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

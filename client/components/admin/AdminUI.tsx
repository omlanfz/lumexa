// FILE PATH: client/components/admin/AdminUI.tsx
//
// Small shared primitives for the /admin pages — a status pill, a
// reason-required action modal, and pagination controls. Kept in one file
// since each piece is a handful of lines and the admin surface is
// table-oriented, not component-heavy.

"use client";

import { useState, ReactNode } from "react";
import { createPortal } from "react-dom";

// ─── Status badge ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-[var(--a-info-bg)] text-[var(--a-info)]",
  COMPLETED: "bg-[var(--a-success-bg)] text-[var(--a-success-text)]",
  CANCELLED: "bg-[var(--a-surface-3)] text-[var(--a-text-muted)]",
  REFUNDED: "bg-[var(--a-surface-3)] text-[var(--a-text-muted)]",
  PENDING: "bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]",
  FAILED: "bg-[var(--a-danger-bg)] text-[var(--a-danger-text)]",
  NEEDS_REVIEW: "bg-[var(--a-danger-bg)] text-[var(--a-danger-text)]",
  ACTIVE: "bg-[var(--a-success-bg)] text-[var(--a-success-text)]",
  SUSPENDED: "bg-[var(--a-danger-bg)] text-[var(--a-danger-text)]",
  PAUSED: "bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]",
  DEACTIVATED: "bg-[var(--a-surface-3)] text-[var(--a-text-muted)]",
  OPEN: "bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]",
  FINALIZED: "bg-[var(--a-info-bg)] text-[var(--a-info)]",
  PAID: "bg-[var(--a-success-bg)] text-[var(--a-success-text)]",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-[var(--a-surface-3)] text-[var(--a-text-muted)]";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Payment status badge ────────────────────────────────────────────────────
//
// Operational signal for a student's BDT credit balance — computed by
// StudentLedgerService from the latest ledger entry (balance ÷ current
// per-lesson rate). Only two levels exist today: there's no renewal/due-date
// data in the schema to support a "payment overdue" state, so we don't
// fabricate one (see the admin Payments tab).

const PAYMENT_BADGE_STYLES: Record<string, string> = {
  due_soon: "bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]",
  exhausted: "bg-[var(--a-danger-bg)] text-[var(--a-danger-text)]",
};

const PAYMENT_BADGE_ICONS: Record<string, string> = {
  due_soon: "🟠",
  exhausted: "🔴",
};

export function PaymentBadge({
  badge,
}: {
  badge: { level: string; label: string } | null | undefined;
}) {
  if (!badge) return null;
  const style = PAYMENT_BADGE_STYLES[badge.level] ?? "bg-[var(--a-surface-3)] text-[var(--a-text-muted)]";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${style}`}>
      <span aria-hidden>{PAYMENT_BADGE_ICONS[badge.level] ?? "⚪"}</span>
      {badge.label}
    </span>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`a-card p-5 ${className}`}>{children}</div>;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
//
// Round profile photo for a teacher/student row — falls back to their name's
// first initial on a colored circle when they haven't uploaded one (photos
// are uploaded from the teacher/student's own dashboard via POST
// /uploads/avatar, which writes to User.avatarUrl).

const AVATAR_COLORS = [
  "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500",
];

function initialColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function Avatar({
  name,
  src,
  size = 36,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const dimension = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={dimension}
        className="rounded-full object-cover border border-[var(--a-border)] flex-shrink-0"
      />
    );
  }
  return (
    <div
      style={{ ...dimension, fontSize: size * 0.42 }}
      className={`rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${initialColor(name || "?")}`}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg text-sm border border-[var(--a-border)] text-[var(--a-text-muted)] disabled:opacity-40 hover:bg-[var(--a-nav-hover)] transition-colors"
      >
        Prev
      </button>
      <span className="text-sm text-[var(--a-text-muted)]">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg text-sm border border-[var(--a-border)] text-[var(--a-text-muted)] disabled:opacity-40 hover:bg-[var(--a-nav-hover)] transition-colors"
      >
        Next
      </button>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Rendered into a portal at document.body — admin pages wrap their content
  // in a `.fade-in` div (see admin/layout.tsx) whose entrance animation ends
  // on `transform: translateY(0)`, and CSS makes any transformed ancestor
  // the containing block for `position: fixed` descendants. Left in place,
  // this modal's `fixed inset-0` would be positioned relative to that page
  // content div instead of the viewport — clipping its top edge behind the
  // sticky top nav instead of covering the whole screen. A portal escapes
  // that ancestor entirely.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto a-card p-6 fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--a-text)]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[var(--a-text-faint)] hover:text-[var(--a-text)] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ─── Reason-required action modal (suspend, pause, refund, cancel, etc.) ────

export function ReasonActionModal({
  title,
  actionLabel,
  danger,
  extraFields,
  onSubmit,
  onClose,
}: {
  title: string;
  actionLabel: string;
  danger?: boolean;
  extraFields?: ReactNode;
  onSubmit: (reason: string) => Promise<void> | void;
  onClose: () => void;
}) {
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
      await onSubmit(reason.trim());
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        {extraFields}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
            Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
            placeholder="Explain why — this is recorded in the audit trail."
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
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              danger ? "bg-[var(--a-danger)] hover:opacity-90" : "bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]"
            }`}
          >
            {submitting ? "Working…" : actionLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Money formatting (amountCents, BDT) ────────────────────────────────────

export function formatBDT(cents: number): string {
  const taka = cents / 100;
  const sign = taka < 0 ? "-" : "";
  return `${sign}৳${Math.abs(taka).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// FILE PATH: client/components/admin/AdminUI.tsx
//
// Small shared primitives for the /admin pages — a status pill, a
// reason-required action modal, and pagination controls. Kept in one file
// since each piece is a handful of lines and the admin surface is
// table-oriented, not component-heavy.

"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
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

// ─── Admin-set password reveal ──────────────────────────────────────────────
//
// Shows the plaintext password Operations most recently set for this account
// (User.adminSetPassword — see AdminService.resetUserPassword). Masked by
// default since it's a live credential; toggling stops row-click navigation
// so it can be used inside a clickable table row.

export function PasswordReveal({ value }: { value: string | null | undefined }) {
  const [show, setShow] = useState(false);
  if (!value) {
    return <span className="text-[var(--a-text-faint)]">Not set by admin</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      <span>{show ? value : "•".repeat(Math.min(value.length, 10))}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShow((s) => !s);
        }}
        className="text-[var(--a-text-faint)] hover:text-[var(--a-text)] transition-colors"
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
      >
        {show ? "🙈" : "👁️"}
      </button>
    </span>
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

// ─── Dropdown menu (portal-based) ───────────────────────────────────────────
//
// A plain `absolute right-0` dropdown gets clipped whenever an ancestor
// (e.g. a table's `overflow-x-auto` wrapper) establishes a scroll/clip
// context — per spec, setting only `overflow-x` implicitly sets
// `overflow-y: auto` too, so the menu is cut off instead of floating over
// the table. Rendering it into a portal, positioned from the trigger
// button's live bounding rect, escapes that entirely — same fix as Modal
// above, just anchored to a button instead of centered on the viewport.

const DROPDOWN_WIDTH = 208; // matches w-52

export function DropdownMenu({
  trigger,
  children,
  align = "right",
}: {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left =
        align === "right"
          ? Math.max(8, rect.right - DROPDOWN_WIDTH)
          : rect.left;
      setCoords({ top: rect.bottom + 4, left });
    };
    updatePosition();

    const close = () => setOpen(false);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    function handleOutside(e: MouseEvent) {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) close();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, align]);

  return (
    <div ref={anchorRef} className="inline-block">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ position: "fixed", top: coords.top, left: coords.left, width: DROPDOWN_WIDTH }}
            className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl z-[110] overflow-hidden fade-in"
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
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

// ─── Contact (WhatsApp) edit modal — shared by Students and Teachers ────────

export function ContactModal({
  initialValue,
  onClose,
  onSubmit,
}: {
  initialValue: string;
  onClose: () => void;
  onSubmit: (whatsappNumber: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(value.trim());
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Edit contact details" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
            WhatsApp number
          </label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. +880 1XXX-XXXXXX"
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
            autoFocus
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
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Admin-set password modal — shared by Students and Teachers ────────────
//
// Passwords are bcrypt-hashed server-side, so this always sets a brand-new
// one rather than revealing the existing one. The plaintext Operations
// enters here is also what then shows up in the Password column (see
// PasswordReveal) — it's cleared automatically if the person changes their
// password themselves from their own dashboard afterward.

export function SetPasswordModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(password);
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Set a new password" onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--a-success-text)]">
            Password updated. It&rsquo;s now shown in the Password column until they change it themselves — share it with them securely.
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-[var(--a-text-faint)]">
            Passwords are encrypted and can&rsquo;t be viewed — this sets a brand-new one. They can change it again anytime from their own dashboard.
          </p>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
              New password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
              Confirm password
            </label>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] transition-colors disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Set password"}
            </button>
          </div>
        </div>
      )}
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

// ─── Asia/Dhaka formatting ───────────────────────────────────────────────────
//
// Lumexa's scheduling system (recurring slots, generated lessons) is always
// defined in Bangladesh time. Unlike formatDate/formatDateTime above (which
// render in the viewer's browser timezone — fine for "when was this action
// taken"), a lesson's date/time must always read the same regardless of
// which timezone the admin/teacher/student's browser is in.

export function formatDhakaDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("en-US", {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDhakaDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("en-US", {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDhakaTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleTimeString("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const CLASS_TYPE_LABELS: Record<string, string> = {
  ONE_TO_ONE: "1-to-1 (45 min)",
  BATCH: "Batch (60 min)",
};

/** Today's calendar date in Asia/Dhaka as 'YYYY-MM-DD' — mirrors
 * todayDhakaDateStr() in server/src/scheduling/dhaka-time.util.ts, used
 * client-side to stop an admin from even picking a past first-class date. */
export function todayDhakaDateStr(): string {
  const now = new Date();
  const shifted = new Date(now.getTime() + 6 * 60 * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BKASH: "bKash",
  BANK: "Bank transfer",
  CASH: "Cash",
  OTHER: "Other",
};

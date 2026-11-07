"use client";

// Small pieces shared by the admin certificate screens.

import type { ReactNode } from "react";
import { todayDhakaDateStr } from "@/components/admin/AdminUI";
import type { CertificateDetailsInput } from "@/lib/certificates/types";

export const INPUT =
  "w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus";
export const BTN_PRIMARY =
  "px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
export const BTN_GHOST =
  "px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
export const BTN_DANGER =
  "px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-danger)] hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--a-text-faint)]">{hint}</span>}
    </label>
  );
}

/** The theme chip: a dot in the category's colour and its name. `accent` is the
 * human description ("Deep blue"), shown as a tooltip. */
export function ThemePill({
  label,
  color,
  accent,
}: {
  label: string;
  color?: string;
  accent?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--a-text-muted)]" title={accent}>
      <span
        className="h-2.5 w-2.5 rounded-full border border-black/10"
        style={{ background: color || "var(--a-surface-3)" }}
        aria-hidden
      />
      {label}
    </span>
  );
}

/** What the admin is confirming, validated the way the server will validate it
 * (the server is the authority; this only saves a round trip for obvious slips). */
export function detailsProblem(d: CertificateDetailsInput): string | null {
  const name = d.recipientName.trim();
  const program = d.programName.trim();
  if (!name) return "Enter the name exactly as it should be printed.";
  if (name.length > 60) return "The name is too long to print (60 characters at most).";
  if (!program) return "Enter the program name.";
  if (program.length > 80) return "The program name is too long to print (80 characters at most).";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.completionDate)) return "Choose the completion date.";
  if (d.completionDate > todayDhakaDateStr()) return "The completion date cannot be in the future.";
  return null;
}

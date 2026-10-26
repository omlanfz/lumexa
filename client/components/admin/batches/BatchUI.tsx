// FILE PATH: client/components/admin/batches/BatchUI.tsx
//
// Small shared pieces of the batch screens: the Batch / 1-to-1 pill, the status
// and "how full" chips, and the list of things a placement would change or
// cannot do. Kept in one file, like AdminUI, since each piece is a few lines.

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  blockersOf,
  decisionsOf,
  formatSeats,
  isFull,
  type BatchStatus,
  type EnrollmentIssue,
} from "@/lib/batches";

/** "1-to-1" or "Batch · <name>" — the name links to the batch when given. */
export function ClassTypePill({
  classType,
  batch,
  linkToBatch = true,
}: {
  classType: string | null | undefined;
  batch?: { id: string; name: string } | null;
  linkToBatch?: boolean;
}) {
  if (!classType) {
    return <span className="text-xs text-[var(--a-text-faint)]">Not set</span>;
  }
  if (classType === "ONE_TO_ONE") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--a-surface-3)] text-[var(--a-text-muted)] whitespace-nowrap">
        1-to-1
      </span>
    );
  }
  const body = (
    <>
      <span aria-hidden>👥</span>
      <span>Batch{batch ? ` · ${batch.name}` : " · not placed"}</span>
    </>
  );
  const cls =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap max-w-[16rem] truncate " +
    (batch ? "bg-[var(--a-accent-light)] text-[var(--a-accent)]" : "bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]");
  if (batch && linkToBatch) {
    return (
      <Link
        href={`/admin/batches/${batch.id}`}
        onClick={(e) => e.stopPropagation()}
        className={`${cls} hover:opacity-80`}
        title={`Open ${batch.name}`}
      >
        {body}
      </Link>
    );
  }
  return <span className={cls}>{body}</span>;
}

const BATCH_STATUS_STYLES: Record<BatchStatus, string> = {
  ACTIVE: "bg-[var(--a-success-bg)] text-[var(--a-success-text)]",
  COMPLETED: "bg-[var(--a-info-bg)] text-[var(--a-info)]",
  ARCHIVED: "bg-[var(--a-surface-3)] text-[var(--a-text-muted)]",
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${BATCH_STATUS_STYLES[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

/** "3 of 4 students", amber when the batch is full. */
export function SeatsChip({ memberCount, maxStudents }: { memberCount: number; maxStudents: number }) {
  const full = isFull({ memberCount, maxStudents });
  return (
    <span className={full ? "text-[var(--a-warning-text)] font-medium" : "text-[var(--a-text)]"}>
      {formatSeats(memberCount, maxStudents)}
      {full && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide">Full</span>}
    </span>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "danger" | "warning" | "info" | "success";
  children: ReactNode;
}) {
  const style = {
    danger: "bg-[var(--a-danger-bg)] text-[var(--a-danger-text)]",
    warning: "bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]",
    info: "bg-[var(--a-info-bg)] text-[var(--a-info)]",
    success: "bg-[var(--a-success-bg)] text-[var(--a-success-text)]",
  }[tone];
  return <div className={`px-4 py-3 rounded-lg text-sm ${style}`}>{children}</div>;
}

/** What stands in the way of a placement (blockers) and what it would change
 * (decisions). When `accepted`/`onToggle` are given, each decision has a
 * checkbox: nothing is ever accepted on the admin's behalf. */
export function IssueList({
  issues,
  accepted,
  onToggle,
  compact,
}: {
  issues: EnrollmentIssue[];
  accepted?: Record<string, boolean>;
  onToggle?: (code: string, value: boolean) => void;
  compact?: boolean;
}) {
  const blockers = blockersOf(issues);
  const decisions = decisionsOf(issues);
  if (blockers.length === 0 && decisions.length === 0) return null;
  return (
    <ul className={`space-y-${compact ? "1" : "2"}`}>
      {blockers.map((i) => (
        <li key={i.code} className="flex gap-2 text-sm text-[var(--a-danger-text)]">
          <span aria-hidden className="mt-0.5">⛔</span>
          <span>{i.message}</span>
        </li>
      ))}
      {decisions.map((i) => {
        const ticked = !!accepted?.[i.code];
        return (
          <li key={i.code} className="text-sm text-[var(--a-text)]">
            {onToggle ? (
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={ticked}
                  onChange={(e) => onToggle(i.code, e.target.checked)}
                  className="mt-0.5 accent-[var(--a-accent)]"
                />
                <span>
                  <span className="block">{i.message}</span>
                  <span className="block text-xs text-[var(--a-text-faint)] mt-0.5">{DECISION_HINT[i.decision ?? "progress"]}</span>
                </span>
              </label>
            ) : (
              <span className="flex gap-2">
                <span aria-hidden className="mt-0.5">⚠️</span>
                <span>{i.message}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const DECISION_HINT: Record<string, string> = {
  acceptTeacherChange: "Tick to accept the new teacher.",
  progress: "Tick to confirm — nothing the student has completed is changed.",
  replaceUpcoming: "Tick to remove those upcoming classes. Completed classes are kept.",
};

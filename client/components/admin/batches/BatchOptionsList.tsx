// FILE PATH: client/components/admin/batches/BatchOptionsList.tsx
//
// The batches a student could be placed in, most compatible first, each with
// what stands in the way or what the placement would change — so the admin
// sees, before choosing, whether a batch fits.

"use client";

import Link from "next/link";
import {
  blockersOf,
  compatibilityLabel,
  decisionsOf,
  formatProgress,
  formatSlots,
  type BatchOption,
} from "@/lib/batches";
import { IssueList, SeatsChip } from "./BatchUI";

const TONE = {
  good: "bg-[var(--a-success-bg)] text-[var(--a-success-text)]",
  warn: "bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]",
  bad: "bg-[var(--a-danger-bg)] text-[var(--a-danger-text)]",
};

export default function BatchOptionsList({
  options,
  busy,
  actionLabel = "Add to this batch",
  onChoose,
  emptyText = "No active batch yet — create one for this student below.",
}: {
  options: BatchOption[];
  busy?: boolean;
  actionLabel?: string;
  onChoose: (option: BatchOption) => void;
  emptyText?: string;
}) {
  if (options.length === 0) {
    return <p className="text-sm text-[var(--a-text-muted)]">{emptyText}</p>;
  }
  return (
    <ul className="space-y-3">
      {options.map((o) => {
        const label = compatibilityLabel(o);
        const blocked = blockersOf(o.issues).length > 0;
        return (
          <li
            key={o.batch.id}
            className="p-4 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/batches/${o.batch.id}`}
                  className="font-semibold text-[var(--a-text)] hover:text-[var(--a-accent)]"
                >
                  {o.batch.name}
                </Link>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${TONE[label.tone]}`}>
                  {label.text}
                </span>
              </div>
              <p className="text-xs text-[var(--a-text-muted)]">
                {o.batch.teacher.name} · {o.batch.course.title} · {formatSlots(o.batch.slots)}
              </p>
              <p className="text-xs text-[var(--a-text-muted)]">
                <SeatsChip memberCount={o.batch.memberCount} maxStudents={o.batch.maxStudents} /> ·{" "}
                {formatProgress(o.batch.progress)}
              </p>
              {(blocked || decisionsOf(o.issues).length > 0) && (
                <div className="pt-1">
                  <IssueList issues={o.issues} compact />
                </div>
              )}
            </div>
            <button
              onClick={() => onChoose(o)}
              disabled={busy || blocked}
              className="self-start flex-shrink-0 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={blocked ? "This placement is not possible — see the reason on the left." : undefined}
            >
              {actionLabel}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// FILE PATH: client/components/admin/batches/MembershipModals.tsx
//
// Adding students to a batch and moving one to another batch, from the batch's
// own page. Both place students through useEnrollFlow, so what a placement
// changes is confirmed explicitly, exactly as on a student's Schedule tab.

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Avatar, Modal } from "@/components/admin/AdminUI";
import {
  blockersOf,
  compatibilityLabel,
  parseApiError,
  type BatchCandidate,
  type BatchOption,
  type BatchSummary,
} from "@/lib/batches";
import BatchOptionsList from "./BatchOptionsList";
import { IssueList, Notice } from "./BatchUI";
import { useEnrollFlow } from "./useEnrollFlow";

const TONE = {
  good: "bg-[var(--a-success-bg)] text-[var(--a-success-text)]",
  warn: "bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]",
  bad: "bg-[var(--a-danger-bg)] text-[var(--a-danger-text)]",
};

function CandidateRow({
  candidate,
  batch,
  onAdded,
}: {
  candidate: BatchCandidate;
  batch: BatchSummary;
  onAdded: (message: string) => void;
}) {
  const flow = useEnrollFlow({
    studentUserId: candidate.student.id,
    studentName: candidate.student.fullName,
    onDone: (r) =>
      onAdded(
        r.movedFrom
          ? `${candidate.student.fullName} moved from ${r.movedFrom} — starts at lesson ${r.startsAtLesson}.`
          : `${candidate.student.fullName} added — starts at lesson ${r.startsAtLesson}.`,
      ),
  });
  const label = compatibilityLabel(candidate);
  const blocked = blockersOf(candidate.issues).length > 0;

  return (
    <li className="p-3 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={candidate.student.fullName} src={candidate.student.avatarUrl} size={32} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--a-text)] truncate">
              {candidate.student.fullName}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${TONE[label.tone]}`}>
                {label.text}
              </span>
            </p>
            <p className="text-xs text-[var(--a-text-faint)] truncate">
              {candidate.student.email}
              {candidate.currentBatch ? ` · now in ${candidate.currentBatch.name}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => flow.start({ batchId: batch.id }, batch.name, candidate.issues)}
          disabled={flow.busy || blocked}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {candidate.currentBatch ? "Move here" : "Add"}
        </button>
      </div>
      {(candidate.issues.length > 0 || flow.error) && (
        <div className="pl-11 space-y-1">
          <IssueList issues={candidate.issues} compact />
          {flow.error && <p className="text-sm text-[var(--a-danger)]">{flow.error}</p>}
        </div>
      )}
      {flow.modal}
    </li>
  );
}

export function AddStudentModal({
  batch,
  onClose,
  onChanged,
}: {
  batch: BatchSummary;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<BatchCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get<{ candidates: BatchCandidate[] }>(
          `/admin/batches/${batch.id}/candidates?search=${encodeURIComponent(search.trim())}`,
        )
        .then((res) => {
          setCandidates(res.data.candidates);
          setError(null);
        })
        .catch((err) => setError(parseApiError(err, "Could not load students.").message));
    }, 250);
    return () => clearTimeout(t);
  }, [batch.id, search, reloadKey]);

  return (
    <Modal title={`Add students to ${batch.name}`} onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text-muted)]">
          Students on {batch.course.title} fit best. Anything a placement changes — the student&rsquo;s teacher, lessons they
          will not take, their 1-to-1 classes — is shown first and needs your confirmation.
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students by name or email…"
          className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
        />
        {notice && <Notice tone="success">{notice}</Notice>}
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        {!candidates && !error && <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>}
        {candidates && candidates.length === 0 && (
          <p className="text-sm text-[var(--a-text-muted)]">No students match.</p>
        )}
        <ul className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {candidates?.map((c) => (
            <CandidateRow
              key={c.student.id}
              candidate={c}
              batch={batch}
              onAdded={(message) => {
                setNotice(message);
                setReloadKey((k) => k + 1);
                onChanged();
              }}
            />
          ))}
        </ul>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)]"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function MoveStudentModal({
  student,
  fromBatch,
  onClose,
  onMoved,
}: {
  student: { id: string; fullName: string };
  fromBatch: { id: string; name: string };
  onClose: () => void;
  onMoved: () => void;
}) {
  const [options, setOptions] = useState<BatchOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flow = useEnrollFlow({
    studentUserId: student.id,
    studentName: student.fullName,
    onDone: () => {
      onMoved();
      onClose();
    },
  });

  useEffect(() => {
    api
      .get<{ options: BatchOption[] }>(`/admin/students/${student.id}/batch-options`)
      .then((res) => setOptions(res.data.options.filter((o) => o.batch.id !== fromBatch.id)))
      .catch((err) => setError(parseApiError(err, "Could not load the batches.").message));
  }, [student.id, fromBatch.id]);

  return (
    <Modal title={`Move ${student.fullName}`} onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text-muted)]">
          Moving takes {student.fullName} out of <strong className="text-[var(--a-text)]">{fromBatch.name}</strong>
          &rsquo;s upcoming classes and into the batch you choose. Everything already taught stays on their record.
        </p>
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        {flow.error && <Notice tone="danger">{flow.error}</Notice>}
        {!options && !error && <p className="text-sm text-[var(--a-text-muted)]">Loading batches…</p>}
        {options && (
          <div className="max-h-[55vh] overflow-y-auto pr-1">
            <BatchOptionsList
              options={options}
              busy={flow.busy}
              actionLabel="Move here"
              emptyText="There is no other active batch to move to."
              onChoose={(o) => flow.start({ batchId: o.batch.id }, o.batch.name, o.issues)}
            />
          </div>
        )}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)]"
          >
            Cancel
          </button>
        </div>
      </div>
      {flow.modal}
    </Modal>
  );
}

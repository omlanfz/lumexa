"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import {
  Avatar,
  Card,
  Modal,
  StatusBadge,
  formatDate,
  formatDhakaDate,
  formatDhakaTime,
} from "@/components/admin/AdminUI";
import { BatchStatusBadge, Notice, SeatsChip } from "@/components/admin/batches/BatchUI";
import {
  ChangeScheduleModal,
  ChangeTeacherModal,
  EditBatchModal,
} from "@/components/admin/batches/BatchFormModals";
import { AddStudentModal, MoveStudentModal } from "@/components/admin/batches/MembershipModals";
import ClassRowActions, { type ClassRow } from "../../classes/ClassRowActions";
import {
  SYNC_LABELS,
  formatProgress,
  formatSlots,
  parseApiError,
  type BatchDetail,
  type BatchMemberRow,
  type BatchSessionRow,
  type BatchSummary,
} from "@/lib/batches";

type ModalName = null | "edit" | "teacher" | "schedule" | "add" | "archive" | "reopen";

const SYNC_STYLES: Record<BatchMemberRow["sync"], string> = {
  ALIGNED: "bg-[var(--a-success-bg)] text-[var(--a-success-text)]",
  BEHIND: "bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]",
  AHEAD: "bg-[var(--a-info-bg)] text-[var(--a-info)]",
};

/** What the Classes-page actions (reschedule, cancel, delete) need to know about
 * one batch class. */
function toClassRow(s: BatchSessionRow, batch: BatchSummary): ClassRow {
  return {
    id: s.id,
    kind: "SESSION",
    start: s.start,
    end: s.end,
    studentName: `${batch.name} · ${s.students} student${s.students === 1 ? "" : "s"}`,
    studentEmail: null,
    studentUserId: null,
    teacherName: batch.teacher.name,
    teacherId: batch.teacher.id,
    courseTitle: batch.course.title,
    courseId: batch.course.id,
    classType: "BATCH",
    lessonNumber: s.lessonNumber,
    paymentStatus: null,
    amountCents: null,
    recordingUrl: null,
    recordingStatus: "NONE",
    recordingMergeError: null,
    isLive: false,
    displayStatus: s.status === "UPCOMING" ? "SCHEDULED" : s.status,
    batch: { id: batch.id, name: batch.name },
    students: s.participants ?? [],
  };
}

function Stat({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">{label}</p>
        <div className="text-sm text-[var(--a-text)]">{children}</div>
      </div>
      {action}
    </Card>
  );
}

const SMALL_BTN =
  "px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)] flex-shrink-0";

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const [moving, setMoving] = useState<BatchMemberRow | null>(null);
  const [removing, setRemoving] = useState<BatchMemberRow | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const load = useCallback(() => {
    return api
      .get<BatchDetail>(`/admin/batches/${batchId}`)
      .then((res) => {
        setDetail(res.data);
        setError(null);
      })
      .catch((err) => setError(parseApiError(err, "Could not load this batch.").message))
      .finally(() => setLoading(false));
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  const removeMember = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      await api.delete(`/admin/batches/${batchId}/students/${removing.studentUserId}`);
      setRemoving(null);
      await load();
    } catch (err) {
      setRemoveError(parseApiError(err, "Could not remove this student.").message);
    } finally {
      setRemoveBusy(false);
    }
  };

  const setArchived = async (archived: boolean) => {
    setArchiveBusy(true);
    setArchiveError(null);
    try {
      await api.patch(`/admin/batches/${batchId}`, { status: archived ? "ARCHIVED" : "ACTIVE" });
      setModal(null);
      await load();
    } catch (err) {
      setArchiveError(parseApiError(err, "Could not update the batch.").message);
    } finally {
      setArchiveBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;
  if (!detail) return <p className="text-sm text-[var(--a-danger)]">{error ?? "Batch not found."}</p>;

  const { batch, members, formerMembers, upcomingSessions, recentSessions, warnings } = detail;
  const open = batch.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/admin/batches")} className="text-sm text-[var(--a-text-muted)] hover:text-[var(--a-text)]">
        ← Back to Batches
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--a-text)]">{batch.name}</h1>
            <BatchStatusBadge status={batch.status} />
          </div>
          <p className="text-sm text-[var(--a-text-muted)] mt-1">
            {batch.teacher.name} · {batch.course.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setModal("edit")} className={SMALL_BTN}>
            Edit
          </button>
          {batch.status === "ARCHIVED" ? (
            <button onClick={() => setModal("reopen")} className={SMALL_BTN}>
              Reopen
            </button>
          ) : (
            <button
              onClick={() => setModal("archive")}
              disabled={members.length > 0}
              title={members.length > 0 ? "Move or remove its students before archiving" : "Archive this batch"}
              className={`${SMALL_BTN} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              Archive
            </button>
          )}
          {open && (
            <button
              onClick={() => setModal("add")}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] transition-colors"
            >
              + Add students
            </button>
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <Notice tone="warning">
          <p className="font-semibold mb-1">Some students are out of step with the batch</p>
          <ul className="list-disc list-inside space-y-0.5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="text-xs mt-1.5 opacity-80">
            The batch has one lesson sequence and does not wait for anyone. A student who was absent catches up from the
            class recording; their own progress and records are never changed.
          </p>
        </Notice>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          label="Teacher"
          action={
            open && (
              <button onClick={() => setModal("teacher")} className={SMALL_BTN}>
                Change
              </button>
            )
          }
        >
          <span className="flex items-center gap-2">
            <Avatar name={batch.teacher.name} src={batch.teacher.avatarUrl} size={28} />
            {batch.teacher.name}
          </span>
        </Stat>
        <Stat label="Curriculum">
          {batch.course.title}
          <span className="block text-xs text-[var(--a-text-faint)] mt-0.5">
            {formatProgress(batch.progress)}
            {batch.progress.completedThrough ? ` · taught through lesson ${batch.progress.completedThrough}` : ""}
          </span>
        </Stat>
        <Stat
          label="Schedule (Dhaka)"
          action={
            open && (
              <button onClick={() => setModal("schedule")} className={SMALL_BTN}>
                Change
              </button>
            )
          }
        >
          {formatSlots(batch.slots)}
          <span className="block text-xs text-[var(--a-text-faint)] mt-0.5">From {formatDate(`${batch.startDate}T00:00:00Z`)}</span>
        </Stat>
        <Stat label="Students">
          <SeatsChip memberCount={batch.memberCount} maxStudents={batch.maxStudents} />
        </Stat>
        <Stat label="Next class">
          {batch.nextSession ? (
            <>
              Lesson {batch.nextSession.lessonNumber}
              <span className="block text-xs text-[var(--a-text-faint)] mt-0.5">
                {formatDhakaDate(batch.nextSession.start)} · {formatDhakaTime(batch.nextSession.start)}
              </span>
            </>
          ) : members.length === 0 ? (
            <span className="text-[var(--a-text-muted)]">None — add a student to generate classes</span>
          ) : (
            <span className="text-[var(--a-text-muted)]">None scheduled</span>
          )}
        </Stat>
        {batch.notes && <Stat label="Notes">{batch.notes}</Stat>}
      </div>

      {/* Students */}
      <Card className="p-0 overflow-hidden">
        <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
          Students ({members.length})
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--a-text-faint)]">
                    No students yet. {open ? "Add students to start generating classes." : ""}
                  </td>
                </tr>
              )}
              {members.map((m) => (
                <tr key={m.studentUserId} className="border-b border-[var(--a-border)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.fullName} src={m.avatarUrl} size={32} />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/students/${m.studentUserId}`}
                          className="text-[var(--a-text)] font-medium hover:text-[var(--a-accent)]"
                        >
                          {m.fullName}
                        </Link>
                        <p className="text-xs text-[var(--a-text-faint)] truncate">{m.email}</p>
                      </div>
                      {m.accountStatus !== "ACTIVE" && <StatusBadge status={m.accountStatus} />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{m.grade ?? "—"}</td>
                  <td className="px-4 py-3">
                    <p className="text-[var(--a-text)]">
                      {m.completedLessons} of {batch.course.totalLessons} done
                    </p>
                    <span
                      className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${SYNC_STYLES[m.sync]}`}
                      title={`Next lesson for this student: ${m.nextLesson}`}
                    >
                      {SYNC_LABELS[m.sync]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)] whitespace-nowrap">
                    {m.attended} attended{m.missed > 0 ? ` · ${m.missed} missed` : ""}
                  </td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)] whitespace-nowrap">
                    {formatDate(m.joinedAt)}
                    {m.joinedAtLesson ? <span className="block text-xs text-[var(--a-text-faint)]">at lesson {m.joinedAtLesson}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setMoving(m)} className={SMALL_BTN}>
                        Move
                      </button>
                      <button
                        onClick={() => {
                          setRemoveError(null);
                          setRemoving(m);
                        }}
                        className={`${SMALL_BTN} text-[var(--a-danger)]`}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upcoming classes */}
      <Card className="p-0 overflow-hidden">
        <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
          Upcoming classes
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                <th className="px-4 py-3">Lesson</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time (Dhaka)</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {upcomingSessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--a-text-faint)]">
                    No classes scheduled.
                  </td>
                </tr>
              )}
              {upcomingSessions.map((s) => (
                <tr key={s.id} className="border-b border-[var(--a-border)] last:border-0">
                  <td className="px-4 py-3 text-[var(--a-text)]">Lesson {s.lessonNumber}</td>
                  <td className="px-4 py-3 text-[var(--a-text)]">{formatDhakaDate(s.start)}</td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">
                    {formatDhakaTime(s.start)} – {formatDhakaTime(s.end)}
                  </td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{s.students}</td>
                  <td className="px-4 py-3 text-right">
                    <ClassRowActions row={toClassRow(s, batch)} onChanged={load} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent classes */}
      {recentSessions.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
            Recent classes
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                  <th className="px-4 py-3">Lesson</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--a-border)] last:border-0">
                    <td className="px-4 py-3 text-[var(--a-text)]">Lesson {s.lessonNumber}</td>
                    <td className="px-4 py-3 text-[var(--a-text)]">
                      {formatDhakaDate(s.start)} · {formatDhakaTime(s.start)}
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">
                      {s.attended ?? 0} of {s.students} attended
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status === "UPCOMING" ? "SCHEDULED" : s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {formerMembers.length > 0 && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-2">Former students</p>
          <ul className="text-sm text-[var(--a-text-muted)] space-y-1">
            {formerMembers.map((f) => (
              <li key={`${f.studentUserId}-${f.leftAt}`}>
                <Link href={`/admin/students/${f.studentUserId}`} className="text-[var(--a-text)] hover:text-[var(--a-accent)]">
                  {f.fullName}
                </Link>{" "}
                — {formatDate(f.joinedAt)} to {formatDate(f.leftAt)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {modal === "edit" && <EditBatchModal batch={batch} onClose={() => setModal(null)} onSaved={load} />}
      {modal === "teacher" && <ChangeTeacherModal batch={batch} onClose={() => setModal(null)} onSaved={load} />}
      {modal === "schedule" && <ChangeScheduleModal batch={batch} onClose={() => setModal(null)} onSaved={load} />}
      {modal === "add" && <AddStudentModal batch={batch} onClose={() => setModal(null)} onChanged={load} />}

      {(modal === "archive" || modal === "reopen") && (
        <Modal
          title={modal === "archive" ? "Archive batch" : "Reopen batch"}
          onClose={archiveBusy ? () => {} : () => setModal(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--a-text)]">
              {modal === "archive"
                ? `Archive ${batch.name}? It disappears from the everyday list, accepts no students and holds no classes. Its history is kept.`
                : `Reopen ${batch.name}? It becomes active again and can take students.`}
            </p>
            {archiveError && <p className="text-sm text-[var(--a-danger)]">{archiveError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                disabled={archiveBusy}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => setArchived(modal === "archive")}
                disabled={archiveBusy}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60"
              >
                {archiveBusy ? "Working…" : modal === "archive" ? "Archive" : "Reopen"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {moving && (
        <MoveStudentModal
          student={{ id: moving.studentUserId, fullName: moving.fullName }}
          fromBatch={{ id: batch.id, name: batch.name }}
          onClose={() => setMoving(null)}
          onMoved={load}
        />
      )}

      {removing && (
        <Modal title="Remove from batch" onClose={removeBusy ? () => {} : () => setRemoving(null)}>
          <div className="space-y-4">
            <p className="text-sm text-[var(--a-text)]">
              Remove <strong>{removing.fullName}</strong> from <strong>{batch.name}</strong>?
            </p>
            <ul className="text-sm text-[var(--a-text-muted)] list-disc list-inside space-y-1">
              <li>Their upcoming classes in this batch are removed.</li>
              <li>Everything already taught stays on their record — attendance, homework, tests and badges.</li>
              <li>They stay a Batch student until placed in another batch or switched to 1-to-1.</li>
            </ul>
            {removeError && <p className="text-sm text-[var(--a-danger)]">{removeError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRemoving(null)}
                disabled={removeBusy}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={removeMember}
                disabled={removeBusy}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-danger)] hover:opacity-90 disabled:opacity-60"
              >
                {removeBusy ? "Removing…" : "Remove from batch"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// FILE PATH: client/components/admin/batches/BatchFormModals.tsx
//
// The forms that create and edit a batch itself (as opposed to placing students
// in it): the new-batch form, the small "edit details" form, change teacher and
// change schedule. Each shows the server's own refusal (a teacher double-booked,
// a name already used) in words and changes nothing when refused.

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Modal } from "@/components/admin/AdminUI";
import { parseApiError, type BatchSummary, type ParsedApiError } from "@/lib/batches";
import ScheduleFields, { EMPTY_SCHEDULE, scheduleProblem, type ScheduleDraft } from "./ScheduleFields";

const FIELD =
  "w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus";
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5";

interface TeacherOption {
  id: string;
  isSuspended?: boolean;
  user: { fullName: string };
}
interface CourseOption {
  id: string;
  title: string;
  sessions?: number;
  isActive?: boolean;
  isCustom?: boolean;
}

function Footer({
  busy,
  label,
  busyLabel,
  onCancel,
  onSubmit,
  error,
}: {
  busy: boolean;
  label: string;
  busyLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
  error: string | null;
}) {
  return (
    <>
      {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] transition-colors disabled:opacity-60"
        >
          {busy ? busyLabel : label}
        </button>
      </div>
    </>
  );
}

export function useTeachersAndCourses() {
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  useEffect(() => {
    api.get("/admin/teachers?limit=200").then((res) => setTeachers(res.data.teachers ?? []));
    api.get("/courses/admin/all").then((res) => setCourses(res.data ?? []));
  }, []);
  return {
    teachers: teachers.filter((t) => !t.isSuspended),
    // A custom curriculum is built for one student; batches teach the catalog.
    courses: courses.filter((c) => c.isActive !== false && !c.isCustom),
  };
}

export function CreateBatchModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (batchId: string) => void;
}) {
  const { teachers, courses } = useTeachersAndCourses();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [maxStudents, setMaxStudents] = useState(4);
  const [startLesson, setStartLesson] = useState(1);
  const [schedule, setSchedule] = useState<ScheduleDraft>(EMPTY_SCHEDULE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const course = courses.find((c) => c.id === courseId);

  const submit = async () => {
    if (name.trim().length < 2) return setError("Give the batch a name (at least 2 characters).");
    if (!teacherId) return setError("Choose the teacher.");
    if (!courseId) return setError("Choose the curriculum.");
    const problem = scheduleProblem(schedule);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/admin/batches", {
        name: name.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        teacherId,
        courseId,
        maxStudents,
        startLessonNumber: startLesson,
        firstClassDate: schedule.firstClassDate,
        slots: schedule.slots,
      });
      onCreated(res.data.batch.id);
    } catch (err) {
      setError(parseApiError(err, "Could not create the batch.").message);
      setBusy(false);
    }
  };

  return (
    <Modal title="New batch" onClose={busy ? () => {} : onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className={LABEL}>Batch name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. AI Builders — Evening"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Students (max)</label>
            <select value={maxStudents} onChange={(e) => setMaxStudents(Number(e.target.value))} className={FIELD}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n}
                  {n === 4 ? " (ideal)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Teacher</label>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={FIELD}>
              <option value="">Choose…</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.user.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Curriculum</label>
            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setStartLesson(1);
              }}
              className={FIELD}
            >
              <option value="">Choose…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Starts at lesson</label>
            <input
              type="number"
              min={1}
              max={course?.sessions ?? undefined}
              value={startLesson}
              onChange={(e) => setStartLesson(Math.max(1, Number(e.target.value) || 1))}
              className={FIELD}
            />
          </div>
        </div>
        <div>
          <label className={LABEL}>Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className={FIELD} />
        </div>
        <ScheduleFields
          value={schedule}
          onChange={setSchedule}
          dateHint="Classes are generated from this date once students are added — an empty batch holds no teacher time."
        />
        <Footer busy={busy} label="Create batch" busyLabel="Creating…" onCancel={onClose} onSubmit={submit} error={error} />
      </div>
    </Modal>
  );
}

export function EditBatchModal({
  batch,
  onClose,
  onSaved,
}: {
  batch: BatchSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(batch.name);
  const [notes, setNotes] = useState(batch.notes ?? "");
  const [maxStudents, setMaxStudents] = useState(batch.maxStudents);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (name.trim().length < 2) return setError("Give the batch a name (at least 2 characters).");
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/batches/${batch.id}`, {
        name: name.trim(),
        notes: notes.trim(),
        maxStudents,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(parseApiError(err, "Could not save.").message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit batch" onClose={busy ? () => {} : onClose}>
      <div className="space-y-4">
        <div>
          <label className={LABEL}>Batch name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Students (max)</label>
          <select value={maxStudents} onChange={(e) => setMaxStudents(Number(e.target.value))} className={FIELD}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n} disabled={n < batch.memberCount}>
                {n}
                {n === 4 ? " (ideal)" : ""}
                {n < batch.memberCount ? " — fewer than its students" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} className={FIELD} />
        </div>
        <Footer busy={busy} label="Save" busyLabel="Saving…" onCancel={onClose} onSubmit={submit} error={error} />
      </div>
    </Modal>
  );
}

export function ChangeTeacherModal({
  batch,
  onClose,
  onSaved,
}: {
  batch: BatchSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { teachers } = useTeachersAndCourses();
  const [teacherId, setTeacherId] = useState(batch.teacher.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (teacherId === batch.teacher.id) return onClose();
    setBusy(true);
    setError(null);
    try {
      await api.put(`/admin/batches/${batch.id}/teacher`, { teacherId });
      onSaved();
      onClose();
    } catch (err) {
      setError(parseApiError(err, "Could not change the teacher.").message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Change teacher" onClose={busy ? () => {} : onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text-muted)]">
          Every class of <strong className="text-[var(--a-text)]">{batch.name}</strong> that has not started moves to the new
          teacher, and they become the teacher of its students. Classes already taught keep their teacher. The new teacher&rsquo;s
          calendar is checked for each class.
        </p>
        <div>
          <label className={LABEL}>New teacher</label>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={FIELD}>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.user.fullName}
              </option>
            ))}
          </select>
        </div>
        <Footer busy={busy} label="Change teacher" busyLabel="Moving classes…" onCancel={onClose} onSubmit={submit} error={error} />
      </div>
    </Modal>
  );
}

export function ChangeScheduleModal({
  batch,
  onClose,
  onSaved,
}: {
  batch: BatchSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [schedule, setSchedule] = useState<ScheduleDraft>({
    firstClassDate: "",
    slots: batch.slots.length
      ? batch.slots.map((s) => ({
          weekday: s.weekday,
          time: `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`,
        }))
      : EMPTY_SCHEDULE.slots,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const problem = scheduleProblem(schedule);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await api.put(`/admin/batches/${batch.id}/schedule`, {
        firstClassDate: schedule.firstClassDate,
        slots: schedule.slots,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(parseApiError(err, "Could not change the schedule.").message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Change schedule" onClose={busy ? () => {} : onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text-muted)]">
          The classes of <strong className="text-[var(--a-text)]">{batch.name}</strong> that have not opened yet are rebuilt
          from the date below, one for each remaining lesson. A class that is under way and everything already taught stay
          exactly as they are. Students are told the new time.
        </p>
        <ScheduleFields value={schedule} onChange={setSchedule} />
        <Footer busy={busy} label="Rebuild schedule" busyLabel="Rebuilding…" onCancel={onClose} onSubmit={submit} error={error} />
      </div>
    </Modal>
  );
}

export function ChangeStartLessonModal({
  batch,
  startLesson,
  onClose,
  onSaved,
}: {
  batch: BatchSummary;
  startLesson: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lesson, setLesson] = useState(String(startLesson));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the server says some students would skip lessons: the admin must
  // accept it by pressing the button again.
  const [skipping, setSkipping] = useState<ParsedApiError["students"] | null>(null);
  const total = batch.course.totalLessons;
  const value = Number(lesson);
  const valid = Number.isInteger(value) && value >= 1 && value <= total;

  const submit = async () => {
    if (!valid) return setError(`Enter a lesson number from 1 to ${total}.`);
    if (value === startLesson) return onClose();
    setBusy(true);
    setError(null);
    try {
      await api.put(`/admin/batches/${batch.id}/start-lesson`, {
        startLessonNumber: value,
        ...(skipping ? { acceptSkippedLessons: true } : {}),
      });
      onSaved();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err, "Could not change the starting lesson.");
      setSkipping(parsed.code === "START_LESSON_CONFIRM_REQUIRED" ? parsed.students : null);
      setError(parsed.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Change starting lesson" onClose={busy ? () => {} : onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text-muted)]">
          <strong className="text-[var(--a-text)]">{batch.name}</strong> has not taught a class yet, so it can begin at any
          lesson of {batch.course.title}. The classes that have not opened yet are rebuilt from that lesson on the same
          weekly times. Students keep their own progress and records.
        </p>
        <div>
          <label className={LABEL}>Start at lesson (1–{total})</label>
          <input
            type="number"
            min={1}
            max={total}
            value={lesson}
            onChange={(e) => {
              setLesson(e.target.value);
              setSkipping(null);
              setError(null);
            }}
            className={FIELD}
          />
        </div>
        {skipping ? (
          <Footer
            busy={busy}
            label="Start here anyway"
            busyLabel="Rebuilding…"
            onCancel={onClose}
            onSubmit={submit}
            error={error}
          />
        ) : (
          <Footer busy={busy} label="Change lesson" busyLabel="Rebuilding…" onCancel={onClose} onSubmit={submit} error={error} />
        )}
      </div>
    </Modal>
  );
}

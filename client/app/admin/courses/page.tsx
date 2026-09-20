"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import { Card, Modal, StatusBadge, formatBDT } from "@/components/admin/AdminUI";

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  level: string;
  ageMin: number;
  ageMax: number;
  sessions: number;
  gemCost: number;
  priceCents: number | null;
  isActive: boolean;
  isCustom: boolean;
  _count: { lessons: number; assignedStudents: number };
}

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "create" | { course: Course }>(null);
  const [lessonsFor, setLessonsFor] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [downloadingSummary, setDownloadingSummary] = useState(false);

  const downloadDefaultSummary = async () => {
    setDownloadingSummary(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/curriculum/default-curriculum-summary.xlsx`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to generate summary");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lumexa-default-curriculums.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Best-effort — no persistent error surface needed for an admin export button.
    } finally {
      setDownloadingSummary(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    api.get("/courses/admin/all").then((res) => setCourses(res.data ?? [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const toggleActive = async (course: Course) => {
    await api.patch(`/courses/${course.id}`, { isActive: !course.isActive });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--a-text)]">Manage Courses</h1>
          <p className="text-sm text-[var(--a-text-muted)] mt-1">{courses.length} courses</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadDefaultSummary}
            disabled={downloadingSummary}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)] disabled:opacity-60"
          >
            {downloadingSummary ? "Preparing…" : "Export Default Curriculums (.xlsx)"}
          </button>
          <button
            onClick={() => setModal("create")}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]"
          >
            + New Course
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {/* overflow-x-auto + a min-w floor on the table is what lets the
            Actions column stay reachable by swiping sideways on mobile
            instead of the browser squeezing every column to fit — the
            -webkit-overflow-scrolling touch prop keeps the scroll feeling
            native on iOS. */}
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Ages</th>
                <th className="px-4 py-3">Lessons</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--a-text-faint)]">Loading…</td></tr>}
              {!loading && courses.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--a-text-faint)]">No courses yet.</td></tr>
              )}
              {!loading &&
                courses.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--a-border)] last:border-0">
                    <td className="px-4 py-3 text-[var(--a-text)] font-medium">
                      {c.title}
                      <span
                        className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase align-middle ${
                          c.isCustom
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                        }`}
                      >
                        {c.isCustom ? "Custom" : "Core"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{c.category}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{c.ageMin}–{c.ageMax}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{c._count.lessons}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">
                      {c.priceCents ? (
                        <>
                          {formatBDT(c.priceCents)}
                          <span className="text-xs text-[var(--a-text-faint)]"> ({formatBDT(Math.round(c.priceCents / c.sessions))}/lesson)</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{c._count.assignedStudents}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.isActive ? "ACTIVE" : "DEACTIVATED"} /></td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <a href={`/admin/courses/${c.id}/curriculum`} className="text-sm text-[var(--a-accent)] hover:underline">
                        Curriculum
                      </a>
                      {c.isCustom ? (
                        <a href={`/admin/courses/${c.id}/builder`} className="text-sm text-[var(--a-accent)] hover:underline">
                          Lessons
                        </a>
                      ) : (
                        <button onClick={() => setLessonsFor(c)} className="text-sm text-[var(--a-accent)] hover:underline">
                          Lessons
                        </button>
                      )}
                      <button onClick={() => setModal({ course: c })} className="text-sm text-[var(--a-accent)] hover:underline">
                        Edit
                      </button>
                      <button onClick={() => toggleActive(c)} className="text-sm text-[var(--a-text-muted)] hover:underline">
                        {c.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="text-sm text-[var(--a-danger)] hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <CourseFormModal
          course={modal === "create" ? null : modal.course}
          onClose={() => setModal(null)}
          onDone={load}
        />
      )}
      {lessonsFor && (
        <LessonsModal course={lessonsFor} onClose={() => setLessonsFor(null)} onDone={load} />
      )}
      {deleteTarget && (
        <DeleteCourseModal course={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={load} />
      )}
    </div>
  );
}

function DeleteCourseModal({
  course,
  onClose,
  onDone,
}: {
  course: Course;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmDelete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.delete(`/courses/${course.id}`);
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Couldn't delete this course.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Delete course" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text)]">
          Permanently delete <span className="font-semibold">{course.title}</span>? This removes its {course._count.lessons} lesson
          {course._count.lessons === 1 ? "" : "s"} and curriculum content. This can&apos;t be undone.
        </p>
        {course._count.assignedStudents > 0 && (
          <p className="text-sm text-[var(--a-warning-text)]">
            {course._count.assignedStudents} student{course._count.assignedStudents === 1 ? " is" : "s are"} currently assigned to
            this course — they&apos;ll be unassigned.
          </p>
        )}
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)]">
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-danger)] hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Deleting…" : "Delete course"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface StudentOption {
  id: string;
  fullName: string;
  email: string;
}

function CourseFormModal({
  course,
  onClose,
  onDone,
}: {
  course: Course | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    slug: course?.slug ?? "",
    title: course?.title ?? "",
    description: course?.description ?? "",
    category: course?.category ?? "",
    level: course?.level ?? "BEGINNER",
    sessions: course?.sessions ?? 8,
    priceTaka: course?.priceCents ? course.priceCents / 100 : "",
  });
  const [slugTouched, setSlugTouched] = useState(!!course);
  // New courses default to Custom — only the seeded 7-curriculum catalog is
  // "Core" (Course.isCustom starts false there); anything an admin creates
  // by hand is, by definition, not part of that official catalog unless
  // they deliberately flip this, so Core has to be an explicit opt-in
  // rather than something a plain "+ New Course" can accidentally leak into
  // the default-curriculum .xlsx export as. Editing reflects the real value.
  const [isCustom, setIsCustom] = useState(course ? course.isCustom : true);
  const [assignNow, setAssignNow] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const onTitleChange = (v: string) => {
    set("title", v);
    if (!slugTouched) set("slug", slugify(v));
  };

  // Student picker for "assign now" — loads a default browsable list of
  // students immediately (rather than requiring the admin already know a
  // name to type), then narrows as they search. Same pattern used across
  // admin — see SearchableList.
  useEffect(() => {
    if (!isCustom || !assignNow) return;
    const t = setTimeout(() => {
      api
        .get(`/admin/students?limit=20&search=${encodeURIComponent(studentQuery)}`)
        .then((res) => setStudentOptions(res.data?.students ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [isCustom, assignNow, studentQuery]);

  const submit = async () => {
    if (!form.title.trim() || !form.slug.trim() || !form.category.trim()) {
      setError("Title, slug, and category are required.");
      return;
    }
    if (assignNow && !selectedStudent) {
      setError("Pick a student to assign, or turn off \"Assign to a student now\".");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { priceTaka, ...rest } = form;
      const payload = {
        ...rest,
        sessions: Number(form.sessions),
        priceCents:
          priceTaka === "" || priceTaka === null
            ? undefined
            : Math.round(Number(priceTaka) * 100),
        isCustom,
        // A brand-new custom course stays out of the public catalog by
        // default — an existing course's active state is left alone on
        // edit (that's what the table's Activate/Deactivate button is for).
        ...(isCustom && !course ? { isActive: false } : {}),
      };
      let courseId = course?.id;
      if (course) {
        await api.patch(`/courses/${course.id}`, payload);
      } else {
        const res = await api.post("/courses", payload);
        courseId = res.data.id;
      }
      if (assignNow && selectedStudent && courseId) {
        await api.post(`/admin/students/${selectedStudent.id}/assign-course`, { courseId });
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
    <Modal title={course ? "Edit course" : "New course"} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Title" value={form.title} onChange={onTitleChange} />
          <LabeledInput
            label="Slug"
            value={form.slug}
            onChange={(v) => {
              setSlugTouched(true);
              set("slug", v);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Category" value={form.category} onChange={(v) => set("category", v)} />
          <LabeledInput label="Level" value={form.level} onChange={(v) => set("level", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Sessions" type="number" value={form.sessions} onChange={(v) => set("sessions", v)} />
          <div>
            <LabeledInput
              label="Price (BDT)"
              type="number"
              value={form.priceTaka}
              onChange={(v) => set("priceTaka", v === "" ? "" : v)}
            />
            <p className="text-xs text-[var(--a-text-faint)] mt-1">
              Used as the default per-lesson rate for students changing into this curriculum.
            </p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          />
        </div>

        <div className="pt-1 border-t border-[var(--a-border)]">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mt-3 mb-1.5">
            Curriculum type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border text-left transition-colors ${
                isCustom
                  ? "border-[var(--a-accent)] bg-[var(--a-accent)]/10 text-[var(--a-text)]"
                  : "border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)]"
              }`}
            >
              Custom
              <span className="block text-xs font-normal text-[var(--a-text-faint)]">
                Built for one or more specific students. Not shown in the public catalog or the default-curriculum export.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsCustom(false)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border text-left transition-colors ${
                !isCustom
                  ? "border-[var(--a-accent)] bg-[var(--a-accent)]/10 text-[var(--a-text)]"
                  : "border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)]"
              }`}
            >
              Core
              <span className="block text-xs font-normal text-[var(--a-text-faint)]">
                An official Lumexa curriculum — included in the default-curriculum export.
              </span>
            </button>
          </div>

          {isCustom && (
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm text-[var(--a-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignNow}
                  onChange={(e) => setAssignNow(e.target.checked)}
                  className="rounded border-[var(--a-border)]"
                />
                Assign to a student now
              </label>
              {assignNow && (
                <div className="mt-2 space-y-1.5">
                  <input
                    value={studentQuery}
                    onChange={(e) => {
                      setStudentQuery(e.target.value);
                      setSelectedStudent(null);
                    }}
                    placeholder="Search by name or email, or pick from the list below…"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
                  />
                  {selectedStudent ? (
                    <p className="text-sm text-[var(--a-success-text)]">
                      Assigning to <span className="font-semibold">{selectedStudent.fullName}</span> ({selectedStudent.email})
                    </p>
                  ) : (
                    studentOptions.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {studentOptions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudent(s);
                              setStudentQuery(s.fullName);
                              setStudentOptions([]);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-[var(--a-nav-hover)] text-[var(--a-text)]"
                          >
                            {s.fullName} <span className="text-[var(--a-text-faint)]">({s.email})</span>
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)]">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60"
          >
            {submitting ? "Saving…" : course ? "Save changes" : "Create course"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
      />
    </div>
  );
}

// Plain flat title/order editor for a Core course's lesson list. A Custom
// course uses the dedicated Curriculum Builder page instead (reuse-from-
// catalog, sequencing, PDF export) — see /admin/courses/[courseId]/builder.
function LessonsModal({ course, onClose, onDone }: { course: Course; onClose: () => void; onDone: () => void }) {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/courses/${course.slug}`)
      .then((res) => setLessons(res.data.lessons ?? []))
      .finally(() => setLoading(false));
  }, [course.slug]);

  useEffect(() => load(), [load]);

  const addLesson = async () => {
    if (!title.trim()) return;
    const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;
    await api.post(`/courses/${course.id}/lessons`, { title: title.trim(), order: nextOrder });
    setTitle("");
    load();
    onDone();
  };

  const removeLesson = async (id: string) => {
    await api.delete(`/courses/lessons/${id}`);
    load();
    onDone();
  };

  // Drag-to-reorder — reorders the local list immediately for a responsive
  // feel, then persists every lesson whose position actually changed as a
  // new `order` value.
  const dropAt = async (dropIndex: number) => {
    const fromIndex = dragIndex;
    setDragIndex(null);
    setDragOverIndex(null);
    if (fromIndex === null || fromIndex === dropIndex) return;

    const reordered = [...lessons];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    const originalOrderById = new Map(lessons.map((l) => [l.id, l.order]));
    const renumbered = reordered.map((l, i) => ({ ...l, order: i + 1 }));
    setLessons(renumbered);
    setReordering(true);
    try {
      await Promise.all(
        renumbered
          .filter((l) => originalOrderById.get(l.id) !== l.order)
          .map((l) => api.patch(`/courses/lessons/${l.id}`, { order: l.order })),
      );
      onDone();
    } finally {
      setReordering(false);
    }
  };

  return (
    <Modal title={`Lessons — ${course.title}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Or add a brand-new lesson title"
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          />
          <button onClick={addLesson} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]">
            Add
          </button>
        </div>
        {lessons.length > 1 && (
          <p className="text-xs text-[var(--a-text-faint)]">Drag a lesson to reorder it.</p>
        )}
        <div className="max-h-72 overflow-y-auto space-y-2">
          {loading && <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>}
          {!loading && lessons.length === 0 && <p className="text-sm text-[var(--a-text-muted)]">No lessons yet.</p>}
          {!loading &&
            lessons.map((l, i) => (
              <div
                key={l.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverIndex !== i) setDragOverIndex(i);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dropAt(i);
                }}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-[var(--a-surface-2)] cursor-grab active:cursor-grabbing select-none transition-colors ${
                  dragIndex === i
                    ? "opacity-50 border-[var(--a-border)]"
                    : dragOverIndex === i
                      ? "border-[var(--a-accent)]"
                      : "border-[var(--a-border)]"
                }`}
              >
                <span className="flex items-center gap-2 text-sm text-[var(--a-text)] min-w-0">
                  <span className="text-[var(--a-text-faint)] flex-shrink-0" aria-hidden="true">⠿</span>
                  <span className="truncate">{l.order}. {l.title}</span>
                </span>
                <button
                  onClick={() => removeLesson(l.id)}
                  className="text-xs text-[var(--a-danger)] hover:underline flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          {reordering && <p className="text-xs text-[var(--a-text-faint)]">Saving new order…</p>}
        </div>
      </div>
    </Modal>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import { Card, Modal, StatusBadge } from "@/components/admin/AdminUI";

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
  isActive: boolean;
  _count: { lessons: number; assignedStudents: number };
}

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "create" | { course: Course }>(null);
  const [lessonsFor, setLessonsFor] = useState<Course | null>(null);

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
        <button
          onClick={() => setModal("create")}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]"
        >
          + New Course
        </button>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Ages</th>
              <th className="px-4 py-3">Lessons</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--a-text-faint)]">Loading…</td></tr>}
            {!loading && courses.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--a-text-faint)]">No courses yet.</td></tr>
            )}
            {!loading &&
              courses.map((c) => (
                <tr key={c.id} className="border-b border-[var(--a-border)] last:border-0">
                  <td className="px-4 py-3 text-[var(--a-text)] font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{c.category}</td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{c.ageMin}–{c.ageMax}</td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{c._count.lessons}</td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{c._count.assignedStudents}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.isActive ? "ACTIVE" : "DEACTIVATED"} /></td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setLessonsFor(c)} className="text-sm text-[var(--a-accent)] hover:underline">
                      Lessons
                    </button>
                    <button onClick={() => setModal({ course: c })} className="text-sm text-[var(--a-accent)] hover:underline">
                      Edit
                    </button>
                    <button onClick={() => toggleActive(c)} className="text-sm text-[var(--a-text-muted)] hover:underline">
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
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
    </div>
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
  });
  const [slugTouched, setSlugTouched] = useState(!!course);
  const [isCustom, setIsCustom] = useState(false);
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

  // Student search for the "custom course" flow — same debounce pattern
  // used elsewhere in admin (see AssignModal on the student detail page).
  useEffect(() => {
    if (!isCustom || !studentQuery.trim()) {
      setStudentOptions([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get(`/admin/students?limit=8&search=${encodeURIComponent(studentQuery)}`)
        .then((res) => setStudentOptions(res.data?.students ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [isCustom, studentQuery]);

  const submit = async () => {
    if (!form.title.trim() || !form.slug.trim() || !form.category.trim()) {
      setError("Title, slug, and category are required.");
      return;
    }
    if (isCustom && !selectedStudent) {
      setError("Pick which student this custom course is for.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        sessions: Number(form.sessions),
        // Custom one-off courses stay out of the public catalog — they
        // exist only to be assigned directly to the student below.
        ...(isCustom ? { isActive: false } : {}),
      };
      let courseId = course?.id;
      if (course) {
        await api.patch(`/courses/${course.id}`, payload);
      } else {
        const res = await api.post("/courses", payload);
        courseId = res.data.id;
      }
      if (isCustom && selectedStudent && courseId) {
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
        <div className="grid grid-cols-3 gap-3">
          <LabeledInput label="Category" value={form.category} onChange={(v) => set("category", v)} />
          <LabeledInput label="Level" value={form.level} onChange={(v) => set("level", v)} />
          <LabeledInput label="Sessions" type="number" value={form.sessions} onChange={(v) => set("sessions", v)} />
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

        {!course && (
          <div className="pt-1 border-t border-[var(--a-border)]">
            <label className="flex items-center gap-2 pt-3 text-sm text-[var(--a-text)] cursor-pointer">
              <input
                type="checkbox"
                checked={isCustom}
                onChange={(e) => {
                  setIsCustom(e.target.checked);
                  if (e.target.checked && !form.category.trim()) set("category", "Custom");
                }}
                className="rounded border-[var(--a-border)]"
              />
              Custom course for one student
            </label>
            <p className="text-xs text-[var(--a-text-faint)] mt-1">
              e.g. Odyssey starting from course 3 onward. Won&apos;t be shown in the public catalog — assigned directly to the student below.
            </p>
            {isCustom && (
              <div className="mt-3 space-y-1.5">
                <input
                  value={studentQuery}
                  onChange={(e) => {
                    setStudentQuery(e.target.value);
                    setSelectedStudent(null);
                  }}
                  placeholder="Search student by name or email…"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
                />
                {selectedStudent ? (
                  <p className="text-sm text-[var(--a-success-text)]">
                    Assigning to <span className="font-semibold">{selectedStudent.fullName}</span> ({selectedStudent.email})
                  </p>
                ) : (
                  studentOptions.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1">
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

function LessonsModal({ course, onClose, onDone }: { course: Course; onClose: () => void; onDone: () => void }) {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(1);

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
    await api.post(`/courses/${course.id}/lessons`, { title: title.trim(), order });
    setTitle("");
    setOrder((o) => o + 1);
    load();
    onDone();
  };

  const removeLesson = async (id: string) => {
    await api.delete(`/courses/lessons/${id}`);
    load();
    onDone();
  };

  return (
    <Modal title={`Lessons — ${course.title}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lesson title"
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          />
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="w-20 px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          />
          <button onClick={addLesson} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]">
            Add
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto space-y-2">
          {loading && <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>}
          {!loading && lessons.length === 0 && <p className="text-sm text-[var(--a-text-muted)]">No lessons yet.</p>}
          {!loading &&
            lessons.map((l) => (
              <div key={l.id} className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)]">
                <span className="text-sm text-[var(--a-text)]">
                  {l.order}. {l.title} <span className="text-[var(--a-text-faint)]">({l.duration}min)</span>
                </span>
                <button onClick={() => removeLesson(l.id)} className="text-xs text-[var(--a-danger)] hover:underline">
                  Remove
                </button>
              </div>
            ))}
        </div>
      </div>
    </Modal>
  );
}

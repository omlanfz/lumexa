"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/axios";
import { Card } from "@/components/admin/AdminUI";

interface Course {
  id: string;
  slug: string;
  title: string;
  isCustom: boolean;
}
interface Lesson {
  id: string;
  title: string;
  order: number;
  type?: string;
}
interface ReusableLesson {
  id: string;
  title: string;
  order: number;
  duration: number;
  type: string;
  homework: string | null;
}
interface ReusableModule {
  moduleId: string | null;
  moduleTitle: string;
  stageNumber: number | null;
  lessons: ReusableLesson[];
}
interface ReusableCourse {
  courseId: string;
  courseTitle: string;
  category: string;
  totalSessions: number;
  modules: ReusableModule[];
}

const TYPE_LABELS: Record<string, string> = {
  LEARNING: "",
  COURSE_TEST: "Course Test",
  STAGE_TEST: "Stage Test",
  FINAL_TEST: "Final Test",
};

export default function CustomCurriculumBuilderPage() {
  const params = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [catalog, setCatalog] = useState<ReusableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState("");

  const loadCourse = useCallback(async () => {
    const res = await api.get("/courses/admin/all");
    const found = (res.data ?? []).find((c: Course) => c.id === params.courseId) ?? null;
    setCourse(found);
    return found as Course | null;
  }, [params.courseId]);

  const loadLessons = useCallback(async (slug: string) => {
    const res = await api.get(`/courses/${slug}`);
    setLessons(res.data.lessons ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadCourse()
      .then((c) => (c ? loadLessons(c.slug) : null))
      .finally(() => setLoading(false));
  }, [loadCourse, loadLessons]);

  useEffect(() => {
    setCatalogLoading(true);
    api
      .get("/curriculum/reusable-lessons")
      .then((res) => setCatalog(res.data ?? []))
      .finally(() => setCatalogLoading(false));
  }, []);

  const refreshLessons = () => course && loadLessons(course.slug);

  const addNewLesson = async () => {
    if (!newTitle.trim() || !course) return;
    const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;
    await api.post(`/courses/${course.id}/lessons`, { title: newTitle.trim(), order: nextOrder });
    setNewTitle("");
    refreshLessons();
  };

  const importLesson = async (sourceLessonId: string) => {
    if (!course) return;
    setImportingId(sourceLessonId);
    try {
      const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;
      await api.post(`/curriculum/courses/${course.id}/lessons/import`, { sourceLessonId, order: nextOrder });
      refreshLessons();
    } finally {
      setImportingId(null);
    }
  };

  const removeLesson = async (id: string) => {
    await api.delete(`/courses/lessons/${id}`);
    refreshLessons();
  };

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
    } finally {
      setReordering(false);
    }
  };

  const generatePdf = async () => {
    if (!course) return;
    setGeneratingPdf(true);
    setPdfError(null);
    try {
      const res = await api.post(`/curriculum/courses/${course.id}/curriculum-pdf`);
      window.open(res.data.url, "_blank");
    } catch (err: any) {
      setPdfError(err?.response?.data?.message ?? "Couldn't generate the curriculum PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const filteredCatalog = catalogFilter.trim()
    ? catalog
        .map((c) => ({
          ...c,
          modules: c.modules
            .map((m) => ({
              ...m,
              lessons: m.lessons.filter((l) => l.title.toLowerCase().includes(catalogFilter.trim().toLowerCase())),
            }))
            .filter((m) => m.lessons.length > 0),
        }))
        .filter((c) => c.modules.length > 0)
    : catalog;

  if (loading) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;
  if (!course) return <p className="text-sm text-[var(--a-danger)]">Course not found.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <a href="/admin/courses" className="text-sm text-[var(--a-accent)] hover:underline">
            ← Back to courses
          </a>
          <h1 className="text-2xl font-bold text-[var(--a-text)] mt-2">Curriculum Builder — {course.title}</h1>
          <p className="text-sm text-[var(--a-text-muted)] mt-1">
            {lessons.length} session{lessons.length === 1 ? "" : "s"} in this curriculum
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/admin/courses/${course.id}/curriculum`}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
          >
            View Curriculum
          </a>
          <button
            onClick={generatePdf}
            disabled={generatingPdf || lessons.length === 0}
            className="px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)] disabled:opacity-50"
          >
            {generatingPdf ? "Generating…" : "Download Curriculum PDF"}
          </button>
        </div>
      </div>
      {pdfError && <p className="text-sm text-[var(--a-danger)]">{pdfError}</p>}

      <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
        {/* Left: full reusable catalog, categorized by curriculum, in sequence */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--a-border)]">
            <h2 className="font-semibold text-[var(--a-text)]">Reuse from Lumexa&apos;s curriculums</h2>
            <p className="text-xs text-[var(--a-text-faint)] mt-0.5">
              Every session from every default curriculum, in teaching order. Click + Add to copy one into{" "}
              {course.title}.
            </p>
            <input
              value={catalogFilter}
              onChange={(e) => setCatalogFilter(e.target.value)}
              placeholder="Filter by lesson title…"
              className="mt-2 w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
            />
          </div>
          <div className="max-h-[75vh] overflow-y-auto divide-y divide-[var(--a-border)]">
            {catalogLoading && <p className="text-sm text-[var(--a-text-muted)] p-4">Loading catalog…</p>}
            {!catalogLoading && filteredCatalog.length === 0 && (
              <p className="text-sm text-[var(--a-text-muted)] p-4">No matching lessons.</p>
            )}
            {!catalogLoading &&
              filteredCatalog.map((c) => (
                <div key={c.courseId} className="p-4">
                  <h3 className="font-bold text-[var(--a-text)] mb-2">
                    {c.courseTitle} <span className="text-xs font-normal text-[var(--a-text-faint)]">({c.totalSessions} sessions)</span>
                  </h3>
                  <div className="space-y-3">
                    {c.modules.map((m) => (
                      <div key={m.moduleId ?? "loose"}>
                        <p className="text-xs uppercase tracking-wide text-[var(--a-text-faint)] font-semibold mb-1">
                          {m.stageNumber ? `Stage ${m.stageNumber} · ` : ""}
                          {m.moduleTitle}
                        </p>
                        <div className="space-y-1">
                          {m.lessons.map((l) => (
                            <div
                              key={l.id}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--a-surface-2)] text-sm"
                            >
                              <span className="text-[var(--a-text)] truncate min-w-0">
                                {l.order}. {l.title}
                                {TYPE_LABELS[l.type] && (
                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold uppercase align-middle">
                                    {TYPE_LABELS[l.type]}
                                  </span>
                                )}
                              </span>
                              <button
                                onClick={() => importLesson(l.id)}
                                disabled={importingId === l.id}
                                className="flex-shrink-0 text-xs font-medium text-[var(--a-accent)] hover:underline disabled:opacity-50"
                              >
                                {importingId === l.id ? "Adding…" : "+ Add"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Right: this custom course's built sequence */}
        <Card className="p-0 overflow-hidden lg:sticky lg:top-4">
          <div className="p-4 border-b border-[var(--a-border)]">
            <h2 className="font-semibold text-[var(--a-text)]">{course.title}</h2>
            <div className="flex gap-2 mt-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Or add a brand-new lesson"
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
              />
              <button
                onClick={addNewLesson}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]"
              >
                Add
              </button>
            </div>
            {lessons.length > 1 && <p className="text-xs text-[var(--a-text-faint)] mt-1.5">Drag to reorder.</p>}
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-3 space-y-2">
            {lessons.length === 0 && (
              <p className="text-sm text-[var(--a-text-muted)] px-1 py-2">
                No sessions yet — add some from the catalog on the left, or create a brand-new one above.
              </p>
            )}
            {lessons.map((l, i) => (
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
        </Card>
      </div>
    </div>
  );
}

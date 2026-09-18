'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/axios';

interface LessonRow {
  id: string;
  title: string;
  order: number;
  type: string;
  checkpoint: string | null;
  assessment: { id: string; type: string; title: string } | null;
}
interface ModuleRow {
  id: string;
  title: string;
  order: number;
  stageNumber: number | null;
  lessons: LessonRow[];
}
interface Structure {
  course: { id: string; title: string };
  modules: ModuleRow[];
  looseLessons: LessonRow[];
}

const TYPE_COLORS: Record<string, string> = {
  LEARNING: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  COURSE_TEST: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  STAGE_TEST: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  FINAL_TEST: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

const card = "rounded-2xl border dark:border-purple-900/20 border-purple-100 dark:bg-[#150a26] bg-white";

// Teacher-facing, read-only curriculum browser — reached from a student's
// "View Curriculum" button on /teacher-students, scoped to that student's
// actual assigned course (a teacher can teach different curricula to
// different students, so this always routes by courseId, never generically
// "the teacher's curriculum"). Every session links to the same Lesson
// Details content a student eventually sees, so the teacher can prepare
// for any class — completed or not yet scheduled — ahead of time.
export default function TeacherCurriculumPage() {
  const params = useParams<{ courseId: string }>();
  const [data, setData] = useState<Structure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/curriculum/courses/${params.courseId}/structure`);
      setData(res.data);
      setExpanded(new Set(res.data.modules.map((m: ModuleRow) => m.id)));
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Could not load this curriculum.');
    } finally {
      setLoading(false);
    }
  }, [params.courseId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <div className="max-w-3xl mx-auto p-6 animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-xl mt-6" />;
  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <button onClick={() => history.back()} className="text-sm text-purple-500 hover:underline">
        ← Back
      </button>
      <div>
        <h1 className="text-2xl font-bold text-[var(--t-text)]">{data.course.title}</h1>
        <p className="text-sm text-[var(--t-text-muted)]">
          {data.modules.reduce((s, m) => s + m.lessons.length, 0) + data.looseLessons.length} sessions across {data.modules.length} module(s)
        </p>
      </div>

      {data.modules.map((mod) => (
        <div key={mod.id} className={`${card} overflow-hidden`}>
          <button onClick={() => toggle(mod.id)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80">
            <span className="font-semibold text-[var(--t-text)]">
              {mod.stageNumber ? `Stage ${mod.stageNumber} · ` : ''}
              {mod.order}. {mod.title}
            </span>
            <span className="text-xs text-[var(--t-text-muted)]">{mod.lessons.length} sessions {expanded.has(mod.id) ? '▲' : '▼'}</span>
          </button>
          {expanded.has(mod.id) && (
            <div className="divide-y dark:divide-purple-900/20 divide-purple-100">
              {mod.lessons.map((l) => (
                <LessonRowView key={l.id} lesson={l} />
              ))}
            </div>
          )}
        </div>
      ))}

      {data.looseLessons.length > 0 && (
        <div className={`${card} overflow-hidden`}>
          <div className="px-4 py-3 font-semibold text-[var(--t-text)] border-b dark:border-purple-900/20 border-purple-100">
            Stage / Final Tests
          </div>
          <div className="divide-y dark:divide-purple-900/20 divide-purple-100">
            {data.looseLessons.map((l) => (
              <LessonRowView key={l.id} lesson={l} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LessonRowView({ lesson }: { lesson: LessonRow }) {
  return (
    <a
      href={`/curriculum-lesson/${lesson.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--t-text)] truncate">
            {lesson.order}. {lesson.title}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${TYPE_COLORS[lesson.type] || ''}`}>
            {lesson.type.replace('_', ' ')}
          </span>
        </div>
        {lesson.checkpoint && <p className="text-xs text-[var(--t-text-muted)] truncate">{lesson.checkpoint}</p>}
      </div>
      <span className="text-xs text-purple-500 flex-shrink-0">View Lesson →</span>
    </a>
  );
}

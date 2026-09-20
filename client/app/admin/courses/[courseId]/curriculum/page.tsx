'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/axios';
import { Card } from '@/components/admin/AdminUI';

interface CodeSnippet {
  label: string;
  language: string;
  code: string;
  part?: string;
}
interface LessonRow {
  id: string;
  title: string;
  order: number;
  type: string;
  objectives: string[];
  contentMarkdown: string | null;
  homework: string | null;
  checkpoint: string | null;
  codeSnippets: CodeSnippet[];
  project: { id: string; title: string } | null;
  assessment: { id: string; type: string; title: string; isPublished: boolean } | null;
}
interface ModuleRow {
  id: string;
  slug: string;
  title: string;
  order: number;
  stageNumber: number | null;
  lessons: LessonRow[];
  projects: { id: string; slug: string; title: string }[];
}
interface Structure {
  course: { id: string; title: string; isCustom: boolean };
  modules: ModuleRow[];
  looseLessons: LessonRow[];
}

const TYPE_COLORS: Record<string, string> = {
  LEARNING: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  COURSE_TEST: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  STAGE_TEST: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  FINAL_TEST: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

export default function AdminCurriculumPage() {
  const params = useParams<{ courseId: string }>();
  const [data, setData] = useState<Structure | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/curriculum/courses/${params.courseId}/structure`)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [params.courseId]);

  useEffect(() => load(), [load]);

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;
  if (!data) return null;

  const isFlatCustomCourse = data.course.isCustom && data.modules.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <a href="/admin/courses" className="text-sm text-[var(--a-accent)] hover:underline">
            ← Back to courses
          </a>
          <h1 className="text-2xl font-bold text-[var(--a-text)] mt-2">{data.course.title} — Curriculum</h1>
          <p className="text-sm text-[var(--a-text-muted)]">
            {data.modules.reduce((s, m) => s + m.lessons.length, 0) + data.looseLessons.length} sessions
            {data.modules.length > 0 ? ` across ${data.modules.length} module(s)` : ''}
          </p>
        </div>
        {data.course.isCustom && (
          <a
            href={`/admin/courses/${data.course.id}/builder`}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
          >
            Open Curriculum Builder
          </a>
        )}
      </div>

      {data.modules.map((mod) => (
        <Card key={mod.id} className="p-0 overflow-hidden">
          <button
            onClick={() => toggle(mod.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--a-nav-hover)]"
          >
            <span className="font-semibold text-[var(--a-text)]">
              {mod.stageNumber ? `Stage ${mod.stageNumber} · ` : ''}
              {mod.order}. {mod.title}
            </span>
            <span className="text-xs text-[var(--a-text-faint)]">{mod.lessons.length} sessions {expanded.has(mod.id) ? '▲' : '▼'}</span>
          </button>
          {expanded.has(mod.id) && (
            <div className="divide-y divide-[var(--a-border)]">
              {mod.lessons.map((l) => (
                <LessonRowView key={l.id} lesson={l} />
              ))}
            </div>
          )}
        </Card>
      ))}

      {data.looseLessons.length > 0 && (
        <Card className="p-0 overflow-hidden">
          {!isFlatCustomCourse && (
            <div className="px-4 py-3 font-semibold text-[var(--a-text)] border-b border-[var(--a-border)]">
              Stage / Final Tests
            </div>
          )}
          <div className="divide-y divide-[var(--a-border)]">
            {data.looseLessons.map((l) => (
              <LessonRowView key={l.id} lesson={l} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function LessonRowView({ lesson }: { lesson: LessonRow }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--a-text)] truncate">
            {lesson.order}. {lesson.title}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${TYPE_COLORS[lesson.type] || ''}`}>
            {lesson.type.replace('_', ' ')}
          </span>
        </div>
        {lesson.checkpoint && <p className="text-xs text-[var(--a-text-faint)] truncate">{lesson.checkpoint}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <a href={`/curriculum-lesson/${lesson.id}`} target="_blank" rel="noreferrer" className="text-xs text-[var(--a-accent)] hover:underline">
          View Lesson
        </a>
        <a href={`/admin/lessons/${lesson.id}/edit`} className="text-xs text-[var(--a-accent)] hover:underline">
          Edit Content
        </a>
        {lesson.assessment && (
          <a href={`/admin/assessments/${lesson.assessment.id}`} className="text-xs text-[var(--a-accent)] hover:underline">
            Question Bank {lesson.assessment.isPublished ? '' : '(unpublished)'}
          </a>
        )}
      </div>
    </div>
  );
}

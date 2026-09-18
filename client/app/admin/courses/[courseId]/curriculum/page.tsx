'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/axios';
import { Card, Modal } from '@/components/admin/AdminUI';

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
  const [editing, setEditing] = useState<LessonRow | null>(null);
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

  return (
    <div className="space-y-6">
      <div>
        <a href="/admin/courses" className="text-sm text-[var(--a-accent)] hover:underline">
          ← Back to courses
        </a>
        <h1 className="text-2xl font-bold text-[var(--a-text)] mt-2">Curriculum</h1>
        <p className="text-sm text-[var(--a-text-muted)]">
          {data.modules.reduce((s, m) => s + m.lessons.length, 0) + data.looseLessons.length} sessions across{' '}
          {data.modules.length} module(s)
        </p>
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
                <LessonRowView key={l.id} lesson={l} onEdit={() => setEditing(l)} />
              ))}
            </div>
          )}
        </Card>
      ))}

      {data.looseLessons.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 font-semibold text-[var(--a-text)] border-b border-[var(--a-border)]">
            Stage / Final Tests
          </div>
          <div className="divide-y divide-[var(--a-border)]">
            {data.looseLessons.map((l) => (
              <LessonRowView key={l.id} lesson={l} onEdit={() => setEditing(l)} />
            ))}
          </div>
        </Card>
      )}

      {editing && (
        <LessonEditModal
          lesson={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function LessonRowView({ lesson, onEdit }: { lesson: LessonRow; onEdit: () => void }) {
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
        <button onClick={onEdit} className="text-xs text-[var(--a-accent)] hover:underline">
          Edit Content
        </button>
        {lesson.assessment && (
          <a href={`/admin/assessments/${lesson.assessment.id}`} className="text-xs text-[var(--a-accent)] hover:underline">
            Question Bank {lesson.assessment.isPublished ? '' : '(unpublished)'}
          </a>
        )}
      </div>
    </div>
  );
}

function LessonEditModal({ lesson, onClose, onSaved }: { lesson: LessonRow; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(lesson.title);
  const [objectives, setObjectives] = useState(lesson.objectives.join('\n'));
  const [contentMarkdown, setContentMarkdown] = useState(lesson.contentMarkdown ?? '');
  const [homework, setHomework] = useState(lesson.homework ?? '');
  const [checkpoint, setCheckpoint] = useState(lesson.checkpoint ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/curriculum/lessons/${lesson.id}/content`, {
        title,
        objectives: objectives.split('\n').map((s) => s.trim()).filter(Boolean),
        contentMarkdown,
        homework,
        checkpoint,
      });
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit: ${lesson.title}`} onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="a-input" />
        </Field>
        <Field label="Learning objectives (one per line)">
          <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={4} className="a-input font-mono text-xs" />
        </Field>
        <Field label="Project checkpoint for this session">
          <input value={checkpoint} onChange={(e) => setCheckpoint(e.target.value)} className="a-input" />
        </Field>
        <Field label="Lesson material (Markdown)">
          <textarea value={contentMarkdown} onChange={(e) => setContentMarkdown(e.target.value)} rows={10} className="a-input font-mono text-xs" />
        </Field>
        <Field label="Homework / practice">
          <textarea value={homework} onChange={(e) => setHomework(e.target.value)} rows={3} className="a-input font-mono text-xs" />
        </Field>
        {lesson.codeSnippets?.length > 0 && (
          <p className="text-xs text-[var(--a-text-faint)]">
            {lesson.codeSnippets.length} code snippet(s) attached — imported from source content, edit via API/database for now.
          </p>
        )}
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)]">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      <style jsx global>{`
        .a-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--a-border);
          background: var(--a-surface-2);
          color: var(--a-text);
          font-size: 0.875rem;
        }
      `}</style>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

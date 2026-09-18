'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/axios';
import { Card, Modal } from '@/components/admin/AdminUI';

interface MCQQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  isPublished: boolean;
  tags: string[];
}
interface PracticalQuestion {
  id: string;
  title: string;
  instructions: string;
  language: string;
  starterCode: string | null;
  maxScore: number;
  isPublished: boolean;
}
interface AssessmentAdmin {
  id: string;
  title: string;
  type: string;
  instructions: string | null;
  mcqCount: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  passScorePct: number;
  isPublished: boolean;
  mcqQuestions: MCQQuestion[];
  practicalQuestions: PracticalQuestion[];
  lesson: { title: string; courseId: string; course: { title: string } };
  _count: { attempts: number };
}

export default function AssessmentAdminPage() {
  const params = useParams<{ assessmentId: string }>();
  const [data, setData] = useState<AssessmentAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingQ, setEditingQ] = useState<MCQQuestion | 'new' | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/assessments/${params.assessmentId}/admin`).then((res) => setData(res.data)).finally(() => setLoading(false));
  }, [params.assessmentId]);

  useEffect(() => load(), [load]);

  if (loading || !data) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;

  async function updateSettings(patch: Record<string, unknown>) {
    await api.patch(`/assessments/${params.assessmentId}/settings`, patch);
    load();
  }

  async function deleteMCQ(id: string) {
    await api.delete(`/assessments/mcq-questions/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <a href={`/admin/courses/${data.lesson.courseId}/curriculum`} className="text-sm text-[var(--a-accent)] hover:underline">
          ← Back to curriculum
        </a>
        <h1 className="text-2xl font-bold text-[var(--a-text)] mt-2">{data.title}</h1>
        <p className="text-sm text-[var(--a-text-muted)]">
          {data.lesson.course.title} · {data.type.replace('_', ' ')} · {data._count.attempts} attempt(s) so far
        </p>
      </div>

      <Card>
        <h2 className="font-semibold text-[var(--a-text)] mb-3">Settings</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="text-xs text-[var(--a-text-faint)]">
            MCQs drawn per attempt
            <input
              type="number"
              defaultValue={data.mcqCount}
              onBlur={(e) => updateSettings({ mcqCount: Number(e.target.value) })}
              className="a-input mt-1"
            />
          </label>
          <label className="text-xs text-[var(--a-text-faint)]">
            Pass score (%)
            <input
              type="number"
              defaultValue={data.passScorePct}
              onBlur={(e) => updateSettings({ passScorePct: Number(e.target.value) })}
              className="a-input mt-1"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--a-text)] mt-5">
            <input type="checkbox" checked={data.randomizeQuestions} onChange={(e) => updateSettings({ randomizeQuestions: e.target.checked })} />
            Randomize questions
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--a-text)] mt-5">
            <input type="checkbox" checked={data.randomizeOptions} onChange={(e) => updateSettings({ randomizeOptions: e.target.checked })} />
            Randomize options
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--a-text)] mt-4">
          <input type="checkbox" checked={data.isPublished} onChange={(e) => updateSettings({ isPublished: e.target.checked })} />
          Published (visible to students on test day)
        </label>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--a-border)]">
          <h2 className="font-semibold text-[var(--a-text)]">MCQ Question Bank ({data.mcqQuestions.length})</h2>
          <button onClick={() => setEditingQ('new')} className="text-sm text-[var(--a-accent)] hover:underline">
            + Add question
          </button>
        </div>
        <div className="divide-y divide-[var(--a-border)] max-h-[32rem] overflow-y-auto">
          {data.mcqQuestions.map((q) => (
            <div key={q.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--a-text)]">{q.questionText}</p>
                <p className="text-xs text-[var(--a-text-faint)] mt-1">
                  ✓ {q.options[q.correctIndex]} {!q.isPublished && <span className="text-[var(--a-danger)]">· unpublished</span>}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setEditingQ(q)} className="text-xs text-[var(--a-accent)] hover:underline">
                  Edit
                </button>
                <button onClick={() => deleteMCQ(q.id)} className="text-xs text-[var(--a-danger)] hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {data.mcqQuestions.length === 0 && <p className="px-4 py-6 text-sm text-[var(--a-text-faint)]">No questions yet.</p>}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--a-border)]">
          <h2 className="font-semibold text-[var(--a-text)]">Practical Question(s)</h2>
        </div>
        <div className="divide-y divide-[var(--a-border)]">
          {data.practicalQuestions.map((q) => (
            <div key={q.id} className="px-4 py-3">
              <p className="text-sm font-medium text-[var(--a-text)]">{q.title} <span className="text-xs text-[var(--a-text-faint)]">({q.language}, {q.maxScore} pts)</span></p>
              <p className="text-xs text-[var(--a-text-muted)] mt-1 whitespace-pre-line">{q.instructions}</p>
            </div>
          ))}
          {data.practicalQuestions.length === 0 && <p className="px-4 py-6 text-sm text-[var(--a-text-faint)]">No practical questions yet.</p>}
        </div>
      </Card>

      {editingQ && (
        <MCQEditModal
          assessmentId={params.assessmentId}
          question={editingQ === 'new' ? null : editingQ}
          onClose={() => setEditingQ(null)}
          onSaved={() => {
            setEditingQ(null);
            load();
          }}
        />
      )}

      <style jsx global>{`
        .a-input {
          width: 100%;
          padding: 0.4rem 0.6rem;
          border-radius: 0.5rem;
          border: 1px solid var(--a-border);
          background: var(--a-surface-2);
          color: var(--a-text);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function MCQEditModal({
  assessmentId,
  question,
  onClose,
  onSaved,
}: {
  assessmentId: string;
  question: MCQQuestion | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [questionText, setQuestionText] = useState(question?.questionText ?? '');
  const [options, setOptions] = useState<string[]>(question?.options ?? ['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(question?.correctIndex ?? 0);
  const [isPublished, setIsPublished] = useState(question?.isPublished ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!questionText.trim() || options.some((o) => !o.trim())) {
      setError('Question text and all 4 options are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { questionText, options, correctIndex, isPublished };
      if (question) await api.patch(`/assessments/mcq-questions/${question.id}`, payload);
      else await api.post(`/assessments/${assessmentId}/mcq-questions`, payload);
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={question ? 'Edit question' : 'New question'} onClose={onClose}>
      <div className="space-y-3">
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Question text"
          rows={2}
          className="a-input"
        />
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
            <input
              value={opt}
              onChange={(e) => setOptions((o) => o.map((x, xi) => (xi === i ? e.target.value : x)))}
              placeholder={`Option ${i + 1}`}
              className="a-input flex-1"
            />
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm text-[var(--a-text)]">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Published
        </label>
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
    </Modal>
  );
}

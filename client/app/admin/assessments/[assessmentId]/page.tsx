'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/axios';
import { Card, Modal } from '@/components/admin/AdminUI';

type Kind = 'MCQ' | 'TRUE_FALSE';

interface MCQQuestion {
  id: string;
  questionType: Kind;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  isPublished: boolean;
  editedByAdmin: boolean;
  bankKey: string | null;
}
interface PracticalQuestion {
  id: string;
  title: string;
  instructions: string;
  language: string;
  starterCode: string | null;
  maxScore: number;
  isPublished: boolean;
  rubric: { criterion: string; maxPoints: number; lookFor?: string }[] | null;
}
interface AssessmentAdmin {
  id: string;
  title: string;
  type: string;
  instructions: string | null;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  passScorePct: number;
  isPublished: boolean;
  mcqQuestions: MCQQuestion[];
  practicalQuestions: PracticalQuestion[];
  lesson: { title: string; courseId: string; course: { title: string } };
  _count: { attempts: number };
  bank: { assessmentId: string; isShared: boolean; sourceTitle: string | null; sourceCourseTitle: string | null; linkedCount: number };
  standard: {
    expectedMcq: number;
    expectedTrueFalse: number;
    expectedCodingProject: boolean;
    expectedTotalMarks: number;
    counts: { mcq: number; trueFalse: number; practical: number };
    meets: boolean;
    issues: string[];
  };
}

const TF_OPTIONS = ['True', 'False'];

export default function AssessmentAdminPage() {
  const params = useParams<{ assessmentId: string }>();
  const [data, setData] = useState<AssessmentAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingQ, setEditingQ] = useState<MCQQuestion | 'new' | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/assessments/${params.assessmentId}/admin`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.message ?? 'Could not load this question bank.'))
      .finally(() => setLoading(false));
  }, [params.assessmentId]);

  useEffect(() => load(), [load]);

  if (loading && !data) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;
  if (error || !data) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-[var(--a-danger)]">{error ?? 'Not found.'}</p>
        <button onClick={load} className="text-sm text-[var(--a-accent)] hover:underline">Try again</button>
      </div>
    );
  }

  async function updateSettings(patch: Record<string, unknown>) {
    try {
      await api.patch(`/assessments/${params.assessmentId}/settings`, patch);
      load();
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not save the setting.');
    }
  }

  async function deleteMCQ(q: MCQQuestion) {
    const shared = data!.bank.isShared || data!.bank.linkedCount > 0;
    const ok = window.confirm(
      `Delete this question?${shared ? '\n\nThis question bank is shared, so it disappears from every test that uses it.' : ''}\n\n“${q.questionText.slice(0, 120)}”`,
    );
    if (!ok) return;
    try {
      const res = await api.delete(`/assessments/mcq-questions/${q.id}`);
      setNotice(res.data?.unpublishedInstead ? 'That question has been answered by students before, so it was unpublished instead of deleted (their results stay intact).' : null);
      load();
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not delete the question.');
    }
  }

  const mcqs = data.mcqQuestions.filter((q) => q.questionType === 'MCQ');
  const tfs = data.mcqQuestions.filter((q) => q.questionType === 'TRUE_FALSE');
  const std = data.standard;

  const renderQuestion = (q: MCQQuestion, n: number) => (
    <div key={q.id} className="px-4 py-3 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--a-text)] whitespace-pre-wrap break-words">
          <span className="text-[var(--a-text-faint)] mr-1">{n}.</span>
          {q.questionText}
        </p>
        <p className="text-xs text-[var(--a-text-faint)] mt-1">
          ✓ {q.options[q.correctIndex]}
          {!q.isPublished && <span className="text-[var(--a-danger)]"> · unpublished</span>}
          {q.editedByAdmin && <span> · edited by an admin</span>}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => setEditingQ(q)} className="text-xs text-[var(--a-accent)] hover:underline">Edit</button>
        <button onClick={() => void deleteMCQ(q)} className="text-xs text-[var(--a-danger)] hover:underline">Delete</button>
      </div>
    </div>
  );

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

      {notice && <p role="status" className="text-sm rounded-lg px-3 py-2 bg-[var(--a-info-bg)] text-[var(--a-info)]">{notice}</p>}
      {error && <p role="alert" className="text-sm rounded-lg px-3 py-2 bg-[var(--a-danger-bg)] text-[var(--a-danger-text)]">{error}</p>}

      <div
        role="status"
        className={`rounded-xl px-4 py-3 text-sm ${std.meets ? 'bg-[var(--a-success-bg)] text-[var(--a-success-text)]' : 'bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]'}`}
      >
        {std.meets ? (
          <p>
            ✓ Meets the Lumexa test standard: {std.counts.mcq} multiple-choice + {std.counts.trueFalse} True/False
            {std.expectedCodingProject ? ' + 1 coding project' : ''} · {std.expectedTotalMarks} marks.
          </p>
        ) : (
          <>
            <p className="font-semibold">This question bank does not meet the Lumexa test standard yet</p>
            <p>
              Standard: {std.expectedMcq} multiple-choice + {std.expectedTrueFalse} True/False{std.expectedCodingProject ? ' + 1 coding project' : ''}. Currently published: {std.counts.mcq} + {std.counts.trueFalse}
              {std.counts.practical ? ` + ${std.counts.practical} coding project(s)` : ''}.
            </p>
            <ul className="list-disc list-inside">{std.issues.map((i) => <li key={i}>{i}</li>)}</ul>
          </>
        )}
      </div>

      {data.bank.isShared && (
        <div className="rounded-xl px-4 py-3 text-sm bg-[var(--a-info-bg)] text-[var(--a-info)]">
          This test reads its questions from <strong>{data.bank.sourceTitle}</strong> ({data.bank.sourceCourseTitle}). Questions are
          shared, not copied: editing them here changes the original bank too, for every course that uses it.
        </div>
      )}
      {!data.bank.isShared && data.bank.linkedCount > 0 && (
        <div className="rounded-xl px-4 py-3 text-sm bg-[var(--a-info-bg)] text-[var(--a-info)]">
          {data.bank.linkedCount} other test{data.bank.linkedCount === 1 ? '' : 's'} (in custom curricula) read their questions from this bank, so
          an edit here applies to them as well.
        </div>
      )}

      <Card>
        <h2 className="font-semibold text-[var(--a-text)] mb-1">Settings</h2>
        <p className="text-xs text-[var(--a-text-faint)] mb-3">Every attempt presents all published questions (one mark each). Questions are shuffled within each section for each student.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="text-xs text-[var(--a-text-faint)]">
            Pass score (%)
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={data.passScorePct}
              onBlur={(e) => void updateSettings({ passScorePct: Number(e.target.value) })}
              className="a-input mt-1"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--a-text)] mt-5">
            <input type="checkbox" checked={data.randomizeQuestions} onChange={(e) => void updateSettings({ randomizeQuestions: e.target.checked })} />
            Shuffle question order
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--a-text)] mt-5">
            <input type="checkbox" checked={data.randomizeOptions} onChange={(e) => void updateSettings({ randomizeOptions: e.target.checked })} />
            Shuffle MCQ options
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--a-text)] mt-4">
          <input type="checkbox" checked={data.isPublished} onChange={(e) => void updateSettings({ isPublished: e.target.checked })} />
          Published (students can start it in class)
        </label>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--a-border)]">
          <h2 className="font-semibold text-[var(--a-text)]">
            Multiple-choice ({mcqs.filter((q) => q.isPublished).length} published of {mcqs.length})
          </h2>
          <button onClick={() => setEditingQ('new')} className="text-sm text-[var(--a-accent)] hover:underline">+ Add question</button>
        </div>
        <div className="divide-y divide-[var(--a-border)] max-h-[32rem] overflow-y-auto">
          {mcqs.map((q, i) => renderQuestion(q, i + 1))}
          {mcqs.length === 0 && <p className="px-4 py-6 text-sm text-[var(--a-text-faint)]">No multiple-choice questions yet.</p>}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--a-border)]">
          <h2 className="font-semibold text-[var(--a-text)]">
            True / False ({tfs.filter((q) => q.isPublished).length} published of {tfs.length})
          </h2>
        </div>
        <div className="divide-y divide-[var(--a-border)] max-h-[24rem] overflow-y-auto">
          {tfs.map((q, i) => renderQuestion(q, i + 1))}
          {tfs.length === 0 && <p className="px-4 py-6 text-sm text-[var(--a-text-faint)]">No True/False questions yet.</p>}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--a-border)]">
          <h2 className="font-semibold text-[var(--a-text)]">Coding project{data.practicalQuestions.length === 1 ? '' : 's'}</h2>
          <p className="text-xs text-[var(--a-text-faint)]">Marked by the teacher against the rubric — never run or graded automatically.</p>
        </div>
        <div className="divide-y divide-[var(--a-border)]">
          {data.practicalQuestions.map((q) => (
            <div key={q.id} className="px-4 py-3">
              <p className="text-sm font-medium text-[var(--a-text)]">
                {q.title} <span className="text-xs text-[var(--a-text-faint)]">({q.language}, {q.maxScore} marks){!q.isPublished && ' · unpublished'}</span>
              </p>
              <p className="text-xs text-[var(--a-text-muted)] mt-1 whitespace-pre-line">{q.instructions}</p>
              {q.rubric && q.rubric.length > 0 && (
                <ul className="mt-2 text-xs text-[var(--a-text-muted)] space-y-0.5">
                  {q.rubric.map((r) => (
                    <li key={r.criterion}>
                      <strong>{r.criterion}</strong> ({r.maxPoints}){r.lookFor ? ` — ${r.lookFor}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {data.practicalQuestions.length === 0 && (
            <p className="px-4 py-6 text-sm text-[var(--a-text-faint)]">
              {std.expectedCodingProject ? 'No coding project yet — a Final Test needs one.' : 'None — Course and Stage tests have no coding project.'}
            </p>
          )}
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
  const [kind, setKind] = useState<Kind>(question?.questionType ?? 'MCQ');
  const [questionText, setQuestionText] = useState(question?.questionText ?? '');
  const [options, setOptions] = useState<string[]>(question && question.questionType === 'MCQ' ? question.options : ['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(question?.correctIndex ?? 0);
  const [explanation, setExplanation] = useState(question?.explanation ?? '');
  const [isPublished, setIsPublished] = useState(question?.isPublished ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const cleaned = options.map((o) => o.trim());
    if (!questionText.trim()) return setError('The question needs some text.');
    if (kind === 'MCQ') {
      if (cleaned.some((o) => !o)) return setError('All four options need text.');
      if (new Set(cleaned.map((o) => o.toLowerCase())).size !== 4) return setError('The four options must all be different.');
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        questionType: kind,
        questionText,
        options: kind === 'TRUE_FALSE' ? TF_OPTIONS : cleaned,
        correctIndex: kind === 'TRUE_FALSE' ? Math.min(correctIndex, 1) : correctIndex,
        explanation: explanation.trim() || undefined,
        isPublished,
      };
      if (question) await api.patch(`/assessments/mcq-questions/${question.id}`, payload);
      else await api.post(`/assessments/${assessmentId}/mcq-questions`, payload);
      onSaved();
    } catch (err) {
      setError((err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={question ? 'Edit question' : 'New question'} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-4 text-sm text-[var(--a-text)]">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={kind === 'MCQ'} onChange={() => { setKind('MCQ'); setCorrectIndex(0); }} /> Multiple choice (4 options)
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={kind === 'TRUE_FALSE'} onChange={() => { setKind('TRUE_FALSE'); setCorrectIndex(0); }} /> True / False
          </label>
        </div>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder={kind === 'TRUE_FALSE' ? 'Statement for the student to judge' : 'Question text (use ``` fences for code)'}
          rows={3}
          className="a-input"
        />
        {kind === 'MCQ'
          ? options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" aria-label={`Option ${i + 1} is correct`} checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
                <input
                  value={opt}
                  onChange={(e) => setOptions((o) => o.map((x, xi) => (xi === i ? e.target.value : x)))}
                  placeholder={`Option ${i + 1}`}
                  className="a-input flex-1"
                />
              </div>
            ))
          : TF_OPTIONS.map((opt, i) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-[var(--a-text)]">
                <input type="radio" name="correct-tf" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} /> The statement is {opt}
              </label>
            ))}
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Explanation shown with the result (optional)" rows={2} className="a-input" />
        <label className="flex items-center gap-2 text-sm text-[var(--a-text)]">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Published
        </label>
        {error && <p role="alert" className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)]">Cancel</button>
          <button
            onClick={() => void save()}
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

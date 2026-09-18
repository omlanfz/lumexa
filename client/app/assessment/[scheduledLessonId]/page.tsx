'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { getStoredRole } from '@/lib/storage';

interface MCQItem {
  id: string;
  questionText: string;
  options: string[];
  selectedIndex: number | null;
  answered: boolean;
  correctIndex?: number;
  isCorrect?: boolean;
  explanation?: string | null;
}
interface PracticalItem {
  id: string;
  title: string;
  instructions: string;
  language: string;
  starterCode: string | null;
  maxScore: number;
  submitted: boolean;
  code: string;
  deterministicResult: { passed: boolean; total: number; passedCount: number; cases: { name: string; passed: boolean; message: string }[] } | null;
  aiEvaluation: { available: boolean; score: number | null; strengths: string[]; issues: string[]; feedback: string; pending?: boolean } | null;
  score: number | null;
}
interface VivaQA {
  question: string;
  response: string;
  notes?: string;
}
interface AttemptState {
  id: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  assessment: { id: string; type: string; title: string; instructions: string; courseId: string; hasViva: boolean };
  mcq: MCQItem[];
  practical: PracticalItem[];
  viva: { questions: VivaQA[]; score: number | null; maxScore: number; remarks: string | null } | null;
  scores: {
    mcqScore: number | null; mcqMaxScore: number | null;
    practicalScore: number | null; practicalMaxScore: number | null;
    vivaScore: number | null; vivaMaxScore: number | null;
    totalScore: number | null; totalMaxScore: number | null; passed: boolean | null;
  };
}

export default function AssessmentPage() {
  const params = useParams<{ scheduledLessonId: string }>();
  const role = typeof window !== 'undefined' ? getStoredRole() : null;

  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeDraft, setCodeDraft] = useState<Record<string, string>>({});
  const [submittingPractical, setSubmittingPractical] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [vivaDraft, setVivaDraft] = useState<VivaQA[]>([{ question: '', response: '', notes: '' }]);
  const [vivaScore, setVivaScore] = useState('');
  const [vivaRemarks, setVivaRemarks] = useState('');
  const [vivaSubmitting, setVivaSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const details = await api.get(`/curriculum/scheduled-lessons/${params.scheduledLessonId}/details`);
      if (!details.data.available || !details.data.assessment?.id) {
        setError('This assessment is not available.');
        setLoading(false);
        return;
      }
      const res = await api.post(`/assessments/${details.data.assessment.id}/attempts/start`, {
        scheduledLessonId: params.scheduledLessonId,
      });
      setAttempt(res.data);
      const drafts: Record<string, string> = {};
      for (const p of res.data.practical) drafts[p.id] = p.code;
      setCodeDraft(drafts);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load this assessment.');
    } finally {
      setLoading(false);
    }
  }, [params.scheduledLessonId]);

  useEffect(() => {
    load();
  }, [load]);

  async function answerMCQ(questionId: string, selectedIndex: number) {
    if (!attempt) return;
    setAttempt({ ...attempt, mcq: attempt.mcq.map((q) => (q.id === questionId ? { ...q, selectedIndex, answered: true } : q)) });
    try {
      await api.post(`/assessments/attempts/${attempt.id}/mcq-answer`, { questionId, selectedIndex });
    } catch {
      // best-effort; a final review pass happens on full reload
    }
  }

  async function submitPractical(questionId: string) {
    if (!attempt) return;
    setSubmittingPractical(questionId);
    try {
      const res = await api.post(`/assessments/attempts/${attempt.id}/practical-submit`, {
        questionId,
        code: codeDraft[questionId] || '',
      });
      setAttempt({
        ...attempt,
        practical: attempt.practical.map((p) =>
          p.id === questionId
            ? { ...p, submitted: true, deterministicResult: res.data.deterministicResult, aiEvaluation: res.data.aiEvaluation, score: res.data.score }
            : p,
        ),
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not submit this practical task.');
    } finally {
      setSubmittingPractical(null);
    }
  }

  async function finalizeAttempt() {
    if (!attempt) return;
    setFinalizing(true);
    try {
      await api.post(`/assessments/attempts/${attempt.id}/submit`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not submit the assessment.');
    } finally {
      setFinalizing(false);
    }
  }

  async function submitViva() {
    if (!attempt) return;
    setVivaSubmitting(true);
    try {
      await api.post(`/assessments/attempts/${attempt.id}/viva`, {
        questions: vivaDraft.filter((q) => q.question.trim()),
        score: vivaScore ? Number(vivaScore) : undefined,
        remarks: vivaRemarks || undefined,
      });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not record the viva.');
    } finally {
      setVivaSubmitting(false);
    }
  }

  const backHref = role === 'TEACHER' ? '/schedule' : '/student-dashboard/learning?tab=lessons';

  if (loading) return <div className="max-w-3xl mx-auto p-6 animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-xl mt-6" />;
  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-500">{error}</p>
        <Link href={backHref} className="text-teal-600 hover:underline text-sm">
          ← Back
        </Link>
      </div>
    );
  }
  if (!attempt) return null;

  const isStudent = role === 'STUDENT';
  const isReviewer = role === 'TEACHER' || role === 'ADMIN';
  const readOnly = attempt.status !== 'IN_PROGRESS' || isReviewer;
  const canRecordViva = isReviewer && attempt.assessment.hasViva && (attempt.status === 'SUBMITTED' || attempt.status === 'GRADED') && !attempt.viva;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <Link href={backHref} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
        ← Back
      </Link>

      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">{attempt.assessment.type.replace('_', ' ')}</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{attempt.assessment.title}</h1>
        {attempt.assessment.instructions && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{attempt.assessment.instructions}</p>}
        <span
          className={`inline-block mt-2 text-xs px-2.5 py-1 rounded-full font-medium ${
            attempt.status === 'GRADED'
              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
              : attempt.status === 'SUBMITTED'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
          }`}
        >
          {attempt.status.replace('_', ' ')}
        </span>
      </div>

      {(attempt.status === 'GRADED' || attempt.status === 'SUBMITTED') && (
        <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-3">Results</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <ScoreTile label="MCQ" score={attempt.scores.mcqScore} max={attempt.scores.mcqMaxScore} />
            <ScoreTile label="Practical" score={attempt.scores.practicalScore} max={attempt.scores.practicalMaxScore} />
            {attempt.assessment.hasViva && <ScoreTile label="Viva" score={attempt.scores.vivaScore} max={attempt.scores.vivaMaxScore} />}
            <ScoreTile label="Total" score={attempt.scores.totalScore} max={100} suffix="%" highlight />
          </div>
          {attempt.status === 'GRADED' && (
            <p className={`mt-3 font-semibold ${attempt.scores.passed ? 'text-green-600' : 'text-red-500'}`}>
              {attempt.scores.passed ? '✅ Passed' : '❌ Did not pass'}
            </p>
          )}
        </section>
      )}

      {/* Part A — MCQ */}
      <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-3">Part A — Concept Check ({attempt.mcq.length} questions)</h2>
        <div className="space-y-5">
          {attempt.mcq.map((q, qi) => (
            <div key={q.id}>
              <p className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                {qi + 1}. {q.questionText}
              </p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isSelected = q.selectedIndex === oi;
                  const showCorrectness = q.correctIndex !== undefined;
                  const isCorrectOpt = showCorrectness && q.correctIndex === oi;
                  return (
                    <label
                      key={oi}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                        isSelected ? 'border-teal-500 bg-teal-500/10' : 'border-gray-200 dark:border-gray-700'
                      } ${showCorrectness && isCorrectOpt ? 'border-green-500 bg-green-500/10' : ''} ${
                        showCorrectness && isSelected && !isCorrectOpt ? 'border-red-400 bg-red-500/10' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={isSelected}
                        disabled={readOnly}
                        onChange={() => answerMCQ(q.id, oi)}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
              {q.explanation && attempt.status === 'GRADED' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">💡 {q.explanation}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Part B — Practical */}
      <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-3">Part B — Practical Challenge</h2>
        <div className="space-y-6">
          {attempt.practical.map((p) => (
            <div key={p.id}>
              <p className="font-medium text-gray-900 dark:text-white">{p.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line mb-2">{p.instructions}</p>
              <textarea
                value={codeDraft[p.id] ?? p.code}
                onChange={(e) => setCodeDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                disabled={readOnly}
                spellCheck={false}
                className="w-full h-56 font-mono text-sm rounded-lg bg-gray-900 text-gray-100 p-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {!readOnly && (
                <button
                  onClick={() => submitPractical(p.id)}
                  disabled={submittingPractical === p.id}
                  className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium"
                >
                  {submittingPractical === p.id ? 'Running…' : p.submitted ? 'Re-run & Save' : 'Run & Submit'}
                </button>
              )}

              {p.deterministicResult && (
                <div className="mt-3 text-sm">
                  <p className={`font-medium ${p.deterministicResult.passed ? 'text-green-600' : 'text-amber-600'}`}>
                    Automated tests: {p.deterministicResult.passedCount}/{p.deterministicResult.total} passed
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {p.deterministicResult.cases.map((c, i) => (
                      <li key={i} className={c.passed ? 'text-green-600' : 'text-red-500'}>
                        {c.passed ? '✓' : '✗'} {c.name}{!c.passed ? ` — ${c.message}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.aiEvaluation && p.aiEvaluation.available && !p.aiEvaluation.pending && (
                <div className="mt-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 rounded-lg p-3 text-sm">
                  <p className="font-medium text-purple-700 dark:text-purple-300">🤖 AI Feedback {p.aiEvaluation.score !== null ? `(${p.aiEvaluation.score}/100)` : ''}</p>
                  {p.aiEvaluation.feedback && <p className="text-gray-700 dark:text-gray-300 mt-1">{p.aiEvaluation.feedback}</p>}
                  {p.aiEvaluation.strengths?.length > 0 && (
                    <p className="text-green-600 mt-1">Strengths: {p.aiEvaluation.strengths.join(', ')}</p>
                  )}
                  {p.aiEvaluation.issues?.length > 0 && <p className="text-amber-600 mt-1">Issues: {p.aiEvaluation.issues.join(', ')}</p>}
                </div>
              )}
              {p.score !== null && (
                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">Score: {p.score}/{p.maxScore}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {attempt.status === 'IN_PROGRESS' && isStudent && (
        <button
          onClick={finalizeAttempt}
          disabled={finalizing}
          className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold"
        >
          {finalizing ? 'Submitting…' : 'Submit Assessment'}
        </button>
      )}

      {/* Part C — Viva (Final Test only) */}
      {attempt.assessment.hasViva && (
        <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-3">Part C — Viva / Demo</h2>
          {attempt.viva ? (
            <div className="space-y-2 text-sm">
              {(attempt.viva.questions || []).map((q, i) => (
                <div key={i} className="border-b border-gray-100 dark:border-gray-700 pb-2">
                  <p className="font-medium text-gray-900 dark:text-white">{q.question}</p>
                  <p className="text-gray-600 dark:text-gray-400">{q.response}</p>
                  {q.notes && <p className="text-xs text-gray-400 italic">{q.notes}</p>}
                </div>
              ))}
              <p className="font-semibold mt-2">Viva score: {attempt.viva.score ?? '—'}/{attempt.viva.maxScore}</p>
              {attempt.viva.remarks && <p className="text-gray-600 dark:text-gray-400">Remarks: {attempt.viva.remarks}</p>}
            </div>
          ) : canRecordViva ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ask 3–5 questions about the student&apos;s solution and record their responses.
              </p>
              {vivaDraft.map((qa, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    placeholder={`Question ${i + 1}`}
                    value={qa.question}
                    onChange={(e) => setVivaDraft((d) => d.map((x, xi) => (xi === i ? { ...x, question: e.target.value } : x)))}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm"
                  />
                  <input
                    placeholder="Student's response / notes"
                    value={qa.response}
                    onChange={(e) => setVivaDraft((d) => d.map((x, xi) => (xi === i ? { ...x, response: e.target.value } : x)))}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm"
                  />
                </div>
              ))}
              <button
                onClick={() => setVivaDraft((d) => [...d, { question: '', response: '', notes: '' }])}
                className="text-xs text-teal-600 hover:underline"
                type="button"
              >
                + Add another question
              </button>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Viva score (0-20)"
                  value={vivaScore}
                  onChange={(e) => setVivaScore(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm w-40"
                />
              </div>
              <textarea
                placeholder="Final remarks"
                value={vivaRemarks}
                onChange={(e) => setVivaRemarks(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm"
                rows={2}
              />
              <button
                onClick={submitViva}
                disabled={vivaSubmitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium"
              >
                {vivaSubmitting ? 'Saving…' : 'Save Viva & Finalize Grade'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isStudent ? 'Your teacher will record the viva after reviewing Parts A and B.' : 'Complete Parts A and B before recording the viva.'}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function ScoreTile({ label, score, max, suffix, highlight }: { label: string; score: number | null; max: number | null; suffix?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border ${highlight ? 'border-teal-500 bg-teal-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-bold text-gray-900 dark:text-white">
        {score !== null && score !== undefined ? `${Math.round(score * 10) / 10}${suffix || ''}` : '—'}
        {!suffix && max ? <span className="text-gray-400 font-normal">/{max}</span> : null}
      </p>
    </div>
  );
}

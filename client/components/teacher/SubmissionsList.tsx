'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/axios';

interface Submission {
  id: string;
  status: 'PENDING' | 'REVIEWED';
  fileUrl: string;
  fileName: string | null;
  note: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  feedback: string | null;
  student: { id: string; fullName: string; avatarUrl: string | null };
  lessonTitle: string;
  lessonNumber: number;
  courseTitle: string;
}

type Filter = 'ALL' | 'PENDING' | 'REVIEWED';

// Reusable review queue — used standalone at /teacher-submissions (every
// student) and embedded in the teacher-facing student profile's
// Submissions tab (scoped to one student via studentUserId).
export default function SubmissionsList({ studentUserId }: { studentUserId?: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const req = studentUserId
      ? api.get(`/submissions/student/${studentUserId}`)
      : api.get('/submissions');
    req
      .then((res) => setSubmissions(res.data ?? []))
      .catch((err) => setError(err?.response?.data?.message ?? 'Could not load submissions.'))
      .finally(() => setLoading(false));
  }, [studentUserId]);

  useEffect(() => load(), [load]);

  const visible = submissions.filter((s) => filter === 'ALL' || s.status === filter);
  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;

  const startReview = (s: Submission) => {
    setReviewing(s.id);
    setFeedback('');
  };

  const submitReview = async (id: string) => {
    setSubmittingReview(true);
    try {
      await api.patch(`/submissions/${id}/review`, { feedback: feedback.trim() || undefined });
      setReviewing(null);
      setFeedback('');
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not mark this reviewed.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['PENDING', 'REVIEWED', 'ALL'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)]'
                : 'text-[var(--t-text-muted)] hover:bg-[var(--t-nav-hover)]'
            }`}
          >
            {f === 'PENDING' ? `Pending (${pendingCount})` : f === 'REVIEWED' ? 'Reviewed' : 'All'}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-[var(--t-text-muted)]">Loading…</p>}
      {!loading && visible.length === 0 && (
        <p className="text-sm text-[var(--t-text-muted)]">
          {filter === 'PENDING' ? 'No submissions waiting on you.' : 'No submissions here yet.'}
        </p>
      )}

      <div className="space-y-3">
        {visible.map((s) => (
          <div key={s.id} className="t-card p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                {!studentUserId && (
                  <p className="text-sm font-semibold text-[var(--t-text)]">{s.student.fullName}</p>
                )}
                <p className="text-sm text-[var(--t-text)]">
                  {s.courseTitle} · Lesson {s.lessonNumber} · {s.lessonTitle}
                </p>
                <p className="text-xs text-[var(--t-text-muted)] mt-0.5">
                  Submitted {new Date(s.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' } as any)}
                </p>
                {s.note && <p className="text-xs text-[var(--t-text-muted)] mt-1 italic">&ldquo;{s.note}&rdquo;</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    s.status === 'PENDING'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                  }`}
                >
                  {s.status === 'PENDING' ? 'Pending' : 'Reviewed'}
                </span>
                <a
                  href={s.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-nav-hover)]"
                >
                  Open file
                </a>
                {s.status === 'PENDING' && reviewing !== s.id && (
                  <button
                    onClick={() => startReview(s)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)] hover:bg-[var(--t-nav-hover)]"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>

            {s.status === 'REVIEWED' && s.feedback && (
              <div className="mt-3 text-sm bg-teal-500/5 border border-teal-500/20 rounded-lg p-3 text-[var(--t-text)]">
                <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mb-1">Your feedback</p>
                {s.feedback}
              </div>
            )}

            {reviewing === s.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Feedback for the student (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--t-border)] bg-[var(--t-surface)] text-sm text-[var(--t-text)]"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => submitReview(s.id)}
                    disabled={submittingReview}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-teal-500 hover:bg-teal-400 text-black disabled:opacity-60"
                  >
                    {submittingReview ? 'Saving…' : 'Mark Reviewed'}
                  </button>
                  <button
                    onClick={() => setReviewing(null)}
                    className="text-xs px-3 py-1.5 rounded-lg text-[var(--t-text-muted)] hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

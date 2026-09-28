'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import { SUBMISSION_FEEDBACK_TAGS } from '@/lib/submissionFeedbackTags';

interface SubmissionFile {
  url: string;
  name: string | null;
}

type SubmissionStatus = 'PENDING' | 'APPROVED' | 'NEEDS_CHANGES';

interface Submission {
  id: string;
  status: SubmissionStatus;
  files: SubmissionFile[];
  links: string[];
  note: string | null;
  rating: number | null;
  feedbackTags: string[];
  resubmissionCount: number;
  submittedAt: string;
  reviewedAt: string | null;
  feedback: string | null;
  student: { id: string; fullName: string; avatarUrl: string | null };
  lessonTitle: string;
  lessonNumber: number;
  courseTitle: string;
}

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'NEEDS_CHANGES';

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  PENDING: 'Needs Review',
  APPROVED: 'Approved',
  NEEDS_CHANGES: 'Needs Changes',
};

const STATUS_BADGE: Record<SubmissionStatus, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  APPROVED: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
  NEEDS_CHANGES: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
};

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-400 text-sm tracking-tight" aria-label={`${value} out of 5 stars`}>
      {'★'.repeat(value)}
      <span className="text-[var(--t-text-muted)]">{'★'.repeat(5 - value)}</span>
    </span>
  );
}

// Reusable review queue — used standalone at /teacher-submissions (every
// student, grouped by student) and embedded in the teacher-facing student
// profile's Submissions tab (scoped to one student via studentUserId).
export default function SubmissionsList({ studentUserId }: { studentUserId?: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'NEEDS_CHANGES' | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customFeedback, setCustomFeedback] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
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

  // Grouped by student for the all-students view — a teacher with several
  // pending submissions from the same student should see them together.
  // Groups with pending work sort first, then by most recent submission.
  const groups = useMemo(() => {
    if (studentUserId) return null;
    const byStudent = new Map<string, { student: Submission['student']; items: Submission[] }>();
    for (const s of visible) {
      const g = byStudent.get(s.student.id);
      if (g) g.items.push(s);
      else byStudent.set(s.student.id, { student: s.student, items: [s] });
    }
    return Array.from(byStudent.values()).sort((a, b) => {
      const aPending = a.items.some((s) => s.status === 'PENDING');
      const bPending = b.items.some((s) => s.status === 'PENDING');
      if (aPending !== bPending) return aPending ? -1 : 1;
      const aLatest = Math.max(...a.items.map((s) => new Date(s.submittedAt).getTime()));
      const bLatest = Math.max(...b.items.map((s) => new Date(s.submittedAt).getTime()));
      return bLatest - aLatest;
    });
  }, [visible, studentUserId]);

  const startReview = (s: Submission) => {
    setReviewingId(s.id);
    setReviewStatus(null);
    setRating(0);
    setSelectedTags([]);
    setCustomFeedback('');
    setReviewError(null);
  };

  const cancelReview = () => setReviewingId(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const submitReview = async (id: string) => {
    if (!reviewStatus) {
      setReviewError('Choose Approved or Needs Changes.');
      return;
    }
    if (reviewStatus === 'NEEDS_CHANGES' && selectedTags.length === 0 && !customFeedback.trim()) {
      setReviewError('Feedback is required when requesting changes — pick a suggestion or write your own.');
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await api.patch(`/submissions/${id}/review`, {
        status: reviewStatus,
        rating: rating > 0 ? rating : undefined,
        feedbackTags: selectedTags,
        feedback: customFeedback.trim() || undefined,
      });
      setReviewingId(null);
      load();
    } catch (err: any) {
      setReviewError(err?.response?.data?.message ?? 'Could not save this review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderCard = (s: Submission, showStudentName: boolean) => (
    <div key={s.id} className="t-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {showStudentName && (
            <p className="text-sm font-semibold text-[var(--t-text)]">{s.student.fullName}</p>
          )}
          <p className="text-sm text-[var(--t-text)]">
            {s.courseTitle} · Lesson {s.lessonNumber} · {s.lessonTitle}
          </p>
          <p className="text-xs text-[var(--t-text-muted)] mt-0.5">
            {s.resubmissionCount > 0 ? 'Resubmitted' : 'Submitted'}{' '}
            {new Date(s.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' } as any)}
          </p>
          {s.note && <p className="text-xs text-[var(--t-text-muted)] mt-1 italic">&ldquo;{s.note}&rdquo;</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {s.resubmissionCount > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Resubmission #{s.resubmissionCount}
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status]}`}>
            {STATUS_LABEL[s.status]}
          </span>
          {s.status !== 'PENDING' && s.rating && <Stars value={s.rating} />}
          {s.files.map((f, i) => (
            <a
              key={`f-${i}`}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-nav-hover)] truncate max-w-[160px]"
            >
              📎 {f.name || `File ${i + 1}`}
            </a>
          ))}
          {s.links.map((l, i) => (
            <a
              key={`l-${i}`}
              href={l}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-nav-hover)] truncate max-w-[160px]"
            >
              🔗 Link
            </a>
          ))}
          {s.status === 'PENDING' && reviewingId !== s.id && (
            <button
              onClick={() => startReview(s)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)] hover:bg-[var(--t-nav-hover)]"
            >
              Review
            </button>
          )}
        </div>
      </div>

      {s.status !== 'PENDING' && (s.feedback || s.feedbackTags.length > 0) && (
        <div
          className={`mt-3 text-sm rounded-lg p-3 border ${
            s.status === 'NEEDS_CHANGES'
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-teal-500/5 border-teal-500/20'
          }`}
        >
          <p
            className={`text-xs font-semibold mb-1 ${
              s.status === 'NEEDS_CHANGES' ? 'text-red-600 dark:text-red-400' : 'text-teal-600 dark:text-teal-400'
            }`}
          >
            Your feedback
          </p>
          {s.feedbackTags.length > 0 && (
            <ul className="list-disc list-inside text-[var(--t-text)] mb-1">
              {s.feedbackTags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          {s.feedback && <p className="text-[var(--t-text)]">{s.feedback}</p>}
        </div>
      )}

      {reviewingId === s.id && (
        <div className="mt-3 space-y-3 border-t border-[var(--t-border)] pt-3">
          <div>
            <p className="text-xs font-medium text-[var(--t-text-muted)] mb-1">Rating</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  className={`text-2xl leading-none ${n <= rating ? 'text-amber-400' : 'text-[var(--t-text-muted)]'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--t-text-muted)] mb-1">Status</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReviewStatus('APPROVED')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium border ${
                  reviewStatus === 'APPROVED'
                    ? 'bg-teal-500 border-teal-500 text-black'
                    : 'border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-nav-hover)]'
                }`}
              >
                ✅ Approved
              </button>
              <button
                type="button"
                onClick={() => setReviewStatus('NEEDS_CHANGES')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium border ${
                  reviewStatus === 'NEEDS_CHANGES'
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-nav-hover)]'
                }`}
              >
                🔄 Needs Changes
              </button>
            </div>
          </div>

          {reviewStatus === 'NEEDS_CHANGES' && (
            <div>
              <p className="text-xs font-medium text-[var(--t-text-muted)] mb-1">Quick feedback (pick any)</p>
              <div className="flex flex-wrap gap-1.5">
                {SUBMISSION_FEEDBACK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      selectedTags.includes(tag)
                        ? 'bg-[var(--t-nav-active)] border-[var(--t-nav-active)] text-[var(--t-nav-active-text)]'
                        : 'border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-nav-hover)]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={customFeedback}
            onChange={(e) => setCustomFeedback(e.target.value)}
            placeholder={
              reviewStatus === 'NEEDS_CHANGES'
                ? 'Add specific feedback (required if no suggestion is selected)'
                : 'Add a note for the student (optional)'
            }
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-[var(--t-border)] bg-[var(--t-surface)] text-sm text-[var(--t-text)]"
          />

          {reviewError && <p className="text-xs text-red-500">{reviewError}</p>}

          <div className="flex items-center gap-2">
            <button
              onClick={() => submitReview(s.id)}
              disabled={submittingReview}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-teal-500 hover:bg-teal-400 text-black disabled:opacity-60"
            >
              {submittingReview ? 'Saving…' : 'Submit Review'}
            </button>
            <button onClick={cancelReview} className="text-xs px-3 py-1.5 rounded-lg text-[var(--t-text-muted)] hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(['PENDING', 'NEEDS_CHANGES', 'APPROVED', 'ALL'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)]'
                : 'text-[var(--t-text-muted)] hover:bg-[var(--t-nav-hover)]'
            }`}
          >
            {f === 'PENDING'
              ? `Needs Review (${pendingCount})`
              : f === 'NEEDS_CHANGES'
                ? 'Needs Changes'
                : f === 'APPROVED'
                  ? 'Approved'
                  : 'All'}
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

      {groups ? (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.student.id}>
              <div className="flex items-center gap-2 mb-2">
                {g.student.avatarUrl ? (
                  <img src={g.student.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7B61FF] to-[#5B3FCF] flex items-center justify-center text-white text-[10px] font-bold">
                    {g.student.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="text-sm font-semibold text-[var(--t-text)]">{g.student.fullName}</p>
                <span className="text-xs text-[var(--t-text-muted)]">
                  {g.items.length} submission{g.items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-3">{g.items.map((s) => renderCard(s, false))}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">{visible.map((s) => renderCard(s, false))}</div>
      )}
    </div>
  );
}

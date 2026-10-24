'use client';

// The teacher's Test Evaluations queue: every submitted test, newest work that
// needs the teacher first. Each row is a report card (auto-graded on submit).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listReports } from '@/lib/assessment/api';
import { errorMessage } from '@/lib/assessment/api';
import { formatMarks, formatPercent, reportStatusMeta } from '@/lib/assessment/progress';
import type { ReportListItem } from '@/lib/assessment/types';
import ReportStatusBadge from './ReportStatusBadge';

type Filter = 'PENDING' | 'READY_TO_SHARE' | 'SHARED_WITH_PARENTS' | 'ALL';
type TypeFilter = 'ALL' | 'COURSE_TEST' | 'STAGE_TEST' | 'FINAL_TEST';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'PENDING', label: 'Needs your review' },
  { key: 'READY_TO_SHARE', label: 'Ready to share' },
  { key: 'SHARED_WITH_PARENTS', label: 'Shared with parents' },
  { key: 'ALL', label: 'All' },
];

export default function TestEvaluationsList({ studentUserId }: { studentUserId?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [type, setType] = useState<TypeFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listReports(studentUserId ? { studentUserId } : undefined));
    } catch (err) {
      setError(errorMessage(err, 'Could not load test evaluations.'));
    } finally {
      setLoading(false);
    }
  }, [studentUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      PENDING: items.filter((i) => i.needsAction).length,
      READY_TO_SHARE: items.filter((i) => i.status === 'READY_TO_SHARE').length,
      SHARED_WITH_PARENTS: items.filter((i) => i.status === 'SHARED_WITH_PARENTS').length,
      ALL: items.length,
    }),
    [items],
  );

  const visible = items.filter((i) => {
    if (type !== 'ALL' && i.assessmentType !== type) return false;
    if (filter === 'PENDING') return i.needsAction;
    if (filter === 'ALL') return true;
    return i.status === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter test evaluations">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key ? 'bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)]' : 'text-[var(--t-text-muted)] hover:bg-[var(--t-nav-hover)]'
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TypeFilter)}
          aria-label="Test type"
          className="ml-auto rounded-lg border border-[var(--t-border)] bg-[var(--t-surface)] px-2 py-1.5 text-xs text-[var(--t-text)]"
        >
          <option value="ALL">All test types</option>
          <option value="COURSE_TEST">Course tests</option>
          <option value="STAGE_TEST">Stage tests</option>
          <option value="FINAL_TEST">Final tests</option>
        </select>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--t-danger-bg)] p-3 text-sm text-[var(--t-danger)]">
          <span>{error}</span>
          <button onClick={() => void load()} className="rounded-lg border border-current px-3 py-1 text-xs font-medium">
            Try again
          </button>
        </div>
      )}
      {loading && <p className="text-sm text-[var(--t-text-muted)]">Loading test evaluations…</p>}
      {!loading && !error && visible.length === 0 && (
        <div className="t-card p-8 text-center">
          <p className="font-semibold text-[var(--t-text)]">
            {filter === 'PENDING' ? 'Nothing is waiting for you' : 'No reports here yet'}
          </p>
          <p className="mt-1 text-sm text-[var(--t-text-muted)]">
            {filter === 'PENDING'
              ? 'When a student submits a test, its report card appears here instantly — already auto-graded.'
              : 'Reports move through these stages as you review, approve and share them.'}
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {visible.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => router.push(`/teacher-test-evaluations/${r.id}`)}
              className="t-card t-card-hover w-full p-4 text-left"
              aria-label={`Open ${r.student.fullName}'s ${r.testTitle} report`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {r.student.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.student.avatarUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7B61FF] to-[#5B3FCF] text-sm font-bold text-white">
                      {r.student.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--t-text)]">{r.student.fullName}</p>
                    <p className="truncate text-xs text-[var(--t-text-muted)]">
                      {r.testTitle} · {r.typeLabel} · {r.courseTitle}
                    </p>
                    <p className="text-[11px] text-[var(--t-text-faint)]">
                      Submitted {new Date(r.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="text-right text-xs text-[var(--t-text-muted)]">
                    <p>
                      Objective{' '}
                      <span className="font-semibold text-[var(--t-text)]">
                        {formatMarks(r.objectiveScore)}/{formatMarks(r.objectiveMaxScore)}
                      </span>
                      {r.objectiveScore !== r.autoObjectiveScore && (
                        <span className="ml-1 text-[10px] text-[var(--t-warning)]" title={`Auto-graded ${formatMarks(r.autoObjectiveScore)}`}>
                          edited
                        </span>
                      )}
                    </p>
                    {r.hasCodingProject && (
                      <p>
                        Coding{' '}
                        <span className="font-semibold text-[var(--t-text)]">
                          {r.codingScore === null ? 'not marked' : `${formatMarks(r.codingScore)}/${formatMarks(r.codingMaxScore)}`}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="min-w-[3.5rem] text-right">
                    <p className="text-lg font-bold tabular-nums text-[var(--t-text)]">{formatPercent(r.percentage)}</p>
                    {r.passed !== null && (
                      <p className={`text-[10px] font-semibold ${r.passed ? 'text-[var(--t-success)]' : 'text-[var(--t-warning)]'}`}>
                        {r.passed ? 'Pass' : 'Below pass mark'}
                      </p>
                    )}
                  </div>
                  <ReportStatusBadge status={r.status} />
                </div>
              </div>
              {r.needsAction && <p className="mt-2 text-xs text-[var(--t-text-muted)]">{reportStatusMeta(r.status).hint}</p>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

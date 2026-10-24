'use client';

import { useRouter } from 'next/navigation';
import TestEvaluationsList from '@/components/teacher/TestEvaluationsList';

export default function TeacherTestEvaluationsPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <button
          onClick={() => router.push('/teacher-dashboard')}
          className="mb-1 text-sm text-[var(--t-text-muted)] hover:text-[var(--t-text)]"
        >
          ← Dashboard
        </button>
        <h1 className="text-2xl font-bold text-[var(--t-text)] sm:text-3xl">Test Evaluations</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--t-text-muted)]">
          Report cards for every test your students submit. Multiple-choice and True/False are graded automatically the moment
          a student submits; you review, mark any coding project, approve, and share the result with the parent.
        </p>
      </div>
      <TestEvaluationsList />
    </div>
  );
}

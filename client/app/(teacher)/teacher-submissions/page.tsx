'use client';

import { useRouter } from 'next/navigation';
import SubmissionsList from '@/components/teacher/SubmissionsList';

export default function TeacherSubmissionsPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <button
            onClick={() => router.push('/teacher-dashboard')}
            className="text-sm text-[var(--t-text-muted)] hover:text-[var(--t-text)] mb-1"
          >
            ← Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--t-text)]">Submissions</h1>
          <p className="text-sm text-[var(--t-text-muted)] mt-1">Review homework your students have submitted.</p>
        </div>
      </div>

      <SubmissionsList />
    </div>
  );
}

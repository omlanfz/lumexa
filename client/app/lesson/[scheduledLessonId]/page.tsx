'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { getStoredRole } from '@/lib/storage';
import LessonDetailsView, { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';

export default function LessonDetailsPage() {
  const params = useParams<{ scheduledLessonId: string }>();
  const router = useRouter();
  const [data, setData] = useState<LessonDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const role = typeof window !== 'undefined' ? getStoredRole() : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<LessonDetailsResponse>(`/curriculum/scheduled-lessons/${params.scheduledLessonId}/details`);
        if (!cancelled) setData(res.data);
      } catch (err: unknown) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        if (!cancelled) setError(message || 'Could not load this lesson.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.scheduledLessonId]);

  const backHref = role === 'TEACHER' ? '/schedule' : '/student-dashboard/learning?tab=lessons';

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="animate-pulse h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="animate-pulse h-40 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto p-6">
        <p className="text-red-500">{error}</p>
        <Link href={backHref} className="text-teal-600 hover:underline text-sm">
          ← Back
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-[1400px] mx-auto px-3 py-5 sm:px-6 sm:py-6">
      <Link href={backHref} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
        ← Back
      </Link>
      <LessonDetailsView
        data={data}
        onTestAction={() => router.push(`/assessment/${params.scheduledLessonId}`)}
        isStudent={role === 'STUDENT'}
        onSubmissionChange={(submission) => setData((d) => (d ? { ...d, submission } : d))}
      />
    </div>
  );
}

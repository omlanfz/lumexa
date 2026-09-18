'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/axios';
import LessonDetailsView, { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';

// Teacher/admin curriculum browsing — a catalog Lesson viewed on its own,
// not tied to a specific scheduled class (so it's always unlocked). Used
// from /admin/courses/[id]/curriculum and from a teacher's per-student
// "View Curriculum" page so they can prepare for lessons that haven't been
// scheduled for a particular student yet.
export default function CatalogLessonDetailsPage() {
  const params = useParams<{ lessonId: string }>();
  const [data, setData] = useState<LessonDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<LessonDetailsResponse>(`/curriculum/lessons/${params.lessonId}/details`);
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
  }, [params.lessonId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="animate-pulse h-40 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <button onClick={() => history.back()} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
        ← Back
      </button>
      <LessonDetailsView data={data} />
    </div>
  );
}

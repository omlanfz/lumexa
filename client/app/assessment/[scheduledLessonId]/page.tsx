'use client';

// Standalone test page — the same experience as inside the live classroom
// (AssessmentRunner), for resuming a test after leaving the class, opening
// results later, or a teacher/admin looking in. Students sit the test with
// <AssessmentRunner/>; teachers and admins get the monitor and a path to the
// report card.

import { useSyncExternalStore } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getStoredRole } from '@/lib/storage';
import AssessmentRunner from '@/components/assessment/AssessmentRunner';
import TeacherTestMonitor from '@/components/assessment/TeacherTestMonitor';

export default function AssessmentPage() {
  const params = useParams<{ scheduledLessonId: string }>();
  // localStorage is only readable in the browser: `undefined` on the server
  // and during hydration, then the stored role — so both renders agree.
  const role = useSyncExternalStore(
    () => () => {},
    () => getStoredRole(),
    () => undefined,
  );

  const backHref = role === 'TEACHER' ? '/schedule' : role === 'ADMIN' ? '/admin/classes' : '/student-dashboard/learning?tab=lessons';

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
      <Link href={backHref} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
        ← Back
      </Link>
      {role === undefined ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      ) : role === 'STUDENT' ? (
        <AssessmentRunner scheduledLessonId={params.scheduledLessonId} variant="page" />
      ) : (
        <TeacherTestMonitor scheduledLessonId={params.scheduledLessonId} variant="teacher" />
      )}
    </div>
  );
}

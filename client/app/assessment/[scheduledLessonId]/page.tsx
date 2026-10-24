'use client';

// The test page. For a student this IS their test: it opens in its own browser
// tab when they press "Start test" in the classroom (?autostart=1), so it can use
// the whole window and is never covered by a screen share. Teachers and admins
// get the class's live progress (with the lock buttons, for the teacher) and the
// test they are running.

import { Suspense, useState, useSyncExternalStore } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getStoredRole } from '@/lib/storage';
import AssessmentRunner from '@/components/assessment/AssessmentRunner';
import ClassTestMonitor from '@/components/assessment/ClassTestMonitor';
import TeacherTestMonitor from '@/components/assessment/TeacherTestMonitor';

export default function AssessmentPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--s-bg)]" />}>
      <AssessmentPageInner />
    </Suspense>
  );
}

function AssessmentPageInner() {
  const params = useParams<{ scheduledLessonId: string }>();
  const searchParams = useSearchParams();
  // Read once: ?autostart=1 is for the first load only (the runner takes it off
  // the address afterwards, which must not re-trigger anything).
  const [autostart] = useState(() => searchParams.get('autostart') === '1');
  // localStorage is only readable in the browser: `undefined` on the server
  // and during hydration, then the stored role — so both renders agree.
  const role = useSyncExternalStore(
    () => () => {},
    () => getStoredRole(),
    () => undefined,
  );

  if (role === undefined) {
    return <div className="min-h-dvh bg-[var(--s-bg)]" />;
  }

  if (role === 'STUDENT') {
    return (
      <div className="min-h-dvh bg-[var(--s-bg)] text-[var(--s-text)]">
        <AssessmentRunner
          scheduledLessonId={params.scheduledLessonId}
          autostart={autostart}
          backHref="/student-dashboard/learning?tab=lessons"
          backLabel="Back to my lessons"
        />
      </div>
    );
  }

  const backHref = role === 'TEACHER' ? '/schedule' : '/admin/classes';
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <Link href={backHref} className="inline-block text-sm text-teal-600 hover:underline dark:text-teal-400">
        ← Back
      </Link>
      <ClassTestMonitor scheduledLessonId={params.scheduledLessonId} variant="teacher" layout="page" canLock={role === 'TEACHER'} />
      <TeacherTestMonitor scheduledLessonId={params.scheduledLessonId} variant="teacher" showStudents={false} />
    </div>
  );
}

'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import ClassroomExperience from '@/components/classroom/ClassroomExperience';

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

function ClassroomPageContent({ params }: PageProps) {
  const searchParams = useSearchParams();
  const { bookingId: id } = use(params);
  // Curriculum classes (Operations-generated ScheduledLesson), batch classes
  // and marketplace bookings all land on this same route — ?type= tells us
  // which id this is, so we post the right field to /classroom/join:
  //   ?type=lesson  a scheduled lesson (a 1:1 class, or one student's row of a
  //                 batch class)
  //   ?type=batch   a batch class by its own id (the teacher's way in)
  //   ?type=trial   a free trial class by its id (the assigned teacher's way
  //                 in; the parent uses the public /trial/join/<token> page)
  const type = searchParams.get('type');
  const isBatch = type === 'batch';
  const isTrial = type === 'trial';
  const isLesson = type === 'lesson' || isBatch;

  return <ClassroomExperience id={id} isLesson={isLesson} isBatch={isBatch} isTrial={isTrial} />;
}

export default function ClassroomPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="cr-root min-h-screen flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-2 border-[var(--cr-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--cr-text-muted)] text-sm">Connecting to classroom…</p>
        </div>
      }
    >
      <ClassroomPageContent params={params} />
    </Suspense>
  );
}

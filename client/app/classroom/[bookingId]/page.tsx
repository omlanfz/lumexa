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
  // Curriculum classes (Operations-generated ScheduledLesson) and marketplace
  // bookings both land on this same route — ?type=lesson tells us which id
  // this is, so we post the right field to /classroom/join.
  const isLesson = searchParams.get('type') === 'lesson';

  return <ClassroomExperience id={id} isLesson={isLesson} />;
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

// FILE PATH: client/components/classroom/LessonPanel.tsx
//
// Embeds the actual lesson content as the classroom's default "stage" when
// no one is screen sharing — this is what lets a teacher teach straight
// from the classroom instead of opening a second tab and screen-sharing it
// (which is what caused the shared-screen recursion in the first place).
//
// A TEST session (Course/Stage/Final Test) is different: there is no lesson
// material to read. The student does NOT sit the test here — they share their
// whole screen while testing, and a screen share takes over the stage — so
// "Start test" opens it in its own tab (StudentTestLauncher), and this panel
// only reports on it. The teacher sees the test they are running; every
// student's progress, and the lock buttons, are in the ClassTestMonitor dock
// that ClassroomRoom keeps above the stage whatever the stage is showing.

'use client';

import { BookOpen } from 'lucide-react';
import LessonDetailsView, { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';
import StudentTestLauncher from '@/components/assessment/StudentTestLauncher';
import TeacherTestMonitor from '@/components/assessment/TeacherTestMonitor';
import { getStoredRole } from '@/lib/storage';

interface LessonPanelProps {
  data: LessonDetailsResponse | null;
}

export default function LessonPanel({ data }: LessonPanelProps) {
  if (!data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-[var(--cr-text-muted)] gap-2">
        <BookOpen size={28} className="opacity-40" />
        <p className="text-sm">No lesson material linked to this session.</p>
      </div>
    );
  }

  const scheduledLessonId = data.session.scheduledLessonId;
  if (data.available && data.isTest && scheduledLessonId) {
    const role = getStoredRole();
    return (
      <div className="w-full h-full overflow-y-auto cr-scroll bg-[var(--cr-surface)] rounded-2xl">
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--cr-text-faint)]">
            {data.session.courseTitle} · Session {data.session.lessonNumber}
          </p>
          <h1 className="mb-4 mt-1 text-xl font-bold text-[var(--cr-text)]">{data.lesson?.title ?? 'Test'}</h1>
          {role === 'STUDENT' ? (
            <StudentTestLauncher key={scheduledLessonId} scheduledLessonId={scheduledLessonId} />
          ) : (
            <TeacherTestMonitor key={scheduledLessonId} scheduledLessonId={scheduledLessonId} variant="classroom" showStudents={false} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto cr-scroll bg-[var(--cr-surface)] rounded-2xl">
      <div className="max-w-3xl mx-auto p-5 sm:p-8 [&_h1]:text-[var(--cr-text)] [&_h2]:text-[var(--cr-text)] [&_p]:text-[var(--cr-text-muted)] [&_li]:text-[var(--cr-text-muted)] [&_section]:bg-[var(--cr-surface-2)] [&_section]:border-[var(--cr-border)] [&_pre]:bg-black/40 dark">
        <LessonDetailsView data={data} />
      </div>
    </div>
  );
}

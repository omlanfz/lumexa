// FILE PATH: client/components/classroom/LessonPanel.tsx
//
// Embeds the actual lesson content as the classroom's default "stage" when
// no one is screen sharing — this is what lets a teacher teach straight
// from the classroom instead of opening a second tab and screen-sharing it
// (which is what caused the shared-screen recursion in the first place).
//
// A TEST session (Course/Stage/Final Test) is different: there is no lesson
// material to read, so the panel hosts the test itself — the student sits it
// right here (AssessmentRunner), and the teacher gets a live monitor with the
// question preview and a link to the report card (TeacherTestMonitor). Nobody
// has to leave the classroom.

'use client';

import { BookOpen, ClipboardList } from 'lucide-react';
import LessonDetailsView, { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';
import AssessmentRunner from '@/components/assessment/AssessmentRunner';
import TeacherTestMonitor from '@/components/assessment/TeacherTestMonitor';
import { getStoredRole } from '@/lib/storage';

interface LessonPanelProps {
  data: LessonDetailsResponse | null;
  /** The test is already open in the main classroom area, so this (side)
   *  panel must not mount a second copy of it — two live answer sheets for
   *  the same attempt would fight each other. */
  testHostedElsewhere?: boolean;
}

export default function LessonPanel({ data, testHostedElsewhere }: LessonPanelProps) {
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
          {testHostedElsewhere ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--cr-border)] bg-[var(--cr-surface-2)] p-6 text-center text-sm text-[var(--cr-text-muted)]">
              <ClipboardList size={24} className="opacity-60" />
              <p className="font-medium text-[var(--cr-text)]">The test is open in the main classroom area.</p>
              <p>It is shown there so your answers are only ever saved from one place.</p>
            </div>
          ) : role === 'STUDENT' ? (
            <AssessmentRunner key={scheduledLessonId} scheduledLessonId={scheduledLessonId} variant="classroom" />
          ) : (
            <TeacherTestMonitor key={scheduledLessonId} scheduledLessonId={scheduledLessonId} variant="classroom" />
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

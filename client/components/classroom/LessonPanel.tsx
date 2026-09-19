// FILE PATH: client/components/classroom/LessonPanel.tsx
//
// Embeds the actual lesson content as the classroom's default "stage" when
// no one is screen sharing — this is what lets a teacher teach straight
// from the classroom instead of opening a second tab and screen-sharing it
// (which is what caused the shared-screen recursion in the first place).

'use client';

import { BookOpen } from 'lucide-react';
import LessonDetailsView, { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';

export default function LessonPanel({ data }: { data: LessonDetailsResponse | null }) {
  if (!data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-[var(--cr-text-muted)] gap-2">
        <BookOpen size={28} className="opacity-40" />
        <p className="text-sm">No lesson material linked to this session.</p>
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

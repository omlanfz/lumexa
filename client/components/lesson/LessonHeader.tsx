// FILE PATH: client/components/lesson/LessonHeader.tsx
//
// Where this lesson sits, then its title. The hierarchy reads
//
//     AI Builder Path › Computer Vision Projects › Session 12 · Lesson 3 of 8
//
// and the two numbers mean different things, which the page says out loud:
//   Session N      — the class's place in the whole course (tests are sessions too);
//   Lesson i of M  — the lesson's place among the learning lessons of its module.
// Both come from the real course structure (server: numbering), never from the text.

import type { LessonDetailsResponse } from '@/lib/lesson/types';

export default function LessonHeader({ data, actions }: { data: LessonDetailsResponse; actions?: React.ReactNode }) {
  const n = data.numbering;
  const session = n?.session ?? data.session.lessonNumber;
  const stage = n?.module?.stageNumber ? `Stage ${n.module.stageNumber} · ` : '';
  const when = data.session.start
    ? new Date(data.session.start).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;
  const minutes = data.lesson?.duration;

  return (
    <header className="mb-6 mt-3">
      <nav aria-label="Where this lesson is">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <li>{data.session.courseTitle}</li>
          {n?.module && (
            <>
              <li aria-hidden="true">›</li>
              <li>
                {stage}
                {n.module.title}
              </li>
            </>
          )}
          <li aria-hidden="true">›</li>
          <li className="font-semibold text-gray-700 dark:text-gray-200">
            <span title={`Session ${session} — this is class number ${session} in the whole course (test sessions count too).`}>Session {session}</span>
            {n?.lessonIndex && n.lessonTotal ? (
              <>
                {' · '}
                <span title={`Lesson ${n.lessonIndex} of ${n.lessonTotal} — the ${n.lessonIndex}${['th', 'st', 'nd', 'rd'][n.lessonIndex % 10 > 3 || [11, 12, 13].includes(n.lessonIndex % 100) ? 0 : n.lessonIndex % 10]} learning lesson in this ${n.module ? 'module' : 'course'}.`}>
                  Lesson {n.lessonIndex} of {n.lessonTotal}
                </span>
              </>
            ) : null}
          </li>
        </ol>
      </nav>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 flex-1 text-2xl font-bold leading-tight text-gray-900 dark:text-white sm:text-3xl">{data.lesson?.title || `Session ${session}`}</h1>
        {actions}
      </div>
      {(when || minutes || data.session.batchName) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
          {minutes ? <span>⏱ {minutes} min</span> : null}
          {when ? <span>{when}</span> : null}
          {data.session.batchName ? <span>Batch: {data.session.batchName}</span> : null}
        </p>
      )}
    </header>
  );
}

'use client';

// FILE PATH: client/components/lesson/TeacherPrepPanel.tsx
//
// The teacher's private preparation area: instructor notes, review notes and the quiz
// answer key. It is fetched only when a teacher (or admin) opens it, from an endpoint
// that refuses anyone else — so it is never part of the lesson a student receives or
// the page a teacher shares on screen — and it is not rendered in Presentation Mode.

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { errorMessage } from '@/lib/homeworkFiles';
import type { LessonLink, TeacherPrep } from '@/lib/lesson/types';
import { LessonRenderContext, useLessonRender } from './LessonContext';
import LessonMarkdown from './LessonMarkdown';
import InlineMarkdown from './InlineMarkdown';

type Prep = TeacherPrep & { refs?: Record<string, LessonLink | null> };

export default function TeacherPrepPanel({ lessonId }: { lessonId: string }) {
  const [open, setOpen] = useState(false);
  const [prep, setPrep] = useState<Prep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ctx = useLessonRender();

  useEffect(() => {
    if (!open || prep) return;
    let cancelled = false;
    api
      .get<Prep>(`/curriculum/lessons/${lessonId}/teacher-prep`)
      .then((res) => !cancelled && setPrep(res.data))
      .catch((err) => !cancelled && setError(errorMessage(err, 'Could not load the preparation notes.')));
    return () => {
      cancelled = true;
    };
  }, [open, prep, lessonId]);

  return (
    <details
      id="teacher-prep"
      className="rounded-2xl border-2 border-dashed border-amber-500/50 bg-amber-50/60 dark:bg-amber-900/10 p-4 sm:p-5"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer select-none text-sm font-bold text-amber-900 dark:text-amber-200">
        🧑‍🏫 Teacher preparation <span className="ml-1 font-normal text-amber-800/80 dark:text-amber-300/80">— only you can see this; it is never shown to students or in Presentation Mode</span>
      </summary>
      <div className="mt-4 space-y-6">
        {error && <p className="text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
        {!prep && !error && <p className="text-sm text-gray-600 dark:text-gray-300">Loading…</p>}
        {prep && (
          <LessonRenderContext.Provider value={{ ...ctx, refs: prep.refs ?? {}, renderQuiz: null }}>
            {prep.teacherNotes && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Notes for the teacher</h3>
                <LessonMarkdown markdown={prep.teacherNotes} />
              </div>
            )}
            {prep.reviewNotes && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Review notes</h3>
                <LessonMarkdown markdown={prep.reviewNotes} />
              </div>
            )}
            {prep.answerKey.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Quiz answer key</h3>
                <ol className="space-y-3 pl-5 list-decimal">
                  {prep.answerKey.map((q) => (
                    <li key={q.id} className="text-sm text-gray-900 dark:text-gray-100">
                      <div className="font-medium"><InlineMarkdown text={q.prompt} /></div>
                      <div className="mt-1 text-emerald-800 dark:text-emerald-300">
                        <span className="font-semibold">Answer: </span>
                        {q.options && q.correctIndex !== undefined ? (
                          <InlineMarkdown text={q.options[q.correctIndex] ?? ''} />
                        ) : q.items ? (
                          q.items.join(' → ')
                        ) : q.pairs ? (
                          q.pairs.map((p) => `${p.left} — ${p.right}`).join('; ')
                        ) : q.sampleAnswer ? (
                          <InlineMarkdown text={q.sampleAnswer} />
                        ) : (
                          <span className="italic text-gray-600 dark:text-gray-300">open-ended — no single right answer</span>
                        )}
                      </div>
                      {q.explanation && (
                        <div className="mt-0.5 text-gray-700 dark:text-gray-300"><span className="font-semibold">Why: </span><InlineMarkdown text={q.explanation} /></div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {!prep.teacherNotes && !prep.reviewNotes && prep.answerKey.length === 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-300">There are no preparation notes for this lesson yet.</p>
            )}
          </LessonRenderContext.Provider>
        )}
      </div>
    </details>
  );
}

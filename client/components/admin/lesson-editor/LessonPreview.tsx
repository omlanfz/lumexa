'use client';

// FILE PATH: client/components/admin/lesson-editor/LessonPreview.tsx
//
// Previews a DRAFT lesson exactly as it will be shown: the student's lesson page, or
// Presentation Mode (the teacher's shared screen). The draft goes to the server's
// preview endpoint, which applies the same serialisation learners get — so what you
// see here is what they see (teacher-only notes are not in it).

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import LessonStudyView from '@/components/lesson/LessonStudyView';
import type { LessonDetailsResponse } from '@/lib/lesson/types';

export interface PreviewResult {
  lesson: NonNullable<LessonDetailsResponse['lesson']>;
  numbering: LessonDetailsResponse['numbering'];
  navigation: LessonDetailsResponse['navigation'];
  refs: LessonDetailsResponse['refs'];
  validation: { errors: string[]; warnings: string[] };
}

export interface Draft {
  lessonId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  objectives: string[];
  contentMarkdown: string;
  homework: string;
  checkpoint: string;
  teacherNotes: string;
  miniQuiz: unknown[];
  visuals: unknown[];
  projectLinks: { title: string; url: string }[];
  /** Little Coders: the drafts of the page, video and cards (checked by the server's own validators). */
  lc?: { experience?: unknown; previewVideo?: unknown; projectCard?: unknown; homeworkCard?: unknown };
}

/** Sends the draft to the server (debounced) and returns what a learner would get, plus every problem. */
export function usePreview(draft: Draft, enabled: boolean) {
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api
        .post<PreviewResult>('/curriculum/lessons/preview', {
          lessonId: draft.lessonId,
          title: draft.title,
          objectives: draft.objectives,
          contentMarkdown: draft.contentMarkdown,
          homework: draft.homework,
          checkpoint: draft.checkpoint,
          teacherNotes: draft.teacherNotes,
          miniQuiz: draft.miniQuiz,
          visuals: draft.visuals,
          projectLinks: draft.projectLinks.filter((p) => p.title.trim() && p.url.trim()),
          ...(draft.lc ?? {}),
        })
        .then((res) => {
          if (cancelled) return;
          setResult(res.data);
          setFailed(null);
        })
        .catch((err) => {
          if (!cancelled) setFailed(err?.response?.data?.message ?? 'The preview could not be built.');
        });
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [draft, enabled]);
  return { result, failed };
}

export function toDetails(draft: Draft, result: PreviewResult): LessonDetailsResponse {
  return {
    available: true,
    session: { scheduledLessonId: null, lessonNumber: result.numbering?.session ?? 1, start: null, end: null, status: null, courseId: draft.courseId, courseTitle: draft.courseTitle },
    lesson: { ...result.lesson, codeSnippets: result.lesson.codeSnippets ?? [] },
    viewer: 'admin',
    canPrepare: false,
    numbering: result.numbering,
    navigation: result.navigation,
    refs: result.refs ?? {},
    submission: null,
  } as LessonDetailsResponse;
}

export default function LessonPreview({ draft, result, failed, mode, onExitPresentation }: { draft: Draft; result: PreviewResult | null; failed: string | null; mode: 'student' | 'presentation'; onExitPresentation: () => void }) {
  if (failed) return <p className="text-sm text-[var(--a-danger)]" role="alert">{failed}</p>;
  if (!result) return <p className="text-sm text-[var(--a-text-muted)]">Building the preview…</p>;
  return (
    <div className="rounded-xl border border-[var(--a-border)] p-4 bg-[var(--a-bg)]">
      <p className="mb-3 text-xs text-[var(--a-text-faint)]">
        {mode === 'student'
          ? 'This is the lesson page as a learner sees it. Quiz answers are checked against the saved quiz, so save first to try your latest questions.'
          : 'Presentation Mode is open over the editor. Press Esc to return.'}
      </p>
      <div className="dark:text-gray-100">
        <LessonStudyView
          key={mode}
          data={toDetails(draft, result)}
          mode="page"
          isStudent={false}
          initialPresenting={mode === 'presentation'}
          onExitPresentation={onExitPresentation}
        />
      </div>
    </div>
  );
}

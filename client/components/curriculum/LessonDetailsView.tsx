'use client';

// FILE PATH: client/components/curriculum/LessonDetailsView.tsx
//
// Shared lesson rendering, reused by:
//   - /lesson/[scheduledLessonId]  (a specific scheduled class — student/teacher)
//   - /curriculum-lesson/[lessonId] (catalog browsing — teacher/admin only,
//     always unlocked, no specific date since it isn't tied to one class)
//   - the live classroom stage (LessonPanel), with `mode="classroom"`.
//
// A LEARNING lesson is shown by LessonStudyView (components/lesson). Everything else
// is deliberately unchanged: the lock notice and the test/assessment card below are
// exactly what they were — assessment sessions are a separate experience and are not
// part of the lesson redesign.

import LessonStudyView from '@/components/lesson/LessonStudyView';
import type { LessonDetailsResponse, LessonMode, SubmissionFile, SubmissionInfo } from '@/lib/lesson/types';

export type { LessonDetailsResponse, SubmissionFile, SubmissionInfo };

const LOCK_MESSAGES: Record<string, string> = {
  UPCOMING_LOCKED: "This lesson's materials unlock once the class is completed.",
  TEST_NOT_YET_TODAY: 'This test unlocks on the scheduled test day.',
  CANCELLED: 'This class was cancelled.',
  NO_CATALOG_LESSON: 'No curriculum content is linked to this session yet.',
};

export default function LessonDetailsView({
  data,
  onTestAction,
  testButtonLabel,
  isStudent = false,
  onSubmissionChange,
  mode = 'page',
}: {
  data: LessonDetailsResponse;
  onTestAction?: () => void;
  testButtonLabel?: string;
  /** Only a student viewing their own completed scheduled lesson can submit
   * homework — teacher/admin and catalog-browsing views never pass this. */
  isStudent?: boolean;
  onSubmissionChange?: (submission: SubmissionInfo) => void;
  /** 'page' (default) is the standalone lesson page; 'classroom' is the live class's
   * stage, which keeps its compact layout and none of the page-only navigation. */
  mode?: LessonMode;
}) {
  if (data.available && !data.isTest && data.lesson) {
    return <LessonStudyView data={data} mode={mode} isStudent={isStudent} onSubmissionChange={onSubmissionChange} />;
  }

  return (
    <>
      <div className="mt-3 mb-6">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {data.session.courseTitle} · Session {data.session.lessonNumber}
          {data.session.batchName ? ` · Batch: ${data.session.batchName}` : ''}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
          {data.lesson?.title || `Session ${data.session.lessonNumber}`}
        </h1>
        {data.session.start && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date(data.session.start).toLocaleString('en-US', {
              timeZone: 'Asia/Dhaka',
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {!data.available ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">🔒</div>
          <p className="text-amber-800 dark:text-amber-300 font-medium">
            {LOCK_MESSAGES[data.reason || ''] || 'This lesson is not available yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl p-6 text-center space-y-3">
          <div className="text-3xl">📝</div>
          {data.assessment ? (
            <>
              <p className="font-semibold text-gray-900 dark:text-white">{data.assessment.title}</p>
              {data.assessment.counts && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {data.assessment.counts.mcq} multiple-choice + {data.assessment.counts.trueFalse} True/False
                  {data.assessment.counts.practical > 0 ? ' + 1 coding project' : ''}
                  {data.assessment.totalMarks ? ` · ${data.assessment.totalMarks} marks` : ''}
                </p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {data.session.scheduledLessonId
                  ? 'This is a test session. In the live class, the test opens in its own browser tab while you share your entire screen — you can also open it here.'
                  : 'Preview the test structure by opening it from a scheduled session.'}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              No question bank is linked to this test session yet. Please let Lumexa Operations know so they can set it up.
            </p>
          )}
          {data.assessment && onTestAction && data.session.scheduledLessonId && (
            <button
              onClick={onTestAction}
              className="inline-block px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
            >
              {testButtonLabel || (data.session.status === 'COMPLETED' || data.session.status === 'PARTIALLY_COMPLETED' ? 'View Test Results' : 'Open Test')}
            </button>
          )}
        </div>
      )}
    </>
  );
}

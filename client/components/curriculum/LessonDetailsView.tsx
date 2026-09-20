'use client';

import { useState } from 'react';
import api from '@/lib/axios';
import CopyCodeButton from '@/components/curriculum/CopyCodeButton';
import SimpleMarkdown from '@/components/curriculum/SimpleMarkdown';

interface CodeSnippet {
  label: string;
  language: string;
  code: string;
  part?: string;
}

export interface SubmissionInfo {
  id: string;
  status: 'PENDING' | 'REVIEWED';
  fileUrl: string;
  fileName: string | null;
  note: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  feedback: string | null;
}

export interface LessonDetailsResponse {
  available: boolean;
  reason?: string;
  isTest?: boolean;
  session: {
    scheduledLessonId: string | null;
    lessonNumber: number;
    start: string | null;
    end: string | null;
    status: string | null;
    courseId: string;
    courseTitle: string;
  };
  lesson?: {
    id: string;
    title: string;
    type: string;
    objectives: string[];
    contentMarkdown: string | null;
    reviewNotes: string | null;
    homework: string | null;
    checkpoint: string | null;
    codeSnippets: CodeSnippet[];
    module: { id: string; title: string; stageNumber: number | null } | null;
    project: { id: string; title: string; description: string | null } | null;
  };
  assessment?: { id: string; type: string; title: string; isPublished: boolean } | null;
  submission?: SubmissionInfo | null;
}

const LOCK_MESSAGES: Record<string, string> = {
  UPCOMING_LOCKED: "This lesson's materials unlock once the class is completed.",
  TEST_NOT_YET_TODAY: 'This test unlocks on the scheduled test day.',
  CANCELLED: 'This class was cancelled.',
  NO_CATALOG_LESSON: 'No curriculum content is linked to this session yet.',
};

// Shared lesson-content rendering, reused by:
//   - /lesson/[scheduledLessonId]  (a specific scheduled class — student/teacher)
//   - /curriculum-lesson/[lessonId] (catalog browsing — teacher/admin only,
//     always unlocked, no specific date since it isn't tied to one class)
const SECTION = 'bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4 sm:p-5';

export default function LessonDetailsView({
  data,
  onTestAction,
  testButtonLabel,
  isStudent = false,
  onSubmissionChange,
}: {
  data: LessonDetailsResponse;
  onTestAction?: () => void;
  testButtonLabel?: string;
  /** Only a student viewing their own completed scheduled lesson can submit
   * homework — teacher/admin and catalog-browsing views never pass this. */
  isStudent?: boolean;
  onSubmissionChange?: (submission: SubmissionInfo) => void;
}) {
  return (
    <>
      <div className="mt-3 mb-6">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {data.session.courseTitle} · Session {data.session.lessonNumber}
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
      ) : data.isTest ? (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl p-6 text-center space-y-3">
          <div className="text-3xl">📝</div>
          <p className="font-semibold text-gray-900 dark:text-white">{data.assessment?.title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This is an assessment session. {data.session.scheduledLessonId ? "Today's class is a test — the assessment interface replaces normal lesson material." : 'Preview the test structure below by opening it from a scheduled session.'}
          </p>
          {onTestAction && data.session.scheduledLessonId && (
            <button
              onClick={onTestAction}
              className="inline-block px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
            >
              {testButtonLabel || (data.session.status === 'COMPLETED' ? 'View Test Results' : 'Start Test')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {(() => {
            const hasObjectives = !!data.lesson?.objectives && data.lesson.objectives.length > 0;
            const hasProjectOrCheckpoint = !!data.lesson?.project || !!data.lesson?.checkpoint;
            if (!hasObjectives && !hasProjectOrCheckpoint) return null;
            // Objectives and project/checkpoint are both short — pairing them
            // side by side on wider screens uses the width instead of
            // stacking two half-empty cards, and each still goes full-width
            // alone (e.g. no project this session) or on mobile.
            const paired = hasObjectives && hasProjectOrCheckpoint;
            return (
              <div className={paired ? 'grid lg:grid-cols-2 gap-4 items-start' : ''}>
                {hasObjectives && (
                  <section className={SECTION}>
                    <h2 className="font-bold text-gray-900 dark:text-white mb-2">🎯 Learning Objectives</h2>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 text-sm">
                      {data.lesson!.objectives.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {data.lesson?.project ? (
                  <section className={SECTION}>
                    <h2 className="font-bold text-gray-900 dark:text-white mb-1">🛠️ Project: {data.lesson.project.title}</h2>
                    {data.lesson.project.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{data.lesson.project.description}</p>
                    )}
                    {data.lesson.checkpoint && (
                      <div className="mt-2 inline-block text-sm px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 font-medium">
                        ✅ This session&apos;s checkpoint: {data.lesson.checkpoint}
                      </div>
                    )}
                  </section>
                ) : (
                  data.lesson?.checkpoint && (
                    <section className={SECTION}>
                      <div className="inline-block text-sm px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 font-medium">
                        ✅ This session&apos;s checkpoint: {data.lesson.checkpoint}
                      </div>
                    </section>
                  )
                )}
              </div>
            );
          })()}

          {data.lesson?.contentMarkdown && (
            <section className={SECTION}>
              <h2 className="font-bold text-gray-900 dark:text-white mb-2">📚 Lesson Material</h2>
              <SimpleMarkdown content={data.lesson.contentMarkdown} />
            </section>
          )}

          {data.lesson?.codeSnippets && data.lesson.codeSnippets.length > 0 && (
            <section className={SECTION}>
              <h2 className="font-bold text-gray-900 dark:text-white mb-3">💻 Code</h2>
              <div className="space-y-4">
                {data.lesson.codeSnippets.map((snip, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {snip.label} {snip.part ? `· ${snip.part}` : ''}
                      </span>
                      <CopyCodeButton code={snip.code} />
                    </div>
                    <pre className="rounded-lg bg-gray-900 text-gray-100 p-3 overflow-x-auto text-sm">
                      <code>{snip.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.lesson?.homework && (
            <section className={SECTION}>
              <h2 className="font-bold text-gray-900 dark:text-white mb-2">📝 Homework / Practice</h2>
              <div className="text-sm">
                <SimpleMarkdown content={data.lesson.homework} />
              </div>
              {isStudent && data.session.scheduledLessonId && (
                <HomeworkSubmission
                  scheduledLessonId={data.session.scheduledLessonId}
                  submission={data.submission ?? null}
                  onSubmitted={(s) => onSubmissionChange?.(s)}
                />
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}

function HomeworkSubmission({
  scheduledLessonId,
  submission,
  onSubmitted,
}: {
  scheduledLessonId: string;
  submission: SubmissionInfo | null;
  onSubmitted: (submission: SubmissionInfo) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);

  const submit = async () => {
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('homework', file);
      const uploadRes = await api.post('/uploads/homework', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const res = await api.post('/submissions', {
        scheduledLessonId,
        fileUrl: uploadRes.data.url,
        fileName: uploadRes.data.name,
        note: note.trim() || undefined,
      });
      onSubmitted(res.data);
      setFile(null);
      setNote('');
      setResubmitting(false);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Could not submit your work. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (submission && !resubmitting) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-semibold text-sm">
          <span>✓ Work Submitted</span>
          {submission.status === 'REVIEWED' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20">
              Reviewed
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Submitted {new Date(submission.submittedAt).toLocaleDateString('en-US', { dateStyle: 'medium' } as any)}
          {submission.fileName ? ` · ${submission.fileName}` : ''}
        </p>
        {submission.feedback && (
          <div className="mt-2 text-sm bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/40 rounded-lg p-3">
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-1">Teacher feedback</p>
            <p className="text-gray-700 dark:text-gray-300">{submission.feedback}</p>
          </div>
        )}
        <button
          onClick={() => setResubmitting(true)}
          className="mt-2 text-xs text-teal-600 dark:text-teal-400 hover:underline"
        >
          Submit different work
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50 space-y-2">
      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Complete the task and upload your work.</p>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-500/10 file:text-teal-700 dark:file:text-teal-400 hover:file:bg-teal-500/20"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note for your teacher (optional)"
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={uploading}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-black bg-teal-500 hover:bg-teal-400 disabled:opacity-60 transition-colors"
        >
          {uploading ? 'Submitting…' : 'Submit Work'}
        </button>
        {resubmitting && (
          <button onClick={() => setResubmitting(false)} className="text-sm text-gray-500 hover:underline">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

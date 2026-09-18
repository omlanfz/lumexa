'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { getStoredRole } from '@/lib/storage';
import CopyCodeButton from '@/components/curriculum/CopyCodeButton';
import SimpleMarkdown from '@/components/curriculum/SimpleMarkdown';

interface CodeSnippet {
  label: string;
  language: string;
  code: string;
  part?: string;
}

interface LessonDetailsResponse {
  available: boolean;
  reason?: string;
  isTest?: boolean;
  session: {
    scheduledLessonId: string;
    lessonNumber: number;
    start: string;
    end: string;
    status: string;
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
}

const LOCK_MESSAGES: Record<string, string> = {
  UPCOMING_LOCKED: "This lesson's materials unlock once the class is completed.",
  TEST_NOT_YET_TODAY: 'This test unlocks on the scheduled test day.',
  CANCELLED: 'This class was cancelled.',
  NO_CATALOG_LESSON: 'No curriculum content is linked to this session yet.',
};

export default function LessonDetailsPage() {
  const params = useParams<{ scheduledLessonId: string }>();
  const router = useRouter();
  const [data, setData] = useState<LessonDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const role = typeof window !== 'undefined' ? getStoredRole() : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<LessonDetailsResponse>(`/curriculum/scheduled-lessons/${params.scheduledLessonId}/details`);
        if (!cancelled) setData(res.data);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || 'Could not load this lesson.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.scheduledLessonId]);

  const backHref = role === 'TEACHER' ? '/schedule' : '/student-dashboard/learning?tab=lessons';

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="animate-pulse h-40 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-500">{error}</p>
        <Link href={backHref} className="text-teal-600 hover:underline text-sm">
          ← Back
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <Link href={backHref} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
        ← Back
      </Link>

      <div className="mt-3 mb-6">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {data.session.courseTitle} · Session {data.session.lessonNumber}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
          {data.lesson?.title || `Session ${data.session.lessonNumber}`}
        </h1>
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
            This is an assessment session. Today&apos;s class is a test — the assessment interface replaces normal lesson
            material.
          </p>
          <button
            onClick={() => router.push(`/assessment/${data.session.scheduledLessonId}`)}
            className="inline-block px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
          >
            {data.session.status === 'COMPLETED' ? 'View Test Results' : 'Start Test'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {data.lesson?.objectives && data.lesson.objectives.length > 0 && (
            <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-2">🎯 Learning Objectives</h2>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 text-sm">
                {data.lesson.objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </section>
          )}

          {data.lesson?.project && (
            <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
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
          )}
          {!data.lesson?.project && data.lesson?.checkpoint && (
            <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
              <div className="inline-block text-sm px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 font-medium">
                ✅ This session&apos;s checkpoint: {data.lesson.checkpoint}
              </div>
            </section>
          )}

          {data.lesson?.contentMarkdown && (
            <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-2">📚 Lesson Material</h2>
              <div className="max-h-[32rem] overflow-y-auto pr-1">
                <SimpleMarkdown content={data.lesson.contentMarkdown} />
              </div>
            </section>
          )}

          {data.lesson?.codeSnippets && data.lesson.codeSnippets.length > 0 && (
            <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
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
                    <pre className="rounded-lg bg-gray-900 text-gray-100 p-3 overflow-x-auto text-sm max-h-96">
                      <code>{snip.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.lesson?.homework && (
            <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-2">📝 Homework / Practice</h2>
              <div className="text-sm">
                <SimpleMarkdown content={data.lesson.homework} />
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

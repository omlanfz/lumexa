'use client';

import { useRouter } from 'next/navigation';

export interface NeedsChangesHomeworkItem {
  scheduledLessonId: string;
  lessonNumber: number;
  courseTitle: string;
  lessonTitle: string;
  feedback: string | null;
  feedbackTags: string[];
}

// Homework a teacher reviewed and sent back for changes — more urgent than
// HomeworkDueCard's "never submitted" list, so it renders above it and in a
// red/urgent treatment the student can't miss.
export default function HomeworkNeedsChangesCard({ items }: { items: NeedsChangesHomeworkItem[] }) {
  const router = useRouter();
  if (items.length === 0) return null;

  const shown = items.slice(0, 3);
  const extra = items.length - shown.length;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-6">
      <p className="text-xs text-red-700 dark:text-red-400 font-medium mb-3">🔄 Homework needs changes</p>
      <div className="space-y-3">
        {shown.map((item) => {
          const preview = item.feedback || item.feedbackTags[0] || 'Your teacher left feedback — take a look.';
          return (
            <div
              key={item.scheduledLessonId}
              className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200/60 dark:border-red-800/30"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.courseTitle}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Lesson {item.lessonNumber} · {item.lessonTitle}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate italic">&ldquo;{preview}&rdquo;</p>
              </div>
              <button
                onClick={() => router.push(`/lesson/${item.scheduledLessonId}`)}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-500 hover:bg-red-400 text-white transition-colors"
              >
                Resubmit
              </button>
            </div>
          );
        })}
      </div>
      {extra > 0 && (
        <p className="text-xs text-red-700 dark:text-red-400 mt-2">+{extra} more waiting on you</p>
      )}
    </div>
  );
}

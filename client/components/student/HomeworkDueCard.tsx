'use client';

import { useRouter } from 'next/navigation';

export interface PendingHomeworkItem {
  scheduledLessonId: string;
  lessonNumber: number;
  courseTitle: string;
  lessonTitle: string;
}

// Only ever rendered with lessons that genuinely need student action — a
// completed class whose lesson has homework and no Submission row yet (see
// StudentsService.getMyDashboard). Mirrors SessionReviewCard's card
// treatment so Student Home stays visually consistent.
export default function HomeworkDueCard({ items }: { items: PendingHomeworkItem[] }) {
  const router = useRouter();
  if (items.length === 0) return null;

  const shown = items.slice(0, 3);
  const extra = items.length - shown.length;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-6">
      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-3">📝 Homework needs your attention</p>
      <div className="space-y-3">
        {shown.map((item) => (
          <div
            key={item.scheduledLessonId}
            className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200/60 dark:border-amber-800/30"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.courseTitle}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                Lesson {item.lessonNumber} · {item.lessonTitle}
              </p>
            </div>
            <button
              onClick={() => router.push(`/lesson/${item.scheduledLessonId}`)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold bg-amber-500 hover:bg-amber-400 text-black transition-colors"
            >
              Submit Work
            </button>
          </div>
        ))}
      </div>
      {extra > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">+{extra} more waiting on you</p>
      )}
    </div>
  );
}

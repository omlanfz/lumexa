'use client';

// FILE PATH: client/components/little-coders/LearningPreview.tsx
//
// "Your Learning Preview": the 60–100 second video at the top of every Little Coders lesson.
// The video itself is added by an admin (an MP4 address stored on the lesson). Until then the
// page says so honestly — it never shows a player for a video that does not exist.

import { useState } from 'react';
import type { LcPreviewVideoPublic } from '@/lib/littleCoders/types';

const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

export default function LearningPreview({
  video,
  emoji,
  objective,
}: {
  video: LcPreviewVideoPublic | null;
  emoji: string;
  /** What the lesson is about — shown while the video is not there yet. */
  objective: string;
}) {
  const [failed, setFailed] = useState(false);
  const hasVideo = !!video?.videoUrl && !failed;
  const title = video?.title || 'Your Learning Preview';

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm dark:border-violet-500/30 dark:bg-gray-800/60">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-600 to-teal-500 px-4 py-2.5 text-white">
        <h3 className="flex items-center gap-2 text-sm font-bold sm:text-base">
          <span aria-hidden="true">🎬</span> {title}
        </h3>
        {video?.durationSeconds ? <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{mmss(video.durationSeconds)}</span> : null}
      </div>

      {hasVideo ? (
        <div className="bg-black">
          <video
            className="aspect-video w-full"
            controls
            playsInline
            preload="metadata"
            poster={video!.posterUrl || undefined}
            onError={() => setFailed(true)}
            aria-label={`${title}: ${video!.summary}`}
          >
            <source src={video!.videoUrl} type="video/mp4" />
            {video!.captionsUrl ? <track kind="captions" src={video!.captionsUrl} srcLang="en" label="English" default /> : null}
            Your browser cannot play this video.
          </video>
        </div>
      ) : (
        <div
          className="relative flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-50 via-violet-50 to-teal-50 px-6 text-center dark:from-gray-900 dark:via-indigo-950 dark:to-gray-900"
          role="img"
          aria-label={failed ? 'The preview video could not be loaded' : 'The preview video is coming soon'}
        >
          <span className="text-6xl sm:text-7xl" aria-hidden="true">
            {emoji}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-violet-800 shadow-sm dark:bg-white/10 dark:text-violet-200">
            <span aria-hidden="true">⏳</span> {failed ? 'The video could not be loaded. Please try again later.' : 'Video coming soon'}
          </span>
          <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold">In this lesson:</span> {objective}
          </p>
        </div>
      )}

      {video?.summary ? <p className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{video.summary}</p> : null}
    </div>
  );
}

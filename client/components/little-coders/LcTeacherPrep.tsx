'use client';

// FILE PATH: client/components/little-coders/LcTeacherPrep.tsx
//
// The staff-only Little Coders material inside the teacher preparation area: how to run the project
// in class, and the production brief of "Your Learning Preview" (storyboard, narration and on-screen
// text) with whether the real video has been added yet. Students never receive any of this.

import type { LcTeacherPrep } from '@/lib/littleCoders/types';

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

export default function LcTeacherPrepSection({ prep }: { prep: LcTeacherPrep }) {
  const brief = prep.videoBrief;
  const narration = brief?.scenes.map((s) => s.narration).join(' ') ?? '';
  return (
    <div className="space-y-6">
      {prep.teacherInstructions && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">💻 Running the project in class</h3>
          <p className="rounded-xl bg-white/70 p-3 text-sm text-gray-800 dark:bg-white/5 dark:text-gray-100">{prep.teacherInstructions}</p>
        </div>
      )}

      {brief && (
        <div>
          <h3 className="mb-1 flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            🎬 “Your Learning Preview” — video brief
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${prep.videoReady ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
              {prep.videoReady ? 'Video added' : 'No video added yet'}
            </span>
          </h3>
          <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">
            {brief.title} · target {brief.targetSeconds} seconds · about {words(narration)} narration words · 1920×1080 MP4. The page shows “coming soon” to students until an admin adds the video address.
          </p>
          <p className="mb-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-gray-800 dark:bg-white/5 dark:text-gray-100">
            <span className="font-semibold">Hook:</span> {brief.hook}
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[40rem] text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <tr>
                  <th className="px-2.5 py-2 font-semibold">Time</th>
                  <th className="px-2.5 py-2 font-semibold">Beat</th>
                  <th className="px-2.5 py-2 font-semibold">What we see</th>
                  <th className="px-2.5 py-2 font-semibold">Narration</th>
                  <th className="px-2.5 py-2 font-semibold">On-screen text</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900/30">
                {brief.scenes.map((s) => (
                  <tr key={s.time} className="align-top text-gray-800 dark:text-gray-100">
                    <td className="whitespace-nowrap px-2.5 py-2 font-mono">{s.time}</td>
                    <td className="px-2.5 py-2 font-semibold">{s.beat}</td>
                    <td className="px-2.5 py-2">{s.visual}</td>
                    <td className="px-2.5 py-2">{s.narration}</td>
                    <td className="px-2.5 py-2 font-medium">{s.onScreen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-white/70 p-2.5 dark:bg-white/5"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tip</dt><dd className="text-gray-800 dark:text-gray-100">{brief.tip}</dd></div>
            <div className="rounded-lg bg-white/70 p-2.5 dark:bg-white/5"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Challenge</dt><dd className="text-gray-800 dark:text-gray-100">{brief.challenge}</dd></div>
            <div className="rounded-lg bg-white/70 p-2.5 dark:bg-white/5"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Leads into</dt><dd className="text-gray-800 dark:text-gray-100">{brief.leadsInto}</dd></div>
          </dl>
          <details className="mt-3 rounded-lg border border-gray-200 bg-white/70 p-3 dark:border-gray-700 dark:bg-white/5">
            <summary className="cursor-pointer select-none text-sm font-semibold text-gray-900 dark:text-white">Full narration script (voice-over)</summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-800 dark:text-gray-100">{narration}</p>
          </details>
        </div>
      )}
    </div>
  );
}

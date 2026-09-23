'use client';

import { useState } from 'react';

export interface ProjectLink {
  title: string;
  url: string;
}

const SECTION = 'bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4 sm:p-5';

// Replaces the plain "💻 Code" section on the lesson page whenever a lesson
// has projectLinks set (see Lesson.projectLinks) — one project shows a
// single "💻 Project: <name>" header with its two buttons; several (the
// module's "polish/recap" sessions) get a "💻 Projects" header with each
// project named above its own button pair.
export default function ProjectLinksSection({ projectLinks }: { projectLinks: ProjectLink[] }) {
  if (!projectLinks || projectLinks.length === 0) return null;
  const single = projectLinks.length === 1;

  return (
    <section className={SECTION}>
      <h2 className="font-bold text-gray-900 dark:text-white mb-3">
        {single ? `💻 Project: ${projectLinks[0].title}` : '💻 Projects'}
      </h2>
      <div className="space-y-4">
        {projectLinks.map((p, i) => (
          <div
            key={i}
            className={single ? '' : 'pt-4 first:pt-0 border-t first:border-t-0 border-gray-200 dark:border-gray-700/50'}
          >
            {!single && <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{p.title}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-black bg-teal-500 hover:bg-teal-400 transition-colors"
              >
                Open Project
              </a>
              <CopyLinkButton url={p.url} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — silently no-op, button just won't confirm
    }
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
    >
      {copied ? '✓ Copied' : 'Copy Link'}
    </button>
  );
}

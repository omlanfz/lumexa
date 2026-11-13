'use client';

import { useState } from 'react';

export interface ProjectLink {
  title: string;
  url: string;
}

const SECTION = 'bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4 sm:p-5';

/** The project rows a lesson page shows: every row that has a name. A row without a link yet is shown
 *  as "link coming soon" (an admin pastes the notebook link in later), so the project is never lost
 *  just because its link has not been added. A row with no name is not shown. */
export function visibleProjectLinks(links: ProjectLink[] | null | undefined): ProjectLink[] {
  return (links ?? []).filter((p) => typeof p?.title === 'string' && p.title.trim() !== '');
}

/** Has this project been given its link yet? */
export const hasProjectUrl = (p: ProjectLink): boolean => typeof p.url === 'string' && p.url.trim() !== '';

// Replaces the plain "💻 Code" section on the lesson page whenever a lesson
// has projectLinks set (see Lesson.projectLinks) — one project shows a
// single "💻 Project: <name>" header with its two buttons; several (the
// module's "polish/recap" sessions) get a "💻 Projects" header with each
// project named above its own button pair. A project whose link has not been
// added yet shows both buttons switched off, with a "link coming soon" note.
export default function ProjectLinksSection({ projectLinks }: { projectLinks: ProjectLink[] }) {
  const links = visibleProjectLinks(projectLinks);
  if (links.length === 0) return null;
  const single = links.length === 1;

  return (
    <section className={SECTION}>
      <h2 className="font-bold text-gray-900 dark:text-white mb-3">
        {single ? `💻 Project: ${links[0].title}` : '💻 Projects'}
      </h2>
      <div className="space-y-4">
        {links.map((p, i) => (
          <div
            key={i}
            className={single ? '' : 'pt-4 first:pt-0 border-t first:border-t-0 border-gray-200 dark:border-gray-700/50'}
          >
            {!single && <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{p.title}</p>}
            {hasProjectUrl(p) ? (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={p.url.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-black bg-teal-500 hover:bg-teal-400 transition-colors"
                >
                  Open Project
                </a>
                <CopyLinkButton url={p.url.trim()} />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-black bg-teal-500 opacity-40 cursor-not-allowed"
                >
                  Open Project
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 opacity-40 cursor-not-allowed"
                >
                  Copy Link
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">Project link coming soon</span>
              </div>
            )}
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

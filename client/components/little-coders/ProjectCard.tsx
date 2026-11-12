'use client';

// FILE PATH: client/components/little-coders/ProjectCard.tsx
//
// "💻 Project: <name>" — the project card of a Little Coders lesson, and the homework card with the same
// "Start Coding" buttons.
//
//   Open Project  opens the lesson's project in a NEW tab. Disabled (with a plain reason) while an admin
//                 has not added the address — nothing is ever pre-filled or guessed.
//   Copy Link     copies the project's link (the copy address, else the project address).
//   Start Coding  one button per platform, in the order the lesson uses them (for an AI lesson: train the
//                 model first, then build in Stretch3). Where each one opens comes from the platform
//                 table the admin manages; a switched-off platform shows as unavailable.

import { useState } from 'react';
import type { LcHomeworkCardShared, LcProjectCardShared, LcResolvedButton } from '@/lib/littleCoders/types';

const BTN = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500';
const PRIMARY = `${BTN} bg-teal-500 text-black hover:bg-teal-400`;
const SECONDARY = `${BTN} border border-gray-300 text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700/50`;
const DISABLED = `${BTN} cursor-not-allowed border border-dashed border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-800/40 dark:text-gray-500`;

const PLATFORM_ICON: Record<string, string> = { SCRATCH: '🐱', STRETCH3: '🧩', TEACHABLE_MACHINE: '🧠', EDUBLOCKS: '🐍' };
const PLATFORM_STYLE: Record<string, string> = {
  SCRATCH: 'bg-amber-400 text-black hover:bg-amber-300',
  STRETCH3: 'bg-sky-400 text-black hover:bg-sky-300',
  TEACHABLE_MACHINE: 'bg-fuchsia-500 text-white hover:bg-fuchsia-400',
  EDUBLOCKS: 'bg-emerald-500 text-white hover:bg-emerald-400',
};

export function PlatformButtons({ buttons, size = 'md' }: { buttons: LcResolvedButton[]; size?: 'md' | 'lg' }) {
  if (buttons.length === 0) return null;
  const pad = size === 'lg' ? 'px-5 py-2.5 text-base' : '';
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Start coding">
      {buttons.map((b, i) =>
        b.url ? (
          <a
            key={`${b.platform}-${i}`}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BTN} ${pad} ${PLATFORM_STYLE[b.platform] ?? PRIMARY}`}
          >
            <span aria-hidden="true">{PLATFORM_ICON[b.platform] ?? '💻'}</span>
            {buttons.length > 1 && <span className="rounded-full bg-black/15 px-1.5 text-xs font-bold">{i + 1}</span>}
            {b.label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <span key={`${b.platform}-${i}`} className={`${DISABLED} ${pad}`} aria-disabled="true" title={`${b.name} is not available right now`}>
            <span aria-hidden="true">{PLATFORM_ICON[b.platform] ?? '💻'}</span>
            {b.label} · unavailable
          </span>
        ),
      )}
    </div>
  );
}

function CopyLink({ url, label }: { url: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  if (!url) {
    return (
      <button type="button" disabled className={DISABLED} title="The project link has not been added yet">
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={SECONDARY}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setState('copied');
        } catch {
          setState('failed');
        }
        setTimeout(() => setState('idle'), 1800);
      }}
    >
      {state === 'copied' ? '✓ Copied' : state === 'failed' ? 'Could not copy' : label}
    </button>
  );
}

export default function ProjectCard({ card }: { card: LcProjectCardShared }) {
  const has = !!card.projectUrl;
  return (
    <div className="rounded-xl border border-teal-300/60 bg-teal-50/60 p-4 dark:border-teal-500/30 dark:bg-teal-900/10 sm:p-5">
      <h3 className="mb-1 font-bold text-gray-900 dark:text-white">💻 Project: {card.title}</h3>
      {card.helper && <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{card.helper}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {has ? (
          <a href={card.projectUrl} target="_blank" rel="noopener noreferrer" className={PRIMARY}>
            {card.openLabel || 'Open Project'}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <button type="button" disabled className={DISABLED} title="Your teacher will add the project link">
            {card.openLabel || 'Open Project'} · not added yet
          </button>
        )}
        <CopyLink url={card.copyUrl || card.projectUrl} label={card.copyLabel || 'Copy Link'} />
      </div>
      {!has && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">The project link has not been added yet — you can still start coding below.</p>}

      {card.platforms.length > 0 && (
        <div className="mt-4 border-t border-teal-200/70 pt-4 dark:border-teal-500/20">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{card.platforms.length > 1 ? 'Start coding — in this order' : 'Start coding'}</p>
          <PlatformButtons buttons={card.platforms} />
        </div>
      )}
    </div>
  );
}

export function HomeworkCard({ card, children }: { card: LcHomeworkCardShared; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-300/70 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-900/10 sm:p-5">
      <h3 className="mb-1 font-bold text-gray-900 dark:text-white">📝 Homework: {card.title}</h3>
      <p className="text-sm text-gray-700 dark:text-gray-200">{card.instructions}</p>
      <p className="mt-2 inline-block rounded-lg bg-white/80 px-3 py-1.5 text-sm font-medium text-amber-900 dark:bg-white/10 dark:text-amber-100">
        <span aria-hidden="true">📤</span> Hand in: {card.deliverable}
      </p>
      {card.helper && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{card.helper}</p>}
      {card.platforms.length > 0 && (
        <div className="mt-3">
          <PlatformButtons buttons={card.platforms} />
        </div>
      )}
      {children}
    </div>
  );
}

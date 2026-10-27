// FILE PATH: client/components/recordings/RecordingPlayerModal.tsx
//
// The window a student or parent watches a class recording in: a title, the
// player (RecordingPlayer) and a way to close it. The parts are either handed in
// (a student's list already has them) or loaded when it opens (a parent's page
// only knows the booking). A recording made before browser recording existed has
// no parts, only a plain link, and is offered as that.

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import RecordingPlayer from './RecordingPlayer';
import { recordingErrorMessage } from '@/lib/classroom/recording/library';
import type { RecordingPart } from '@/lib/classroom/recording/library';

type Loaded =
  | { status: 'loading' }
  | { status: 'ready'; parts: RecordingPart[] }
  | { status: 'error'; message: string };

export default function RecordingPlayerModal({
  title,
  subtitle,
  parts,
  loadParts,
  initialPartId,
  legacyUrl,
  onClose,
}: {
  title: string;
  subtitle?: string;
  /** The parts to play, when they are already known… */
  parts?: RecordingPart[];
  /** …or how to find them when the window opens. */
  loadParts?: () => Promise<RecordingPart[]>;
  initialPartId?: string;
  /** A recording from before browser recording: opens in a new tab. */
  legacyUrl?: string | null;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded>(
    parts ? { status: 'ready', parts } : { status: 'loading' },
  );
  const closeRef = useRef<HTMLButtonElement>(null);
  // The latest onClose, so a parent that passes a new function on every render
  // does not make the window re-focus itself each time.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (parts || !loadParts) return;
    let current = true;
    loadParts()
      .then((found) => {
        if (current) setLoaded({ status: 'ready', parts: found });
      })
      .catch((err: unknown) => {
        if (current) {
          setLoaded({
            status: 'error',
            message: recordingErrorMessage(err, 'The recordings could not be loaded. Please try again.'),
          });
        }
      });
    return () => {
      current = false;
    };
  }, [parts, loadParts]);

  // Escape closes; the page behind does not scroll; focus goes in, and comes back.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  const found = loaded.status === 'ready' ? loaded.parts : [];

  // In a portal at <body>: the pages wrap their content in a fading-in element,
  // and a `position: fixed` window inside one is sized to that element instead
  // of the screen (and cut off when the page is short).
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="recording-modal"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:p-5"
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="truncate text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="recording-modal-close"
            className="flex-shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {loaded.status === 'loading' && (
          <p className="flex items-center gap-2 py-10 text-sm text-gray-500 dark:text-gray-400" role="status">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </p>
        )}

        {loaded.status === 'error' && (
          <p className="py-8 text-center text-sm text-red-600 dark:text-red-400" role="alert">
            {loaded.message}
          </p>
        )}

        {found.length > 0 && <RecordingPlayer parts={found} initialPartId={initialPartId} />}

        {loaded.status === 'ready' && found.length === 0 && !legacyUrl && (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            There is no recording to watch for this class yet.
          </p>
        )}

        {legacyUrl && (
          <p className={found.length > 0 ? 'mt-3 text-xs text-gray-500 dark:text-gray-400' : 'py-6 text-center text-sm'}>
            <a
              href={legacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              {found.length > 0 ? 'Also: open the earlier recording of this class' : '▶ Open the recording in a new tab'}
            </a>
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

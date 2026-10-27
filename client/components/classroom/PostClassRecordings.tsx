// FILE PATH: client/components/classroom/PostClassRecordings.tsx
//
// Shown to the teacher after they leave a class (the class ended, or they were
// disconnected) while a recording of it is still on their computer. A recording
// lives only in this browser tab until it is uploaded, so instead of sending the
// teacher straight to their dashboard — where it is easy to forget — this screen
// says plainly what is waiting and offers Upload Class Recording, with progress,
// retry and failure.
//
// Going back to the dashboard is fine: the recordings are kept for as long as the
// tab is open, an upload carries on in the background, and the dashboard shows the
// same list (PendingRecordingsBanner). Closing the tab is what loses a recording,
// and the browser is asked to warn about that (see lib/.../store.ts).

'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import RecordingList, { useLocalRecordings } from './RecordingList';
import { isUnfinished } from '@/lib/classroom/recording/store';

export default function PostClassRecordings({
  roomName,
  backLabel,
  onLeave,
}: {
  roomName: string;
  backLabel: string;
  onLeave: () => void;
}) {
  const items = useLocalRecordings(roomName);
  const waiting = items.some(isUnfinished);
  const allUploaded = items.length > 0 && !waiting;
  const uploading = items.some((r) => r.phase === 'uploading');

  return (
    <div
      className="cr-root flex min-h-screen items-center justify-center p-6"
      data-testid="post-class-recordings"
    >
      <div className="cr-fade-in w-full max-w-md rounded-2xl border border-[var(--cr-border)] bg-[var(--cr-surface)] p-6 shadow-2xl">
        {allUploaded ? (
          <>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 size={22} />
            </div>
            <h1 className="text-lg font-semibold text-[var(--cr-text)]">Your recording is uploaded</h1>
            <p className="mt-1 text-sm text-[var(--cr-text-muted)]">
              Students can now watch it from the <strong>Recordings</strong> tab of their dashboard.
            </p>
          </>
        ) : waiting ? (
          <>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
              <AlertTriangle size={22} />
            </div>
            <h1 className="text-lg font-semibold text-[var(--cr-text)]">Upload your class recording</h1>
            <p className="mt-1 text-sm text-[var(--cr-text-muted)]">
              Your recording is saved on <strong>this computer only</strong>, and students cannot watch it
              until you upload it. Press <strong>Upload Class Recording</strong> and keep this browser tab
              open until it finishes.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-[var(--cr-text)]">You have left the class</h1>
            <p className="mt-1 text-sm text-[var(--cr-text-muted)]">There is no recording waiting to be uploaded.</p>
          </>
        )}

        <div className="mt-4">
          <RecordingList items={items} room={roomName} />
        </div>

        {waiting && (
          <p className="mt-3 text-xs text-[var(--cr-text-faint)]">
            {uploading
              ? 'You can go back to your dashboard while it uploads, but do not close this tab.'
              : 'If you go back to your dashboard you can upload it from there, but do not close this tab first.'}
          </p>
        )}

        <button
          type="button"
          onClick={onLeave}
          data-testid="post-class-back"
          className="mt-5 w-full rounded-lg bg-[var(--cr-surface-2)] py-2 text-sm font-medium text-[var(--cr-text)] transition-colors hover:bg-[var(--cr-surface-3)]"
        >
          {backLabel}
        </button>
      </div>
    </div>
  );
}

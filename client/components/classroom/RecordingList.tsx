// FILE PATH: client/components/classroom/RecordingList.tsx
//
// A teacher's recordings of a class, each with what they can do about it:
//   saved      "Upload Class Recording" (and Discard)
//   uploading  a progress bar — "Uploading… 43%", "Finishing up…"
//   failed     what went wrong, in plain words, with Retry (and Discard)
//   uploaded   a tick: students can watch it
// Used wherever the teacher has recordings to deal with: the tray in the live
// classroom, the "class ended" screen, and the banner on their dashboard.
// It reads the store itself, so it updates as an upload progresses without the
// classroom around it re-rendering.

'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { AlertTriangle, Check, Loader2, RotateCw, Trash2, Upload } from 'lucide-react';
import { recordingStore } from '@/lib/classroom/recording/store';
import type { LocalRecording } from '@/lib/classroom/recording/store';
import {
  discardRecording,
  uploadAllRecordings,
  uploadRecording,
} from '@/lib/classroom/recording/api';
import { formatBytes, formatDuration } from '@/lib/classroom/recording/format';

/** The recordings of one class on this computer (every class when `room` is omitted). */
export function useLocalRecordings(room?: string): LocalRecording[] {
  const all = useSyncExternalStore(
    recordingStore.subscribe,
    recordingStore.getSnapshot,
    recordingStore.getServerSnapshot,
  );
  return useMemo(() => (room ? all.filter((r) => r.room === room) : [...all]), [all, room]);
}

function stageText(r: LocalRecording): string {
  if (r.stage === 'preparing') return 'Getting ready…';
  if (r.stage === 'confirming') return 'Finishing up…';
  return `Uploading… ${Math.round(r.progress * 100)}%`;
}

function Row({ r, hint, showDate }: { r: LocalRecording; hint: boolean; showDate: boolean }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li
      className="rounded-lg border border-[var(--cr-border)] bg-[var(--cr-surface-2)] px-3 py-2.5"
      data-testid="recording-row"
      data-phase={r.phase}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-[var(--cr-text)]">
          Recording {r.part}
          {showDate && (
            <span className="ml-2 text-xs font-normal text-[var(--cr-text-muted)]">
              {new Date(r.startedAt).toLocaleString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          )}
        </p>
        {r.phase !== 'recording' && (
          <p className="text-xs text-[var(--cr-text-muted)]">
            {formatDuration(r.durationMs)} · {formatBytes(r.sizeBytes)}
          </p>
        )}
      </div>

      {r.phase === 'recording' && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--cr-text-muted)]">
          <Loader2 size={12} className="animate-spin" /> Being recorded — it can be uploaded as soon as it is finished.
        </p>
      )}

      {r.phase === 'saved' && (
        <>
          <p className="mt-1 text-xs text-[var(--cr-text-muted)]">
            Saved on this computer. Students cannot watch it until you upload it.
          </p>
          {hint && (
            <p className="mt-1 text-xs text-[var(--cr-text-faint)]">
              Uploading uses your internet. To keep the class smooth, you can wait until it ends.
            </p>
          )}
        </>
      )}

      {r.phase === 'uploading' && (
        <div className="mt-2" role="status" aria-live="polite">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-[var(--cr-surface-3)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(r.progress * 100)}
          >
            <div
              className="h-full rounded-full bg-[var(--cr-accent)] transition-[width] duration-300"
              style={{ width: `${Math.max(3, Math.round(r.progress * 100))}%` }}
            />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--cr-text-muted)]">
            <Loader2 size={12} className="animate-spin" />
            {stageText(r)} Keep this tab open.
          </p>
        </div>
      )}

      {r.phase === 'failed' && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-400" role="alert">
          <AlertTriangle size={13} className="mt-px flex-shrink-0" />
          <span>
            {r.error ?? 'The upload did not work.'}
            {r.inStorage ? ' The file itself is already in storage; only the final check is left.' : ''}
          </span>
        </p>
      )}

      {r.phase === 'uploaded' && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400">
          <Check size={13} /> Uploaded — students can watch it from their dashboard.
        </p>
      )}

      {(r.phase === 'saved' || r.phase === 'failed') && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs text-[var(--cr-text-muted)]">
                Discard it? It cannot be recovered.
              </span>
              <button
                type="button"
                onClick={() => void discardRecording(r.id)}
                data-testid="recording-discard-confirm"
                className="rounded-md bg-[var(--cr-danger)] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[var(--cr-danger-hover)]"
              >
                Yes, discard
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md border border-[var(--cr-border-strong)] px-2.5 py-1 text-xs text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)]"
              >
                Keep it
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void uploadRecording(r.id)}
                data-testid="recording-upload"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--cr-accent)] px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
              >
                {r.phase === 'failed' ? <RotateCw size={13} /> : <Upload size={13} />}
                {r.phase === 'failed' ? 'Retry upload' : 'Upload Class Recording'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label={`Discard recording ${r.part}`}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[var(--cr-text-faint)] hover:bg-[var(--cr-surface-3)] hover:text-[var(--cr-text)]"
              >
                <Trash2 size={12} /> Discard
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export default function RecordingList({
  items,
  room,
  duringClass = false,
  showDate = false,
}: {
  items: LocalRecording[];
  /** The class the recordings belong to (for "Upload all"). */
  room: string;
  /** The class is still running: say that uploading shares the connection. */
  duringClass?: boolean;
  /** Say when each was recorded (for a list that mixes several classes). */
  showDate?: boolean;
}) {
  const waiting = items.filter((r) => r.phase === 'saved' || r.phase === 'failed');
  const busy = items.some((r) => r.phase === 'uploading');
  if (items.length === 0) return null;

  return (
    <div data-testid="recording-list">
      {waiting.length > 1 && (
        <button
          type="button"
          onClick={() => void uploadAllRecordings(room)}
          disabled={busy}
          data-testid="recording-upload-all"
          className="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--cr-accent)] px-3 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Upload size={13} /> Upload all {waiting.length} recordings
        </button>
      )}
      <ul className="space-y-2">
        {items.map((r) => (
          <Row key={r.id} r={r} hint={duringClass} showDate={showDate} />
        ))}
      </ul>
    </div>
  );
}

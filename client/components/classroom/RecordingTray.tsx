// FILE PATH: client/components/classroom/RecordingTray.tsx
//
// The teacher's recording card, at the bottom-left of the live classroom. It is
// the one place that says what is going on with the class recording:
//   - what the browser is asking (choose the window to share),
//   - that it is recording, for how long, and what is being recorded,
//   - each finished recording and its Upload Class Recording button, progress,
//     retry and failure (RecordingList),
//   - why a recording stopped by itself, or could not start.
// It only exists for the teacher, and only while there is something to show.

'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Info, Video, X } from 'lucide-react';
import RecordingList, { useLocalRecordings } from './RecordingList';
import type { ClassRecorderControls, RecorderState } from '@/lib/classroom/recording/useClassRecorder';
import type { ClassRecorder } from '@/lib/classroom/recording/ClassRecorder';
import type { CaptureSurface } from '@/lib/classroom/recording/capture';
import { recordingStore } from '@/lib/classroom/recording/store';
import { listRecordingSegments } from '@/lib/classroom/recording/api';
import { formatBytes, formatDuration } from '@/lib/classroom/recording/format';

/** What is being recorded, so the teacher is never surprised by it. */
function surfaceText(surface: CaptureSurface | null): string {
  switch (surface) {
    case 'browser':
      return 'Recording one browser tab — only what is in that tab. The class’s audio (you and your students) is included.';
    case 'monitor':
      return 'Recording your whole screen — everything on it. The class’s audio (you and your students) is included.';
    default:
      return 'Recording a window. The class’s audio (you and your students) is included.';
  }
}

/** How long, and how big so far — its own component so the clock ticking does not
 * re-render anything else. */
function LiveClock({ recorder }: { recorder: ClassRecorder }) {
  const [now, setNow] = useState({ ms: recorder.elapsedMs(), bytes: recorder.bytes() });
  useEffect(() => {
    const id = setInterval(
      () => setNow({ ms: recorder.elapsedMs(), bytes: recorder.bytes() }),
      500,
    );
    return () => clearInterval(id);
  }, [recorder]);
  return (
    <span className="tabular-nums" data-testid="recording-clock">
      {formatDuration(now.ms)} · {formatBytes(now.bytes)}
    </span>
  );
}

/** Recordings of this class the server knows about but that are not on this
 * computer — made before the page was reloaded. */
function useEarlierRecordings(roomName: string) {
  const [earlier, setEarlier] = useState<{ uploaded: number; lost: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    listRecordingSegments(roomName)
      .then((segments) => {
        if (cancelled) return;
        const here = new Set(recordingStore.forRoom(roomName).map((r) => r.id));
        const others = segments.filter((s) => !here.has(s.id));
        setEarlier({
          uploaded: others.filter((s) => s.status === 'AVAILABLE').length,
          lost: others.filter((s) => s.status === 'UPLOADING' || s.status === 'RECORDING').length,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [roomName]);
  return earlier;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** How long the card stays open once a recording starts — long enough to read what
 * is being recorded — before it shrinks to the red dot and the clock, so the
 * lesson stays in view. */
const SETTLE_MS = 8_000;

export default function RecordingTray({
  roomName,
  controls,
}: {
  roomName: string;
  controls: ClassRecorderControls;
}) {
  const items = useLocalRecordings(roomName);
  const earlier = useEarlierRecordings(roomName);
  const { state, recorder, surface, error, notice, dismiss } = controls;

  // Open unless a recording has been running for a while with nothing to tell the
  // teacher. A choice made by the teacher (the header toggles it) holds for the
  // state it was made in only: when the recording stops the card opens again,
  // because there is a new recording to upload.
  const [settled, setSettled] = useState(false);
  const [choice, setChoice] = useState<{ state: RecorderState; open: boolean } | null>(null);
  useEffect(() => {
    if (state !== 'recording') return;
    const id = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => {
      clearTimeout(id);
      setSettled(false);
    };
  }, [state]);
  const defaultOpen = !(state === 'recording' && settled && !notice && !error);
  const open = choice && choice.state === state ? choice.open : defaultOpen;

  const recording = state === 'recording' || state === 'stopping';
  const hasEarlier = !!earlier && (earlier.uploaded > 0 || earlier.lost > 0);
  const visible = state !== 'idle' || items.length > 0 || !!error || !!notice || hasEarlier;
  if (!visible) return null;

  return (
    <div
      className="absolute bottom-3 left-3 z-40 w-[min(92vw,22rem)] cr-fade-in"
      role="region"
      aria-label="Class recording"
      data-testid="recording-tray"
    >
      <div className="rounded-xl border border-[var(--cr-border-strong)] bg-[var(--cr-surface)] shadow-xl">
        <button
          type="button"
          onClick={() => setChoice({ state, open: !open })}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
        >
          {recording ? (
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500 cr-live-dot" />
          ) : (
            <Video size={14} className="flex-shrink-0 text-[var(--cr-text-muted)]" />
          )}
          <span className="flex-1 text-sm font-semibold text-[var(--cr-text)]">
            {state === 'starting'
              ? 'Starting the recording…'
              : recording && recorder
                ? 'Recording'
                : 'Class recording'}
          </span>
          {recording && recorder && (
            <span className="text-xs text-[var(--cr-text-muted)]">
              <LiveClock recorder={recorder} />
            </span>
          )}
          {open ? (
            <ChevronDown size={14} className="text-[var(--cr-text-faint)]" />
          ) : (
            <ChevronUp size={14} className="text-[var(--cr-text-faint)]" />
          )}
        </button>

        {open && (
          <div className="space-y-2.5 border-t border-[var(--cr-border)] px-3.5 pb-3.5 pt-3">
            {state === 'starting' && (
              <p className="flex items-start gap-2 text-xs text-[var(--cr-text-muted)]" data-testid="recording-picker-hint">
                <Info size={14} className="mt-px flex-shrink-0 text-[var(--cr-accent)]" />
                <span>
                  Your browser is asking what to share. Choose <strong>Window</strong> and pick this
                  Lumexa window (or <strong>Chrome Tab</strong> and this tab), then press Share.
                </span>
              </p>
            )}

            {recording && (
              <p className="text-xs text-[var(--cr-text-muted)]" data-testid="recording-surface">
                {surfaceText(surface)}
              </p>
            )}

            {error && (
              <div
                className="flex items-start gap-2 rounded-lg bg-red-500/10 px-2.5 py-2 text-xs text-red-400"
                role="alert"
                data-testid="recording-error"
              >
                <span className="flex-1">{error}</span>
                <button type="button" onClick={dismiss} aria-label="Dismiss" className="flex-shrink-0">
                  <X size={13} />
                </button>
              </div>
            )}
            {notice && !error && (
              <div
                className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs text-amber-300"
                role="status"
                data-testid="recording-notice"
              >
                <span className="flex-1">{notice}</span>
                <button type="button" onClick={dismiss} aria-label="Dismiss" className="flex-shrink-0">
                  <X size={13} />
                </button>
              </div>
            )}

            <RecordingList items={items} room={roomName} duringClass />

            {hasEarlier && earlier && (
              <div className="space-y-1 text-xs" data-testid="recording-earlier">
                {earlier.uploaded > 0 && (
                  <p className="text-emerald-400">
                    Earlier in this class: {plural(earlier.uploaded, 'recording')} already uploaded.
                  </p>
                )}
                {earlier.lost > 0 && (
                  <p className="text-amber-300">
                    {plural(earlier.lost, 'earlier recording')} was not uploaded and is no longer on
                    this computer (the page was reloaded or closed), so students cannot watch it.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

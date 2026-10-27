// FILE PATH: client/components/recordings/RecordingPlayer.tsx
//
// Plays the parts of one class recording. Used in the student's Recordings tab,
// the parent's recordings page and the admin's class view, so it carries no page
// styling of its own beyond the video.
//
// The recordings are in a private bucket: nothing is played until the server has
// handed out a signed URL for the part being watched (and it checked this person
// belongs to the class). That URL expires after a while, so:
//   - a paused video that finds its link dead asks for a new one and carries on
//     from where it stopped (twice at most, then it says so),
//   - and the link is asked for again whenever a part is chosen.
// A class recorded in several goes shows one button per part, and plays on into
// the next part by itself.
//
// Recordings are WebM. Chrome, Edge and Firefox play them; Safari only from 17.4
// (iOS 17.4 too) — anywhere else the player says so rather than showing a black box.

'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RotateCw } from 'lucide-react';
import {
  canPlayRecordings,
  fetchPlayback,
  recordingErrorMessage,
} from '@/lib/classroom/recording/library';
import type { RecordingPart } from '@/lib/classroom/recording/library';
import { describeDuration } from '@/lib/classroom/recording/format';

/** How many times a dead link is replaced before giving up on a part. */
const MAX_LINK_REFRESHES = 2;

interface Request {
  partId: string;
  /** Where to carry on from (a refreshed link resumes the video). */
  resumeAt: number;
  /** Links already replaced for this part. */
  refreshes: number;
  /** Tells one request from the next, even for the same part. */
  nonce: number;
}

type Answer = { nonce: number; url: string } | { nonce: number; error: string };

export default function RecordingPlayer({
  parts,
  initialPartId,
}: {
  parts: RecordingPart[];
  initialPartId?: string;
}) {
  const [supported] = useState(canPlayRecordings);
  const [request, setRequest] = useState<Request>(() => ({
    partId: (parts.find((p) => p.id === initialPartId) ?? parts[0]).id,
    resumeAt: 0,
    refreshes: 0,
    nonce: 0,
  }));
  const [answer, setAnswer] = useState<Answer | null>(null);

  // Ask for the signed link of the part being watched. A request that is no
  // longer the latest (the viewer moved on) is ignored when it comes back.
  useEffect(() => {
    if (!supported) return;
    let current = true;
    const { partId, nonce } = request;
    fetchPlayback(partId)
      .then((playback) => {
        if (current) setAnswer({ nonce, url: playback.url });
      })
      .catch((err: unknown) => {
        if (current) {
          setAnswer({
            nonce,
            error: recordingErrorMessage(err, 'This recording could not be loaded. Please try again.'),
          });
        }
      });
    return () => {
      current = false;
    };
  }, [request, supported]);

  const choosePart = (partId: string) =>
    setRequest((r) => ({ partId, resumeAt: 0, refreshes: 0, nonce: r.nonce + 1 }));

  const tryAgain = () =>
    setRequest((r) => ({ ...r, resumeAt: 0, refreshes: 0, nonce: r.nonce + 1 }));

  const playNext = () => {
    const i = parts.findIndex((p) => p.id === request.partId);
    if (i >= 0 && i < parts.length - 1) choosePart(parts[i + 1].id);
  };

  if (!supported) {
    return (
      <div
        className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
        role="alert"
        data-testid="recording-unsupported"
      >
        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
        <p>
          This browser cannot play Lumexa class recordings (they are WebM videos). Please open this page in
          Chrome, Edge or Firefox — or, on an iPhone, iPad or Mac, update to a recent version of Safari.
        </p>
      </div>
    );
  }

  const ready = answer && answer.nonce === request.nonce ? answer : null;
  const failed = ready && 'error' in ready ? ready.error : null;
  const url = ready && 'url' in ready ? ready.url : null;

  return (
    <div className="space-y-3">
      {parts.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Recording parts">
          {parts.map((p) => {
            const active = p.id === request.partId;
            const length = describeDuration(p.durationSeconds);
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => !active && choosePart(p.id)}
                data-testid="recording-part"
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Part {p.part}
                {length ? ` · ${length}` : ''}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        {url && (
          <video
            key={request.nonce}
            src={url}
            controls
            autoPlay
            playsInline
            preload="metadata"
            controlsList="nodownload"
            className="h-full w-full"
            data-testid="recording-video"
            onLoadedMetadata={(e) => {
              if (request.resumeAt > 0) e.currentTarget.currentTime = request.resumeAt;
            }}
            onEnded={playNext}
            onError={(e) => {
              // Most likely the link ran out while the video sat paused.
              const stoppedAt = e.currentTarget.currentTime || request.resumeAt;
              if (request.refreshes < MAX_LINK_REFRESHES) {
                setRequest((r) => ({
                  ...r,
                  resumeAt: stoppedAt,
                  refreshes: r.refreshes + 1,
                  nonce: r.nonce + 1,
                }));
              } else {
                setAnswer({
                  nonce: request.nonce,
                  error: 'This recording stopped playing. Check your internet connection and try again.',
                });
              }
            }}
          />
        )}

        {!url && !failed && (
          <div
            className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-gray-300"
            role="status"
            data-testid="recording-loading"
          >
            <Loader2 size={18} className="animate-spin" /> Loading the recording…
          </div>
        )}

        {failed && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center"
            role="alert"
            data-testid="recording-error"
          >
            <AlertTriangle size={22} className="text-amber-400" />
            <p className="max-w-sm text-sm text-gray-200">{failed}</p>
            <button
              type="button"
              onClick={tryAgain}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
            >
              <RotateCw size={13} /> Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// FILE PATH: client/components/classroom/Stage.tsx
//
// The classroom's main content area. Priority order for what appears here:
//   1. An active screen share (becomes the stage automatically). Lumexa lets
//      everyone share without asking the teacher first, including several
//      people at once (a full batch can all share at the same time) — so
//      this handles zero, one, or many concurrent shares. With more than
//      one, a small tab strip lets anyone switch which one is "featured"
//      here; the rest stay reachable from the tabs, not hidden.
//   2. A teacher spotlight, or a locally pinned participant
//   3. The lesson material for this session, if any
//   4. The teacher's camera, prominent, as the calm default
//
// Every camera-only branch (2/4, and the empty state) is wrapped in a
// height-first 16:9 frame instead of stretching to fill whatever oddly-
// shaped space is left — that's what was producing the ultra-wide, cropped
// face people were seeing.
//
// Screen-share recursion fix: the LOCAL presenter never gets a <VideoTrack>
// of their own screen-share track — if they're capturing their whole
// monitor, that track's content already includes this very page, so
// rendering it back would create a hall-of-mirrors effect. Everyone else
// sees the presenter's screen normally; the presenter sees a "You are
// presenting" placeholder plus their own camera as a small self tile.

'use client';

import { useEffect } from 'react';
import { Monitor, MonitorOff, ScreenShareOff, Maximize2, MonitorX } from 'lucide-react';
import { Track } from 'livekit-client';
import { isTrackReference, VideoTrack, useTracks } from '@livekit/components-react';
import type { TrackReferenceOrPlaceholder, TrackReference } from '@livekit/components-core';
import ParticipantTile from './ParticipantTile';
import LessonPanel from './LessonPanel';
import type { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';
import { parseParticipantMeta } from '@/lib/classroom/types';

/** Centers content and constrains it to a sensible 16:9-ish frame instead of
 * letting it stretch to fill whatever (often ultra-wide, short) space the
 * flex layout hands it. Height-first: in the common "wide but short"
 * classroom viewport this derives the width from the available height, so
 * a lone camera tile never balloons into a letterboxed sliver of a face. */
function MainFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative h-full w-auto max-w-full aspect-video">{children}</div>
    </div>
  );
}

function ScreenShareTile({
  trackRef,
  isTeacher,
  onForceStopShare,
  onEnterFocusMode,
}: {
  trackRef: TrackReference;
  isTeacher: boolean;
  onForceStopShare?: (identity: string) => void;
  onEnterFocusMode: () => void;
}) {
  const meta = parseParticipantMeta(trackRef.participant.identity, trackRef.participant.name || '');

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-black border border-[var(--cr-border)] relative">
      <VideoTrack trackRef={trackRef} className="w-full h-full object-contain bg-black" />
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur text-white text-xs font-medium flex items-center gap-1.5">
          <Monitor size={12} /> {meta.displayName} is presenting
        </div>
        {isTeacher && (
          <button
            onClick={() => onForceStopShare?.(trackRef.participant.identity)}
            data-tooltip="Stop this screen share"
            className="w-7 h-7 rounded-lg bg-black/50 hover:bg-red-500/70 backdrop-blur flex items-center justify-center text-white transition-colors"
          >
            <MonitorX size={13} />
          </button>
        )}
      </div>
      <button
        onClick={onEnterFocusMode}
        data-tooltip="Focus mode"
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur flex items-center justify-center text-white transition-colors"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}

interface StageProps {
  cameraTracks: TrackReferenceOrPlaceholder[];
  pinnedIdentity: string | null;
  spotlightIdentity: string | null;
  raisedHands: Record<string, boolean>;
  onTogglePin: (identity: string) => void;
  lessonData: LessonDetailsResponse | null;
  onStopShare: () => void;
  isTeacher: boolean;
  featuredShareIdentity: string | null;
  onSelectShare: (identity: string) => void;
  onForceStopShare?: (identity: string) => void;
  onEnterFocusMode: () => void;
}

export default function Stage({
  cameraTracks,
  pinnedIdentity,
  spotlightIdentity,
  raisedHands,
  onTogglePin,
  lessonData,
  onStopShare,
  isTeacher,
  featuredShareIdentity,
  onSelectShare,
  onForceStopShare,
  onEnterFocusMode,
}: StageProps) {
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  const screenShareRefs = screenTracks.filter(isTrackReference);
  const remoteShares = screenShareRefs.filter((t) => !t.participant.isLocal);
  const localShare = screenShareRefs.find((t) => t.participant.isLocal);

  // Keep the caller's featured selection valid — default to the first
  // active remote share whenever the current pick disappears (or nothing's
  // picked yet).
  useEffect(() => {
    if (remoteShares.length === 0) return;
    if (!remoteShares.some((t) => t.participant.identity === featuredShareIdentity)) {
      onSelectShare(remoteShares[0].participant.identity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteShares.map((t) => t.participant.identity).join(',')]);

  // ── 1. Screen share(s) ─────────────────────────────────────────────────
  if (remoteShares.length > 0) {
    const featured = remoteShares.find((t) => t.participant.identity === featuredShareIdentity) ?? remoteShares[0];

    return (
      <div className="w-full h-full flex flex-col gap-2 min-h-0">
        {remoteShares.length > 1 && (
          <div className="flex-shrink-0 flex items-center gap-1.5 overflow-x-auto cr-scroll">
            {remoteShares.map((t) => {
              const meta = parseParticipantMeta(t.participant.identity, t.participant.name || '');
              const active = t === featured;
              return (
                <button
                  key={t.participant.identity}
                  onClick={() => onSelectShare(t.participant.identity)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[var(--cr-accent)]/15 border border-[var(--cr-accent)]/40 text-[var(--cr-accent)]'
                      : 'bg-[var(--cr-surface-2)] border border-[var(--cr-border)] text-[var(--cr-text-muted)] hover:text-[var(--cr-text)]'
                  }`}
                >
                  <Monitor size={12} /> {meta.displayName}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 min-h-0 relative">
          <ScreenShareTile
            trackRef={featured}
            isTeacher={isTeacher}
            onForceStopShare={onForceStopShare}
            onEnterFocusMode={onEnterFocusMode}
          />

          {localShare && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/60 backdrop-blur text-white text-xs font-medium">
              <Monitor size={13} /> You&apos;re also sharing your screen
              <button
                onClick={onStopShare}
                className="ml-1 text-red-300 hover:text-red-200 font-semibold"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (localShare) {
    const localCam = cameraTracks.find((t) => t.participant.isLocal);
    return (
      <div className="w-full h-full rounded-2xl bg-[var(--cr-surface)] border border-[var(--cr-border)] flex flex-col items-center justify-center gap-4 relative">
        <div className="w-16 h-16 rounded-2xl bg-[var(--cr-accent)]/15 flex items-center justify-center">
          <Monitor size={28} className="text-[var(--cr-accent)]" />
        </div>
        <div className="text-center">
          <p className="text-[var(--cr-text)] font-semibold">You are sharing your screen</p>
          <p className="text-[var(--cr-text-muted)] text-sm mt-1">
            Everyone in class can see your shared screen.
          </p>
        </div>
        <button
          onClick={onStopShare}
          className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-sm font-medium transition-colors"
        >
          <ScreenShareOff size={16} /> Stop sharing
        </button>

        {localCam && (
          <div className="absolute bottom-4 right-4 w-32 sm:w-40 aspect-video rounded-lg overflow-hidden shadow-xl">
            <ParticipantTile trackRef={localCam} size="strip" />
          </div>
        )}
      </div>
    );
  }

  // ── 2. Spotlight / pin ─────────────────────────────────────────────────
  const focusIdentity = spotlightIdentity ?? pinnedIdentity;
  if (focusIdentity) {
    const focusTrack = cameraTracks.find((t) => t.participant.identity === focusIdentity);
    if (focusTrack) {
      return (
        <MainFrame>
          <ParticipantTile
            trackRef={focusTrack}
            size="main"
            raised={!!raisedHands[focusTrack.participant.identity]}
            pinned={pinnedIdentity === focusIdentity}
            onTogglePin={() => onTogglePin(focusIdentity)}
            spotlighted={spotlightIdentity === focusIdentity}
          />
        </MainFrame>
      );
    }
  }

  // ── 3. Lesson material ─────────────────────────────────────────────────
  if (lessonData) {
    return <LessonPanel data={lessonData} />;
  }

  // ── 4. Default: teacher prominent, or a calm empty state ──────────────
  const teacherTrack = cameraTracks.find(
    (t) => parseParticipantMeta(t.participant.identity, t.participant.name || '').role === 'TEACHER',
  );
  if (teacherTrack) {
    return (
      <MainFrame>
        <ParticipantTile
          trackRef={teacherTrack}
          size="main"
          raised={!!raisedHands[teacherTrack.participant.identity]}
          pinned={pinnedIdentity === teacherTrack.participant.identity}
          onTogglePin={() => onTogglePin(teacherTrack.participant.identity)}
        />
      </MainFrame>
    );
  }

  return (
    <MainFrame>
      <div className="w-full h-full rounded-2xl bg-[var(--cr-surface)] border border-[var(--cr-border)] flex flex-col items-center justify-center gap-2 text-[var(--cr-text-muted)]">
        <MonitorOff size={28} className="opacity-40" />
        <p className="text-sm">Waiting for the teacher to join…</p>
      </div>
    </MainFrame>
  );
}

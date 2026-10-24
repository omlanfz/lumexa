// FILE PATH: client/components/classroom/Stage.tsx
//
// The classroom's main content area. Priority order for what appears here:
//   1. Active screen share(s) — becomes the stage automatically. Lumexa
//      lets everyone share without asking the teacher first, including
//      several people at once (a full batch can all share at the same
//      time), and EVERY participant sees EVERY currently-shared screen at
//      once, all equal size/priority in a responsive grid — never a single
//      "featured" tile with the rest hidden. The header and bottom control
//      bar stay visible as normal; sharing never auto-hides them or auto-
//      enters fullscreen. Each tile gets its own ⛶ fullscreen toggle —
//      clicking it hands the chosen identity up to ClassroomRoom, which
//      renders that one tile covering the whole viewport with the header/
//      control bar turned into an auto-hiding glass overlay on top (see
//      ClassroomRoom's `fullscreenIdentity` state) — never real per-
//      element Fullscreen API, so the header/bar can float above it.
//   2. A teacher spotlight, or a locally pinned participant
//   3. The lesson material for this session, if any
//   4. The teacher's camera, prominent, as the calm default
//
// Every camera-only branch (2/4, and the empty state) is wrapped in a
// height-first 16:9 frame instead of stretching to fill whatever oddly-
// shaped space is left — that's what was producing the ultra-wide, cropped
// face people were seeing.
//
// Every presenter — including the local one — sees the real video for
// every active share, their own included. Sharing a specific window/tab
// (the common case) has no recursion risk at all; sharing your entire
// screen while this page is visible on it can produce a hall-of-mirrors
// look, but that's an acceptable, understood tradeoff for actually being
// able to see what you're presenting, same as any other video-call app.

'use client';

import { Monitor, MonitorOff, Maximize2, Minimize2, MonitorX } from 'lucide-react';
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

/** One tile per active screen share, remote or local — every tile shows
 * the real video and gets its own fullscreen toggle: the ⛶/⤢ button in its
 * top-right corner (always rendered, high-contrast chip, never a bare icon
 * on transparent black so it can't silently blend into shared content), or
 * a double-click anywhere on the tile for the same effect. Fullscreen
 * itself is NOT the browser's per-element Fullscreen API — see the file
 * header comment — so toggling it is just reporting the choice up to the
 * caller. */
function ScreenShareTile({
  trackRef,
  isTeacher,
  isLocal,
  isFullscreen,
  onToggleFullscreen,
  onForceStopShare,
  onStopOwnShare,
}: {
  trackRef: TrackReference;
  isTeacher: boolean;
  isLocal: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onForceStopShare?: (identity: string) => void;
  onStopOwnShare?: () => void;
}) {
  const meta = parseParticipantMeta(trackRef.participant.identity, trackRef.participant.name || '');

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden bg-black border border-[var(--cr-border)] relative cursor-pointer"
      onDoubleClick={onToggleFullscreen}
    >
      <VideoTrack trackRef={trackRef} className="w-full h-full object-contain bg-black" />
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur text-white text-xs font-medium flex items-center gap-1.5">
          <Monitor size={12} /> {isLocal ? 'You are presenting' : `${meta.displayName} is presenting`}
        </div>
        {isLocal ? (
          <button
            onClick={onStopOwnShare}
            data-tooltip="Stop sharing"
            className="w-7 h-7 rounded-lg bg-black/50 hover:bg-red-500/70 backdrop-blur flex items-center justify-center text-white transition-colors"
          >
            <MonitorX size={13} />
          </button>
        ) : (
          isTeacher && (
            <button
              onClick={() => onForceStopShare?.(trackRef.participant.identity)}
              data-tooltip="Stop this screen share"
              className="w-7 h-7 rounded-lg bg-black/50 hover:bg-red-500/70 backdrop-blur flex items-center justify-center text-white transition-colors"
            >
              <MonitorX size={13} />
            </button>
          )
        )}
      </div>
      <button
        onClick={onToggleFullscreen}
        data-tooltip={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 border border-white/15 backdrop-blur flex items-center justify-center text-white transition-colors"
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  );
}

/** Roughly-square grid column count for N tiles — good enough for Lumexa's
 * real class sizes (1 teacher + up to 4 students, so at most 5 shares). */
function gridColumns(count: number): number {
  return Math.max(1, Math.ceil(Math.sqrt(count)));
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
  onForceStopShare?: (identity: string) => void;
  /** Identity of the screen share ClassroomRoom is currently rendering
   * fullscreen (or null) — see the file header comment. */
  fullscreenIdentity: string | null;
  onToggleFullscreen: (identity: string) => void;
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
  onForceStopShare,
  fullscreenIdentity,
  onToggleFullscreen,
}: StageProps) {
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  const screenShareRefs = screenTracks.filter(isTrackReference);

  // ── 1. Screen share(s) ─────────────────────────────────────────────────
  if (screenShareRefs.length > 0) {
    const cols = gridColumns(screenShareRefs.length);

    return (
      <div
        className="w-full h-full grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: '1fr' }}
      >
        {screenShareRefs.map((t) => (
          <ScreenShareTile
            key={t.participant.identity}
            trackRef={t}
            isTeacher={isTeacher}
            isLocal={t.participant.isLocal}
            isFullscreen={fullscreenIdentity === t.participant.identity}
            onToggleFullscreen={() => onToggleFullscreen(t.participant.identity)}
            onForceStopShare={onForceStopShare}
            onStopOwnShare={onStopShare}
          />
        ))}
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

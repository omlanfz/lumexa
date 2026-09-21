// FILE PATH: client/components/classroom/Stage.tsx
//
// The classroom's main content area. Priority order for what appears here:
//   1. Active screen share(s) — becomes the stage automatically. Lumexa
//      lets everyone share without asking the teacher first, including
//      several people at once (a full batch can all share at the same
//      time), and EVERY participant sees EVERY currently-shared screen at
//      once — a responsive grid, not a single "featured" tile with the
//      rest hidden behind a switcher. Each remote tile gets its own ⛶
//      fullscreen toggle (native Fullscreen API, scoped to that one tile);
//      while a tile is fullscreen, a floating draggable "PIP" participants
//      window and a small auto-hiding control bar ride along inside it —
//      see ScreenShareFullscreenChrome.
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
// sees the presenter's screen normally; the presenter's own tile in the
// grid is a small "You are presenting" placeholder instead.

'use client';

import { useEffect, useRef, useState } from 'react';
import { Monitor, MonitorOff, Maximize2, Minimize2, MonitorX } from 'lucide-react';
import { Track } from 'livekit-client';
import { isTrackReference, VideoTrack, useTracks } from '@livekit/components-react';
import type { TrackReferenceOrPlaceholder, TrackReference } from '@livekit/components-core';
import ParticipantTile from './ParticipantTile';
import LessonPanel from './LessonPanel';
import ScreenShareFullscreenChrome from './ScreenShareFullscreenChrome';
import type { RecordingUiState } from './ControlBar';
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

interface FullscreenChromeProps {
  cameraTracks: TrackReferenceOrPlaceholder[];
  raisedHands: Record<string, boolean>;
  isTeacher: boolean;
  micEnabled: boolean;
  camEnabled: boolean;
  screenShareEnabled: boolean;
  micDisabledByTeacher?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  recordingState: RecordingUiState;
  onToggleRecording: () => void;
}

function RemoteScreenShareTile({
  trackRef,
  isTeacher,
  onForceStopShare,
  fullscreenChromeProps,
}: {
  trackRef: TrackReference;
  isTeacher: boolean;
  onForceStopShare?: (identity: string) => void;
  fullscreenChromeProps: FullscreenChromeProps;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const meta = parseParticipantMeta(trackRef.participant.identity, trackRef.participant.name || '');

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl overflow-hidden bg-black border border-[var(--cr-border)] relative [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
    >
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
        onClick={toggleFullscreen}
        data-tooltip={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur flex items-center justify-center text-white transition-colors"
      >
        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>

      {isFullscreen && <ScreenShareFullscreenChrome {...fullscreenChromeProps} onExit={toggleFullscreen} />}
    </div>
  );
}

function OwnScreenSharePlaceholder({ onStopShare }: { onStopShare: () => void }) {
  return (
    <div className="w-full h-full rounded-2xl bg-[var(--cr-surface)] border border-[var(--cr-border)] flex flex-col items-center justify-center gap-2 p-4 text-center">
      <Monitor size={22} className="text-[var(--cr-accent)]" />
      <p className="text-[var(--cr-text)] text-xs font-semibold">You are presenting</p>
      <button
        onClick={onStopShare}
        className="text-[11px] font-medium text-red-400 hover:text-red-300 underline underline-offset-2"
      >
        Stop sharing
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
  // Passed straight through to whichever tile is currently fullscreen, for
  // its embedded PIP participants window + floating control bar.
  micEnabled: boolean;
  camEnabled: boolean;
  screenShareEnabled: boolean;
  micDisabledByTeacher?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  recordingState: RecordingUiState;
  onToggleRecording: () => void;
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
  micEnabled,
  camEnabled,
  screenShareEnabled,
  micDisabledByTeacher,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  recordingState,
  onToggleRecording,
}: StageProps) {
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  const screenShareRefs = screenTracks.filter(isTrackReference);
  const remoteShares = screenShareRefs.filter((t) => !t.participant.isLocal);
  const localShare = screenShareRefs.find((t) => t.participant.isLocal);

  // ── 1. Screen share(s) ─────────────────────────────────────────────────
  if (remoteShares.length > 0 || localShare) {
    const tileCount = remoteShares.length + (localShare ? 1 : 0);
    const cols = gridColumns(tileCount);
    const fullscreenChromeProps: FullscreenChromeProps = {
      cameraTracks,
      raisedHands,
      isTeacher,
      micEnabled,
      camEnabled,
      screenShareEnabled,
      micDisabledByTeacher,
      onToggleMic,
      onToggleCam,
      onToggleScreenShare,
      recordingState,
      onToggleRecording,
    };

    return (
      <div
        className="w-full h-full grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: '1fr' }}
      >
        {remoteShares.map((t) => (
          <RemoteScreenShareTile
            key={t.participant.identity}
            trackRef={t}
            isTeacher={isTeacher}
            onForceStopShare={onForceStopShare}
            fullscreenChromeProps={fullscreenChromeProps}
          />
        ))}
        {localShare && <OwnScreenSharePlaceholder onStopShare={onStopShare} />}
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

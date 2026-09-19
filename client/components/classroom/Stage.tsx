// FILE PATH: client/components/classroom/Stage.tsx
//
// The classroom's main content area. Priority order for what appears here:
//   1. An active screen share (becomes the stage automatically)
//   2. A teacher spotlight, or a locally pinned participant
//   3. The lesson material for this session, if any
//   4. The teacher's camera, prominent, as the calm default
//
// Screen-share recursion fix (priority #1 of the whole redesign): the LOCAL
// presenter never gets a <VideoTrack> of their own screen-share track — if
// they are capturing their entire monitor, that track's content already
// includes this very page, so rendering it back into the page would create
// the hall-of-mirrors effect from the bug report. Everyone else sees the
// presenter's screen normally; the presenter sees a "You are presenting"
// placeholder plus their own camera as a small self tile instead.

'use client';

import { Monitor, MonitorOff, ScreenShareOff } from 'lucide-react';
import { Track } from 'livekit-client';
import { isTrackReference, VideoTrack, useTracks } from '@livekit/components-react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import ParticipantTile from './ParticipantTile';
import LessonPanel from './LessonPanel';
import type { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';
import { parseParticipantMeta } from '@/lib/classroom/types';

interface StageProps {
  cameraTracks: TrackReferenceOrPlaceholder[];
  pinnedIdentity: string | null;
  spotlightIdentity: string | null;
  raisedHands: Record<string, boolean>;
  onTogglePin: (identity: string) => void;
  lessonData: LessonDetailsResponse | null;
  onStopShare: () => void;
}

export default function Stage({
  cameraTracks,
  pinnedIdentity,
  spotlightIdentity,
  raisedHands,
  onTogglePin,
  lessonData,
  onStopShare,
}: StageProps) {
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  const screenShare = screenTracks.find((t) => isTrackReference(t));
  const isLocalSharing = screenShare && screenShare.participant.isLocal;

  // ── 1. Screen share ────────────────────────────────────────────────────
  if (screenShare) {
    if (isLocalSharing) {
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

    const meta = parseParticipantMeta(screenShare.participant.identity, screenShare.participant.name || '');
    return (
      <div className="w-full h-full rounded-2xl overflow-hidden bg-black border border-[var(--cr-border)] relative">
        <VideoTrack trackRef={screenShare} className="w-full h-full object-contain bg-black" />
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur text-white text-xs font-medium flex items-center gap-1.5">
          <Monitor size={12} /> {meta.displayName} is presenting
        </div>
      </div>
    );
  }

  // ── 2. Spotlight / pin ─────────────────────────────────────────────────
  const focusIdentity = spotlightIdentity ?? pinnedIdentity;
  if (focusIdentity) {
    const focusTrack = cameraTracks.find((t) => t.participant.identity === focusIdentity);
    if (focusTrack) {
      return (
        <div className="w-full h-full">
          <ParticipantTile
            trackRef={focusTrack}
            size="main"
            raised={!!raisedHands[focusTrack.participant.identity]}
            pinned={pinnedIdentity === focusIdentity}
            onTogglePin={() => onTogglePin(focusIdentity)}
            spotlighted={spotlightIdentity === focusIdentity}
          />
        </div>
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
      <div className="w-full h-full">
        <ParticipantTile
          trackRef={teacherTrack}
          size="main"
          raised={!!raisedHands[teacherTrack.participant.identity]}
          pinned={pinnedIdentity === teacherTrack.participant.identity}
          onTogglePin={() => onTogglePin(teacherTrack.participant.identity)}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-2xl bg-[var(--cr-surface)] border border-[var(--cr-border)] flex flex-col items-center justify-center gap-2 text-[var(--cr-text-muted)]">
      <MonitorOff size={28} className="opacity-40" />
      <p className="text-sm">Waiting for the teacher to join…</p>
    </div>
  );
}

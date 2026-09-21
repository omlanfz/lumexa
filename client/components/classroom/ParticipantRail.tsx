// FILE PATH: client/components/classroom/ParticipantRail.tsx
//
// Desktop-only compact vertical rail of participant video tiles, shown on
// the right of the main stage at all times (not just while screen-sharing)
// — this is the fix for the classroom's old layout-hierarchy problem: a
// huge, awkwardly-cropped main camera plus a duplicated bottom filmstrip
// AND a separate participant list. Now there's one clear hierarchy: main
// stage (teaching content) + this rail (who's here) + FilmStrip taking over
// only below the lg breakpoint, where there's no room for a side column.
//
// Sized for Lumexa's real class shapes — 1:1 (teacher + student) or a batch
// of up to ~4 students — never a large gallery grid.

'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import ParticipantTile from './ParticipantTile';

interface ParticipantRailProps {
  tracks: TrackReferenceOrPlaceholder[];
  raisedHands: Record<string, boolean>;
  pinnedIdentity: string | null;
  onTogglePin: (identity: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function ParticipantRail({
  tracks,
  raisedHands,
  pinnedIdentity,
  onTogglePin,
  collapsed,
  onToggleCollapsed,
}: ParticipantRailProps) {
  if (tracks.length === 0) return null;

  // The toggle button lives in this OUTER wrapper, which never collapses or
  // clips — only the inner content box does. Previously the button was
  // inside the width-0/overflow-hidden box it controlled, so collapsing the
  // rail also hid the only way to bring it back.
  return (
    <div className="hidden lg:flex flex-shrink-0 relative">
      <button
        onClick={onToggleCollapsed}
        data-tooltip={collapsed ? 'Show participants' : 'Collapse panel'}
        className="absolute top-1/2 -left-3 -translate-y-1/2 z-20 w-6 h-12 rounded-md bg-[var(--cr-surface-2)] border border-[var(--cr-border)] flex items-center justify-center text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)] transition-colors"
      >
        {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <div
        className={`flex flex-col border-l border-[var(--cr-border)] bg-[var(--cr-bg)] transition-all duration-200 overflow-hidden ${
          collapsed ? 'w-0' : 'w-[220px] xl:w-[260px]'
        }`}
      >
        <div className="flex-1 overflow-y-auto cr-scroll p-2 flex flex-col gap-2 w-[220px] xl:w-[260px]">
          {tracks.map((t) => (
            <div key={t.participant.identity} className="aspect-video flex-shrink-0">
              <ParticipantTile
                trackRef={t}
                size="strip"
                raised={!!raisedHands[t.participant.identity]}
                pinned={pinnedIdentity === t.participant.identity}
                onTogglePin={() => onTogglePin(t.participant.identity)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

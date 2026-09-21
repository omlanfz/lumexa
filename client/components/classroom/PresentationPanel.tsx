// FILE PATH: client/components/classroom/PresentationPanel.tsx
//
// Desktop-only right-side vertical participant strip shown while someone is
// screen-sharing (see ClassroomRoom — presentation mode is entirely driven
// by whether a screen-share track exists, never a manual toggle). Never
// rendered below the lg breakpoint — FilmStrip's bottom-strip layout
// already covers mobile/tablet presentation mode, so this and FilmStrip are
// mutually exclusive by breakpoint, not by extra state.

'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import ParticipantTile from './ParticipantTile';

interface PresentationPanelProps {
  tracks: TrackReferenceOrPlaceholder[];
  raisedHands: Record<string, boolean>;
  pinnedIdentity: string | null;
  onTogglePin: (identity: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function PresentationPanel({
  tracks,
  raisedHands,
  pinnedIdentity,
  onTogglePin,
  collapsed,
  onToggleCollapsed,
}: PresentationPanelProps) {
  return (
    <div
      className={`hidden lg:flex flex-col flex-shrink-0 border-l border-[var(--cr-border)] bg-[var(--cr-bg)] transition-all duration-200 relative ${
        collapsed ? 'w-0 overflow-hidden' : 'w-[220px] xl:w-[260px]'
      }`}
    >
      <button
        onClick={onToggleCollapsed}
        data-tooltip={collapsed ? 'Show participants' : 'Collapse panel'}
        className="absolute top-1/2 -left-3 -translate-y-1/2 z-10 w-6 h-12 rounded-md bg-[var(--cr-surface-2)] border border-[var(--cr-border)] flex items-center justify-center text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)] transition-colors"
      >
        {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto cr-scroll p-2 flex flex-col gap-2">
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
      )}
    </div>
  );
}

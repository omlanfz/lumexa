// FILE PATH: client/components/classroom/FilmStrip.tsx
//
// Secondary participant video strip, shown below the main stage. Shrinks to
// a thin horizontal strip in presentation mode (see ClassroomRoom).

'use client';

import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import ParticipantTile from './ParticipantTile';

interface FilmStripProps {
  tracks: TrackReferenceOrPlaceholder[];
  raisedHands: Record<string, boolean>;
  pinnedIdentity: string | null;
  onTogglePin: (identity: string) => void;
  compact?: boolean;
  className?: string;
}

export default function FilmStrip({ tracks, raisedHands, pinnedIdentity, onTogglePin, compact, className }: FilmStripProps) {
  if (tracks.length === 0) return null;

  return (
    <div
      className={`flex gap-2.5 overflow-x-auto cr-scroll flex-shrink-0 ${
        compact ? 'h-20' : 'h-28 sm:h-32'
      } ${className ?? ''}`}
    >
      {tracks.map((t) => (
        <div key={t.participant.identity} className={`${compact ? 'w-32' : 'w-40 sm:w-48'} h-full flex-shrink-0`}>
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
  );
}

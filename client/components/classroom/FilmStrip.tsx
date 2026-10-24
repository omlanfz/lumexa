// FILE PATH: client/components/classroom/FilmStrip.tsx
//
// Secondary participant video strip, shown below the main stage. Shrinks to
// a thin horizontal strip in presentation mode (see ClassroomRoom).

'use client';

import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import ParticipantTile from './ParticipantTile';
import { personKey } from '@/lib/classroom/identity';

interface FilmStripProps {
  /** One tile per person (see pickPersonTiles). */
  tracks: TrackReferenceOrPlaceholder[];
  /** Keyed by person (see lib/classroom/identity.ts). */
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
      {tracks.map((t) => {
        const who = personKey(t.participant.identity);
        return (
          <div key={who} className={`${compact ? 'w-32' : 'w-40 sm:w-48'} h-full flex-shrink-0`}>
            <ParticipantTile
              trackRef={t}
              size="strip"
              raised={!!raisedHands[who]}
              pinned={pinnedIdentity === who}
              onTogglePin={() => onTogglePin(who)}
            />
          </div>
        );
      })}
    </div>
  );
}

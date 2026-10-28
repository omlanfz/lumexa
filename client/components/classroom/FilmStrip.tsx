// FILE PATH: client/components/classroom/FilmStrip.tsx
//
// Secondary participant video strip, shown below the main stage. Shrinks to
// a thin horizontal strip in presentation mode (see ClassroomRoom).

'use client';

import ParticipantTile from './ParticipantTile';
import type { Person } from '@/lib/classroom/people';

interface FilmStripProps {
  /** One tile per person (see groupPeople). */
  people: Person[];
  /** Keyed by person (see lib/classroom/identity.ts). */
  raisedHands: Record<string, boolean>;
  pinnedUserId: string | null;
  onTogglePin: (userId: string) => void;
  compact?: boolean;
  className?: string;
}

export default function FilmStrip({ people, raisedHands, pinnedUserId, onTogglePin, compact, className }: FilmStripProps) {
  if (people.length === 0) return null;

  return (
    <div
      className={`flex gap-2.5 overflow-x-auto cr-scroll flex-shrink-0 ${
        compact ? 'h-20' : 'h-28 sm:h-32'
      } ${className ?? ''}`}
    >
      {people.map((person) => (
        <div key={person.userId} className={`${compact ? 'w-32' : 'w-40 sm:w-48'} h-full flex-shrink-0`}>
          <ParticipantTile
            person={person}
            size="strip"
            raised={!!raisedHands[person.userId]}
            pinned={pinnedUserId === person.userId}
            onTogglePin={() => onTogglePin(person.userId)}
          />
        </div>
      ))}
    </div>
  );
}

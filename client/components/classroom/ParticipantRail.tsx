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
// Sized for Lumexa's real class shapes — 1:1 (teacher + student) or a batch of
// about 4 students — but a classroom holds up to 10 people, so past five tiles
// the rail goes two to a row, and the tiles are sized from the window's height
// so every one of them stays on screen instead of scrolling out of sight (see
// lib/classroom/railLayout.ts).

'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';
import ParticipantTile from './ParticipantTile';
import type { Person } from '@/lib/classroom/people';
import { railLayout, railTileWidthCss, railWidthCss } from '@/lib/classroom/railLayout';

interface ParticipantRailProps {
  /** One tile per person (see groupPeople). */
  people: Person[];
  raisedHands: Record<string, boolean>;
  pinnedUserId: string | null;
  onTogglePin: (userId: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function ParticipantRail({
  people,
  raisedHands,
  pinnedUserId,
  onTogglePin,
  collapsed,
  onToggleCollapsed,
}: ParticipantRailProps) {
  if (people.length === 0) return null;

  const { columns } = railLayout(people.length);
  const twoColumns = columns === 2;
  const tileW = railTileWidthCss(people.length);
  const railW = railWidthCss(people.length, tileW);

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
        data-testid="participant-rail"
        data-columns={twoColumns ? 2 : 1}
        className="flex flex-col border-l border-[var(--cr-border)] bg-[var(--cr-bg)] transition-all duration-200 overflow-hidden"
        style={{ width: collapsed ? 0 : railW }}
      >
        <div
          className={`flex-1 overflow-y-auto cr-scroll p-2 gap-2 ${
            twoColumns ? 'grid grid-cols-2 content-start' : 'flex flex-col'
          }`}
          style={{ width: railW }}
        >
          {people.map((person) => (
            <div key={person.userId} className="aspect-video flex-shrink-0 min-h-0">
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
      </div>
    </div>
  );
}

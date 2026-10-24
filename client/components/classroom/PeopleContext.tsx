// FILE PATH: client/components/classroom/PeopleContext.tsx
//
// Lets any tile or row ask "which connections belong to this person?" without
// every component between ClassroomRoom and the tile having to pass the map
// down. A person on two devices is two LiveKit participants but one tile.

'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Participant } from 'livekit-client';
import { useParticipants } from '@livekit/components-react';
import { personKey } from '@/lib/classroom/identity';
import { groupByPerson } from '@/lib/classroom/people';

const PeopleContext = createContext<Map<string, Participant[]> | null>(null);

/** Mount inside <LiveKitRoom>, around everything that shows people. */
export function PeopleProvider({ children }: { children: React.ReactNode }) {
  const participants = useParticipants();
  const byPerson = useMemo(() => groupByPerson(participants), [participants]);
  return <PeopleContext.Provider value={byPerson}>{children}</PeopleContext.Provider>;
}

/** Every connection of the person behind `participant` (at least that one). */
export function usePeersOf(participant: Participant): Participant[] {
  const byPerson = useContext(PeopleContext);
  return byPerson?.get(personKey(participant.identity)) ?? [participant];
}

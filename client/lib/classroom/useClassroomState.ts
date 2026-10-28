// FILE PATH: client/lib/classroom/useClassroomState.ts
//
// Reads the shared classroom state (chat lock, "students muted" policy, the REC
// badge, the room lock) from the room — Daily's meeting session data, which the
// store keeps live — and lets the teacher change the first two. Teacher writes go
// through the authenticated PATCH /classroom/:room/state endpoint (see ./api.ts):
// the server is the one that writes the room's state.
//
// A change the teacher makes shows at once and is replaced by the room's own
// answer when it arrives (Daily shares session data at most once a second), or
// taken back if the server refused it.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCallSnapshot } from './daily/CallContext';
import { ClassroomState } from './types';
import { updateClassroomState } from './api';

/** An optimistic change that the room never confirmed stops being believed after this. */
const UNCONFIRMED_AFTER_MS = 5_000;

export function useClassroomState(roomName: string, isTeacher: boolean) {
  const { classState } = useCallSnapshot();
  const [pending, setPending] = useState<ClassroomState>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Once the room agrees with a change, it is no longer "pending" — adjusted as
  // the room's state arrives, in the render that sees it (not in an effect).
  const [seenState, setSeenState] = useState(classState);
  if (seenState !== classState) {
    setSeenState(classState);
    const stillPending = { ...pending };
    let confirmed = false;
    for (const key of Object.keys(pending) as (keyof ClassroomState)[]) {
      if (classState[key] === pending[key]) {
        delete stillPending[key];
        confirmed = true;
      }
    }
    if (confirmed) setPending(stillPending);
  }

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const state = useMemo(() => ({ ...classState, ...pending }), [classState, pending]);

  const patch = useCallback(
    async (next: ClassroomState) => {
      if (!isTeacher) return;
      const keys = Object.keys(next) as (keyof ClassroomState)[];
      const withdraw = () =>
        setPending((previous) => {
          const rest = { ...previous };
          let changed = false;
          for (const key of keys) {
            if (key in rest && rest[key] === next[key]) {
              delete rest[key];
              changed = true;
            }
          }
          return changed ? rest : previous;
        });
      setPending((previous) => ({ ...previous, ...next }));
      timers.current.push(setTimeout(withdraw, UNCONFIRMED_AFTER_MS));
      try {
        await updateClassroomState(roomName, next);
      } catch {
        // Transient failure (or the room has no meeting yet): the toggle goes back.
        withdraw();
      }
    },
    [roomName, isTeacher],
  );

  return { state, patch };
}

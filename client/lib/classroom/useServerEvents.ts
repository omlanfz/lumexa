// FILE PATH: client/lib/classroom/useServerEvents.ts
//
// Listens for the messages the SERVER sends this participant (a badge
// celebration; being told why they are being removed). Daily does not say which
// app messages come from the server, so a message is believed only if it carries
// the key the server gave this browser in its join response (see serverEvents.ts):
// nothing another participant sends can ever pass for it.

import { useEffect, useRef } from 'react';
import { useCallStore, useEventKey } from './daily/CallContext';
import { readServerMessage, type ServerEvent } from './serverEvents';

export function useServerEvents(onEvent: (event: ServerEvent) => void): void {
  const store = useCallStore();
  const eventKey = useEventKey();
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  });

  useEffect(
    () =>
      store.onMessage(({ data }) => {
        const event = readServerMessage(data, eventKey);
        if (event) handlerRef.current(event);
      }),
    [store, eventKey],
  );
}

// FILE PATH: client/components/classroom/ReactionsOverlay.tsx
//
// Floating emoji reactions broadcast from the chat panel's quick-react bar —
// purely decorative, room-wide (not attached to any one tile or message).

'use client';

import type { Reaction } from '@/lib/classroom/useClassroomControls';

export default function ReactionsOverlay({ reactions }: { reactions: Reaction[] }) {
  if (reactions.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center overflow-hidden h-40">
      {reactions.map((r, i) => (
        <span
          key={r.id}
          className="cr-reaction-float absolute text-3xl"
          style={{ left: `${40 + ((i * 37) % 20) - 10}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

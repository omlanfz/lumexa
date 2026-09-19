// FILE PATH: client/components/classroom/ConnectionBanner.tsx
//
// A single, unobtrusive banner shown only to the affected user when their
// own connection quality drops — avoids per-tile noise for everyone else.

'use client';

import { WifiOff } from 'lucide-react';
import { ConnectionQuality } from 'livekit-client';
import { useConnectionQualityIndicator, useLocalParticipant } from '@livekit/components-react';

export default function ConnectionBanner() {
  const { localParticipant } = useLocalParticipant();
  const { quality } = useConnectionQualityIndicator({ participant: localParticipant });

  if (quality !== ConnectionQuality.Poor) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full bg-red-500/15 border border-red-500/30 backdrop-blur text-red-300 text-xs font-medium shadow-lg cr-fade-in">
      <WifiOff size={13} />
      Your connection is unstable — video or audio may lag.
    </div>
  );
}

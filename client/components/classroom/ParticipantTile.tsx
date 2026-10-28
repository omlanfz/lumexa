// FILE PATH: client/components/classroom/ParticipantTile.tsx
//
// A single PERSON's camera tile — used in the main stage, the filmstrip, and
// the default grid. Shows name/role, mic/cam state, connection quality and
// raised-hand, with an optional pin affordance.
//
// A person may be connected from several devices (see lib/classroom/
// identity.ts). The tile shows the video of whichever device has the camera on
// (Person.shown) while the microphone, speaking and screen-share indicators
// reflect ALL of that person's devices.

'use client';

import { Mic, MicOff, Hand, Pin, PinOff, Wifi, WifiOff, GraduationCap, MonitorUp } from 'lucide-react';
import { useCallSnapshot, useIsSpeaking } from '@/lib/classroom/daily/CallContext';
import { connectionQuality } from '@/lib/classroom/people';
import type { Person } from '@/lib/classroom/people';
import { VideoView } from './MediaViews';

interface ParticipantTileProps {
  person: Person;
  size?: 'main' | 'strip' | 'grid';
  raised?: boolean;
  pinned?: boolean;
  onTogglePin?: () => void;
  spotlighted?: boolean;
}

function initialsOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function QualityIcon({ person }: { person: Person }) {
  const { network } = useCallSnapshot();
  const quality = connectionQuality(person, network);
  if (quality === 'good' || quality === 'unknown') return null;
  const poor = quality === 'poor';
  return (
    <span
      data-tooltip={poor ? 'Poor connection' : 'Unstable connection'}
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
        poor ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
      }`}
    >
      {poor ? <WifiOff size={11} /> : <Wifi size={11} />}
    </span>
  );
}

export default function ParticipantTile({
  person,
  size = 'grid',
  raised,
  pinned,
  onTogglePin,
  spotlighted,
}: ParticipantTileProps) {
  const video = person.shown.video;
  const hasVideo = video.on && !!video.track;
  const micEnabled = person.micOn;
  const isTeacher = person.role === 'TEACHER';
  const isSpeaking = useIsSpeaking(person.peers.map((p) => p.sessionId));
  // "You" — on this device or on another device of yours.
  const isSelf = person.isSelf;

  const nameTextSize = size === 'main' ? 'text-sm' : 'text-xs';
  const avatarTextSize = size === 'main' ? 'text-3xl' : size === 'strip' ? 'text-lg' : 'text-xl';

  return (
    <div
      data-testid="participant-tile"
      data-user-id={person.userId}
      className={`relative w-full h-full rounded-xl overflow-hidden bg-[var(--cr-surface)] border-2 transition-colors ${
        isSpeaking && micEnabled
          ? 'border-[var(--cr-accent)]'
          : spotlighted
            ? 'border-[var(--cr-accent)]/60'
            : 'border-[var(--cr-border)]'
      } ${raised ? 'cr-hand-pulse' : ''}`}
    >
      {hasVideo ? (
        <VideoView
          track={video.track}
          className={`w-full h-full object-cover ${isSelf && person.shown.isLocal ? '-scale-x-100' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--cr-surface-2)] to-[var(--cr-surface-3)]">
          <div
            className={`rounded-full bg-gradient-to-br ${
              isTeacher ? 'from-[#7B61FF] to-[#5B3FCF]' : 'from-[#2DD4BF] to-[#0F9C8D]'
            } flex items-center justify-center text-white font-bold ${avatarTextSize}`}
            style={{
              width: size === 'main' ? '25%' : size === 'strip' ? '44px' : '38%',
              aspectRatio: '1',
            }}
          >
            {initialsOf(person.displayName)}
          </div>
        </div>
      )}

      {/* Top row: role badge + quality + pin */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          {isTeacher && size !== 'strip' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--cr-accent-2)]/20 text-[10px] font-medium text-violet-300">
              <GraduationCap size={10} /> Teacher
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <QualityIcon person={person} />
          {onTogglePin && size !== 'strip' && (
            <button
              onClick={onTogglePin}
              data-tooltip={pinned ? 'Unpin' : 'Pin'}
              className="w-6 h-6 rounded-md bg-black/40 hover:bg-black/60 backdrop-blur flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              {pinned ? <PinOff size={12} /> : <Pin size={12} />}
            </button>
          )}
        </div>
      </div>

      {raised && (
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-lg">
          <Hand size={14} />
        </div>
      )}

      {/* Bottom row: name + mic state */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center justify-between gap-1.5 bg-gradient-to-t from-black/70 to-transparent">
        <span className={`${nameTextSize} font-medium text-white truncate drop-shadow flex items-center gap-1.5 min-w-0`}>
          {person.sharingScreen && (
            <span data-tooltip="Sharing screen" className="flex-shrink-0 text-[var(--cr-accent)]">
              <MonitorUp size={12} />
            </span>
          )}
          <span className="truncate">{isSelf ? 'You' : person.displayName}</span>
        </span>
        <span className={`flex-shrink-0 ${micEnabled ? 'text-white/80' : 'text-red-400'}`}>
          {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
        </span>
      </div>
    </div>
  );
}

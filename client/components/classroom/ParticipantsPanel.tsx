// FILE PATH: client/components/classroom/ParticipantsPanel.tsx
//
// Full participant roster: name, role, mic/cam state, connection quality,
// speaking indicator, raised hand — with teacher-only moderation actions.
// Students see a read-only version of the same list. Teachers also see a
// "Waiting to join" section here for anyone who was removed and is asking
// to be re-admitted (see AdmissionService / useAdmissionRequests).
//
// One row per PERSON: someone connected from two devices is one row (marked
// "2 devices"), and a moderation action on them applies to all their devices.

'use client';

import { useRef, useState } from 'react';
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  MoreVertical,
  UserX,
  Star,
  StarOff,
  Wifi,
  WifiOff,
  GraduationCap,
  UserPlus,
  Check,
  MonitorUp,
  MonitorOff,
} from 'lucide-react';
import { MAX_PEOPLE_PER_CLASSROOM } from '@/lib/classroom/identity';
import { connectionQuality } from '@/lib/classroom/people';
import type { Person } from '@/lib/classroom/people';
import { useCall, useCallSnapshot, useIsSpeaking } from '@/lib/classroom/daily/CallContext';
import { mutePerson, setPersonMicLocked } from '@/lib/classroom/daily/moderation';
import { removeParticipant } from '@/lib/classroom/api';
import { useClickOutside } from '@/lib/classroom/useClickOutside';
import type { PendingAdmission } from '@/lib/classroom/api';

interface ParticipantsPanelProps {
  /** One entry per person in the class (see groupPeople). */
  people: Person[];
  isTeacher: boolean;
  roomName: string;
  raisedHands: Record<string, boolean>;
  onLowerHand: (userId: string) => void;
  onClose: () => void;
  localUserId: string;
  spotlightUserId: string | null;
  onSetSpotlight: (userId: string | null) => void;
  pendingAdmissions?: PendingAdmission[];
  onDecideAdmission?: (admissionId: string, decision: 'APPROVE' | 'DENY') => void;
  /** Teacher-only: stops this person's screen share, on every device they share
   * from (Daily lets the room's owner do that — see daily/moderation.ts). */
  onStopScreenShare?: (userId: string) => void;
}

function QualityBadge({ person }: { person: Person }) {
  const { network } = useCallSnapshot();
  const quality = connectionQuality(person, network);
  if (quality === 'poor') {
    return (
      <span data-tooltip="Poor connection" className="text-red-400">
        <WifiOff size={13} />
      </span>
    );
  }
  if (quality === 'good') {
    return (
      <span data-tooltip="Good connection" className="text-emerald-400">
        <Wifi size={13} />
      </span>
    );
  }
  return null;
}

function ParticipantRow({
  person,
  isTeacher,
  roomName,
  raised,
  onLowerHand,
  isSelf,
  spotlighted,
  onSetSpotlight,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  onStopScreenShare,
}: {
  person: Person;
  isTeacher: boolean;
  roomName: string;
  raised: boolean;
  onLowerHand: () => void;
  isSelf: boolean;
  spotlighted: boolean;
  onSetSpotlight: () => void;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onStopScreenShare?: (userId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, menuOpen, onCloseMenu);
  const call = useCall();
  const { peers } = useCallSnapshot();

  const peerCount = person.peers.length;
  const micOn = person.micOn;
  const camOn = person.cameraOn;
  const isSpeaking = useIsSpeaking(person.peers.map((p) => p.sessionId));
  const canManage = isTeacher && !isSelf;

  // Muting, turning a camera off and taking away the right to unmute are done by
  // this (the teacher's) browser, straight through Daily: the room's owner may,
  // and Daily refuses anyone else. They act on every device of the person.
  const handleMute = (kind: 'audio' | 'video') => {
    mutePerson(call, peers, person.userId, kind);
    onCloseMenu();
  };

  const handleToggleMicLock = () => {
    // Locking mutes the microphone and takes away the right to unmute; unlocking
    // gives the right back without switching anything on.
    setPersonMicLocked(call, peers, person.userId, !person.micLocked);
    onCloseMenu();
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${person.displayName} from class?`)) return;
    setBusy(true);
    try {
      await removeParticipant(roomName, person.userId);
    } catch {
      setBusy(false);
    }
    onCloseMenu();
  };

  const handleStopScreenShare = () => {
    onStopScreenShare?.(person.userId);
    onCloseMenu();
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--cr-surface-2)] transition-colors group">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-gradient-to-br transition-shadow ${
          person.role === 'TEACHER' ? 'from-[#7B61FF] to-[#5B3FCF]' : 'from-[#2DD4BF] to-[#0F9C8D]'
        } ${isSpeaking && micOn ? 'ring-2 ring-[var(--cr-accent)] ring-offset-2 ring-offset-[var(--cr-surface)]' : ''}`}
      >
        {person.displayName.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-[var(--cr-text)] truncate">
            {isSelf ? `${person.displayName} (You)` : person.displayName}
          </span>
          {person.role === 'TEACHER' && <GraduationCap size={12} className="text-violet-300 flex-shrink-0" />}
        </div>
        <span className="text-[11px] text-[var(--cr-text-faint)]">
          {person.role === 'TEACHER' ? 'Teacher' : 'Student'}
          {peerCount > 1 && ` · ${peerCount} devices`}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {raised && (
          <button
            onClick={isTeacher ? onLowerHand : undefined}
            data-tooltip={isTeacher ? 'Lower hand' : 'Hand raised'}
            className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center"
          >
            <Hand size={12} />
          </button>
        )}
        {person.sharingScreen && (
          <span data-tooltip="Sharing screen" className="text-[var(--cr-accent)]">
            <MonitorUp size={14} />
          </span>
        )}
        <QualityBadge person={person} />
        <span className={micOn ? 'text-[var(--cr-text-muted)]' : 'text-red-400'}>
          {micOn ? <Mic size={14} /> : <MicOff size={14} />}
        </span>
        <span className={camOn ? 'text-[var(--cr-text-muted)]' : 'text-red-400'}>
          {camOn ? <Video size={14} /> : <VideoOff size={14} />}
        </span>

        {isTeacher && !isSelf && (
          <button
            onClick={onSetSpotlight}
            data-tooltip={spotlighted ? 'Remove spotlight' : 'Spotlight'}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              spotlighted ? 'text-amber-400' : 'text-[var(--cr-text-faint)] hover:text-[var(--cr-text)]'
            }`}
          >
            {spotlighted ? <Star size={13} fill="currentColor" /> : <StarOff size={13} />}
          </button>
        )}

        {canManage && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => (menuOpen ? onCloseMenu() : onOpenMenu())}
              disabled={busy}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--cr-text-faint)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)] transition-colors disabled:opacity-40"
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-[var(--cr-border)] bg-[var(--cr-surface-2)] shadow-xl z-30 overflow-hidden cr-fade-in">
                <button
                  onClick={() => handleMute('audio')}
                  className="w-full text-left px-3 py-2 text-xs text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)] flex items-center gap-2"
                >
                  <MicOff size={13} /> Mute microphone
                </button>
                <button
                  onClick={handleToggleMicLock}
                  className="w-full text-left px-3 py-2 text-xs text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)] flex items-center gap-2"
                >
                  {person.micLocked ? <Mic size={13} /> : <MicOff size={13} />}
                  {person.micLocked ? 'Allow unmute' : 'Disallow unmute'}
                </button>
                <button
                  onClick={() => handleMute('video')}
                  className="w-full text-left px-3 py-2 text-xs text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)] flex items-center gap-2"
                >
                  <VideoOff size={13} /> Turn off camera
                </button>
                {person.sharingScreen && (
                  <button
                    onClick={handleStopScreenShare}
                    className="w-full text-left px-3 py-2 text-xs text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)] flex items-center gap-2"
                  >
                    <MonitorOff size={13} /> Stop screen share
                  </button>
                )}
                <div className="border-t border-[var(--cr-border)]" />
                <button
                  onClick={handleRemove}
                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                >
                  <UserX size={13} /> Remove from class
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ParticipantsPanel({
  people,
  isTeacher,
  roomName,
  raisedHands,
  onLowerHand,
  onClose,
  localUserId,
  spotlightUserId,
  onSetSpotlight,
  pendingAdmissions = [],
  onDecideAdmission,
  onStopScreenShare,
}: ParticipantsPanelProps) {
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  // The teacher first, then you, then everyone else as they arrived.
  const sorted = [...people].sort((a, b) => {
    const aTeacher = a.role === 'TEACHER';
    const bTeacher = b.role === 'TEACHER';
    if (aTeacher !== bTeacher) return aTeacher ? -1 : 1;
    const aSelf = a.userId === localUserId;
    const bSelf = b.userId === localUserId;
    if (aSelf !== bSelf) return aSelf ? -1 : 1;
    return 0;
  });

  return (
    <div className="w-full h-full flex flex-col bg-[var(--cr-surface)]">
      <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--cr-border)] flex-shrink-0">
        <p className="text-sm font-semibold text-[var(--cr-text)]">
          Participants{' '}
          <span className="text-[var(--cr-text-faint)] font-normal" data-testid="participant-count">
            ({sorted.length}/{MAX_PEOPLE_PER_CLASSROOM})
          </span>
        </p>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {isTeacher && pendingAdmissions.length > 0 && (
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-400 mb-1.5 flex items-center gap-1.5">
            <UserPlus size={12} /> Waiting to join ({pendingAdmissions.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {pendingAdmissions.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25"
              >
                <span className="text-xs font-medium text-[var(--cr-text)] truncate">{a.displayName}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onDecideAdmission?.(a.id, 'DENY')}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-red-400 hover:bg-red-500/15"
                    data-tooltip="Deny"
                  >
                    <X size={13} />
                  </button>
                  <button
                    onClick={() => onDecideAdmission?.(a.id, 'APPROVE')}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-emerald-400 hover:bg-emerald-500/15"
                    data-tooltip="Admit"
                  >
                    <Check size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-b border-[var(--cr-border)] mt-3" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto cr-scroll px-2 py-2">
        {sorted.map((person) => (
          <ParticipantRow
            key={person.userId}
            person={person}
            isTeacher={isTeacher}
            roomName={roomName}
            raised={!!raisedHands[person.userId]}
            onLowerHand={() => onLowerHand(person.userId)}
            isSelf={person.userId === localUserId}
            spotlighted={spotlightUserId === person.userId}
            onSetSpotlight={() => onSetSpotlight(spotlightUserId === person.userId ? null : person.userId)}
            menuOpen={openMenuKey === person.userId}
            onOpenMenu={() => setOpenMenuKey(person.userId)}
            onCloseMenu={() => setOpenMenuKey(null)}
            onStopScreenShare={onStopScreenShare}
          />
        ))}
      </div>
    </div>
  );
}

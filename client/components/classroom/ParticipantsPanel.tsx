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
import type { Participant } from 'livekit-client';
import { ConnectionQuality } from 'livekit-client';
import { useConnectionQualityIndicator } from '@livekit/components-react';
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
import { parseParticipantMeta } from '@/lib/classroom/types';
import { MAX_PEOPLE_PER_CLASSROOM, personKey } from '@/lib/classroom/identity';
import { groupByPerson } from '@/lib/classroom/people';
import { usePersonStatus } from '@/lib/classroom/usePersonStatus';
import { muteParticipant, removeParticipant, setParticipantMicLocked } from '@/lib/classroom/api';
import { useClickOutside } from '@/lib/classroom/useClickOutside';
import type { PendingAdmission } from '@/lib/classroom/api';

interface ParticipantsPanelProps {
  participants: Participant[];
  isTeacher: boolean;
  roomName: string;
  raisedHands: Record<string, boolean>;
  onLowerHand: (identity: string) => void;
  onClose: () => void;
  localIdentity: string;
  spotlightIdentity: string | null;
  onSetSpotlight: (identity: string | null) => void;
  pendingAdmissions?: PendingAdmission[];
  onDecideAdmission?: (admissionId: string, decision: 'APPROVE' | 'DENY') => void;
  /** Teacher-only: notifies the target's own client over the data channel
   * so their capture stream stops cleanly (see useClassroomControls). The
   * server-side mute (stopParticipantScreenShare) is fired alongside it. */
  onNotifyStopScreenShare?: (identity: string) => void;
}

function QualityBadge({ participant }: { participant: Participant }) {
  const { quality } = useConnectionQualityIndicator({ participant });
  if (quality === ConnectionQuality.Poor) {
    return (
      <span data-tooltip="Poor connection" className="text-red-400">
        <WifiOff size={13} />
      </span>
    );
  }
  if (quality === ConnectionQuality.Good || quality === ConnectionQuality.Excellent) {
    return (
      <span data-tooltip="Good connection" className="text-emerald-400">
        <Wifi size={13} />
      </span>
    );
  }
  return null;
}

function ParticipantRow({
  participant,
  peers,
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
  onNotifyStopScreenShare,
}: {
  /** The connection to show (the one with the camera on, if any). */
  participant: Participant;
  /** All of this person's connections, this one included. */
  peers: Participant[];
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
  onNotifyStopScreenShare?: (identity: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, menuOpen, onCloseMenu);

  const meta = parseParticipantMeta(participant.identity, participant.name || participant.identity);
  const status = usePersonStatus(peers);
  const micOn = status.micEnabled;
  const camOn = status.cameraEnabled;
  const isSpeaking = status.speaking;
  const canManage = isTeacher && !isSelf;

  const handleMute = async (kind: 'audio' | 'video') => {
    setBusy(true);
    try {
      await muteParticipant(roomName, participant.identity, kind);
    } catch {
      // best-effort — panel state will simply reflect what LiveKit reports
    } finally {
      setBusy(false);
      onCloseMenu();
    }
  };

  const handleToggleMicLock = async () => {
    setBusy(true);
    try {
      // A muted mic implies "not currently allowed to unmute" from the
      // panel's point of view — locking always mutes; unlocking just
      // restores the ability to unmute, it doesn't force them back on.
      await setParticipantMicLocked(roomName, participant.identity, micOn);
    } catch {
      // best-effort
    } finally {
      setBusy(false);
      onCloseMenu();
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${meta.displayName} from class?`)) return;
    setBusy(true);
    try {
      await removeParticipant(roomName, participant.identity);
    } catch {
      setBusy(false);
    }
    onCloseMenu();
  };

  const handleStopScreenShare = () => {
    // The caller (ClassroomRoom.handleForceStopShare) does both the data-
    // channel notice and the server-side mute — kept as one call here so
    // there's a single source of truth instead of two independent ones.
    onNotifyStopScreenShare?.(participant.identity);
    onCloseMenu();
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--cr-surface-2)] transition-colors group">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-gradient-to-br transition-shadow ${
          meta.role === 'TEACHER' ? 'from-[#7B61FF] to-[#5B3FCF]' : 'from-[#2DD4BF] to-[#0F9C8D]'
        } ${isSpeaking && micOn ? 'ring-2 ring-[var(--cr-accent)] ring-offset-2 ring-offset-[var(--cr-surface)]' : ''}`}
      >
        {meta.displayName.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-[var(--cr-text)] truncate">
            {isSelf ? `${meta.displayName} (You)` : meta.displayName}
          </span>
          {meta.role === 'TEACHER' && <GraduationCap size={12} className="text-violet-300 flex-shrink-0" />}
        </div>
        <span className="text-[11px] text-[var(--cr-text-faint)]">
          {meta.role === 'TEACHER' ? 'Teacher' : 'Student'}
          {peers.length > 1 && ` · ${peers.length} devices`}
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
        {status.sharingScreen && (
          <span data-tooltip="Sharing screen" className="text-[var(--cr-accent)]">
            <MonitorUp size={14} />
          </span>
        )}
        <QualityBadge participant={participant} />
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
                  {micOn ? <MicOff size={13} /> : <Mic size={13} />}
                  {micOn ? 'Disallow unmute' : 'Allow unmute'}
                </button>
                <button
                  onClick={() => handleMute('video')}
                  className="w-full text-left px-3 py-2 text-xs text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)] flex items-center gap-2"
                >
                  <VideoOff size={13} /> Turn off camera
                </button>
                {status.sharingScreen && (
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
  participants,
  isTeacher,
  roomName,
  raisedHands,
  onLowerHand,
  onClose,
  localIdentity,
  spotlightIdentity,
  onSetSpotlight,
  pendingAdmissions = [],
  onDecideAdmission,
  onNotifyStopScreenShare,
}: ParticipantsPanelProps) {
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const localKey = personKey(localIdentity);
  const people = [...groupByPerson(participants)].map(([key, peers]) => {
    // Show the connection that has the camera on, else the first one.
    const shown = peers.find((p) => p.isCameraEnabled) ?? peers[0];
    return { key, peers, shown };
  });
  const sorted = people.sort((a, b) => {
    const aTeacher = parseParticipantMeta(a.shown.identity, a.shown.name || '').role === 'TEACHER';
    const bTeacher = parseParticipantMeta(b.shown.identity, b.shown.name || '').role === 'TEACHER';
    if (aTeacher !== bTeacher) return aTeacher ? -1 : 1;
    const aSelf = a.key === localKey;
    const bSelf = b.key === localKey;
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
        {sorted.map(({ key, peers, shown }) => (
          <ParticipantRow
            key={key}
            participant={shown}
            peers={peers}
            isTeacher={isTeacher}
            roomName={roomName}
            raised={!!raisedHands[key]}
            onLowerHand={() => onLowerHand(key)}
            isSelf={key === localKey}
            spotlighted={spotlightIdentity === key}
            onSetSpotlight={() => onSetSpotlight(spotlightIdentity === key ? null : key)}
            menuOpen={openMenuKey === key}
            onOpenMenu={() => setOpenMenuKey(key)}
            onCloseMenu={() => setOpenMenuKey(null)}
            onNotifyStopScreenShare={onNotifyStopScreenShare}
          />
        ))}
      </div>
    </div>
  );
}

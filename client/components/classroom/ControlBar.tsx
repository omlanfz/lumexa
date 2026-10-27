// FILE PATH: client/components/classroom/ControlBar.tsx
//
// The bottom control bar. Order is role-specific per the design brief:
//   Student: Mic | Camera | Screen Share | Effects | Raise Hand | Chat | More | Leave
//   Teacher: Mic | Camera | Screen Share | Record | Effects | Raise Hand | Chat | Participants | Award Badge | More | End Class
// Every popover here (device menus, effects, more/class-controls) shares
// one "which popover is open" state plus useClickOutside, so opening one
// always closes any other and Esc/outside-click always closes whichever is
// open — never more than one at a time.

'use client';

import { useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  Hand,
  MessageSquare,
  Users,
  MoreHorizontal,
  Wand2,
  ChevronUp,
  PhoneOff,
  Circle,
  Square,
  Loader2,
  Award,
} from 'lucide-react';
import IconButton from './IconButton';
import DeviceMenu from './DeviceMenu';
import ClassControlsMenu from './ClassControlsMenu';
import VideoEffectsPanel from './VideoEffectsPanel';
import AwardBadgePanel from './AwardBadgePanel';
import { useClickOutside } from '@/lib/classroom/useClickOutside';
import type { AwardResponse } from '@/lib/classroom/badgeAward';
import type { StudentInRoom } from '@/lib/classroom/people';
import type { ClassroomState } from '@/lib/classroom/types';
import type { BackgroundEffect } from '@/lib/classroom/backgrounds';
import type { AppearanceOptions } from '@/lib/classroom/appearanceProcessor';

export type PanelKind = 'chat' | 'participants' | 'lesson' | null;
type PopoverKind = 'mic' | 'cam' | 'effects' | 'more' | 'badges' | null;
export type RecordingUiState = 'inactive' | 'active' | 'starting' | 'stopping';

interface ControlBarProps {
  isTeacher: boolean;
  micEnabled: boolean;
  camEnabled: boolean;
  screenShareEnabled: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  micDisabledByTeacher?: boolean;

  handRaised: boolean;
  onToggleHand: () => void;

  activePanel: PanelKind;
  onSetPanel: (panel: PanelKind) => void;
  unreadChat: number;
  participantCount: number;

  classroomState: ClassroomState;
  onPatchState: (patch: ClassroomState) => void;
  onMuteAll: () => void;

  recordingState: RecordingUiState;
  onToggleRecording: () => void;
  /** False in a free trial class, which is never recorded. Defaults to true. */
  recordingAvailable?: boolean;
  /** Recordings of this class not yet uploaded: shown as a badge on the Record
   * button when nothing is being recorded, so they are not forgotten. */
  recordingPending?: number;

  backgroundEffect: BackgroundEffect;
  onBackgroundChange: (e: BackgroundEffect) => void;
  lighting: AppearanceOptions;
  onLightingChange: (l: AppearanceOptions) => void;
  effectsSupported: boolean;
  effectsPending: boolean;
  onUploadImage: (file: File) => void;

  onLeave: () => void;
  onOpenEndClass: () => void;
  endClassDisabledReason?: string | null;

  /** Omitted when this room has no lesson material at all (e.g. the QA
   * demo room or a legacy marketplace booking) — hides the "View Lesson"
   * item entirely rather than showing it disabled. */
  onViewLesson?: () => void;

  /** Translucent glassmorphism variant, forced to a dark palette regardless
   * of the room's own theme — used only when floating over a fullscreened
   * shared screen (see ClassroomRoom). */
  floating?: boolean;

  /** Teacher only: whether the classroom is locked (no one new can join) and how
   * to flip it — shown in the More menu. */
  roomLocked?: boolean;
  onToggleRoomLock?: () => void;

  /** Teacher only: the Award Badge button and its popover. */
  awardBadge?: {
    roomName: string;
    isBatch: boolean;
    students: StudentInRoom[];
    onAwarded: (result: AwardResponse) => void;
  };
}

export default function ControlBar({
  isTeacher,
  micEnabled,
  camEnabled,
  screenShareEnabled,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  micDisabledByTeacher,
  handRaised,
  onToggleHand,
  activePanel,
  onSetPanel,
  unreadChat,
  participantCount,
  classroomState,
  onPatchState,
  onMuteAll,
  recordingState,
  onToggleRecording,
  recordingAvailable = true,
  recordingPending = 0,
  backgroundEffect,
  onBackgroundChange,
  lighting,
  onLightingChange,
  effectsSupported,
  effectsPending,
  onUploadImage,
  onLeave,
  onOpenEndClass,
  endClassDisabledReason,
  onViewLesson,
  floating,
  roomLocked,
  onToggleRoomLock,
  awardBadge,
}: ControlBarProps) {
  const [openPopover, setOpenPopover] = useState<PopoverKind>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, openPopover !== null, () => setOpenPopover(null));

  const toggle = (kind: PopoverKind) => setOpenPopover((prev) => (prev === kind ? null : kind));

  const micButton = (
    <div className="relative flex items-center">
      <IconButton
        icon={micEnabled ? Mic : MicOff}
        label={micDisabledByTeacher ? 'Muted by teacher' : micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        onClick={onToggleMic}
        off={!micEnabled}
        disabled={micDisabledByTeacher}
        className="rounded-r-none border-r-0"
      />
      <button
        onClick={() => toggle('mic')}
        data-tooltip="Microphone settings"
        className="cr-icon-btn w-5 h-11 rounded-l-none px-0"
        aria-label="Microphone / speaker settings"
      >
        <ChevronUp size={12} />
      </button>
      {openPopover === 'mic' && (
        <div className="absolute bottom-full mb-2 left-0 z-30">
          <DeviceMenu kind="audioinput" onClose={() => setOpenPopover(null)} />
        </div>
      )}
    </div>
  );

  const camButton = (
    <div className="relative flex items-center">
      <IconButton
        icon={camEnabled ? Video : VideoOff}
        label={camEnabled ? 'Turn off camera' : 'Turn on camera'}
        onClick={onToggleCam}
        off={!camEnabled}
        className="rounded-r-none border-r-0"
      />
      <button
        onClick={() => toggle('cam')}
        data-tooltip="Camera settings"
        className="cr-icon-btn w-5 h-11 rounded-l-none px-0"
        aria-label="Camera settings"
      >
        <ChevronUp size={12} />
      </button>
      {openPopover === 'cam' && (
        <div className="absolute bottom-full mb-2 left-0 z-30">
          <DeviceMenu kind="videoinput" onClose={() => setOpenPopover(null)} />
        </div>
      )}
    </div>
  );

  const screenShareButton = (
    <IconButton
      icon={screenShareEnabled ? ScreenShareOff : ScreenShare}
      label={screenShareEnabled ? 'Stop sharing' : 'Share screen'}
      onClick={onToggleScreenShare}
      active={screenShareEnabled}
    />
  );

  const recordButton = isTeacher && recordingAvailable && (
    <IconButton
      icon={recordingState === 'active' ? Square : recordingState === 'starting' || recordingState === 'stopping' ? Loader2 : Circle}
      label={
        recordingState === 'active'
          ? 'Stop recording'
          : recordingState === 'starting'
            ? 'Choose what to share…'
            : recordingState === 'stopping'
              ? 'Finishing the recording…'
              : recordingPending > 0
                ? `Record class (${recordingPending} not uploaded yet)`
                : 'Record class'
      }
      onClick={onToggleRecording}
      disabled={recordingState === 'starting' || recordingState === 'stopping'}
      badge={recordingState === 'inactive' && recordingPending > 0 ? recordingPending : undefined}
      className={
        recordingState === 'active'
          ? 'text-red-500 animate-pulse'
          : recordingState === 'starting' || recordingState === 'stopping'
            ? 'text-[var(--cr-text-muted)] [&_svg]:animate-spin'
            : ''
      }
    />
  );

  const effectsButton = (
    <div className="relative hidden sm:block">
      <IconButton
        icon={Wand2}
        label="Video effects"
        onClick={() => toggle('effects')}
        active={openPopover === 'effects'}
      />
      {openPopover === 'effects' && (
        <div className="absolute bottom-full mb-2 left-0 bg-[var(--cr-surface)] border border-[var(--cr-border)] rounded-xl shadow-2xl p-4 z-30 cr-fade-in">
          <VideoEffectsPanel
            backgroundEffect={backgroundEffect}
            onBackgroundChange={onBackgroundChange}
            lighting={lighting}
            onLightingChange={onLightingChange}
            supported={effectsSupported}
            pending={effectsPending}
            onUploadImage={onUploadImage}
          />
        </div>
      )}
    </div>
  );

  const handButton = (
    <IconButton icon={Hand} label={handRaised ? 'Lower hand' : 'Raise hand'} onClick={onToggleHand} active={handRaised} />
  );

  const chatButton = (
    <IconButton
      icon={MessageSquare}
      label="Chat"
      onClick={() => onSetPanel(activePanel === 'chat' ? null : 'chat')}
      active={activePanel === 'chat'}
      badge={unreadChat > 0 ? unreadChat : undefined}
    />
  );

  const participantsButton = isTeacher && (
    <IconButton
      icon={Users}
      label="Participants"
      onClick={() => onSetPanel(activePanel === 'participants' ? null : 'participants')}
      active={activePanel === 'participants'}
      badge={participantCount > 0 ? participantCount : undefined}
    />
  );

  // On a phone the popover spans the bar (it is positioned against the bar
  // itself); from `sm` up it hangs from the button.
  const awardBadgeButton = isTeacher && awardBadge && (
    <div className="sm:relative">
      <IconButton
        icon={Award}
        label="Award badge"
        onClick={() => toggle('badges')}
        active={openPopover === 'badges'}
      />
      {openPopover === 'badges' && (
        <div className="absolute bottom-full mb-2 left-3 right-3 sm:left-auto sm:right-0 sm:w-[26rem] z-30">
          <AwardBadgePanel
            roomName={awardBadge.roomName}
            isBatch={awardBadge.isBatch}
            students={awardBadge.students}
            onClose={() => setOpenPopover(null)}
            onAwarded={awardBadge.onAwarded}
          />
        </div>
      )}
    </div>
  );

  const moreButton = (
    <div className="relative">
      <IconButton icon={MoreHorizontal} label="More" onClick={() => toggle('more')} active={openPopover === 'more'} />
      {openPopover === 'more' && (
        <div className="absolute bottom-full mb-2 right-0 z-30">
          <ClassControlsMenu
            isTeacher={isTeacher}
            state={classroomState}
            onPatchState={onPatchState}
            onMuteAll={onMuteAll}
            onClose={() => setOpenPopover(null)}
            onViewLesson={onViewLesson}
            roomLocked={roomLocked}
            onToggleRoomLock={onToggleRoomLock}
          />
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      // On a phone the buttons wrap onto a second row instead of running off the
      // edge of the screen (the teacher's bar is ~620px wide, the student's ~460px);
      // from `md` up it is the single 76px row it always was.
      className={`relative flex flex-wrap md:flex-nowrap items-center justify-between gap-x-2 gap-y-1.5 px-3 sm:px-5 py-1.5 md:py-0 min-h-[76px] md:h-[76px] flex-shrink-0 ${
        floating ? 'bg-black/40 backdrop-blur-xl border-t border-white/10' : 'border-t border-[var(--cr-border)] bg-[var(--cr-bg)]'
      }`}
    >
      {isTeacher ? (
        <>
          <div className="flex items-center gap-2">
            {micButton}
            {camButton}
            {screenShareButton}
            {recordButton}
            {effectsButton}
          </div>
          <div className="flex items-center gap-2">{handButton}</div>
          <div className="flex items-center gap-2">
            {chatButton}
            {participantsButton}
            {awardBadgeButton}
            {moreButton}
            <button
              onClick={onOpenEndClass}
              disabled={!!endClassDisabledReason}
              data-tooltip={endClassDisabledReason ?? undefined}
              data-tooltip-align="end"
              className="flex items-center gap-1.5 px-4 h-11 rounded-full bg-[var(--cr-danger)] hover:bg-[var(--cr-danger-hover)] text-white text-sm font-semibold transition-colors ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PhoneOff size={16} />
              End Class
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {micButton}
            {camButton}
            {screenShareButton}
            {effectsButton}
          </div>
          <div className="flex items-center gap-2">{handButton}</div>
          <div className="flex items-center gap-2">
            {chatButton}
            {moreButton}
            <button
              onClick={onLeave}
              className="flex items-center gap-1.5 px-4 h-11 rounded-full bg-[var(--cr-danger)] hover:bg-[var(--cr-danger-hover)] text-white text-sm font-semibold transition-colors ml-1"
            >
              <PhoneOff size={16} />
              Leave
            </button>
          </div>
        </>
      )}
    </div>
  );
}

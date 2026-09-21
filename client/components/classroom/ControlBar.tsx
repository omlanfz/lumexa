// FILE PATH: client/components/classroom/ControlBar.tsx
//
// The bottom control bar. Order is role-specific per the design brief:
//   Student: Mic | Camera | Screen Share | Effects | Raise Hand | Chat | More | Leave
//   Teacher: Mic | Camera | Screen Share | Record | Effects | Raise Hand | Chat | Participants | More | End Class
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
} from 'lucide-react';
import IconButton from './IconButton';
import DeviceMenu from './DeviceMenu';
import ClassControlsMenu from './ClassControlsMenu';
import VideoEffectsPanel from './VideoEffectsPanel';
import { useClickOutside } from '@/lib/classroom/useClickOutside';
import type { ClassroomState } from '@/lib/classroom/types';
import type { BackgroundEffect } from '@/lib/classroom/backgrounds';
import type { AppearanceOptions } from '@/lib/classroom/appearanceProcessor';

export type PanelKind = 'chat' | 'participants' | 'lesson' | null;
type PopoverKind = 'mic' | 'cam' | 'effects' | 'more' | null;
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

  const recordButton = isTeacher && (
    <IconButton
      icon={recordingState === 'active' ? Square : recordingState === 'starting' || recordingState === 'stopping' ? Loader2 : Circle}
      label={
        recordingState === 'active'
          ? 'Stop recording'
          : recordingState === 'starting'
            ? 'Starting recording…'
            : recordingState === 'stopping'
              ? 'Stopping recording…'
              : 'Record class'
      }
      onClick={onToggleRecording}
      disabled={recordingState === 'starting' || recordingState === 'stopping'}
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
          />
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-between gap-2 px-3 sm:px-5 h-[76px] flex-shrink-0 border-t border-[var(--cr-border)] bg-[var(--cr-bg)]"
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

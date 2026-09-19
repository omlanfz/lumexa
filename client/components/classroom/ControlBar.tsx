// FILE PATH: client/components/classroom/ControlBar.tsx
//
// The bottom control bar — icon-only controls with hover tooltips, a
// dedicated Leave button kept isolated and visually distinct on the far
// right (never icon-only, per the design brief).

'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import IconButton from './IconButton';
import DeviceMenu from './DeviceMenu';
import ClassControlsMenu from './ClassControlsMenu';
import VideoEffectsPanel from './VideoEffectsPanel';
import type { ClassroomState } from '@/lib/classroom/types';
import type { BackgroundEffect } from '@/lib/classroom/backgrounds';
import type { LightingOptions } from '@/lib/classroom/lightingProcessor';

export type PanelKind = 'chat' | 'participants' | null;

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
  onEndClass: (outcome?: 'COMPLETED' | 'PARTIALLY_COMPLETED') => void;
  isLessonFlow: boolean;
  endClassError: string | null;

  isRecording: boolean;
  onToggleRecording: () => void;

  backgroundEffect: BackgroundEffect;
  onBackgroundChange: (e: BackgroundEffect) => void;
  lighting: LightingOptions;
  onLightingChange: (l: LightingOptions) => void;
  effectsSupported: boolean;
  effectsPending: boolean;
  onUploadImage: (file: File) => void;

  onLeave: () => void;
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
  onEndClass,
  isLessonFlow,
  endClassError,
  isRecording,
  onToggleRecording,
  backgroundEffect,
  onBackgroundChange,
  lighting,
  onLightingChange,
  effectsSupported,
  effectsPending,
  onUploadImage,
  onLeave,
}: ControlBarProps) {
  const [micMenuOpen, setMicMenuOpen] = useState(false);
  const [camMenuOpen, setCamMenuOpen] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const closeAllPopovers = () => {
    setMicMenuOpen(false);
    setCamMenuOpen(false);
    setEffectsOpen(false);
    setMoreOpen(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 px-3 sm:px-5 h-[76px] flex-shrink-0 border-t border-[var(--cr-border)] bg-[var(--cr-bg)]">
      {/* Left: mic / camera / screen share / effects */}
      <div className="flex items-center gap-2">
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
            onClick={() => {
              closeAllPopovers();
              setMicMenuOpen((v) => !v);
            }}
            data-tooltip="Microphone settings"
            className="cr-icon-btn w-5 h-11 rounded-l-none px-0"
            aria-label="Microphone settings"
          >
            <ChevronUp size={12} />
          </button>
          {micMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 z-30">
              <DeviceMenu kind="audioinput" onClose={() => setMicMenuOpen(false)} />
            </div>
          )}
        </div>

        <div className="relative flex items-center">
          <IconButton
            icon={camEnabled ? Video : VideoOff}
            label={camEnabled ? 'Turn off camera' : 'Turn on camera'}
            onClick={onToggleCam}
            off={!camEnabled}
            className="rounded-r-none border-r-0"
          />
          <button
            onClick={() => {
              closeAllPopovers();
              setCamMenuOpen((v) => !v);
            }}
            data-tooltip="Camera settings"
            className="cr-icon-btn w-5 h-11 rounded-l-none px-0"
            aria-label="Camera settings"
          >
            <ChevronUp size={12} />
          </button>
          {camMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 z-30">
              <DeviceMenu kind="videoinput" onClose={() => setCamMenuOpen(false)} />
            </div>
          )}
        </div>

        <IconButton
          icon={screenShareEnabled ? ScreenShareOff : ScreenShare}
          label={screenShareEnabled ? 'Stop sharing' : 'Share screen'}
          onClick={onToggleScreenShare}
          active={screenShareEnabled}
        />

        <div className="relative hidden sm:block">
          <IconButton
            icon={Wand2}
            label="Video effects"
            onClick={() => {
              closeAllPopovers();
              setEffectsOpen((v) => !v);
            }}
            active={effectsOpen}
          />
          {effectsOpen && (
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
      </div>

      {/* Center: raise hand / record (teacher only) */}
      <div className="flex items-center gap-2">
        <IconButton icon={Hand} label={handRaised ? 'Lower hand' : 'Raise hand'} onClick={onToggleHand} active={handRaised} />
        {isTeacher && (
          <IconButton
            icon={isRecording ? Square : Circle}
            label={isRecording ? 'Stop recording' : 'Record class'}
            onClick={onToggleRecording}
            className={isRecording ? 'text-red-500 animate-pulse' : ''}
          />
        )}
      </div>

      {/* Right: chat / participants / more / leave */}
      <div className="flex items-center gap-2">
        <IconButton
          icon={MessageSquare}
          label="Chat"
          onClick={() => onSetPanel(activePanel === 'chat' ? null : 'chat')}
          active={activePanel === 'chat'}
          badge={unreadChat > 0 ? unreadChat : undefined}
        />
        <IconButton
          icon={Users}
          label="Participants"
          onClick={() => onSetPanel(activePanel === 'participants' ? null : 'participants')}
          active={activePanel === 'participants'}
          badge={participantCount > 0 ? participantCount : undefined}
        />

        {isTeacher && (
          <div className="relative">
            <IconButton
              icon={MoreHorizontal}
              label="More"
              onClick={() => {
                closeAllPopovers();
                setMoreOpen((v) => !v);
              }}
              active={moreOpen}
            />
            {moreOpen && (
              <div className="absolute bottom-full mb-2 right-0 z-30">
                <ClassControlsMenu
                  state={classroomState}
                  onPatchState={onPatchState}
                  onMuteAll={onMuteAll}
                  onEndClass={onEndClass}
                  isLessonFlow={isLessonFlow}
                  endClassError={endClassError}
                  onClose={() => setMoreOpen(false)}
                />
              </div>
            )}
          </div>
        )}

        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 px-4 h-11 rounded-full bg-[var(--cr-danger)] hover:bg-[var(--cr-danger-hover)] text-white text-sm font-semibold transition-colors ml-1"
        >
          <PhoneOff size={16} />
          Leave
        </button>
      </div>
    </div>
  );
}

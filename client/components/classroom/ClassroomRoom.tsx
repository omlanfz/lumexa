// FILE PATH: client/components/classroom/ClassroomRoom.tsx
//
// The in-call classroom experience — mounted inside <LiveKitRoom>. Owns all
// the room-level UI state (panels, pin/spotlight, presentation mode, video
// effects) and wires LiveKit hooks into the presentational components.

'use client';

import { useEffect, useRef, useState } from 'react';
import { Track } from 'livekit-client';
import type { LocalVideoTrack } from 'livekit-client';
import {
  useChat,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
  isTrackReference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { AlertTriangle, Hand } from 'lucide-react';
import Header from './Header';
import Stage from './Stage';
import FilmStrip from './FilmStrip';
import ControlBar, { PanelKind } from './ControlBar';
import ParticipantsPanel from './ParticipantsPanel';
import ChatPanel from './ChatPanel';
import ConnectionBanner from './ConnectionBanner';
import ReactionsOverlay from './ReactionsOverlay';
import { parseParticipantMeta } from '@/lib/classroom/types';
import { useClassroomState } from '@/lib/classroom/useClassroomState';
import { useClassroomControls } from '@/lib/classroom/useClassroomControls';
import { useVideoEffects } from '@/lib/classroom/useVideoEffects';
import { muteAllParticipants, endClass, startRecording, stopRecording } from '@/lib/classroom/api';
import { playClassroomTone } from '@/lib/classroom/sounds';
import type { BackgroundEffect } from '@/lib/classroom/backgrounds';
import type { LightingOptions } from '@/lib/classroom/lightingProcessor';
import type { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';

interface ClassroomRoomProps {
  roomName: string;
  sessionTitle: string;
  sessionSubtitle?: string;
  isLive: boolean;
  lessonData: LessonDetailsResponse | null;
  initialBackgroundEffect: BackgroundEffect;
  initialLighting: LightingOptions;
}

interface HandToast {
  id: string;
  name: string;
}

export default function ClassroomRoom({
  roomName,
  sessionTitle,
  sessionSubtitle,
  isLive,
  lessonData,
  initialBackgroundEffect,
  initialLighting,
}: ClassroomRoomProps) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled, cameraTrack } =
    useLocalParticipant();
  const participants = useParticipants();
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  const screenShare = screenTracks.find((t) => isTrackReference(t));
  const { chatMessages, send: sendChat } = useChat();

  const meta = parseParticipantMeta(localParticipant.identity, localParticipant.name || '');
  const isTeacher = meta.role === 'TEACHER';

  const { state: classroomState, patch: patchState } = useClassroomState(roomName, isTeacher);
  const { raisedHands, reactions, spotlightIdentity, setOwnHandRaised, lowerHand, sendReaction, setSpotlight } =
    useClassroomControls();
  const effects = useVideoEffects();

  const [activePanel, setActivePanel] = useState<PanelKind>(null);
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [lastSeenChatCount, setLastSeenChatCount] = useState(0);
  const [handToasts, setHandToasts] = useState<HandToast[]>([]);
  const [recordingPending, setRecordingPending] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [endClassError, setEndClassError] = useState<string | null>(null);
  const [expiredNoticeVisible, setExpiredNoticeVisible] = useState(false);
  const expiredFiredRef = useRef(false);
  const seededEffectsRef = useRef(false);
  const prevRaisedRef = useRef<Record<string, boolean>>({});
  const prevParticipantIdentitiesRef = useRef<Set<string> | null>(null);
  const participantRolesRef = useRef<Record<string, 'TEACHER' | 'STUDENT'>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const isLessonFlow = roomName.startsWith('lesson-');
  const isRecording = !!classroomState.recording;

  const togglePresentationMode = () => {
    const next = !presentationMode;
    setPresentationMode(next);
    if (next) {
      rootRef.current?.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Keep the layout in sync if the browser's own fullscreen exit (Esc) is
  // used instead of our toggle button.
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setPresentationMode(false);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Subtle presence sounds — a remote participant (never the local user's
  // own connect) joining or leaving plays a short, space-themed chime.
  useEffect(() => {
    const currentIdentities = new Set(participants.map((p) => p.identity));
    const prev = prevParticipantIdentitiesRef.current;

    for (const p of participants) {
      participantRolesRef.current[p.identity] = parseParticipantMeta(p.identity, p.name || '').role;
    }

    if (prev) {
      for (const p of participants) {
        if (p.identity === localParticipant.identity) continue;
        if (!prev.has(p.identity)) {
          const role = participantRolesRef.current[p.identity];
          playClassroomTone(role === 'TEACHER' ? 'teacher-join' : 'student-join');
        }
      }
      for (const identity of prev) {
        if (identity === localParticipant.identity) continue;
        if (!currentIdentities.has(identity)) {
          const role = participantRolesRef.current[identity];
          playClassroomTone(role === 'TEACHER' ? 'teacher-leave' : 'student-leave');
          delete participantRolesRef.current[identity];
        }
      }
    }
    prevParticipantIdentitiesRef.current = currentIdentities;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

  // Scheduled class time expiring — teacher-only friendly notice + subtle
  // sound. The classroom never closes on its own; this is purely advisory.
  const scheduledEnd = lessonData?.session?.end ? new Date(lessonData.session.end).getTime() : null;
  useEffect(() => {
    if (!isTeacher || !scheduledEnd || expiredFiredRef.current) return;
    const msRemaining = scheduledEnd - Date.now();
    const fire = () => {
      expiredFiredRef.current = true;
      setExpiredNoticeVisible(true);
      playClassroomTone('class-expired');
    };
    if (msRemaining <= 0) {
      fire();
      return;
    }
    const timer = setTimeout(fire, msRemaining);
    return () => clearTimeout(timer);
  }, [isTeacher, scheduledEnd]);

  // Seed the effect choice made on the pre-join screen once, then keep
  // re-applying whatever's currently selected whenever the camera track is
  // (re)published — e.g. after toggling the camera off and back on.
  useEffect(() => {
    if (seededEffectsRef.current) return;
    seededEffectsRef.current = true;
    if (initialBackgroundEffect.mode !== 'none') void effects.setBackground(undefined, initialBackgroundEffect);
    else if (initialLighting.brightness !== 1 || initialLighting.contrast !== 1) {
      void effects.setLighting(undefined, initialLighting);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const localVideoTrack = cameraTrack?.track as LocalVideoTrack | undefined;
  useEffect(() => {
    if (localVideoTrack) effects.reapply(localVideoTrack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localVideoTrack]);

  // Enforce the teacher's "students muted" policy client-side.
  useEffect(() => {
    if (!isTeacher && classroomState.studentsMuted && isMicrophoneEnabled) {
      void localParticipant.setMicrophoneEnabled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomState.studentsMuted]);

  // Teacher notification toast when a new hand goes up.
  useEffect(() => {
    if (!isTeacher) return;
    Object.entries(raisedHands).forEach(([identity, raised]) => {
      const wasRaised = prevRaisedRef.current[identity];
      if (raised && !wasRaised && identity !== localParticipant.identity) {
        const p = participants.find((pp) => pp.identity === identity);
        const name = p ? parseParticipantMeta(identity, p.name || identity).displayName : 'A student';
        const id = `${identity}-${Date.now()}`;
        setHandToasts((prev) => [...prev, { id, name }]);
        setTimeout(() => setHandToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
      }
    });
    prevRaisedRef.current = raisedHands;
  }, [raisedHands, isTeacher, participants, localParticipant.identity]);

  const unreadChat = activePanel === 'chat' ? 0 : Math.max(0, chatMessages.length - lastSeenChatCount);
  useEffect(() => {
    if (activePanel === 'chat') setLastSeenChatCount(chatMessages.length);
  }, [activePanel, chatMessages.length]);

  const handleTogglePin = (identity: string) => {
    setPinnedIdentity((prev) => (prev === identity ? null : identity));
  };

  const handStripExcludeIdentity =
    screenShare && screenShare.participant.isLocal ? localParticipant.identity : null;
  const filmstripTracks = cameraTracks.filter((t) => t.participant.identity !== handStripExcludeIdentity);

  const micDisabledByTeacher = !isTeacher && !!classroomState.studentsMuted;

  const handleToggleRecording = async () => {
    if (recordingPending) return;
    setRecordingPending(true);
    try {
      // The server itself patches room metadata on start/stop (see
      // ClassroomService.startTeacherRecording/stopTeacherRecording) — the
      // resulting RoomMetadataChanged event is what updates classroomState
      // here, for every participant, so no separate patchState call is
      // needed on success.
      setRecordingError(null);
      if (isRecording) {
        await stopRecording(roomName);
      } else {
        await startRecording(roomName);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setRecordingError(e.response?.data?.message ?? 'Could not update the recording. Please try again.');
      setTimeout(() => setRecordingError(null), 6000);
    } finally {
      setRecordingPending(false);
    }
  };

  const handleEndClass = (outcome?: 'COMPLETED' | 'PARTIALLY_COMPLETED') => {
    setEndClassError(null);
    void endClass(roomName, outcome)
      .then(() => room.disconnect())
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { message?: string } } };
        setEndClassError(e.response?.data?.message ?? 'Could not end the class. Please try again.');
      });
  };

  return (
    <div ref={rootRef} className="cr-root h-screen w-full flex flex-col overflow-hidden">
      <RoomAudioRenderer />

      {!presentationMode && (
        <Header
          sessionTitle={sessionTitle}
          sessionSubtitle={sessionSubtitle}
          isLive={isLive}
          presentationMode={presentationMode}
          onTogglePresentation={togglePresentationMode}
          recording={isRecording}
        />
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-4 gap-3 relative">
          {presentationMode && (
            <button
              onClick={togglePresentationMode}
              className="absolute top-3 right-3 z-30 px-2.5 py-1 rounded-lg bg-black/50 hover:bg-black/70 text-white text-[11px] backdrop-blur"
            >
              Exit presentation
            </button>
          )}

          <ConnectionBanner />

          {/* Scheduled time expired — teacher-only, advisory. The class
              never ends on its own; this just nudges the teacher to wrap up
              whenever they're ready. */}
          {isTeacher && expiredNoticeVisible && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 backdrop-blur text-amber-300 text-xs font-medium shadow-lg cr-fade-in">
              <AlertTriangle size={15} className="flex-shrink-0" />
              Your scheduled class time is over. Please end the class when you&apos;re ready.
              <button
                onClick={() => setExpiredNoticeVisible(false)}
                className="ml-1 text-amber-300/70 hover:text-amber-200"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {recordingError && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 backdrop-blur text-red-400 text-xs font-medium shadow-lg cr-fade-in">
              {recordingError}
            </div>
          )}

          {/* Hand-raise toasts (teacher only) */}
          {handToasts.length > 0 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-1.5 items-center">
              {handToasts.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 backdrop-blur text-amber-300 text-xs font-medium shadow-lg cr-fade-in"
                >
                  <Hand size={13} /> {t.name} raised their hand
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0">
            <Stage
              cameraTracks={cameraTracks}
              pinnedIdentity={pinnedIdentity}
              spotlightIdentity={spotlightIdentity}
              raisedHands={raisedHands}
              onTogglePin={handleTogglePin}
              lessonData={lessonData}
              onStopShare={() => void localParticipant.setScreenShareEnabled(false)}
            />
            <ReactionsOverlay reactions={reactions} />
          </div>

          <FilmStrip
            tracks={filmstripTracks}
            raisedHands={raisedHands}
            pinnedIdentity={pinnedIdentity}
            onTogglePin={handleTogglePin}
            compact={presentationMode}
          />
        </div>

        {activePanel && (
          <div className="w-[320px] flex-shrink-0 border-l border-[var(--cr-border)] cr-fade-in">
            {activePanel === 'chat' ? (
              <ChatPanel
                messages={chatMessages}
                onSend={(text) => void sendChat(text)}
                onClose={() => setActivePanel(null)}
                locked={!!classroomState.chatLocked}
                isTeacher={isTeacher}
                onToggleLock={() => patchState({ chatLocked: !classroomState.chatLocked })}
                onReact={sendReaction}
                localIdentity={localParticipant.identity}
              />
            ) : (
              <ParticipantsPanel
                participants={participants}
                isTeacher={isTeacher}
                roomName={roomName}
                raisedHands={raisedHands}
                onLowerHand={lowerHand}
                onClose={() => setActivePanel(null)}
                localIdentity={localParticipant.identity}
                spotlightIdentity={spotlightIdentity}
                onSetSpotlight={setSpotlight}
              />
            )}
          </div>
        )}
      </div>

      <ControlBar
        isTeacher={isTeacher}
        micEnabled={isMicrophoneEnabled}
        camEnabled={isCameraEnabled}
        screenShareEnabled={isScreenShareEnabled}
        onToggleMic={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        onToggleCam={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
        onToggleScreenShare={() => void localParticipant.setScreenShareEnabled(!isScreenShareEnabled)}
        micDisabledByTeacher={micDisabledByTeacher}
        handRaised={!!raisedHands[localParticipant.identity]}
        onToggleHand={() => setOwnHandRaised(!raisedHands[localParticipant.identity])}
        activePanel={activePanel}
        onSetPanel={setActivePanel}
        unreadChat={unreadChat}
        participantCount={participants.length}
        classroomState={classroomState}
        onPatchState={patchState}
        onMuteAll={() => void muteAllParticipants(roomName)}
        onEndClass={handleEndClass}
        isLessonFlow={isLessonFlow}
        endClassError={endClassError}
        isRecording={isRecording}
        onToggleRecording={() => void handleToggleRecording()}
        backgroundEffect={effects.backgroundEffect}
        onBackgroundChange={(e) => void effects.setBackground(localVideoTrack, e)}
        lighting={effects.lighting}
        onLightingChange={(l) => void effects.setLighting(localVideoTrack, l)}
        effectsSupported={effects.supported}
        effectsPending={effects.pending}
        onUploadImage={(file) => {
          const url = URL.createObjectURL(file);
          void effects.setBackground(localVideoTrack, { mode: 'image', imagePath: url, label: 'Custom' });
        }}
        onLeave={() => room.disconnect()}
      />
    </div>
  );
}

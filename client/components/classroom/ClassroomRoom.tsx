// FILE PATH: client/components/classroom/ClassroomRoom.tsx
//
// The in-call classroom experience — mounted inside <LiveKitRoom>. Owns all
// the room-level UI state (panels, pin/spotlight, video effects) and wires
// LiveKit hooks into the presentational components.
//
// Layout hierarchy: main Stage (teaching content) + a persistent
// collapsible right-side ParticipantRail on desktop, always — not just
// while screen-sharing, and never doubled up with the bottom FilmStrip
// (that duplication was the old layout's core problem). Mobile/tablet has
// no room for a side column, so it keeps the bottom FilmStrip instead.
//
// A classroom holds up to 10 people, and one person may be in it from several
// devices (see lib/classroom/identity.ts): everything on screen is per PERSON —
// one tile, one raised hand, one entry in the count — however many devices
// they joined from. Your own tile stays in the rail while you share your
// screen, so you can always see yourself; only the fullscreen share view (a
// layer over everything) hides the tiles.
//
// "Presentation Mode" is simply "is anyone currently screen-sharing" (see
// `presentationMode` below) — it only tightens the stage's padding a bit;
// it never hides the header or bottom control bar, and screen sharing
// never auto-enters fullscreen. Shared screens sit in Stage's own equal-
// priority grid instead.
//
// Fullscreen (the ⛶ button on a shared-screen tile) is `fullscreenIdentity`
// state owned here, NOT the browser's per-element Fullscreen API — that
// API would hide the header/control bar along with everything else, and
// this classroom wants them to keep working (as an auto-hiding glass
// overlay) while a shared screen fills the viewport. See the render below:
// a fixed full-viewport video layer plus the Header/ControlBar re-rendered
// in their `floating` variant on top, faded in/out by mouse activity.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Track } from 'livekit-client';
import type { LocalVideoTrack } from 'livekit-client';
import {
  useChat,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
  isTrackReference,
  VideoTrack,
} from '@livekit/components-react';
import { AlertTriangle, Hand, Lock, PhoneOff, Minimize2, Monitor } from 'lucide-react';
import Header from './Header';
import Stage from './Stage';
import FilmStrip from './FilmStrip';
import ParticipantRail from './ParticipantRail';
import ControlBar, { PanelKind, RecordingUiState } from './ControlBar';
import RecordingTray from './RecordingTray';
import ParticipantsPanel from './ParticipantsPanel';
import ChatPanel from './ChatPanel';
import LessonSidePanel from './LessonSidePanel';
import ConnectionBanner from './ConnectionBanner';
import ClassTestMonitor from '@/components/assessment/ClassTestMonitor';
import ReactionsOverlay from './ReactionsOverlay';
import EndClassModal from './EndClassModal';
import ClassAudioRenderer from './ClassAudioRenderer';
import AwardToast from './AwardToast';
import BadgeCelebration from './BadgeCelebration';
import { parseParticipantMeta } from '@/lib/classroom/types';
import { personKey } from '@/lib/classroom/identity';
import { countPeople, listStudents, pickPersonTiles } from '@/lib/classroom/people';
import type { AwardResponse } from '@/lib/classroom/badgeAward';
import type { BadgeAwardedEvent } from '@/lib/classroom/serverEvents';
import { useServerEvents } from '@/lib/classroom/useServerEvents';
import { useClassroomState } from '@/lib/classroom/useClassroomState';
import { useClassroomControls } from '@/lib/classroom/useClassroomControls';
import { useVideoEffects } from '@/lib/classroom/useVideoEffects';
import { useClassRecorder } from '@/lib/classroom/recording/useClassRecorder';
import { useClassroomTheme } from '@/lib/classroom/useClassroomTheme';
import {
  muteAllParticipants,
  endClassRequest,
  listPendingAdmissions,
  decideAdmission,
  stopParticipantScreenShare,
  setRoomLocked as setRoomLockedRequest,
  type PendingAdmission,
  type EndClassParams,
} from '@/lib/classroom/api';
import { playClassroomTone } from '@/lib/classroom/sounds';
import type { BackgroundEffect } from '@/lib/classroom/backgrounds';
import type { AppearanceOptions } from '@/lib/classroom/appearanceProcessor';
import type { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';

interface ClassroomRoomProps {
  roomName: string;
  sessionTitle: string;
  sessionSubtitle?: string;
  isLive: boolean;
  lessonData: LessonDetailsResponse | null;
  /** QA-only: a fixed example lesson shown in the View Lesson panel on the
   * demo room (which has no real ScheduledLesson of its own) — see
   * getDemoExampleLessonDetails. Deliberately separate from `lessonData`
   * above so it only affects that panel, not Stage's default content. */
  demoExampleLesson?: LessonDetailsResponse | null;
  initialBackgroundEffect: BackgroundEffect;
  initialLighting: AppearanceOptions;
  scheduledStart?: string;
  classType?: 'ONE_TO_ONE' | 'BATCH';
  /** Whether the teacher had the classroom locked when this person joined (from
   * the join response; live changes arrive through the room's metadata). */
  initialRoomLocked?: boolean;
  /** False on the extra class of a lesson that already used its one Partially
   * Completed — the teacher's End Class flow then disables that option. */
  partialCompletionAvailable?: boolean;
  /** Admin silently observing — no controls, no recording. */
  observerMode?: boolean;
  /** QA-only shared demo room (see client/lib/demoClassroom.ts) — gets the
   * same full Completed/Incomplete end-class flow as a real lesson so it
   * can actually be used to test/QA that flow, even though the server
   * intentionally ignores the outcome for this room (no real economics). */
  demo?: boolean;
}

interface HandToast {
  id: string;
  name: string;
}

const ADMISSION_POLL_INTERVAL_MS = 4_000;

export default function ClassroomRoom({
  roomName,
  sessionTitle,
  sessionSubtitle,
  isLive,
  lessonData,
  demoExampleLesson,
  initialBackgroundEffect,
  initialLighting,
  scheduledStart,
  classType,
  initialRoomLocked,
  partialCompletionAvailable,
  observerMode,
  demo,
}: ClassroomRoomProps) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled, cameraTrack } =
    useLocalParticipant();
  const participants = useParticipants();
  const localKey = personKey(localParticipant.identity);
  // LiveKit hands out one camera tile per CONNECTION; on screen it is one per
  // PERSON (the device with the camera on wins).
  const cameraTracks = pickPersonTiles(useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]));
  const peopleCount = countPeople(participants);
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  const screenShareRefs = screenTracks.filter(isTrackReference);
  const screenShare = screenShareRefs[0];
  const { chatMessages, send: sendChat } = useChat();
  const { theme, toggle: toggleTheme } = useClassroomTheme();

  const meta = parseParticipantMeta(localParticipant.identity, localParticipant.name || '');
  const isTeacher = !observerMode && meta.role === 'TEACHER';

  const { state: classroomState, patch: patchState } = useClassroomState(roomName, isTeacher);
  const {
    raisedHands,
    reactions,
    spotlightIdentity,
    setOwnHandRaised,
    lowerHand,
    sendReaction,
    setSpotlight,
    notifyStopScreenShare,
  } = useClassroomControls(() => {
    // The teacher forcibly stopped OUR screen share — stop the capture and
    // flip our own UI back off. The server already muted the track for
    // everyone else; this is what makes it look right locally too.
    void localParticipant.setScreenShareEnabled(false);
  });
  const effects = useVideoEffects();

  const [activePanel, setActivePanel] = useState<PanelKind>(null);
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [lastSeenChatCount, setLastSeenChatCount] = useState(0);
  const [handToasts, setHandToasts] = useState<HandToast[]>([]);
  const [showEndClassModal, setShowEndClassModal] = useState(false);
  const [expiredNoticeVisible, setExpiredNoticeVisible] = useState(false);
  const [timerMilestoneVisible, setTimerMilestoneVisible] = useState(false);
  const [pendingAdmissions, setPendingAdmissions] = useState<PendingAdmission[]>([]);
  const [lessonFocused, setLessonFocused] = useState(false);
  const [lockedLocal, setLockedLocal] = useState(!!initialRoomLocked);
  const [lockBusy, setLockBusy] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);
  const [awardResult, setAwardResult] = useState<AwardResponse | null>(null);
  const [celebrations, setCelebrations] = useState<BadgeAwardedEvent[]>([]);
  const [denied, setDenied] = useState<string | null>(null);
  const [fullscreenIdentity, setFullscreenIdentity] = useState<string | null>(null);
  const fullscreenTrack = fullscreenIdentity
    ? screenShareRefs.find((t) => t.participant.identity === fullscreenIdentity)
    : undefined;
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiredFiredRef = useRef(false);
  const seededEffectsRef = useRef(false);
  const prevRaisedRef = useRef<Record<string, boolean>>({});
  const prevParticipantIdentitiesRef = useRef<Set<string> | null>(null);
  const participantRolesRef = useRef<Record<string, 'TEACHER' | 'STUDENT'>>({});
  const prevAdmissionIdsRef = useRef<Set<string> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // "lesson-<scheduledLessonId>" rooms are the ones with real lesson
  // material behind them (see roomForLesson/isLessonRoom on the server).
  // The QA demo room has none — lessonData is simply null for it — but it
  // still gets the full Completed/Incomplete outcome flow (see
  // EndClassModal) AND the "View Lesson" panel (showing a fixed example —
  // see demoExampleLesson) so both can actually be exercised end-to-end
  // while testing, even though the server ignores the end-class outcome
  // for this room (no real economics) and the lesson content shown there
  // isn't tied to any real progress. Legacy marketplace bookings get
  // neither — they're a different flow entirely.
  // A 1:1 class is "lesson-<id>"; a batch class's one shared room is
  // "batch-session-<id>" ("batch-<teacher>-<start>" for a class that was already
  // running when batches became real).
  const isCurriculumLesson = roomName.startsWith('lesson-') || roomName.startsWith('batch-');
  // "trial-<id>": a free 30-minute trial class. Not a lesson (no material, no
  // outcome flow) and never recorded.
  const isTrialClass = roomName.startsWith('trial-');
  const isLessonFlow = isCurriculumLesson || !!demo;
  // Stage's own default content (priority #3, see Stage.tsx) always uses
  // `lessonData` untouched — only the View Lesson panel falls back to the
  // demo example, so demo's main stage keeps showing the camera by default.
  const lessonPanelData = lessonData ?? (demo ? demoExampleLesson ?? null : null);
  // The REC badge everyone sees comes from the room (the server mirrors "a recording
  // is running" into its metadata); the teacher's own recorder also counts, so it
  // shows even before the room has heard.
  const isRecordingLive = !!classroomState.recording;
  // Only the teacher records, and never a free trial. Everything about recording
  // — the browser's recorder, the finished files, their uploads — lives in this
  // hook and the store behind it (lib/classroom/recording).
  const recorder = useClassRecorder({
    room,
    roomName,
    enabled: isTeacher && !isTrialClass,
  });
  const recordingUiState: RecordingUiState =
    recorder.state === 'recording' ? 'active' : recorder.state === 'idle' ? 'inactive' : recorder.state;
  // A test session: students take the test in their OWN browser tab (they
  // share their whole screen while they do, and a share takes over the stage),
  // so the teacher's view of everyone's progress — and the lock buttons — is a
  // dock that stays put whatever the stage shows: the lesson, a camera, one
  // shared screen or four.
  const testSessionId =
    isTeacher && lessonData?.available && lessonData.isTest && lessonData.session.scheduledLessonId
      ? lessonData.session.scheduledLessonId
      : null;
  const presentationMode = !!screenShare;
  const expectedDurationMinutes = isTrialClass ? 30 : classType === 'BATCH' ? 60 : 45;

  // The database decides whether the room is locked; the live room's metadata
  // mirrors it so every screen updates at once. What we show is whichever
  // changed last: the join response, a change announced in the metadata, or the
  // teacher's own toggle (the server's answer, so a metadata update that never
  // arrived cannot leave the teacher looking at the wrong state).
  const metaLocked = classroomState.roomLocked;
  const [seenMetaLocked, setSeenMetaLocked] = useState(metaLocked);
  if (metaLocked !== seenMetaLocked) {
    setSeenMetaLocked(metaLocked);
    if (metaLocked !== undefined) setLockedLocal(metaLocked);
  }
  const roomLocked = lockedLocal;

  const showControlError = (message: string) => {
    setControlError(message);
    setTimeout(() => setControlError(null), 6000);
  };

  const handleToggleLock = async () => {
    if (lockBusy) return;
    setLockBusy(true);
    try {
      setLockedLocal(await setRoomLockedRequest(roomName, !roomLocked));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showControlError(e.response?.data?.message ?? 'Could not change the classroom lock. Please try again.');
    } finally {
      setLockBusy(false);
    }
  };

  // Things the server tells THIS participant: a badge they were awarded (a
  // celebration, shown to them alone), or why they are being removed.
  useServerEvents((event) => {
    if (event.type === 'badge-awarded') {
      if (isTeacher || observerMode) return;
      setCelebrations((queue) => (queue.some((c) => c.awardId === event.awardId) ? queue : [...queue, event]));
    } else if (event.type === 'room-denied') {
      setDenied(event.message);
    }
  });
  const finishCelebration = useCallback((awardId: string) => {
    setCelebrations((queue) => queue.filter((c) => c.awardId !== awardId));
  }, []);

  // Teacher polls for "removed participant wants back in" requests.
  useEffect(() => {
    if (!isTeacher) return;
    const poll = async () => {
      try {
        const list = await listPendingAdmissions(roomName);
        const ids = new Set(list.map((a) => a.id));
        const prevIds = prevAdmissionIdsRef.current;
        if (prevIds) {
          for (const id of ids) {
            if (!prevIds.has(id)) playClassroomTone('admission-request');
          }
        }
        prevAdmissionIdsRef.current = ids;
        setPendingAdmissions(list);
      } catch {
        // transient — keep polling
      }
    };
    void poll();
    const id = setInterval(poll, ADMISSION_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isTeacher, roomName]);

  const handleDecideAdmission = (admissionId: string, decision: 'APPROVE' | 'DENY') => {
    setPendingAdmissions((prev) => prev.filter((a) => a.id !== admissionId));
    void decideAdmission(roomName, admissionId, decision).catch(() => {});
  };

  // Subtle presence sounds — another person (never you, on any of your own
  // devices) arriving or leaving plays a short, space-themed chime. It is
  // about people, not connections: someone opening a second device is not a
  // new arrival.
  useEffect(() => {
    const currentKeys = new Set(participants.map((p) => personKey(p.identity)));
    const prev = prevParticipantIdentitiesRef.current;

    for (const p of participants) {
      participantRolesRef.current[personKey(p.identity)] = parseParticipantMeta(p.identity, p.name || '').role;
    }

    if (prev) {
      for (const key of currentKeys) {
        if (key === localKey) continue;
        if (!prev.has(key)) {
          const role = participantRolesRef.current[key];
          playClassroomTone(role === 'TEACHER' ? 'teacher-join' : 'student-join');
        }
      }
      for (const key of prev) {
        if (key === localKey) continue;
        if (!currentKeys.has(key)) {
          const role = participantRolesRef.current[key];
          playClassroomTone(role === 'TEACHER' ? 'teacher-leave' : 'student-leave');
          delete participantRolesRef.current[key];
        }
      }
    }
    prevParticipantIdentitiesRef.current = currentKeys;
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
    if (seededEffectsRef.current || observerMode) return;
    seededEffectsRef.current = true;
    if (initialBackgroundEffect.mode !== 'none') void effects.setBackground(undefined, initialBackgroundEffect);
    else if (
      initialLighting.brightness !== 1 ||
      initialLighting.contrast !== 1 ||
      initialLighting.touchUp ||
      initialLighting.autoFraming
    ) {
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

  // Teacher notification toast + sound when a new hand goes up.
  useEffect(() => {
    if (!isTeacher) return;
    Object.entries(raisedHands).forEach(([who, raised]) => {
      const wasRaised = prevRaisedRef.current[who];
      if (raised && !wasRaised && who !== localKey) {
        const p = participants.find((pp) => personKey(pp.identity) === who);
        const name = p ? parseParticipantMeta(p.identity, p.name || p.identity).displayName : 'A student';
        const id = `${who}-${Date.now()}`;
        setHandToasts((prev) => [...prev, { id, name }]);
        playClassroomTone('hand-raised');
        setTimeout(() => setHandToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
      }
    });
    prevRaisedRef.current = raisedHands;
  }, [raisedHands, isTeacher, participants, localKey]);

  const unreadChat = activePanel === 'chat' ? 0 : Math.max(0, chatMessages.length - lastSeenChatCount);
  useEffect(() => {
    if (activePanel === 'chat') setLastSeenChatCount(chatMessages.length);
  }, [activePanel, chatMessages.length]);

  // Subtle tone on every new chat message from someone else — own sent
  // messages stay silent (that's already visible feedback enough).
  const prevChatCountRef = useRef(chatMessages.length);
  useEffect(() => {
    if (chatMessages.length > prevChatCountRef.current) {
      const latest = chatMessages[chatMessages.length - 1];
      if (latest?.from && personKey(latest.from.identity) !== localKey) {
        playClassroomTone('chat-message');
      }
    }
    prevChatCountRef.current = chatMessages.length;
  }, [chatMessages, localKey]);

  useEffect(() => {
    if (activePanel !== 'lesson') setLessonFocused(false);
  }, [activePanel]);

  // Auto-hide the floating header/control bar a few seconds after the last
  // pointer/keyboard activity while a screen share is fullscreen; any
  // activity brings them back immediately.
  const bumpChrome = () => {
    setChromeVisible(true);
    if (chromeHideTimerRef.current) clearTimeout(chromeHideTimerRef.current);
    chromeHideTimerRef.current = setTimeout(() => setChromeVisible(false), 3000);
  };

  useEffect(() => {
    if (!fullscreenIdentity) {
      if (chromeHideTimerRef.current) clearTimeout(chromeHideTimerRef.current);
      setChromeVisible(true);
      return;
    }
    bumpChrome();
    return () => {
      if (chromeHideTimerRef.current) clearTimeout(chromeHideTimerRef.current);
    };
  }, [fullscreenIdentity]);

  // Drop out of fullscreen automatically the moment its share ends.
  useEffect(() => {
    if (fullscreenIdentity && !screenShareRefs.some((t) => t.participant.identity === fullscreenIdentity)) {
      setFullscreenIdentity(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreenIdentity, screenShareRefs.map((t) => t.participant.identity).join(',')]);

  useEffect(() => {
    if (!fullscreenIdentity) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenIdentity(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenIdentity]);

  const handleTogglePin = (identity: string) => {
    setPinnedIdentity((prev) => (prev === identity ? null : identity));
  };

  const handleToggleFullscreen = (identity: string) => {
    setFullscreenIdentity((prev) => (prev === identity ? null : identity));
  };

  // Everyone is in the strip — including you while you share your screen, so
  // you can always see yourself. (Only the fullscreen share layer hides tiles.)
  const filmstripTracks = cameraTracks;

  const micDisabledByTeacher = !isTeacher && !!classroomState.studentsMuted;

  const handleForceStopShare = (identity: string) => {
    notifyStopScreenShare(identity);
    void stopParticipantScreenShare(roomName, identity).catch(() => {});
  };

  const endClassGate = (() => {
    if (!scheduledStart) return null;
    const elapsedMs = Date.now() - new Date(scheduledStart).getTime();
    if (elapsedMs < 10 * 60_000) {
      const remaining = Math.ceil((10 * 60_000 - elapsedMs) / 60_000);
      return `Available in ${remaining} min`;
    }
    return null;
  })();

  const headerEl = (
    <Header
      sessionTitle={sessionTitle}
      sessionSubtitle={sessionSubtitle}
      isLive={isLive}
      recording={isRecordingLive || recorder.state === 'recording'}
      scheduledStart={scheduledStart}
      expectedDurationMinutes={expectedDurationMinutes}
      onTimerMilestone={() => {
        setTimerMilestoneVisible(true);
        setTimeout(() => setTimerMilestoneVisible(false), 8000);
      }}
      theme={theme}
      onToggleTheme={toggleTheme}
      floating={!!fullscreenTrack}
      roomLocked={roomLocked}
      onToggleLock={isTeacher ? () => void handleToggleLock() : undefined}
      lockBusy={lockBusy}
    />
  );

  return (
    <div
      ref={rootRef}
      className="cr-root h-screen w-full flex flex-col overflow-hidden relative"
      data-theme={theme}
      onMouseMove={fullscreenTrack ? bumpChrome : undefined}
      onPointerDown={fullscreenTrack ? bumpChrome : undefined}
      onTouchStart={fullscreenTrack ? bumpChrome : undefined}
    >
      <ClassAudioRenderer selfIdentity={localParticipant.identity} />

      {fullscreenTrack && (
        <div className="fixed inset-0 z-30 bg-black" onDoubleClick={() => setFullscreenIdentity(null)}>
          <VideoTrack trackRef={fullscreenTrack} className="w-full h-full object-contain bg-black" />
          <div
            className={`absolute top-[72px] right-4 flex items-center gap-2 transition-opacity duration-300 ${
              chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-xs font-medium flex items-center gap-1.5">
              <Monitor size={12} />
              {fullscreenTrack.participant.isLocal
                ? 'You are presenting'
                : `${parseParticipantMeta(fullscreenTrack.participant.identity, fullscreenTrack.participant.name || '').displayName} is presenting`}
            </div>
            <button
              onClick={() => setFullscreenIdentity(null)}
              data-tooltip="Exit fullscreen"
              data-tooltip-align="end"
              className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 border border-white/15 backdrop-blur flex items-center justify-center text-white transition-colors"
            >
              <Minimize2 size={16} />
            </button>
          </div>
        </div>
      )}

      {fullscreenTrack ? (
        <div
          className={`cr-root fixed top-0 inset-x-0 z-40 transition-opacity duration-300 ${
            chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          data-theme="dark"
        >
          {headerEl}
        </div>
      ) : (
        headerEl
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div
          className={`flex-1 flex flex-col min-w-0 relative ${
            presentationMode ? 'p-0 lg:p-2 gap-2' : 'p-3 sm:p-4 gap-3'
          }`}
        >
          <div className="cr-watermark" />

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

          {timerMilestoneVisible && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[var(--cr-surface-2)] border border-[var(--cr-border-strong)] backdrop-blur text-[var(--cr-text)] text-xs font-medium shadow-lg cr-fade-in">
              This class has reached its expected {expectedDurationMinutes}-minute duration.
              <button
                onClick={() => setTimerMilestoneVisible(false)}
                className="ml-1 text-[var(--cr-text-faint)] hover:text-[var(--cr-text)]"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {controlError && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 backdrop-blur text-red-400 text-xs font-medium shadow-lg cr-fade-in">
              {controlError}
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

          {/* One monitor, restyled (never remounted) when a screen share goes
              fullscreen: then it floats over the video, below the header. */}
          {testSessionId && (
            <div
              className={
                fullscreenTrack
                  ? 'pointer-events-none fixed inset-x-3 top-[60px] z-40 sm:right-[17rem]'
                  : 'relative z-10 flex-shrink-0'
              }
            >
              <div className={fullscreenTrack ? 'pointer-events-auto max-w-5xl' : ''}>
                <ClassTestMonitor
                  scheduledLessonId={testSessionId}
                  variant="classroom"
                  layout={fullscreenTrack ? 'overlay' : 'dock'}
                />
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 relative">
            <Stage
              cameraTracks={cameraTracks}
              pinnedIdentity={pinnedIdentity}
              spotlightIdentity={spotlightIdentity}
              raisedHands={raisedHands}
              onTogglePin={handleTogglePin}
              lessonData={lessonData}
              onStopShare={() => void localParticipant.setScreenShareEnabled(false)}
              isTeacher={isTeacher}
              onForceStopShare={isTeacher ? handleForceStopShare : undefined}
              fullscreenIdentity={fullscreenIdentity}
              onToggleFullscreen={handleToggleFullscreen}
            />
            <ReactionsOverlay reactions={reactions} />
          </div>

          {/* Mobile/tablet keeps the bottom strip, since there's no room
              for a side column there; desktop always uses ParticipantRail
              instead (see below) — never both at once, that duplication
              was the classroom's old layout-hierarchy problem. */}
          <FilmStrip
            tracks={filmstripTracks}
            raisedHands={raisedHands}
            pinnedIdentity={pinnedIdentity}
            onTogglePin={handleTogglePin}
            compact={presentationMode}
            className="lg:hidden"
          />

          {isTeacher && awardResult && (
            <AwardToast result={awardResult} roomName={roomName} onDismiss={() => setAwardResult(null)} />
          )}

          {isTeacher && !isTrialClass && <RecordingTray roomName={roomName} controls={recorder} />}
        </div>

        <ParticipantRail
          tracks={filmstripTracks}
          raisedHands={raisedHands}
          pinnedIdentity={pinnedIdentity}
          onTogglePin={handleTogglePin}
          collapsed={panelCollapsed}
          onToggleCollapsed={() => setPanelCollapsed((v) => !v)}
        />

        {activePanel === 'lesson' && !observerMode && (
          <LessonSidePanel
            data={lessonPanelData}
            onClose={() => setActivePanel(null)}
            focused={lessonFocused}
            onToggleFocused={() => setLessonFocused((v) => !v)}
            overlay={!!fullscreenTrack}
          />
        )}

        {activePanel && activePanel !== 'lesson' && !observerMode && (
          <div
            className={
              fullscreenTrack
                ? 'fixed top-14 bottom-0 right-0 z-40 w-[320px] border-l border-[var(--cr-border)] bg-[var(--cr-surface)] shadow-2xl cr-fade-in'
                : 'w-[320px] flex-shrink-0 border-l border-[var(--cr-border)] cr-fade-in'
            }
          >
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
                pendingAdmissions={pendingAdmissions}
                onDecideAdmission={handleDecideAdmission}
                onNotifyStopScreenShare={isTeacher ? handleForceStopShare : undefined}
              />
            )}
          </div>
        )}
      </div>

      {(() => {
        const bottomBarEl = observerMode ? (
          <div
            className={`flex items-center justify-center h-[60px] flex-shrink-0 ${
              fullscreenTrack
                ? 'bg-black/40 backdrop-blur-xl border-t border-white/10'
                : 'border-t border-[var(--cr-border)] bg-[var(--cr-bg)]'
            }`}
          >
            <button
              onClick={() => room.disconnect()}
              className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-[var(--cr-danger)] hover:bg-[var(--cr-danger-hover)] text-white text-sm font-semibold transition-colors"
            >
              <PhoneOff size={15} />
              Leave observation
            </button>
          </div>
        ) : (
          <ControlBar
            isTeacher={isTeacher}
            micEnabled={isMicrophoneEnabled}
            camEnabled={isCameraEnabled}
            screenShareEnabled={isScreenShareEnabled}
            onToggleMic={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
            onToggleCam={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
            onToggleScreenShare={() => void localParticipant.setScreenShareEnabled(!isScreenShareEnabled)}
            micDisabledByTeacher={micDisabledByTeacher}
            handRaised={!!raisedHands[localKey]}
            onToggleHand={() => setOwnHandRaised(!raisedHands[localKey])}
            activePanel={activePanel}
            onSetPanel={setActivePanel}
            unreadChat={unreadChat}
            participantCount={peopleCount}
            classroomState={classroomState}
            onPatchState={patchState}
            onMuteAll={() => void muteAllParticipants(roomName)}
            recordingState={recordingUiState}
            onToggleRecording={() => (recorder.state === 'recording' ? void recorder.stop() : recorder.start())}
            recordingAvailable={!isTrialClass}
            recordingPending={recorder.pending}
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
            onOpenEndClass={() => setShowEndClassModal(true)}
            endClassDisabledReason={endClassGate}
            onViewLesson={isLessonFlow ? () => setActivePanel('lesson') : undefined}
            floating={!!fullscreenTrack}
            roomLocked={roomLocked}
            onToggleRoomLock={isTeacher ? () => void handleToggleLock() : undefined}
            awardBadge={
              isTeacher && isLessonFlow
                ? {
                    roomName,
                    isBatch: classType === 'BATCH',
                    students: listStudents(participants),
                    onAwarded: setAwardResult,
                  }
                : undefined
            }
          />
        );

        return fullscreenTrack ? (
          <div
            className={`cr-root fixed bottom-0 inset-x-0 z-40 transition-opacity duration-300 ${
              chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            data-theme="dark"
          >
            {bottomBarEl}
          </div>
        ) : (
          bottomBarEl
        );
      })()}

      {showEndClassModal && (
        <EndClassModal
          isLessonFlow={isLessonFlow}
          partialCompletionAvailable={partialCompletionAvailable}
          onClose={() => setShowEndClassModal(false)}
          recordingNotice={
            recorder.state === 'recording'
              ? 'Your recording will be stopped and saved first. After the class ends, press Upload Class Recording so students can watch it.'
              : recorder.pending > 0
                ? 'You have a class recording that is not uploaded yet. After the class ends, stay on this page and press Upload Class Recording — students cannot watch it until then.'
                : undefined
          }
          onSubmit={async (params: EndClassParams) => {
            // Finish the file BEFORE the class closes: its length and its stop
            // are then recorded properly, and nothing is still running in a room
            // that no longer exists.
            await recorder.stopIfRecording();
            await endClassRequest(roomName, params);
          }}
          onFinished={() => room.disconnect()}
        />
      )}

      {/* A student's badge celebration — a few seconds of pop and sparkle that
          never takes focus or blocks anything underneath. */}
      <BadgeCelebration queue={celebrations} onDone={finishCelebration} />

      {/* The server removed this connection (the teacher locked the classroom
          just before it connected, or the class was already full). */}
      {denied && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          role="alertdialog"
          aria-label="You can't stay in this classroom"
          data-testid="room-denied"
        >
          <div className="max-w-sm rounded-2xl border border-[var(--cr-border)] bg-[var(--cr-surface)] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
              <Lock size={20} />
            </div>
            <p className="mb-1 text-base font-semibold text-[var(--cr-text)]">You can&apos;t stay in this classroom</p>
            <p className="text-sm text-[var(--cr-text-muted)]">{denied}</p>
            <button
              type="button"
              onClick={() => room.disconnect()}
              className="mt-5 rounded-lg bg-[var(--cr-surface-2)] px-4 py-2 text-sm text-[var(--cr-text)] transition-colors hover:bg-[var(--cr-surface-3)]"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

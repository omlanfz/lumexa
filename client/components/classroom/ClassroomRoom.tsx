// FILE PATH: client/components/classroom/ClassroomRoom.tsx
//
// The in-call classroom experience — mounted inside <CallProvider>, once the
// person is in the Daily meeting. Owns all the room-level UI state (panels,
// pin/spotlight, video effects) and wires the Daily hooks (lib/classroom/daily)
// into the presentational components.
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
// Fullscreen (the ⛶ button on a shared-screen tile) is `fullscreenSessionId`
// state owned here, NOT the browser's per-element Fullscreen API — that
// API would hide the header/control bar along with everything else, and
// this classroom wants them to keep working (as an auto-hiding glass
// overlay) while a shared screen fills the viewport. See the render below:
// a fixed full-viewport video layer plus the Header/ControlBar re-rendered
// in their `floating` variant on top, faded in/out by mouse activity.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { VideoView } from './MediaViews';
import { activeScreenShares, listStudents } from '@/lib/classroom/people';
import { useCall, useCallSnapshot, useLocalPeer, usePeople } from '@/lib/classroom/daily/CallContext';
import { muteAllStudents, stopPersonScreenShare } from '@/lib/classroom/daily/moderation';
import type { AwardResponse } from '@/lib/classroom/badgeAward';
import type { BadgeAwardedEvent } from '@/lib/classroom/serverEvents';
import { useServerEvents } from '@/lib/classroom/useServerEvents';
import { useClassroomState } from '@/lib/classroom/useClassroomState';
import { useClassroomControls } from '@/lib/classroom/useClassroomControls';
import { useChat } from '@/lib/classroom/useChat';
import { useLocalMedia } from '@/lib/classroom/useLocalMedia';
import { useVideoEffects } from '@/lib/classroom/useVideoEffects';
import { useClassRecorder } from '@/lib/classroom/recording/useClassRecorder';
import { useClassroomTheme } from '@/lib/classroom/useClassroomTheme';
import {
  endClassRequest,
  listPendingAdmissions,
  decideAdmission,
  setRoomLocked as setRoomLockedRequest,
  type PendingAdmission,
  type EndClassParams,
} from '@/lib/classroom/api';
import { playClassroomTone } from '@/lib/classroom/sounds';
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
  scheduledStart?: string;
  classType?: 'ONE_TO_ONE' | 'BATCH';
  /** Whether the teacher had the classroom locked when this person joined (from
   * the join response; live changes arrive through the room's shared state). */
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
  scheduledStart,
  classType,
  initialRoomLocked,
  partialCompletionAvailable,
  observerMode,
  demo,
}: ClassroomRoomProps) {
  const call = useCall();
  const { peers, localUserId } = useCallSnapshot();
  const local = useLocalPeer();
  const localKey = localUserId ?? '';
  // Daily hands out one connection per DEVICE; on screen it is one per PERSON
  // (the device with the camera on supplies the video).
  const people = usePeople();
  const peopleCount = people.length;
  const screenShares = activeScreenShares(peers);
  const screenShare = screenShares[0];
  const { theme, toggle: toggleTheme } = useClassroomTheme();

  // The teacher is the room's owner: only the server's meeting token can make
  // anyone that (a student can rename themselves, but not that).
  const isTeacher = !observerMode && !!local?.isOwner;
  const media = useLocalMedia();
  const { messages: chatMessages, send: sendChat } = useChat({ isTeacher });

  const { state: classroomState, patch: patchState } = useClassroomState(roomName, isTeacher);
  const { raisedHands, reactions, spotlightUserId, setOwnHandRaised, lowerHand, sendReaction, setSpotlight } =
    useClassroomControls();
  const effects = useVideoEffects(call);

  const [activePanel, setActivePanel] = useState<PanelKind>(null);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
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
  const [fullscreenSessionId, setFullscreenSessionId] = useState<string | null>(null);
  const fullscreenShare = fullscreenSessionId ? screenShares.find((p) => p.sessionId === fullscreenSessionId) : undefined;
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiredFiredRef = useRef(false);
  const prevRaisedRef = useRef<Record<string, boolean>>({});
  const prevPeopleRef = useRef<Set<string> | null>(null);
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
  // is running" into its shared state); the teacher's own recorder also counts, so it
  // shows even before the room has heard.
  const isRecordingLive = !!classroomState.recording;
  // Only the teacher records, and never a free trial. Everything about recording
  // — the browser's recorder, the finished files, their uploads — lives in this
  // hook and the store behind it (lib/classroom/recording).
  const recorder = useClassRecorder({
    call,
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

  // The database decides whether the room is locked; the live room's shared state
  // mirrors it so every screen updates at once. What we show is whichever
  // changed last: the join response, a change announced in the room's state, or the
  // teacher's own toggle (the server's answer, so a state update that never
  // arrived cannot leave the teacher looking at the wrong state).
  const stateLocked = classroomState.roomLocked;
  const [seenStateLocked, setSeenStateLocked] = useState(stateLocked);
  if (stateLocked !== seenStateLocked) {
    setSeenStateLocked(stateLocked);
    if (stateLocked !== undefined) setLockedLocal(stateLocked);
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
    const currentKeys = new Set(people.map((p) => p.userId));
    const prev = prevPeopleRef.current;

    for (const p of people) participantRolesRef.current[p.userId] = p.role;

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
    prevPeopleRef.current = currentKeys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people]);

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

  // (The effect chosen on the pre-join screen needs no seeding here: the camera,
  // the microphone and the effects live on the call, which is the same call.)

  // Enforce the teacher's "students muted" policy client-side.
  useEffect(() => {
    if (!isTeacher && !observerMode && classroomState.studentsMuted && media.micOn) media.setMic(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomState.studentsMuted]);

  // Teacher notification toast + sound when a new hand goes up.
  useEffect(() => {
    if (!isTeacher) return;
    Object.entries(raisedHands).forEach(([who, raised]) => {
      const wasRaised = prevRaisedRef.current[who];
      if (raised && !wasRaised && who !== localKey) {
        const person = people.find((pp) => pp.userId === who);
        const name = person ? person.displayName : 'A student';
        const id = `${who}-${Date.now()}`;
        setHandToasts((prev) => [...prev, { id, name }]);
        playClassroomTone('hand-raised');
        setTimeout(() => setHandToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
      }
    });
    prevRaisedRef.current = raisedHands;
  }, [raisedHands, isTeacher, people, localKey]);

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
      if (latest && latest.fromUserId !== localKey) {
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
    if (!fullscreenSessionId) {
      if (chromeHideTimerRef.current) clearTimeout(chromeHideTimerRef.current);
      setChromeVisible(true);
      return;
    }
    bumpChrome();
    return () => {
      if (chromeHideTimerRef.current) clearTimeout(chromeHideTimerRef.current);
    };
  }, [fullscreenSessionId]);

  // Drop out of fullscreen automatically the moment its share ends.
  useEffect(() => {
    if (fullscreenSessionId && !screenShares.some((p) => p.sessionId === fullscreenSessionId)) {
      setFullscreenSessionId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreenSessionId, screenShares.map((p) => p.sessionId).join(',')]);

  useEffect(() => {
    if (!fullscreenSessionId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenSessionId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenSessionId]);

  const handleTogglePin = (userId: string) => {
    setPinnedUserId((prev) => (prev === userId ? null : userId));
  };

  const handleToggleFullscreen = (sessionId: string) => {
    setFullscreenSessionId((prev) => (prev === sessionId ? null : sessionId));
  };

  // Everyone is in the strip — including you while you share your screen, so
  // you can always see yourself. (Only the fullscreen share layer hides tiles.)

  // A student is muted by the teacher's "students can't unmute" setting, or by the
  // teacher taking away their right to use a microphone (see daily/moderation.ts).
  const micDisabledByTeacher = !isTeacher && (!!classroomState.studentsMuted || media.micLocked);

  // The teacher's own browser stops a share through Daily (the room's owner may);
  // the sharer's browser then stops its capture by itself.
  const handleForceStopShare = (userId: string) => {
    stopPersonScreenShare(call, peers, userId);
  };

  const leaveClass = () => void call.leave();

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
      floating={!!fullscreenShare}
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
      onMouseMove={fullscreenShare ? bumpChrome : undefined}
      onPointerDown={fullscreenShare ? bumpChrome : undefined}
      onTouchStart={fullscreenShare ? bumpChrome : undefined}
    >
      <ClassAudioRenderer />

      {fullscreenShare && (
        <div className="fixed inset-0 z-30 bg-black" onDoubleClick={() => setFullscreenSessionId(null)}>
          <VideoView track={fullscreenShare.screenVideo.track} className="w-full h-full object-contain bg-black" />
          <div
            className={`absolute top-[72px] right-4 flex items-center gap-2 transition-opacity duration-300 ${
              chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-xs font-medium flex items-center gap-1.5">
              <Monitor size={12} />
              {fullscreenShare.isLocal || fullscreenShare.userId === localUserId
                ? 'You are presenting'
                : `${fullscreenShare.displayName} is presenting`}
            </div>
            <button
              onClick={() => setFullscreenSessionId(null)}
              data-tooltip="Exit fullscreen"
              data-tooltip-align="end"
              className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 border border-white/15 backdrop-blur flex items-center justify-center text-white transition-colors"
            >
              <Minimize2 size={16} />
            </button>
          </div>
        </div>
      )}

      {fullscreenShare ? (
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
                fullscreenShare
                  ? 'pointer-events-none fixed inset-x-3 top-[60px] z-40 sm:right-[17rem]'
                  : 'relative z-10 flex-shrink-0'
              }
            >
              <div className={fullscreenShare ? 'pointer-events-auto max-w-5xl' : ''}>
                <ClassTestMonitor
                  scheduledLessonId={testSessionId}
                  variant="classroom"
                  layout={fullscreenShare ? 'overlay' : 'dock'}
                />
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 relative">
            <Stage
              people={people}
              screenShares={screenShares}
              localUserId={localUserId}
              pinnedUserId={pinnedUserId}
              spotlightUserId={spotlightUserId}
              raisedHands={raisedHands}
              onTogglePin={handleTogglePin}
              lessonData={lessonData}
              onStopShare={media.stopScreenShare}
              isTeacher={isTeacher}
              onForceStopShare={isTeacher ? handleForceStopShare : undefined}
              fullscreenSessionId={fullscreenSessionId}
              onToggleFullscreen={handleToggleFullscreen}
            />
            <ReactionsOverlay reactions={reactions} />
          </div>

          {/* Mobile/tablet keeps the bottom strip, since there's no room
              for a side column there; desktop always uses ParticipantRail
              instead (see below) — never both at once, that duplication
              was the classroom's old layout-hierarchy problem. */}
          <FilmStrip
            people={people}
            raisedHands={raisedHands}
            pinnedUserId={pinnedUserId}
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
          people={people}
          raisedHands={raisedHands}
          pinnedUserId={pinnedUserId}
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
            overlay={!!fullscreenShare}
          />
        )}

        {activePanel && activePanel !== 'lesson' && !observerMode && (
          <div
            className={
              fullscreenShare
                ? 'fixed top-14 bottom-0 right-0 z-40 w-[320px] border-l border-[var(--cr-border)] bg-[var(--cr-surface)] shadow-2xl cr-fade-in'
                : 'w-[320px] flex-shrink-0 border-l border-[var(--cr-border)] cr-fade-in'
            }
          >
            {activePanel === 'chat' ? (
              <ChatPanel
                messages={chatMessages}
                onSend={sendChat}
                onClose={() => setActivePanel(null)}
                locked={!!classroomState.chatLocked}
                isTeacher={isTeacher}
                onToggleLock={() => patchState({ chatLocked: !classroomState.chatLocked })}
                onReact={sendReaction}
                localUserId={localKey}
              />
            ) : (
              <ParticipantsPanel
                people={people}
                isTeacher={isTeacher}
                roomName={roomName}
                raisedHands={raisedHands}
                onLowerHand={lowerHand}
                onClose={() => setActivePanel(null)}
                localUserId={localKey}
                spotlightUserId={spotlightUserId}
                onSetSpotlight={setSpotlight}
                pendingAdmissions={pendingAdmissions}
                onDecideAdmission={handleDecideAdmission}
                onStopScreenShare={isTeacher ? handleForceStopShare : undefined}
              />
            )}
          </div>
        )}
      </div>

      {(() => {
        const bottomBarEl = observerMode ? (
          <div
            className={`flex items-center justify-center h-[60px] flex-shrink-0 ${
              fullscreenShare
                ? 'bg-black/40 backdrop-blur-xl border-t border-white/10'
                : 'border-t border-[var(--cr-border)] bg-[var(--cr-bg)]'
            }`}
          >
            <button
              onClick={leaveClass}
              className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-[var(--cr-danger)] hover:bg-[var(--cr-danger-hover)] text-white text-sm font-semibold transition-colors"
            >
              <PhoneOff size={15} />
              Leave observation
            </button>
          </div>
        ) : (
          <ControlBar
            isTeacher={isTeacher}
            micEnabled={media.micOn}
            camEnabled={media.cameraOn}
            screenShareEnabled={media.screenSharing}
            onToggleMic={media.toggleMic}
            onToggleCam={media.toggleCamera}
            onToggleScreenShare={media.toggleScreenShare}
            micDisabledByTeacher={micDisabledByTeacher}
            handRaised={!!raisedHands[localKey]}
            onToggleHand={() => setOwnHandRaised(!raisedHands[localKey])}
            activePanel={activePanel}
            onSetPanel={setActivePanel}
            unreadChat={unreadChat}
            participantCount={peopleCount}
            classroomState={classroomState}
            onPatchState={patchState}
            onMuteAll={() => muteAllStudents(call, peers)}
            recordingState={recordingUiState}
            onToggleRecording={() => (recorder.state === 'recording' ? void recorder.stop() : recorder.start())}
            recordingAvailable={!isTrialClass}
            recordingPending={recorder.pending}
            backgroundEffect={effects.backgroundEffect}
            onBackgroundChange={(e) => void effects.setBackground(e)}
            lighting={effects.lighting}
            onLightingChange={(l) => void effects.setLighting(l)}
            effectsSupported={effects.supported}
            effectsPending={effects.pending}
            onUploadImage={(file) => {
              const url = URL.createObjectURL(file);
              void effects.setBackground({ mode: 'image', imagePath: url, label: 'Custom' });
            }}
            onLeave={leaveClass}
            onOpenEndClass={() => setShowEndClassModal(true)}
            endClassDisabledReason={endClassGate}
            onViewLesson={isLessonFlow ? () => setActivePanel('lesson') : undefined}
            floating={!!fullscreenShare}
            roomLocked={roomLocked}
            onToggleRoomLock={isTeacher ? () => void handleToggleLock() : undefined}
            awardBadge={
              isTeacher && isLessonFlow
                ? {
                    roomName,
                    isBatch: classType === 'BATCH',
                    students: listStudents(peers),
                    onAwarded: setAwardResult,
                  }
                : undefined
            }
          />
        );

        return fullscreenShare ? (
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
          onFinished={leaveClass}
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
              onClick={leaveClass}
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

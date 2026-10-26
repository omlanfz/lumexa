// FILE PATH: client/components/classroom/ClassroomExperience.tsx
//
// Top-level classroom flow: fetch a LiveKit join token, show the pre-join
// screen, then connect and hand off to ClassroomRoom. Also fetches lesson
// material up front (curriculum flow only) so both the pre-join session
// info and the in-room LessonPanel have it immediately.
//
// This page load is ONE device of the person (a new random device id, sent with
// every join, becomes part of the LiveKit identity — see lib/classroom/
// identity.ts), so the same person can also join from a phone or a second tab.
// A fresh token is fetched again when the person presses Join on the pre-join
// screen, so the teacher's lock and the 10-people limit are checked at the last
// moment rather than minutes earlier when the page opened.
//
// Special join paths besides the normal one:
//   - waitingForAdmission: the server refused a token because this
//     participant was previously removed from the room (see
//     AdmissionService) — show a waiting screen and poll until the teacher
//     Admits or Denies.
//   - blocked: the server answered "not now" — the teacher has locked the
//     classroom, it is full (10 people) or this person is already on 3
//     devices. Shown with a Try again button; nothing connects.
//   - adminObserve: an admin joining a live class from /admin/classes as a
//     silent, non-publishing observer (see ClassroomService.
//     adminJoinLiveClass) — skips the pre-join device screen entirely,
//     since there's nothing to configure.

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';
import PreJoinScreen, { JoinChoices } from './PreJoinScreen';
import ClassroomRoom from './ClassroomRoom';
import { PeopleProvider } from './PeopleContext';
import { newDeviceId } from '@/lib/classroom/identity';
import { DEFAULT_LIGHTING } from '@/lib/classroom/useVideoEffects';
import type { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';

interface ClassroomExperienceProps {
  /** A booking id, a scheduled lesson id, or (with `isBatch`) a batch class id. */
  id: string;
  /** A curriculum class (a scheduled lesson, or a batch class) rather than a
   * marketplace booking. */
  isLesson: boolean;
  /** `id` is a BATCH CLASS (one session shared by several students): the
   * server finds the person's own place in it. Used for a teacher entering a
   * batch class from their schedule or an email. */
  isBatch?: boolean;
  /** Which kind of live class an observing admin is joining
   * (BOOKING | LESSON | SESSION). */
  adminKind?: string;
  /** Temporary QA-only mode — joins the shared demo room instead of a real
   * booking/lesson. See client/lib/demoClassroom.ts. */
  demo?: boolean;
  /** Admin observing a live class from /admin/classes — see the file
   * header comment. */
  adminObserve?: boolean;
}

interface JoinResponse {
  token: string;
  url: string;
  roomName: string;
  scheduledStart?: string;
  /** The class row the person came in through (a batch class names one
   * student's row for the teacher). */
  scheduledLessonId?: string;
  classType?: 'ONE_TO_ONE' | 'BATCH';
  /** The batch this class belongs to (null for a 1-to-1 class). */
  batchName?: string | null;
  partialCompletionAvailable?: boolean;
  /** The teacher had the classroom locked at the time of this join. */
  roomLocked?: boolean;
}

interface WaitingResponse {
  waitingForAdmission: true;
  admissionId: string;
  roomName: string;
}

/** The server said "not now": see lib/classroom/serverEvents.ts for the reasons. */
interface BlockedResponse {
  blocked: true;
  reason: 'ROOM_LOCKED' | 'ROOM_FULL' | 'TOO_MANY_DEVICES';
  message: string;
  roomName: string;
}

const BLOCKED_TITLE: Record<BlockedResponse['reason'], string> = {
  ROOM_LOCKED: 'This classroom is locked',
  ROOM_FULL: 'This classroom is full',
  TOO_MANY_DEVICES: 'Too many devices',
};

function dashboardPathFor(role: string | null): string {
  if (role === 'STUDENT') return '/student-dashboard';
  if (role === 'TEACHER') return '/teacher-dashboard';
  return '/dashboard';
}

export default function ClassroomExperience({
  id,
  isLesson,
  isBatch,
  adminKind,
  demo,
  adminObserve,
}: ClassroomExperienceProps) {
  const router = useRouter();
  const [join, setJoin] = useState<JoinResponse | null>(null);
  const [waiting, setWaiting] = useState<WaitingResponse | null>(null);
  const [blocked, setBlocked] = useState<BlockedResponse | null>(null);
  const [retrying, setRetrying] = useState(false);
  // This page load's device id — never stored, so a refreshed or duplicated tab
  // can't collide with another connection of the same person.
  const [deviceId] = useState(newDeviceId);
  const [denied, setDenied] = useState(false);
  const [lessonData, setLessonData] = useState<LessonDetailsResponse | null>(null);
  const [demoExampleLesson, setDemoExampleLesson] = useState<LessonDetailsResponse | null>(null);
  const [error, setError] = useState('');
  const [choices, setChoices] = useState<JoinChoices | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lessonRequested = useRef(false);

  const fetchLessonDetails = (lessonId: string) => {
    if (lessonRequested.current) return;
    lessonRequested.current = true;
    api
      .get<LessonDetailsResponse>(`/curriculum/scheduled-lessons/${lessonId}/details`)
      .then((res) => setLessonData(res.data))
      .catch(() => setLessonData(null));
  };

  const attemptJoin = async () => {
    try {
      const path = adminObserve
        ? `/admin/classes/${adminKind ?? (isLesson ? 'LESSON' : 'BOOKING')}/${id}/join`
        : demo
          ? '/classroom/join-demo'
          : '/classroom/join';
      const body = adminObserve
        ? {}
        : demo
          ? { deviceId }
          : isBatch
            ? { batchSessionId: id, deviceId }
            : isLesson
              ? { scheduledLessonId: id, deviceId }
              : { bookingId: id, deviceId };
      const res = await api.post<JoinResponse | WaitingResponse | BlockedResponse>(path, body);
      if ('waitingForAdmission' in res.data) {
        setWaiting(res.data);
      } else if ('blocked' in res.data) {
        setBlocked(res.data);
      } else {
        setWaiting(null);
        setBlocked(null);
        setJoin(res.data);
        // A batch class is entered by its own id: the lesson page is the one of
        // the row the server let this person in through.
        if (isBatch && !adminObserve && res.data.scheduledLessonId) {
          fetchLessonDetails(res.data.scheduledLessonId);
        }
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Could not connect to the classroom. Please try again.');
    }
  };

  useEffect(() => {
    const authToken = getStoredToken();
    if (!authToken) {
      router.push('/login');
      return;
    }

    void attemptJoin();

    if (isLesson && !isBatch && !demo && !adminObserve) {
      fetchLessonDetails(id);
    }

    // The demo room has no real ScheduledLesson, so "View Lesson" there
    // shows this fixed example instead — see getDemoExampleLessonDetails.
    // Deliberately kept separate from `lessonData` above (which also
    // drives the main stage's default content) so it only affects the
    // View Lesson panel, not what the demo classroom shows by default.
    if (demo && !adminObserve) {
      api
        .get<LessonDetailsResponse>('/curriculum/demo-example-lesson')
        .then((res) => setDemoExampleLesson(res.data))
        .catch(() => setDemoExampleLesson(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLesson, isBatch, demo, adminObserve, router]);

  // While waiting to be re-admitted, poll the teacher's decision every 3s.
  useEffect(() => {
    if (!waiting) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get<{ status: 'PENDING' | 'APPROVED' | 'DENIED' }>(
          `/classroom/admissions/${waiting.admissionId}/status`,
        );
        if (res.data.status === 'APPROVED') {
          if (pollRef.current) clearInterval(pollRef.current);
          setWaiting(null);
          void attemptJoin();
        } else if (res.data.status === 'DENIED') {
          if (pollRef.current) clearInterval(pollRef.current);
          setDenied(true);
        }
      } catch {
        // transient — keep polling
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting?.admissionId]);

  // Pressing Join on the pre-join screen: get a token NOW (the lock and the
  // 10-people limit are checked when it is issued), then connect with it.
  const handleJoinChoices = (c: JoinChoices) => {
    setChoices(c);
    setJoin(null);
    void attemptJoin();
  };

  const retryJoin = async () => {
    setRetrying(true);
    setBlocked(null);
    await attemptJoin();
    setRetrying(false);
  };

  const handleDisconnect = () => {
    if (adminObserve) {
      router.push('/admin/classes');
      return;
    }
    router.push(dashboardPathFor(getStoredRole()));
  };

  if (denied) {
    return (
      <div className="cr-root min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-red-400 font-medium mb-2">You weren&apos;t re-admitted</p>
          <p className="text-[var(--cr-text-muted)] text-sm">
            The teacher didn&apos;t let you back into this class. Reach out to them directly if this seems wrong.
          </p>
          <button
            onClick={() => router.push(dashboardPathFor(getStoredRole()))}
            className="mt-5 px-4 py-2 rounded-lg bg-[var(--cr-surface-2)] text-[var(--cr-text)] text-sm hover:bg-[var(--cr-surface-3)] transition-colors"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="cr-root min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-9 h-9 border-2 border-[var(--cr-accent)] border-t-transparent rounded-full animate-spin" />
        <div className="max-w-sm text-center">
          <p className="text-[var(--cr-text)] font-medium mb-1">Waiting to be let back in</p>
          <p className="text-[var(--cr-text-muted)] text-sm">
            The teacher has been notified that you&apos;d like to rejoin. This page will continue automatically once
            they admit you.
          </p>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="cr-root min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center" data-testid="join-blocked" data-reason={blocked.reason}>
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
            <Lock size={20} />
          </div>
          <p className="text-[var(--cr-text)] font-medium mb-1">{BLOCKED_TITLE[blocked.reason]}</p>
          <p className="text-[var(--cr-text-muted)] text-sm">{blocked.message}</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={() => void retryJoin()}
              disabled={retrying}
              className="px-4 py-2 rounded-lg bg-[var(--cr-accent)] text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              Try again
            </button>
            <button
              onClick={() => router.push(dashboardPathFor(getStoredRole()))}
              className="px-4 py-2 rounded-lg bg-[var(--cr-surface-2)] text-[var(--cr-text)] text-sm hover:bg-[var(--cr-surface-3)] transition-colors"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cr-root min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-red-400 font-medium mb-2">Couldn&apos;t join class</p>
          <p className="text-[var(--cr-text-muted)] text-sm">{error}</p>
          <button
            onClick={() => router.push(adminObserve ? '/admin/classes' : dashboardPathFor(getStoredRole()))}
            className="mt-5 px-4 py-2 rounded-lg bg-[var(--cr-surface-2)] text-[var(--cr-text)] text-sm hover:bg-[var(--cr-surface-3)] transition-colors"
          >
            {adminObserve ? 'Back to classes' : 'Back to dashboard'}
          </button>
        </div>
      </div>
    );
  }

  if (!join) {
    return (
      <div className="cr-root min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-2 border-[var(--cr-accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--cr-text-muted)] text-sm">Connecting to classroom…</p>
      </div>
    );
  }

  const role = getStoredRole();
  const roleLabel = role === 'TEACHER' ? 'Teacher' : 'Student';
  const sessionTitle = demo
    ? 'Lumexa Demo Classroom (QA)'
    : lessonData?.lesson?.title
      ? lessonData.lesson.title
      : lessonData
        ? `${lessonData.session.courseTitle} · Session ${lessonData.session.lessonNumber}`
        : 'Lumexa 1:1 Session';
  const sessionSubtitle = lessonData
    ? `${lessonData.session.courseTitle}${lessonData.lesson?.title ? ` · Session ${lessonData.session.lessonNumber}` : ''}${join.batchName ? ` · ${join.batchName}` : ''}`
    : join.batchName
      ? `Batch · ${join.batchName}`
      : undefined;

  if (!adminObserve && !choices) {
    return (
      <PreJoinScreen
        sessionTitle={sessionTitle}
        sessionSubtitle={sessionSubtitle}
        isLive
        roleLabel={roleLabel}
        onJoin={handleJoinChoices}
      />
    );
  }

  return (
    <LiveKitRoom
      token={join.token}
      serverUrl={join.url}
      connect
      video={adminObserve ? false : choices!.videoEnabled}
      audio={adminObserve ? false : choices!.audioEnabled}
      options={{
        videoCaptureDefaults: !adminObserve && choices!.videoDeviceId ? { deviceId: choices!.videoDeviceId } : undefined,
        audioCaptureDefaults: !adminObserve && choices!.audioDeviceId ? { deviceId: choices!.audioDeviceId } : undefined,
      }}
      data-lk-theme="default"
      style={{ height: '100vh' }}
      onDisconnected={handleDisconnect}
    >
      <PeopleProvider>
        <ClassroomRoom
          roomName={join.roomName}
          sessionTitle={adminObserve ? `${sessionTitle} (Observing)` : sessionTitle}
          sessionSubtitle={sessionSubtitle}
          isLive
          lessonData={lessonData}
          demoExampleLesson={demoExampleLesson}
          initialBackgroundEffect={choices?.backgroundEffect ?? { mode: 'none' }}
          initialLighting={choices?.lighting ?? DEFAULT_LIGHTING}
          scheduledStart={join.scheduledStart}
          classType={join.classType}
          initialRoomLocked={join.roomLocked}
          partialCompletionAvailable={join.partialCompletionAvailable}
          observerMode={adminObserve}
          demo={demo}
        />
      </PeopleProvider>
    </LiveKitRoom>
  );
}

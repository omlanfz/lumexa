// FILE PATH: client/components/classroom/ClassroomExperience.tsx
//
// Top-level classroom flow: fetch a LiveKit join token, show the pre-join
// screen, then connect and hand off to ClassroomRoom. Also fetches lesson
// material up front (curriculum flow only) so both the pre-join session
// info and the in-room LessonPanel have it immediately.
//
// Two special join paths besides the normal one:
//   - waitingForAdmission: the server refused a token because this
//     participant was previously removed from the room (see
//     AdmissionService) — show a waiting screen and poll until the teacher
//     Admits or Denies.
//   - adminObserve: an admin joining a live class from /admin/classes as a
//     silent, non-publishing observer (see ClassroomService.
//     adminJoinLiveClass) — skips the pre-join device screen entirely,
//     since there's nothing to configure.

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';
import PreJoinScreen, { JoinChoices } from './PreJoinScreen';
import ClassroomRoom from './ClassroomRoom';
import type { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';

interface ClassroomExperienceProps {
  id: string;
  isLesson: boolean;
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
}

interface WaitingResponse {
  waitingForAdmission: true;
  admissionId: string;
  roomName: string;
}

function dashboardPathFor(role: string | null): string {
  if (role === 'STUDENT') return '/student-dashboard';
  if (role === 'TEACHER') return '/teacher-dashboard';
  return '/dashboard';
}

export default function ClassroomExperience({ id, isLesson, demo, adminObserve }: ClassroomExperienceProps) {
  const router = useRouter();
  const [join, setJoin] = useState<JoinResponse | null>(null);
  const [waiting, setWaiting] = useState<WaitingResponse | null>(null);
  const [denied, setDenied] = useState(false);
  const [lessonData, setLessonData] = useState<LessonDetailsResponse | null>(null);
  const [error, setError] = useState('');
  const [choices, setChoices] = useState<JoinChoices | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const attemptJoin = async () => {
    try {
      const path = adminObserve
        ? `/admin/classes/${isLesson ? 'LESSON' : 'BOOKING'}/${id}/join`
        : demo
          ? '/classroom/join-demo'
          : '/classroom/join';
      const body = adminObserve || demo ? {} : isLesson ? { scheduledLessonId: id } : { bookingId: id };
      const res = await api.post<JoinResponse | WaitingResponse>(path, body);
      if ('waitingForAdmission' in res.data) {
        setWaiting(res.data);
      } else {
        setWaiting(null);
        setJoin(res.data);
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

    if (isLesson && !demo && !adminObserve) {
      api
        .get<LessonDetailsResponse>(`/curriculum/scheduled-lessons/${id}/details`)
        .then((res) => setLessonData(res.data))
        .catch(() => setLessonData(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLesson, demo, adminObserve, router]);

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
    ? `${lessonData.session.courseTitle}${lessonData.lesson?.title ? ` · Session ${lessonData.session.lessonNumber}` : ''}`
    : undefined;

  if (!adminObserve && !choices) {
    return (
      <PreJoinScreen
        sessionTitle={sessionTitle}
        sessionSubtitle={sessionSubtitle}
        isLive
        roleLabel={roleLabel}
        onJoin={setChoices}
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
      <ClassroomRoom
        roomName={join.roomName}
        sessionTitle={adminObserve ? `${sessionTitle} (Observing)` : sessionTitle}
        sessionSubtitle={sessionSubtitle}
        isLive
        lessonData={lessonData}
        initialBackgroundEffect={choices?.backgroundEffect ?? { mode: 'none' }}
        initialLighting={choices?.lighting ?? { brightness: 1, contrast: 1 }}
      />
    </LiveKitRoom>
  );
}

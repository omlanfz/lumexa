// FILE PATH: client/components/classroom/ClassroomExperience.tsx
//
// Top-level classroom flow: fetch a LiveKit join token, show the pre-join
// screen, then connect and hand off to ClassroomRoom. Also fetches lesson
// material up front (curriculum flow only) so both the pre-join session
// info and the in-room LessonPanel have it immediately.

'use client';

import { useEffect, useState } from 'react';
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
}

interface JoinResponse {
  token: string;
  url: string;
  roomName: string;
}

function dashboardPathFor(role: string | null): string {
  if (role === 'STUDENT') return '/student-dashboard';
  if (role === 'TEACHER') return '/teacher-dashboard';
  return '/dashboard';
}

export default function ClassroomExperience({ id, isLesson, demo }: ClassroomExperienceProps) {
  const router = useRouter();
  const [join, setJoin] = useState<JoinResponse | null>(null);
  const [lessonData, setLessonData] = useState<LessonDetailsResponse | null>(null);
  const [error, setError] = useState('');
  const [choices, setChoices] = useState<JoinChoices | null>(null);

  useEffect(() => {
    const authToken = getStoredToken();
    if (!authToken) {
      router.push('/login');
      return;
    }

    (async () => {
      try {
        const res = await api.post<JoinResponse>(
          demo ? '/classroom/join-demo' : '/classroom/join',
          demo ? {} : isLesson ? { scheduledLessonId: id } : { bookingId: id },
        );
        setJoin(res.data);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        setError(e.response?.data?.message ?? 'Could not connect to the classroom. Please try again.');
      }
    })();

    if (isLesson && !demo) {
      api
        .get<LessonDetailsResponse>(`/curriculum/scheduled-lessons/${id}/details`)
        .then((res) => setLessonData(res.data))
        .catch(() => setLessonData(null));
    }
  }, [id, isLesson, demo, router]);

  const handleDisconnect = () => {
    router.push(dashboardPathFor(getStoredRole()));
  };

  if (error) {
    return (
      <div className="cr-root min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-red-400 font-medium mb-2">Couldn&apos;t join class</p>
          <p className="text-[var(--cr-text-muted)] text-sm">{error}</p>
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

  if (!choices) {
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
      video={choices.videoEnabled}
      audio={choices.audioEnabled}
      options={{
        videoCaptureDefaults: choices.videoDeviceId ? { deviceId: choices.videoDeviceId } : undefined,
        audioCaptureDefaults: choices.audioDeviceId ? { deviceId: choices.audioDeviceId } : undefined,
      }}
      data-lk-theme="default"
      style={{ height: '100vh' }}
      onDisconnected={handleDisconnect}
    >
      <ClassroomRoom
        roomName={join.roomName}
        sessionTitle={sessionTitle}
        sessionSubtitle={sessionSubtitle}
        isLive
        lessonData={lessonData}
        initialBackgroundEffect={choices.backgroundEffect}
        initialLighting={choices.lighting}
      />
    </LiveKitRoom>
  );
}

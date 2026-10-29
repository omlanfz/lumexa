// FILE PATH: client/components/RoleShell.tsx
//
// The signed-in person's own navigation bar, for routes that live outside the
// three dashboard layouts (student-dashboard, (teacher), admin) — the lesson
// pages, curriculum browsing, the test page's monitor and so on. A route
// segment that wraps itself in <RoleShell> in its layout.tsx gets exactly the
// bar the dashboards show for that role (the same components, not a copy):
//
//   STUDENT  → StudentTopNav       TEACHER → TeacherTopNav       ADMIN → AdminTopNav
//
// It only adds the bar. The page keeps its own width, padding and background
// rules, so nothing on it changes, and the layouts that already render a bar
// (the dashboards) must not also use this one.
//
// The role comes from the stored login, like everywhere else on the client; the
// server still decides what each role may open — the bar is navigation, not
// access control. `hideFor` leaves a role without the bar on a route where it
// would get in the way (a student sitting a test).

'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import AdminTopNav from '@/components/AdminTopNav';
import StudentTopNav from '@/components/StudentTopNav';
import TeacherTopNav from '@/components/TeacherTopNav';
import PendingRecordingsBanner from '@/components/teacher/PendingRecordingsBanner';
import api from '@/lib/axios';
import { getStoredRole, parseStoredUser } from '@/lib/storage';

interface StudentProfile {
  fullName: string;
  spaceRank: string;
  rankIcon: string;
  avatarUrl: string | null;
  streakWeeks: number;
}

interface TeacherProfile {
  user: { fullName: string; avatarUrl?: string | null };
}

const subscribeNothing = () => () => {};

function StudentBar() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  useEffect(() => {
    let cancelled = false;
    api
      .get<StudentProfile>('/students/me')
      .then((res) => {
        if (!cancelled) setProfile(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // The bar's space is held while the profile loads so the page does not jump.
  if (!profile) return <div className="h-16 border-b border-black/10 dark:border-white/10" aria-hidden />;
  return (
    <StudentTopNav
      fullName={profile.fullName}
      spaceRank={profile.spaceRank}
      rankIcon={profile.rankIcon}
      streakWeeks={profile.streakWeeks}
      avatarUrl={profile.avatarUrl}
    />
  );
}

function TeacherBar() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  useEffect(() => {
    let cancelled = false;
    api
      .get<TeacherProfile>('/teachers/me/profile')
      .then((res) => {
        if (!cancelled) setProfile(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <TeacherTopNav
        teacherName={profile?.user?.fullName ?? 'Teacher'}
        avatarUrl={profile?.user?.avatarUrl ?? null}
      />
      <PendingRecordingsBanner />
    </>
  );
}

export default function RoleShell({
  children,
  hideFor = [],
}: {
  children: ReactNode;
  /** Roles that get the page without the bar. */
  hideFor?: string[];
}) {
  // localStorage is only readable in the browser: `undefined` on the server and
  // during hydration, then the stored role, so both renders agree.
  const role = useSyncExternalStore(
    subscribeNothing,
    () => getStoredRole(),
    () => undefined,
  );

  const showBar = role && !hideFor.includes(role);

  return (
    <>
      {showBar && role === 'STUDENT' && <StudentBar />}
      {showBar && role === 'TEACHER' && <TeacherBar />}
      {showBar && role === 'ADMIN' && <AdminTopNav adminName={parseStoredUser()?.fullName ?? 'Admin'} />}
      {children}
    </>
  );
}

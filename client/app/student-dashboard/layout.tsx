'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentTopNav from '@/components/StudentTopNav';
import LumiChat from '@/components/LumiChat';
import api from '@/lib/axios';
import { parseStoredUser, getStoredToken } from '@/lib/storage';

interface StudentProfile {
  id: string;
  fullName: string;
  spaceRank: string;
  rankIcon: string;
  avatarUrl: string | null;
  totalSessions: number;
  streakWeeks: number;
}

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    const user = parseStoredUser();

    if (!token || !user) {
      router.push('/login');
      return;
    }

    const r = user.role ?? null;
    setRole(r);

    if (r !== 'STUDENT') {
      // Non-student (teacher/parent proxy [studentId] pages) — render children as-is
      setChecked(true);
      return;
    }

    api
      .get<StudentProfile>('/students/me')
      .then((res) => {
        setProfile(res.data);
        setChecked(true);
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400" />
      </div>
    );
  }

  // Non-student role (parent/teacher proxy pages) — no student chrome
  if (role !== 'STUDENT') {
    return <>{children}</>;
  }

  // Student-auth layout: top nav + main content + LumiChat
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/40 via-white to-white dark:from-black dark:via-black dark:to-black">
      <StudentTopNav
        fullName={profile!.fullName}
        spaceRank={profile!.spaceRank}
        rankIcon={profile!.rankIcon}
        streakWeeks={profile!.streakWeeks}
        avatarUrl={profile!.avatarUrl}
      />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-16">
        {children}
      </main>
      <LumiChat
        variant="student"
        context="Student dashboard — personal learning hub, rank progress, sessions, and achievements"
      />
    </div>
  );
}

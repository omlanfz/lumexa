'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentNav from '@/components/StudentNav';
import LumiChat from '@/components/LumiChat';
import api from '@/lib/axios';
import { parseStoredUser, getStoredToken } from '@/lib/storage';

interface StudentProfile {
  id: string;
  fullName: string;
  spaceRank: string;
  rankIcon: string;
  gemBalance: number;
  avatarUrl: string | null;
  totalSessions: number;
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
  // Read initial collapse state from localStorage so margin is correct on first render
  const [navCollapsed, setNavCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lumexa_student_nav_collapsed') === 'true';
    }
    return false;
  });

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400" />
      </div>
    );
  }

  // Non-student role (parent/teacher proxy pages) — no student chrome
  if (role !== 'STUDENT') {
    return <>{children}</>;
  }

  // Student-auth layout: StudentNav sidebar + main content + LumiChat
  return (
    <div className="min-h-screen bg-black">
      <StudentNav
        fullName={profile!.fullName}
        spaceRank={profile!.spaceRank}
        rankIcon={profile!.rankIcon}
        gemBalance={profile!.gemBalance}
        avatarUrl={profile!.avatarUrl}
        totalSessions={profile!.totalSessions}
        onCollapseChange={setNavCollapsed}
      />
      <main
        className={`min-h-screen transition-all duration-300 ${
          navCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        } px-4 sm:px-6 pt-16 lg:pt-6 pb-12`}
      >
        {children}
      </main>
      <LumiChat
        variant="student"
        context="Student dashboard — personal learning hub, rank progress, sessions, and achievements"
      />
    </div>
  );
}

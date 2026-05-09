'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import StudentNav from '@/components/StudentNav';
import api from '@/lib/axios';

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
  const pathname = usePathname();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');

    if (!token || !rawUser) {
      router.push('/student/login');
      return;
    }

    const user = JSON.parse(rawUser) as { role?: string };
    const r = user.role ?? null;
    setRole(r);

    if (r !== 'STUDENT') {
      // Non-student accessing student-dashboard routes (e.g. parent proxy [studentId])
      // Just render children — those pages handle their own auth + sidebar
      setChecked(true);
      return;
    }

    const saved = localStorage.getItem('lumexa_student_nav_collapsed');
    if (saved === 'true') setNavCollapsed(true);

    api
      .get<StudentProfile>('/students/me')
      .then((res) => {
        setProfile(res.data);
        setChecked(true);
      })
      .catch(() => {
        router.push('/student/login');
      });
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400" />
      </div>
    );
  }

  // Non-student role (parent proxy pages) — render children without student chrome
  if (role !== 'STUDENT') {
    return <>{children}</>;
  }

  // Student-auth layout — StudentNav + content
  return (
    <div className="min-h-screen bg-black">
      <StudentNav
        fullName={profile!.fullName}
        spaceRank={profile!.spaceRank}
        rankIcon={profile!.rankIcon}
        gemBalance={profile!.gemBalance}
        avatarUrl={profile!.avatarUrl}
        totalSessions={profile!.totalSessions}
      />
      <main
        className={`min-h-screen transition-all duration-300 ${
          navCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        } px-4 sm:px-6 pt-16 lg:pt-0 pb-12`}
      >
        {children}
      </main>
    </div>
  );
}

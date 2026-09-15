'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import TeacherTopNav from '@/components/TeacherTopNav';
import api from '@/lib/axios';
import { parseStoredUser, getStoredToken } from '@/lib/storage';

interface TeacherProfile {
  user: { fullName: string; avatarUrl?: string | null };
}

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    const user = parseStoredUser();

    if (!token || !user) {
      router.push('/login');
      return;
    }

    api
      .get<TeacherProfile>('/teachers/me/profile')
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
      <div className="min-h-screen bg-[var(--t-bg)] flex items-center justify-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--t-accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--t-bg)] transition-colors duration-300">
      <TeacherTopNav
        teacherName={profile?.user?.fullName ?? 'Teacher'}
        avatarUrl={profile?.user?.avatarUrl ?? null}
      />
      <main className="max-w-[1600px] mx-auto">
        {/* Keyed by route so each page transitions in smoothly on navigation */}
        <div key={pathname} className="fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

// FILE PATH: client/components/TeacherLayout.tsx
"use client";
// CHANGE: New layout wrapper — ensures content fills all remaining width
// Usage: wrap every teacher page's root div with <TeacherLayout>

import { ReactNode } from "react";
import TeacherNav from "./TeacherNav";

interface TeacherLayoutProps {
  teacherName: string;
  avatarUrl?: string | null;
  rankTier?: number;
  onAvatarUpdate?: (url: string) => void;
  children: ReactNode;
}

export default function TeacherLayout({
  teacherName,
  avatarUrl,
  rankTier,
  onAvatarUpdate,
  children,
}: TeacherLayoutProps) {
  return (
    // CHANGE: flex row, overflow-x-hidden prevents horizontal scroll
    <div className="flex h-screen overflow-hidden dark:bg-[#0A0714] bg-gray-50">
      <TeacherNav
        teacherName={teacherName}
        avatarUrl={avatarUrl}
        rankTier={rankTier}
        onAvatarUpdate={onAvatarUpdate}
      />
      {/* CHANGE: min-w-0 is critical — prevents flex child from overflowing past sidebar */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

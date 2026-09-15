// FILE PATH: client/components/TeacherLayout.tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import TeacherTopNav from "./TeacherTopNav";

interface TeacherLayoutProps {
  teacherName: string;
  avatarUrl?: string | null;
  children: ReactNode;
}

export default function TeacherLayout({
  teacherName,
  avatarUrl,
  children,
}: TeacherLayoutProps) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[var(--t-bg)] transition-colors duration-300">
      <TeacherTopNav teacherName={teacherName} avatarUrl={avatarUrl} />
      <main className="max-w-[1600px] mx-auto">
        {/* Keyed by route so each page transitions in smoothly on navigation */}
        <div key={pathname} className="fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

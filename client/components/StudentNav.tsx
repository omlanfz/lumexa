// FILE PATH: client/components/StudentNav.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle, useTheme } from "./ThemeProvider";

interface StudentNavProps {
  studentId: string;
  studentName?: string;
  grade?: string | null;
  parentName?: string;
  isTeacherView?: boolean; // true when a teacher is viewing this student
  onExitTeacherView?: () => void;
}

export default function StudentNav({
  studentId,
  studentName = "Cadet",
  grade,
  parentName,
  isTeacherView = false,
  onExitTeacherView,
}: StudentNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark } = useTheme();

  const NAV_ITEMS = [
    {
      path: `/student-dashboard/${studentId}`,
      label: "Dashboard",
      sub: "Mission Hub",
      icon: "🌌",
    },
    {
      path: `/student-lessons/${studentId}`,
      label: "My Lessons",
      sub: "Mission Log",
      icon: "📚",
    },
    {
      path: `/student-progress/${studentId}`,
      label: "Progress",
      sub: "Star Chart",
      icon: "📊",
    },
    {
      path: `/student-leaderboard`,
      label: "Leaderboard",
      sub: "Galaxy Ranks",
      icon: "🏆",
    },
  ];

  const bgNav = isDark
    ? "bg-[#050D1A] border-blue-900/40"
    : "bg-[#F0F5FF] border-blue-200";
  const textPrimary = isDark ? "text-blue-100" : "text-blue-900";
  const textSub = isDark ? "text-blue-400" : "text-blue-400";
  const activeClass = isDark
    ? "bg-blue-600/20 text-blue-300 border-l-2 border-blue-500"
    : "bg-blue-100 text-blue-700 border-l-2 border-blue-500";
  const inactiveClass = isDark
    ? "text-blue-200/60 hover:bg-blue-900/20 hover:text-blue-200"
    : "text-blue-700/60 hover:bg-blue-50 hover:text-blue-700";

  return (
    <nav
      className={`fixed left-0 top-0 h-full w-64 flex flex-col z-40 border-r ${bgNav}`}
      style={{ transition: "background 0.3s, border-color 0.3s" }}
    >
      {/* Teacher view banner */}
      {isTeacherView && (
        <div className="bg-amber-500 px-4 py-2 flex items-center justify-between">
          <p className="text-black text-xs font-bold">👁️ TEACHER VIEW</p>
          <button
            onClick={onExitTeacherView}
            className="text-black text-xs underline hover:no-underline"
          >
            Exit
          </button>
        </div>
      )}

      {/* Logo */}
      <div
        className={`px-6 py-6 border-b ${isDark ? "border-blue-900/20" : "border-blue-200"}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            L
          </div>
          <div>
            <h1 className="text-lg font-bold text-blue-400 leading-none">
              Lumexa
            </h1>
            <p className={`text-xs leading-none mt-0.5 ${textSub}`}>
              Mission Control
            </p>
          </div>
        </div>
      </div>

      {/* Student profile section */}
      <div
        className={`px-4 py-4 border-b ${isDark ? "border-blue-900/20" : "border-blue-200"}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-sm border-2 border-blue-500/40">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium leading-tight truncate ${textPrimary}`}
            >
              {studentName}
            </p>
            <p className={`text-xs leading-tight ${textSub}`}>
              {grade ?? "Cadet"} {parentName ? `· ${parentName}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                active ? activeClass : inactiveClass
              }`}
            >
              <span className="text-base w-6 text-center flex-shrink-0">
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {item.label}
                </p>
                <p className={`text-xs leading-tight ${textSub}`}>{item.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Back to parent dashboard */}
      {!isTeacherView && (
        <div
          className={`px-3 pb-2 border-t ${isDark ? "border-blue-900/20" : "border-blue-200"} pt-2`}
        >
          <button
            onClick={() => router.push("/dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${inactiveClass}`}
          >
            <span className="text-base w-6 text-center">← </span>
            <div>
              <p className="text-sm font-medium leading-tight">My Dashboard</p>
              <p className={`text-xs leading-tight ${textSub}`}>Parent View</p>
            </div>
          </button>
        </div>
      )}

      {/* Bottom: Theme toggle */}
      <div
        className={`px-4 py-4 border-t ${isDark ? "border-blue-900/20" : "border-blue-200"}`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs ${textSub}`}>
            {isDark ? "🌌 Deep Space" : "☀️ Light Mode"}
          </span>
          <ThemeToggle variant="student" />
        </div>
        <p className={`text-xs mt-2 ${textSub} opacity-40`}>
          Lumexa v1.0 · Mission Control
        </p>
      </div>
    </nav>
  );
}

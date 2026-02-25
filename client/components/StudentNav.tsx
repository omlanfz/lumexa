// FILE PATH: client/components/StudentNav.tsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle, useTheme } from "./ThemeProvider";

export interface StudentNavProps {
  studentId: string;
  studentName?: string;
  grade?: string | null;
  parentName?: string;
  isTeacherView?: boolean;
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
  const NAV = [
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
  return (
    <nav className="fixed left-0 top-0 h-full w-64 flex flex-col z-40 border-r dark:bg-[#050D1A] bg-[#F0F5FF] dark:border-blue-900/40 border-blue-200">
      {isTeacherView && (
        <div className="bg-amber-500 px-4 py-2 flex items-center justify-between flex-shrink-0">
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
      <div className="px-6 py-5 border-b dark:border-blue-900/20 border-blue-200 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
          L
        </div>
        <div>
          <h1 className="text-lg font-bold text-blue-500 leading-none">
            Lumexa
          </h1>
          <p className="text-xs dark:text-blue-400/60 text-blue-400">
            Mission Control
          </p>
        </div>
      </div>
      {/* Student info */}
      <div className="px-4 py-4 border-b dark:border-blue-900/20 border-blue-200 flex-shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-sm border-2 border-blue-500/40 flex-shrink-0">
            {studentName[0]?.toUpperCase() ?? "C"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate dark:text-blue-100 text-blue-900">
              {studentName}
            </p>
            <p className="text-xs dark:text-blue-400/70 text-blue-500">
              {grade ?? "Cadet"}
              {parentName ? ` · ${parentName}` : ""}
            </p>
          </div>
        </div>
      </div>
      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={[
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                active
                  ? "dark:bg-blue-600/20 bg-blue-100 dark:text-blue-300 text-blue-700 border-l-2 border-blue-500"
                  : "dark:text-blue-200/60 text-blue-600/60 dark:hover:bg-blue-900/20 hover:bg-blue-50 dark:hover:text-blue-200 hover:text-blue-700",
              ].join(" ")}
            >
              <span className="text-base w-6 text-center flex-shrink-0">
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {item.label}
                </p>
                <p className="text-xs dark:text-blue-400/60 text-blue-400 leading-tight">
                  {item.sub}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      {!isTeacherView && (
        <div className="px-3 pt-2 pb-1 border-t dark:border-blue-900/20 border-blue-200">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left dark:text-blue-200/50 text-blue-500/70 dark:hover:bg-blue-900/20 hover:bg-blue-50 transition-colors"
          >
            <span className="text-sm w-6 text-center flex-shrink-0">←</span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">
                Parent Dashboard
              </p>
              <p className="text-xs dark:text-blue-400/50 text-blue-400">
                Commander View
              </p>
            </div>
          </button>
        </div>
      )}
      <div className="px-4 py-4 border-t dark:border-blue-900/20 border-blue-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs dark:text-blue-400/50 text-blue-400">
            {isDark ? "🌌 Deep Space" : "☀️ Light Mode"}
          </span>
          <ThemeToggle variant="student" />
        </div>
        <p className="text-xs mt-2 dark:text-blue-400/30 text-blue-300">
          Lumexa v1.0 · Mission Control
        </p>
      </div>
    </nav>
  );
}

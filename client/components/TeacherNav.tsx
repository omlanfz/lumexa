// FILE PATH: client/components/TeacherNav.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { ThemeToggle, useTheme } from "./ThemeProvider";

const NAV_ITEMS = [
  {
    path: "/teacher-dashboard",
    label: "Dashboard",
    sub: "Mission Control",
    icon: "🚀",
  },
  { path: "/calendar", label: "Schedule", sub: "Flight Log", icon: "📅" },
  {
    path: "/teacher-students",
    label: "My Students",
    sub: "Cadet Roster",
    icon: "👥",
  },
  {
    path: "/teacher-earnings",
    label: "Earnings",
    sub: "Reward Ledger",
    icon: "💰",
  },
  {
    path: "/teacher-profile",
    label: "Settings",
    sub: "Pilot Config",
    icon: "⚙️",
  },
  {
    path: "/leaderboard",
    label: "Leaderboard",
    sub: "Star Rankings",
    icon: "🏆",
  },
];

interface TeacherNavProps {
  teacherName?: string;
  avatarUrl?: string | null;
  rankTier?: number;
  onAvatarUpdate?: (url: string) => void;
}

const RANK_NAMES = [
  "Cadet",
  "Navigator",
  "Pilot",
  "Commander",
  "Admiral",
  "Starmaster",
];
const RANK_ICONS = ["🌱", "🧭", "✈️", "🎖️", "⭐", "🌟"];

export default function TeacherNav({
  teacherName = "Pilot",
  avatarUrl,
  rankTier = 0,
  onAvatarUpdate,
}: TeacherNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#profile-menu-wrapper")) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/uploads/avatar`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      onAvatarUpdate?.(res.data.avatarUrl);
    } catch (err) {
      console.error("Avatar upload failed", err);
    } finally {
      setUploading(false);
      setProfileMenuOpen(false);
    }
  };

  const openStudentModal = async () => {
    setProfileMenuOpen(false);
    setStudentModalOpen(true);
    setLoadingStudents(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/students`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setStudents(res.data);
    } catch {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const bgNav = isDark
    ? "bg-[#120A24] border-purple-900/40"
    : "bg-[#FAF5FF] border-purple-200";
  const textPrimary = isDark ? "text-purple-100" : "text-purple-900";
  const textSub = isDark ? "text-purple-400" : "text-purple-400";
  const activeClass = isDark
    ? "bg-purple-600/20 text-purple-300 border-l-2 border-purple-500"
    : "bg-purple-100 text-purple-700 border-l-2 border-purple-500";
  const inactiveClass = isDark
    ? "text-purple-200/60 hover:bg-purple-900/20 hover:text-purple-200"
    : "text-purple-700/60 hover:bg-purple-50 hover:text-purple-700";

  const avatarSrc = avatarUrl
    ? `${process.env.NEXT_PUBLIC_API_URL}${avatarUrl}`
    : null;

  return (
    <>
      <nav
        className={`fixed left-0 top-0 h-full w-64 flex flex-col z-40 border-r ${bgNav}`}
        style={{ transition: "background 0.3s, border-color 0.3s" }}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-purple-900/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
              L
            </div>
            <div>
              <h1 className="text-lg font-bold text-purple-400 leading-none">
                Lumexa
              </h1>
              <p className={`text-xs leading-none mt-0.5 ${textSub}`}>
                Flight Deck
              </p>
            </div>
          </div>
        </div>

        {/* Profile section */}
        <div className="px-4 py-4 border-b border-purple-900/20">
          <div id="profile-menu-wrapper" className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${inactiveClass}`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={teacherName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/40"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center text-white font-bold text-sm border-2 border-purple-500/40">
                    {teacherName.charAt(0).toUpperCase()}
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-left min-w-0">
                <p
                  className={`text-sm font-medium leading-tight truncate ${textPrimary}`}
                >
                  {teacherName}
                </p>
                <p className={`text-xs leading-tight ${textSub}`}>
                  {RANK_ICONS[rankTier]} {RANK_NAMES[rankTier]}
                </p>
              </div>
              <span className={`text-xs ${textSub}`}>▾</span>
            </button>

            {/* Dropdown menu */}
            {profileMenuOpen && (
              <div
                className={`absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-xl z-50 overflow-hidden ${
                  isDark
                    ? "bg-[#1C0F38] border-purple-800/40 shadow-purple-900/30"
                    : "bg-white border-purple-200 shadow-purple-100"
                }`}
              >
                <button
                  onClick={openStudentModal}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors text-left ${
                    isDark
                      ? "text-purple-200 hover:bg-purple-900/30"
                      : "text-purple-800 hover:bg-purple-50"
                  }`}
                >
                  <span>👁️</span> View as Student
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setProfileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors text-left ${
                    isDark
                      ? "text-purple-200 hover:bg-purple-900/30"
                      : "text-purple-800 hover:bg-purple-50"
                  }`}
                >
                  <span>📷</span> Upload Photo
                </button>
                <button
                  onClick={() => {
                    router.push("/teacher-profile");
                    setProfileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors text-left ${
                    isDark
                      ? "text-purple-200 hover:bg-purple-900/30"
                      : "text-purple-800 hover:bg-purple-50"
                  }`}
                >
                  <span>🔑</span> Reset Password
                </button>
                <div
                  className={`border-t ${isDark ? "border-purple-800/30" : "border-purple-100"}`}
                />
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors text-left ${
                    isDark
                      ? "text-red-400 hover:bg-red-900/20"
                      : "text-red-600 hover:bg-red-50"
                  }`}
                >
                  <span>🚪</span> Log Out
                  <span
                    className={`text-xs ml-1 ${isDark ? "text-red-500/60" : "text-red-400"}`}
                  >
                    Abort Mission
                  </span>
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
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
                  <p
                    className={`text-sm font-medium leading-tight ${active ? "" : ""}`}
                  >
                    {item.label}
                  </p>
                  <p className={`text-xs leading-tight ${textSub}`}>
                    {item.sub}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom: Theme toggle + version */}
        <div
          className={`px-4 py-4 border-t ${isDark ? "border-purple-900/20" : "border-purple-200"}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs ${textSub}`}>
              {isDark ? "🌌 Dark Space" : "☀️ Light Mode"}
            </span>
            <ThemeToggle variant="teacher" />
          </div>
          <p className={`text-xs mt-2 ${textSub} opacity-40`}>
            Lumexa v1.0 · Flight Deck
          </p>
        </div>
      </nav>

      {/* Student selection modal */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setStudentModalOpen(false)}
          />
          <div
            className={`relative w-full max-w-md rounded-2xl border shadow-2xl z-10 ${
              isDark
                ? "bg-[#1C0F38] border-purple-800/40"
                : "bg-white border-purple-200"
            }`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2
                    className={`text-lg font-bold ${isDark ? "text-purple-100" : "text-purple-900"}`}
                  >
                    View as Student
                  </h2>
                  <p className={`text-sm ${textSub}`}>
                    Select a cadet to view their dashboard
                  </p>
                </div>
                <button
                  onClick={() => setStudentModalOpen(false)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isDark
                      ? "text-purple-400 hover:bg-purple-900/30"
                      : "text-purple-600 hover:bg-purple-50"
                  }`}
                >
                  ✕
                </button>
              </div>

              {loadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : students.length === 0 ? (
                <p className={`text-center py-8 text-sm ${textSub}`}>
                  No students with completed bookings yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {students.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setStudentModalOpen(false);
                        router.push(`/student-view/${s.id}`);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                        isDark
                          ? "hover:bg-purple-900/30 border border-purple-800/20"
                          : "hover:bg-purple-50 border border-purple-100"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                      >
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p
                          className={`font-medium text-sm ${isDark ? "text-purple-100" : "text-purple-900"}`}
                        >
                          {s.name}
                        </p>
                        <p className={`text-xs ${textSub}`}>
                          Age {s.age} · {s.totalClasses} classes
                          {s.lastClass
                            ? ` · Last: ${new Date(s.lastClass).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                      <span className={`ml-auto text-sm ${textSub}`}>→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

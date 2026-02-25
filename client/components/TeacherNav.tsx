// FILE PATH: client/components/TeacherNav.tsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { ThemeToggle, useTheme } from "./ThemeProvider";

const NAV = [
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
const RANK_NAMES = [
  "Cadet",
  "Navigator",
  "Pilot",
  "Commander",
  "Admiral",
  "Starmaster",
];
const RANK_ICONS = ["🌱", "🧭", "✈️", "🎖️", "⭐", "🌟"];

export interface TeacherNavProps {
  teacherName?: string;
  avatarUrl?: string | null;
  rankTier?: number;
  onAvatarUpdate?: (u: string) => void;
}

export default function TeacherNav({
  teacherName = "Pilot",
  avatarUrl,
  rankTier = 0,
  onAvatarUpdate,
}: TeacherNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStu, setLoadingStu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setUploadErr("Images only");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setUploadErr("Max 5 MB");
      return;
    }
    setUploading(true);
    setUploadErr(null);
    setMenuOpen(false);
    try {
      const fd = new FormData();
      fd.append("avatar", f);
      const tok = localStorage.getItem("token");
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/uploads/avatar`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${tok}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      onAvatarUpdate?.(res.data.avatarUrl);
    } catch {
      setUploadErr("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openModal = async () => {
    setMenuOpen(false);
    setModalOpen(true);
    setLoadingStu(true);
    try {
      const tok = localStorage.getItem("token");
      const r = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/students`,
        { headers: { Authorization: `Bearer ${tok}` } },
      );
      setStudents(Array.isArray(r.data) ? r.data : []);
    } catch {
      setStudents([]);
    } finally {
      setLoadingStu(false);
    }
  };

  const avatarSrc = avatarUrl
    ? `${process.env.NEXT_PUBLIC_API_URL}${avatarUrl}`
    : null;

  return (
    <>
      <nav className="fixed left-0 top-0 h-full w-64 flex flex-col z-40 border-r dark:bg-[#120A24] bg-[#FAF5FF] dark:border-purple-900/40 border-purple-200">
        {/* Logo */}
        <div className="px-6 py-5 border-b dark:border-purple-900/20 border-purple-200 flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
            L
          </div>
          <div>
            <h1 className="text-lg font-bold text-purple-500 leading-none">
              Lumexa
            </h1>
            <p className="text-xs dark:text-purple-400/60 text-purple-400">
              Flight Deck
            </p>
          </div>
        </div>

        {/* Profile */}
        <div className="px-4 py-4 border-b dark:border-purple-900/20 border-purple-200 flex-shrink-0">
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-xl dark:hover:bg-purple-900/20 hover:bg-purple-50 transition-colors text-left"
            >
              <div className="relative flex-shrink-0">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={teacherName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/40"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center text-white font-bold text-sm border-2 border-purple-500/40">
                    {teacherName[0]?.toUpperCase() ?? "P"}
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate dark:text-purple-100 text-purple-900">
                  {teacherName}
                </p>
                <p className="text-xs dark:text-purple-400/70 text-purple-500">
                  {RANK_ICONS[rankTier]} {RANK_NAMES[rankTier]}
                </p>
              </div>
              <span className="text-xs dark:text-purple-400/40 text-purple-400">
                ▾
              </span>
            </button>
            {menuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-xl z-50 overflow-hidden dark:bg-[#1C0F38] bg-white dark:border-purple-800/40 border-purple-200">
                <button
                  onClick={openModal}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left dark:text-purple-200 text-purple-800 dark:hover:bg-purple-900/30 hover:bg-purple-50 transition-colors"
                >
                  <span>👁️</span>
                  <span>View as Student</span>
                  <span className="ml-auto text-xs dark:text-purple-500 text-purple-400">
                    Cadet View
                  </span>
                </button>
                <button
                  onClick={() => {
                    fileRef.current?.click();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left dark:text-purple-200 text-purple-800 dark:hover:bg-purple-900/30 hover:bg-purple-50 transition-colors"
                >
                  <span>📷</span>
                  <span>Upload Photo</span>
                </button>
                <button
                  onClick={() => {
                    router.push("/teacher-profile");
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left dark:text-purple-200 text-purple-800 dark:hover:bg-purple-900/30 hover:bg-purple-50 transition-colors"
                >
                  <span>⚙️</span>
                  <span>Account Settings</span>
                </button>
                <div className="border-t dark:border-purple-800/30 border-purple-100" />
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    window.location.href = "/login";
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left dark:text-red-400 text-red-600 dark:hover:bg-red-900/20 hover:bg-red-50 transition-colors"
                >
                  <span>🚪</span>
                  <span>Log Out</span>
                  <span className="ml-1 text-xs opacity-60">Abort Mission</span>
                </button>
              </div>
            )}
          </div>
          {uploadErr && (
            <p className="mt-1.5 text-xs text-red-400 px-1">{uploadErr}</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={uploadAvatar}
          />
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.path || pathname.startsWith(item.path + "/");
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                  active
                    ? "dark:bg-purple-600/20 bg-purple-100 dark:text-purple-300 text-purple-700 border-l-2 border-purple-500"
                    : "dark:text-purple-200/60 text-purple-600/60 dark:hover:bg-purple-900/20 hover:bg-purple-50 dark:hover:text-purple-200 hover:text-purple-700",
                ].join(" ")}
              >
                <span className="text-base w-6 text-center flex-shrink-0">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {item.label}
                  </p>
                  <p className="text-xs dark:text-purple-400/60 text-purple-400 leading-tight">
                    {item.sub}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom */}
        <div className="px-4 py-4 border-t dark:border-purple-900/20 border-purple-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs dark:text-purple-400/50 text-purple-400">
              {isDark ? "🌌 Dark Space" : "☀️ Light Mode"}
            </span>
            <ThemeToggle variant="teacher" />
          </div>
          <p className="text-xs mt-2 dark:text-purple-400/30 text-purple-300">
            Lumexa v1.0 · Flight Deck
          </p>
        </div>
      </nav>

      {/* Student modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border shadow-2xl z-10 dark:bg-[#1C0F38] bg-white dark:border-purple-800/40 border-purple-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold dark:text-purple-100 text-purple-900">
                    View as Student
                  </h2>
                  <p className="text-sm dark:text-purple-400/60 text-purple-400 mt-0.5">
                    Select a cadet to view their dashboard
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center dark:text-purple-400 text-purple-500 dark:hover:bg-purple-900/30 hover:bg-purple-50"
                >
                  ✕
                </button>
              </div>
              {loadingStu ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-4xl">🌌</p>
                  <p className="text-sm dark:text-purple-300/60 text-purple-500 mt-3">
                    No students yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {students.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setModalOpen(false);
                        router.push(`/student-view/${s.id}`);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border dark:border-purple-800/20 border-purple-100 dark:hover:bg-purple-900/20 hover:bg-purple-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {s.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm dark:text-purple-100 text-purple-900">
                          {s.name}
                        </p>
                        <p className="text-xs dark:text-purple-400/60 text-purple-400">
                          Age {s.age}
                          {s.totalClasses != null
                            ? ` · ${s.totalClasses} classes`
                            : ""}
                        </p>
                      </div>
                      <span className="dark:text-purple-400/50 text-purple-300">
                        →
                      </span>
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

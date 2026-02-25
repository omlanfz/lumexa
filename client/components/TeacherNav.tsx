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

// "use client";

// import { useState, useEffect, useRef } from "react";
// import { useRouter, usePathname } from "next/navigation";
// import Link from "next/link";
// import { useTheme } from "./ThemeProvider";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface TeacherProfile {
//   fullName: string;
//   email: string;
//   avatarUrl?: string | null;
//   ratingAvg: number;
//   isSuspended: boolean;
// }

// interface StudentItem {
//   studentId: string;
//   studentName: string;
//   studentAge: number;
// }

// // ─── Nav items ────────────────────────────────────────────────────────────────

// const NAV_ITEMS = [
//   {
//     href: "/teacher-dashboard",
//     label: "Dashboard",
//     sublabel: "Mission Control",
//     icon: "🛸",
//   },
//   {
//     href: "/teacher-students",
//     label: "My Students",
//     sublabel: "Cadet Roster",
//     icon: "👨‍🚀",
//   },
//   {
//     href: "/calendar",
//     label: "Calendar",
//     sublabel: "Flight Schedule",
//     icon: "📅",
//   },
//   {
//     href: "/teacher-earnings",
//     label: "Earnings",
//     sublabel: "Mission Rewards",
//     icon: "💰",
//   },
//   {
//     href: "/teacher-profile",
//     label: "Profile",
//     sublabel: "Pilot File",
//     icon: "🪐",
//   },
// ];

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function TeacherNav() {
//   const router = useRouter();
//   const pathname = usePathname();
//   const { theme, toggle } = useTheme();

//   const [profile, setProfile] = useState<TeacherProfile | null>(null);
//   const [students, setStudents] = useState<StudentItem[]>([]);
//   const [dropdownOpen, setDropdownOpen] = useState(false);
//   const [studentModalOpen, setStudentModalOpen] = useState(false);

//   const dropdownRef = useRef<HTMLDivElement>(null);

//   const token =
//     typeof window !== "undefined" ? localStorage.getItem("token") : null;
//   const headers = { Authorization: `Bearer ${token}` };
//   const API = process.env.NEXT_PUBLIC_API_URL;

//   useEffect(() => {
//     if (!token) return;
//     fetch(`${API}/teachers/me/profile`, {
//       headers: { Authorization: `Bearer ${token}` },
//     })
//       .then((r) => r.json())
//       .then((d) => setProfile(d))
//       .catch(() => {});
//   }, []);

//   // Close dropdown on outside click
//   useEffect(() => {
//     function handleClick(e: MouseEvent) {
//       if (
//         dropdownRef.current &&
//         !dropdownRef.current.contains(e.target as Node)
//       ) {
//         setDropdownOpen(false);
//       }
//     }
//     document.addEventListener("mousedown", handleClick);
//     return () => document.removeEventListener("mousedown", handleClick);
//   }, []);

//   const handleLoginAsStudent = async () => {
//     setDropdownOpen(false);
//     if (!token) return;
//     try {
//       const res = await fetch(`${API}/teachers/me/students`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       setStudents(data ?? []);
//       setStudentModalOpen(true);
//     } catch {
//       router.push("/teacher-students");
//     }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     router.push("/login");
//   };

//   const handleUploadAvatar = () => {
//     setDropdownOpen(false);
//     // Trigger file picker
//     const input = document.createElement("input");
//     input.type = "file";
//     input.accept = "image/jpeg,image/png,image/webp";
//     input.onchange = async () => {
//       const file = input.files?.[0];
//       if (!file || !token) return;
//       const form = new FormData();
//       form.append("avatar", file);
//       try {
//         const res = await fetch(`${API}/uploads/avatar`, {
//           method: "POST",
//           headers: { Authorization: `Bearer ${token}` },
//           body: form,
//         });
//         const data = await res.json();
//         if (data.avatarUrl) {
//           setProfile((p) => (p ? { ...p, avatarUrl: data.avatarUrl } : p));
//         }
//       } catch {}
//     };
//     input.click();
//   };

//   const initials = profile?.fullName
//     ?.split(" ")
//     .map((p) => p[0])
//     .join("")
//     .toUpperCase()
//     .slice(0, 2);

//   return (
//     <>
//       {/* ── Sidebar ──────────────────────────────────────────────────────── */}
//       <aside className="fixed top-0 left-0 h-screen w-64 flex flex-col z-40 teacher-bg border-r border-gray-800">
//         {/* Logo */}
//         <div className="px-6 py-5 border-b border-gray-800 flex items-center gap-3">
//           <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-black text-sm">
//             L
//           </div>
//           <div>
//             <p className="text-white font-bold text-sm tracking-wider">
//               LUMEXA
//             </p>
//             <p className="text-purple-400 text-[10px] uppercase tracking-widest">
//               Pilot Mode
//             </p>
//           </div>
//         </div>

//         {/* Nav links */}
//         <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
//           {NAV_ITEMS.map(({ href, label, sublabel, icon }) => {
//             const active =
//               pathname === href || pathname?.startsWith(href + "/");
//             return (
//               <Link
//                 key={href}
//                 href={href}
//                 className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-all ${
//                   active
//                     ? "bg-purple-900/60 border border-purple-700/50"
//                     : "hover:bg-gray-800/50"
//                 }`}
//               >
//                 <span className="text-lg">{icon}</span>
//                 <div className="min-w-0">
//                   <p
//                     className={`text-sm font-medium ${
//                       active
//                         ? "text-purple-300"
//                         : "text-gray-300 group-hover:text-white"
//                     }`}
//                   >
//                     {label}
//                   </p>
//                   <p className="text-[10px] text-gray-600 truncate">
//                     {sublabel}
//                   </p>
//                 </div>
//                 {active && (
//                   <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />
//                 )}
//               </Link>
//             );
//           })}
//         </nav>

//         {/* Bottom: theme toggle + profile */}
//         <div className="border-t border-gray-800 p-3 space-y-2">
//           {/* Theme toggle */}
//           <button
//             onClick={toggle}
//             className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all"
//           >
//             <span className="text-lg">{theme === "dark" ? "☀️" : "🌙"}</span>
//             <span className="text-xs text-gray-400">
//               {theme === "dark" ? "Light Mode" : "Dark Mode"}
//             </span>
//           </button>

//           {/* Profile dropdown trigger */}
//           <div ref={dropdownRef} className="relative">
//             <button
//               onClick={() => setDropdownOpen((v) => !v)}
//               className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all"
//             >
//               {/* Avatar */}
//               <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
//                 {profile?.avatarUrl ? (
//                   <img
//                     src={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? ""}${profile.avatarUrl}`}
//                     alt="avatar"
//                     className="w-full h-full object-cover"
//                   />
//                 ) : (
//                   <div className="w-full h-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold">
//                     {initials ?? "?"}
//                   </div>
//                 )}
//               </div>
//               <div className="flex-1 min-w-0 text-left">
//                 <p className="text-xs font-medium text-gray-200 truncate">
//                   {profile?.fullName ?? "Teacher"}
//                 </p>
//                 <p className="text-[10px] text-gray-500 truncate">
//                   {profile?.ratingAvg
//                     ? `★ ${profile.ratingAvg.toFixed(1)}`
//                     : "Pilot"}
//                 </p>
//               </div>
//               <svg
//                 className={`w-3 h-3 text-gray-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 stroke="currentColor"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M19 9l-7 7-7-7"
//                 />
//               </svg>
//             </button>

//             {/* Dropdown menu */}
//             {dropdownOpen && (
//               <div className="absolute bottom-full left-0 mb-1 w-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
//                 <button
//                   onClick={handleLoginAsStudent}
//                   className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
//                 >
//                   <span>👤</span> Login as Student
//                 </button>
//                 <button
//                   onClick={handleUploadAvatar}
//                   className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
//                 >
//                   <span>📷</span> Upload Profile Picture
//                 </button>
//                 <div className="border-t border-gray-800" />
//                 <button
//                   onClick={handleLogout}
//                   className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-gray-800 transition-colors flex items-center gap-2"
//                 >
//                   <span>🚪</span> Logout
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </aside>

//       {/* ── Login as Student modal ────────────────────────────────────────── */}
//       {studentModalOpen && (
//         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
//           <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
//               <div>
//                 <h3 className="text-white font-bold text-base">
//                   View as Student
//                 </h3>
//                 <p className="text-gray-500 text-xs mt-0.5">
//                   Select a cadet to inspect
//                 </p>
//               </div>
//               <button
//                 onClick={() => setStudentModalOpen(false)}
//                 className="text-gray-500 hover:text-white text-lg"
//               >
//                 ×
//               </button>
//             </div>
//             <div className="max-h-72 overflow-y-auto p-3">
//               {students.length === 0 ? (
//                 <p className="text-gray-500 text-sm text-center py-6">
//                   No students found.
//                 </p>
//               ) : (
//                 students.map((s) => (
//                   <button
//                     key={s.studentId}
//                     onClick={() => {
//                       setStudentModalOpen(false);
//                       router.push(`/student-view/${s.studentId}`);
//                     }}
//                     className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-all text-left"
//                   >
//                     <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
//                       {s.studentName[0]?.toUpperCase()}
//                     </div>
//                     <div>
//                       <p className="text-white text-sm font-medium">
//                         {s.studentName}
//                       </p>
//                       <p className="text-gray-500 text-xs">
//                         Age {s.studentAge}
//                       </p>
//                     </div>
//                     <svg
//                       className="ml-auto w-4 h-4 text-gray-600"
//                       fill="none"
//                       viewBox="0 0 24 24"
//                       stroke="currentColor"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={2}
//                         d="M9 5l7 7-7 7"
//                       />
//                     </svg>
//                   </button>
//                 ))
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

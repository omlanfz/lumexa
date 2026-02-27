// FILE PATH: client/components/TeacherNav.tsx
// Changes:
// 1. Added sidebar collapse toggle (chevron button)
// 2. Fixed dark/light mode to use Tailwind v4 dark: classes
// 3. Removed redundant nav items (consolidated duplicates)
// 4. Added "Conduct" page link (new rules page)
// 5. Made responsive for mobile with overlay behavior

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";
import { useTheme, ThemeToggle } from "./ThemeProvider";
import Image from "next/image";

interface TeacherNavProps {
  teacherName: string;
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

const NAV_ITEMS = [
  {
    href: "/teacher-dashboard",
    icon: "🚀",
    label: "Dashboard",
    sub: "Mission Control",
  },
  { href: "/calendar", icon: "📅", label: "Schedule", sub: "Flight Log" },
  {
    href: "/teacher-students",
    icon: "👥",
    label: "My Students",
    sub: "Cadet Roster",
  },
  {
    href: "/teacher-earnings",
    icon: "💰",
    label: "Earnings",
    sub: "Reward Ledger",
  },
  {
    href: "/teacher-conduct",
    icon: "📋",
    label: "Guidelines",
    sub: "Pilot Code",
  },
  {
    href: "/teacher-profile",
    icon: "⚙️",
    label: "Settings",
    sub: "Pilot Config",
  },
  {
    href: "/leaderboard",
    icon: "🏆",
    label: "Leaderboard",
    sub: "Star Rankings",
  },
];

export default function TeacherNav({
  teacherName,
  avatarUrl,
  rankTier = 0,
  onAvatarUpdate,
}: TeacherNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Close profile menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-profile-menu]")) setShowProfileMenu(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Max 5MB");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/uploads/avatar`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      onAvatarUpdate?.(res.data.avatarUrl);
    } catch (err: any) {
      const m = err.response?.data?.message;
      setUploadError(Array.isArray(m) ? m.join(", ") : (m ?? "Upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const rankName = RANK_NAMES[rankTier] ?? "Cadet";
  const rankIcon = RANK_ICONS[rankTier] ?? "🌱";

  // ── Sidebar width classes ────────────────────────────────────────────────────
  const sidebarW = collapsed ? "w-16" : "w-64";
  const sidebarWMobile = mobileOpen ? "translate-x-0" : "-translate-x-full";

  const sidebarBase = `
    h-screen flex flex-col overflow-hidden transition-all duration-300 z-40
    dark:bg-[#0A0714] bg-white
    dark:border-purple-900/30 border-purple-100 border-r
  `;

  const NavContent = () => (
    <>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between px-4 py-5 border-b dark:border-purple-900/20 border-purple-100 flex-shrink-0 ${collapsed ? "justify-center px-2" : ""}`}
      >
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              <Image
                src="https://res.cloudinary.com/dunx0blwp/image/upload/v1772141559/logo_yr5wyw.jpg"
                width={32}
                height={32}
                alt="Lumexa"
              />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-purple-500 text-sm leading-none truncate">
                Lumexa
              </p>
              <p className="text-xs dark:text-purple-400/50 text-purple-400 leading-none">
                Flight Deck
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
            L
          </div>
        )}
        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex ml-auto w-7 h-7 rounded-lg dark:bg-purple-900/30 bg-purple-100 dark:text-purple-400 text-purple-600 items-center justify-center dark:hover:bg-purple-900/50 hover:bg-purple-200 transition-colors flex-shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* ── Profile area ──────────────────────────────────────────────────── */}
      <div
        data-profile-menu
        className={`relative flex-shrink-0 px-3 py-4 border-b dark:border-purple-900/20 border-purple-100 ${collapsed ? "flex justify-center" : ""}`}
      >
        <button
          onClick={() => setShowProfileMenu((p) => !p)}
          className={`flex items-center gap-3 w-full rounded-xl p-2 dark:hover:bg-purple-900/20 hover:bg-purple-50 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover border-2 dark:border-purple-700/40 border-purple-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center text-white font-bold">
                {teacherName?.charAt(0)?.toUpperCase() ?? "P"}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold dark:text-purple-100 text-purple-900 truncate">
                {teacherName}
              </p>
              <p className="text-xs dark:text-purple-400/60 text-purple-400">
                {rankIcon} {rankName}
              </p>
            </div>
          )}
          {!collapsed && (
            <span className="dark:text-purple-400/40 text-purple-300 text-xs">
              ▾
            </span>
          )}
        </button>

        {/* Profile dropdown */}
        {showProfileMenu && !collapsed && (
          <div className="absolute left-3 right-3 top-full mt-1 rounded-xl border shadow-xl z-50 dark:bg-[#160C24] dark:border-purple-900/40 bg-white border-purple-100 overflow-hidden">
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setShowProfileMenu(false);
              }}
              className="w-full px-4 py-2.5 text-sm text-left dark:text-purple-200 text-purple-700 dark:hover:bg-purple-900/30 hover:bg-purple-50 transition-colors"
            >
              📷 Change Photo
            </button>
            <button
              onClick={() => {
                router.push("/teacher-profile");
                setShowProfileMenu(false);
              }}
              className="w-full px-4 py-2.5 text-sm text-left dark:text-purple-200 text-purple-700 dark:hover:bg-purple-900/30 hover:bg-purple-50 transition-colors"
            >
              ⚙️ Edit Profile
            </button>
            <div className="border-t dark:border-purple-900/30 border-purple-100" />
            <button
              onClick={logout}
              className="w-full px-4 py-2.5 text-sm text-left text-red-400 dark:hover:bg-red-900/20 hover:bg-red-50 transition-colors"
            >
              🚫 Log Out
            </button>
          </div>
        )}

        {uploadError && !collapsed && (
          <p className="text-xs text-red-400 px-2 mt-1">{uploadError}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
      </div>

      {/* ── Nav items ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/teacher-dashboard" &&
              pathname.startsWith(item.href));
          return (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? "dark:bg-purple-600/20 bg-purple-100 dark:text-purple-200 text-purple-700 dark:border dark:border-purple-600/30"
                  : "dark:text-purple-300/70 text-purple-500 dark:hover:bg-purple-900/20 hover:bg-purple-50"
              } ${collapsed ? "justify-center px-2" : ""}`}
              title={collapsed ? `${item.label} · ${item.sub}` : undefined}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {item.label}
                  </p>
                  <p className="text-xs dark:text-purple-400/50 text-purple-400 leading-none truncate">
                    {item.sub}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div
        className={`flex-shrink-0 px-3 py-4 border-t dark:border-purple-900/20 border-purple-100 ${collapsed ? "flex justify-center" : "flex items-center justify-between"}`}
      >
        {!collapsed && <ThemeToggle variant="teacher" />}
        {collapsed && <ThemeToggle variant="teacher" />}
        {!collapsed && (
          <p className="text-xs dark:text-purple-900/60 text-purple-300">
            Lumexa v1.0
          </p>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile hamburger ──────────────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen((o) => !o)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl dark:bg-purple-900/60 bg-purple-100 dark:text-purple-300 text-purple-700 flex items-center justify-center shadow-lg"
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      {/* ── Mobile overlay ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar ────────────────────────────────────────────────── */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 ${sidebarWMobile} ${sidebarBase} shadow-2xl transition-transform duration-300`}
      >
        <NavContent />
      </aside>

      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 ${sidebarW} ${sidebarBase} flex-col shadow-xl`}
      >
        <NavContent />
      </aside>

      {/* ── Content offset spacer ─────────────────────────────────────────── */}
      {/* Apply this class to the page content wrapper: lg:pl-64 or lg:pl-16 */}
    </>
  );
}

// ── Hook to get sidebar width for page layout ─────────────────────────────────
// Usage in pages: const { sidebarClass } = useSidebarWidth();
// export function useSidebarWidth() { ... }
// Simpler: pages use "lg:pl-64" and sidebar collapse is visual-only at this scale.

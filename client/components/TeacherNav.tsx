// FILE PATH: client/components/TeacherNav.tsx
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

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

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
      // CHANGE: field name changed from "file" to "avatar" to match backend FileInterceptor
      fd.append("avatar", file);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/uploads/avatar`,
        fd,
        { headers: { Authorization: `Bearer ${token}` } },
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

  // Shared sidebar content
  const SidebarContent = () => (
    <>
      {/* Header — FIX: Logo always visible, just scaled in collapsed mode */}
      <div
        className={`flex items-center border-b dark:border-purple-900/20 border-purple-100 flex-shrink-0 transition-all duration-300 ${collapsed ? "justify-center px-2 py-4" : "justify-between px-4 py-5"}`}
      >
        {/* CHANGE: Logo never hidden — shows icon only when collapsed */}
        <div
          className={`flex items-center gap-2 min-w-0 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
            L
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold dark:text-white text-purple-900 text-sm leading-tight truncate">
                Lumexa
              </p>
              <p className="text-xs dark:text-purple-400 text-purple-400 truncate">
                Flight Deck
              </p>
            </div>
          )}
        </div>
        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md dark:text-purple-400 text-purple-400 dark:hover:bg-purple-900/30 hover:bg-purple-100 transition-colors flex-shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="text-xs">{collapsed ? "→" : "←"}</span>
        </button>
      </div>

      {/* Profile section */}
      <div
        className={`relative border-b dark:border-purple-900/20 border-purple-100 flex-shrink-0 ${collapsed ? "px-2 py-3" : "px-4 py-3"}`}
        data-profile-menu
      >
        <button
          onClick={() => setShowProfileMenu((p) => !p)}
          className={`flex items-center gap-3 w-full rounded-xl cursor-pointer transition-colors dark:hover:bg-purple-900/20 hover:bg-purple-50 p-2 ${collapsed ? "justify-center" : ""}`}
          aria-expanded={showProfileMenu}
          aria-haspopup="true"
        >
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={teacherName}
                width={36}
                height={36}
                className="rounded-full object-cover w-9 h-9 ring-2 ring-purple-500/30"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-semibold text-sm">
                {teacherName.charAt(0).toUpperCase()}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium dark:text-purple-100 text-purple-900 truncate">
                {teacherName}
              </p>
              <p className="text-xs dark:text-purple-400 text-purple-500 truncate">
                {rankIcon} {rankName}
              </p>
            </div>
          )}
        </button>

        {showProfileMenu && (
          <div className="absolute left-2 right-2 top-full mt-1 rounded-xl border dark:border-purple-900/40 bg-white dark:bg-[#12082a] border-purple-100 overflow-hidden shadow-xl z-50">
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

      {/* Nav items */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5"
        role="navigation"
        aria-label="Teacher navigation"
      >
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
              className={`w-full flex items-center gap-3 rounded-xl text-left transition-all cursor-pointer ${
                isActive
                  ? "dark:bg-purple-600/20 bg-purple-100 dark:text-purple-200 text-purple-700 dark:border dark:border-purple-600/30"
                  : "dark:text-purple-300/70 text-purple-500 dark:hover:bg-purple-900/20 hover:bg-purple-50"
              } ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}`}
              title={collapsed ? `${item.label} · ${item.sub}` : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className="text-lg flex-shrink-0"
                role="img"
                aria-label={item.label}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs opacity-60 truncate">{item.sub}</p>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div
        className={`flex-shrink-0 border-t dark:border-purple-900/20 border-purple-100 ${collapsed ? "p-2" : "p-3"}`}
      >
        <ThemeToggle />
        <p
          className={`text-xs dark:text-purple-800 text-purple-300 text-center mt-2 ${collapsed ? "hidden" : ""}`}
        >
          Lumexa v1.0
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 flex items-center justify-center rounded-xl dark:bg-[#0A0714] bg-white border dark:border-purple-900/40 border-purple-100 shadow-lg cursor-pointer"
        aria-label="Open navigation menu"
      >
        <span className="text-purple-500">☰</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 flex flex-col z-50 lg:hidden transition-transform duration-300 dark:bg-[#0A0714] bg-white border-r dark:border-purple-900/30 border-purple-100 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg dark:text-purple-400 text-purple-500 dark:hover:bg-purple-900/30 hover:bg-purple-100 transition-colors cursor-pointer"
          aria-label="Close navigation menu"
        >
          ✕
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar — CHANGE: flex-shrink-0 prevents content crush */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 transition-all duration-300 dark:bg-[#0A0714] bg-white border-r dark:border-purple-900/30 border-purple-100 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
        aria-label="Desktop navigation"
      >
        <SidebarContent />
      </aside>
    </>
  );
}
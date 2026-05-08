// FILE PATH: client/components/StudentNav.tsx
// Features:
// 1. Sidebar collapse toggle
// 2. Responsive (mobile hamburger + overlay)
// 3. Blue/cyan color theme (distinct from teacher purple)
// 4. Optional "Teacher View" mode amber banner

"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme, ThemeToggle } from "./ThemeProvider";
import Image from "next/image";

interface StudentNavProps {
  studentId: string;
  studentName: string | null;
  grade?: string | null;
  parentName?: string | null;
  avatarUrl?: string | null;
  isTeacherView?: boolean;
  onExitTeacherView?: () => void;
  parentId?: string;
  completedClasses?: number;
}

const LEVEL_TIERS = [
  { name: "Starchild", icon: "🌟", min: 0 },
  { name: "Explorer", icon: "🔭", min: 5 },
  { name: "Cosmonaut", icon: "🛸", min: 15 },
  { name: "Navigator", icon: "🧭", min: 30 },
  { name: "Captain", icon: "🎖️", min: 60 },
  { name: "Galaxy Commander", icon: "🌌", min: 100 },
];

function getLevelTier(classes: number) {
  let tier = 0;
  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (classes >= LEVEL_TIERS[i].min) tier = i;
  }
  return LEVEL_TIERS[tier];
}

export default function StudentNav({
  studentName,
  studentId,
  avatarUrl,
  isTeacherView = false,
  onExitTeacherView,
  parentId,
  completedClasses = 0,
}: StudentNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const level = getLevelTier(completedClasses);

  const NAV_ITEMS = [
    {
      href: `/student-dashboard/${studentId}`,
      icon: "🌌",
      label: "Dashboard",
      sub: "Mission Hub",
    },
    {
      href: `/student-lessons/${studentId}`,
      icon: "📚",
      label: "My Lessons",
      sub: "Mission Log",
    },
    {
      href: `/student-progress/${studentId}`,
      icon: "📊",
      label: "Progress",
      sub: "Flight Stats",
    },
    {
      href: `/student-leaderboard`,
      icon: "🏆",
      label: "Rankings",
      sub: "Star Chart",
    },
    {
      href: `/marketplace`,
      icon: "🔭",
      label: "Find a Teacher",
      sub: "Mission Select",
    },
  ];

  const sidebarW = collapsed ? "w-16" : "w-64";
  const sidebarWMobile = mobileOpen ? "translate-x-0" : "-translate-x-full";
  const sidebarBase = `
    h-screen flex flex-col overflow-hidden transition-all duration-300 z-40
    bg-[var(--s-nav-bg)]
    border-[var(--s-nav-border)] border-r
  `;

  const NavContent = () => (
    <>
      {/* Teacher view amber banner */}
      {isTeacherView && (
        <div className="bg-amber-500 text-amber-900 text-xs font-bold text-center py-2 px-3 flex-shrink-0">
          👁️ TEACHER VIEW — Read Only
        </div>
      )}

      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-5 border-b border-[var(--s-nav-border)] flex-shrink-0 ${collapsed ? "justify-center px-2" : ""}`}
      >
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--s-accent)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden shadow-sm">
              <Image
                src="https://res.cloudinary.com/dunx0blwp/image/upload/v1772141559/logo_yr5wyw.jpg"
                width={32}
                height={32}
                alt="Lumexa"
              />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[var(--s-accent)] text-sm leading-none">
                Lumexa
              </p>
              <p className="text-xs text-[var(--s-text-muted)] leading-none opacity-70">
                Mission Control
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-[var(--s-accent)] flex items-center justify-center text-white text-sm font-bold">
            L
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex ml-auto w-7 h-7 rounded-lg bg-[var(--s-nav-active)] text-[var(--s-text-muted)] items-center justify-center transition-colors flex-shrink-0 hover:text-[var(--s-text)]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Student profile */}
      <div
        className={`flex-shrink-0 px-3 py-4 border-b border-[var(--s-nav-border)] ${collapsed ? "flex justify-center" : ""}`}
      >
        <div
          className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-[var(--s-border-strong)] flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4F7CFF] to-[#27D6C5] flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">
              {studentName ? studentName.charAt(0).toUpperCase() : "…"}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--s-text)] truncate">
                {studentName}
              </p>
              <p className="text-xs text-[var(--s-text-muted)]">
                {level.icon} {level.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? "bg-[var(--s-nav-active)] text-[var(--s-nav-active-text)] border border-[var(--s-border-strong)]"
                  : "text-[var(--s-text-muted)] hover:bg-[var(--s-nav-hover)] hover:text-[var(--s-text)]"
              } ${collapsed ? "justify-center px-2" : ""}`}
              title={collapsed ? `${item.label} · ${item.sub}` : undefined}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {item.label}
                  </p>
                  <p className="text-xs text-[var(--s-text-faint)] leading-none truncate">
                    {item.sub}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={`flex-shrink-0 px-3 py-4 border-t border-[var(--s-nav-border)] ${collapsed ? "flex justify-center" : "flex items-center justify-between"}`}
      >
        {!collapsed && isTeacherView && (
          <button
            onClick={() =>
              onExitTeacherView
                ? onExitTeacherView()
                : router.push("/teacher-dashboard")
            }
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-amber-900 font-bold hover:bg-amber-400 transition-colors"
          >
            ← Back to Flight Deck
          </button>
        )}
        {!collapsed && !isTeacherView && (
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs text-[var(--s-text-muted)] hover:text-[var(--s-text)] transition-colors"
          >
            ← Parent Dashboard
          </button>
        )}
        <ThemeToggle variant="student" />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen((o) => !o)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-[var(--s-nav-active)] text-[var(--s-text-muted)] flex items-center justify-center shadow-lg border border-[var(--s-nav-border)]"
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 ${sidebarWMobile} ${sidebarBase} shadow-2xl transition-transform duration-300`}
      >
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 ${sidebarW} ${sidebarBase} flex-col shadow-xl`}
      >
        <NavContent />
      </aside>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { LABELS } from '@/lib/labels';

interface StudentNavProps {
  // New student-auth props
  fullName?: string;
  spaceRank?: string;
  rankIcon?: string;
  gemBalance?: number;
  totalSessions?: number;
  avatarUrl?: string | null;
  // Collapse sync: layout can pass this to stay in sync with content margin
  onCollapseChange?: (collapsed: boolean) => void;
  // Legacy props (parent-proxy pages) — accepted for backward compat
  studentId?: string;
  studentName?: string | null;
  grade?: string | null;
  parentName?: string | null;
  parentId?: string;
  isTeacherView?: boolean;
  onExitTeacherView?: () => void;
  completedClasses?: number;
}

const NAV_ITEMS = [
  { href: '/student-dashboard', icon: '🌌', label: LABELS.STUDENT_DASHBOARD.primary, sub: LABELS.STUDENT_DASHBOARD.theme, exact: true },
  { href: '/student-dashboard/lessons', icon: '📚', label: LABELS.STUDENT_LESSONS.primary, sub: LABELS.STUDENT_LESSONS.theme, exact: false },
  { href: '/student-dashboard/progress', icon: '📊', label: LABELS.STUDENT_PROGRESS.primary, sub: LABELS.STUDENT_PROGRESS.theme, exact: false },
  { href: '/student-dashboard/teachers', icon: '👨‍🚀', label: LABELS.STUDENT_TEACHERS.primary, sub: LABELS.STUDENT_TEACHERS.theme, exact: false },
  { href: '/student-dashboard/recordings', icon: '🎬', label: LABELS.STUDENT_RECORDINGS.primary, sub: LABELS.STUDENT_RECORDINGS.theme, exact: false },
  { href: '/student-dashboard/rankings', icon: '🏆', label: LABELS.STUDENT_RANKINGS.primary, sub: LABELS.STUDENT_RANKINGS.theme, exact: false },
];

const RANK_THRESHOLDS = [
  { rank: 'STARCHILD', min: 0, next: 5 },
  { rank: 'EXPLORER', min: 5, next: 15 },
  { rank: 'COSMONAUT', min: 15, next: 30 },
  { rank: 'NAVIGATOR', min: 30, next: 60 },
  { rank: 'CAPTAIN', min: 60, next: 100 },
  { rank: 'GALAXY_COMMANDER', min: 100, next: null },
];

function rankProgress(sessions: number, rank: string): number {
  const tier = RANK_THRESHOLDS.find((t) => t.rank === rank);
  if (!tier || tier.next === null) return 100;
  const range = tier.next - tier.min;
  return Math.min(100, Math.round(((sessions - tier.min) / range) * 100));
}

export default function StudentNav({
  fullName: fullNameProp,
  spaceRank: spaceRankProp,
  rankIcon: rankIconProp,
  gemBalance: gemBalanceProp,
  avatarUrl,
  totalSessions: totalSessionsProp,
  onCollapseChange,
  // legacy
  studentName,
  completedClasses,
}: StudentNavProps) {
  // Resolve new vs legacy props
  const fullName = fullNameProp ?? studentName ?? '';
  const spaceRank = spaceRankProp ?? 'STARCHILD';
  const rankIcon = rankIconProp ?? '🌟';
  const gemBalance = gemBalanceProp ?? 0;
  const totalSessions = totalSessionsProp ?? completedClasses ?? 0;
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lumexa_student_nav_collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('lumexa_student_nav_collapsed', String(next));
    onCollapseChange?.(next);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/student/login');
  };

  const progress = rankProgress(totalSessions, spaceRank);
  const initial = fullName ? fullName.charAt(0).toUpperCase() : '?';

  const NavContent = () => (
    <>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-5 border-b border-teal-800/30 flex-shrink-0 ${collapsed ? 'justify-center px-2' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src="https://res.cloudinary.com/dunx0blwp/image/upload/v1772141559/logo_yr5wyw.jpg"
                width={32}
                height={32}
                alt="Lumexa"
              />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-teal-400 text-sm leading-none">Lumexa</p>
              <p className="text-xs text-gray-500 leading-none">{LABELS.STUDENT_DASHBOARD.theme}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-black text-sm font-bold">
            L
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex ml-auto w-7 h-7 rounded-lg bg-gray-800 text-gray-400 items-center justify-center hover:text-teal-400 transition-colors flex-shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Student profile */}
      <div className={`flex-shrink-0 px-3 py-4 border-b border-teal-800/30 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-teal-800/40 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-black font-bold flex-shrink-0">
              {initial}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{fullName}</p>
              <p className="text-xs text-gray-400">
                {rankIcon} {spaceRank.replace(/_/g, ' ')}
              </p>
              <div className="mt-1.5 w-full bg-gray-700 rounded-full h-1">
                <div
                  className="bg-teal-400 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mt-3 flex items-center gap-1.5 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <span className="text-amber-400 text-sm">✦</span>
            <span className="text-amber-400 text-xs font-semibold">{gemBalance} {LABELS.STUDENT_GEMS.primary}</span>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-teal-900/30 text-teal-400 border-l-2 border-teal-400'
                  : 'text-gray-400 hover:text-teal-300 hover:bg-gray-800/30'
              } ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? `${item.label} · ${item.sub}` : undefined}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{item.label}</p>
                  <p className="text-xs text-gray-500 leading-none truncate">{item.sub}</p>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`flex-shrink-0 px-3 py-4 border-t border-teal-800/30 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        <button
          onClick={() => router.push('/marketplace')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-teal-300 hover:bg-gray-800/30 transition-all ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Find a Teacher' : undefined}
        >
          <span className="text-lg">🔭</span>
          {!collapsed && <span className="text-sm">Find a Teacher</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-gray-800/30 transition-all ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Log Out' : undefined}
        >
          <span className="text-lg">🚪</span>
          {!collapsed && <span className="text-sm">{LABELS.LOGOUT.primary}</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen((o) => !o)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-gray-800 text-gray-400 flex items-center justify-center shadow-lg border border-teal-800/30"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 z-40 flex flex-col
          bg-gray-900 border-r border-teal-800/30 shadow-2xl
          transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-full flex-col
          bg-gray-900 border-r border-teal-800/30 shadow-xl z-40
          transition-all duration-300
          ${collapsed ? 'w-16' : 'w-64'}`}
      >
        <NavContent />
      </aside>
    </>
  );
}

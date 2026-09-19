'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeProvider';
import RankBadgeButton from '@/components/student/RankBadgeButton';

interface StudentTopNavProps {
  fullName: string;
  spaceRank: string;
  rankIcon: string;
  streakWeeks: number;
  avatarUrl: string | null;
}

const NAV_ITEMS = [
  { href: '/student-dashboard', label: 'Home', exact: true },
  { href: '/student-dashboard/learning', label: 'Learning', exact: false },
  { href: '/student-dashboard/profile', label: 'Profile', exact: false },
];

export default function StudentTopNav({
  fullName,
  spaceRank,
  rankIcon,
  streakWeeks,
  avatarUrl,
}: StudentTopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const initial = fullName ? fullName.charAt(0).toUpperCase() : '?';

  const isActive = (item: (typeof NAV_ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur border-b border-black/10 dark:border-white/10">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
        {/* Logo + brand */}
        <button
          onClick={() => router.push('/student-dashboard')}
          className="flex items-center gap-2.5 flex-shrink-0 transition-opacity hover:opacity-80"
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src="/logo-mark.png"
              width={32}
              height={32}
              alt="Lumexa"
            />
          </div>
          <span className="font-bold text-teal-500 dark:text-teal-400 text-sm hidden sm:inline">
            Lumexa
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item)
                  ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right cluster: streak, rank, theme, avatar */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {streakWeeks > 0 && (
            <div
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20"
              title={`${streakWeeks}-week streak`}
            >
              <span className="text-sm">🔥</span>
              <span className="text-orange-500 dark:text-orange-400 text-xs font-semibold">
                {streakWeeks}w
              </span>
            </div>
          )}
          <RankBadgeButton rank={spaceRank} icon={rankIcon} />

          <ThemeToggle variant="student" />

          <button
            onClick={() => router.push('/student-dashboard/profile')}
            className="flex items-center transition-transform hover:scale-105"
            aria-label="Profile"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="w-9 h-9 rounded-full object-cover border-2 border-teal-500/30"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-black font-bold text-sm">
                {initial}
              </div>
            )}
          </button>

          {/* Desktop logout */}
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Logout"
          >
            Logout
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 border border-black/10 dark:border-white/10 transition-colors hover:text-teal-600 dark:hover:text-teal-300"
            aria-label="Menu"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-black/10 dark:border-white/10 px-4 py-2 flex flex-col bg-white dark:bg-black fade-in">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                setMobileOpen(false);
              }}
              className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item)
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-300'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}

// FILE PATH: client/components/TeacherNav.tsx
// ACTION: CREATE this file.
// This sidebar is imported into EVERY teacher page.
// Usage: import TeacherNav from '@/components/TeacherNav';
// Then wrap page content: <div className="flex"><TeacherNav /><main className="flex-1 ml-56">...</main></div>

'use client';

import { usePathname, useRouter } from 'next/navigation';

interface NavItem {
  path: string;
  label: string;
  sub: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/teacher-dashboard', label: 'Dashboard', sub: 'Mission Control', icon: '🚀' },
  { path: '/calendar', label: 'Schedule', sub: 'Flight Log', icon: '📅' },
  { path: '/teacher-students', label: 'Students', sub: 'Cadet Roster', icon: '👥' },
  { path: '/teacher-earnings', label: 'Earnings', sub: 'Reward Ledger', icon: '💰' },
  { path: '/teacher-profile', label: 'Settings', sub: 'Pilot Config', icon: '⚙️' },
  { path: '/leaderboard', label: 'Leaderboard', sub: 'Star Rankings', icon: '🏆' },
];

export default function TeacherNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-gray-950 border-r border-gray-800 flex flex-col py-6 z-40">
      {/* Logo */}
      <div className="px-6 mb-8">
        <button
          onClick={() => router.push('/teacher-dashboard')}
          className="text-left"
        >
          <h1 className="text-2xl font-bold text-purple-400 tracking-tight">Lumexa</h1>
          <p className="text-xs text-gray-500 mt-0.5">Flight Deck ✦</p>
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                active
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20'
                  : 'text-gray-400 hover:bg-gray-800/80 hover:text-gray-200 border border-transparent'
              }`}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{item.label}</p>
                <p className="text-xs text-gray-500 leading-tight truncate">{item.sub}</p>
              </div>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Classroom + Logout */}
      <div className="px-3 space-y-0.5 border-t border-gray-800 pt-4">
        <button
          onClick={() => router.push('/marketplace')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                     text-gray-400 hover:bg-gray-800/80 hover:text-gray-200
                     border border-transparent transition-all"
        >
          <span className="text-lg">🌌</span>
          <div>
            <p className="text-sm font-medium leading-tight">Marketplace</p>
            <p className="text-xs text-gray-500 leading-tight">View as Parent</p>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                     text-gray-400 hover:bg-red-900/20 hover:text-red-400
                     border border-transparent transition-all"
        >
          <span className="text-lg">🚪</span>
          <div>
            <p className="text-sm font-medium leading-tight">Log Out</p>
            <p className="text-xs text-gray-500 leading-tight">Abort Mission</p>
          </div>
        </button>
      </div>
    </aside>
  );
}

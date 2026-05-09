'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentData {
  id: string;
  name: string;
  age?: number | null;
  grade?: string | null;
  subject?: string | null;
}

interface Booking {
  id: string;
  paymentStatus: string;
  shift: { start: string; end: string };
  teacher?: { fullName?: string; avatarUrl?: string | null } | null;
  review?: { rating: number; comment?: string | null } | null;
}

interface Stats {
  upcoming: number;
  total: number;
  completed: number;
  hoursLearned: number;
}

interface TeacherDashboardPayload {
  student: StudentData;
  parentInfo: { fullName: string; email: string };
  viewingTeacher: { id: string; fullName: string; avatarUrl: string | null };
  stats: { total: number; completed: number; upcoming: number; hoursLearned: number };
  avgRating: number | null;
  bookings: Booking[];
}

// ─── Sidebar (parent / teacher proxy view) ───────────────────────────────────

type Tab = 'overview' | 'schedule';

function ProxySidebar({
  student,
  activeTab,
  onTab,
  sidebarOpen,
  onToggle,
  isTeacherView,
}: {
  student: StudentData | null;
  activeTab: Tab;
  onTab: (t: Tab) => void;
  sidebarOpen: boolean;
  onToggle: () => void;
  isTeacherView: boolean;
}) {
  const router = useRouter();

  const navItems: { id: Tab; label: string; icon: string; sub: string }[] = [
    { id: 'overview', label: 'Dashboard', icon: '🏠', sub: 'Home Base' },
    { id: 'schedule', label: 'Schedule', icon: '📅', sub: 'My Classes' },
  ];

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 z-30 flex flex-col
          bg-gray-900 border-r border-gray-800/50
          transition-transform duration-300 lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-800/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm select-none">
            L
          </div>
          <div>
            <p className="font-bold text-white text-sm">Lumexa</p>
            <p className="text-xs text-gray-400">
              {isTeacherView ? 'Teacher View' : 'Student Dashboard'}
            </p>
          </div>
        </div>

        {/* Student profile */}
        <div className="px-4 py-4 border-b border-gray-800/50">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center font-bold text-white text-xl select-none">
            {student?.name ? student.name.charAt(0).toUpperCase() : '…'}
          </div>
          <p className="font-semibold text-white mt-2 text-sm">
            {student?.name ?? 'Loading…'}
          </p>
          <p className="text-xs text-gray-400">
            {student?.grade ? `${student.grade} · ` : ''}
            {student?.age ? `Age ${student.age} · ` : ''}Cadet
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                activeTab === item.id
                  ? 'bg-blue-900/30 text-blue-300 border-l-2 border-blue-400'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs opacity-60">{item.sub}</p>
              </div>
            </button>
          ))}
        </nav>

        {/* Back link */}
        <div className="p-4 border-t border-gray-800/50">
          <button
            onClick={() =>
              router.push(isTeacherView ? '/teacher-students' : '/dashboard')
            }
            className="w-full text-xs text-gray-400 hover:text-white text-left transition-colors"
          >
            ← {isTeacherView ? 'Back to My Students' : 'Back to Dashboard'}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function ProxyDashboardContent() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();

  const [student, setStudent] = useState<StudentData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({ upcoming: 0, total: 0, completed: 0, hoursLearned: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTeacherView, setIsTeacherView] = useState(false);
  const [teacherName, setTeacherName] = useState<string | null>(null);

  // Sync sidebar open on desktop
  useEffect(() => {
    const sync = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((o) => !o);
  };

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) { router.push('/login'); return; }

    const user = JSON.parse(rawUser) as { role?: string };
    const role = user.role ?? 'PARENT';

    // STUDENT role must never land here — redirect to their own dashboard
    if (role === 'STUDENT') {
      router.replace('/student-dashboard');
      return;
    }

    (async () => {
      try {
        if (role === 'TEACHER') {
          setIsTeacherView(true);
          const res = await api.get<TeacherDashboardPayload>(
            `/teachers/me/students/${studentId}/dashboard`,
          );
          const d = res.data;
          setStudent(d.student);
          setTeacherName(d.viewingTeacher.fullName);
          setBookings(d.bookings);
          setStats({
            total: d.stats.total,
            completed: d.stats.completed,
            upcoming: d.stats.upcoming,
            hoursLearned: d.stats.hoursLearned,
          });
        } else {
          // PARENT proxy
          const [sRes, bRes] = await Promise.all([
            api.get('/students'),
            api.get('/bookings/my').catch(() => ({ data: [] })),
          ]);

          const students: StudentData[] = Array.isArray(sRes.data) ? sRes.data : [];
          const found = students.find((s) => s.id === studentId) ?? null;
          setStudent(found);

          const allBookings: Booking[] = Array.isArray(bRes.data) ? bRes.data : [];
          const myBookings = allBookings.filter(
            (b: Booking & { studentId?: string; student?: { id?: string } }) =>
              b.studentId === studentId || b.student?.id === studentId,
          );
          setBookings(myBookings);

          const now = new Date();
          const completed = myBookings.filter(
            (b) => b.paymentStatus === 'CAPTURED' && new Date(b.shift.end) < now,
          );
          const upcoming = myBookings.filter((b) => new Date(b.shift.start) > now);
          const hoursLearned = completed.reduce((sum, b) => {
            const ms = new Date(b.shift.end).getTime() - new Date(b.shift.start).getTime();
            return sum + ms / 3_600_000;
          }, 0);

          setStats({
            upcoming: upcoming.length,
            total: myBookings.length,
            completed: completed.length,
            hoursLearned: Math.round(hoursLearned * 10) / 10,
          });
        }
      } catch (e: unknown) {
        const err = e as { response?: { status?: number; data?: { message?: string | string[] } } };
        const status = err.response?.status;
        if (status === 403) {
          setError("You don't have permission to view this student's dashboard.");
        } else if (status === 404) {
          setError('Student not found.');
        } else {
          const m = err.response?.data?.message;
          setError(
            Array.isArray(m) ? m.join(', ') : (m ?? 'Failed to load dashboard. Please try again.'),
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black gap-4 px-4">
        <p className="text-4xl">🚫</p>
        <p className="text-red-400 text-sm max-w-sm text-center">{error}</p>
        <button
          onClick={() => router.push(isTeacherView ? '/teacher-students' : '/dashboard')}
          className="text-blue-400 underline text-sm"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const upcomingBookings = bookings.filter((b) => new Date(b.shift.start) > new Date());
  const recentCompleted = bookings
    .filter((b) => b.paymentStatus === 'CAPTURED' && new Date(b.shift.end) < new Date())
    .sort((a, b) => new Date(b.shift.start).getTime() - new Date(a.shift.start).getTime())
    .slice(0, 5);

  const statCards = [
    { icon: '📅', label: 'Upcoming', value: stats.upcoming, color: 'text-cyan-400' },
    { icon: '✅', label: 'Completed', value: stats.completed, color: 'text-green-400' },
    { icon: '📚', label: 'Total Booked', value: stats.total, color: 'text-blue-400' },
    { icon: '⏱️', label: 'Hours Learned', value: `${stats.hoursLearned}h`, color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex">
      <ProxySidebar
        student={student}
        activeTab={activeTab}
        onTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        onToggle={toggleSidebar}
        isTeacherView={isTeacherView}
      />

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 z-40 w-8 h-8 rounded-full
          bg-gray-800 border border-gray-700/50
          flex items-center justify-center
          text-gray-400 hover:text-white
          transition-all duration-300 shadow-lg
          ${sidebarOpen ? 'left-[268px]' : 'left-4'}`}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? '‹' : '›'}
      </button>

      <main
        className={`flex-1 min-w-0 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'ml-0'
        } p-4 sm:p-6 pt-16 lg:pt-6`}
      >
        {/* Teacher view banner */}
        {isTeacherView && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-purple-900/30 border border-purple-700/40 flex items-center gap-3">
            <span className="text-lg">👁️</span>
            <div>
              <p className="text-sm font-medium text-purple-200">Teacher View · Read Only</p>
              <p className="text-xs text-purple-400/70">
                Viewing{' '}
                <span className="font-medium text-purple-300">
                  {student?.name ?? 'this student'}
                </span>
                's sessions with you ({teacherName ?? 'Teacher'}).
              </p>
            </div>
          </div>
        )}

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {isTeacherView
                  ? `${student?.name ?? 'Student'}'s Dashboard 👤`
                  : `Welcome back, ${student?.name ?? 'Cadet'} 👋`}
              </h1>
              <p className="text-sm mt-1 text-gray-400">
                {isTeacherView
                  ? 'Sessions between you and this student'
                  : 'Student Dashboard · Your Learning Mission'}
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statCards.map((s) => (
                <div
                  key={s.label}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center"
                >
                  <span className="text-2xl">{s.icon}</span>
                  <p className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
                  <p className="text-xs mt-0.5 text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Book a lesson CTA — parent proxy only */}
            {!isTeacherView && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/20 to-teal-900/20 border border-gray-700/50">
                <h3 className="font-semibold text-lg mb-1 text-white">Ready to learn? 🚀</h3>
                <p className="text-sm mb-4 text-gray-400">
                  Browse available teachers and book the next session.
                </p>
                <button
                  onClick={() => router.push(`/marketplace?studentId=${studentId}`)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20"
                >
                  Find a Teacher 🔭
                </button>
              </div>
            )}

            {/* Upcoming classes */}
            {upcomingBookings.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                <p className="text-xs uppercase font-medium mb-4 text-gray-400">Upcoming Classes</p>
                <div className="space-y-3">
                  {upcomingBookings.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-blue-900/20 border border-blue-700/30"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {new Date(b.shift.start).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {b.teacher?.fullName ?? 'Teacher'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(b.shift.start).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-500/15 text-blue-300 rounded-full border border-blue-500/30 flex-shrink-0">
                        Upcoming
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent sessions */}
            {recentCompleted.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                <p className="text-xs uppercase font-medium mb-4 text-gray-400">Recent Sessions</p>
                <div className="space-y-3">
                  {recentCompleted.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 text-lg">✅</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {b.teacher?.fullName ?? 'Teacher'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(b.shift.start).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      {b.review ? (
                        <div className="flex gap-0.5 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              className={`text-xs ${
                                s <= (b.review?.rating ?? 0)
                                  ? 'text-yellow-400'
                                  : 'text-gray-600'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 flex-shrink-0">No review</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {bookings.length === 0 && (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-10 text-center">
                <p className="text-4xl mb-3">🌌</p>
                <p className="font-semibold text-white">No classes yet</p>
                <p className="text-sm mt-1 text-gray-400">
                  {isTeacherView
                    ? 'No sessions have been booked between you and this student.'
                    : 'Book the first lesson to get started!'}
                </p>
                {!isTeacherView && (
                  <button
                    onClick={() => router.push(`/marketplace?studentId=${studentId}`)}
                    className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    Browse Teachers
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Schedule Tab ── */}
        {activeTab === 'schedule' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-6 text-white">Schedule</h2>
            {upcomingBookings.length === 0 ? (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-10 text-center">
                <p className="text-4xl mb-3">📅</p>
                <p className="text-white">No upcoming classes.</p>
                {!isTeacherView && (
                  <button
                    onClick={() => router.push(`/marketplace?studentId=${studentId}`)}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-all"
                  >
                    Book a Class
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-medium">
                        {new Date(b.shift.start).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-white text-lg font-bold leading-none">
                        {new Date(b.shift.start).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">
                        {b.teacher?.fullName ?? 'Teacher'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(b.shift.start).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}{' '}
                        –{' '}
                        {new Date(b.shift.end).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-500/15 text-blue-300 rounded-full border border-blue-500/30">
                      Upcoming
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProxyStudentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-black">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProxyDashboardContent />
    </Suspense>
  );
}

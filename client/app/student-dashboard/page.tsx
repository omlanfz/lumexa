'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';
import NextClassCard from '@/components/student/NextClassCard';
import RankProgressBar from '@/components/student/RankProgressBar';
import SessionReviewCard from '@/components/student/SessionReviewCard';
import RankUpCeremony from '@/components/student/RankUpCeremony';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpcomingBooking {
  bookingId: string;
  classStart: string;
  classEnd: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
}

interface PendingReview {
  bookingId: string;
  classStart: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
}

interface RecentSession {
  bookingId: string;
  classStart: string;
  classEnd: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
  durationMinutes: number;
  hasReview: boolean;
}

interface AssignedTeacher {
  teacherProfileId: string;
  name: string;
  avatarUrl: string | null;
  subjects: string[];
}

interface AssignedCourse {
  id: string;
  title: string;
}

interface StudentInfo {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  spaceRank: string;
  rankIcon: string;
  totalSessions: number;
  streakWeeks: number;
  hasBillingContact: boolean;
  sessionsToNextRank: number | null;
  assignedTeacher: AssignedTeacher | null;
  assignedCourse: AssignedCourse | null;
}

interface Stats {
  totalSessions: number;
  upcomingCount: number;
  spaceRank: string;
  streakWeeks: number;
}

interface DashboardData {
  student: StudentInfo;
  upcomingBooking: UpcomingBooking | null;
  pendingReview: PendingReview | null;
  recentSessions: RecentSession[];
  stats: Stats;
}

const RANK_ORDER = [
  'STARCHILD',
  'EXPLORER',
  'COSMONAUT',
  'NAVIGATOR',
  'CAPTAIN',
  'GALAXY_COMMANDER',
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid lg:grid-cols-3 gap-4">
        <Skeleton className="h-40 rounded-xl lg:col-span-2" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

// ─── Onboarding checklist for new students (0 sessions) ──────────────────────

function OnboardingChecklist({
  studentName,
  assignedTeacher,
  assignedCourse,
  upcomingBooking,
}: {
  studentName: string;
  assignedTeacher: AssignedTeacher | null;
  assignedCourse: AssignedCourse | null;
  upcomingBooking: UpcomingBooking | null;
}) {
  const steps = [
    { key: 'account', icon: '✅', label: 'Account created', done: true },
    { key: 'teacher', icon: '👩‍🚀', label: 'Meet your assigned teacher', done: !!assignedTeacher },
    { key: 'curriculum', icon: '📚', label: 'Your curriculum is set', done: !!assignedCourse },
    { key: 'session', icon: '🗓️', label: 'Your first session gets scheduled', done: !!upcomingBooking },
    { key: 'launch', icon: '🚀', label: 'Enter Star Lab and launch your mission', done: false },
  ];

  return (
    <div className="bg-gradient-to-br from-teal-900/90 to-cyan-900/70 border border-teal-700/40 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
      <div className="absolute -top-10 -right-10 text-8xl opacity-20 select-none">🌌</div>
      <div className="relative flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="text-xs text-teal-300 font-medium uppercase tracking-wide mb-1">
            Launch Sequence
          </p>
          <h3 className="font-semibold text-lg">
            Welcome aboard, {studentName}! 🌌
          </h3>
          <p className="text-teal-100/80 text-sm mt-1">
            {assignedTeacher
              ? "Your teacher is assigned — here's what happens next."
              : "Operations is matching you with your teacher — here's what happens next."}
          </p>
        </div>
      </div>

      <div className="relative space-y-2.5">
        {steps.map((step) => (
          <div
            key={step.key}
            className={`flex items-center gap-3 p-3 rounded-xl ${
              step.done ? 'bg-white/10' : 'bg-white/5'
            }`}
          >
            <span className={`text-xl flex-shrink-0 ${step.done ? '' : 'grayscale opacity-50'}`}>
              {step.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? 'line-through opacity-70' : ''}`}>
                {step.label}
              </p>
              {step.key === 'teacher' && assignedTeacher && (
                <div className="flex items-center gap-2 mt-1.5">
                  {assignedTeacher.avatarUrl ? (
                    <img
                      src={assignedTeacher.avatarUrl}
                      alt={assignedTeacher.name}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {assignedTeacher.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="text-teal-100/90 text-xs font-normal">{assignedTeacher.name}</p>
                </div>
              )}
              {step.key === 'curriculum' && assignedCourse && (
                <p className="text-teal-100/90 text-xs font-normal mt-1">{assignedCourse.title}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [showCeremony, setShowCeremony] = useState(false);
  const [ceremonyRank, setCeremonyRank] = useState('');
  const [ceremonyIcon, setCeremonyIcon] = useState('');
  const [showBookedBanner, setShowBookedBanner] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.push('/login'); return; }

    const role = getStoredRole();
    if (role !== 'STUDENT') { router.push('/login'); return; }

    if (window.location.search.includes('booked=true')) {
      setShowBookedBanner(true);
      setTimeout(() => setShowBookedBanner(false), 4000);
      router.replace('/student-dashboard');
    }

    fetchDashboard();
  }, [router]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<DashboardData>('/students/me/dashboard');
      setData(res.data);
      setPendingReview(res.data.pendingReview);

      // Rank-up ceremony: compare stored rank to current rank
      const lastRank = localStorage.getItem('lumexa_last_rank') ?? '';
      const currentRank = res.data.student.spaceRank;
      if (lastRank && RANK_ORDER.indexOf(currentRank) > RANK_ORDER.indexOf(lastRank)) {
        setCeremonyRank(currentRank);
        setCeremonyIcon(res.data.student.rankIcon);
        setShowCeremony(true);
      } else if (!lastRank) {
        localStorage.setItem('lumexa_last_rank', currentRank);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to load dashboard.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCeremonyDismiss = () => {
    setShowCeremony(false);
    if (data) localStorage.setItem('lumexa_last_rank', data.student.spaceRank);
  };

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="text-5xl">🚫</p>
        <p className="text-red-500 dark:text-red-400 text-sm max-w-sm text-center">{error}</p>
        <button onClick={fetchDashboard} className="text-teal-500 dark:text-teal-400 underline text-sm">
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { student, upcomingBooking, recentSessions } = data;
  const isNewStudent = student.totalSessions === 0;
  const firstName = student.fullName.split(' ')[0];

  // "Your Teacher" — sourced from the explicit Operations-controlled
  // assignedTeacher relation on the student, not inferred from booking
  // history (a student's assignment is metadata independent of any one
  // booking's teacher).
  const assignedTeacher = student.assignedTeacher;

  // isNewStudent stays true (and this checklist keeps showing) until the
  // student's first completed session — so a teacher assignment made by
  // Operations mid-onboarding must still reflect here immediately.

  // Greeting varies by time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const recentActivity = recentSessions.slice(0, 3);

  return (
    <div className="space-y-6 fade-in">
      {showCeremony && (
        <RankUpCeremony
          newRank={ceremonyRank}
          rankIcon={ceremonyIcon}
          onDismiss={handleCeremonyDismiss}
        />
      )}

      {showBookedBanner && (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-teal-500/15 border border-teal-500/30 rounded-xl text-teal-700 dark:text-teal-300 text-sm font-medium fade-in">
          🚀 Mission assigned! Your session is confirmed.
        </div>
      )}

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Here's what's next on your mission.
        </p>
      </div>

      {isNewStudent ? (
        <OnboardingChecklist
          studentName={firstName}
          assignedTeacher={assignedTeacher}
          assignedCourse={student.assignedCourse}
          upcomingBooking={upcomingBooking}
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          {/* Next class — the single most important thing */}
          <div className="lg:col-span-2">
            <NextClassCard booking={upcomingBooking} />
          </div>

          {/* Your teacher */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 h-full card-hover">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-3">
              Your Teacher
            </p>
            {assignedTeacher ? (
              <div className="flex items-center gap-3">
                {assignedTeacher.avatarUrl ? (
                  <img
                    src={assignedTeacher.avatarUrl}
                    alt={assignedTeacher.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-300 font-bold flex-shrink-0">
                    {assignedTeacher.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-gray-900 dark:text-white font-semibold truncate">
                    {assignedTeacher.name}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Assigned by Lumexa</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Operations is assigning your teacher — check back soon.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pending review — shown prominently before other content */}
      {pendingReview && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-3">
            Rate your last session
          </p>
          <SessionReviewCard
            review={pendingReview}
            isStudentMode
            onSubmitted={() => {
              setPendingReview(null);
              fetchDashboard();
            }}
          />
        </div>
      )}

      {!isNewStudent && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Your Journey — rank progress, one small gamification element */}
          <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 card-hover">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                Your Journey
              </p>
              <button
                onClick={() => router.push('/student-dashboard/learning?tab=progress')}
                className="text-teal-600 dark:text-teal-400 text-xs hover:underline transition-colors"
              >
                View details →
              </button>
            </div>
            <RankProgressBar
              currentRank={student.spaceRank}
              totalSessions={student.totalSessions}
              variant="dashboard"
            />
          </div>

          {/* Small streak indicator */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 flex flex-col justify-center items-center text-center card-hover">
            <span className="text-3xl mb-2">{student.streakWeeks > 0 ? '🔥' : '🌙'}</span>
            <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">
              {student.streakWeeks}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              week streak{student.streakWeeks !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Recent activity */}
      {!isNewStudent && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
              Recent Activity
            </p>
            {recentActivity.length > 0 && (
              <button
                onClick={() => router.push('/student-dashboard/learning?tab=lessons')}
                className="text-teal-600 dark:text-teal-400 text-xs hover:underline transition-colors"
              >
                View all →
              </button>
            )}
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Your completed lessons will appear here after your first class.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3 stagger-children">
              {recentActivity.map((session) => {
                const date = new Date(session.classStart);
                const initial = session.teacherName
                  ? session.teacherName.charAt(0).toUpperCase()
                  : 'T';
                return (
                  <div
                    key={session.bookingId}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700/50 fade-in card-hover"
                  >
                    {session.teacherAvatarUrl ? (
                      <img
                        src={session.teacherAvatarUrl}
                        alt={session.teacherName}
                        className="w-9 h-9 rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-300 font-bold text-sm flex-shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white text-sm font-medium truncate">
                        {session.teacherName}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

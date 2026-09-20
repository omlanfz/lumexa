'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken, parseStoredUser } from '@/lib/storage';
import { isDemoStudentEmail } from '@/lib/demoClassroom';
import LiveClassCard, { LiveClass } from '@/components/student/LiveClassCard';
import SessionReviewCard from '@/components/student/SessionReviewCard';
import RankUpCeremony from '@/components/student/RankUpCeremony';
import CertificatesCard from '@/components/student/CertificatesCard';
import HomeworkDueCard, { PendingHomeworkItem } from '@/components/student/HomeworkDueCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingReview {
  bookingId: string;
  classStart: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
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
  emoji?: string | null;
  sessions?: number;
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

interface ContinueLearning {
  courseId: string;
  courseTitle: string;
  courseEmoji: string | null;
  totalLessons: number | null;
  completedCount: number;
  currentLessonNumber: number | null;
  progressPct: number;
}

interface Metrics {
  lessonsCompleted: number;
  classesAttended: number;
}

interface DashboardData {
  student: StudentInfo;
  setupComplete: boolean;
  liveClass: LiveClass | null;
  continueLearning: ContinueLearning | null;
  metrics: Metrics;
  pendingReview: PendingReview | null;
  pendingHomework: PendingHomeworkItem[];
}

const RANK_ORDER = [
  'STARCHILD',
  'EXPLORER',
  'COSMONAUT',
  'NAVIGATOR',
  'CAPTAIN',
  'GALAXY_COMMANDER',
];

const MOTIVATIONAL_LINES = [
  "Let's keep the momentum going!",
  'Every lesson gets you closer to your next big build.',
  "Small steps today, big launches tomorrow.",
  "Ready to level up your skills?",
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-52 rounded-2xl" />
      <div className="grid lg:grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

// ─── Onboarding checklist for students whose setup isn't complete yet ─────────

function OnboardingChecklist({
  studentName,
  assignedTeacher,
  assignedCourse,
  hasFirstSession,
}: {
  studentName: string;
  assignedTeacher: AssignedTeacher | null;
  assignedCourse: AssignedCourse | null;
  hasFirstSession: boolean;
}) {
  const steps = [
    { key: 'account', icon: '✅', label: 'Account created', done: true },
    { key: 'teacher', icon: '👩‍🚀', label: 'Meet your assigned teacher', done: !!assignedTeacher },
    { key: 'curriculum', icon: '📚', label: 'Your curriculum is set', done: !!assignedCourse },
    { key: 'session', icon: '🗓️', label: 'Your first session gets scheduled', done: hasFirstSession },
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
    // Refresh periodically so a class transitions to "Live" without a manual reload.
    const id = setInterval(fetchDashboard, 60_000);
    return () => clearInterval(id);
  }, [router]);

  const fetchDashboard = async () => {
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

  const { student, liveClass, continueLearning, metrics, setupComplete } = data;
  const firstName = student.fullName.split(' ')[0];
  const assignedTeacher = student.assignedTeacher;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const motivation = MOTIVATIONAL_LINES[new Date().getDate() % MOTIVATIONAL_LINES.length];
  const isDemoStudent = isDemoStudentEmail(parseStoredUser()?.email);

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

      {/* 1. Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{motivation}</p>
      </div>

      {isDemoStudent && (
        <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3.5 bg-teal-500/10 border border-dashed border-teal-500/40 rounded-xl">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            🧪 QA build: test the Lumexa classroom
          </p>
          <button
            onClick={() => router.push('/classroom-demo')}
            className="text-sm px-3 py-1.5 rounded-lg font-medium bg-teal-600 hover:bg-teal-500 text-white transition-all duration-150 active:scale-[0.98]"
          >
            Join Demo Classroom
          </button>
        </div>
      )}

      {!setupComplete ? (
        <OnboardingChecklist
          studentName={firstName}
          assignedTeacher={assignedTeacher}
          assignedCourse={student.assignedCourse}
          hasFirstSession={!!liveClass}
        />
      ) : (
        <>
          {/* 2. Live / Next Class — the primary, largest card */}
          <LiveClassCard liveClass={liveClass} />

          {pendingReview && (
            <SessionReviewCard
              review={pendingReview}
              isStudentMode
              onSubmitted={() => {
                setPendingReview(null);
                fetchDashboard();
              }}
            />
          )}

          {data && data.pendingHomework.length > 0 && <HomeworkDueCard items={data.pendingHomework} />}

          <div className="grid lg:grid-cols-2 gap-4">
            {/* 3. Continue Learning */}
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 card-hover">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-3">
                Continue Learning
              </p>
              {continueLearning ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{continueLearning.courseEmoji ?? '📚'}</span>
                    <div className="min-w-0">
                      <p className="text-gray-900 dark:text-white font-semibold truncate">
                        {continueLearning.courseTitle}
                      </p>
                      {continueLearning.totalLessons && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          Lesson {continueLearning.currentLessonNumber} of {continueLearning.totalLessons}
                        </p>
                      )}
                    </div>
                  </div>
                  {continueLearning.totalLessons && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                      <div
                        className="bg-teal-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${continueLearning.progressPct}%` }}
                      />
                    </div>
                  )}
                  <button
                    onClick={() => router.push('/student-dashboard/learning?tab=lessons')}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm bg-teal-500 hover:bg-teal-400 text-black active:scale-[0.98] transition-all duration-200"
                  >
                    Continue →
                  </button>
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Your curriculum will appear here once it's assigned.
                </p>
              )}
            </div>

            {/* 4. Your Path */}
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 card-hover">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-3">
                Your Path
              </p>
              {student.assignedCourse ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white font-semibold truncate">
                      {student.assignedCourse.title}
                    </p>
                    {assignedTeacher && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        with {assignedTeacher.name}
                      </p>
                    )}
                  </div>
                  {continueLearning?.totalLessons && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-medium flex-shrink-0">
                      {continueLearning.completedCount}/{continueLearning.totalLessons} lessons
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Operations is assigning your pathway — check back soon.
                </p>
              )}
            </div>
          </div>

          {/* 5. Your Progress — a couple of useful numbers, nothing more */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-3">
              Your Progress
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 text-center card-hover">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.lessonsCompleted}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Lessons Completed</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 text-center card-hover">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.classesAttended}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Classes Attended</p>
              </div>
            </div>
          </div>

          {/* 6. Certificates — only renders once the student has earned one */}
          <CertificatesCard />
        </>
      )}
    </div>
  );
}

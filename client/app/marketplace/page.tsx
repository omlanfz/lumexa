'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';

// ── Types ──────────────────────────────────────────────────────────────────

interface MarketplaceShift {
  id: string;
  start: string;
  end: string;
}

interface MarketplaceTeacher {
  id: string;
  bio: string | null;
  hourlyRate: number;
  ratingAvg: number;
  reviewCount: number;
  subjects?: string[];
  user: {
    fullName: string;
    avatarUrl: string | null;
    email: string;
  };
  shifts: MarketplaceShift[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const SUBJECTS = ['Math', 'Science', 'Coding', 'English', 'History', 'Art', 'Music'];
const GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
];

function Spinner() {
  return <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />;
}

function StarDisplay({ rating, count }: { rating: number; count: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={`text-sm ${s <= rounded ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
        ))}
      </div>
      <span className="text-xs text-gray-400">
        {rating > 0 ? rating.toFixed(1) : '—'}
        {count > 0 ? ` (${count})` : ''}
      </span>
    </div>
  );
}

// ── Marketplace content ────────────────────────────────────────────────────

function MarketplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get('studentId') ?? '';

  const [isStudent, setIsStudent] = useState(false);
  const [teachers, setTeachers] = useState<MarketplaceTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');

  // Booking modal state
  const [selectedTeacher, setSelectedTeacher] = useState<MarketplaceTeacher | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');

  // ── Detect role on mount ───────────────────────────────────────────────

  useEffect(() => {
    const rawUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (rawUser) {
      const u = JSON.parse(rawUser) as { role?: string };
      setIsStudent(u.role === 'STUDENT');
    }
  }, []);

  // ── Fetch teachers ─────────────────────────────────────────────────────

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/bookings/marketplace', {
        params: { page, limit: 12, ...(subject && { subject }), ...(grade && { grade }) },
      });
      const data = res.data;
      setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
      setTotalPages(data.totalPages ?? 1);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const m = e.response?.data?.message;
      setError(Array.isArray(m) ? m.join(', ') : (m ?? 'Failed to load teachers.'));
    } finally {
      setLoading(false);
    }
  }, [page, subject, grade]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // ── Fetch parent's students for the booking modal (PARENT only) ────────

  useEffect(() => {
    if (!hasToken || isStudent) return;
    api
      .get('/students')
      .then((res) => setStudents(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [hasToken, isStudent]);

  // ── Book a slot ────────────────────────────────────────────────────────

  const handleBook = async () => {
    if (!hasToken) {
      router.push(isStudent ? '/student/login' : '/login');
      return;
    }
    if (!selectedShiftId) {
      setBookingError('Please select a time slot.');
      return;
    }
    if (!isStudent && !selectedStudentId) {
      setBookingError('Please select a student.');
      return;
    }
    setBooking(true);
    setBookingError('');
    try {
      const payload = isStudent
        ? { shiftId: selectedShiftId }
        : { shiftId: selectedShiftId, studentId: selectedStudentId };
      const endpoint = isStudent ? '/bookings/student' : '/bookings';
      const res = await api.post(endpoint, payload);
      const { bookingId, clientSecret } = res.data;
      if (clientSecret) {
        router.push(`/payment?bookingId=${bookingId}&secret=${clientSecret}`);
      } else {
        router.push(`/mock-payment?bookingId=${bookingId}`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const m = e.response?.data?.message;
      setBookingError(Array.isArray(m) ? m.join(', ') : (m ?? 'Booking failed.'));
    } finally {
      setBooking(false);
    }
  };

  const fmtShift = (dt: string) =>
    new Date(dt).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const canConfirm = selectedShiftId && (isStudent || !!selectedStudentId);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Header ── */}
      <header className="border-b border-gray-800 bg-gray-950 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-400">Lumexa</h1>
          <p className="text-xs text-gray-500">Mission Selection</p>
        </div>
        <div className="flex gap-3">
          {hasToken ? (
            <button
              onClick={() => router.push(isStudent ? '/student-dashboard' : '/dashboard')}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              ← {isStudent ? 'My Dashboard' : 'Dashboard'}
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              Log In
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Find a Teacher</h2>
          <p className="text-sm text-gray-500 mt-0.5">Mission Selection ✦</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setPage(1); }}
            className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="">All Subjects</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={grade}
            onChange={(e) => { setGrade(e.target.value); setPage(1); }}
            className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="">All Grades</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          {(subject || grade) && (
            <button
              onClick={() => { setSubject(''); setGrade(''); setPage(1); }}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors px-2"
            >
              ✕ Clear filters
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner />
            <p className="text-gray-400 text-sm">Scanning the galaxy for pilots…</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🌌</p>
            <p className="text-gray-400">No teachers found.</p>
            {(subject || grade) && (
              <p className="text-gray-600 text-sm mt-1">Try removing your filters.</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {teachers.map((teacher) => {
                const displayName = teacher.user?.fullName ?? 'Teacher';
                const initial = displayName.charAt(0).toUpperCase();
                const availableSlots = teacher.shifts?.length ?? 0;

                return (
                  <div
                    key={teacher.id}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-blue-500/30 transition-all duration-200 cursor-pointer group"
                    onClick={() => {
                      setSelectedTeacher(teacher);
                      setSelectedShiftId('');
                      setBookingError('');
                      if (!selectedStudentId) setSelectedStudentId('');
                    }}
                  >
                    {/* Avatar */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 select-none overflow-hidden">
                        {teacher.user?.avatarUrl ? (
                          <img
                            src={teacher.user.avatarUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-lg font-bold">{initial}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                          {displayName}
                        </p>
                        <p className="text-xs text-gray-500">Pilot ✦</p>
                      </div>
                    </div>

                    <StarDisplay rating={teacher.ratingAvg ?? 0} count={teacher.reviewCount ?? 0} />

                    <p className="text-lg font-bold text-green-400 mt-2">
                      ${teacher.hourlyRate ?? 25}
                      <span className="text-xs font-normal text-gray-500 ml-1">/hr</span>
                    </p>

                    {teacher.bio && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">{teacher.bio}</p>
                    )}

                    <div className="mt-3 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${availableSlots > 0 ? 'bg-green-400' : 'bg-gray-600'}`} />
                      <span className={`text-xs ${availableSlots > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        {availableSlots > 0 ? `${availableSlots} slot${availableSlots > 1 ? 's' : ''} available` : 'No slots available'}
                      </span>
                    </div>

                    <button className="mt-4 w-full py-2 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white text-sm rounded-xl transition-all duration-200">
                      Book Lesson
                      <span className="block text-xs font-normal opacity-60">Assign Mission</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Booking Modal ── */}
      {selectedTeacher && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTeacher(null); }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Book {selectedTeacher.user?.fullName ?? 'Teacher'}
                </h3>
                <p className="text-xs text-gray-500">Pilot ✦</p>
              </div>
              <button
                onClick={() => setSelectedTeacher(null)}
                className="text-gray-500 hover:text-gray-300 text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <StarDisplay rating={selectedTeacher.ratingAvg ?? 0} count={selectedTeacher.reviewCount ?? 0} />

            {selectedTeacher.bio && (
              <p className="text-sm text-gray-400 mt-3 mb-4">{selectedTeacher.bio}</p>
            )}

            <p className="text-base font-bold text-green-400 mb-4">
              ${selectedTeacher.hourlyRate ?? 25}
              <span className="text-xs font-normal text-gray-500 ml-1">/hr</span>
            </p>

            {/* Shift picker */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Select Time Slot</label>
              {!selectedTeacher.shifts || selectedTeacher.shifts.length === 0 ? (
                <p className="text-sm text-gray-500 italic p-3 bg-gray-800 rounded-xl">
                  No available slots at the moment.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTeacher.shifts.map((shift) => (
                    <button
                      key={shift.id}
                      onClick={() => setSelectedShiftId(shift.id)}
                      className={`w-full text-left p-3 rounded-xl border text-sm transition-colors ${
                        selectedShiftId === shift.id
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      {fmtShift(shift.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Student picker — PARENT only */}
            {hasToken && !isStudent && (
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2">Select Student</label>
                {students.length === 0 ? (
                  <div className="p-3 bg-yellow-900/10 border border-yellow-500/20 rounded-xl">
                    <p className="text-yellow-400 text-xs">
                      You need to add a student first.{' '}
                      <button
                        onClick={() => { setSelectedTeacher(null); router.push('/dashboard'); }}
                        className="underline"
                      >
                        Go to Dashboard
                      </button>
                      .
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {students.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`w-full text-left p-3 rounded-xl border text-sm transition-colors ${
                          selectedStudentId === s.id
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {bookingError && (
              <p className="text-red-400 text-xs mb-3">{bookingError}</p>
            )}

            {hasToken ? (
              <button
                onClick={handleBook}
                disabled={booking || !canConfirm}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {booking && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {booking ? 'Booking…' : 'Confirm Booking'}
                {!booking && <span className="text-xs font-normal opacity-60 ml-1">Assign Mission</span>}
              </button>
            ) : (
              <button
                onClick={() => router.push(isStudent ? '/student/login' : '/login')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
              >
                Log In to Book
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-gray-400">Loading Mission Selection…</p>
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}

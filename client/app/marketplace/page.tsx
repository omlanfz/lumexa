// FILE PATH: client/app/marketplace/page.tsx
//
// ─── Issue 17 Fix: Browse Teachers (Marketplace) Crash ─────────────────────
//
// ROOT CAUSE #1 — TypeError: Cannot read properties of undefined (reading 'charAt')
//   The backend GET /bookings/marketplace returns an array of TeacherProfile
//   objects (from prisma.teacherProfile.findMany) with this shape:
//
//     {
//       id, bio, hourlyRate, ratingAvg, reviewCount,  ← TeacherProfile fields
//       user: { fullName, avatarUrl, email },          ← nested user object
//       shifts: [{ id, start, end }],                  ← available shifts
//     }
//
//   But the previous frontend typed and accessed it as a User object:
//
//     teacher.fullName          → undefined  (it's teacher.user.fullName)
//     teacher.teacherProfile    → undefined  (the object IS the profile)
//     teacher.availableShifts   → undefined  (it's teacher.shifts)
//
//   Calling .charAt(0) on undefined throws the crash.
//
// ROOT CAUSE #2 — GET /bookings/my 404
//   bookings.controller.ts already has this route but it was placed AFTER the
//   parameterised GET :bookingId route, so Express matched "my" as a bookingId.
//   This is fixed in bookings.controller.ts (separate file below).
//
// FIX IN THIS FILE:
//   • Updated MarketplaceTeacher type to match actual API response shape.
//   • All field accesses updated:
//       teacher.fullName          → teacher.user?.fullName
//       teacher.teacherProfile?.. → teacher.bio / teacher.hourlyRate / etc.
//       teacher.availableShifts   → teacher.shifts
//   • Every string access guarded with optional chaining + fallback ("T").
//   • No backend changes required for the crash itself.

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL;

// ── Types — match the ACTUAL API response shape ────────────────────────────
//
// GET /bookings/marketplace returns:
//   { teachers: MarketplaceTeacher[], total, page, limit, totalPages }
//
// Each teacher is a TeacherProfile row with nested `user` and `shifts`.

interface MarketplaceShift {
  id: string;
  start: string;
  end: string;
}

interface MarketplaceTeacher {
  // TeacherProfile fields
  id: string;
  bio: string | null;
  hourlyRate: number;
  ratingAvg: number;
  reviewCount: number;
  subjects?: string[];
  // Nested user — the crash happened because code read teacher.fullName
  // but the name actually lives at teacher.user.fullName
  user: {
    fullName: string;
    avatarUrl: string | null;
    email: string;
  };
  // Available upcoming shifts — previously misread as teacher.availableShifts
  shifts: MarketplaceShift[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const SUBJECTS = [
  "Math",
  "Science",
  "Coding",
  "English",
  "History",
  "Art",
  "Music",
];

const GRADES = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
  );
}

function StarDisplay({ rating, count }: { rating: number; count: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            className={`text-sm ${s <= rounded ? "text-yellow-400" : "text-gray-600"}`}
          >
            ★
          </span>
        ))}
      </div>
      <span className="text-xs text-gray-400">
        {rating > 0 ? rating.toFixed(1) : "—"}
        {count > 0 ? ` (${count})` : ""}
      </span>
    </div>
  );
}

// ── Marketplace content ────────────────────────────────────────────────────

function MarketplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-select student if coming from dashboard "Find a Teacher 🔭" button
  const preselectedStudentId = searchParams.get("studentId") ?? "";

  const [teachers, setTeachers] = useState<MarketplaceTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");

  // Booking modal state
  const [selectedTeacher, setSelectedTeacher] =
    useState<MarketplaceTeacher | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] =
    useState(preselectedStudentId);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // ── Fetch teachers ─────────────────────────────────────────────────────

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
      });
      if (subject) params.set("subject", subject);
      if (grade) params.set("grade", grade);

      const res = await axios.get(`${API}/bookings/marketplace?${params}`, {
        headers,
      });

      // Response shape: { teachers: MarketplaceTeacher[], totalPages, ... }
      const data = res.data;
      setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
      setTotalPages(data.totalPages ?? 1);
    } catch (err: any) {
      const m = err.response?.data?.message;
      setError(
        Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load teachers."),
      );
    } finally {
      setLoading(false);
    }
  }, [page, subject, grade]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // ── Fetch parent's students for the booking modal ─────────────────────

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/students`, { headers })
      .then((res) => setStudents(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [token]);

  // ── Book a slot ────────────────────────────────────────────────────────

  const handleBook = async () => {
    if (!token) {
      router.push("/login");
      return;
    }
    if (!selectedShiftId || !selectedStudentId) {
      setBookingError("Please select a time slot and a student.");
      return;
    }
    setBooking(true);
    setBookingError("");
    try {
      const res = await axios.post(
        `${API}/bookings`,
        { shiftId: selectedShiftId, studentId: selectedStudentId },
        { headers },
      );
      const { bookingId, clientSecret } = res.data;
      if (clientSecret) {
        router.push(`/payment?bookingId=${bookingId}&secret=${clientSecret}`);
      } else {
        router.push(`/mock-payment?bookingId=${bookingId}`);
      }
    } catch (err: any) {
      const m = err.response?.data?.message;
      setBookingError(
        Array.isArray(m) ? m.join(", ") : (m ?? "Booking failed."),
      );
    } finally {
      setBooking(false);
    }
  };

  const fmtShift = (dt: string) =>
    new Date(dt).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Header ── */}
      <header className="border-b border-gray-800 bg-gray-950 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-400">Lumexa</h1>
          <p className="text-xs text-gray-500">Mission Selection</p>
        </div>
        <div className="flex gap-3">
          {token ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              ← Dashboard
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
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
            onChange={(e) => {
              setSubject(e.target.value);
              setPage(1);
            }}
            className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="">All Subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              setPage(1);
            }}
            className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="">All Grades</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {(subject || grade) && (
            <button
              onClick={() => {
                setSubject("");
                setGrade("");
                setPage(1);
              }}
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
            <p className="text-gray-400 text-sm">
              Scanning the galaxy for pilots…
            </p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🌌</p>
            <p className="text-gray-400">No teachers found.</p>
            {(subject || grade) && (
              <p className="text-gray-600 text-sm mt-1">
                Try removing your filters.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {teachers.map((teacher) => {
                // Issue 17 fix: teacher IS the TeacherProfile.
                // fullName lives at teacher.user.fullName — NOT teacher.fullName.
                // Use optional chaining + fallback on every string access to
                // prevent the "Cannot read properties of undefined" crash.
                const displayName = teacher.user?.fullName ?? "Teacher";
                const initial = displayName.charAt(0).toUpperCase();
                const availableSlots = teacher.shifts?.length ?? 0;

                return (
                  <div
                    key={teacher.id}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-5
                               hover:border-blue-500/30 transition-all duration-200 cursor-pointer group"
                    onClick={() => {
                      setSelectedTeacher(teacher);
                      setSelectedShiftId("");
                      setBookingError("");
                      // Keep pre-selected student if set
                      if (!selectedStudentId) setSelectedStudentId("");
                    }}
                  >
                    {/* Avatar */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 select-none">
                        {teacher.user?.avatarUrl ? (
                          <img
                            src={teacher.user.avatarUrl}
                            alt={displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-lg font-bold">
                            {initial}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                          {displayName}
                        </p>
                        <p className="text-xs text-gray-500">Pilot ✦</p>
                      </div>
                    </div>

                    {/* Rating */}
                    <StarDisplay
                      rating={teacher.ratingAvg ?? 0}
                      count={teacher.reviewCount ?? 0}
                    />

                    {/* Hourly rate */}
                    <p className="text-lg font-bold text-green-400 mt-2">
                      ${teacher.hourlyRate ?? 25}
                      <span className="text-xs font-normal text-gray-500 ml-1">
                        /hr
                      </span>
                    </p>

                    {/* Bio */}
                    {teacher.bio && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                        {teacher.bio}
                      </p>
                    )}

                    {/* Available slots badge */}
                    <div className="mt-3 flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          availableSlots > 0 ? "bg-green-400" : "bg-gray-600"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          availableSlots > 0
                            ? "text-green-400"
                            : "text-gray-500"
                        }`}
                      >
                        {availableSlots > 0
                          ? `${availableSlots} slot${availableSlots > 1 ? "s" : ""} available`
                          : "No slots available"}
                      </span>
                    </div>

                    <button
                      className="mt-4 w-full py-2 bg-blue-600/20 hover:bg-blue-600
                                 border border-blue-500/30 text-blue-300 hover:text-white
                                 text-sm rounded-xl transition-all duration-200"
                    >
                      Book Lesson
                      <span className="block text-xs font-normal opacity-60">
                        Assign Mission
                      </span>
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
                <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
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
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTeacher(null);
          }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {/* Issue 17 fix: use teacher.user?.fullName */}
                  Book {selectedTeacher.user?.fullName ?? "Teacher"}
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

            {/* Rating */}
            <StarDisplay
              rating={selectedTeacher.ratingAvg ?? 0}
              count={selectedTeacher.reviewCount ?? 0}
            />

            {/* Bio */}
            {selectedTeacher.bio && (
              <p className="text-sm text-gray-400 mt-3 mb-4">
                {selectedTeacher.bio}
              </p>
            )}

            {/* Rate */}
            <p className="text-base font-bold text-green-400 mb-4">
              ${selectedTeacher.hourlyRate ?? 25}
              <span className="text-xs font-normal text-gray-500 ml-1">
                /hr
              </span>
            </p>

            {/* Shift picker */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">
                Select Time Slot
              </label>
              {/* Issue 17 fix: use teacher.shifts (not teacher.availableShifts) */}
              {!selectedTeacher.shifts ||
              selectedTeacher.shifts.length === 0 ? (
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
                          ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                          : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
                      }`}
                    >
                      {fmtShift(shift.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Student picker */}
            {token && (
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2">
                  Select Student
                </label>
                {students.length === 0 ? (
                  <div className="p-3 bg-yellow-900/10 border border-yellow-500/20 rounded-xl">
                    <p className="text-yellow-400 text-xs">
                      You need to add a student first.{" "}
                      <button
                        onClick={() => {
                          setSelectedTeacher(null);
                          router.push("/dashboard");
                        }}
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
                            ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                            : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
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

            {token ? (
              <button
                onClick={handleBook}
                disabled={booking || !selectedShiftId || !selectedStudentId}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {booking && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {booking ? "Booking…" : "Confirm Booking"}
                {!booking && (
                  <span className="text-xs font-normal opacity-60 ml-1">
                    Assign Mission
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
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

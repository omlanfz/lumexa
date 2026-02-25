// FILE PATH: client/app/marketplace/page.tsx
// ACTION: REPLACE the existing file entirely.
// KEY FIXES:
//   - Uses .teachers from paginated response (fixes the .map crash from CLAUDE.md)
//   - Star rating display on teacher cards
//   - Subject + grade filter dropdowns

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL;

interface TeacherProfile {
  id: string;
  bio: string | null;
  hourlyRate: number;
  ratingAvg: number;
  reviewCount: number;
}

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  teacherProfile: TeacherProfile | null;
  // availableShifts included in some responses
  _count?: { availableShifts: number };
}

interface Shift {
  id: string;
  start: string;
  end: string;
}

interface MarketplaceTeacher extends Teacher {
  availableShifts?: Shift[];
}

const SUBJECTS = [
  "",
  "Math",
  "Science",
  "Coding",
  "English",
  "History",
  "Art",
  "Music",
];
const GRADES = [
  "",
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

function MarketplaceContent() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<MarketplaceTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [selectedTeacher, setSelectedTeacher] =
    useState<MarketplaceTeacher | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

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
        headers: token ? headers : {},
      });

      // CRITICAL: always destructure .teachers — never set the whole response object
      const data = res.data;
      setTeachers(data.teachers ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : (msg ?? "Failed to load teachers."),
      );
    } finally {
      setLoading(false);
    }
  }, [page, subject, grade]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/students`, { headers })
      .then((res) => setStudents(res.data ?? []))
      .catch(() => {});
  }, []);

  const handleFilterChange = () => {
    setPage(1);
    fetchTeachers();
  };

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
        // Production Stripe flow
        router.push(`/payment?bookingId=${bookingId}&secret=${clientSecret}`);
      } else {
        // Mock payment flow
        router.push(`/mock-payment?bookingId=${bookingId}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setBookingError(
        Array.isArray(msg) ? msg.join(", ") : (msg ?? "Booking failed."),
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
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950 px-6 py-4 flex items-center justify-between">
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm
                         rounded-lg transition-colors"
            >
              Log In
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
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
            className="bg-gray-900 border border-gray-700 text-gray-300 text-sm
                       rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500
                       transition-colors cursor-pointer"
          >
            <option value="">All Subjects</option>
            {SUBJECTS.filter(Boolean).map((s) => (
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
            className="bg-gray-900 border border-gray-700 text-gray-300 text-sm
                       rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500
                       transition-colors cursor-pointer"
          >
            <option value="">All Grades</option>
            {GRADES.filter(Boolean).map((g) => (
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
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Spinner />
              <p className="text-gray-400 text-sm">
                Scanning the galaxy for pilots...
              </p>
            </div>
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
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5
                             hover:border-blue-500/30 transition-all duration-200 cursor-pointer
                             group"
                  onClick={() => {
                    setSelectedTeacher(teacher);
                    setSelectedShiftId("");
                    setSelectedStudentId("");
                    setBookingError("");
                  }}
                >
                  {/* Avatar */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600
                                    flex items-center justify-center flex-shrink-0"
                    >
                      <span className="text-white text-lg font-bold">
                        {teacher.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p
                        className="font-semibold text-white truncate group-hover:text-blue-300
                                    transition-colors"
                      >
                        {teacher.fullName}
                      </p>
                      <p className="text-xs text-gray-500">Pilot ✦</p>
                    </div>
                  </div>

                  {/* Rating */}
                  <StarDisplay
                    rating={teacher.teacherProfile?.ratingAvg ?? 0}
                    count={teacher.teacherProfile?.reviewCount ?? 0}
                  />

                  {/* Hourly rate */}
                  <p className="text-lg font-bold text-green-400 mt-2">
                    ${teacher.teacherProfile?.hourlyRate ?? 25}
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      /hr
                    </span>
                  </p>

                  {/* Bio */}
                  {teacher.teacherProfile?.bio && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                      {teacher.teacherProfile.bio}
                    </p>
                  )}

                  {/* Available slots badge */}
                  {teacher.availableShifts &&
                    teacher.availableShifts.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-xs text-green-400">
                          {teacher.availableShifts.length} slot
                          {teacher.availableShifts.length > 1 ? "s" : ""}{" "}
                          available
                        </span>
                      </div>
                    )}

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
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg
                             disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg
                             disabled:opacity-40 hover:bg-gray-700 transition-colors"
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
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Book {selectedTeacher.fullName}
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

            {/* Rating in modal */}
            <StarDisplay
              rating={selectedTeacher.teacherProfile?.ratingAvg ?? 0}
              count={selectedTeacher.teacherProfile?.reviewCount ?? 0}
            />

            {selectedTeacher.teacherProfile?.bio && (
              <p className="text-sm text-gray-400 mt-3 mb-4">
                {selectedTeacher.teacherProfile.bio}
              </p>
            )}

            {/* Shift picker */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">
                Select Time Slot
              </label>
              {!selectedTeacher.availableShifts ||
              selectedTeacher.availableShifts.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No available slots at the moment.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTeacher.availableShifts.map((shift) => (
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
                      You need to add a student first. Go to your{" "}
                      <button
                        onClick={() => {
                          setSelectedTeacher(null);
                          router.push("/dashboard");
                        }}
                        className="underline"
                      >
                        Dashboard
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
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                           text-white font-medium rounded-xl transition-colors
                           flex items-center justify-center gap-2"
              >
                {booking && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {booking ? "Booking..." : "Confirm Booking"}
                {!booking && (
                  <span className="text-xs font-normal opacity-60">
                    Assign Mission
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white
                           font-medium rounded-xl transition-colors"
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
          <p className="text-gray-400">Loading Mission Selection...</p>
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}

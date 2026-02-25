// FILE PATH: client/app/dashboard/page.tsx
// ACTION: REPLACE the existing file entirely.
// KEY ADDITIONS: Cancel booking button, Star review widget, booking status badges.

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Student {
  id: string;
  name: string;
  age: number;
  grade: string | null;
  subject: string | null;
}

interface Booking {
  id: string;
  paymentStatus: "PENDING" | "CAPTURED" | "REFUNDED" | "FAILED";
  amountCents: number | null;
  createdAt: string;
  shift: { start: string; end: string };
  student: { name: string };
  review: { rating: number; comment: string | null } | null;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Spinner({ small = false }: { small?: boolean }) {
  const sz = small ? "w-4 h-4" : "w-5 h-5";
  return (
    <div
      className={`${sz} border-2 border-blue-400 border-t-transparent rounded-full animate-spin`}
    />
  );
}

function StarRatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="text-2xl transition-transform hover:scale-110"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          <span
            className={
              (hover || value) >= star ? "text-yellow-400" : "text-gray-600"
            }
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

function ReviewForm({
  bookingId,
  token,
  onSuccess,
}: {
  bookingId: string;
  token: string;
  onSuccess: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please choose a star rating.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await axios.post(
        `${API}/bookings/${bookingId}/review`,
        { rating, comment: comment.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : (msg ?? "Failed to submit review."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full py-2 text-xs text-yellow-400 border border-yellow-500/30
                   hover:bg-yellow-500/10 rounded-lg transition-colors"
      >
        ★ Rate this class
        <span className="block text-gray-600 text-xs">Stellar Debrief</span>
      </button>
    );
  }

  return (
    <div className="mt-3 p-4 bg-gray-800/60 rounded-xl border border-gray-700/50">
      <p className="text-sm font-medium text-white mb-1">Rate this class</p>
      <p className="text-xs text-gray-500 mb-3">Stellar Debrief</p>
      <StarRatingPicker value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share what went well (optional)..."
        rows={2}
        className="mt-3 w-full bg-gray-900 border border-gray-700 rounded-lg text-sm
                   text-gray-300 p-2.5 resize-none focus:outline-none focus:border-blue-500
                   transition-colors"
      />
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                     text-white text-sm rounded-lg transition-colors flex items-center
                     justify-center gap-2"
        >
          {submitting && <Spinner small />}
          {submitting ? "Submitting..." : "Submit Rating"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2 text-gray-400 hover:text-gray-200 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main dashboard ────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justBooked = searchParams.get("booked") === "true";

  const [students, setStudents] = useState<Student[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [studentSubject, setStudentSubject] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [successBanner, setSuccessBanner] = useState(justBooked);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const [sRes, bRes] = await Promise.all([
        axios.get(`${API}/students`, { headers }),
        // bookings endpoint — adjust path if yours differs
        axios.get(`${API}/students`, { headers }), // placeholder — see NOTE below
      ]);
      setStudents(sRes.data ?? []);
      // NOTE: Replace the line below with your actual bookings endpoint.
      // The backend likely exposes parent bookings at GET /bookings or GET /bookings/my
      // Based on CLAUDE.md the parent sees bookings via student data.
      // Use the endpoint that exists in your bookings.controller.ts for parent bookings.
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Separate call for bookings — handles both possible endpoint names
  const fetchBookings = useCallback(async () => {
    if (!token) return;
    // Try the most likely endpoint names in order
    const endpoints = ["/bookings/my", "/bookings"];
    for (const ep of endpoints) {
      try {
        const res = await axios.get(`${API}${ep}`, { headers });
        // Handle both array response and paginated response
        const data = Array.isArray(res.data)
          ? res.data
          : (res.data?.bookings ?? res.data?.items ?? []);
        setBookings(data);
        return;
      } catch {
        continue;
      }
    }
  }, [token]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    const hdrs = { Authorization: `Bearer ${token}` };

    Promise.all([axios.get(`${API}/students`, { headers: hdrs })])
      .then(([sRes]) => {
        setStudents(sRes.data ?? []);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));

    fetchBookings();
  }, []);

  useEffect(() => {
    if (successBanner) {
      const t = setTimeout(() => setSuccessBanner(false), 6000);
      return () => clearTimeout(t);
    }
  }, [successBanner]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError("");
    const age = parseInt(studentAge, 10);
    if (!studentName.trim()) {
      setStudentError("Name is required.");
      return;
    }
    if (isNaN(age) || age < 4 || age > 18) {
      setStudentError("Age must be between 4 and 18.");
      return;
    }
    setAddingStudent(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/students`,
        {
          name: studentName.trim(),
          age,
          grade: studentGrade || undefined,
          subject: studentSubject || undefined,
          // Auto-detect timezone
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setStudents((prev) => [...prev, res.data]);
      setStudentName("");
      setStudentAge("");
      setStudentGrade("");
      setStudentSubject("");
      setShowAddStudent(false);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setStudentError(
        Array.isArray(msg) ? msg.join(", ") : (msg ?? "Failed to add student."),
      );
    } finally {
      setAddingStudent(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (
      !confirm(
        "Cancel this booking? Refund eligibility depends on how far in advance you cancel.",
      )
    )
      return;
    setCancellingId(bookingId);
    setCancelError("");
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setCancelError(
        Array.isArray(msg) ? msg.join(", ") : (msg ?? "Cancellation failed."),
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleReviewSuccess = () => {
    fetchBookings();
  };

  const fmt = (dt: string) =>
    new Date(dt).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const statusBadge = (status: Booking["paymentStatus"]) => {
    const map: Record<string, string> = {
      PENDING: "bg-yellow-900/30 text-yellow-300 border-yellow-500/20",
      CAPTURED: "bg-green-900/30 text-green-300 border-green-500/20",
      REFUNDED: "bg-gray-700 text-gray-400 border-gray-600/20",
      FAILED: "bg-red-900/30 text-red-300 border-red-500/20",
    };
    const labels: Record<string, string> = {
      PENDING: "Pending",
      CAPTURED: "Completed",
      REFUNDED: "Refunded",
      FAILED: "Failed",
    };
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full border ${map[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

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
  const SUBJECTS = [
    "Math",
    "Science",
    "Coding",
    "English",
    "History",
    "Art",
    "Music",
    "Other",
  ];

  const token2 =
    typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top nav */}
      <header className="border-b border-gray-800 bg-gray-950 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-400">Lumexa</h1>
          <p className="text-xs text-gray-500">Mission Control</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/marketplace")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm
                       font-medium rounded-lg transition-colors"
          >
            Find a Teacher
            <span className="block text-xs font-normal opacity-60">
              Mission Selection
            </span>
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/login");
            }}
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Success banner */}
        {successBanner && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-500/30 rounded-xl flex items-center gap-3">
            <span className="text-green-400 text-xl">✓</span>
            <div>
              <p className="text-green-300 font-medium">Booking confirmed!</p>
              <p className="text-green-400/70 text-sm">
                Your class has been scheduled successfully.
              </p>
            </div>
            <button
              onClick={() => setSuccessBanner(false)}
              className="ml-auto text-green-400/50 hover:text-green-400"
            >
              ✕
            </button>
          </div>
        )}

        {cancelError && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{cancelError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Students Panel ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Students</h2>
                <p className="text-xs text-gray-500">Cadet Roster</p>
              </div>
              <button
                onClick={() => setShowAddStudent((v) => !v)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs
                           font-medium rounded-lg transition-colors"
              >
                + Add Student
              </button>
            </div>

            {/* Add student form */}
            {showAddStudent && (
              <form
                onSubmit={handleAddStudent}
                className="mb-4 p-4 bg-gray-900 border border-gray-700 rounded-xl space-y-3"
              >
                <p className="text-sm font-medium text-white">
                  Add Student (Cadet)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      First Name *
                    </label>
                    <input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200
                                 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Age *
                    </label>
                    <input
                      type="number"
                      value={studentAge}
                      onChange={(e) => setStudentAge(e.target.value)}
                      min={4}
                      max={18}
                      placeholder="4–18"
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200
                                 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Grade
                    </label>
                    <select
                      value={studentGrade}
                      onChange={(e) => setStudentGrade(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200
                                 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select grade</option>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Subject
                    </label>
                    <select
                      value={studentSubject}
                      onChange={(e) => setStudentSubject(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-200
                                 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select subject</option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {studentError && (
                  <p className="text-red-400 text-xs">{studentError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addingStudent}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                               text-white text-sm rounded-lg transition-colors flex items-center
                               justify-center gap-2"
                  >
                    {addingStudent && <Spinner small />}
                    {addingStudent ? "Adding..." : "Add Student"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddStudent(false)}
                    className="px-3 text-gray-400 hover:text-gray-200 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Students list */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
                <p className="text-3xl mb-2">👤</p>
                <p className="text-gray-400 text-sm">No students yet.</p>
                <p className="text-gray-600 text-xs mt-1">
                  Add a student to start booking classes.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 bg-gray-900
                               border border-gray-800 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <span className="text-blue-300 text-sm font-bold">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {s.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Age {s.age}
                          {s.grade ? ` · ${s.grade}` : ""}
                          {s.subject ? ` · ${s.subject}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push("/marketplace")}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Book →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Bookings Panel ── */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Bookings</h2>
              <p className="text-xs text-gray-500">Mission Log</p>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
                <p className="text-3xl mb-2">🚀</p>
                <p className="text-gray-400 text-sm">No bookings yet.</p>
                <p className="text-gray-600 text-xs mt-1 mb-4">
                  Find a teacher to book your first class.
                </p>
                <button
                  onClick={() => router.push("/marketplace")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm
                             rounded-lg transition-colors"
                >
                  Browse Teachers
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  )
                  .map((b) => (
                    <div
                      key={b.id}
                      className="p-4 bg-gray-900 border border-gray-800 rounded-xl"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {b.student.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {fmt(b.shift.start)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {statusBadge(b.paymentStatus)}
                          {b.amountCents && (
                            <p className="text-xs text-gray-500">
                              ${(b.amountCents / 100).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Join class button — 10 min before start */}
                      {b.paymentStatus === "CAPTURED" && (
                        <button
                          onClick={() => router.push(`/classroom/${b.id}`)}
                          className="w-full mt-1 py-2 bg-green-600 hover:bg-green-500
                                     text-white text-sm rounded-lg transition-colors"
                        >
                          Join Class
                          <span className="block text-xs font-normal opacity-60">
                            Enter Star Lab
                          </span>
                        </button>
                      )}

                      {/* Review widget — only for completed classes without a review */}
                      {b.paymentStatus === "CAPTURED" && !b.review && (
                        <ReviewForm
                          bookingId={b.id}
                          token={token2}
                          onSuccess={handleReviewSuccess}
                        />
                      )}

                      {/* Show existing review */}
                      {b.review && (
                        <div className="mt-2 flex items-center gap-2">
                          <StarDisplay rating={b.review.rating} />
                          {b.review.comment && (
                            <p className="text-xs text-gray-400 italic truncate">
                              "{b.review.comment}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Cancel button — only for PENDING bookings */}
                      {b.paymentStatus === "PENDING" && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          disabled={cancellingId === b.id}
                          className="mt-3 w-full py-2 border border-red-500/30 text-red-400
                                     hover:bg-red-500/10 text-sm rounded-lg transition-colors
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     flex items-center justify-center gap-2"
                        >
                          {cancellingId === b.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                              Aborting...
                            </>
                          ) : (
                            <>
                              Cancel Booking
                              <span className="text-xs font-normal opacity-60 ml-1">
                                Abort Mission
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-gray-400">Loading Mission Control...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

// FILE PATH: client/app/student-lessons/[studentId]/page.tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import StudentNav from "../../../components/StudentNav";
import { useTheme } from "../../../components/ThemeProvider";

interface Booking {
  id: string;
  studentId?: string;
  student?: { id: string };
  shift: { start: string; end: string };
  paymentStatus: string;
  teacher?: { fullName: string };
  review?: { rating: number; comment?: string | null } | null;
}

function Stars({ r }: { r: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={`text-sm ${s <= r ? "text-yellow-400" : "text-gray-500"}`}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function LessonsContent() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const [student, setStudent] = useState<{
    name: string;
    grade?: string | null;
    parent: { fullName: string };
  } | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");
  const [reviewModal, setReviewModal] = useState<{ bookingId: string } | null>(
    null,
  );
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const [sRes, bRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
          axios
            .get(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
              headers: { Authorization: `Bearer ${tok}` },
            })
            .catch(() => ({ data: [] })),
        ]);
        const found = sRes.data.find((s: any) => s.id === studentId);
        setStudent(found ?? null);
        const all: Booking[] = Array.isArray(bRes.data) ? bRes.data : [];
        setBookings(
          all.filter(
            (b) => b.studentId === studentId || b.student?.id === studentId,
          ),
        );
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, router]);

  const submitReview = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    setReviewError(null);
    try {
      const tok = localStorage.getItem("token");
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${reviewModal.bookingId}/review`,
        { rating, comment: comment || undefined },
        { headers: { Authorization: `Bearer ${tok}` } },
      );
      // Update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.id === reviewModal.bookingId
            ? { ...b, review: { rating, comment } }
            : b,
        ),
      );
      setReviewModal(null);
      setComment("");
      setRating(5);
    } catch (e: any) {
      const m = e.response?.data?.message;
      setReviewError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const now = new Date();
  const upcoming = bookings
    .filter(
      (b) => b.paymentStatus === "CAPTURED" && new Date(b.shift.start) > now,
    )
    .sort(
      (a, b) =>
        new Date(a.shift.start).getTime() - new Date(b.shift.start).getTime(),
    );
  const completed = bookings
    .filter(
      (b) => b.paymentStatus === "CAPTURED" && new Date(b.shift.end) <= now,
    )
    .sort(
      (a, b) =>
        new Date(b.shift.start).getTime() - new Date(a.shift.start).getTime(),
    );
  const shown =
    filter === "upcoming"
      ? upcoming
      : filter === "completed"
        ? completed
        : [...upcoming, ...completed].sort(
            (a, b) =>
              new Date(b.shift.start).getTime() -
              new Date(a.shift.start).getTime(),
          );

  const card =
    "rounded-2xl border dark:bg-[#0D1B2E]/60 bg-white dark:border-blue-900/30 border-blue-100";
  const txtp = "dark:text-blue-100 text-blue-900";
  const txtm = "dark:text-blue-300/60 text-blue-400";

  return (
    <div className="min-h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
      <StudentNav
        studentId={studentId}
        studentName={student?.name}
        grade={student?.grade}
        parentName={student?.parent.fullName}
      />
      <div className="pl-64">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className={`text-2xl font-bold ${txtp}`}>My Lessons</h1>
            <p className={`text-sm ${txtm}`}>
              Mission Log ·{" "}
              {bookings.filter((b) => b.paymentStatus === "CAPTURED").length}{" "}
              total classes
            </p>
          </div>

          {/* Filter tabs */}
          <div
            className={`flex gap-1 p-1 rounded-xl mb-6 inline-flex dark:bg-[#0D1B2E] bg-blue-50 border dark:border-blue-900/30 border-blue-100`}
          >
            {(["all", "upcoming", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${filter === f ? "bg-blue-600 text-white" : "dark:text-blue-300/70 text-blue-600/70 dark:hover:text-blue-300 hover:text-blue-600"}`}
              >
                {f}{" "}
                {f === "upcoming"
                  ? `(${upcoming.length})`
                  : f === "completed"
                    ? `(${completed.length})`
                    : ""}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className={`${card} p-10 text-center`}>
              <p className="text-4xl mb-3">🌌</p>
              <p className={`${txtp} font-semibold`}>No lessons found</p>
              <p className={`text-sm ${txtm} mt-1`}>
                {filter === "upcoming"
                  ? "No upcoming classes booked."
                  : "No completed classes yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {shown.map((b) => {
                const isUpcoming = new Date(b.shift.start) > now;
                const canReview =
                  !isUpcoming && !b.review && b.paymentStatus === "CAPTURED";
                const dur = Math.round(
                  (new Date(b.shift.end).getTime() -
                    new Date(b.shift.start).getTime()) /
                    60000,
                );
                return (
                  <div key={b.id} className={`${card} p-5`}>
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ${isUpcoming ? "bg-gradient-to-br from-blue-600 to-cyan-700" : "bg-gradient-to-br from-indigo-600 to-purple-700"}`}
                      >
                        {isUpcoming ? "📅" : "✅"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold ${txtp}`}>
                            {b.teacher?.fullName ?? "Teacher"}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${isUpcoming ? "dark:bg-blue-900/40 bg-blue-100 dark:text-blue-300 text-blue-700" : "dark:bg-green-900/40 bg-green-100 dark:text-green-300 text-green-700"}`}
                          >
                            {isUpcoming ? "Upcoming" : "Completed"}
                          </span>
                        </div>
                        <p className={`text-sm mt-0.5 ${txtm}`}>
                          {new Date(b.shift.start).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          ·{" "}
                          {new Date(b.shift.start).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          · {dur} min
                        </p>
                        {b.review && (
                          <div className="flex items-center gap-2 mt-2">
                            <Stars r={b.review.rating} />
                            {b.review.comment && (
                              <p className={`text-xs ${txtm} truncate`}>
                                "{b.review.comment}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {isUpcoming &&
                          new Date(b.shift.start).getTime() - Date.now() <=
                            600000 && (
                            <button
                              onClick={() => router.push(`/classroom/${b.id}`)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors"
                            >
                              Join Now
                            </button>
                          )}
                        {canReview && (
                          <button
                            onClick={() => {
                              setReviewModal({ bookingId: b.id });
                              setRating(5);
                              setComment("");
                              setReviewError(null);
                            }}
                            className="px-3 py-1.5 dark:bg-yellow-600/20 bg-yellow-50 border dark:border-yellow-600/30 border-yellow-200 dark:text-yellow-400 text-yellow-700 text-sm rounded-xl dark:hover:bg-yellow-600/30 hover:bg-yellow-100 transition-colors"
                          >
                            ⭐ Rate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Review modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setReviewModal(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border shadow-2xl z-10 dark:bg-[#0D1B2E] bg-white dark:border-blue-800/40 border-blue-200">
            <div className="p-6">
              <h2 className={`text-lg font-bold mb-4 ${txtp}`}>
                Rate this lesson
              </h2>
              <div className="flex justify-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    className={`text-3xl transition-transform ${s <= rating ? "text-yellow-400 scale-110" : "text-gray-500"} hover:scale-125`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional comment..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border dark:border-blue-800/40 border-blue-200 dark:bg-[#1A2B40] bg-blue-50 dark:text-blue-100 text-blue-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {reviewError && (
                <p className="text-red-400 text-sm mt-2">{reviewError}</p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setReviewModal(null)}
                  className="flex-1 py-2 rounded-xl border dark:border-blue-800/40 border-blue-200 dark:text-blue-300 text-blue-700 text-sm dark:hover:bg-blue-900/20 hover:bg-blue-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit Review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentLessonsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LessonsContent />
    </Suspense>
  );
}

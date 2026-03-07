"use client";

// FILE PATH: client/app/dashboard/page.tsx

import { useEffect, useState, Suspense } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
// ─── LUMI CHATBOT ──────────────────────────────────────────────────────────────
import LumiChat from "../../components/LumiChat";
// ──────────────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  age: number;
  bookings: {
    id: string;
    paymentStatus: string;
    shift: {
      start: string;
      end: string;
    };
  }[];
}

// ─── Inner component — uses useSearchParams ───────────────────────────────────
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAge, setNewStudentAge] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Show success banner when redirected back from mock payment
    if (searchParams.get("booked") === "true") {
      setSuccessMessage("🎉 Lesson booked! Your student's class is confirmed.");
    }

    fetchStudents(token);
  }, []);

  const fetchStudents = async (token: string) => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/students`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setStudents(res.data);
      setLoading(false);
    } catch {
      localStorage.removeItem("token");
      router.push("/login");
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    setFormError("");

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/students`,
        { name: newStudentName, age: Number(newStudentAge) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNewStudentName("");
      setNewStudentAge("");
      fetchStudents(token);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setFormError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to add student.",
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CAPTURED":
        return (
          <span className="text-xs px-2 py-0.5 bg-green-900/40 text-green-400 border border-green-800 rounded">
            Paid ✓
          </span>
        );
      case "PENDING":
        return (
          <span className="text-xs px-2 py-0.5 bg-yellow-900/40 text-yellow-400 border border-yellow-800 rounded">
            Pending
          </span>
        );
      case "REFUNDED":
        return (
          <span className="text-xs px-2 py-0.5 bg-gray-900/40 text-gray-500 border border-gray-700 rounded">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-mono">
        <div className="text-center">
          <div className="text-blue-400 text-2xl animate-pulse mb-2">●</div>
          <p className="text-gray-400">Loading Dashboard...</p>
          <p className="text-gray-600 text-xs mt-1">Mission Control</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      {/* ── Header ── */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-500 tracking-widest uppercase">
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">Mission Control</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-red-400 hover:text-red-300 border border-red-900 px-4 py-2 rounded hover:bg-red-900/20 transition-all"
        >
          Logout
          <span className="block text-xs text-gray-600 font-normal">
            Abort Mission
          </span>
        </button>
      </div>

      {/* ── Success Banner ── */}
      {successMessage && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg text-green-400 text-sm flex justify-between items-center">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage("")}
            className="text-gray-500 hover:text-gray-300 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT: Student Roster */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-purple-400 flex items-center">
            <span className="mr-2">🚀</span> Your Students
            <span className="ml-2 text-xs text-gray-600 font-normal normal-case">
              Active Cadets
            </span>
          </h2>

          <div className="space-y-4">
            {students.length === 0 ? (
              <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg text-center text-gray-500">
                <p>No students yet.</p>
                <p className="text-xs mt-1 text-gray-600">
                  Add your first student to get started
                </p>
              </div>
            ) : (
              students.map((student) => {
                const activeBookings = student.bookings.filter(
                  (b) => b.paymentStatus !== "REFUNDED",
                );

                return (
                  <div
                    key={student.id}
                    className="p-4 bg-gray-900 border border-gray-800 rounded-lg shadow-lg"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h3 className="font-bold text-white text-lg">
                          {student.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Student · Cadet · Age {student.age}
                        </p>
                      </div>
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>

                    {/* Upcoming Lessons */}
                    <div className="space-y-2 mt-2 pt-2 border-t border-gray-800">
                      {activeBookings.length === 0 ? (
                        <p className="text-xs text-gray-600 italic">
                          No lessons scheduled
                        </p>
                      ) : (
                        activeBookings.map((b) => (
                          <div
                            key={b.id}
                            className="text-sm bg-black/50 p-2 rounded border border-gray-800 flex justify-between items-center gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-gray-300">
                                📅{" "}
                                {new Date(b.shift.start).toLocaleDateString(
                                  undefined,
                                  {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                                {" · "}
                                {new Date(b.shift.start).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </div>
                              <div className="mt-1">
                                {getStatusBadge(b.paymentStatus)}
                              </div>
                            </div>
                            <button
                              onClick={() => router.push(`/classroom/${b.id}`)}
                              className="shrink-0 px-3 py-1 bg-green-600/20 border border-green-500 text-green-400 text-xs rounded hover:bg-green-600 hover:text-white transition-all font-bold tracking-wider"
                            >
                              Join Class
                              <span className="block text-xs font-normal opacity-60">
                                Star Lab
                              </span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Book a Lesson */}
                    <button
                      onClick={() => router.push("/marketplace")}
                      className="w-full mt-3 text-xs bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 py-2 rounded border border-blue-900 transition-colors"
                    >
                      + Book a Lesson
                      <span className="ml-1 text-gray-600">
                        · Assign Mission
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Add New Student */}
        <div>
          <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-xl shadow-2xl">
            <h2 className="text-xl font-semibold mb-1 text-green-400">
              Add a Student
            </h2>
            <p className="text-gray-600 text-xs mb-6">Recruit New Cadet</p>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="e.g. Alex"
                  required
                  minLength={2}
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={newStudentAge}
                  onChange={(e) => setNewStudentAge(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="e.g. 10"
                  required
                  min={4}
                  max={18}
                />
              </div>

              {formError && (
                <p className="text-red-400 text-xs bg-red-900/20 border border-red-900 rounded p-2">
                  ⚠️ {formError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all transform active:scale-95"
              >
                Add Student
                <span className="block text-xs font-normal opacity-70">
                  Confirm Recruitment
                </span>
              </button>
            </form>
          </div>

          {/* Quick Link to Marketplace */}
          {students.length > 0 && (
            <button
              onClick={() => router.push("/marketplace")}
              className="w-full mt-4 p-4 bg-green-900/20 border border-green-800 rounded-xl text-green-400 hover:bg-green-900/40 transition-all text-left"
            >
              <p className="font-bold">Browse Available Teachers →</p>
              <p className="text-xs text-gray-500 mt-1">
                Find a lesson · Mission Selection
              </p>
            </button>
          )}
        </div>
      </div>

      {/* ─── LUMI CHATBOT ───────────────────────────────────────────────────────
          Fixed bottom-right. variant="parent" → blue theme, Commander persona.
          context tells Lumi the parent is on their main dashboard.
      ─────────────────────────────────────────────────────────────────────── */}
      <LumiChat
        variant="parent"
        context="Parent dashboard — managing student roster and upcoming lessons"
      />
      {/* ──────────────────────────────────────────────────────────────────── */}
    </div>
  );
}

// ─── Default export with Suspense boundary ────────────────────────────────────
export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white font-mono">
          <div className="animate-pulse text-blue-400">
            Loading Dashboard...
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

// // FILE PATH: client/app/dashboard/page.tsx
// "use client";

// import { Suspense, useEffect, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { useTheme } from "../../components/ThemeProvider";
// import { ThemeToggle } from "../../components/ThemeProvider";
// import Image from "next/image";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface Student {
//   id: string;
//   name: string;
//   age: number;
//   grade?: string | null;
//   subject?: string | null;
// }

// interface Booking {
//   id: string;
//   studentId: string;
//   student?: { id: string; name: string };
//   paymentStatus: "PENDING" | "CAPTURED" | "REFUNDED" | "FAILED";
//   amountCents?: number | null;
//   createdAt: string;
//   shift: {
//     start: string;
//     end: string;
//     teacher?: {
//       user: { fullName: string; avatarUrl?: string | null };
//       hourlyRate: number;
//     };
//   };
//   review?: { rating: number; comment?: string | null } | null;
// }

// interface User {
//   id: string;
//   email: string;
//   fullName: string;
//   role: string;
// }

// // ─── Status badge ─────────────────────────────────────────────────────────────

// function StatusBadge({ status }: { status: string }) {
//   const map: Record<string, string> = {
//     PENDING:
//       "dark:bg-yellow-900/40 bg-yellow-100 dark:text-yellow-300 text-yellow-700 dark:border-yellow-700/30 border-yellow-200",
//     CAPTURED:
//       "dark:bg-green-900/40 bg-green-100 dark:text-green-300 text-green-700 dark:border-green-700/30 border-green-200",
//     REFUNDED:
//       "dark:bg-gray-800/40 bg-gray-100 dark:text-gray-400 text-gray-500 dark:border-gray-700/30 border-gray-200",
//     FAILED:
//       "dark:bg-red-900/40 bg-red-100 dark:text-red-400 text-red-600 dark:border-red-700/30 border-red-200",
//   };
//   const labels: Record<string, string> = {
//     PENDING: "Pending",
//     CAPTURED: "Confirmed",
//     REFUNDED: "Refunded",
//     FAILED: "Failed",
//   };
//   return (
//     <span
//       className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? map.PENDING}`}
//     >
//       {labels[status] ?? status}
//     </span>
//   );
// }

// // ─── Star rating display ──────────────────────────────────────────────────────

// function Stars({ rating }: { rating: number }) {
//   return (
//     <span className="flex gap-0.5">
//       {[1, 2, 3, 4, 5].map((s) => (
//         <span
//           key={s}
//           className={`text-sm ${s <= rating ? "text-yellow-400" : "dark:text-gray-600 text-gray-300"}`}
//         >
//           ★
//         </span>
//       ))}
//     </span>
//   );
// }

// // ─── Review modal ─────────────────────────────────────────────────────────────

// interface ReviewModalProps {
//   bookingId: string;
//   onClose: () => void;
//   onSubmitted: (bookingId: string, rating: number, comment: string) => void;
// }

// function ReviewModal({ bookingId, onClose, onSubmitted }: ReviewModalProps) {
//   const [rating, setRating] = useState(5);
//   const [comment, setComment] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const submit = async () => {
//     setSubmitting(true);
//     setError(null);
//     try {
//       const token = localStorage.getItem("token");
//       await axios.post(
//         `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/review`,
//         { rating, comment: comment || undefined },
//         { headers: { Authorization: `Bearer ${token}` } },
//       );
//       onSubmitted(bookingId, rating, comment);
//       onClose();
//     } catch (e: any) {
//       const m = e.response?.data?.message;
//       setError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed to submit"));
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//       <div
//         className="absolute inset-0 bg-black/60 backdrop-blur-sm"
//         onClick={onClose}
//       />
//       <div className="relative w-full max-w-sm rounded-2xl border shadow-2xl z-10 dark:bg-[#0D1226] bg-white dark:border-blue-900/40 border-blue-200">
//         <div className="p-6">
//           <h2 className="text-lg font-bold dark:text-blue-100 text-blue-900 mb-1">
//             Rate this lesson
//           </h2>
//           <p className="text-sm dark:text-blue-400/60 text-blue-400 mb-4">
//             How was the class?
//           </p>
//           <div className="flex justify-center gap-3 mb-4">
//             {[1, 2, 3, 4, 5].map((s) => (
//               <button
//                 key={s}
//                 onClick={() => setRating(s)}
//                 className={`text-4xl transition-transform ${s <= rating ? "text-yellow-400 scale-110" : "dark:text-gray-600 text-gray-300"} hover:scale-125`}
//               >
//                 ★
//               </button>
//             ))}
//           </div>
//           <textarea
//             value={comment}
//             onChange={(e) => setComment(e.target.value)}
//             placeholder="Optional comment…"
//             rows={3}
//             className="w-full px-3 py-2 rounded-xl border dark:border-blue-800/40 border-blue-200 dark:bg-[#1A2540] bg-blue-50 dark:text-blue-100 text-blue-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//           {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
//           <div className="flex gap-3 mt-4">
//             <button
//               onClick={onClose}
//               className="flex-1 py-2 rounded-xl border dark:border-blue-800/40 border-blue-200 dark:text-blue-300 text-blue-700 text-sm dark:hover:bg-blue-900/20 hover:bg-blue-50 transition-colors"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={submit}
//               disabled={submitting}
//               className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
//             >
//               {submitting ? "Submitting…" : "Submit ⭐"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Add Student modal ────────────────────────────────────────────────────────

// interface AddStudentModalProps {
//   onClose: () => void;
//   onAdded: (student: Student) => void;
// }

// function AddStudentModal({ onClose, onAdded }: AddStudentModalProps) {
//   const [name, setName] = useState("");
//   const [age, setAge] = useState("");
//   const [grade, setGrade] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const submit = async () => {
//     if (!name.trim()) {
//       setError("Name is required");
//       return;
//     }
//     if (!age || isNaN(+age) || +age < 3 || +age > 18) {
//       setError("Age must be 3–18");
//       return;
//     }
//     setSubmitting(true);
//     setError(null);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.post(
//         `${process.env.NEXT_PUBLIC_API_URL}/students`,
//         { name: name.trim(), age: +age, grade: grade.trim() || undefined },
//         { headers: { Authorization: `Bearer ${token}` } },
//       );
//       onAdded(res.data);
//       onClose();
//     } catch (e: any) {
//       const m = e.response?.data?.message;
//       setError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed"));
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//       <div
//         className="absolute inset-0 bg-black/60 backdrop-blur-sm"
//         onClick={onClose}
//       />
//       <div className="relative w-full max-w-sm rounded-2xl border shadow-2xl z-10 dark:bg-[#090F1E] bg-white dark:border-blue-900/40 border-blue-200">
//         <div className="p-6">
//           <h2 className="text-lg font-bold dark:text-blue-100 text-blue-900 mb-0.5">
//             Add Student
//           </h2>
//           <p className="text-sm dark:text-blue-400/60 text-blue-400 mb-4">
//             Recruit Cadet
//           </p>
//           <div className="space-y-3">
//             <div>
//               <label className="block text-xs dark:text-blue-300/70 text-blue-500 mb-1 font-medium">
//                 First name only *
//               </label>
//               <input
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 placeholder="E.g. Emma"
//                 className="w-full px-3 py-2 rounded-xl border dark:border-blue-800/40 border-blue-200 dark:bg-[#1A2540] bg-blue-50 dark:text-blue-100 text-blue-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//             <div>
//               <label className="block text-xs dark:text-blue-300/70 text-blue-500 mb-1 font-medium">
//                 Age (3–18) *
//               </label>
//               <input
//                 type="number"
//                 min={3}
//                 max={18}
//                 value={age}
//                 onChange={(e) => setAge(e.target.value)}
//                 placeholder="12"
//                 className="w-full px-3 py-2 rounded-xl border dark:border-blue-800/40 border-blue-200 dark:bg-[#1A2540] bg-blue-50 dark:text-blue-100 text-blue-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//             <div>
//               <label className="block text-xs dark:text-blue-300/70 text-blue-500 mb-1 font-medium">
//                 Grade (optional)
//               </label>
//               <input
//                 value={grade}
//                 onChange={(e) => setGrade(e.target.value)}
//                 placeholder="E.g. Grade 6"
//                 className="w-full px-3 py-2 rounded-xl border dark:border-blue-800/40 border-blue-200 dark:bg-[#1A2540] bg-blue-50 dark:text-blue-100 text-blue-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//           </div>
//           {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
//           <p className="text-xs dark:text-blue-400/40 text-blue-300 mt-3">
//             🔒 COPPA compliant — first name only, no other personal data stored.
//           </p>
//           <div className="flex gap-3 mt-4">
//             <button
//               onClick={onClose}
//               className="flex-1 py-2 rounded-xl border dark:border-blue-800/40 border-blue-200 dark:text-blue-300 text-blue-700 text-sm dark:hover:bg-blue-900/20 hover:bg-blue-50 transition-colors"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={submit}
//               disabled={submitting}
//               className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
//             >
//               {submitting ? "Adding…" : "Add Cadet 🚀"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Main Dashboard ───────────────────────────────────────────────────────────

// function DashboardContent() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { isDark } = useTheme();

//   const [user, setUser] = useState<User | null>(null);
//   const [students, setStudents] = useState<Student[]>([]);
//   const [bookings, setBookings] = useState<Booking[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [showAddStudent, setShowAddStudent] = useState(false);
//   const [reviewModal, setReviewModal] = useState<string | null>(null); // bookingId
//   const [cancellingId, setCancellingId] = useState<string | null>(null);
//   const [successBanner, setSuccessBanner] = useState(false);

//   // Show success banner if redirected from mock-payment
//   useEffect(() => {
//     if (searchParams.get("booked") === "true") {
//       setSuccessBanner(true);
//       const t = setTimeout(() => setSuccessBanner(false), 5000);
//       return () => clearTimeout(t);
//     }
//   }, [searchParams]);

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       router.push("/login");
//       return;
//     }

//     const userData = localStorage.getItem("user");
//     if (userData) {
//       try {
//         setUser(JSON.parse(userData));
//       } catch (_) {}
//     }

//     (async () => {
//       try {
//         const [stuRes, bookRes] = await Promise.all([
//           axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           axios
//             .get(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
//               headers: { Authorization: `Bearer ${token}` },
//             })
//             .catch(() => ({ data: [] })),
//         ]);
//         setStudents(stuRes.data);
//         setBookings(Array.isArray(bookRes.data) ? bookRes.data : []);
//       } catch (e: any) {
//         const m = e.response?.data?.message;
//         setError(
//           Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load dashboard"),
//         );
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [router]);

//   const handleCancelBooking = async (bookingId: string) => {
//     if (
//       !confirm(
//         "Cancel this booking? A refund will be calculated based on timing.",
//       )
//     )
//       return;
//     setCancellingId(bookingId);
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(
//         `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`,
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         },
//       );
//       setBookings((prev) => prev.filter((b) => b.id !== bookingId));
//     } catch (e: any) {
//       const m = e.response?.data?.message;
//       alert(Array.isArray(m) ? m.join(", ") : (m ?? "Failed to cancel"));
//     } finally {
//       setCancellingId(null);
//     }
//   };

//   const handleReviewSubmitted = (
//     bookingId: string,
//     rating: number,
//     comment: string,
//   ) => {
//     setBookings((prev) =>
//       prev.map((b) =>
//         b.id === bookingId ? { ...b, review: { rating, comment } } : b,
//       ),
//     );
//   };

//   // Booking lookup helpers
//   const getStudentBookings = (studentId: string) =>
//     bookings.filter(
//       (b) => b.studentId === studentId || b.student?.id === studentId,
//     );

//   const upcomingBookings = bookings
//     .filter(
//       (b) =>
//         b.paymentStatus === "CAPTURED" && new Date(b.shift.start) > new Date(),
//     )
//     .sort(
//       (a, b) =>
//         new Date(a.shift.start).getTime() - new Date(b.shift.start).getTime(),
//     );

//   if (loading)
//     return (
//       <div className="flex items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
//         <div className="text-center">
//           <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
//           <p className="dark:text-blue-400 text-blue-500 text-sm mt-4">
//             Loading Mission Control…
//           </p>
//         </div>
//       </div>
//     );

//   // Tailwind v4 classes — dark: works via @custom-variant in globals.css
//   const card =
//     "rounded-2xl border dark:bg-[#0D1B2E]/60 bg-white dark:border-blue-900/30 border-blue-100 shadow-sm";

//   return (
//     <div className="min-h-screen dark:bg-[#050D1A] bg-[#F0F5FF] transition-colors">
//       {/* ── Top nav bar ──────────────────────────────────────────────────── */}
//       <header className="sticky top-0 z-30 border-b dark:border-blue-900/30 border-blue-100 dark:bg-[#050D1A]/95 bg-[#F0F5FF]/95 backdrop-blur-md">
//         <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold select-none">
//               <Image
//                 src="https://res.cloudinary.com/dunx0blwp/image/upload/v1772141559/logo_yr5wyw.jpg"
//                 width={32}
//                 height={32}
//                 alt="Lumexa"
//               />
//             </div>
//             <div>
//               <h1 className="text-lg font-bold text-blue-500 leading-none">
//                 Lumexa
//               </h1>
//               <p className="text-xs dark:text-blue-400/60 text-blue-400 leading-none">
//                 Mission Control
//               </p>
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <button
//               onClick={() => router.push("/marketplace")}
//               className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-1.5"
//             >
//               🔭 Find a Teacher
//               <span className="hidden sm:inline text-xs opacity-70">
//                 Mission Selection
//               </span>
//             </button>
//             <ThemeToggle variant="student" />
//             <button
//               onClick={() => {
//                 localStorage.removeItem("token");
//                 window.location.href = "/login";
//               }}
//               className="text-sm dark:text-blue-400/60 text-blue-400 dark:hover:text-blue-300 hover:text-blue-600 transition-colors px-2"
//             >
//               Log out
//             </button>
//           </div>
//         </div>
//       </header>

//       <main className="max-w-6xl mx-auto px-6 py-8">
//         {/* ── Success banner ────────────────────────────────────────────── */}
//         {successBanner && (
//           <div className="mb-6 p-4 rounded-2xl bg-green-900/30 border border-green-600/40 flex items-center gap-3 fade-in">
//             <span className="text-2xl">🎉</span>
//             <div className="flex-1">
//               <p className="text-green-300 font-semibold">
//                 Mission booked successfully!
//               </p>
//               <p className="text-green-400/70 text-sm">
//                 Your class is confirmed. Check the schedule below.
//               </p>
//             </div>
//             <button
//               onClick={() => setSuccessBanner(false)}
//               className="text-green-400 hover:text-green-300 text-lg leading-none"
//             >
//               ✕
//             </button>
//           </div>
//         )}

//         {error && (
//           <div className="mb-6 p-4 rounded-2xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
//             {error}
//           </div>
//         )}

//         {/* ── Welcome row ───────────────────────────────────────────────── */}
//         <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
//           <div>
//             <h2 className="text-2xl font-bold dark:text-blue-100 text-blue-900">
//               Welcome back, {user?.fullName?.split(" ")[0] ?? "Commander"} 👋
//             </h2>
//             <p className="text-sm dark:text-blue-400/60 text-blue-400 mt-0.5">
//               Commander Dashboard · {students.length} cadet
//               {students.length !== 1 ? "s" : ""} enrolled
//             </p>
//           </div>

//           {/* Quick stats chips */}
//           <div className="flex items-center gap-3 flex-wrap">
//             {[
//               { icon: "📅", label: "Upcoming", value: upcomingBookings.length },
//               {
//                 icon: "📚",
//                 label: "Total Classes",
//                 value: bookings.filter((b) => b.paymentStatus === "CAPTURED")
//                   .length,
//               },
//             ].map((s) => (
//               <div
//                 key={s.label}
//                 className={`${card} px-4 py-2.5 flex items-center gap-2`}
//               >
//                 <span>{s.icon}</span>
//                 <div>
//                   <p className="text-lg font-bold leading-tight dark:text-blue-100 text-blue-900">
//                     {s.value}
//                   </p>
//                   <p className="text-xs dark:text-blue-400/60 text-blue-400">
//                     {s.label}
//                   </p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* ── Upcoming classes (if any) ─────────────────────────────────── */}
//         {upcomingBookings.length > 0 && (
//           <div className="mb-8">
//             <p className="text-xs uppercase tracking-wide font-medium dark:text-blue-400/60 text-blue-400 mb-3">
//               Upcoming Classes
//             </p>
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
//               {upcomingBookings.slice(0, 3).map((b) => {
//                 const studentForBooking = students.find(
//                   (s) => s.id === (b.studentId ?? b.student?.id),
//                 );
//                 const joinable =
//                   new Date(b.shift.start).getTime() - Date.now() <= 600000;
//                 return (
//                   <div
//                     key={b.id}
//                     className={`${card} p-4 relative overflow-hidden`}
//                   >
//                     {joinable && (
//                       <div className="absolute top-3 right-3">
//                         <span className="relative flex h-2.5 w-2.5">
//                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
//                           <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
//                         </span>
//                       </div>
//                     )}
//                     <div className="flex items-center gap-3 mb-3">
//                       <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
//                         {studentForBooking?.name?.charAt(0)?.toUpperCase() ??
//                           "?"}
//                       </div>
//                       <div className="min-w-0">
//                         <p className="text-sm font-semibold dark:text-blue-100 text-blue-900 truncate">
//                           {studentForBooking?.name ?? "Student"}
//                         </p>
//                         <p className="text-xs dark:text-blue-400/60 text-blue-400">
//                           with {b.shift.teacher?.user.fullName ?? "Teacher"}
//                         </p>
//                       </div>
//                     </div>
//                     <p className="text-xs dark:text-blue-300/70 text-blue-500 mb-3">
//                       {new Date(b.shift.start).toLocaleDateString("en-US", {
//                         weekday: "short",
//                         month: "short",
//                         day: "numeric",
//                       })}{" "}
//                       ·{" "}
//                       {new Date(b.shift.start).toLocaleTimeString("en-US", {
//                         hour: "numeric",
//                         minute: "2-digit",
//                       })}
//                     </p>
//                     {joinable && (
//                       <button
//                         onClick={() => router.push(`/classroom/${b.id}`)}
//                         className="w-full py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors font-medium"
//                       >
//                         Enter Star Lab →
//                       </button>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         )}

//         {/* ── My Students ───────────────────────────────────────────────── */}
//         <div className="mb-8">
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <h3 className="text-lg font-bold dark:text-blue-100 text-blue-900">
//                 My Students
//               </h3>
//               <p className="text-sm dark:text-blue-400/60 text-blue-400">
//                 Cadet Roster
//               </p>
//             </div>
//             <button
//               onClick={() => setShowAddStudent(true)}
//               className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
//             >
//               <span>+</span>
//               <span>Add Student</span>
//               <span className="text-xs opacity-60">Recruit Cadet</span>
//             </button>
//           </div>

//           {students.length === 0 ? (
//             <div className={`${card} p-10 text-center`}>
//               <p className="text-4xl mb-3">🌌</p>
//               <p className="font-semibold dark:text-blue-100 text-blue-900">
//                 No cadets enrolled yet
//               </p>
//               <p className="text-sm dark:text-blue-400/60 text-blue-400 mt-1 mb-4">
//                 Add your first student to start booking classes
//               </p>
//               <button
//                 onClick={() => setShowAddStudent(true)}
//                 className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors font-medium"
//               >
//                 Recruit First Cadet 🚀
//               </button>
//             </div>
//           ) : (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//               {students.map((student) => {
//                 const stuBookings = getStudentBookings(student.id);
//                 const completedCount = stuBookings.filter(
//                   (b) => b.paymentStatus === "CAPTURED",
//                 ).length;
//                 const upcoming = stuBookings.filter(
//                   (b) =>
//                     b.paymentStatus === "CAPTURED" &&
//                     new Date(b.shift.start) > new Date(),
//                 );

//                 return (
//                   <div
//                     key={student.id}
//                     className={`${card} p-5 flex flex-col gap-4`}
//                   >
//                     {/* Student info */}
//                     <div className="flex items-center gap-3">
//                       <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 select-none">
//                         {student.name.charAt(0).toUpperCase()}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="font-bold dark:text-blue-100 text-blue-900 leading-tight">
//                           {student.name}
//                         </p>
//                         <p className="text-xs dark:text-blue-400/60 text-blue-400">
//                           Age {student.age}
//                           {student.grade ? ` · ${student.grade}` : ""}
//                         </p>
//                       </div>
//                     </div>

//                     {/* Mini stats */}
//                     <div className="flex gap-3">
//                       <div className="flex-1 text-center py-2 rounded-xl dark:bg-blue-900/20 bg-blue-50">
//                         <p className="text-lg font-bold dark:text-blue-200 text-blue-800">
//                           {completedCount}
//                         </p>
//                         <p className="text-xs dark:text-blue-400/60 text-blue-400">
//                           Classes
//                         </p>
//                       </div>
//                       <div className="flex-1 text-center py-2 rounded-xl dark:bg-blue-900/20 bg-blue-50">
//                         <p className="text-lg font-bold dark:text-blue-200 text-blue-800">
//                           {upcoming.length}
//                         </p>
//                         <p className="text-xs dark:text-blue-400/60 text-blue-400">
//                           Upcoming
//                         </p>
//                       </div>
//                     </div>

//                     {/* Action buttons */}
//                     <div className="flex flex-col gap-2">
//                       {/* ──────────────────────────────────────────────────────────
//                           "Open Dashboard" button — navigates to the student hub
//                           with level tiers, badges, progress, countdown timer.
//                           This is the key addition requested.
//                       ────────────────────────────────────────────────────────── */}
//                       <button
//                         onClick={() =>
//                           router.push(`/student-dashboard/${student.id}`)
//                         }
//                         className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors text-left px-4 flex items-center justify-between"
//                       >
//                         <span>🌌 Open Dashboard</span>
//                         <span className="text-xs opacity-60">Mission Hub</span>
//                       </button>

//                       <div className="flex gap-2">
//                         <button
//                           onClick={() => router.push(`/marketplace`)}
//                           className="flex-1 py-2 rounded-xl border dark:border-blue-800/40 border-blue-200 dark:text-blue-300 text-blue-700 text-xs dark:hover:bg-blue-900/20 hover:bg-blue-50 transition-colors font-medium"
//                         >
//                           📅 Book Class
//                         </button>
//                         <button
//                           onClick={() =>
//                             router.push(`/student-progress/${student.id}`)
//                           }
//                           className="flex-1 py-2 rounded-xl border dark:border-blue-800/40 border-blue-200 dark:text-blue-300 text-blue-700 text-xs dark:hover:bg-blue-900/20 hover:bg-blue-50 transition-colors font-medium"
//                         >
//                           📊 Progress
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>

//         {/* ── All Bookings ───────────────────────────────────────────────── */}
//         <div>
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <h3 className="text-lg font-bold dark:text-blue-100 text-blue-900">
//                 Booking History
//               </h3>
//               <p className="text-sm dark:text-blue-400/60 text-blue-400">
//                 All missions
//               </p>
//             </div>
//           </div>

//           {bookings.length === 0 ? (
//             <div className={`${card} p-10 text-center`}>
//               <p className="text-4xl mb-3">🛸</p>
//               <p className="font-semibold dark:text-blue-100 text-blue-900">
//                 No bookings yet
//               </p>
//               <p className="text-sm dark:text-blue-400/60 text-blue-400 mt-1 mb-4">
//                 Book your first class from the marketplace
//               </p>
//               <button
//                 onClick={() => router.push("/marketplace")}
//                 className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors font-medium"
//               >
//                 Browse Teachers 🔭
//               </button>
//             </div>
//           ) : (
//             <div className={`${card} overflow-hidden`}>
//               {/* Table header */}
//               <div className="px-5 py-3 border-b dark:border-blue-900/20 border-blue-100 hidden sm:grid grid-cols-[1fr_1fr_120px_130px_100px] gap-4">
//                 {[
//                   "Student",
//                   "Teacher & Time",
//                   "Amount",
//                   "Status",
//                   "Actions",
//                 ].map((h) => (
//                   <p
//                     key={h}
//                     className="text-xs uppercase tracking-wide font-medium dark:text-blue-400/50 text-blue-400"
//                   >
//                     {h}
//                   </p>
//                 ))}
//               </div>

//               {/* Rows */}
//               <div className="divide-y dark:divide-blue-900/20 divide-blue-100">
//                 {[...bookings]
//                   .sort(
//                     (a, b) =>
//                       new Date(b.createdAt).getTime() -
//                       new Date(a.createdAt).getTime(),
//                   )
//                   .map((booking) => {
//                     const studentForBooking = students.find(
//                       (s) =>
//                         s.id === (booking.studentId ?? booking.student?.id),
//                     );
//                     const isPast = new Date(booking.shift.end) < new Date();
//                     const isPending = booking.paymentStatus === "PENDING";
//                     const isCaptured = booking.paymentStatus === "CAPTURED";
//                     const canReview = isCaptured && isPast && !booking.review;
//                     const canCancel = isPending || (isCaptured && !isPast);
//                     const amountDisplay = booking.amountCents
//                       ? `$${(booking.amountCents / 100).toFixed(0)}`
//                       : `$${booking.shift.teacher?.hourlyRate ?? "—"}`;

//                     return (
//                       <div
//                         key={booking.id}
//                         className="px-5 py-4 flex flex-col sm:grid sm:grid-cols-[1fr_1fr_120px_130px_100px] gap-3 sm:gap-4 items-start sm:items-center dark:hover:bg-blue-900/10 hover:bg-blue-50/50 transition-colors"
//                       >
//                         {/* Student */}
//                         <div className="flex items-center gap-2 min-w-0">
//                           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
//                             {studentForBooking?.name
//                               ?.charAt(0)
//                               ?.toUpperCase() ?? "?"}
//                           </div>
//                           <div className="min-w-0">
//                             <p className="text-sm font-medium dark:text-blue-100 text-blue-900 truncate">
//                               {studentForBooking?.name ?? "Student"}
//                             </p>
//                             <p className="text-xs dark:text-blue-400/60 text-blue-400">
//                               {studentForBooking?.age
//                                 ? `Age ${studentForBooking.age}`
//                                 : ""}
//                             </p>
//                           </div>
//                         </div>

//                         {/* Teacher & Time */}
//                         <div className="min-w-0">
//                           <p className="text-sm font-medium dark:text-blue-100 text-blue-900 truncate">
//                             {booking.shift.teacher?.user.fullName ?? "Teacher"}
//                           </p>
//                           <p className="text-xs dark:text-blue-400/60 text-blue-400">
//                             {new Date(booking.shift.start).toLocaleDateString(
//                               "en-US",
//                               { month: "short", day: "numeric" },
//                             )}{" "}
//                             ·{" "}
//                             {new Date(booking.shift.start).toLocaleTimeString(
//                               "en-US",
//                               { hour: "numeric", minute: "2-digit" },
//                             )}
//                           </p>
//                         </div>

//                         {/* Amount */}
//                         <p className="text-sm font-semibold dark:text-green-400 text-green-600">
//                           {amountDisplay}
//                         </p>

//                         {/* Status */}
//                         <div className="flex flex-col gap-1">
//                           <StatusBadge status={booking.paymentStatus} />
//                           {booking.review && (
//                             <Stars rating={booking.review.rating} />
//                           )}
//                         </div>

//                         {/* Actions */}
//                         <div className="flex flex-col gap-1.5 min-w-[90px]">
//                           {/* Rate button — for completed classes with no review */}
//                           {canReview && (
//                             <button
//                               onClick={() => setReviewModal(booking.id)}
//                               className="px-2.5 py-1.5 text-xs rounded-lg dark:bg-yellow-600/20 bg-yellow-50 dark:border dark:border-yellow-600/30 border border-yellow-200 dark:text-yellow-400 text-yellow-700 dark:hover:bg-yellow-600/30 hover:bg-yellow-100 transition-colors font-medium"
//                             >
//                               ⭐ Rate
//                             </button>
//                           )}

//                           {/* Cancel button — for pending or future confirmed bookings */}
//                           {canCancel && (
//                             <button
//                               onClick={() => handleCancelBooking(booking.id)}
//                               disabled={cancellingId === booking.id}
//                               className="px-2.5 py-1.5 text-xs rounded-lg dark:bg-red-900/20 bg-red-50 dark:border dark:border-red-700/30 border border-red-200 dark:text-red-400 text-red-600 dark:hover:bg-red-900/30 hover:bg-red-100 transition-colors font-medium disabled:opacity-50"
//                             >
//                               {cancellingId === booking.id ? "…" : "✕ Cancel"}
//                             </button>
//                           )}

//                           {/* Join button — for upcoming classes within 10 min */}
//                           {isCaptured &&
//                             !isPast &&
//                             new Date(booking.shift.start).getTime() -
//                               Date.now() <=
//                               600000 && (
//                               <button
//                                 onClick={() =>
//                                   router.push(`/classroom/${booking.id}`)
//                                 }
//                                 className="px-2.5 py-1.5 text-xs rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors font-medium"
//                               >
//                                 Join →
//                               </button>
//                             )}
//                         </div>
//                       </div>
//                     );
//                   })}
//               </div>
//             </div>
//           )}
//         </div>
//       </main>

//       {/* ── Modals ────────────────────────────────────────────────────────── */}
//       {showAddStudent && (
//         <AddStudentModal
//           onClose={() => setShowAddStudent(false)}
//           onAdded={(s) => setStudents((prev) => [...prev, s])}
//         />
//       )}

//       {reviewModal && (
//         <ReviewModal
//           bookingId={reviewModal}
//           onClose={() => setReviewModal(null)}
//           onSubmitted={handleReviewSubmitted}
//         />
//       )}
//     </div>
//   );
// }

// export default function DashboardPage() {
//   return (
//     <Suspense
//       fallback={
//         <div className="flex items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
//           <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//         </div>
//       }
//     >
//       <DashboardContent />
//     </Suspense>
//   );
// }

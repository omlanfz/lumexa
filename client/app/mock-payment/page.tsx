"use client";

import { useEffect, useState, Suspense } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";

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
        { headers: { Authorization: `Bearer ${token}` } }
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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewStudentName("");
      setNewStudentAge("");
      fetchStudents(token);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setFormError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to add student.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CAPTURED":
        return <span className="text-xs px-2 py-0.5 bg-green-900/40 text-green-400 border border-green-800 rounded">Paid ✓</span>;
      case "PENDING":
        return <span className="text-xs px-2 py-0.5 bg-yellow-900/40 text-yellow-400 border border-yellow-800 rounded">Pending</span>;
      case "REFUNDED":
        return <span className="text-xs px-2 py-0.5 bg-gray-900/40 text-gray-500 border border-gray-700 rounded">Cancelled</span>;
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
          <span className="block text-xs text-gray-600 font-normal">Abort Mission</span>
        </button>
      </div>

      {/* ── Success Banner ── */}
      {successMessage && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg text-green-400 text-sm flex justify-between items-center">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="text-gray-500 hover:text-gray-300 ml-4">✕</button>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* LEFT: Student Roster */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-purple-400 flex items-center">
            <span className="mr-2">🚀</span> Your Students
            <span className="ml-2 text-xs text-gray-600 font-normal normal-case">Active Cadets</span>
          </h2>

          <div className="space-y-4">
            {students.length === 0 ? (
              <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg text-center text-gray-500">
                <p>No students yet.</p>
                <p className="text-xs mt-1 text-gray-600">Add your first student to get started</p>
              </div>
            ) : (
              students.map((student) => {
                const activeBookings = student.bookings.filter(
                  (b) => b.paymentStatus !== "REFUNDED"
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
                                  { weekday: "short", month: "short", day: "numeric" }
                                )}
                                {" · "}
                                {new Date(b.shift.start).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
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
                              <span className="block text-xs font-normal opacity-60">Star Lab</span>
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
                      <span className="ml-1 text-gray-600">· Assign Mission</span>
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
                <span className="block text-xs font-normal opacity-70">Confirm Recruitment</span>
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
    </div>
  );
}

// ─── Default export with Suspense boundary ────────────────────────────────────
export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white font-mono">
          <div className="animate-pulse text-blue-400">Loading Dashboard...</div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

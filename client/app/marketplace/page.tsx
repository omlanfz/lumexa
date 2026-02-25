"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface Shift {
  id: string;
  start: string;
  end: string;
}

interface Teacher {
  id: string;
  hourlyRate: number;
  bio: string;
  user: { fullName: string };
  shifts: Shift[];
}

interface Student {
  id: string;
  name: string;
}

export default function Marketplace() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadData(token);
  }, []);

  const loadData = async (token: string) => {
    setError("");
    try {
      // ─── CRITICAL FIX ────────────────────────────────────────────────────────
      // Backend returns a paginated object: { teachers: [...], total, page, ... }
      // Previous code did setTeachers(marketRes.data) which set teachers to the
      // whole object — causing "l.map is not a function" crash on render.
      // Fix: extract the array with marketRes.data.teachers
      // ─────────────────────────────────────────────────────────────────────────
      const marketRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/marketplace`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setTeachers(marketRes.data.teachers ?? []);

      const studentRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/students`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setStudents(studentRes.data ?? []);
      if (studentRes.data.length > 0) setSelectedStudent(studentRes.data[0].id);

      setLoading(false);
    } catch (err) {
      console.error("Failed to load marketplace", err);
      setError("Failed to load teachers. Please try again.");
      setLoading(false);
    }
  };

  const handleBook = async (shiftId: string, teacherName: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!selectedStudent) {
      setError("Please add a student first before booking a lesson.");
      return;
    }

    setBookingInProgress(shiftId);
    setError("");

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings`,
        { shiftId, studentId: selectedStudent },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const { bookingId, clientSecret } = res.data;

      if (clientSecret) {
        // Production: Stripe is configured — redirect to Stripe payment
        // (Full Stripe.js integration goes here when live)
        router.push(`/mock-payment?bookingId=${bookingId}&mode=stripe`);
      } else {
        // Development / mock mode: Stripe not configured
        // Redirect to mock payment confirmation page
        router.push(`/mock-payment?bookingId=${bookingId}`);
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Booking failed. The slot may be taken.";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setBookingInProgress(null);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-mono">
        <div className="text-center">
          <div className="text-green-400 text-2xl animate-pulse mb-2">●</div>
          <p className="text-gray-400">Loading Teachers...</p>
          <p className="text-gray-600 text-xs mt-1">Scanning Sector</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      {/* ── Header ── */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-green-400 tracking-widest uppercase">
            Find a Teacher
          </h1>
          <p className="text-gray-500 text-sm mt-1">Mission Selection</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Student Selector */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400 font-bold">Book for:</span>
            {students.length === 0 ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="text-sm text-yellow-400 border border-yellow-700 px-3 py-2 rounded hover:bg-yellow-900/20 transition-all"
              >
                + Add a Student first
              </button>
            ) : (
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="bg-black border border-gray-700 rounded px-3 py-2 text-white focus:border-green-500 outline-none text-sm"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-400 border border-gray-700 px-4 py-2 rounded hover:bg-gray-800 transition-all"
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="max-w-6xl mx-auto mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ── Teacher Cards ── */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 gap-8">
        {teachers.length === 0 ? (
          <div className="text-center p-16 border border-dashed border-gray-800 rounded-xl text-gray-500">
            <p className="text-2xl mb-2">🔭</p>
            <p className="font-bold">No teachers available right now</p>
            <p className="text-xs mt-1">Check back soon</p>
          </div>
        ) : (
          teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 backdrop-blur-md hover:border-green-500/30 transition-all"
            >
              {/* Teacher Info */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {teacher.user.fullName}
                  </h2>
                  <p className="text-gray-500 text-xs">Teacher · Pilot</p>
                  <p className="text-purple-400 font-bold mt-1">
                    ${teacher.hourlyRate} / hr
                  </p>
                  {teacher.bio && (
                    <p className="text-gray-400 text-sm mt-2 max-w-lg">
                      {teacher.bio}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded border border-blue-800">
                    VERIFIED PILOT
                  </span>
                </div>
              </div>

              {/* Available Slots */}
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">
                Available Time Slots · Launch Windows
              </h3>
              <div className="flex flex-wrap gap-3">
                {teacher.shifts.length === 0 ? (
                  <span className="text-gray-600 text-sm italic">
                    No slots available right now
                  </span>
                ) : (
                  teacher.shifts.map((shift) => (
                    <button
                      key={shift.id}
                      onClick={() =>
                        handleBook(shift.id, teacher.user.fullName)
                      }
                      disabled={
                        bookingInProgress === shift.id || !selectedStudent
                      }
                      className={`px-4 py-3 rounded-lg border text-sm font-bold transition-all flex flex-col items-start min-w-[160px] ${
                        bookingInProgress === shift.id
                          ? "bg-green-900/30 border-green-500/50 text-green-400 cursor-wait"
                          : !selectedStudent
                            ? "bg-gray-900 border-gray-700 text-gray-500 cursor-not-allowed"
                            : "bg-green-900/20 border-green-800 text-green-300 hover:bg-green-800/40 hover:border-green-500 active:scale-95"
                      }`}
                    >
                      <span className="text-white font-bold">
                        {new Date(shift.start).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-xs text-gray-400 mt-0.5">
                        {new Date(shift.start).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {new Date(shift.end).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-green-400 text-xs mt-1 font-bold">
                        {bookingInProgress === shift.id
                          ? "Booking..."
                          : "→ Book Lesson"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

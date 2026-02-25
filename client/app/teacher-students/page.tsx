"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface ClassDate {
  recent: string | null;
  next: string | null;
}

interface StudentEntry {
  studentId: string;
  studentName: string;
  studentAge: number;
  totalClasses: number;
  completedClasses: number;
  pendingClasses: number;
  lastClassDate: string | null;
  nextClassDate: string | null;
  parentEmail: string;
  latestReview: { rating: number; comment: string | null } | null;
}

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadStudents(token);
  }, []);

  const loadStudents = async (token: string) => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/students`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setStudents(res.data);
    } catch {
      console.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const getRatingBadge = (rating: number | null) => {
    if (!rating) return null;
    const colors =
      rating >= 4
        ? "bg-green-900/30 text-green-400 border-green-800"
        : rating >= 3
          ? "bg-yellow-900/30 text-yellow-400 border-yellow-800"
          : "bg-red-900/30 text-red-400 border-red-800";

    return (
      <span
        className={`text-xs px-2 py-0.5 border rounded font-bold ${colors}`}
      >
        {"★".repeat(rating)}
        <span className="text-gray-600">{"★".repeat(5 - rating)}</span>
      </span>
    );
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-mono">
        <div className="animate-pulse text-purple-400">Loading Students...</div>
      </div>
    );

  return (
    <div className="min-h-screen text-white font-sans p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-purple-400 tracking-widest uppercase">
              My Students
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Active Cadets · {students.length} enrolled
            </p>
          </div>
          <button
            onClick={() => router.push("/teacher-dashboard")}
            className="text-sm text-gray-400 border border-gray-700 px-4 py-2 rounded hover:bg-gray-800 transition-all"
          >
            ← Dashboard
          </button>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl text-gray-600">
            <p className="text-2xl mb-2">👨‍🚀</p>
            <p className="font-bold">No students yet</p>
            <p className="text-xs mt-1">
              Students will appear here when parents book your classes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {students.map((s) => (
              <div
                key={s.studentId}
                className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 hover:border-purple-500/30 transition-all"
              >
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  {/* Student Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-900/50 border border-purple-700 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                      {s.studentName[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        {s.studentName}
                      </h3>
                      <p className="text-gray-500 text-xs">
                        Student · Cadet · Age {s.studentAge}
                      </p>
                      <p className="text-gray-600 text-xs mt-0.5">
                        Parent: {s.parentEmail}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 items-center">
                    <div className="text-center">
                      <p className="text-xl font-bold text-blue-400">
                        {s.completedClasses}
                      </p>
                      <p className="text-xs text-gray-600">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-yellow-400">
                        {s.pendingClasses}
                      </p>
                      <p className="text-xs text-gray-600">Upcoming</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-white">
                        {s.totalClasses}
                      </p>
                      <p className="text-xs text-gray-600">Total</p>
                    </div>
                  </div>
                </div>

                {/* Class dates + review */}
                <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col md:flex-row justify-between gap-3">
                  <div className="flex gap-6 text-sm">
                    {s.lastClassDate && (
                      <div>
                        <span className="text-gray-600 text-xs uppercase tracking-wider">
                          Last class
                        </span>
                        <p className="text-gray-300">
                          {new Date(s.lastClassDate).toLocaleDateString(
                            undefined,
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    )}
                    {s.nextClassDate && (
                      <div>
                        <span className="text-gray-600 text-xs uppercase tracking-wider">
                          Next class
                        </span>
                        <p className="text-green-400 font-bold">
                          {new Date(s.nextClassDate).toLocaleDateString(
                            undefined,
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                          {" · "}
                          {new Date(s.nextClassDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {s.latestReview && (
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">
                          Latest Feedback
                        </p>
                        {getRatingBadge(s.latestReview.rating)}
                        {s.latestReview.comment && (
                          <p className="text-gray-500 text-xs mt-1 italic max-w-xs truncate">
                            "{s.latestReview.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

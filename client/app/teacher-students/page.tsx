// FILE PATH: client/app/teacher-students/page.tsx
// ACTION: REPLACE the existing file entirely (or CREATE if it doesn't exist).

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";
import TeacherNav from "@/components/TeacherNav";

const API = process.env.NEXT_PUBLIC_API_URL;

interface StudentRow {
  studentId: string;
  studentName: string;
  studentAge: number;
  studentGrade: string | null;
  studentSubject: string | null;
  parentEmail: string;
  totalClasses: number;
  completedClasses: number;
  pendingClasses: number;
  lastClassDate: string | null;
  nextClassDate: string | null;
  latestReview: { rating: number; comment: string | null } | null;
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
  );
}

function TeacherStudentsContent() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    axios
      .get(`${API}/teachers/me/students`, { headers })
      .then((res) => setStudents(res.data ?? []))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (dt: string | null) =>
    dt
      ? new Date(dt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  const filtered = students.filter(
    (s) =>
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      (s.studentGrade ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.studentSubject ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex min-h-screen bg-black">
      <TeacherNav />
      <main className="flex-1 ml-56 p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Students</h1>
            <p className="text-sm text-gray-500 mt-0.5">Cadet Roster ✦</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {students.length} total
            </span>
            <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-300 rounded-full">
              {students.filter((s) => s.nextClassDate).length} upcoming
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, grade, or subject..."
            className="w-full max-w-md bg-gray-900 border border-gray-700 text-gray-200
                       rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500
                       transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-400">
              {search ? "No students match your search." : "No students yet."}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              Students appear here once they book a class with you.
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800 text-xs text-gray-500 font-medium">
              <div className="col-span-3">STUDENT</div>
              <div className="col-span-2">DETAILS</div>
              <div className="col-span-2 text-center">CLASSES</div>
              <div className="col-span-2">LAST CLASS</div>
              <div className="col-span-2">NEXT CLASS</div>
              <div className="col-span-1 text-center">RATING</div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-gray-800">
              {filtered.map((s) => (
                <div
                  key={s.studentId}
                  className="grid grid-cols-12 gap-2 px-4 py-4 hover:bg-gray-800/30 transition-colors items-center"
                >
                  {/* Student name + email */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-300 text-xs font-bold">
                          {s.studentName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {s.studentName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {s.parentEmail}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grade / Subject / Age */}
                  <div className="col-span-2">
                    <p className="text-xs text-gray-300">
                      {s.studentGrade ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.studentSubject ?? "—"}
                    </p>
                    <p className="text-xs text-gray-600">Age {s.studentAge}</p>
                  </div>

                  {/* Class counts */}
                  <div className="col-span-2 text-center">
                    <p className="text-sm font-medium text-white">
                      {s.totalClasses}
                    </p>
                    <div className="flex gap-1 justify-center mt-0.5">
                      <span className="text-xs px-1.5 py-0.5 bg-green-900/30 text-green-400 rounded">
                        {s.completedClasses} done
                      </span>
                      {s.pendingClasses > 0 && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-900/30 text-blue-400 rounded">
                          {s.pendingClasses} upcoming
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Last class */}
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">
                      {fmtDate(s.lastClassDate)}
                    </p>
                  </div>

                  {/* Next class */}
                  <div className="col-span-2">
                    {s.nextClassDate ? (
                      <p className="text-xs text-purple-300">
                        {fmtDate(s.nextClassDate)}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600">—</p>
                    )}
                  </div>

                  {/* Latest review */}
                  <div className="col-span-1 text-center">
                    {s.latestReview ? (
                      <span className="text-yellow-400 text-sm">
                        {"★".repeat(s.latestReview.rating)}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TeacherStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <TeacherStudentsContent />
    </Suspense>
  );
}

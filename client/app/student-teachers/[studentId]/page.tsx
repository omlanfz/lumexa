// FILE PATH: client/app/student-teachers/[studentId]/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
// ─── LUMI CHATBOT ──────────────────────────────────────────────────────────────
import LumiChat from "../../../components/LumiChat";
// ──────────────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL;

interface TeacherInfo {
  id: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  ratingAvg: number;
  subjects?: string[];
  classCount: number;
  lastClass?: string;
}

function MyTeachersContent() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();

  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("Student");

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const headers = { Authorization: `Bearer ${tok}` };

        const [sRes, bRes] = await Promise.all([
          axios.get(`${API}/students`, { headers }),
          axios.get(
            `${API}/students/${studentId}/bookings?filter=all&limit=100`,
            { headers },
          ),
        ]);

        const students = Array.isArray(sRes.data) ? sRes.data : [];
        const student = students.find((s: any) => s.id === studentId);
        setStudentName(student?.name ?? "Student");

        const bookings = Array.isArray(bRes.data?.bookings)
          ? bRes.data.bookings
          : Array.isArray(bRes.data)
            ? bRes.data
            : [];

        const teacherMap = new Map<string, TeacherInfo>();

        for (const b of bookings) {
          const t = b.shift?.teacher;
          if (!t) continue;

          const tid = t.id;

          if (!teacherMap.has(tid)) {
            teacherMap.set(tid, {
              id: tid,
              name: t.user?.fullName ?? "Unknown",
              avatarUrl: t.user?.avatarUrl ?? null,
              bio: t.bio ?? null,
              ratingAvg: t.ratingAvg ?? 0,
              subjects: Array.isArray(t.subjects) ? t.subjects : [],
              classCount: 0,
              lastClass: b.shift?.start,
            });
          }

          const entry = teacherMap.get(tid)!;
          entry.classCount++;

          if (
            b.shift?.start &&
            (!entry.lastClass ||
              new Date(b.shift.start) > new Date(entry.lastClass))
          ) {
            entry.lastClass = b.shift.start;
          }
        }

        setTeachers(Array.from(teacherMap.values()));
      } catch (err: any) {
        const m = err.response?.data?.message;
        setError(
          Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load teachers"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, router]);

  return (
    <div className="min-h-screen bg-[#050D1A]">
      {/* Header */}
      <div className="border-b border-blue-900/20 px-4 sm:px-6 py-4 flex items-center gap-4 bg-[#060E1F]">
        <button
          onClick={() => router.push(`/student-dashboard/${studentId}`)}
          className="text-blue-400 hover:text-blue-300 transition-colors text-xl leading-none"
          aria-label="Go back"
        >
          ←
        </button>
        <div>
          <h1 className="font-bold text-white">My Teachers</h1>
          <p className="text-xs text-blue-400">{studentName}'s Crew</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">👩‍🚀</p>
            <p className="text-blue-100 font-semibold text-lg mb-2">
              No teachers yet
            </p>
            <p className="text-blue-400 text-sm mb-6">
              Book a class to meet your first teacher!
            </p>
            <button
              onClick={() => router.push(`/marketplace?studentId=${studentId}`)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium"
            >
              Find a Teacher 🚀
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teachers.map((t) => (
              <div
                key={t.id}
                className="bg-[#0D1B2E]/80 rounded-2xl border border-blue-900/30 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 select-none">
                    {(t.name ?? "T").charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {t.name}
                    </p>
                    <p className="text-xs text-blue-400">
                      ⭐ {t.ratingAvg.toFixed(1)} rating
                    </p>

                    {t.subjects && t.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.subjects.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-800/30"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {t.bio && (
                      <p className="text-xs text-blue-400/60 mt-2 line-clamp-2">
                        {t.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-blue-400/70">
                  <span>
                    📚 {t.classCount} class{t.classCount !== 1 ? "es" : ""}{" "}
                    together
                  </span>
                  {t.lastClass && (
                    <span>
                      Last:{" "}
                      {new Date(t.lastClass).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── LUMI CHATBOT ───────────────────────────────────────────────────────
          Fixed bottom-right. variant="student" → blue theme, Cadet persona.
          Lumi can help the student ask questions about a teacher's subjects,
          how to book their next class, or what to expect from a session.
      ─────────────────────────────────────────────────────────────────────── */}
      <LumiChat
        variant="student"
        context={`Student's teachers list — showing ${teachers.length} teacher${teachers.length !== 1 ? "s" : ""} for ${studentName}`}
      />
      {/* ──────────────────────────────────────────────────────────────────── */}
    </div>
  );
}

export default function MyTeachersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050D1A] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MyTeachersContent />
    </Suspense>
  );
}

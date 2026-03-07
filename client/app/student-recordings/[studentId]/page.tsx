// FILE PATH: client/app/student-recordings/[studentId]/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
// ─── LUMI CHATBOT ──────────────────────────────────────────────────────────────
import LumiChat from "../../../components/LumiChat";
// ──────────────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL;

interface Recording {
  bookingId: string;
  classDate: string;
  teacherName: string;
  recordingUrl?: string | null;
  duration?: number;
}

function RecordingsContent() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const [sRes, bRes] = await Promise.all([
          axios.get(`${API}/students`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
          axios
            .get(`${API}/students/${studentId}/bookings?filter=completed`, {
              headers: { Authorization: `Bearer ${tok}` },
            })
            .catch(() => ({ data: { bookings: [] } })),
        ]);
        const students = Array.isArray(sRes.data) ? sRes.data : [];
        setStudentName(
          students.find((s: any) => s.id === studentId)?.name ?? "Student",
        );

        const bookings = Array.isArray(bRes.data?.bookings)
          ? bRes.data.bookings
          : [];
        setRecordings(
          bookings.map((b: any) => ({
            bookingId: b.id,
            classDate: b.shift?.start,
            teacherName: b.shift?.teacher?.user?.fullName ?? "Unknown",
            recordingUrl: b.recordingUrl ?? null,
            duration: b.durationMinutes,
          })),
        );
      } catch {
        /* silently fail */
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, router]);

  return (
    <div className="min-h-screen dark:bg-[#050A1A] bg-blue-50">
      <div className="border-b dark:border-blue-900/20 border-blue-100 px-6 py-4 flex items-center gap-4 dark:bg-[#060D1F] bg-white">
        <button
          onClick={() => router.back()}
          className="text-blue-400 hover:text-blue-300 cursor-pointer"
          aria-label="Go back"
        >
          ←
        </button>
        <div>
          <h1 className="font-bold dark:text-white text-blue-900">
            Recordings
          </h1>
          <p className="text-xs dark:text-blue-400 text-blue-500">
            {studentName}'s Replays
          </p>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🎬</p>
            <p className="dark:text-blue-300 text-blue-700 font-semibold text-lg mb-2">
              No recordings yet
            </p>
            <p className="dark:text-blue-400 text-blue-500">
              Recordings will appear here after completed classes.
            </p>
            <p className="text-xs dark:text-blue-500 text-blue-400 mt-2">
              Note: Recording availability depends on your teacher's setup.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((r) => (
              <div
                key={r.bookingId}
                className="dark:bg-white/5 bg-white rounded-2xl border dark:border-blue-900/20 border-blue-100 p-5 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl dark:bg-blue-900/30 bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
                  🎬
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium dark:text-white text-blue-900">
                    Class with {r.teacherName}
                  </p>
                  <p className="text-xs dark:text-blue-400 text-blue-500">
                    {r.classDate
                      ? new Date(r.classDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Unknown date"}
                  </p>
                </div>
                {r.recordingUrl ? (
                  <a
                    href={r.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors cursor-pointer flex-shrink-0"
                  >
                    ▶ Watch
                  </a>
                ) : (
                  <span className="text-xs dark:text-blue-500 text-blue-400 flex-shrink-0">
                    No recording
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── LUMI CHATBOT ───────────────────────────────────────────────────────
          Fixed bottom-right. variant="student" → blue theme, Cadet persona.
          Lumi can help the student understand replays, suggest what to review,
          or answer subject questions while re-watching a class.
      ─────────────────────────────────────────────────────────────────────── */}
      <LumiChat
        variant="student"
        context={`Student recordings page — showing class replay history for ${studentName || "this student"}`}
      />
      {/* ──────────────────────────────────────────────────────────────────── */}
    </div>
  );
}

export default function RecordingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen dark:bg-[#050A1A] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <RecordingsContent />
    </Suspense>
  );
}

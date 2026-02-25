// FILE PATH: client/app/teacher-earnings/page.tsx
// ACTION: REPLACE the existing file entirely (or CREATE if it doesn't exist).

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";
import TeacherNav from "@/components/TeacherNav";

const API = process.env.NEXT_PUBLIC_API_URL;

interface EarningItem {
  bookingId: string;
  classDate: string;
  classEnd: string;
  studentName: string;
  grossDollars: string;
  earningsDollars: string;
  review: { rating: number; comment: string | null } | null;
}

interface EarningsData {
  items: EarningItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalCompletedClasses: number;
    totalGrossDollars: string;
    totalEarningsDollars: string;
  };
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
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

function TeacherEarningsContent() {
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    setLoading(true);
    axios
      .get(`${API}/teachers/me/earnings?page=${page}&limit=20`, { headers })
      .then((res) => setData(res.data))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [page]);

  const fmt = (dt: string) =>
    new Date(dt).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const fmtTime = (dt: string) =>
    new Date(dt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="flex min-h-screen bg-black">
      <TeacherNav />
      <main className="flex-1 ml-56 p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Earnings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reward Ledger ✦</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-xs text-gray-500 mb-1">Total Earned</p>
                <p className="text-3xl font-bold text-green-400">
                  ${data?.summary.totalEarningsDollars}
                </p>
                <p className="text-xs text-gray-500 mt-1">your 75% share</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-xs text-gray-500 mb-1">Total Classes</p>
                <p className="text-3xl font-bold text-purple-300">
                  {data?.summary.totalCompletedClasses}
                </p>
                <p className="text-xs text-gray-500 mt-1">completed sessions</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-xs text-gray-500 mb-1">Avg per Class</p>
                <p className="text-3xl font-bold text-blue-400">
                  $
                  {data && data.summary.totalCompletedClasses > 0
                    ? (
                        parseFloat(data.summary.totalEarningsDollars) /
                        data.summary.totalCompletedClasses
                      ).toFixed(2)
                    : "0.00"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  per completed class
                </p>
              </div>
            </div>

            {/* Earnings Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-gray-800">
                <h2 className="text-base font-semibold text-white">
                  Class History
                </h2>
                <p className="text-xs text-gray-500">
                  Showing {data?.items.length ?? 0} of {data?.total ?? 0}{" "}
                  classes
                </p>
              </div>

              {data?.items.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">💰</p>
                  <p className="text-gray-400">No completed classes yet.</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Earnings appear here after a class is completed.
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-800">
                    {data?.items.map((item) => (
                      <div
                        key={item.bookingId}
                        className="p-4 hover:bg-gray-800/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-white truncate">
                                {item.studentName}
                              </p>
                              {item.review && (
                                <StarDisplay rating={item.review.rating} />
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {fmt(item.classDate)} · {fmtTime(item.classDate)}{" "}
                              – {fmtTime(item.classEnd)}
                            </p>
                            {item.review?.comment && (
                              <p className="text-xs text-gray-400 mt-1 italic">
                                "{item.review.comment}"
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-bold text-green-400">
                              +${item.earningsDollars}
                            </p>
                            <p className="text-xs text-gray-600">
                              gross ${item.grossDollars}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {(data?.totalPages ?? 1) > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-800">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300
                                   rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
                      >
                        ← Previous
                      </button>
                      <p className="text-xs text-gray-500">
                        Page {page} of {data?.totalPages}
                      </p>
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(data?.totalPages ?? 1, p + 1))
                        }
                        disabled={page === data?.totalPages}
                        className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300
                                   rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function TeacherEarningsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <TeacherEarningsContent />
    </Suspense>
  );
}

// FILE PATH: client/app/teacher-conduct/page.tsx
// New page: Pilot Guidelines (Rules, Penalties, Strike Policy)
// Combined with Earnings impact visualization for best UX context.
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TeacherNav from "../../components/TeacherNav";
import { useTheme } from "../../components/ThemeProvider";

interface Profile {
  user: { fullName: string; avatarUrl?: string | null };
  rankTier: number;
  strikes: number;
  isSuspended: boolean;
}

const RULES = [
  {
    section: "📅 Scheduling & Availability",
    icon: "📅",
    color: "blue",
    items: [
      "You must set availability at least 24 hours in advance.",
      "Minimum session length: 30 minutes. Maximum: 4 hours.",
      "No overlapping time slots — the system will reject them.",
      "You cannot create slots in the past.",
    ],
  },
  {
    section: "🚀 Class Conduct",
    icon: "🚀",
    color: "purple",
    items: [
      "Join the classroom within 5 minutes of class start time.",
      "No-show without notice = automatic strike.",
      "Treat every cadet with respect. Misconduct reports trigger admin review.",
      "Maintain a professional learning environment at all times.",
    ],
  },
  {
    section: "🔄 Cancellations & Rescheduling",
    icon: "🔄",
    color: "amber",
    items: [
      "Student-requested: Cancel/reschedule anytime — no penalty. Verification required.",
      "Teacher-initiated: Maximum 2 free cancellations per calendar month.",
      "3rd cancellation and beyond: 1 automatic strike per cancellation.",
      "You must give 24 hours notice for teacher-initiated cancellations.",
      "Less than 2 hours notice: No refund to parent AND 1 strike issued.",
    ],
  },
  {
    section: "💰 Earnings & Penalties",
    icon: "💰",
    color: "green",
    items: [
      "You earn 75% of the class fee. Lumexa retains 25% platform fee.",
      "Payment is released after the class ends (LiveKit session closed).",
      "Strike penalty: $5 deducted from next payout per strike beyond quota.",
      "Suspension (3 strikes): All pending payouts held during review period.",
      "Refunded classes: No earnings for cancelled/refunded sessions.",
    ],
  },
  {
    section: "⚡ Strike Policy",
    icon: "⚡",
    color: "red",
    items: [
      "Strike 1–2: Warning. Earnings penalty applied.",
      "Strike 3: Account suspended. Cannot accept new bookings.",
      "Admin review required to reinstate after Strike 3.",
      "Strikes reset to 0 after 90 days of clean conduct (admin discretion).",
      "False misconduct reports against teachers are investigated — protect yourself by documenting.",
    ],
  },
];

const COLOR_MAP: Record<string, string> = {
  blue: "dark:bg-blue-900/20 dark:border-blue-800/30 bg-blue-50 border-blue-200 dark:text-blue-300 text-blue-700",
  purple:
    "dark:bg-purple-900/20 dark:border-purple-800/30 bg-purple-50 border-purple-200 dark:text-purple-300 text-purple-700",
  amber:
    "dark:bg-amber-900/20 dark:border-amber-800/30 bg-amber-50 border-amber-200 dark:text-amber-300 text-amber-700",
  green:
    "dark:bg-green-900/20 dark:border-green-800/30 bg-green-50 border-green-200 dark:text-green-300 text-green-700",
  red: "dark:bg-red-900/20 dark:border-red-800/30 bg-red-50 border-red-200 dark:text-red-300 text-red-700",
};

function TeacherConductContent() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const card =
    "rounded-2xl border dark:bg-gray-900/40 dark:border-purple-900/30 bg-white border-purple-100 shadow-sm";

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const strikes = profile?.strikes ?? 0;
  const strikePct = Math.min(100, (strikes / 3) * 100);
  const strikeColor =
    strikes === 0
      ? "bg-green-500"
      : strikes === 1
        ? "bg-yellow-500"
        : strikes === 2
          ? "bg-orange-500"
          : "bg-red-500";

  return (
    <div className="min-h-screen dark:bg-[#0A0714] bg-[#FAF5FF] transition-colors">
      <TeacherNav
        teacherName={profile?.user?.fullName ?? "Pilot"}
        avatarUrl={profile?.user?.avatarUrl ?? null}
        rankTier={profile?.rankTier ?? 0}
      />

      <div className="lg:pl-64 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-purple-100 text-purple-900">
              Pilot Guidelines
            </h1>
            <p className="text-sm dark:text-purple-400/60 text-purple-400">
              Pilot Code · Know the Rules, Fly with Integrity
            </p>
          </div>

          {/* Suspension warning */}
          {profile?.isSuspended && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-600/40 rounded-2xl flex items-start gap-3">
              <span className="text-2xl">🚫</span>
              <div>
                <p className="text-red-300 font-bold">
                  Your account is suspended
                </p>
                <p className="text-red-400/70 text-sm mt-1">
                  You have reached 3 strikes. Contact Lumexa support for
                  reinstatement review. During suspension, you cannot accept new
                  bookings and all pending payouts are held.
                </p>
              </div>
            </div>
          )}

          {/* Strike status card */}
          <div className={`${card} p-5 mb-6`}>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide font-medium dark:text-purple-300/60 text-purple-400">
                  Your Strike Status
                </p>
                <p className="text-2xl font-bold mt-1 dark:text-purple-100 text-purple-900">
                  {strikes} / 3 strikes
                </p>
                <p
                  className={`text-sm mt-0.5 ${
                    strikes === 0
                      ? "text-green-500"
                      : strikes < 3
                        ? "text-amber-500"
                        : "text-red-500"
                  }`}
                >
                  {strikes === 0
                    ? "✅ Clean record — keep it up!"
                    : strikes === 1
                      ? "⚡ First warning"
                      : strikes === 2
                        ? "⚠️ One more strike = suspension"
                        : "🚫 Suspended"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black dark:text-purple-100 text-purple-900">
                  {3 - strikes}
                </p>
                <p className="text-xs dark:text-purple-400/60 text-purple-400">
                  strikes remaining
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-3 rounded-full dark:bg-gray-800 bg-gray-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${strikeColor}`}
                  style={{ width: `${strikePct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs dark:text-purple-400/50 text-purple-400">
                  Clean
                </span>
                <span className="text-xs text-red-400">Suspended</span>
              </div>
            </div>
          </div>

          {/* Quick reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {[
              {
                icon: "✅",
                label: "Student request",
                desc: "No penalty",
                color: "green",
              },
              {
                icon: "⚠️",
                label: "Your cancellation",
                desc: "2 free/month",
                color: "amber",
              },
              {
                icon: "❌",
                label: "No-show",
                desc: "1 strike immediately",
                color: "red",
              },
            ].map((item) => (
              <div key={item.label} className={`${card} p-4 text-center`}>
                <p className="text-2xl mb-2">{item.icon}</p>
                <p className="text-sm font-semibold dark:text-purple-100 text-purple-900">
                  {item.label}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    item.color === "green"
                      ? "text-green-500"
                      : item.color === "amber"
                        ? "text-amber-500"
                        : "text-red-500"
                  }`}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Rules sections */}
          <div className="space-y-4">
            {RULES.map((rule) => (
              <div
                key={rule.section}
                className={`rounded-2xl border p-5 ${COLOR_MAP[rule.color]}`}
              >
                <h3 className="font-bold text-base mb-3">{rule.section}</h3>
                <ul className="space-y-2">
                  {rule.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 flex-shrink-0">•</span>
                      <span className="opacity-90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Earnings impact table */}
          <div className={`${card} mt-6 overflow-hidden`}>
            <div className="px-5 py-4 border-b dark:border-purple-900/20 border-purple-100">
              <p className="font-semibold dark:text-purple-100 text-purple-900">
                Earnings Impact Summary
              </p>
              <p className="text-xs dark:text-purple-400/60 text-purple-400">
                How rule violations affect your payout
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-purple-900/20 border-purple-100">
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium dark:text-purple-300/60 text-purple-400">
                      Violation
                    </th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium dark:text-purple-300/60 text-purple-400">
                      Strike
                    </th>
                    <th className="text-left px-5 py-3 text-xs uppercase font-medium dark:text-purple-300/60 text-purple-400">
                      Earnings Impact
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-purple-900/20 divide-purple-100">
                  {[
                    {
                      violation: "No-show",
                      strike: "1",
                      earnings: "Class fee forfeited + $5 penalty",
                    },
                    {
                      violation: "Late cancel (<2h notice)",
                      strike: "1",
                      earnings: "No earnings for that session",
                    },
                    {
                      violation: "3rd+ cancel this month",
                      strike: "1 each",
                      earnings: "$5 deducted per extra cancellation",
                    },
                    {
                      violation: "Student-requested reschedule",
                      strike: "None",
                      earnings: "No impact",
                    },
                    {
                      violation: "3rd strike (suspension)",
                      strike: "Account",
                      earnings: "All pending payouts held",
                    },
                  ].map((row) => (
                    <tr
                      key={row.violation}
                      className="dark:hover:bg-purple-900/10 hover:bg-purple-50/50 transition-colors"
                    >
                      <td className="px-5 py-3 dark:text-purple-100 text-purple-900">
                        {row.violation}
                      </td>
                      <td
                        className={`px-5 py-3 ${row.strike === "None" ? "text-green-500" : "text-red-400"}`}
                      >
                        {row.strike}
                      </td>
                      <td className="px-5 py-3 dark:text-purple-300/70 text-purple-600">
                        {row.earnings}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Support */}
          <div className={`${card} mt-6 p-5 text-center`}>
            <p className="text-lg mb-2">❓</p>
            <p className="font-semibold dark:text-purple-100 text-purple-900 text-sm">
              Have a question about these guidelines?
            </p>
            <p className="text-xs dark:text-purple-400/60 text-purple-400 mt-1 mb-3">
              Contact Lumexa Mission Support. We're here to help all pilots
              succeed.
            </p>
            <a
              href="mailto:support@lumexa.app"
              className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition-colors"
            >
              Contact Support →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherConductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherConductContent />
    </Suspense>
  );
}

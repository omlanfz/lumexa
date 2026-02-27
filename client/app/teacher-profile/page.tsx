// FILE PATH: client/app/teacher-profile/page.tsx
// Complete redesign with:
// 1. Profile completion progress bar (weighted scoring)
// 2. Document upload guidance (ID, certificates, verification docs)
// 3. Full light/dark mode via Tailwind v4 dark: classes
// 4. Responsive layout
// 5. Avatar upload integrated
"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TeacherNav from "../../components/TeacherNav";
import { useTheme } from "../../components/ThemeProvider";

interface Profile {
  id: string;
  user: { fullName: string; email: string; avatarUrl?: string | null };
  bio?: string | null;
  hourlyRate: number;
  ratingAvg: number;
  reviewCount: number;
  strikes: number;
  isSuspended: boolean;
  rankTier?: number;
  subjects?: string[];
  grades?: string[];
  timezone?: string | null;
  stripeOnboarded?: boolean;
}

interface Doc {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

const SUBJECT_OPTIONS = [
  "Math",
  "Science",
  "English",
  "History",
  "Geography",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Art",
  "Music",
  "Languages",
  "Economics",
  "Psychology",
  "Philosophy",
  "Other",
];
const GRADE_OPTIONS = [
  "Pre-K",
  "K",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "College",
  "Adult",
];
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Africa/Lagos",
];

const DOC_REQUIREMENTS = [
  {
    key: "id",
    label: "Government ID",
    icon: "🪪",
    desc: "National ID, Passport, or Driver's License. Required for identity verification.",
    required: true,
  },
  {
    key: "teaching_cert",
    label: "Teaching Certificate",
    icon: "🎓",
    desc: "Any teaching qualification or certification. Upload if you have one.",
    required: false,
  },
  {
    key: "degree",
    label: "Academic Degree",
    icon: "📜",
    desc: "University degree or diploma relevant to your teaching subject.",
    required: false,
  },
  {
    key: "background_check",
    label: "Background Check",
    icon: "✅",
    desc: "Criminal background check from an approved agency. Increases parent trust significantly.",
    required: false,
  },
  {
    key: "subject_cert",
    label: "Subject Certification",
    icon: "🔬",
    desc: "Professional certification specific to your teaching subject (e.g. CPA for accounting, AWS for tech).",
    required: false,
  },
];

function computeProfileCompletion(
  profile: Profile,
  docs: Doc[],
): { score: number; breakdown: Record<string, boolean> } {
  const has = {
    avatar: !!profile.user?.avatarUrl,
    bio: !!(profile.bio && profile.bio.length > 20),
    subjects: !!profile.subjects?.length,
    grades: !!profile.grades?.length,
    rate: profile.hourlyRate > 0,
    id_doc: docs.some((d) => d.type === "id"),
    cert_doc: docs.some((d) =>
      ["teaching_cert", "degree", "subject_cert"].includes(d.type),
    ),
  };
  const weights: Record<string, number> = {
    avatar: 15,
    bio: 20,
    subjects: 15,
    grades: 10,
    rate: 10,
    id_doc: 15,
    cert_doc: 15,
  };
  const score = Object.entries(has).reduce(
    (acc, [key, val]) => acc + (val ? (weights[key] ?? 0) : 0),
    0,
  );
  return { score, breakdown: has };
}

function TeacherProfileContent() {
  const router = useRouter();
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState(25);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [timezone, setTimezone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "profile" | "documents" | "payout"
  >("profile");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const p = res.data;
        setProfile(p);
        setBio(p.bio ?? "");
        setHourlyRate(p.hourlyRate ?? 25);
        setSubjects(p.subjects ?? []);
        setGrades(p.grades ?? []);
        setTimezone(p.timezone ?? "");
      } catch (e: any) {
        const m = e.response?.data?.message;
        setError(
          Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load profile"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const save = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`,
        {
          bio,
          hourlyRate: +hourlyRate,
          subjects,
          grades,
          timezone: timezone || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setProfile((p) => (p ? { ...p, ...res.data } : p));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      const m = e.response?.data?.message;
      setError(Array.isArray(m) ? m.join(", ") : (m ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) {
      setError("Max 5MB");
      return;
    }
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/uploads/avatar`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      setProfile((p) =>
        p ? { ...p, user: { ...p.user, avatarUrl: res.data.avatarUrl } } : p,
      );
    } catch (e: any) {
      const m = e.response?.data?.message;
      setError(Array.isArray(m) ? m.join(", ") : (m ?? "Upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const connectStripe = async () => {
    setStripeLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/stripe/onboard`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.url) window.location.href = res.data.url;
    } catch (e: any) {
      const m = e.response?.data?.message;
      setError(
        Array.isArray(m) ? m.join(", ") : (m ?? "Stripe connect failed"),
      );
    } finally {
      setStripeLoading(false);
    }
  };

  const toggleSubject = (s: string) =>
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  const toggleGrade = (g: string) =>
    setGrades((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );

  const card =
    "rounded-2xl border dark:bg-gray-900/40 dark:border-purple-900/30 bg-white border-purple-100 shadow-sm";

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const { score, breakdown } = computeProfileCompletion(profile!, docs);
  const scoreColor =
    score < 40
      ? "bg-red-500"
      : score < 70
        ? "bg-amber-500"
        : score < 90
          ? "bg-blue-500"
          : "bg-green-500";
  const scoreLabel =
    score < 40
      ? "Incomplete"
      : score < 70
        ? "Basic"
        : score < 90
          ? "Good"
          : "Complete";

  return (
    <div className="min-h-screen dark:bg-[#0A0714] bg-[#FAF5FF] transition-colors">
      <TeacherNav
        teacherName={profile?.user?.fullName ?? "Pilot"}
        avatarUrl={profile?.user?.avatarUrl ?? null}
        rankTier={profile?.rankTier ?? 0}
        onAvatarUpdate={(url) =>
          setProfile((p) =>
            p ? { ...p, user: { ...p.user, avatarUrl: url } } : p,
          )
        }
      />

      <div className="lg:pl-64 transition-all duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-purple-100 text-purple-900">
              Settings
            </h1>
            <p className="text-sm dark:text-purple-400/60 text-purple-400">
              Pilot Configuration ✦
            </p>
          </div>

          {/* ── Profile completion bar ──────────────────────────────────────── */}
          <div className={`${card} p-5 mb-6`}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold dark:text-purple-100 text-purple-900">
                Profile Completeness
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${scoreColor}`}
                >
                  {scoreLabel}
                </span>
                <span className="text-lg font-bold dark:text-purple-100 text-purple-900">
                  {score}%
                </span>
              </div>
            </div>
            <div className="h-3 rounded-full dark:bg-gray-800 bg-gray-200 overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all duration-700 ${scoreColor}`}
                style={{ width: `${score}%` }}
              />
            </div>

            {/* Completion checklist */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: "avatar", label: "Profile photo", pts: 15 },
                { key: "bio", label: "Bio (20+ chars)", pts: 20 },
                { key: "subjects", label: "Subjects", pts: 15 },
                { key: "grades", label: "Grade levels", pts: 10 },
                { key: "rate", label: "Hourly rate", pts: 10 },
                { key: "id_doc", label: "ID document", pts: 15 },
                { key: "cert_doc", label: "Certificate", pts: 15 },
              ].map((item) => (
                <div
                  key={item.key}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs ${
                    (breakdown as any)[item.key]
                      ? "dark:bg-green-900/20 bg-green-50 dark:text-green-300 text-green-700"
                      : "dark:bg-gray-800/40 bg-gray-50 dark:text-gray-500 text-gray-400"
                  }`}
                >
                  <span>{(breakdown as any)[item.key] ? "✅" : "○"}</span>
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-auto opacity-60">+{item.pts}%</span>
                </div>
              ))}
            </div>

            {score < 100 && (
              <p className="text-xs dark:text-purple-400/60 text-purple-400 mt-3">
                💡 Complete your profile to rank higher in marketplace search
                results and attract more cadets.
              </p>
            )}
          </div>

          {/* ── Tab switcher ─────────────────────────────────────────────────── */}
          <div
            className={`${card} p-1.5 inline-flex rounded-xl mb-6 flex-wrap gap-1`}
          >
            {(["profile", "documents", "payout"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all capitalize ${
                  activeTab === t
                    ? "bg-purple-600 text-white shadow-sm"
                    : "dark:text-purple-300/70 text-purple-500"
                }`}
              >
                {t === "profile"
                  ? "👤 Profile"
                  : t === "documents"
                    ? "📄 Documents"
                    : "💳 Payout"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          {saveSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-green-900/20 border border-green-700/30 text-green-400 text-sm">
              ✅ Profile saved successfully!
            </div>
          )}

          {/* ── Profile tab ───────────────────────────────────────────────────── */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              {/* Account info */}
              <div className={`${card} p-5`}>
                <h3 className="font-semibold dark:text-purple-100 text-purple-900 mb-4">
                  Account Information
                </h3>
                <div className="flex items-center gap-4 mb-5">
                  <div className="relative">
                    {profile?.user?.avatarUrl ? (
                      <img
                        src={profile.user.avatarUrl}
                        className="w-16 h-16 rounded-2xl object-cover border-2 dark:border-purple-700/40 border-purple-200"
                        alt=""
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center text-white font-bold text-2xl">
                        {profile?.user?.fullName?.charAt(0)?.toUpperCase() ??
                          "P"}
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold dark:text-purple-100 text-purple-900">
                      {profile?.user?.fullName}
                    </p>
                    <p className="text-sm dark:text-purple-400/60 text-purple-400">
                      {profile?.user?.email}
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="mt-2 text-xs px-3 py-1.5 rounded-lg dark:bg-purple-900/30 bg-purple-100 dark:text-purple-300 text-purple-700 dark:hover:bg-purple-900/50 hover:bg-purple-200 transition-colors disabled:opacity-50"
                    >
                      📷 Change Photo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="dark:bg-gray-800/40 bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs dark:text-purple-400/60 text-purple-400">
                      Rating
                    </p>
                    <p className="font-bold dark:text-yellow-400 text-yellow-600">
                      ⭐ {profile?.ratingAvg?.toFixed(1) ?? "—"}
                    </p>
                  </div>
                  <div className="dark:bg-gray-800/40 bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs dark:text-purple-400/60 text-purple-400">
                      Reviews
                    </p>
                    <p className="font-bold dark:text-purple-100 text-purple-900">
                      {profile?.reviewCount ?? 0}
                    </p>
                  </div>
                  <div className="dark:bg-gray-800/40 bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs dark:text-purple-400/60 text-purple-400">
                      Strikes
                    </p>
                    <p
                      className={`font-bold ${(profile?.strikes ?? 0) > 0 ? "text-red-400" : "text-green-500"}`}
                    >
                      {profile?.strikes ?? 0} / 3
                    </p>
                  </div>
                  <div className="dark:bg-gray-800/40 bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs dark:text-purple-400/60 text-purple-400">
                      Status
                    </p>
                    <p
                      className={`font-bold text-xs ${profile?.isSuspended ? "text-red-400" : "text-green-500"}`}
                    >
                      {profile?.isSuspended ? "🚫 Suspended" : "✅ Active"}
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadAvatar}
                />
              </div>

              {/* Bio */}
              <div className={`${card} p-5`}>
                <h3 className="font-semibold dark:text-purple-100 text-purple-900 mb-3">
                  Bio{" "}
                  <span className="text-xs dark:text-purple-400/50 text-purple-400 font-normal">
                    ({bio.length}/500)
                  </span>
                </h3>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  rows={5}
                  placeholder="Tell cadets about your teaching experience, approach, and what makes your classes unique…"
                  className="w-full px-4 py-3 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              {/* Hourly rate */}
              <div className={`${card} p-5`}>
                <h3 className="font-semibold dark:text-purple-100 text-purple-900 mb-3">
                  Hourly Rate (USD)
                </h3>
                <div className="flex items-center gap-3">
                  <span className="dark:text-purple-400/60 text-purple-400 font-bold text-xl">
                    $
                  </span>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(+e.target.value)}
                    className="w-36 px-4 py-3 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                  <div>
                    <p className="text-xs dark:text-purple-400/60 text-purple-400">
                      You earn 75% = ${(hourlyRate * 0.75).toFixed(0)}/hr
                    </p>
                    <p className="text-xs dark:text-purple-400/40 text-purple-300">
                      Range: $5–$500/hr
                    </p>
                  </div>
                </div>
              </div>

              {/* Subjects */}
              <div className={`${card} p-5`}>
                <h3 className="font-semibold dark:text-purple-100 text-purple-900 mb-3">
                  Subjects You Teach
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSubject(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        subjects.includes(s)
                          ? "bg-purple-600 text-white shadow-sm"
                          : "dark:bg-gray-800/40 bg-gray-100 dark:text-purple-300/70 text-purple-500 dark:hover:bg-purple-900/30 hover:bg-purple-100"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grades */}
              <div className={`${card} p-5`}>
                <h3 className="font-semibold dark:text-purple-100 text-purple-900 mb-3">
                  Grade Levels
                </h3>
                <div className="flex flex-wrap gap-2">
                  {GRADE_OPTIONS.map((g) => (
                    <button
                      key={g}
                      onClick={() => toggleGrade(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        grades.includes(g)
                          ? "bg-purple-600 text-white shadow-sm"
                          : "dark:bg-gray-800/40 bg-gray-100 dark:text-purple-300/70 text-purple-500 dark:hover:bg-purple-900/30 hover:bg-purple-100"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timezone */}
              <div className={`${card} p-5`}>
                <h3 className="font-semibold dark:text-purple-100 text-purple-900 mb-3">
                  Timezone
                </h3>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  <option value="">Select timezone…</option>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              {/* Save */}
              <button
                onClick={save}
                disabled={saving}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-600/20 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes ✦"}
              </button>
            </div>
          )}

          {/* ── Documents tab ─────────────────────────────────────────────────── */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className={`${card} p-5`}>
                <h3 className="font-semibold dark:text-purple-100 text-purple-900 mb-1">
                  Verification Documents
                </h3>
                <p className="text-sm dark:text-purple-400/60 text-purple-400 mb-5">
                  Upload your documents to build trust with parents and increase
                  your search ranking. All documents are reviewed by Lumexa and
                  kept confidential.
                </p>

                <div className="space-y-3">
                  {DOC_REQUIREMENTS.map((doc) => {
                    const uploaded = docs.find((d) => d.type === doc.key);
                    return (
                      <div
                        key={doc.key}
                        className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                          uploaded
                            ? "dark:bg-green-900/20 dark:border-green-800/30 bg-green-50 border-green-200"
                            : "dark:bg-gray-800/30 dark:border-gray-700/30 bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-2xl flex-shrink-0">
                            {doc.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold dark:text-purple-100 text-purple-900">
                                {doc.label}
                              </p>
                              {doc.required && (
                                <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                                  Required
                                </span>
                              )}
                              {!doc.required && (
                                <span className="text-xs px-1.5 py-0.5 dark:bg-gray-700/40 bg-gray-200 dark:text-gray-400 text-gray-500 rounded-full">
                                  Optional
                                </span>
                              )}
                            </div>
                            <p className="text-xs dark:text-purple-400/60 text-purple-400 mt-0.5">
                              {doc.desc}
                            </p>
                            {uploaded && (
                              <p className="text-xs text-green-500 mt-1">
                                ✅ Uploaded ·{" "}
                                {new Date(
                                  uploaded.uploadedAt,
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {uploaded ? (
                            <div className="flex gap-2">
                              <a
                                href={uploaded.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs px-2.5 py-1.5 rounded-lg dark:bg-purple-900/30 bg-purple-100 dark:text-purple-300 text-purple-700 hover:opacity-80 transition-opacity"
                              >
                                View
                              </a>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                // In production: open file picker for this doc type
                                alert(
                                  "Document upload requires Cloudinary integration. See setup guide.",
                                );
                              }}
                              className="text-xs px-2.5 py-1.5 rounded-lg dark:bg-purple-600/20 bg-purple-100 dark:text-purple-300 text-purple-700 dark:hover:bg-purple-600/30 hover:bg-purple-200 transition-colors"
                            >
                              Upload
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 rounded-xl dark:bg-blue-900/20 bg-blue-50 dark:border dark:border-blue-800/30 border-blue-200">
                  <p className="text-xs dark:text-blue-300 text-blue-700">
                    🔒 <strong>Privacy:</strong> Documents are encrypted and
                    only visible to Lumexa administrators. They are never shared
                    with students or parents. Accepted formats: PDF, JPG, PNG
                    (max 10MB each).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Payout tab ────────────────────────────────────────────────────── */}
          {activeTab === "payout" && (
            <div className="space-y-4">
              <div className={`${card} p-5`}>
                <h3 className="font-semibold dark:text-purple-100 text-purple-900 mb-1">
                  Payout Setup
                </h3>
                <p className="text-sm dark:text-purple-400/60 text-purple-400 mb-5">
                  Reward Ledger Configuration
                </p>

                {profile?.stripeOnboarded ? (
                  <div className="p-4 rounded-xl dark:bg-green-900/20 bg-green-50 border dark:border-green-800/30 border-green-200 flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="font-semibold dark:text-green-300 text-green-700">
                        Stripe Connected
                      </p>
                      <p className="text-xs dark:text-green-400/70 text-green-600">
                        You'll receive payouts automatically after completed
                        classes.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl dark:bg-amber-900/20 bg-amber-50 border dark:border-amber-800/30 border-amber-200 flex items-center gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <p className="font-semibold dark:text-amber-300 text-amber-700">
                          Stripe not connected
                        </p>
                        <p className="text-xs dark:text-amber-400/70 text-amber-600">
                          Connect Stripe to receive real payouts. Until
                          connected, earnings accumulate in your ledger.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm dark:text-purple-300/80 text-purple-700">
                      <p>
                        ✦ You earn <strong>75%</strong> of every class fee
                      </p>
                      <p>✦ Lumexa retains 25% platform fee</p>
                      <p>✦ Payouts are processed after class completion</p>
                      <p>
                        ✦ Stripe handles secure transfers to your bank account
                      </p>
                    </div>

                    <button
                      onClick={connectStripe}
                      disabled={stripeLoading}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-amber-900 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60"
                    >
                      {stripeLoading
                        ? "Connecting…"
                        : "⚡ Connect Stripe Account"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeacherProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherProfileContent />
    </Suspense>
  );
}

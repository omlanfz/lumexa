// FILE PATH: client/app/teacher-profile/page.tsx
//
// CHANGES vs previous version:
//
// FIX Issue 5 — Added LumiChat import + <LumiChat variant="teacher" ... /> at
//   the bottom of TeacherProfileContent, consistent with other teacher pages.
//
// THREE BUGS FIXED vs Document 3 (the original file):
//
// BUG 1 — `req` is not defined inside .map((doc) => ...)
//   The map callback variable is `doc`, not `req`.
//   BEFORE: handleDocUpload(req.key, file)  → ReferenceError: req is not defined
//           docUploading === req.key         → same crash
//           docUploading === req.key (label) → same crash
//   AFTER:  doc.key everywhere inside the map callback.
//
// BUG 2 — `handleDocUpload` was called but never defined
//   The current file has triggerDocUpload/handleDocFileSelected (hidden-input
//   approach) but the JSX calls handleDocUpload (dynamic-input approach from
//   Step 7). They were mixed — one approach in the handlers, the other in JSX.
//   AFTER:  handleDocUpload(docType, file) added exactly as specified in Step 7.
//           triggerDocUpload / handleDocFileSelected / docInputRef / activeDocTypeRef
//           removed — they were dead code that will never be called.
//
// BUG 3 — `docUploading` state was used in JSX but `uploadingDoc` was declared
//   The current file declares `uploadingDoc` but the JSX references `docUploading`.
//   AFTER:  Renamed to `docUploading` throughout (state + setDocUploading).

"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useTheme } from "@/components/ThemeProvider";
// FIX Issue 5 — import LumiChat
import LumiChat from "@/components/LumiChat";
import TeacherPageSkeleton from "@/components/TeacherPageSkeleton";
import { computeTeacherProfileCompletion } from "@/lib/teacherProfileCompletion";

interface Profile {
  id: string;
  user: { fullName: string; email: string; avatarUrl?: string | null };
  bio?: string | null;
  ratingAvg: number;
  reviewCount: number;
  strikes: number;
  isSuspended: boolean;
  rankTier?: number;
  subjects?: string[];
  grades?: string[];
  docsLocked?: boolean;
  payoutLocked?: boolean;
  payoutMethod?: "bank" | "bkash" | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  bkashNumber?: string | null;
}

interface Doc {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

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

const DOC_REQUIREMENTS = [
  {
    key: "nid",
    label: "National ID (NID)",
    icon: "🪪",
    desc: "Required for identity verification.",
    required: true,
  },
  {
    key: "birth_certificate",
    label: "Birth Certificate",
    icon: "📄",
    desc: "Official birth certificate.",
    required: true,
  },
  {
    key: "bachelor_certificate",
    label: "Bachelor's Certificate",
    icon: "🎓",
    desc: "Undergraduate degree certificate.",
    required: false,
  },
  {
    key: "master_certificate",
    label: "Master's Certificate",
    icon: "🎓",
    desc: "Postgraduate degree certificate, if applicable.",
    required: false,
  },
  {
    key: "ielts_certificate",
    label: "IELTS Certificate",
    icon: "🗣️",
    desc: "IELTS score report, if you have one.",
    required: false,
  },
  {
    key: "teaching_cert",
    label: "Teaching Certificate",
    icon: "📜",
    desc: "Any teaching qualification or certification, if you have one.",
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
    key: "other",
    label: "Other",
    icon: "📎",
    desc: "Any other relevant document.",
    required: false,
  },
];

function TeacherProfileContent() {
  const router = useRouter();
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [bio, setBio] = useState("");
  const [grades, setGrades] = useState<string[]>([]);
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "bkash" | "">("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bkashNumber, setBkashNumber] = useState("");
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutSaveSuccess, setPayoutSaveSuccess] = useState(false);

  const [completionScore, setCompletionScore] = useState(0);
  const [completionBreakdown, setCompletionBreakdown] = useState<
    Record<string, boolean>
  >({});

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docUploading, setDocUploading] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [justUploadedType, setJustUploadedType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "profile" | "documents" | "payout"
  >("profile");

  // ── Initial fetch ─────────────────────────────────────────────────────────
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
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setProfile(res.data);
        const existingDocs = (res.data.verificationDocs ?? []) as any[];
        setDocs(
          existingDocs.map((d, i) => ({
            id: `${d.type}-${i}`,
            type: d.type,
            name: d.name,
            url: d.url,
            uploadedAt: d.uploadedAt,
          })),
        );
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

  // Sync form fields whenever profile is replaced
  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? "");
    setGrades(profile.grades ?? []);
    setPayoutMethod(profile.payoutMethod ?? "");
    setBankAccountName(profile.bankAccountName ?? "");
    setBankAccountNumber(profile.bankAccountNumber ?? "");
    setBankName(profile.bankName ?? "");
    setBankBranch(profile.bankBranch ?? "");
    setBkashNumber(profile.bkashNumber ?? "");
  }, [profile]);

  // Recompute completion bar whenever profile or docs change
  useEffect(() => {
    if (!profile) return;
    const { score, breakdown } = computeTeacherProfileCompletion({
      ...profile,
      verificationDocs: docs,
    });
    setCompletionScore(score);
    setCompletionBreakdown(breakdown);
  }, [profile, docs]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`,
        {
          bio,
          grades,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // Re-fetch full profile so grades/avatarUrl are never stale
      const refreshed = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setProfile(refreshed.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      const m = e.response?.data?.message;
      setError(Array.isArray(m) ? m.join(", ") : (m ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  // ── Avatar upload ─────────────────────────────────────────────────────────
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
      fd.append("avatar", file);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/uploads/avatar`,
        fd,
        { headers: { Authorization: `Bearer ${token}` } },
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

  const handleDocUpload = async (docType: string, file: File) => {
    if (profile?.docsLocked) {
      setDocError(
        "Your documents are locked after verification. Contact support to make changes.",
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocError("Max file size is 10MB");
      return;
    }
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (!allowedTypes.includes(file.type)) {
      setDocError("Only PDF, JPG, and PNG files are allowed");
      return;
    }
    setDocUploading(docType);
    setDocError(null);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("document", file);
      fd.append("docType", docType);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/uploads/document`,
        fd,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDocs((prev) => {
        const filtered = prev.filter((d) => d.type !== docType);
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            type: res.data.docType,
            name: res.data.name,
            url: res.data.url,
            uploadedAt: new Date().toISOString(),
          },
        ];
      });
      // Flash an unmistakable "this upload just succeeded" confirmation —
      // the persisted "Uploaded · <date>" text alone doesn't change when
      // reuploading the same doc type on the same day, so without this a
      // teacher has no way to tell a reupload actually went through.
      setJustUploadedType(docType);
      setTimeout(() => {
        setJustUploadedType((cur) => (cur === docType ? null : cur));
      }, 5000);
    } catch (err: any) {
      const m = err.response?.data?.message;
      setDocError(Array.isArray(m) ? m.join(", ") : (m ?? "Upload failed"));
    } finally {
      setDocUploading(null);
    }
  };

  // ── Payout details (bank / bKash) ──────────────────────────────────────────
  const savePayout = async () => {
    if (profile?.payoutLocked) return;
    setPayoutSaving(true);
    setPayoutSaveSuccess(false);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`,
        {
          payoutMethod,
          bankAccountName,
          bankAccountNumber,
          bankName,
          bankBranch,
          bkashNumber,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const refreshed = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setProfile(refreshed.data);
      setPayoutSaveSuccess(true);
      setTimeout(() => setPayoutSaveSuccess(false), 3000);
    } catch (e: any) {
      const m = e.response?.data?.message;
      setError(Array.isArray(m) ? m.join(", ") : (m ?? "Save failed"));
    } finally {
      setPayoutSaving(false);
    }
  };

  const toggleGrade = (g: string) =>
    setGrades((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );

  const card = "t-card shadow-sm";

  if (loading) return <TeacherPageSkeleton />;

  const score = completionScore;
  const breakdown = completionBreakdown;

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
    <>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--t-text)]">
            Profile
          </h1>
        </div>

        {/* ── Profile completion bar ──────────────────────────────────────── */}
        <div className={`${card} p-5 mb-6`}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-[var(--t-text)]">
              Profile Completeness
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${scoreColor}`}
              >
                {scoreLabel}
              </span>
              <span className="text-lg font-bold text-[var(--t-text)]">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: "avatar", label: "Profile photo", pts: 20 },
              { key: "bio", label: "Bio (20+ chars)", pts: 25 },
              { key: "grades", label: "Grade levels", pts: 15 },
              { key: "id_doc", label: "ID document", pts: 20 },
              { key: "cert_doc", label: "Certificate", pts: 20 },
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
            <p className="text-xs text-[var(--t-text-muted)] mt-3">
              💡 Complete your profile to rank higher in marketplace search
              results and attract more students.
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
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all capitalize cursor-pointer ${
                activeTab === t
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-[var(--t-text-muted)] dark:hover:bg-purple-900/20 hover:bg-purple-50"
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
            {score >= 100 && !profile?.docsLocked && (
              <div className="p-5 rounded-2xl border dark:bg-green-900/20 dark:border-green-800/30 bg-green-50 border-green-200 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🎉</span>
                <div>
                  <p className="font-semibold dark:text-green-300 text-green-700">
                    Your profile is 100% complete!
                  </p>
                  <p className="text-sm dark:text-green-400/80 text-green-700/90 mt-1">
                    Nice work. Lumexa will now review and verify your account
                    before you can start teaching — this usually doesn&apos;t
                    take long, so thanks for your patience while we get to
                    it. In the meantime, please take a moment to double-check
                    that every document you uploaded is genuine, clearly
                    legible, and actually belongs to you — mismatched or
                    unclear documents are the most common reason
                    verification gets delayed.
                  </p>
                </div>
              </div>
            )}

            {/* Account info */}
            <div className={`${card} p-5`}>
              <h3 className="font-semibold text-[var(--t-text)] mb-4">
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
                      {profile?.user?.fullName?.charAt(0)?.toUpperCase() ?? "P"}
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-[var(--t-text)]">
                    {profile?.user?.fullName}
                  </p>
                  <p className="text-sm text-[var(--t-text-muted)]">
                    {profile?.user?.email}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)] hover:bg-[var(--t-nav-hover)] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    📷 Change Photo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="dark:bg-gray-800/40 bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-[var(--t-text-muted)]">
                    Rating
                  </p>
                  <p className="font-bold dark:text-yellow-400 text-yellow-600">
                    ⭐ {profile?.ratingAvg?.toFixed(1) ?? "N/A"}
                  </p>
                </div>
                <div className="dark:bg-gray-800/40 bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-[var(--t-text-muted)]">
                    Reviews
                  </p>
                  <p className="font-bold text-[var(--t-text)]">
                    {profile?.reviewCount ?? 0}
                  </p>
                </div>
                <div className="dark:bg-gray-800/40 bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-[var(--t-text-muted)]">
                    Strikes
                  </p>
                  <p
                    className={`font-bold ${(profile?.strikes ?? 0) > 0 ? "text-red-400" : "text-green-500"}`}
                  >
                    {profile?.strikes ?? 0} / 3
                  </p>
                </div>
                <div className="dark:bg-gray-800/40 bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-[var(--t-text-muted)]">
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
              <h3 className="font-semibold text-[var(--t-text)] mb-3">
                Bio{" "}
                <span className="text-xs dark:text-purple-400/50 text-purple-400 font-normal">
                  ({bio.length}/500)
                </span>
              </h3>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                rows={5}
                placeholder="Tell students about your teaching experience, approach, and what makes your classes unique…"
                className="w-full px-4 py-3 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            {/* Grades */}
            <div className={`${card} p-5`}>
              <h3 className="font-semibold text-[var(--t-text)] mb-3">
                Grade Levels
              </h3>
              <div className="flex flex-wrap gap-2">
                {GRADE_OPTIONS.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleGrade(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      grades.includes(g)
                        ? "bg-purple-600 text-white shadow-sm"
                        : "dark:bg-gray-800/40 bg-gray-100 text-[var(--t-text-muted)] dark:hover:bg-purple-900/30 hover:bg-purple-100"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <button
              onClick={save}
              disabled={saving}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-purple-600/20 disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving…" : "Save Changes ✦"}
            </button>
          </div>
        )}

        {/* ── Documents tab ─────────────────────────────────────────────────── */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            <div className={`${card} p-5`}>
              <h3 className="font-semibold text-[var(--t-text)] mb-1">
                Verification Documents
              </h3>
              <p className="text-sm text-[var(--t-text-muted)] mb-3">
                Upload your documents to build trust with parents and increase
                your search ranking. All documents are reviewed by Lumexa and
                kept confidential.
              </p>

              {profile?.docsLocked ? (
                <div className="mb-4 p-3 rounded-xl dark:bg-amber-900/20 bg-amber-50 border dark:border-amber-800/30 border-amber-200">
                  <p className="text-xs dark:text-amber-300 text-amber-700">
                    🔒 <strong>Locked:</strong> Your profile has been verified
                    by Lumexa. You can still view what you uploaded, but
                    reuploading or removing documents is disabled. Contact
                    support if you need to change a document.
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-3 rounded-xl dark:bg-blue-900/20 bg-blue-50 dark:border dark:border-blue-800/30 border-blue-200">
                  <p className="text-xs dark:text-blue-300 text-blue-700">
                    ℹ️ You&apos;re free to upload or reupload any document as many
                    times as you like until your profile is verified. Once
                    Lumexa verifies your profile, this tab will be locked for
                    your safety.
                  </p>
                </div>
              )}

              {docError && (
                <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
                  {docError}
                </div>
              )}

              <div className="space-y-3">
                {DOC_REQUIREMENTS.map((doc) => {
                  const uploaded = docs.find((d) => d.type === doc.key);
                  const justUploaded = justUploadedType === doc.key;
                  return (
                    <div
                      key={doc.key}
                      className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-colors duration-500 ${
                        justUploaded
                          ? "dark:bg-green-900/40 dark:border-green-500/60 bg-green-100 border-green-400 ring-2 ring-green-400/50"
                          : uploaded
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
                            <p className="text-sm font-semibold text-[var(--t-text)]">
                              {doc.label}
                            </p>
                            {doc.required ? (
                              <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                                Required
                              </span>
                            ) : (
                              <span className="text-xs px-1.5 py-0.5 dark:bg-gray-700/40 bg-gray-200 dark:text-gray-400 text-gray-500 rounded-full">
                                Optional
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--t-text-muted)] mt-0.5">
                            {doc.desc}
                          </p>
                          {justUploaded ? (
                            <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1 fade-in">
                              ✅ Just uploaded successfully!
                            </p>
                          ) : (
                            uploaded && (
                              <p className="text-xs text-green-500 mt-1">
                                ✅ Uploaded ·{" "}
                                {new Date(
                                  uploaded.uploadedAt,
                                ).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            )
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
                            {!profile?.docsLocked && (
                              <button
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = ".pdf,.jpg,.jpeg,.png";
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement)
                                      .files?.[0];
                                    if (file) handleDocUpload(doc.key, file);
                                  };
                                  input.click();
                                }}
                                disabled={docUploading === doc.key}
                                className="text-xs px-2.5 py-1.5 rounded-lg dark:bg-purple-600/20 bg-purple-100 dark:text-purple-300 text-purple-700 dark:hover:bg-purple-600/30 hover:bg-purple-200 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {docUploading === doc.key
                                  ? "Uploading..."
                                  : "Reupload"}
                              </button>
                            )}
                          </div>
                        ) : !profile?.docsLocked ? (
                          <button
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = ".pdf,.jpg,.jpeg,.png";
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement)
                                  .files?.[0];
                                if (file) handleDocUpload(doc.key, file);
                              };
                              input.click();
                            }}
                            disabled={docUploading === doc.key}
                            className="text-xs px-2.5 py-1.5 rounded-lg dark:bg-purple-600/20 bg-purple-100 dark:text-purple-300 text-purple-700 dark:hover:bg-purple-600/30 hover:bg-purple-200 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {docUploading === doc.key
                              ? "Uploading..."
                              : "Upload"}
                          </button>
                        ) : (
                          <span className="text-xs px-2.5 py-1.5 rounded-lg dark:bg-gray-700/40 bg-gray-200 dark:text-gray-400 text-gray-500">
                            Not uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 rounded-xl dark:bg-blue-900/20 bg-blue-50 dark:border dark:border-blue-800/30 border-blue-200">
                <p className="text-xs dark:text-blue-300 text-blue-700">
                  🔒 <strong>Privacy:</strong> Documents are encrypted and only
                  visible to Lumexa administrators. They are never shared with
                  students or parents. Accepted formats: PDF, JPG, PNG (max 10MB
                  each).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Payout tab ────────────────────────────────────────────────────── */}
        {activeTab === "payout" && (
          <div className="space-y-4">
            <div className={`${card} p-5`}>
              <h3 className="font-semibold text-[var(--t-text)] mb-1">
                Payout Setup
              </h3>
              <p className="text-sm text-[var(--t-text-muted)] mb-5">
                Your finalized monthly salary is calculated automatically from
                your earnings ledger — see the Earnings page for the full
                breakdown. Lumexa pays out manually every month directly to
                your bank or bKash account below.
              </p>

              {profile?.payoutLocked ? (
                <div className="mb-4 p-4 rounded-xl dark:bg-amber-900/20 bg-amber-50 border dark:border-amber-800/30 border-amber-200 flex items-start gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <p className="font-semibold dark:text-amber-300 text-amber-700">
                      Payout details locked
                    </p>
                    <p className="text-xs dark:text-amber-400/70 text-amber-600 mt-0.5">
                      Your first salary has been sent to the account below, so
                      it&apos;s now locked to prevent accidental or risky changes.
                      Need to update it?{" "}
                      <a
                        href="https://wa.me/8801774878252"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:opacity-80"
                      >
                        Contact support on WhatsApp
                      </a>
                      .
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 rounded-xl dark:bg-blue-900/20 bg-blue-50 dark:border dark:border-blue-800/30 border-blue-200">
                  <p className="text-xs dark:text-blue-300 text-blue-700">
                    ℹ️ Fill in your bank or bKash details below so Operations
                    can pay your salary. Once your first payout is sent, these
                    details will be locked for your safety.
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm dark:text-purple-300/80 text-purple-700 mb-5">
                <p>✦ Completed class: +৳200</p>
                <p>✦ Parent-teacher meeting: +৳300</p>
                <p>✦ Conversion bonus: +৳1,000</p>
                <p>✦ Operations pays out your ledger total manually each month</p>
              </div>

              <fieldset disabled={!!profile?.payoutLocked} className="space-y-4 disabled:opacity-60">
                <div>
                  <p className="text-sm font-semibold text-[var(--t-text)] mb-2">
                    Payout Method
                  </p>
                  <div className="flex gap-2">
                    {(["bkash", "bank"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPayoutMethod(m)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                          payoutMethod === m
                            ? "bg-purple-600 text-white shadow-sm"
                            : "dark:bg-gray-800/40 bg-gray-100 text-[var(--t-text-muted)] dark:hover:bg-purple-900/30 hover:bg-purple-100"
                        }`}
                      >
                        {m === "bkash" ? "📱 bKash" : "🏦 Bank Account"}
                      </button>
                    ))}
                  </div>
                </div>

                {payoutMethod === "bkash" && (
                  <div>
                    <label className="text-xs font-medium text-[var(--t-text-muted)] mb-1 block">
                      bKash Number
                    </label>
                    <input
                      type="tel"
                      value={bkashNumber}
                      onChange={(e) => setBkashNumber(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-4 py-3 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>
                )}

                {payoutMethod === "bank" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-[var(--t-text-muted)] mb-1 block">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={bankAccountName}
                        onChange={(e) => setBankAccountName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--t-text-muted)] mb-1 block">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--t-text-muted)] mb-1 block">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--t-text-muted)] mb-1 block">
                        Branch Name
                      </label>
                      <input
                        type="text"
                        value={bankBranch}
                        onChange={(e) => setBankBranch(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      />
                    </div>
                  </div>
                )}

                {payoutMethod && (
                  <button
                    onClick={savePayout}
                    disabled={payoutSaving}
                    className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-purple-600/20 disabled:opacity-60 cursor-pointer"
                  >
                    {payoutSaving ? "Saving…" : "Save Payout Details ✦"}
                  </button>
                )}

                {payoutSaveSuccess && (
                  <div className="p-3 rounded-xl bg-green-900/20 border border-green-700/30 text-green-400 text-sm">
                    ✅ Payout details saved successfully!
                  </div>
                )}
              </fieldset>
            </div>
          </div>
        )}
      </div>

      {/* FIX Issue 5 — Lumi chatbot on teacher profile/settings page */}
      <LumiChat
        variant="teacher"
        context="Teacher profile/settings page — editing bio, grades, verification documents, and bank/bKash payout setup"
      />
    </>
  );
}

export default function TeacherProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[var(--t-bg)]">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherProfileContent />
    </Suspense>
  );
}

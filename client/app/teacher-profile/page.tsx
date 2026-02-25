// FILE PATH: client/app/teacher-profile/page.tsx
// ACTION: REPLACE the existing file entirely (or CREATE if it doesn't exist).

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";
import TeacherNav from "@/components/TeacherNav";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Profile {
  id: string;
  fullName: string;
  email: string;
  bio: string | null;
  hourlyRate: number;
  stripeOnboarded: boolean;
  ratingAvg: number;
  reviewCount: number;
  strikes: number;
  isSuspended: boolean;
}

function Spinner() {
  return (
    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
  );
}

function TeacherProfileContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stripeLoading, setStripeLoading] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    axios
      .get(`${API}/teachers/me/profile`, { headers })
      .then((res) => {
        setProfile(res.data);
        setBio(res.data.bio ?? "");
        setHourlyRate(String(res.data.hourlyRate));
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const rate = parseInt(hourlyRate, 10);
    if (isNaN(rate) || rate < 5 || rate > 500) {
      setError("Hourly rate must be between $5 and $500.");
      setSaving(false);
      return;
    }
    try {
      await axios.patch(
        `${API}/teachers/me/profile`,
        {
          bio: bio.trim() || undefined,
          hourlyRate: rate,
        },
        { headers },
      );
      setSuccess("Profile updated successfully!");
      setProfile((p) => (p ? { ...p, bio: bio.trim(), hourlyRate: rate } : p));
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : (msg ?? "Failed to save profile."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStripeOnboard = async () => {
    setStripeLoading(true);
    try {
      const res = await axios.post(
        `${API}/bookings/stripe/onboard`,
        {},
        { headers },
      );
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : (msg ?? "Stripe onboarding failed."),
      );
    } finally {
      setStripeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-black">
        <TeacherNav />
        <main className="flex-1 ml-56 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Spinner />
            <p className="text-gray-400 text-sm">Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black">
      <TeacherNav />
      <main className="flex-1 ml-56 p-6 lg:p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pilot Configuration ✦</p>
        </div>

        {/* Account Info (read-only) */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4">
            Account Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Full Name</p>
              <p className="text-sm text-gray-200">{profile?.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <p className="text-sm text-gray-200">{profile?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Rating</p>
              <p className="text-sm text-yellow-400">
                ★ {profile?.ratingAvg?.toFixed(1)} ({profile?.reviewCount}{" "}
                reviews)
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Strikes</p>
              <p
                className={`text-sm font-medium ${
                  (profile?.strikes ?? 0) === 0
                    ? "text-green-400"
                    : (profile?.strikes ?? 0) >= 2
                      ? "text-red-400"
                      : "text-yellow-400"
                }`}
              >
                {profile?.strikes} / 3{profile?.isSuspended && " — Suspended"}
              </p>
            </div>
          </div>
        </div>

        {/* Editable Profile */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4">
            Teaching Profile
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Bio <span className="text-gray-600">({bio.length}/500)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Tell parents about your teaching style, experience, and specialties..."
                className="w-full bg-gray-800 border border-gray-700 text-gray-200
                           rounded-lg px-3 py-2.5 text-sm resize-none
                           focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Hourly Rate (USD)
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  min={5}
                  max={500}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200
                             rounded-lg pl-7 pr-3 py-2.5 text-sm
                             focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                You earn 75% per class. Range: $5–$500/hr.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm">✓ {success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50
                         text-white text-sm font-medium rounded-lg transition-colors
                         flex items-center gap-2"
            >
              {saving && <Spinner />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Stripe Connect */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-1">
            Payout Setup
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Reward Ledger Configuration
          </p>

          {profile?.stripeOnboarded ? (
            <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <span className="text-green-400 text-lg">✓</span>
              <div>
                <p className="text-green-400 text-sm font-medium">
                  Stripe Connected
                </p>
                <p className="text-gray-500 text-xs">
                  Your earnings will be automatically transferred.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 p-3 bg-yellow-900/10 border border-yellow-500/20 rounded-lg mb-3">
                <span className="text-yellow-400 text-lg">⚠️</span>
                <div>
                  <p className="text-yellow-400 text-sm font-medium">
                    Stripe not connected
                  </p>
                  <p className="text-gray-500 text-xs">
                    Connect Stripe to receive real payouts.
                  </p>
                </div>
              </div>
              <button
                onClick={handleStripeOnboard}
                disabled={stripeLoading}
                className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50
                           text-black text-sm font-semibold rounded-lg transition-colors
                           flex items-center gap-2"
              >
                {stripeLoading && <Spinner />}
                {stripeLoading ? "Connecting..." : "Connect Stripe"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function TeacherProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <TeacherProfileContent />
    </Suspense>
  );
}

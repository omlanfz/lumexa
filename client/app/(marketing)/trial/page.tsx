// FILE PATH: client/app/(marketing)/trial/page.tsx
//
// Free trial booking form. No auth required.
// Submits to POST /trial on the backend.
// On success: shows confirmation with next steps.

"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";

const subjects = [
  "Python",
  "AI & Machine Learning",
  "Roblox Game Dev",
  "Web Development",
  "Scratch & Animation",
  "Data Science",
  "App Development",
  "Not sure yet",
];

interface FormState {
  parentName: string;
  parentEmail: string;
  childName: string;
  childAge: string;
  subject: string;
  timezone: string;
  message: string;
}

const initial: FormState = {
  parentName: "",
  parentEmail: "",
  childName: "",
  childAge: "",
  subject: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
  message: "",
};

export default function TrialPage() {
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/trial`, {
        parentName: form.parentName,
        parentEmail: form.parentEmail,
        childName: form.childName,
        childAge: Number(form.childAge),
        subject: form.subject,
        timezone: form.timezone,
        message: form.message || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center p-8 bg-gray-900/60 border border-green-800/50 rounded-2xl shadow-xl">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-white mb-3">You're Booked!</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-2">
            We've received your free trial request for{" "}
            <span className="text-white font-semibold">{form.childName}</span>.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            We'll email <span className="text-white font-semibold">{form.parentEmail}</span> within
            a few hours to confirm your teacher match and class time.
          </p>
          <div className="p-4 bg-green-900/20 border border-green-800/40 rounded-xl mb-6 text-left">
            <p className="text-green-400 text-xs font-semibold mb-2">What happens next:</p>
            <ol className="space-y-1.5 text-gray-400 text-xs">
              <li>1. We match {form.childName} with the perfect teacher</li>
              <li>2. You receive an email with the class link + time</li>
              <li>3. Join the live class — it's completely free</li>
              <li>4. Decide if you'd like to continue (no pressure)</li>
            </ol>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/register" className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-all text-center">
              Create an Account
            </Link>
            <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
              Back to Home →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left: Info */}
        <div className="lg:sticky lg:top-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-700/40 bg-purple-900/20 text-purple-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 pulse-dot" />
            100% Free · No credit card needed
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
            Book Your Child's Free Trial Class
          </h1>
          <p className="text-gray-400 leading-relaxed mb-8">
            Fill in the form and we'll match your child with the perfect teacher within a few hours.
            The first class is completely free — no strings attached.
          </p>

          <div className="space-y-4">
            {[
              { icon: "👩‍🏫", title: "Verified Expert Teachers", desc: "Background-checked, degree-qualified, and trained in child-focused pedagogy." },
              { icon: "📅", title: "Flexible Scheduling", desc: "Pick any time that works for your family — weekdays, evenings, or weekends." },
              { icon: "🎯", title: "Personalized Learning", desc: "The teacher adapts every lesson to your child's pace, goals, and learning style." },
              { icon: "🏆", title: "Real Portfolio Projects", desc: "By the end of the course, your child will have built something real to show off." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <div className="text-white font-semibold text-sm">{item.title}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form */}
        <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-1">Trial Request Form</h2>
          <p className="text-gray-600 text-xs mb-6">Recruit New Cadet · Mission Start</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Parent */}
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                Your Name (Parent / Guardian)
              </label>
              <input
                type="text"
                value={form.parentName}
                onChange={set("parentName")}
                required
                minLength={2}
                maxLength={80}
                placeholder="e.g. Sarah Johnson"
                className="w-full bg-black/60 border border-gray-700 focus:border-purple-500 outline-none rounded-lg p-3 text-white text-sm placeholder-gray-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                Your Email
              </label>
              <input
                type="email"
                value={form.parentEmail}
                onChange={set("parentEmail")}
                required
                placeholder="e.g. sarah@email.com"
                className="w-full bg-black/60 border border-gray-700 focus:border-purple-500 outline-none rounded-lg p-3 text-white text-sm placeholder-gray-600 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Child's Name
                </label>
                <input
                  type="text"
                  value={form.childName}
                  onChange={set("childName")}
                  required
                  minLength={2}
                  maxLength={50}
                  placeholder="e.g. Alex"
                  className="w-full bg-black/60 border border-gray-700 focus:border-purple-500 outline-none rounded-lg p-3 text-white text-sm placeholder-gray-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Child's Age
                </label>
                <input
                  type="number"
                  value={form.childAge}
                  onChange={set("childAge")}
                  required
                  min={5}
                  max={19}
                  placeholder="e.g. 12"
                  className="w-full bg-black/60 border border-gray-700 focus:border-purple-500 outline-none rounded-lg p-3 text-white text-sm placeholder-gray-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                Subject of Interest
              </label>
              <select
                value={form.subject}
                onChange={set("subject")}
                required
                className="w-full bg-black/60 border border-gray-700 focus:border-purple-500 outline-none rounded-lg p-3 text-white text-sm transition-colors"
              >
                <option value="">Select a subject…</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                Anything else? (optional)
              </label>
              <textarea
                value={form.message}
                onChange={set("message")}
                rows={3}
                maxLength={500}
                placeholder="e.g. My child has no experience but loves Minecraft…"
                className="w-full bg-black/60 border border-gray-700 focus:border-purple-500 outline-none rounded-lg p-3 text-white text-sm placeholder-gray-600 transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-900/20 border border-red-900/40 rounded-lg p-2">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg shadow-purple-900/40 transition-all active:scale-95 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </span>
              ) : (
                <>
                  Book Free Trial
                  <span className="block text-xs font-normal opacity-70">
                    We'll confirm via email within a few hours
                  </span>
                </>
              )}
            </button>

            <p className="text-gray-700 text-[10px] text-center">
              By submitting, you agree to our privacy policy. We never share your data.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

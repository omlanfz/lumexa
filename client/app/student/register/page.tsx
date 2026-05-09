'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { LABELS } from '@/lib/labels';

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  age: string;
  grade: string;
  subjects: string;
  billingContactEmail: string;
}

export default function StudentRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    fullName: '',
    email: '',
    password: '',
    age: '',
    grade: '',
    subjects: '',
    billingContactEmail: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingConsent, setPendingConsent] = useState<string | null>(null);

  const age = parseInt(form.age, 10);
  const needsConsent = !isNaN(age) && age < 16;

  const set = (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim()) { setError('Full name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!form.age || isNaN(age) || age < 5 || age > 21) {
      setError('Please enter a valid age (5–21).');
      return;
    }
    if (needsConsent && !form.billingContactEmail.trim()) {
      setError('A parent or guardian email is required for students under 16.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        age,
        grade: form.grade.trim() || undefined,
        subjects: form.subjects ? form.subjects.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      };
      if (needsConsent) payload.billingContactEmail = form.billingContactEmail.trim();

      const res = await api.post('/students/register', payload);

      if (res.data.status === 'PENDING_CONSENT') {
        setPendingConsent(res.data.message);
      } else {
        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        router.push('/student-dashboard');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Pending consent confirmation screen
  if (pendingConsent) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-6">📨</div>
          <h1 className="text-2xl font-bold text-white mb-3">Check Your Parent's Email</h1>
          <p className="text-gray-400 mb-2">{pendingConsent}</p>
          <p className="text-gray-500 text-sm mb-8">
            The consent link expires in 48 hours. Once approved, you can log in.
          </p>
          <Link
            href="/student/login"
            className="text-teal-400 hover:text-teal-300 text-sm underline"
          >
            Go to Student Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold text-white">{LABELS.STUDENT_REGISTER.primary}</h1>
          <p className="text-gray-400 mt-2">{LABELS.STUDENT_REGISTER.theme}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 space-y-5">
          {/* Full name */}
          <div>
            <label htmlFor="fullName" className="block text-sm text-gray-300 mb-1.5">Full Name</label>
            <input
              id="fullName"
              type="text"
              value={form.fullName}
              onChange={set('fullName')}
              placeholder="Alex Johnson"
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm text-gray-300 mb-1.5">Email Address</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="alex@example.com"
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm text-gray-300 mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-teal-600"
            />
            {form.password.length > 0 && (
              <div className="mt-1.5 w-full bg-gray-700 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all ${
                    form.password.length >= 12 ? 'bg-green-400 w-full' :
                    form.password.length >= 8  ? 'bg-yellow-400 w-2/3' :
                    'bg-red-400 w-1/3'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Age */}
          <div>
            <label htmlFor="age" className="block text-sm text-gray-300 mb-1.5">Age</label>
            <input
              id="age"
              type="number"
              value={form.age}
              onChange={set('age')}
              placeholder="e.g. 14"
              min={5}
              max={21}
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Grade (optional) */}
          <div>
            <label htmlFor="grade" className="block text-sm text-gray-300 mb-1.5">
              Grade <span className="text-gray-500">(optional)</span>
            </label>
            <input
              id="grade"
              type="text"
              value={form.grade}
              onChange={set('grade')}
              placeholder="e.g. Grade 9"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Subjects (optional) */}
          <div>
            <label htmlFor="subjects" className="block text-sm text-gray-300 mb-1.5">
              Subjects <span className="text-gray-500">(optional, comma-separated)</span>
            </label>
            <input
              id="subjects"
              type="text"
              value={form.subjects}
              onChange={set('subjects')}
              placeholder="e.g. Math, Science, English"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Age-gate: billing contact for under-16 */}
          {needsConsent && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 text-lg flex-shrink-0">⚠️</span>
                <p className="text-amber-300 text-sm">
                  Students under 16 require a parent or guardian to approve their account before they can log in.
                </p>
              </div>
              <div>
                <label htmlFor="billingContactEmail" className="block text-sm text-gray-300 mb-1.5">
                  Parent / Guardian Email
                </label>
                <input
                  id="billingContactEmail"
                  type="email"
                  value={form.billingContactEmail}
                  onChange={set('billingContactEmail')}
                  placeholder="parent@example.com"
                  required={needsConsent}
                  className="w-full bg-gray-800 border border-amber-700/50 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-500 hover:bg-teal-400 text-black font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Creating account…
              </span>
            ) : (
              needsConsent ? 'Create Account & Send Consent Email' : 'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/student/login" className="text-teal-400 hover:text-teal-300">
            {LABELS.STUDENT_LOGIN.primary}
          </Link>
        </p>

        <p className="text-center text-gray-600 text-xs mt-4">
          Are you a teacher?{' '}
          <Link href="/register" className="text-gray-500 hover:text-gray-400 underline">
            Teacher registration
          </Link>
        </p>
      </div>
    </main>
  );
}

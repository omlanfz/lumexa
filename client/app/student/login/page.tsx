'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { LABELS } from '@/lib/labels';

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }

    setSubmitting(true);
    try {
      const res = await api.post('/students/login', { email: email.trim(), password });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      router.push('/student-dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] }; status?: number } };
      const msg = e.response?.data?.message;
      if (e.response?.status === 403) {
        setError(typeof msg === 'string' ? msg : 'Account not yet active. Check your email for consent link.');
      } else {
        setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Login failed. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🌌</div>
          <h1 className="text-3xl font-bold text-white">{LABELS.STUDENT_LOGIN.primary}</h1>
          <p className="text-gray-400 mt-2">{LABELS.STUDENT_LOGIN.theme}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-300 mb-1.5">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              required
              autoComplete="email"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-300 mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              autoComplete="current-password"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-teal-600"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-500 hover:bg-teal-400 text-black font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Logging in…
              </span>
            ) : (
              LABELS.STUDENT_LOGIN.primary
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/student/register" className="text-teal-400 hover:text-teal-300">
            {LABELS.STUDENT_REGISTER.primary}
          </Link>
        </p>

        <p className="text-center text-gray-600 text-xs mt-4">
          Are you a teacher?{' '}
          <Link href="/login" className="text-gray-500 hover:text-gray-400 underline">
            Teacher login
          </Link>
        </p>
      </div>
    </main>
  );
}

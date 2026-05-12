'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';

function ConsentConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid consent link. No token found in URL.');
      return;
    }

    api
      .post(`/students/consent/confirm/${token}`)
      .then((res) => {
        setMessage(res.data.message);
        setStatus('success');
      })
      .catch((err) => {
        const msg = err.response?.data?.message;
        setMessage(
          Array.isArray(msg)
            ? msg.join(', ')
            : (msg ?? 'Failed to activate account. The link may have expired.'),
        );
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="w-full max-w-md text-center">
      {status === 'loading' && (
        <>
          <div className="w-12 h-12 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-400">Verifying consent…</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-2xl font-bold text-white mb-3">Account Activated!</h1>
          <p className="text-gray-400 mb-8">{message}</p>
          <Link
            href="/login"
            className="inline-block bg-teal-500 hover:bg-teal-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Log In
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-2xl font-bold text-white mb-3">Activation Failed</h1>
          <p className="text-red-400 text-sm mb-8">{message}</p>
          <p className="text-gray-500 text-sm">
            Please ask the student to register again to receive a new consent email.
          </p>
        </>
      )}
    </div>
  );
}

export default function ConsentConfirmPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="w-12 h-12 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        }
      >
        <ConsentConfirmContent />
      </Suspense>
    </main>
  );
}

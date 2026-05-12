'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';

function MockPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [status, setStatus] = useState<'loading' | 'confirming' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      const role = getStoredRole();
      router.push('/login');
      return;
    }

    if (!bookingId) {
      setError('No booking ID provided.');
      setStatus('error');
      return;
    }

    confirmPayment();
  }, [bookingId]);

  const confirmPayment = async () => {
    setStatus('confirming');
    try {
      await api.post(`/bookings/${bookingId}/mock-confirm`);
      setStatus('success');

      const role = getStoredRole();
      const dest = role === 'STUDENT' ? '/student-dashboard?booked=true' : '/dashboard?booked=true';
      setTimeout(() => router.push(dest), 2000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Payment confirmation failed.'));
      setStatus('error');
    }
  };

  if (status === 'loading' || status === 'confirming') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <div className="animate-spin text-5xl">🛸</div>
        <p className="text-blue-400 font-mono tracking-widest animate-pulse text-sm">
          {status === 'confirming' ? 'CONFIRMING BOOKING...' : 'INITIALIZING...'}
        </p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-6xl">🎉</div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Booking Confirmed!</h1>
          <p className="text-gray-400 text-sm mt-2">Redirecting to your dashboard…</p>
        </div>
        <div className="w-8 h-8 border-b-2 border-teal-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-5xl">🚫</div>
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">Confirmation Failed</h1>
        <p className="text-red-400 text-sm mt-2 max-w-sm">{error}</p>
      </div>
      <button
        onClick={confirmPayment}
        className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-lg text-sm transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

export default function MockPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
        </div>
      }
    >
      <MockPaymentContent />
    </Suspense>
  );
}

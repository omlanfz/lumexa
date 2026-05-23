'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LABELS } from '@/lib/labels';

interface UpcomingBooking {
  bookingId: string;
  classStart: string;
  classEnd: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
}

interface NextClassCardProps {
  booking: UpcomingBooking | null;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Joinable window: T-10min to classEnd
function isJoinable(classStart: string, classEnd: string): boolean {
  const now = Date.now();
  const start = new Date(classStart).getTime();
  const end = new Date(classEnd).getTime();
  return now >= start - 10 * 60 * 1000 && now < end;
}

export default function NextClassCard({ booking }: NextClassCardProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState('');
  const [joinable, setJoinable] = useState(false);

  useEffect(() => {
    if (!booking) return;

    const tick = () => {
      const now = Date.now();
      const start = new Date(booking.classStart).getTime();
      setCountdown(formatCountdown(start - now));
      setJoinable(isJoinable(booking.classStart, booking.classEnd));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [booking]);

  if (!booking) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">🚀</div>
        <h3 className="text-white font-semibold text-lg mb-2">No missions scheduled</h3>
        <p className="text-gray-400 text-sm mb-6">Book a session with a teacher to launch your next mission.</p>
        <button
          onClick={() => router.push('/marketplace')}
          className="bg-teal-500 hover:bg-teal-400 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
        >
          {LABELS.STUDENT_BOOK_CLASS.primary}
        </button>
      </div>
    );
  }

  const start = new Date(booking.classStart);
  const initial = booking.teacherName ? booking.teacherName.charAt(0).toUpperCase() : 'T';

  return (
    <div className="bg-teal-900/20 border border-teal-800/30 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {booking.teacherAvatarUrl ? (
            <img
              src={booking.teacherAvatarUrl}
              alt={booking.teacherName}
              className="w-14 h-14 rounded-full object-cover border-2 border-teal-700/50 flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-teal-800/50 border border-teal-700/50 flex items-center justify-center text-teal-300 text-xl font-bold flex-shrink-0">
              {initial}
            </div>
          )}
          <div>
            <p className="text-xs text-teal-400 font-medium uppercase tracking-wide mb-0.5">
              {LABELS.STUDENT_NEXT_CLASS.theme}
            </p>
            <h2 className="text-white font-semibold text-lg">{LABELS.STUDENT_NEXT_CLASS.primary}</h2>
            <p className="text-gray-300 text-sm mt-0.5">with {booking.teacherName}</p>
            <p className="text-gray-400 text-xs mt-1">
              {start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}
              {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">Starts in</p>
          <p className="text-3xl font-mono font-bold text-teal-400 tabular-nums">
            {countdown || '--:--:--'}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={() => router.push(`/classroom/${booking.bookingId}`)}
          disabled={!joinable}
          className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
            joinable
              ? 'bg-teal-500 hover:bg-teal-400 text-black'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {joinable
            ? `🚀 ${LABELS.STUDENT_ENTER_CLASS.primary}`
            : `${LABELS.STUDENT_ENTER_CLASS.primary} (opens 10 min before class)`}
        </button>
        {joinable && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs font-medium">Live</span>
          </div>
        )}
      </div>
    </div>
  );
}

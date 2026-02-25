"use client";

import { useEffect, useState, Suspense } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";

interface BookingDetails {
  id: string;
  shift: {
    start: string;
    end: string;
    teacher: {
      hourlyRate: number;
      user: { fullName: string };
    };
  };
  student: {
    name: string;
  };
  amountCents: number;
}

// ─── Inner component — uses useSearchParams, must live inside <Suspense> ─────
function MockPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) {
      router.push("/dashboard");
      return;
    }
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setBooking(res.data);
      setLoading(false);
    } catch (err) {
      // If the booking details endpoint isn't wired yet, we still show
      // the mock confirmation page with minimal info
      setLoading(false);
    }
  };

  const handleMockPay = async () => {
    const token = localStorage.getItem("token");
    if (!token || !bookingId) return;

    setConfirming(true);
    setError("");

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/mock-confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Success — redirect to dashboard
      router.push("/dashboard?booked=true");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Payment confirmation failed. Try again.",
      );
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    const token = localStorage.getItem("token");
    if (!token || !bookingId) return;

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch {
      // Ignore errors on cancel
    }
    router.push("/marketplace");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-mono">
        <div className="animate-pulse text-blue-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Dev Mode Badge */}
        <div className="mb-6 text-center">
          <span className="text-xs font-bold bg-yellow-900/40 text-yellow-400 border border-yellow-700 px-3 py-1 rounded-full tracking-wider">
            🧪 DEVELOPMENT MODE — MOCK PAYMENT
          </span>
        </div>

        {/* Payment Card */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-900/60 to-purple-900/60 px-6 py-5 border-b border-gray-700">
            <h1 className="text-xl font-bold text-white">
              Confirm Lesson Booking
            </h1>
            <p className="text-gray-400 text-xs mt-1">
              Payment Confirmation · Mock Gateway
            </p>
          </div>

          {/* Booking Details */}
          <div className="p-6 space-y-4">
            {booking ? (
              <>
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400 text-sm">Teacher</span>
                  <span className="text-white font-bold">
                    {booking.shift.teacher.user.fullName}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400 text-sm">Student</span>
                  <span className="text-white font-bold">
                    {booking.student.name}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400 text-sm">Date</span>
                  <span className="text-white font-bold">
                    {new Date(booking.shift.start).toLocaleDateString(
                      undefined,
                      { weekday: "long", month: "short", day: "numeric" },
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <span className="text-gray-400 text-sm">Time</span>
                  <span className="text-white font-bold">
                    {new Date(booking.shift.start).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    –{" "}
                    {new Date(booking.shift.end).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-400 text-sm">Amount</span>
                  <span className="text-green-400 font-bold text-xl">
                    $
                    {(
                      (booking.amountCents ??
                        booking.shift.teacher.hourlyRate * 100) / 100
                    ).toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              // Minimal view if booking details couldn't load
              <div className="py-4 text-center">
                <p className="text-gray-300 font-bold">Booking ID</p>
                <p className="text-blue-400 font-mono text-sm mt-1 break-all">
                  {bookingId}
                </p>
                <p className="text-gray-500 text-xs mt-3">
                  Your lesson has been reserved.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Mock payment explanation */}
            <div className="p-3 bg-blue-900/10 border border-blue-800/50 rounded text-xs text-blue-400">
              <p className="font-bold mb-1">💡 Development Mode</p>
              <p className="text-gray-500">
                In production, this page is replaced by Stripe's secure payment
                form. Clicking "Confirm Payment" below simulates a successful
                payment without any real charge.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 space-y-3">
            <button
              onClick={handleMockPay}
              disabled={confirming}
              className={`w-full py-4 font-bold text-white rounded-xl text-lg tracking-wide transition-all transform ${
                confirming
                  ? "bg-green-700 cursor-wait opacity-70"
                  : "bg-green-600 hover:bg-green-500 active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
              }`}
            >
              {confirming ? "Confirming..." : "✓ Confirm Payment (Mock)"}
            </button>

            <button
              onClick={handleCancel}
              disabled={confirming}
              className="w-full py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel and go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Default export with required Suspense boundary ───────────────────────────
export default function MockPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white font-mono">
          <div className="animate-pulse text-blue-400">Loading Payment...</div>
        </div>
      }
    >
      <MockPaymentContent />
    </Suspense>
  );
}

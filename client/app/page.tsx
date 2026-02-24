"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDate, formatTime, isClassJoinable } from "../../lib/time";

interface Shift {
  id: string;
  start: string;
  end: string;
  isBooked: boolean;
  booking?: {
    id: string;
    student: {
      name: string;
    };
  };
}

interface TeacherProfile {
  stripeOnboarded: boolean;
  isSuspended: boolean;
  strikes: number;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [stripeMessage, setStripeMessage] = useState("");

  const nowString = new Date().toISOString().slice(0, 16);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Handle Stripe onboarding return
    const stripeStatus = searchParams.get("stripe");
    if (stripeStatus === "success") {
      // Verify onboarding completed
      axios
        .post(
          `${process.env.NEXT_PUBLIC_API_URL}/bookings/stripe/verify`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        )
        .then((res) => {
          if (res.data.onboarded) {
            setStripeMessage(
              "✅ Stripe setup complete! You can now receive payments.",
            );
          } else {
            setStripeMessage("⚠️ Stripe setup not complete. Please try again.");
          }
        })
        .catch(() => setStripeMessage("Failed to verify Stripe status."));
    } else if (stripeStatus === "refresh") {
      setStripeMessage("Stripe setup was interrupted. Please try again.");
    }

    fetchShifts(token);
  }, []);

  const fetchShifts = async (token: string) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/shifts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShifts(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error loading shifts");
      setLoading(false);
    }
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = new Date();

    if (startDate < now) {
      alert("❌ Shift start time cannot be in the past.");
      return;
    }
    if (endDate <= startDate) {
      alert("❌ End time must be after start time.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/shifts`,
        { start, end },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchShifts(token);
      setStart("");
      setEnd("");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create shift.");
    }
  };

  const handleStripeOnboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/stripe/onboard`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // Redirect to Stripe hosted onboarding
      window.location.href = res.data.url;
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to start Stripe setup.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
        Loading Flight Deck...
      </div>
    );

  return (
    <div className="min-h-screen text-white p-8 font-sans bg-black/50">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-purple-500 tracking-widest uppercase">
            FLIGHT DECK
          </h1>
          <p className="text-gray-400 mt-1">Pilot Interface</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-red-400 border border-red-900 px-4 py-2 rounded hover:bg-red-900/20 transition-all"
        >
          Logout
        </button>
      </div>

      {/* Stripe notification banner */}
      {stripeMessage && (
        <div className="max-w-6xl mx-auto mb-6 p-4 bg-purple-900/30 border border-purple-500/50 rounded-lg text-purple-300 text-sm">
          {stripeMessage}
        </div>
      )}

      {/* Stripe Onboarding Banner — show if not yet onboarded */}
      {profile && !profile.stripeOnboarded && (
        <div className="max-w-6xl mx-auto mb-6 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-yellow-400 font-bold text-sm">
              💳 Set up payments to get paid
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Connect your Stripe account to receive payouts when classes
              complete.
            </p>
          </div>
          <button
            onClick={handleStripeOnboard}
            className="ml-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold rounded transition-all shrink-0"
          >
            Connect Stripe →
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT: Add Availability */}
        <div className="bg-gray-900/60 border border-gray-800 p-8 rounded-xl shadow-lg backdrop-blur-md">
          <h2 className="text-xl font-bold text-purple-400 mb-6 flex items-center">
            <span className="mr-2">⏱️</span> Log Flight Availability
          </h2>
          <p className="text-gray-500 text-xs mb-4">
            Times are shown and stored in your local timezone.
          </p>
          <form onSubmit={handleAddShift} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                Mission Start
              </label>
              <input
                type="datetime-local"
                min={nowString}
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-purple-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                Mission End
              </label>
              <input
                type="datetime-local"
                min={start || nowString}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-purple-500 outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all transform active:scale-95"
            >
              CONFIRM FLIGHT BLOCK
            </button>
          </form>
        </div>

        {/* RIGHT: Current Schedule */}
        <div>
          <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center">
            <span className="mr-2">📅</span> Scheduled Flight Blocks
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {shifts.map((shift) => {
              const joinable =
                shift.isBooked && shift.booking
                  ? isClassJoinable(shift.start, shift.end)
                  : false;

              return (
                <div
                  key={shift.id}
                  className={`p-5 border rounded-lg flex justify-between items-center transition-colors ${
                    shift.isBooked
                      ? "bg-purple-900/20 border-purple-500/50"
                      : "bg-black/80 border-gray-800"
                  }`}
                >
                  <div>
                    {/* Date — uses user's local timezone */}
                    <p className="font-bold text-white text-lg">
                      {formatDate(shift.start)}
                    </p>
                    {/* Times — with timezone abbreviation */}
                    <p className="text-sm text-gray-400 mt-1">
                      {formatTime(shift.start)} – {formatTime(shift.end)}
                    </p>

                    {shift.isBooked && shift.booking && (
                      <div className="mt-2 text-sm text-purple-300">
                        <div className="flex items-center mb-2">
                          <span className="mr-2">🧑‍🚀</span>
                          Cadet:{" "}
                          <span className="font-bold ml-1">
                            {shift.booking.student.name}
                          </span>
                        </div>
                        {/* Only show join button when class is active */}
                        {joinable ? (
                          <button
                            onClick={() =>
                              router.push(`/classroom/${shift.booking?.id}`)
                            }
                            className="w-full py-2 bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-bold rounded shadow-[0_0_10px_rgba(147,51,234,0.5)] tracking-widest border border-purple-500 animate-pulse"
                          >
                            🔴 LIVE — ENTER STAR LAB
                          </button>
                        ) : (
                          <p className="text-gray-500 text-xs">
                            Classroom opens 10 min before class
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <span
                    className={`px-3 py-1 text-xs font-bold rounded border tracking-wider shrink-0 ml-4 ${
                      shift.isBooked
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-green-900/30 text-green-400 border-green-800"
                    }`}
                  >
                    {shift.isBooked ? "BOOKED" : "OPEN"}
                  </span>
                </div>
              );
            })}
            {shifts.length === 0 && (
              <div className="text-center p-8 border border-dashed border-gray-800 rounded-lg text-gray-500">
                No flight blocks logged yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

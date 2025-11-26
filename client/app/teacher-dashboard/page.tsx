"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

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

export default function TeacherDashboard() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(true);

  // Get current date in format "YYYY-MM-DDTHH:mm" to disable past dates in the calendar
  const nowString = new Date().toISOString().slice(0, 16);

  // Load existing shifts
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchShifts(token);
  }, []);

  const fetchShifts = async (token: string) => {
    try {
      const res = await axios.get("${process.env.NEXT_PUBLIC_API_URL}/shifts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShifts(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error loading flight logs");
      // Optional: Redirect to login if token expired
    }
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. VALIDATION LOGIC START
    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = new Date();

    // Check if start is in the past
    if (startDate < now) {
      alert("❌ Error: You cannot schedule a mission in the past.");
      return;
    }

    // Check if end is before start
    if (endDate <= startDate) {
      alert("❌ Error: Mission End time must be after Start time.");
      return;
    }
    // VALIDATION LOGIC END

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await axios.post(
        "${process.env.NEXT_PUBLIC_API_URL}/shifts",
        { start, end },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh list
      fetchShifts(token);
      setStart("");
      setEnd("");
    } catch (err: any) {
      // Show the specific error message from the backend
      alert(err.response?.data?.message || "Failed to log flight time.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading Flight Deck...
      </div>
    );

  return (
    <div className="min-h-screen text-white p-8 font-sans bg-black/50">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-12 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-purple-500 tracking-widest uppercase glow-text">
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

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT: Add Availability */}
        <div className="bg-gray-900/60 border border-gray-800 p-8 rounded-xl shadow-lg backdrop-blur-md">
          <h2 className="text-xl font-bold text-purple-400 mb-6 flex items-center">
            <span className="mr-2">⏱️</span> Log Flight Availability
          </h2>
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
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className={`p-5 border rounded-lg flex justify-between items-center transition-colors ${
                  shift.isBooked
                    ? "bg-purple-900/20 border-purple-500/50" // Highlighting Booked Shifts
                    : "bg-black/80 border-gray-800"
                }`}
              >
                <div>
                  <p className="font-bold text-white text-lg">
                    {new Date(shift.start).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(shift.start).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(shift.end).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  {/* SHOW STUDENT NAME IF BOOKED */}
                  {shift.isBooked && shift.booking && (
                    <div className="mt-2 text-sm text-purple-300">
                      <div className="flex items-center mb-2">
                        <span className="mr-2">🧑‍🚀</span>
                        Cadet:{" "}
                        <span className="font-bold ml-1">
                          {shift.booking.student.name}
                        </span>
                      </div>

                      {/* NEW BUTTON */}
                      <button
                        onClick={() =>
                          router.push(`/classroom/${shift.booking?.id}`)
                        }
                        className="w-full py-2 bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-bold rounded shadow-[0_0_10px_rgba(147,51,234,0.5)] tracking-widest border border-purple-500"
                      >
                        INITIATE LINK (STAR LAB)
                      </button>
                    </div>
                  )}
                </div>

                <span
                  className={`px-3 py-1 text-xs font-bold rounded border tracking-wider ${
                    shift.isBooked
                      ? "bg-purple-600 text-white border-purple-500"
                      : "bg-green-900/30 text-green-400 border-green-800"
                  }`}
                >
                  {shift.isBooked ? "BOOKED" : "OPEN"}
                </span>
              </div>
            ))}
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

"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

// Types
interface Shift {
  id: string;
  start: string;
  end: string;
}
interface Teacher {
  id: string;
  hourlyRate: number;
  bio: string;
  user: { fullName: string };
  shifts: Shift[];
}
interface Cadet {
  id: string;
  name: string;
}

export default function Marketplace() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [selectedCadet, setSelectedCadet] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadData(token);
  }, []);

  const loadData = async (token: string) => {
    try {
      // 1. Get Teachers & Available Shifts
      const marketRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/marketplace`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTeachers(marketRes.data);

      // 2. Get My Cadets (to know who to book for)
      const studentRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/students`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCadets(studentRes.data);
      if (studentRes.data.length > 0) setSelectedCadet(studentRes.data[0].id);

      setLoading(false);
    } catch (err) {
      console.error("Failed to load marketplace");
    }
  };

  const handleBook = async (shiftId: string) => {
    const token = localStorage.getItem("token");
    if (!token || !selectedCadet) return;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings`,
        { shiftId, studentId: selectedCadet },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Mission Confirmed! Check your Dashboard.");
      loadData(token); // Refresh list
    } catch (err) {
      alert("Booking failed. Slot may be taken.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Scanning Sector...
      </div>
    );

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-green-400 tracking-widest uppercase glow-text">
            MISSION SELECTION
          </h1>
          <p className="text-gray-400">
            Select a Pilot (Teacher) to guide your Cadet
          </p>
        </div>

        {/* Cadet Selector */}
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-400 uppercase font-bold">
            Assign To:
          </span>
          <select
            value={selectedCadet}
            onChange={(e) => setSelectedCadet(e.target.value)}
            className="bg-black border border-gray-700 rounded px-3 py-2 text-white focus:border-green-500 outline-none"
          >
            {cadets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 gap-8">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 backdrop-blur-md hover:border-blue-500/30 transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {teacher.user.fullName}
                </h2>
                <p className="text-purple-400 font-bold">
                  ${teacher.hourlyRate} / hr
                </p>
                <p className="text-gray-400 text-sm mt-2 max-w-lg">
                  {teacher.bio}
                </p>
              </div>
              <div className="text-right">
                <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded border border-blue-800">
                  LEVEL 5 PILOT
                </span>
              </div>
            </div>

            {/* Shifts Grid */}
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">
              Available Launch Windows
            </h3>
            <div className="flex flex-wrap gap-3">
              {teacher.shifts.length === 0 ? (
                <span className="text-gray-600 text-sm italic">
                  No launch windows available.
                </span>
              ) : (
                teacher.shifts.map((shift) => (
                  <button
                    key={shift.id}
                    onClick={() => handleBook(shift.id)}
                    className="px-4 py-2 bg-green-900/20 border border-green-800 hover:bg-green-600 hover:text-white text-green-400 rounded transition-all text-sm font-bold shadow-[0_0_10px_rgba(22,163,74,0.1)] hover:shadow-[0_0_15px_rgba(22,163,74,0.6)]"
                  >
                    {new Date(shift.start).toLocaleDateString(undefined, {
                      weekday: "short",
                    })}{" "}
                    {new Date(shift.start).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </button>
                ))
              )}
            </div>
          </div>
        ))}

        {teachers.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            No Pilots found in this sector.
          </div>
        )}
      </div>
    </div>
  );
}

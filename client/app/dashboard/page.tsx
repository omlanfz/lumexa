"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

// Define what a "Cadet" looks like
interface Cadet {
  id: string;
  name: string;
  age: number;
  bookings: {
    id: string;
    shift: {
      start: string;
      end: string;
    };
  }[];
}

export default function Dashboard() {
  const router = useRouter();
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for adding a new cadet
  const [newCadetName, setNewCadetName] = useState("");
  const [newCadetAge, setNewCadetAge] = useState("");

  // 1. On Load: Check Token & Fetch Data
  useEffect(() => {
    const token = localStorage.getItem("token");

    // Security Check
    if (!token) {
      router.push("/login");
      return;
    }

    fetchCadets(token);
  }, []);

  // 2. Function to call the Backend API
  const fetchCadets = async (token: string) => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/students`,
        {
          headers: { Authorization: `Bearer ${token}` }, // <--- The Security Key Card
        }
      );
      setCadets(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Access Denied");
      localStorage.removeItem("token"); // Clear bad token
      router.push("/login");
    }
  };

  // 3. Function to Recruit (Add) a new Student
  const handleRecruit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/students`,
        { name: newCadetName, age: Number(newCadetAge) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reset form and refresh list
      setNewCadetName("");
      setNewCadetAge("");
      fetchCadets(token); // Reload the list to show the new cadet
    } catch (error) {
      alert("Failed to recruit cadet.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading)
    return (
      <div className="min-h-screen  flex items-center justify-center">
        Loading Mission Control...
      </div>
    );

  return (
    <div className="min-h-screen  text-white p-8 font-sans">
      {/* Header */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-12 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-500 tracking-widest uppercase">
            Mission Control
          </h1>
          <p className="text-gray-400 mt-1">Commander's Dashboard</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-red-400 hover:text-red-300 border border-red-900 px-4 py-2 rounded hover:bg-red-900/20 transition-all"
        >
          Abort Mission (Logout)
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Cadet Roster */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-purple-400 flex items-center">
            <span className="mr-2">🚀</span> Active Cadets
          </h2>

          <div className="space-y-4">
            {cadets.length === 0 ? (
              <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg text-center text-gray-500">
                No cadets found. Recruit your first pilot!
              </div>
            ) : (
              cadets.map((cadet) => (
                <div
                  key={cadet.id}
                  className="p-4 bg-gray-900 border border-gray-800 rounded-lg transition-all shadow-lg"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        {cadet.name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        Rank: Cadet • Age {cadet.age}
                      </p>
                    </div>
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>

                  {/* UPCOMING MISSIONS LIST */}
                  <div className="space-y-2 mt-2 pt-2 border-t border-gray-800">
                    {cadet.bookings.length === 0 ? (
                      <p className="text-xs text-gray-600 italic">
                        No missions scheduled.
                      </p>
                    ) : (
                      cadet.bookings.map((b) => (
                        <div
                          key={b.id}
                          className="text-sm bg-black/50 p-2 rounded border border-gray-800 flex justify-between items-center text-gray-300"
                        >
                          <div>
                            <span className="mr-2">
                              📅 {new Date(b.shift.start).toLocaleDateString()}
                            </span>
                            <span>
                              ⏰{" "}
                              {new Date(b.shift.start).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* NEW BUTTON */}
                          <button
                            onClick={() => router.push(`/classroom/${b.id}`)}
                            className="px-3 py-1 bg-green-600/20 border border-green-500 text-green-400 text-xs rounded hover:bg-green-600 hover:text-white transition-all font-bold tracking-wider"
                          >
                            ENTER STAR LAB
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Link to Marketplace */}
                  <button
                    onClick={() => router.push("/marketplace")}
                    className="w-full mt-3 text-xs bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 py-2 rounded border border-blue-900 transition-colors"
                  >
                    + Assign New Mission
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recruit New */}
        <div>
          <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-xl shadow-2xl">
            <h2 className="text-xl font-semibold mb-6 text-green-400">
              Recruit New Pilot
            </h2>

            <form onSubmit={handleRecruit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Cadet Name
                </label>
                <input
                  type="text"
                  value={newCadetName}
                  onChange={(e) => setNewCadetName(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="e.g. Astro Alex"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={newCadetAge}
                  onChange={(e) => setNewCadetAge(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="e.g. 10"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all transform active:scale-95"
              >
                Confirm Recruitment
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

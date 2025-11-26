"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [role, setRole] = useState("PARENT"); // <--- New State
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        ...formData,
        role, // <--- Send the role
      });
      router.push("/login");
    } catch (err: any) {
      setError(err.response?.data?.message || "Initialization failed. Retry.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center text-white font-sans">
      <div className="w-full max-w-md p-8 bg-gray-900/80 border border-gray-800 rounded-xl shadow-[0_0_50px_rgba(37,99,235,0.1)] backdrop-blur-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-blue-500 tracking-widest uppercase mb-2">
            New Mission
          </h2>
          <p className="text-gray-500 text-sm">Initialize Protocol</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-900 rounded text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ROLE TOGGLE */}
          <div className="flex bg-black p-1 rounded-lg border border-gray-700">
            <button
              type="button"
              onClick={() => setRole("PARENT")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                role === "PARENT"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Commander (Parent)
            </button>
            <button
              type="button"
              onClick={() => setRole("TEACHER")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                role === "TEACHER"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Pilot (Teacher)
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              type="text"
              className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none placeholder-gray-700"
              placeholder="e.g. Cdr. Shepard"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none placeholder-gray-700"
              placeholder="user@lumexa.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none placeholder-gray-700"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-4 font-bold text-white rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all tracking-wide ${
              role === "TEACHER"
                ? "bg-purple-600 hover:bg-purple-500"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            INITIATE LAUNCH
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already authorized?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Enter Base
          </Link>
        </div>
      </div>
    </div>
  );
}

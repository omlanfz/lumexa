"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        "${process.env.NEXT_PUBLIC_API_URL}/auth/login",
        formData
      );

      // 1. Save Token
      localStorage.setItem("token", res.data.access_token);

      // 2. Check Role and Redirect
      const userRole = res.data.user.role; // We added this in Step 1

      if (userRole === "TEACHER") {
        router.push("/teacher-dashboard"); // New Page
      } else {
        router.push("/dashboard"); // Standard Parent Page
      }
    } catch (err) {
      setError("Access Denied. Verify coordinates.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center  text-white font-sans">
      <div className="w-full max-w-md p-8 bg-gray-900 border border-gray-800 rounded-xl shadow-[0_0_50px_rgba(37,99,235,0.1)]">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-blue-500 tracking-widest uppercase mb-2">
            Access Portal
          </h2>
          <p className="text-gray-500 text-sm">Identify yourself, Commander</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-900 rounded text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Comms ID (Email)
            </label>
            <input
              type="email"
              className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-700"
              placeholder="commander@lumexa.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Access Code
            </label>
            <input
              type="password"
              className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-700"
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
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all transform hover:scale-[1.02] tracking-wide"
          >
            ENTER BASE
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          First time here?{" "}
          <Link href="/register" className="text-blue-400 hover:text-blue-300">
            Initialize Protocol
          </Link>
        </div>
      </div>
    </div>
  );
}

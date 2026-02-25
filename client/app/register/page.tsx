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
  const [role, setRole] = useState<"PARENT" | "TEACHER">("PARENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        ...formData,
        role,
      });
      router.push("/login");
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center text-white font-sans px-4 py-8">
      <div className="w-full max-w-md p-8 bg-gray-900/80 border border-gray-800 rounded-xl shadow-[0_0_50px_rgba(37,99,235,0.1)] backdrop-blur-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-blue-500 tracking-widest uppercase mb-1">
            Create Account
          </h2>
          <p className="text-gray-500 text-sm">Initiate Launch</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm text-center">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Toggle */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              I am a...
            </label>
            <div className="flex bg-black p-1 rounded-lg border border-gray-700">
              <button
                type="button"
                onClick={() => setRole("PARENT")}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                  role === "PARENT"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Parent
                <span className="block text-xs font-normal opacity-60 normal-case">
                  Commander
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRole("TEACHER")}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                  role === "TEACHER"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Teacher
                <span className="block text-xs font-normal opacity-60 normal-case">
                  Pilot
                </span>
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">
              {role === "PARENT"
                ? "Book lessons and track your child's progress."
                : "Set your availability and earn by teaching."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              type="text"
              className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none transition-all placeholder-gray-700"
              placeholder="e.g. Alex Johnson"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none transition-all placeholder-gray-700"
              placeholder="you@example.com"
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
              className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none transition-all placeholder-gray-700"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 font-bold rounded-lg transition-all transform tracking-wide text-white ${
              loading
                ? "opacity-60 cursor-wait " +
                  (role === "TEACHER" ? "bg-purple-700" : "bg-blue-700")
                : role === "TEACHER"
                  ? "bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:scale-[1.02]"
                  : "bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-[1.02]"
            }`}
          >
            {loading ? "Creating account..." : "Create Account"}
            <span className="block text-xs font-normal opacity-60">
              Initiate Launch
            </span>
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 font-bold"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}

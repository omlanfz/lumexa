// FILE PATH: client/lib/axios.ts
//
// ─── Shared Auth Axios Instance ───────────────────────────────────────────────
//
// ROOT CAUSE FIX for Issues 2, 3, 4, 6, 7, 8 (all 401 Unauthorized errors):
//
//   Every API call across the app was made with plain `axios` without attaching
//   the JWT token. Each page would need to manually read localStorage and set
//   headers on every single request — this was missed on most pages.
//
// FIX: One shared axios instance with a request interceptor that automatically
//   reads the token from localStorage and injects `Authorization: Bearer <token>`
//   on EVERY outgoing request. Pages just import this instance instead of `axios`.
//
// USAGE in any page or component:
//
//   import api from "@/lib/axios";
//
//   const res = await api.get("/students");
//   const res = await api.post("/lumi/chat", { message });
//   const res = await api.patch("/teachers/me/profile", data);
//   const res = await api.post("/uploads/avatar", formData);
//
// The token is read fresh on EVERY request (not cached in the instance), so
// login/logout state changes are picked up immediately.

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// ── Request interceptor: attach JWT on every call ──────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Guard against SSR where localStorage is unavailable
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers = config.headers ?? {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: redirect to /login on 401 ───────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      // Only redirect if not already on an auth page
      const isAuthPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/register";
      if (!isAuthPage) {
        // Clear stale tokens and send to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;

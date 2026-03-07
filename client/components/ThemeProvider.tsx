// FILE PATH: client/components/ThemeProvider.tsx
//
// ─── Issue 14 Fix: Dark Mode not applied on initial page load ──────────────
//
// ROOT CAUSE (pre-fix):
//   The original useEffect restored the saved theme into React state
//   (setTheme(saved)) but never applied the corresponding CSS class to
//   document.documentElement. The class mutation only happened inside
//   toggleTheme(), which is only called when the user clicks the toggle
//   button. On a fresh page load the class was never set, so Tailwind's
//   dark: utilities never activated even though the saved theme was "dark".
//
// FIX:
//   Apply the saved theme class to <html> immediately inside the mount
//   useEffect, using the same h.classList / h.style.colorScheme /
//   h.setAttribute pattern that toggleTheme() already uses. This means the
//   correct theme is active from the very first paint after hydration.

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeCtx {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
});

// ── Helper: apply theme to <html> ─────────────────────────────────────────
function applyTheme(t: Theme) {
  const h = document.documentElement;
  h.classList.remove("dark", "light");
  h.classList.add(t);
  h.style.colorScheme = t;
  h.setAttribute("data-theme", t);
}

// ── Provider ───────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Issue 14 fix: read saved theme AND apply it to <html> on first mount.
    // Previously only setTheme() was called here, which updates React state
    // but does not touch the DOM — so dark: classes never activated.
    const saved = (localStorage.getItem("lumexa-theme") as Theme) ?? "dark";
    setTheme(saved);
    applyTheme(saved); // ← THE FIX: mutate <html> immediately on mount
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("lumexa-theme", next);
    } catch (_) {
      // localStorage may be blocked in private browsing — fail silently
    }
    applyTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, isDark: mounted ? theme === "dark" : true }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// ── ThemeToggle component ──────────────────────────────────────────────────

interface ThemeToggleProps {
  /** "teacher" = purple hover tint; "student" = blue hover tint */
  variant?: "teacher" | "student";
  className?: string;
}

export function ThemeToggle({
  variant = "teacher",
  className = "",
}: ThemeToggleProps) {
  const { toggleTheme, isDark } = useTheme();

  const hover =
    variant === "teacher"
      ? "dark:hover:bg-purple-900/30 hover:bg-purple-100"
      : "dark:hover:bg-blue-900/30 hover:bg-blue-100";

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`
        w-9 h-9 rounded-xl flex items-center justify-center
        dark:bg-white/5 bg-black/5
        border dark:border-white/10 border-black/10
        dark:text-gray-400 text-gray-500
        transition-colors ${hover} ${className}
      `}
    >
      <span className="text-base select-none leading-none">
        {isDark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}

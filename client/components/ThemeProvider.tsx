// FILE PATH: client/components/ThemeProvider.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read from localStorage (already applied synchronously via layout.tsx script)
    const saved = (localStorage.getItem("lumexa-theme") as Theme) ?? "dark";
    setTheme(saved);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("lumexa-theme", next);

    // Apply to <html> for Tailwind 'class' dark mode
    const html = document.documentElement;
    html.classList.remove("dark", "light");
    html.classList.add(next);

    // color-scheme tells browsers and extensions (Dark Reader, etc.) the intent.
    // When set to 'dark', Dark Reader skips the page. When 'light', system adapts.
    html.style.colorScheme = next;

    // data-theme attribute for any CSS variable selectors
    html.setAttribute("data-theme", next);
  };

  // Avoid hydration mismatch — render children only after mount
  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{ theme: "dark", toggleTheme, isDark: true }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, isDark: theme === "dark" }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// ─── Theme Toggle Button Component ────────────────────────────────────────────
// Import and use anywhere: <ThemeToggle variant="teacher" />

interface ThemeToggleProps {
  variant?: "teacher" | "student";
  className?: string;
}

export function ThemeToggle({
  variant = "teacher",
  className = "",
}: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();
  const accentColor =
    variant === "teacher" ? "hover:text-purple-400" : "hover:text-blue-400";

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`
        relative w-10 h-10 rounded-xl flex items-center justify-center
        transition-all duration-300 ease-in-out
        text-gray-400 ${accentColor}
        dark:bg-white/5 bg-black/5
        dark:hover:bg-white/10 hover:bg-black/10
        border dark:border-white/10 border-black/10
        ${className}
      `}
    >
      {/* Sun icon for light mode, Moon for dark mode */}
      <span className="text-lg select-none">{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}

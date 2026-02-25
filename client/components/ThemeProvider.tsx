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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("lumexa-theme") as Theme) ?? "dark";
    setTheme(saved);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("lumexa-theme", next);
    } catch (_) {}
    const h = document.documentElement;
    h.classList.remove("dark", "light");
    h.classList.add(next);
    h.style.colorScheme = next;
    h.setAttribute("data-theme", next);
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

interface ThemeToggleProps {
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
      className={`w-9 h-9 rounded-xl flex items-center justify-center dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 dark:text-gray-400 text-gray-500 transition-colors ${hover} ${className}`}
    >
      <span className="text-base select-none leading-none">
        {isDark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}

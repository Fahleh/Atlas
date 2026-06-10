"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

type ThemeProviderProps = {
  children: ReactNode;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Provides global theme state to the component tree.
 * Initializes from localStorage (key: "atlas-theme"), defaulting to "light".
 * @param children - React subtree that will have access to theme context
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";

    const stored = localStorage.getItem("atlas-theme");
    if (stored === "light" || stored === "dark") return stored;

    // Defer to system preference if no stored theme, and persist that choice.
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

    localStorage.setItem("atlas-theme", system);

    return system;
  });

  // Sync data-theme on mount and theme change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  /**
   * Toggles between "light" and "dark", syncing localStorage and the
   * data-theme attribute on <html> so CSS tokens update immediately.
   */
  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);

    localStorage.setItem("atlas-theme", next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Returns the current theme and toggleTheme function.
 * Must be used inside a ThemeProvider.
 * @returns ThemeContextValue
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);

  if (ctx === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return ctx;
}

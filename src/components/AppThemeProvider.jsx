import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "darkMode";

const AppThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

/**
 * Applies the theme class to <html> synchronously on first render so there is
 * no "white flash" before React hydrates. Reads from localStorage, falling
 * back to the user's OS preference.
 */
function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") return "dark";
    if (stored === "false") return "light";
  } catch (_) {}
  // Default to dark for the Pro Arena experience
  return "dark";
}

// Apply theme to <html> BEFORE React renders to avoid the white flash.
if (typeof document !== "undefined") {
  const initial = getInitialTheme();
  if (initial === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

export function AppThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme === "dark" ? "true" : "false");
    } catch (_) {}
  }, [theme]);

  const setTheme = (next) => setThemeState(next === "dark" ? "dark" : "light");
  const toggleTheme = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));

  return (
    <AppThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(AppThemeContext);
}
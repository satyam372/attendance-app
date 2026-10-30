import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";

// Keep in sync with the inline script in index.html.
const THEME_STORAGE_KEY = "speedin-theme";
const GLASS_STORAGE_KEY = "speedin-reduce-transparency";
const PREFERENCES = ["system", "light", "dark"];

const ThemeContext = createContext(null);

function readPreference() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return PREFERENCES.includes(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

function readReduceTransparency() {
  try {
    return localStorage.getItem(GLASS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Runs a visual switch (theme, transparency) as a cross-fade where the browser supports View
 * Transitions, like macOS switching appearance. Instant under reduced motion or without support.
 */
function crossFade(update) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduceMotion) return update();
  document.startViewTransition(() => flushSync(update));
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  // Liquid Glass is on by default; this makes every surface opaque (styles.css: html.reduce-glass)
  const [reduceTransparency, setReduceTransparency] = useState(readReduceTransparency);

  // Follow OS changes while the preference is "system".
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  // Layout effects so the class changes inside the cross-fade (flushSync runs them right away)
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("reduce-glass", reduceTransparency);
  }, [reduceTransparency]);

  const chooseReduceTransparency = useCallback((next) => {
    crossFade(() => setReduceTransparency(next));
    try {
      localStorage.setItem(GLASS_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Storage unavailable: applies for this visit only.
    }
  }, []);

  const choose = useCallback((next) => {
    crossFade(() => setPreference(next));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for this visit.
    }
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference: choose, reduceTransparency, setReduceTransparency: chooseReduceTransparency }),
    [preference, resolved, choose, reduceTransparency, chooseReduceTransparency],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}

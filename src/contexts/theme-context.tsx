"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  fetchCoordinates,
  fetchSunriseSunset,
  calculateThemeFromSunTimes,
  type Theme,
} from "@/lib/auto-theme";

type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setTheme: (theme: Theme) => void; // Backward compatibility
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "auto";
    return (localStorage.getItem("themeMode") as ThemeMode) || "auto";
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const mode = (localStorage.getItem("themeMode") as ThemeMode) || "auto";
    if (mode === "light" || mode === "dark") {
      return mode;
    }
    return (localStorage.getItem("theme") as Theme) || "light";
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sunTimesRef = useRef<{ sunrise: Date; sunset: Date } | null>(null);

  // Apply theme to DOM
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Handle auto-mode theme calculation
  const calculateAutoTheme = useCallback(async () => {
    try {
      // Primary: Use system color scheme preference (most reliable)
      if (typeof window !== "undefined" && window.matchMedia) {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setThemeState(prefersDark ? "dark" : "light");
        return;
      }

      // Fallback: Use IP-based geolocation + sunrise/sunset
      // Get coordinates
      const coords = await fetchCoordinates();

      // Get sunrise/sunset times
      const sunTimes = await fetchSunriseSunset(coords.lat, coords.lng);
      sunTimesRef.current = sunTimes;

      // Get browser timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Calculate theme
      const calculatedTheme = calculateThemeFromSunTimes(
        sunTimes.sunrise,
        sunTimes.sunset,
        timezone,
      );

      setThemeState(calculatedTheme);
    } catch (error) {
      console.warn("Failed to calculate auto theme:", error);
      // Final fallback to light theme on error
      setThemeState("light");
    }
  }, []);

  // Recalculate theme using cached sun times or system preference
  const recalculateTheme = useCallback(() => {
    // Primary: Use system color scheme preference
    if (typeof window !== "undefined" && window.matchMedia) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setThemeState(prefersDark ? "dark" : "light");
      return;
    }

    // Fallback: Use cached sun times
    if (sunTimesRef.current) {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const calculatedTheme = calculateThemeFromSunTimes(
        sunTimesRef.current.sunrise,
        sunTimesRef.current.sunset,
        timezone,
      );
      setThemeState(calculatedTheme);
    }
  }, []);

  // Auto-mode effect
  useEffect(() => {
    if (themeMode === "auto") {
      // Calculate theme immediately
      calculateAutoTheme();

      // Listen for system color scheme changes
      let mediaQuery: MediaQueryList | null = null;
      let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

      if (typeof window !== "undefined" && window.matchMedia) {
        mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        mediaQueryListener = (e: MediaQueryListEvent) => {
          setThemeState(e.matches ? "dark" : "light");
        };
        mediaQuery.addEventListener("change", mediaQueryListener);
      }

      // Set up interval to recalculate every 60 seconds (for fallback method)
      timerRef.current = setInterval(() => {
        recalculateTheme();
      }, 60000);

      // Cleanup
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (mediaQuery && mediaQueryListener) {
          mediaQuery.removeEventListener("change", mediaQueryListener);
        }
      };
    } else {
      // Clear timer when not in auto mode
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Set theme based on manual mode
      setThemeState(themeMode);
    }
  }, [themeMode, calculateAutoTheme, recalculateTheme]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem("themeMode", mode);
  }, []);

  // Backward compatibility: setTheme as alias for setThemeMode
  const setTheme = useCallback((t: Theme) => {
    setThemeMode(t);
  }, [setThemeMode]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setThemeMode(newTheme);
  }, [theme, setThemeMode]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setTheme, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

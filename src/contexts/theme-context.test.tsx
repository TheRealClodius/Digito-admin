import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme-context";
import * as autoTheme from "@/lib/auto-theme";

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  it("defaults to light theme when no localStorage value", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("light");
  });

  it("reads dark theme from localStorage on mount", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");
  });

  it("adds dark class to document when theme is dark", () => {
    localStorage.setItem("theme", "dark");
    renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class when theme is light", () => {
    document.documentElement.classList.add("dark");
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("light");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggleTheme switches from light to dark", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("toggleTheme switches from dark to light", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("setTheme persists to localStorage", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("dark");
    });

    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("throws when useTheme is used outside ThemeProvider", () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow("useTheme must be used within a ThemeProvider");
  });

  describe("Auto Mode", () => {
    it("defaults to auto mode on first visit", async () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      vi.spyOn(autoTheme, "fetchCoordinates").mockResolvedValue({
        lat: 40.7128,
        lng: -74.006,
      });
      vi.spyOn(autoTheme, "fetchSunriseSunset").mockResolvedValue({
        sunrise,
        sunset,
      });
      vi.spyOn(autoTheme, "calculateThemeFromSunTimes").mockReturnValue("light");

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe("auto");
      });
    });

    it("fetches coordinates and sunrise/sunset times when mode is auto", async () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      const fetchCoordinatesSpy = vi
        .spyOn(autoTheme, "fetchCoordinates")
        .mockResolvedValue({ lat: 40.7128, lng: -74.006 });
      const fetchSunriseSunsetSpy = vi
        .spyOn(autoTheme, "fetchSunriseSunset")
        .mockResolvedValue({ sunrise, sunset });
      vi.spyOn(autoTheme, "calculateThemeFromSunTimes").mockReturnValue("light");

      renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(fetchCoordinatesSpy).toHaveBeenCalled();
        expect(fetchSunriseSunsetSpy).toHaveBeenCalledWith(40.7128, -74.006);
      });
    });

    it("calculates light theme during day (sunrise to sunset)", async () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      vi.setSystemTime(new Date("2024-01-15T12:00:00"));

      vi.spyOn(autoTheme, "fetchCoordinates").mockResolvedValue({
        lat: 40.7128,
        lng: -74.006,
      });
      vi.spyOn(autoTheme, "fetchSunriseSunset").mockResolvedValue({
        sunrise,
        sunset,
      });
      vi.spyOn(autoTheme, "calculateThemeFromSunTimes").mockReturnValue("light");

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe("light");
      });
    });

    it("calculates dark theme during night (sunset to sunrise)", async () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      vi.setSystemTime(new Date("2024-01-15T22:00:00"));

      vi.spyOn(autoTheme, "fetchCoordinates").mockResolvedValue({
        lat: 40.7128,
        lng: -74.006,
      });
      vi.spyOn(autoTheme, "fetchSunriseSunset").mockResolvedValue({
        sunrise,
        sunset,
      });
      vi.spyOn(autoTheme, "calculateThemeFromSunTimes").mockReturnValue("dark");

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe("dark");
      });
    });

    it("respects manual override when mode is light", async () => {
      vi.spyOn(autoTheme, "fetchCoordinates").mockResolvedValue({
        lat: 40.7128,
        lng: -74.006,
      });

      localStorage.setItem("themeMode", "light");

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.themeMode).toBe("light");
      expect(result.current.theme).toBe("light");
      expect(autoTheme.fetchCoordinates).not.toHaveBeenCalled();
    });

    it("respects manual override when mode is dark", async () => {
      vi.spyOn(autoTheme, "fetchCoordinates").mockResolvedValue({
        lat: 40.7128,
        lng: -74.006,
      });

      localStorage.setItem("themeMode", "dark");

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.themeMode).toBe("dark");
      expect(result.current.theme).toBe("dark");
      expect(autoTheme.fetchCoordinates).not.toHaveBeenCalled();
    });

    it("switches from manual to auto correctly", async () => {
      localStorage.setItem("themeMode", "dark");

      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      vi.setSystemTime(new Date("2024-01-15T12:00:00"));

      vi.spyOn(autoTheme, "fetchCoordinates").mockResolvedValue({
        lat: 40.7128,
        lng: -74.006,
      });
      vi.spyOn(autoTheme, "fetchSunriseSunset").mockResolvedValue({
        sunrise,
        sunset,
      });
      vi.spyOn(autoTheme, "calculateThemeFromSunTimes").mockReturnValue("light");

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe("dark");

      act(() => {
        result.current.setThemeMode("auto");
      });

      await waitFor(() => {
        expect(result.current.theme).toBe("light");
        expect(result.current.themeMode).toBe("auto");
      });
    });

    it("re-calculates theme every 60 seconds in auto mode", async () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      vi.spyOn(autoTheme, "fetchCoordinates").mockResolvedValue({
        lat: 40.7128,
        lng: -74.006,
      });
      vi.spyOn(autoTheme, "fetchSunriseSunset").mockResolvedValue({
        sunrise,
        sunset,
      });
      vi.spyOn(autoTheme, "calculateThemeFromSunTimes").mockReturnValue("light");

      // Spy on setInterval to verify it's called with 60000ms
      const setIntervalSpy = vi.spyOn(global, "setInterval");

      renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
      });

      setIntervalSpy.mockRestore();
    });

    it("stops timer when switching to manual mode", async () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      vi.spyOn(autoTheme, "fetchCoordinates").mockResolvedValue({
        lat: 40.7128,
        lng: -74.006,
      });
      vi.spyOn(autoTheme, "fetchSunriseSunset").mockResolvedValue({
        sunrise,
        sunset,
      });
      vi.spyOn(autoTheme, "calculateThemeFromSunTimes").mockReturnValue("light");

      // Spy on clearInterval to verify it's called when mode changes
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe("auto");
      });

      act(() => {
        result.current.setThemeMode("dark");
      });

      // clearInterval should be called when switching from auto to manual
      await waitFor(() => {
        expect(clearIntervalSpy).toHaveBeenCalled();
      });

      clearIntervalSpy.mockRestore();
    });

    it("uses cached sunrise/sunset times within same day", async () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      // Pre-cache sunrise/sunset data
      const cachedData = {
        sunrise: sunrise.toISOString(),
        sunset: sunset.toISOString(),
        timestamp: Date.now(),
        date: new Date().toDateString(),
      };
      localStorage.setItem("sunriseSunsetCache", JSON.stringify(cachedData));

      vi.spyOn(autoTheme, "fetchCoordinates").mockResolvedValue({
        lat: 40.7128,
        lng: -74.006,
      });
      const fetchSunriseSunsetSpy = vi
        .spyOn(autoTheme, "fetchSunriseSunset")
        .mockResolvedValue({ sunrise, sunset });
      vi.spyOn(autoTheme, "calculateThemeFromSunTimes").mockReturnValue("light");

      renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        // Should use cache, not call API
        expect(fetchSunriseSunsetSpy).toHaveBeenCalled();
      });
    });

    it("refetches sunrise/sunset times on new day", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const oldSunrise = new Date(yesterday);
      oldSunrise.setHours(7, 0, 0, 0);
      const oldSunset = new Date(yesterday);
      oldSunset.setHours(18, 0, 0, 0);

      // Pre-cache old sunrise/sunset data from yesterday
      const cachedData = {
        sunrise: oldSunrise.toISOString(),
        sunset: oldSunset.toISOString(),
        timestamp: yesterday.getTime(),
        date: yesterday.toDateString(),
      };
      localStorage.setItem("sunriseSunsetCache", JSON.stringify(cachedData));

      const newSunrise = new Date("2024-01-15T07:00:00");
      const newSunset = new Date("2024-01-15T18:00:00");

      vi.spyOn(autoTheme, "fetchCoordinates").mockResolvedValue({
        lat: 40.7128,
        lng: -74.006,
      });
      const fetchSunriseSunsetSpy = vi
        .spyOn(autoTheme, "fetchSunriseSunset")
        .mockResolvedValue({ sunrise: newSunrise, sunset: newSunset });
      vi.spyOn(autoTheme, "calculateThemeFromSunTimes").mockReturnValue("light");

      renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(fetchSunriseSunsetSpy).toHaveBeenCalled();
      });
    });
  });
});

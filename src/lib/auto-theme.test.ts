import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  fetchCoordinates,
  fetchSunriseSunset,
  calculateThemeFromSunTimes,
  shouldRefetchSunTimes,
  COORDINATES_CACHE_TTL,
  SUNRISE_SUNSET_CACHE_TTL,
} from "./auto-theme";

describe("auto-theme", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchCoordinates", () => {
    it("fetches coordinates from ipapi.co successfully", async () => {
      const mockResponse = {
        latitude: 40.7128,
        longitude: -74.006,
        city: "New York",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await fetchCoordinates();

      expect(result).toEqual({ lat: 40.7128, lng: -74.006 });
      expect(fetch).toHaveBeenCalledWith("https://ipapi.co/json/");
    });

    it("caches coordinates in localStorage after successful fetch", async () => {
      const mockResponse = {
        latitude: 51.5074,
        longitude: -0.1278,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await fetchCoordinates();

      const cached = localStorage.getItem("coordinatesCache");
      expect(cached).toBeTruthy();

      const parsed = JSON.parse(cached!);
      expect(parsed.lat).toBe(51.5074);
      expect(parsed.lng).toBe(-0.1278);
      expect(parsed.timestamp).toBeDefined();
    });

    it("returns cached coordinates if within TTL", async () => {
      const cachedData = {
        lat: 35.6762,
        lng: 139.6503,
        timestamp: Date.now(),
      };

      localStorage.setItem("coordinatesCache", JSON.stringify(cachedData));

      global.fetch = vi.fn();

      const result = await fetchCoordinates();

      expect(result).toEqual({ lat: 35.6762, lng: 139.6503 });
      expect(fetch).not.toHaveBeenCalled();
    });

    it("refetches coordinates if cache is expired", async () => {
      const expiredData = {
        lat: 35.6762,
        lng: 139.6503,
        timestamp: Date.now() - COORDINATES_CACHE_TTL - 1000,
      };

      localStorage.setItem("coordinatesCache", JSON.stringify(expiredData));

      const mockResponse = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await fetchCoordinates();

      expect(result).toEqual({ lat: 40.7128, lng: -74.006 });
      expect(fetch).toHaveBeenCalled();
    });

    it("falls back to default coordinates on API failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await fetchCoordinates();

      // Should return some default coordinates (e.g., 0, 0 or last known)
      expect(result).toBeDefined();
      expect(typeof result.lat).toBe("number");
      expect(typeof result.lng).toBe("number");
    });

    it("handles invalid JSON response gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      const result = await fetchCoordinates();

      expect(result).toBeDefined();
      expect(typeof result.lat).toBe("number");
      expect(typeof result.lng).toBe("number");
    });
  });

  describe("fetchSunriseSunset", () => {
    it("fetches sunrise/sunset times successfully", async () => {
      const mockResponse = {
        results: {
          sunrise: "2024-01-15T07:15:00+00:00",
          sunset: "2024-01-15T17:30:00+00:00",
        },
        status: "OK",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await fetchSunriseSunset(40.7128, -74.006);

      expect(result.sunrise).toBeInstanceOf(Date);
      expect(result.sunset).toBeInstanceOf(Date);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("https://api.sunrise-sunset.org/json"),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("lat=40.7128"),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("lng=-74.006"),
      );
    });

    it("caches sunrise/sunset times after successful fetch", async () => {
      const mockResponse = {
        results: {
          sunrise: "2024-01-15T07:15:00+00:00",
          sunset: "2024-01-15T17:30:00+00:00",
        },
        status: "OK",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await fetchSunriseSunset(40.7128, -74.006);

      const cached = localStorage.getItem("sunriseSunsetCache");
      expect(cached).toBeTruthy();

      const parsed = JSON.parse(cached!);
      expect(parsed.sunrise).toBeDefined();
      expect(parsed.sunset).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.date).toBeDefined();
    });

    it("returns cached times if same day and within TTL", async () => {
      const now = new Date();
      const cachedData = {
        sunrise: "2024-01-15T07:15:00+00:00",
        sunset: "2024-01-15T17:30:00+00:00",
        timestamp: Date.now(),
        date: now.toDateString(),
      };

      localStorage.setItem("sunriseSunsetCache", JSON.stringify(cachedData));

      global.fetch = vi.fn();

      const result = await fetchSunriseSunset(40.7128, -74.006);

      expect(result.sunrise).toBeInstanceOf(Date);
      expect(result.sunset).toBeInstanceOf(Date);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("refetches if it's a new day", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const cachedData = {
        sunrise: "2024-01-14T07:15:00+00:00",
        sunset: "2024-01-14T17:30:00+00:00",
        timestamp: Date.now() - 1000,
        date: yesterday.toDateString(),
      };

      localStorage.setItem("sunriseSunsetCache", JSON.stringify(cachedData));

      const mockResponse = {
        results: {
          sunrise: "2024-01-15T07:20:00+00:00",
          sunset: "2024-01-15T17:35:00+00:00",
        },
        status: "OK",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await fetchSunriseSunset(40.7128, -74.006);

      expect(fetch).toHaveBeenCalled();
      expect(result.sunrise).toBeInstanceOf(Date);
    });

    it("falls back to default times on API failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await fetchSunriseSunset(40.7128, -74.006);

      // Should return fallback times (e.g., 6am/6pm)
      expect(result.sunrise).toBeInstanceOf(Date);
      expect(result.sunset).toBeInstanceOf(Date);
    });

    it("handles API error status gracefully", async () => {
      const mockResponse = {
        status: "INVALID_REQUEST",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await fetchSunriseSunset(40.7128, -74.006);

      expect(result.sunrise).toBeInstanceOf(Date);
      expect(result.sunset).toBeInstanceOf(Date);
    });
  });

  describe("calculateThemeFromSunTimes", () => {
    it("returns 'dark' before sunrise", () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      // Mock current time to 6:00 AM (before sunrise)
      vi.setSystemTime(new Date("2024-01-15T06:00:00"));

      const theme = calculateThemeFromSunTimes(
        sunrise,
        sunset,
        "America/New_York",
      );

      expect(theme).toBe("dark");
    });

    it("returns 'light' at sunrise", () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      vi.setSystemTime(new Date("2024-01-15T07:00:00"));

      const theme = calculateThemeFromSunTimes(
        sunrise,
        sunset,
        "America/New_York",
      );

      expect(theme).toBe("light");
    });

    it("returns 'light' between sunrise and sunset", () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      vi.setSystemTime(new Date("2024-01-15T12:00:00"));

      const theme = calculateThemeFromSunTimes(
        sunrise,
        sunset,
        "America/New_York",
      );

      expect(theme).toBe("light");
    });

    it("returns 'light' just before sunset", () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      vi.setSystemTime(new Date("2024-01-15T17:59:59"));

      const theme = calculateThemeFromSunTimes(
        sunrise,
        sunset,
        "America/New_York",
      );

      expect(theme).toBe("light");
    });

    it("returns 'dark' at sunset", () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      vi.setSystemTime(new Date("2024-01-15T18:00:00"));

      const theme = calculateThemeFromSunTimes(
        sunrise,
        sunset,
        "America/New_York",
      );

      expect(theme).toBe("dark");
    });

    it("returns 'dark' after sunset", () => {
      const sunrise = new Date("2024-01-15T07:00:00");
      const sunset = new Date("2024-01-15T18:00:00");

      vi.setSystemTime(new Date("2024-01-15T22:00:00"));

      const theme = calculateThemeFromSunTimes(
        sunrise,
        sunset,
        "America/New_York",
      );

      expect(theme).toBe("dark");
    });

    it("works correctly with different timezones", () => {
      const sunrise = new Date("2024-01-15T07:00:00Z");
      const sunset = new Date("2024-01-15T18:00:00Z");

      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));

      const themeUTC = calculateThemeFromSunTimes(sunrise, sunset, "UTC");
      const themeNY = calculateThemeFromSunTimes(
        sunrise,
        sunset,
        "America/New_York",
      );
      const themeTokyo = calculateThemeFromSunTimes(
        sunrise,
        sunset,
        "Asia/Tokyo",
      );

      expect(themeUTC).toBe("light");
      expect(themeNY).toBe("light");
      expect(themeTokyo).toBe("light");
    });
  });

  describe("shouldRefetchSunTimes", () => {
    it("returns true if lastFetched is null", () => {
      const result = shouldRefetchSunTimes(null as any);
      expect(result).toBe(true);
    });

    it("returns true if lastFetched is undefined", () => {
      const result = shouldRefetchSunTimes(undefined as any);
      expect(result).toBe(true);
    });

    it("returns true if cache is expired (>24 hours)", () => {
      const oldTimestamp = Date.now() - SUNRISE_SUNSET_CACHE_TTL - 1000;
      const result = shouldRefetchSunTimes(oldTimestamp);
      expect(result).toBe(true);
    });

    it("returns false if cache is valid (<24 hours)", () => {
      const recentTimestamp = Date.now() - 1000 * 60 * 60; // 1 hour ago
      const result = shouldRefetchSunTimes(recentTimestamp);
      expect(result).toBe(false);
    });

    it("returns false if cache is just within TTL", () => {
      const recentTimestamp = Date.now() - SUNRISE_SUNSET_CACHE_TTL + 1000;
      const result = shouldRefetchSunTimes(recentTimestamp);
      expect(result).toBe(false);
    });
  });
});

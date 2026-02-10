export type Theme = "light" | "dark";

export const COORDINATES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const SUNRISE_SUNSET_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CoordinatesCache {
  lat: number;
  lng: number;
  timestamp: number;
}

interface SunriseSunsetCache {
  sunrise: string;
  sunset: string;
  timestamp: number;
  date: string;
}

const FALLBACK_COORDINATES = { lat: 0, lng: 0 }; // Equator fallback

/**
 * Fetches user's geographic coordinates from their IP address
 * Uses Next.js API route that proxies ipapi.co with localStorage caching (24hr TTL)
 */
export async function fetchCoordinates(): Promise<{ lat: number; lng: number }> {
  // Check cache first
  const cached = getCoordinatesFromCache();
  if (cached) return cached;

  // Fetch from Next.js API route (server-side proxy to avoid CORS)
  try {
    const response = await fetch("/api/theme/coordinates");
    if (response.ok) {
      const data = await response.json();
      const coordinates = {
        lat: data.lat,
        lng: data.lng,
      };
      cacheCoordinates(coordinates);
      return coordinates;
    }
  } catch (error) {
    console.warn("Failed to fetch coordinates:", error);
  }

  // Fallback to default coordinates
  return FALLBACK_COORDINATES;
}

/**
 * Fetches sunrise and sunset times for given coordinates
 * Uses Next.js API route that proxies sunrise-sunset.org with localStorage caching (daily refresh)
 */
export async function fetchSunriseSunset(
  lat: number,
  lng: number,
): Promise<{ sunrise: Date; sunset: Date }> {
  // Check cache first
  const cached = getSunriseSunsetFromCache();
  if (cached) return cached;

  // Fetch from Next.js API route (server-side proxy to avoid CORS)
  try {
    const url = `/api/theme/sunrise-sunset?lat=${lat}&lng=${lng}`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();

      if (data.sunrise && data.sunset) {
        const times = {
          sunrise: new Date(data.sunrise),
          sunset: new Date(data.sunset),
        };
        cacheSunriseSunset(times);
        return times;
      }
    }
  } catch (error) {
    console.warn("Failed to fetch sunrise/sunset times:", error);
  }

  // Fallback to default times (6am/6pm local time)
  return getFallbackSunTimes();
}

/**
 * Determines theme based on current time relative to sunrise/sunset
 */
export function calculateThemeFromSunTimes(
  sunrise: Date,
  sunset: Date,
  timezone: string,
): Theme {
  const now = new Date();

  // Compare timestamps
  const currentTime = now.getTime();
  const sunriseTime = sunrise.getTime();
  const sunsetTime = sunset.getTime();

  // Light theme between sunrise and sunset, dark otherwise
  if (currentTime >= sunriseTime && currentTime < sunsetTime) {
    return "light";
  }

  return "dark";
}

/**
 * Checks if sunrise/sunset cache should be refetched
 */
export function shouldRefetchSunTimes(lastFetched: number | null | undefined): boolean {
  if (!lastFetched) return true;
  return Date.now() - lastFetched > SUNRISE_SUNSET_CACHE_TTL;
}

// --- Private helper functions ---

function getCoordinatesFromCache(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem("coordinatesCache");
    if (!cached) return null;

    const entry: CoordinatesCache = JSON.parse(cached);

    // Check if cache is expired
    if (Date.now() - entry.timestamp > COORDINATES_CACHE_TTL) {
      localStorage.removeItem("coordinatesCache");
      return null;
    }

    return { lat: entry.lat, lng: entry.lng };
  } catch {
    return null;
  }
}

function cacheCoordinates(coordinates: { lat: number; lng: number }): void {
  if (typeof window === "undefined") return;

  try {
    const entry: CoordinatesCache = {
      ...coordinates,
      timestamp: Date.now(),
    };
    localStorage.setItem("coordinatesCache", JSON.stringify(entry));
  } catch (error) {
    console.warn("Failed to cache coordinates:", error);
  }
}

function getSunriseSunsetFromCache(): { sunrise: Date; sunset: Date } | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem("sunriseSunsetCache");
    if (!cached) return null;

    const entry: SunriseSunsetCache = JSON.parse(cached);

    // Check if it's a new day or cache is expired
    const today = new Date().toDateString();
    if (entry.date !== today || shouldRefetchSunTimes(entry.timestamp)) {
      localStorage.removeItem("sunriseSunsetCache");
      return null;
    }

    return {
      sunrise: new Date(entry.sunrise),
      sunset: new Date(entry.sunset),
    };
  } catch {
    return null;
  }
}

function cacheSunriseSunset(times: { sunrise: Date; sunset: Date }): void {
  if (typeof window === "undefined") return;

  try {
    const entry: SunriseSunsetCache = {
      sunrise: times.sunrise.toISOString(),
      sunset: times.sunset.toISOString(),
      timestamp: Date.now(),
      date: new Date().toDateString(),
    };
    localStorage.setItem("sunriseSunsetCache", JSON.stringify(entry));
  } catch (error) {
    console.warn("Failed to cache sunrise/sunset times:", error);
  }
}

function getFallbackSunTimes(): { sunrise: Date; sunset: Date } {
  const now = new Date();
  const sunrise = new Date(now);
  sunrise.setHours(6, 0, 0, 0); // 6:00 AM local time

  const sunset = new Date(now);
  sunset.setHours(18, 0, 0, 0); // 6:00 PM local time

  return { sunrise, sunset };
}

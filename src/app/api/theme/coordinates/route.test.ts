import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

describe("/api/theme/coordinates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and returns coordinates from ipapi.co", async () => {
    const mockResponse = {
      latitude: 40.7128,
      longitude: -74.006,
      city: "New York",
      country: "US",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      lat: 40.7128,
      lng: -74.006,
    });
    expect(fetch).toHaveBeenCalledWith("https://ipapi.co/json/");
  });

  it("returns 500 when ipapi.co fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch coordinates",
    });
  });

  it("returns 500 when ipapi.co returns invalid response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as Response);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch coordinates",
    });
  });

  it("handles missing latitude/longitude in response", async () => {
    const mockResponse = {
      city: "New York",
      // missing latitude and longitude
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch coordinates",
    });
  });
});

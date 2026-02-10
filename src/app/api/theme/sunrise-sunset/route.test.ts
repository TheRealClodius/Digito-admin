import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

describe("/api/theme/sunrise-sunset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and returns sunrise/sunset times", async () => {
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

    const url = new URL("http://localhost:3000/api/theme/sunrise-sunset");
    url.searchParams.set("lat", "40.7128");
    url.searchParams.set("lng", "-74.006");

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      sunrise: "2024-01-15T07:15:00+00:00",
      sunset: "2024-01-15T17:30:00+00:00",
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.sunrise-sunset.org/json")
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("lat=40.7128")
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("lng=-74.006")
    );
  });

  it("returns 400 when lat parameter is missing", async () => {
    const url = new URL("http://localhost:3000/api/theme/sunrise-sunset");
    url.searchParams.set("lng", "-74.006");

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Missing lat or lng parameter",
    });
  });

  it("returns 400 when lng parameter is missing", async () => {
    const url = new URL("http://localhost:3000/api/theme/sunrise-sunset");
    url.searchParams.set("lat", "40.7128");

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Missing lat or lng parameter",
    });
  });

  it("returns 500 when sunrise-sunset.org API fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const url = new URL("http://localhost:3000/api/theme/sunrise-sunset");
    url.searchParams.set("lat", "40.7128");
    url.searchParams.set("lng", "-74.006");

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch sunrise/sunset times",
    });
  });

  it("returns 500 when API returns non-OK status", async () => {
    const mockResponse = {
      status: "INVALID_REQUEST",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const url = new URL("http://localhost:3000/api/theme/sunrise-sunset");
    url.searchParams.set("lat", "40.7128");
    url.searchParams.set("lng", "-74.006");

    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch sunrise/sunset times",
    });
  });
});

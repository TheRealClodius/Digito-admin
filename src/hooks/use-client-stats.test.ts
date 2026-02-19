import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useClientStats } from "./use-client-stats";
import type { Event } from "@/types/event";

vi.mock("@/hooks/use-api-collection", () => ({
  useApiCollection: vi.fn(),
}));

import * as apiCollectionHook from "@/hooks/use-api-collection";

// Helper to create mock events with ISO date strings (as returned by the API)
function createMockEvent(overrides: Partial<Event> = {}): Event & { id: string } {
  return {
    id: "event-1",
    clientId: "client-1",
    name: "Test Event",
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-01-10T00:00:00.000Z",
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Event & { id: string };
}

describe("useClientStats", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns zero counts when client has no events", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [],
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useClientStats("client-1"));

    expect(result.current.stats.totalEvents).toBe(0);
    expect(result.current.stats.activeEvents).toBe(0);
    expect(result.current.stats.upcomingEvents).toBe(0);
    expect(result.current.stats.pastEvents).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it("calculates total events correctly", () => {
    const events = [
      createMockEvent({ id: "event-1" }),
      createMockEvent({ id: "event-2" }),
      createMockEvent({ id: "event-3" }),
    ];

    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: events as any,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useClientStats("client-1"));

    expect(result.current.stats.totalEvents).toBe(3);
  });

  it("counts upcoming events based on start date", () => {
    const now = new Date("2026-01-01");
    const events = [
      createMockEvent({
        id: "upcoming-1",
        startDate: "2026-02-01T00:00:00.000Z",
        endDate: "2026-02-10T00:00:00.000Z",
      }),
      createMockEvent({
        id: "upcoming-2",
        startDate: "2026-03-01T00:00:00.000Z",
        endDate: "2026-03-10T00:00:00.000Z",
      }),
    ];

    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: events as any,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useClientStats("client-1", now));

    expect(result.current.stats.upcomingEvents).toBe(2);
    expect(result.current.stats.activeEvents).toBe(0);
    expect(result.current.stats.pastEvents).toBe(0);
  });

  it("counts ongoing events as active", () => {
    const now = new Date("2026-01-05");
    const events = [
      createMockEvent({
        id: "ongoing-1",
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2026-01-10T00:00:00.000Z",
      }),
      createMockEvent({
        id: "ongoing-2",
        startDate: "2026-01-03T00:00:00.000Z",
        endDate: "2026-01-15T00:00:00.000Z",
      }),
    ];

    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: events as any,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useClientStats("client-1", now));

    expect(result.current.stats.activeEvents).toBe(2);
    expect(result.current.stats.upcomingEvents).toBe(0);
    expect(result.current.stats.pastEvents).toBe(0);
  });

  it("counts past events based on end date", () => {
    const now = new Date("2026-02-01");
    const events = [
      createMockEvent({
        id: "past-1",
        startDate: "2025-12-01T00:00:00.000Z",
        endDate: "2025-12-10T00:00:00.000Z",
      }),
      createMockEvent({
        id: "past-2",
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2026-01-15T00:00:00.000Z",
      }),
    ];

    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: events as any,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useClientStats("client-1", now));

    expect(result.current.stats.pastEvents).toBe(2);
    expect(result.current.stats.activeEvents).toBe(0);
    expect(result.current.stats.upcomingEvents).toBe(0);
  });

  it("correctly categorizes mixed event statuses", () => {
    const now = new Date("2026-01-15");
    const events = [
      createMockEvent({
        id: "past",
        startDate: "2025-12-01T00:00:00.000Z",
        endDate: "2025-12-10T00:00:00.000Z",
      }),
      createMockEvent({
        id: "active",
        startDate: "2026-01-10T00:00:00.000Z",
        endDate: "2026-01-20T00:00:00.000Z",
      }),
      createMockEvent({
        id: "upcoming",
        startDate: "2026-02-01T00:00:00.000Z",
        endDate: "2026-02-10T00:00:00.000Z",
      }),
    ];

    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: events as any,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useClientStats("client-1", now));

    expect(result.current.stats.totalEvents).toBe(3);
    expect(result.current.stats.pastEvents).toBe(1);
    expect(result.current.stats.activeEvents).toBe(1);
    expect(result.current.stats.upcomingEvents).toBe(1);
  });

  it("handles loading state", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [],
      loading: true,
      error: null,
    });

    const { result } = renderHook(() => useClientStats("client-1"));

    expect(result.current.loading).toBe(true);
    expect(result.current.stats.totalEvents).toBe(0);
  });

  it("handles errors", () => {
    const error = new Error("API error");
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [],
      loading: false,
      error,
    });

    const { result } = renderHook(() => useClientStats("client-1"));

    expect(result.current.error).toBe(error);
    expect(result.current.loading).toBe(false);
  });

  it("uses default current date when now parameter is not provided", () => {
    const events = [
      createMockEvent({
        id: "old-event",
        startDate: "2020-01-01T00:00:00.000Z",
        endDate: "2020-01-10T00:00:00.000Z",
      }),
    ];

    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: events as any,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useClientStats("client-1"));

    expect(result.current.stats.pastEvents).toBe(1);
    expect(result.current.stats.activeEvents).toBe(0);
    expect(result.current.stats.upcomingEvents).toBe(0);
  });
});

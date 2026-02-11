import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { useClientStats } from "./use-client-stats";
import type { Event } from "@/types/event";

// Mock useCollection hook
vi.mock("@/hooks/use-collection", () => ({
  useCollection: vi.fn(),
}));

import * as collectionHook from "@/hooks/use-collection";

// Helper to create mock events
function createMockEvent(overrides: Partial<Event> = {}): Event & { id: string } {
  return {
    id: "event-1",
    clientId: "client-1",
    name: "Test Event",
    startDate: Timestamp.fromDate(new Date("2026-01-01")),
    endDate: Timestamp.fromDate(new Date("2026-01-10")),
    isActive: true,
    createdAt: Timestamp.now(),
    ...overrides,
  };
}

describe("useClientStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero counts when client has no events", () => {
    vi.mocked(collectionHook.useCollection).mockReturnValue({
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

    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: events,
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
        startDate: Timestamp.fromDate(new Date("2026-02-01")),
        endDate: Timestamp.fromDate(new Date("2026-02-10")),
      }),
      createMockEvent({
        id: "upcoming-2",
        startDate: Timestamp.fromDate(new Date("2026-03-01")),
        endDate: Timestamp.fromDate(new Date("2026-03-10")),
      }),
    ];

    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: events,
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
        startDate: Timestamp.fromDate(new Date("2026-01-01")),
        endDate: Timestamp.fromDate(new Date("2026-01-10")),
      }),
      createMockEvent({
        id: "ongoing-2",
        startDate: Timestamp.fromDate(new Date("2026-01-03")),
        endDate: Timestamp.fromDate(new Date("2026-01-15")),
      }),
    ];

    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: events,
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
        startDate: Timestamp.fromDate(new Date("2025-12-01")),
        endDate: Timestamp.fromDate(new Date("2025-12-10")),
      }),
      createMockEvent({
        id: "past-2",
        startDate: Timestamp.fromDate(new Date("2026-01-01")),
        endDate: Timestamp.fromDate(new Date("2026-01-15")),
      }),
    ];

    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: events,
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
      // Past event
      createMockEvent({
        id: "past",
        startDate: Timestamp.fromDate(new Date("2025-12-01")),
        endDate: Timestamp.fromDate(new Date("2025-12-10")),
      }),
      // Ongoing/active event
      createMockEvent({
        id: "active",
        startDate: Timestamp.fromDate(new Date("2026-01-10")),
        endDate: Timestamp.fromDate(new Date("2026-01-20")),
      }),
      // Upcoming event
      createMockEvent({
        id: "upcoming",
        startDate: Timestamp.fromDate(new Date("2026-02-01")),
        endDate: Timestamp.fromDate(new Date("2026-02-10")),
      }),
    ];

    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: events,
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
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    const { result } = renderHook(() => useClientStats("client-1"));

    expect(result.current.loading).toBe(true);
    expect(result.current.stats.totalEvents).toBe(0);
  });

  it("handles errors", () => {
    const error = new Error("Firestore error");
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: null,
      loading: false,
      error,
    });

    const { result } = renderHook(() => useClientStats("client-1"));

    expect(result.current.error).toBe(error);
    expect(result.current.loading).toBe(false);
  });

  it("uses default current date when now parameter is not provided", () => {
    // Create an event that is definitely past (year 2020)
    const events = [
      createMockEvent({
        id: "old-event",
        startDate: Timestamp.fromDate(new Date("2020-01-01")),
        endDate: Timestamp.fromDate(new Date("2020-01-10")),
      }),
    ];

    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: events,
      loading: false,
      error: null,
    });

    // Don't pass 'now' parameter - should use current date
    const { result } = renderHook(() => useClientStats("client-1"));

    // Event from 2020 should be categorized as past
    expect(result.current.stats.pastEvents).toBe(1);
    expect(result.current.stats.activeEvents).toBe(0);
    expect(result.current.stats.upcomingEvents).toBe(0);
  });
});

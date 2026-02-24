import { describe, it, expect } from "vitest";
import { getEventStatus, isEventActive } from "./event-status";
import type { Event } from "@/types/event";

// Helper to create a mock event
function createMockEvent(
  overrides: Partial<Event> = {}
): Event {
  return {
    id: "test-event",
    clientId: "test-client",
    name: "Test Event",
    startDate: new Date(),
    endDate: new Date(),
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("getEventStatus", () => {
  it("returns upcoming when current date is before start date", () => {
    const futureDate = new Date("2026-12-01");
    const event = createMockEvent({
      startDate: new Date(futureDate),
      endDate: new Date("2026-12-10"),
    });

    const now = new Date("2026-11-01");
    const status = getEventStatus(event, now);

    expect(status).toBe("upcoming");
  });

  it("returns ongoing when current date is between start and end dates", () => {
    const event = createMockEvent({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-10"),
    });

    const now = new Date("2026-01-05");
    const status = getEventStatus(event, now);

    expect(status).toBe("ongoing");
  });

  it("returns past when current date is after end date", () => {
    const event = createMockEvent({
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-10"),
    });

    const now = new Date("2026-01-01");
    const status = getEventStatus(event, now);

    expect(status).toBe("past");
  });

  it("returns ongoing when current date equals start date", () => {
    const startDate = new Date("2026-01-01T00:00:00Z");
    const event = createMockEvent({
      startDate: new Date(startDate),
      endDate: new Date("2026-01-10"),
    });

    const now = new Date("2026-01-01T00:00:00Z");
    const status = getEventStatus(event, now);

    expect(status).toBe("ongoing");
  });

  it("returns ongoing when current date equals end date", () => {
    const endDate = new Date("2026-01-10T23:59:59Z");
    const event = createMockEvent({
      startDate: new Date("2026-01-01"),
      endDate: new Date(endDate),
    });

    const now = new Date("2026-01-10T23:59:59Z");
    const status = getEventStatus(event, now);

    expect(status).toBe("ongoing");
  });

  it("handles same-day events", () => {
    const sameDate = new Date("2026-01-15T12:00:00Z");
    const event = createMockEvent({
      startDate: new Date(sameDate),
      endDate: new Date(sameDate),
    });

    const now = new Date("2026-01-15T12:00:00Z");
    const status = getEventStatus(event, now);

    expect(status).toBe("ongoing");
  });

  it("defaults to current date when now parameter is not provided", () => {
    // Create an event that is definitely in the past
    const event = createMockEvent({
      startDate: new Date("2020-01-01"),
      endDate: new Date("2020-01-10"),
    });

    // Don't provide 'now' parameter - should use current date
    const status = getEventStatus(event);

    expect(status).toBe("past");
  });
});

describe("isEventActive", () => {
  it("returns true when isActive flag is true and event is ongoing", () => {
    const event = createMockEvent({
      isActive: true,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-10"),
    });

    const now = new Date("2026-01-05");
    const active = isEventActive(event, now);

    expect(active).toBe(true);
  });

  it("returns false when isActive flag is false", () => {
    const event = createMockEvent({
      isActive: false,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-10"),
    });

    const now = new Date("2026-01-05");
    const active = isEventActive(event, now);

    expect(active).toBe(false);
  });

  it("returns false when event is upcoming", () => {
    const event = createMockEvent({
      isActive: true,
      startDate: new Date("2026-12-01"),
      endDate: new Date("2026-12-10"),
    });

    const now = new Date("2026-11-01");
    const active = isEventActive(event, now);

    expect(active).toBe(false);
  });

  it("returns false when event is past", () => {
    const event = createMockEvent({
      isActive: true,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-10"),
    });

    const now = new Date("2026-01-01");
    const active = isEventActive(event, now);

    expect(active).toBe(false);
  });

  it("returns false when isActive is true but event is upcoming", () => {
    const event = createMockEvent({
      isActive: true,
      startDate: new Date("2027-01-01"),
      endDate: new Date("2027-01-10"),
    });

    const now = new Date("2026-01-01");
    const active = isEventActive(event, now);

    expect(active).toBe(false);
  });
});

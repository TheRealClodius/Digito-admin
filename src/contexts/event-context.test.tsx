import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventContextProvider } from "./event-context";
import { useEventContext } from "@/hooks/use-event-context";

describe("EventContext", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return <EventContextProvider>{children}</EventContextProvider>;
  }

  it("initializes with null values when no sessionStorage", () => {
    const { result } = renderHook(() => useEventContext(), { wrapper });

    expect(result.current.selectedClientId).toBeNull();
    expect(result.current.selectedEventId).toBeNull();
    expect(result.current.selectedClientName).toBeNull();
    expect(result.current.selectedEventName).toBeNull();
  });

  it("loads client from sessionStorage on mount", () => {
    sessionStorage.setItem("selectedClientId", "client123");
    sessionStorage.setItem("selectedClientName", "Test Client");

    const { result } = renderHook(() => useEventContext(), { wrapper });

    expect(result.current.selectedClientId).toBe("client123");
    expect(result.current.selectedClientName).toBe("Test Client");
  });

  it("loads event from sessionStorage on mount", () => {
    sessionStorage.setItem("selectedClientId", "client123");
    sessionStorage.setItem("selectedClientName", "Test Client");
    sessionStorage.setItem("selectedEventId", "event456");
    sessionStorage.setItem("selectedEventName", "Test Event");

    const { result } = renderHook(() => useEventContext(), { wrapper });

    expect(result.current.selectedEventId).toBe("event456");
    expect(result.current.selectedEventName).toBe("Test Event");
  });

  it("persists client selection to sessionStorage", () => {
    const { result } = renderHook(() => useEventContext(), { wrapper });

    act(() => {
      result.current.setSelectedClient("client123", "Test Client");
    });

    expect(sessionStorage.getItem("selectedClientId")).toBe("client123");
    expect(sessionStorage.getItem("selectedClientName")).toBe("Test Client");
  });

  it("persists event selection to sessionStorage", () => {
    const { result } = renderHook(() => useEventContext(), { wrapper });

    act(() => {
      result.current.setSelectedClient("client123", "Test Client");
      result.current.setSelectedEvent("event456", "Test Event");
    });

    expect(sessionStorage.getItem("selectedEventId")).toBe("event456");
    expect(sessionStorage.getItem("selectedEventName")).toBe("Test Event");
  });

  it("clears event when client changes", () => {
    const { result } = renderHook(() => useEventContext(), { wrapper });

    act(() => {
      result.current.setSelectedClient("client1", "Client 1");
      result.current.setSelectedEvent("event1", "Event 1");
    });

    act(() => {
      result.current.setSelectedClient("client2", "Client 2");
    });

    expect(result.current.selectedEventId).toBeNull();
    expect(result.current.selectedEventName).toBeNull();
    expect(sessionStorage.getItem("selectedEventId")).toBeNull();
  });

  it("clears all selections and sessionStorage", () => {
    const { result } = renderHook(() => useEventContext(), { wrapper });

    act(() => {
      result.current.setSelectedClient("client123", "Test Client");
      result.current.setSelectedEvent("event456", "Test Event");
    });

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedClientId).toBeNull();
    expect(result.current.selectedEventId).toBeNull();
    expect(sessionStorage.getItem("selectedClientId")).toBeNull();
    expect(sessionStorage.getItem("selectedEventId")).toBeNull();
  });

  it("throws when useEventContext is used outside provider", () => {
    expect(() => {
      renderHook(() => useEventContext());
    }).toThrow("useEventContext must be used within an EventContextProvider");
  });

  it("handles null client name gracefully", () => {
    const { result } = renderHook(() => useEventContext(), { wrapper });

    act(() => {
      result.current.setSelectedClient("client123");
    });

    expect(result.current.selectedClientId).toBe("client123");
    expect(result.current.selectedClientName).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockGetIdToken = vi.fn().mockResolvedValue("mock-token");
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { getIdToken: mockGetIdToken },
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { useFeedback } from "./use-feedback";

describe("useFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial loading state", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { result } = renderHook(() =>
      useFeedback("client-1", "event-1")
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("fetches feedback and returns data", async () => {
    const mockData = [
      {
        id: "fb-1",
        feedbackText: "Great app!",
        timestamp: "2026-02-07T10:00:00+00:00",
        chatSessionId: "chat-1",
        userId: "user-1",
        userName: "Alice Smith",
        userEmail: "alice@test.com",
        userCompany: "Acme",
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() =>
      useFeedback("client-1", "event-1")
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/feedback?clientId=client-1&eventId=event-1",
      {
        headers: { Authorization: "Bearer mock-token" },
      }
    );
  });

  it("sets error when fetch fails with non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: "Only super admins can view feedback" }),
    });

    const { result } = renderHook(() =>
      useFeedback("client-1", "event-1")
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(
      "Only super admins can view feedback"
    );
    expect(result.current.data).toEqual([]);
  });

  it("sets error when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      useFeedback("client-1", "event-1")
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.data).toEqual([]);
  });

  it("does not fetch when clientId is empty", async () => {
    const { result } = renderHook(() => useFeedback("", "event-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it("does not fetch when eventId is empty", async () => {
    const { result } = renderHook(() => useFeedback("client-1", ""));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it("refetches when refresh is called", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { result } = renderHook(() =>
      useFeedback("client-1", "event-1")
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "fb-new",
            feedbackText: "New feedback",
            timestamp: "2026-02-08T10:00:00+00:00",
            chatSessionId: "chat-2",
            userId: "user-1",
            userName: "Alice",
            userEmail: "alice@test.com",
            userCompany: "Acme",
          },
        ]),
    });

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("refetches when clientId or eventId changes", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { result, rerender } = renderHook(
      ({ clientId, eventId }) => useFeedback(clientId, eventId),
      { initialProps: { clientId: "client-1", eventId: "event-1" } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    rerender({ clientId: "client-1", eventId: "event-2" });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    expect(mockFetch).toHaveBeenLastCalledWith(
      "/api/feedback?clientId=client-1&eventId=event-2",
      { headers: { Authorization: "Bearer mock-token" } }
    );
  });
});

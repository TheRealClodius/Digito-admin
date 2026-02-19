import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/use-api-collection", () => ({
  useApiCollection: vi.fn(),
}));

import { useFeedback } from "./use-feedback";
import * as apiCollectionHook from "@/hooks/use-api-collection";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useFeedback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns loading state from useApiCollection", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [],
      loading: true,
      error: null,
    });

    const { result } = renderHook(() => useFeedback("event-1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("returns feedback data from useApiCollection", () => {
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

    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: mockData as any,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useFeedback("event-1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("passes correct apiPath and queryKey to useApiCollection", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [],
      loading: false,
      error: null,
    });

    renderHook(() => useFeedback("event-1"), {
      wrapper: createWrapper(),
    });

    expect(apiCollectionHook.useApiCollection).toHaveBeenCalledWith({
      apiPath: "/api/events/event-1/feedback",
      queryKey: ["events", "event-1", "feedback"],
      enabled: true,
    });
  });

  it("disables fetch when eventCode is empty", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [],
      loading: false,
      error: null,
    });

    renderHook(() => useFeedback(""), {
      wrapper: createWrapper(),
    });

    expect(apiCollectionHook.useApiCollection).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it("returns error message as string", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [],
      loading: false,
      error: new Error("Failed to load feedback"),
    });

    const { result } = renderHook(() => useFeedback("event-1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.error).toBe("Failed to load feedback");
    expect(result.current.data).toEqual([]);
  });

  it("provides a refresh function", () => {
    vi.mocked(apiCollectionHook.useApiCollection).mockReturnValue({
      data: [],
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useFeedback("event-1"), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.refresh).toBe("function");
  });
});

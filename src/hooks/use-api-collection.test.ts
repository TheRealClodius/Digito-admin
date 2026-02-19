import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { useApiCollection } from "./use-api-collection";
import { apiFetch } from "@/lib/api-client";
import { QueryWrapper } from "@/test/query-wrapper";

const mockApiFetch = vi.mocked(apiFetch);

describe("useApiCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches data from the API path", async () => {
    mockApiFetch.mockResolvedValue([
      { id: "1", name: "Client A" },
      { id: "2", name: "Client B" },
    ]);

    const { result } = renderHook(
      () =>
        useApiCollection<{ id: string; name: string }>({
          apiPath: "/api/clients",
          queryKey: ["clients"],
        }),
      { wrapper: QueryWrapper }
    );

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual([
      { id: "1", name: "Client A" },
      { id: "2", name: "Client B" },
    ]);
    expect(result.current.error).toBeNull();
    expect(mockApiFetch).toHaveBeenCalledWith("/api/clients");
  });

  it("returns error on fetch failure", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(
      () =>
        useApiCollection({
          apiPath: "/api/clients",
          queryKey: ["clients-error"],
        }),
      { wrapper: QueryWrapper }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("does not fetch when enabled is false", async () => {
    const { result } = renderHook(
      () =>
        useApiCollection({
          apiPath: "/api/clients",
          queryKey: ["clients-disabled"],
          enabled: false,
        }),
      { wrapper: QueryWrapper }
    );

    // Should not be loading since the query is disabled
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it("returns empty array for empty path", async () => {
    const { result } = renderHook(
      () =>
        useApiCollection({
          apiPath: "",
          queryKey: ["empty-path"],
        }),
      { wrapper: QueryWrapper }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });
});

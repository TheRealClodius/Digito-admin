import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { useApiDocument } from "./use-api-document";
import { apiFetch } from "@/lib/api-client";
import { QueryWrapper } from "@/test/query-wrapper";

const mockApiFetch = vi.mocked(apiFetch);

describe("useApiDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches a single document from the API path", async () => {
    mockApiFetch.mockResolvedValue({ id: "1", name: "Client A" });

    const { result } = renderHook(
      () =>
        useApiDocument<{ id: string; name: string }>({
          apiPath: "/api/clients/1",
          queryKey: ["clients", "1"],
        }),
      { wrapper: QueryWrapper }
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({ id: "1", name: "Client A" });
    expect(result.current.error).toBeNull();
    expect(mockApiFetch).toHaveBeenCalledWith("/api/clients/1");
  });

  it("returns null data on fetch failure", async () => {
    mockApiFetch.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(
      () =>
        useApiDocument({
          apiPath: "/api/clients/999",
          queryKey: ["clients", "999"],
        }),
      { wrapper: QueryWrapper }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("does not fetch when enabled is false", async () => {
    const { result } = renderHook(
      () =>
        useApiDocument({
          apiPath: "/api/clients/1",
          queryKey: ["clients", "disabled"],
          enabled: false,
        }),
      { wrapper: QueryWrapper }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it("does not fetch for empty path", async () => {
    const { result } = renderHook(
      () =>
        useApiDocument({
          apiPath: "",
          queryKey: ["empty"],
        }),
      { wrapper: QueryWrapper }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });
});

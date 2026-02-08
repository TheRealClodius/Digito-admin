import { describe, it, expect, vi } from "vitest";
import { validateParams } from "./use-validated-params";

// Mock next/navigation
const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("validateParams", () => {
  it("does not throw for valid params", () => {
    expect(() => validateParams({ eventId: "abc123" })).not.toThrow();
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("calls notFound for params with slashes", () => {
    expect(() => validateParams({ eventId: "../evil" })).toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("calls notFound for params with whitespace", () => {
    expect(() => validateParams({ eventId: "has space" })).toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound for empty params", () => {
    expect(() => validateParams({ eventId: "" })).toThrow("NEXT_NOT_FOUND");
  });

  it("accepts alphanumeric IDs with hyphens and underscores", () => {
    expect(() => validateParams({ eventId: "event_123-abc" })).not.toThrow();
  });

  it("validates all params, not just the first", () => {
    expect(() =>
      validateParams({ clientId: "valid123", eventId: "in valid" })
    ).toThrow("NEXT_NOT_FOUND");
  });
});

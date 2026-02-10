import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useDebounce } from "./use-debounce";

describe("useDebounce", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("debounces value updates", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "first", delay: 300 },
      }
    );

    // Initial value
    expect(result.current).toBe("first");

    // Change value
    rerender({ value: "second", delay: 300 });

    // Value should still be "first" immediately
    expect(result.current).toBe("first");

    // After delay, value should update
    await waitFor(
      () => {
        expect(result.current).toBe("second");
      },
      { timeout: 500 }
    );
  });

  it("cancels previous timeout on rapid changes", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "first", delay: 300 },
      }
    );

    // Rapidly change values
    rerender({ value: "second", delay: 300 });
    rerender({ value: "third", delay: 300 });
    rerender({ value: "fourth", delay: 300 });

    // Should still be initial value immediately
    expect(result.current).toBe("first");

    // After delay, should jump directly to "fourth" (last value)
    await waitFor(
      () => {
        expect(result.current).toBe("fourth");
      },
      { timeout: 500 }
    );
  });

  it("handles different delay values", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "first", delay: 100 },
      }
    );

    rerender({ value: "second", delay: 100 });

    // With 100ms delay, should update faster
    await waitFor(
      () => {
        expect(result.current).toBe("second");
      },
      { timeout: 200 }
    );
  });

  it("handles null values", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: null, delay: 300 },
      }
    );

    expect(result.current).toBeNull();

    rerender({ value: "value", delay: 300 });

    await waitFor(
      () => {
        expect(result.current).toBe("value");
      },
      { timeout: 500 }
    );
  });

  it("handles undefined values", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: undefined, delay: 300 },
      }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: "value", delay: 300 });

    await waitFor(
      () => {
        expect(result.current).toBe("value");
      },
      { timeout: 500 }
    );
  });

  it("handles number values", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 0, delay: 300 },
      }
    );

    expect(result.current).toBe(0);

    rerender({ value: 42, delay: 300 });

    await waitFor(
      () => {
        expect(result.current).toBe(42);
      },
      { timeout: 500 }
    );
  });

  it("cleans up timeout on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    const { unmount } = renderHook(() => useDebounce("value", 300));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it("handles empty string values", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "text", delay: 300 },
      }
    );

    expect(result.current).toBe("text");

    rerender({ value: "", delay: 300 });

    await waitFor(
      () => {
        expect(result.current).toBe("");
      },
      { timeout: 500 }
    );
  });
});

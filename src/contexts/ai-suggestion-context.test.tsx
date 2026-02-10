import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  AISuggestionProvider,
  useAISuggestion,
} from "./ai-suggestion-context";

describe("AISuggestionContext", () => {
  function wrapper({ children }: { children: React.ReactNode }) {
    return <AISuggestionProvider>{children}</AISuggestionProvider>;
  }

  it("defaults to hasActiveSuggestion = false", () => {
    const { result } = renderHook(() => useAISuggestion(), { wrapper });
    expect(result.current.hasActiveSuggestion).toBe(false);
  });

  it("allows setting hasActiveSuggestion to true", () => {
    const { result } = renderHook(() => useAISuggestion(), { wrapper });

    act(() => {
      result.current.setHasActiveSuggestion(true);
    });

    expect(result.current.hasActiveSuggestion).toBe(true);
  });

  it("allows setting hasActiveSuggestion back to false", () => {
    const { result } = renderHook(() => useAISuggestion(), { wrapper });

    act(() => {
      result.current.setHasActiveSuggestion(true);
    });

    act(() => {
      result.current.setHasActiveSuggestion(false);
    });

    expect(result.current.hasActiveSuggestion).toBe(false);
  });

  it("works as a no-op outside the provider", () => {
    const { result } = renderHook(() => useAISuggestion());

    expect(result.current.hasActiveSuggestion).toBe(false);

    // setHasActiveSuggestion should be a no-op, not throw
    act(() => {
      result.current.setHasActiveSuggestion(true);
    });

    // Still false because the default context is a no-op
    expect(result.current.hasActiveSuggestion).toBe(false);
  });
});

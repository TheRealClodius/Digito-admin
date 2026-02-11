import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { useDissolveEffect } from "./use-dissolve-effect";

// Mock rAF infrastructure
let rafCallbacks: Array<{ id: number; cb: (time: number) => void }> = [];
let nextRafId = 1;
let mockTime = 0;

function tickFrame(advanceMs: number) {
  mockTime += advanceMs;
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach(({ cb }) => cb(mockTime));
}

function tickUntilComplete(durationMs: number, stepMs = 50) {
  let elapsed = 0;
  while (elapsed < durationMs + stepMs) {
    tickFrame(stepMs);
    elapsed += stepMs;
  }
}

function createMockSVGElement() {
  const attrs: Record<string, string> = {};
  return {
    setAttribute: vi.fn((name: string, value: string) => {
      attrs[name] = value;
    }),
    getAttribute: (name: string) => attrs[name] ?? null,
    _attrs: attrs,
  };
}

function createMockElement() {
  return {
    style: {
      opacity: "1",
      transform: "",
    } as CSSStyleDeclaration,
  };
}

function createRefs() {
  const bigNoise = createMockSVGElement();
  const displacement = createMockSVGElement();
  const image = createMockElement();
  const container = createMockElement();
  return {
    bigNoise,
    displacement,
    image,
    container,
    asRefs: {
      bigNoiseRef: {
        current: bigNoise as unknown as SVGFETurbulenceElement,
      },
      displacementRef: {
        current: displacement as unknown as SVGFEDisplacementMapElement,
      },
      imageRef: { current: image as unknown as HTMLElement },
      containerRef: { current: container as unknown as HTMLDivElement },
    },
  };
}

beforeEach(() => {
  rafCallbacks = [];
  nextRafId = 1;
  mockTime = 0;

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    const id = nextRafId++;
    rafCallbacks.push({ id, cb });
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    rafCallbacks = rafCallbacks.filter((entry) => entry.id !== id);
  });
  vi.spyOn(performance, "now").mockImplementation(() => mockTime);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDissolveEffect", () => {
  it("calls onComplete after animation duration (default 1300ms)", () => {
    const onComplete = vi.fn();
    const { asRefs } = createRefs();

    const { result } = renderHook(() =>
      useDissolveEffect(asRefs, { onComplete })
    );

    act(() => {
      result.current.start();
    });

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      tickUntilComplete(1300);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not call onComplete if cancelled before completion", () => {
    const onComplete = vi.fn();
    const { asRefs } = createRefs();

    const { result } = renderHook(() =>
      useDissolveEffect(asRefs, { onComplete })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      tickFrame(300);
    });

    act(() => {
      result.current.cancel();
    });

    act(() => {
      tickFrame(800);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("ramps scale on displacement map up to 700", () => {
    const onComplete = vi.fn();
    const { displacement, asRefs } = createRefs();

    const { result } = renderHook(() =>
      useDissolveEffect(asRefs, { onComplete })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      tickFrame(500);
    });

    expect(displacement.setAttribute).toHaveBeenCalledWith(
      "scale",
      expect.any(String)
    );

    const lastScaleCall = displacement.setAttribute.mock.calls.find(
      ([attr]: [string]) => attr === "scale"
    );
    expect(Number(lastScaleCall![1])).toBeGreaterThan(0);

    // Complete and check final scale was near 2000
    act(() => {
      tickUntilComplete(600);
    });

    const allScaleCalls = displacement.setAttribute.mock.calls.filter(
      ([attr]: [string]) => attr === "scale"
    );
    const lastScale = Number(allScaleCalls[allScaleCalls.length - 1][1]);
    expect(lastScale).toBeGreaterThan(650);
  });

  it("sets seed once at animation start, not every frame", () => {
    const onComplete = vi.fn();
    const { bigNoise, asRefs } = createRefs();

    const { result } = renderHook(() =>
      useDissolveEffect(asRefs, { onComplete })
    );

    act(() => {
      result.current.start();
    });

    // Seed should be set once during start()
    const seedCallsAfterStart = bigNoise.setAttribute.mock.calls.filter(
      ([attr]: [string]) => attr === "seed"
    );
    expect(seedCallsAfterStart).toHaveLength(1);
    expect(seedCallsAfterStart[0][1]).not.toBe("0");

    // Tick several frames
    act(() => {
      tickFrame(200);
    });
    act(() => {
      tickFrame(200);
    });
    act(() => {
      tickFrame(200);
    });

    // Seed should still only have been set once (not per frame)
    const seedCallsAfterFrames = bigNoise.setAttribute.mock.calls.filter(
      ([attr]: [string]) => attr === "seed"
    );
    expect(seedCallsAfterFrames).toHaveLength(1);

    act(() => {
      tickUntilComplete(500);
    });
  });

  it("animates transform scale-up on image element", () => {
    const onComplete = vi.fn();
    const { image, asRefs } = createRefs();

    const { result } = renderHook(() =>
      useDissolveEffect(asRefs, { onComplete })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      tickFrame(500);
    });

    expect(image.style.transform).toMatch(/^scale\(/);
    // Scale should be > 1
    const scaleVal = parseFloat(
      image.style.transform.replace("scale(", "").replace(")", "")
    );
    expect(scaleVal).toBeGreaterThan(1);

    act(() => {
      tickUntilComplete(600);
    });
  });

  it("fades opacity starting at 30% progress", () => {
    const onComplete = vi.fn();
    const { image, asRefs } = createRefs();

    const { result } = renderHook(() =>
      useDissolveEffect(asRefs, { onComplete })
    );

    act(() => {
      result.current.start();
    });

    // At 20% progress (260ms), opacity should still be 1
    act(() => {
      tickFrame(260);
    });
    expect(Number(image.style.opacity)).toBe(1);

    // At 65% progress (845ms), opacity should be < 1
    act(() => {
      tickFrame(585);
    });
    expect(Number(image.style.opacity)).toBeLessThan(1);

    act(() => {
      tickUntilComplete(400);
    });
  });

  it("resets visual state on cancel", () => {
    const onComplete = vi.fn();
    const { bigNoise, displacement, image, container, asRefs } = createRefs();

    const { result } = renderHook(() =>
      useDissolveEffect(asRefs, { onComplete })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      tickFrame(500);
    });

    act(() => {
      result.current.cancel();
    });

    expect(displacement._attrs["scale"]).toBe("0");
    expect(bigNoise._attrs["seed"]).toBe("0");
    expect(image.style.transform).toBe("");
    expect(image.style.opacity).toBe("1");
    expect(container.style.opacity).toBe("1");
  });

  it("prevents double-start", () => {
    const onComplete = vi.fn();
    const { asRefs } = createRefs();

    const { result } = renderHook(() =>
      useDissolveEffect(asRefs, { onComplete })
    );

    act(() => {
      result.current.start();
      result.current.start();
    });

    act(() => {
      tickUntilComplete(1300);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does nothing when refs are null", () => {
    const onComplete = vi.fn();

    const { result } = renderHook(() =>
      useDissolveEffect(
        {
          bigNoiseRef: { current: null },
          displacementRef: { current: null },
          imageRef: { current: null },
          containerRef: { current: null },
        },
        { onComplete }
      )
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      tickFrame(1100);
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("retains final animation styles on completion (cleanup is handled by React keys)", () => {
    const onComplete = vi.fn();
    const { image, container, asRefs } = createRefs();

    const { result } = renderHook(() =>
      useDissolveEffect(asRefs, { onComplete })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      tickUntilComplete(1300);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    // Styles remain at final animation values — the DOM node is
    // unmounted by React (via key props) so no reset is needed here.
    // Resetting before onComplete would cause a visible flash.
    expect(container.style.opacity).toBe("0");
    expect(image.style.opacity).toBe("0");
    expect(image.style.transform).toMatch(/^scale\(/);
  });

  it("supports custom duration", () => {
    const onComplete = vi.fn();
    const { asRefs } = createRefs();

    const { result } = renderHook(() =>
      useDissolveEffect(asRefs, { onComplete, duration: 2000 })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      tickUntilComplete(1300);
    });

    // At ~1050ms of 2000ms, should NOT be complete
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      tickUntilComplete(1100);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

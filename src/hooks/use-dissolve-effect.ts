import { useCallback, useEffect, useMemo, useRef } from "react";

interface DissolveEffectRefs {
  bigNoiseRef: React.RefObject<SVGFETurbulenceElement | null>;
  displacementRef: React.RefObject<SVGFEDisplacementMapElement | null>;
  imageRef: React.RefObject<HTMLElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface DissolveEffectOptions {
  onComplete: () => void;
  duration?: number;
}

export function useDissolveEffect(
  refs: DissolveEffectRefs,
  options: DissolveEffectOptions
) {
  const rafRef = useRef<number>(0);
  const isRunningRef = useRef(false);
  const refsRef = useRef(refs);
  const optionsRef = useRef(options);

  useEffect(() => {
    refsRef.current = refs;
  });
  useEffect(() => {
    optionsRef.current = options;
  });

  const start = useCallback(() => {
    const { bigNoiseRef, displacementRef, imageRef, containerRef } =
      refsRef.current;
    const duration = optionsRef.current.duration ?? 1300;

    if (
      !bigNoiseRef.current ||
      !displacementRef.current ||
      !imageRef.current ||
      !containerRef.current ||
      isRunningRef.current
    ) {
      return;
    }

    isRunningRef.current = true;

    // Set seed once at start — consistent noise pattern throughout
    bigNoiseRef.current.setAttribute(
      "seed",
      String(Math.floor(Math.random() * 1000))
    );

    const startTime = performance.now();

    const animate = (now: number) => {
      const { displacementRef, imageRef, containerRef } = refsRef.current;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic: fast start, gentle end
      const eased = 1 - Math.pow(1 - progress, 3);

      // Scale ramps from 0 to 700
      const scale = eased * 700;

      // Subtle scale-up during dissolve
      const transform = `scale(${1 + 0.1 * eased})`;

      // Opacity fades from 1 to 0, starting at 50% progress
      const opacity = progress < 0.5 ? 1 : 1 - (progress - 0.5) / 0.5;

      displacementRef.current?.setAttribute("scale", String(scale));
      if (imageRef.current) {
        imageRef.current.style.transform = transform;
        imageRef.current.style.opacity = String(opacity);
      }
      if (containerRef.current) {
        containerRef.current.style.opacity = String(opacity);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        isRunningRef.current = false;
        // Reset imperative inline styles so the DOM node is not left invisible
        if (containerRef.current) {
          containerRef.current.style.opacity = "";
        }
        if (imageRef.current) {
          imageRef.current.style.opacity = "";
          imageRef.current.style.transform = "";
        }
        optionsRef.current.onComplete();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const cancel = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    isRunningRef.current = false;

    const { bigNoiseRef, displacementRef, imageRef, containerRef } =
      refsRef.current;
    bigNoiseRef.current?.setAttribute("seed", "0");
    displacementRef.current?.setAttribute("scale", "0");
    if (imageRef.current) {
      imageRef.current.style.transform = "";
      imageRef.current.style.opacity = "1";
    }
    if (containerRef.current) {
      containerRef.current.style.opacity = "1";
    }
  }, []);

  return useMemo(() => ({ start, cancel }), [start, cancel]);
}

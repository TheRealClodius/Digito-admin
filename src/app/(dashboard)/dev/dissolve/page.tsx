"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

const DEFAULTS = {
  duration: 1300,
  bigNoiseFreq: 0.004,
  bigNoiseOctaves: 1,
  fineNoiseFreq: 1,
  fineNoiseOctaves: 1,
  compSlope: 5,
  compIntercept: -2,
  maxScale: 700,
  opacityFadeStart: 0.5,
  scaleUp: 0.1,
  easing: "ease-out" as "linear" | "ease-in" | "ease-out" | "ease-in-out",
  xChannel: "R" as "R" | "G" | "B" | "A",
  yChannel: "G" as "R" | "G" | "B" | "A",
  filterX: -200,
  filterY: -200,
  filterW: 700,
  filterH: 700,
};

const EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  "ease-in": (t) => t * t * t,
  "ease-out": (t) => 1 - Math.pow(1 - t, 3),
  "ease-in-out": (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

export default function DissolveDevPage() {
  const [params, setParams] = useState(DEFAULTS);
  const [dissolving, setDissolving] = useState(false);
  const bigNoiseRef = useRef<SVGFETurbulenceElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setDissolving(false);
    if (bigNoiseRef.current) bigNoiseRef.current.setAttribute("seed", "0");
    if (displacementRef.current)
      displacementRef.current.setAttribute("scale", "0");
    if (imageRef.current) {
      imageRef.current.style.transform = "";
      imageRef.current.style.opacity = "1";
    }
    if (containerRef.current) {
      containerRef.current.style.opacity = "1";
    }
  }, []);

  const dissolve = useCallback(() => {
    if (
      !bigNoiseRef.current ||
      !displacementRef.current ||
      !imageRef.current ||
      !containerRef.current
    )
      return;

    reset();
    setDissolving(true);

    // Set seed once at start
    bigNoiseRef.current.setAttribute(
      "seed",
      String(Math.floor(Math.random() * 1000))
    );

    const easeFn = EASINGS[params.easing];
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / params.duration, 1);
      const eased = easeFn(progress);

      const scale = eased * params.maxScale;
      const transform = `scale(${1 + params.scaleUp * eased})`;

      const opacityProgress = Math.max(
        0,
        (progress - params.opacityFadeStart) / (1 - params.opacityFadeStart)
      );
      const opacity = 1 - opacityProgress;

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
        setDissolving(false);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [params, reset]);

  const set = (key: string, value: number | string) =>
    setParams((p) => ({ ...p, [key]: value }));

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Dissolve Effect Tuner</h1>

      {/* Preview */}
      <div className="flex items-start gap-8">
        <div>
          <svg width="0" height="0" className="absolute" aria-hidden="true">
            <defs>
              <filter
                id="dissolve-dev"
                x={`${params.filterX}%`}
                y={`${params.filterY}%`}
                width={`${params.filterW}%`}
                height={`${params.filterH}%`}
                colorInterpolationFilters="sRGB"
              >
                <feTurbulence
                  ref={bigNoiseRef}
                  type="fractalNoise"
                  baseFrequency={String(params.bigNoiseFreq)}
                  numOctaves={params.bigNoiseOctaves}
                  seed="0"
                  result="bigNoise"
                />
                <feComponentTransfer in="bigNoise" result="bigNoiseAdjusted">
                  <feFuncR
                    type="linear"
                    slope={String(params.compSlope)}
                    intercept={String(params.compIntercept)}
                  />
                  <feFuncG
                    type="linear"
                    slope={String(params.compSlope)}
                    intercept={String(params.compIntercept)}
                  />
                </feComponentTransfer>
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={String(params.fineNoiseFreq)}
                  numOctaves={params.fineNoiseOctaves}
                  result="fineNoise"
                />
                <feMerge result="mergedNoise">
                  <feMergeNode in="bigNoiseAdjusted" />
                  <feMergeNode in="fineNoise" />
                </feMerge>
                <feDisplacementMap
                  ref={displacementRef}
                  in="SourceGraphic"
                  in2="mergedNoise"
                  scale="0"
                  xChannelSelector={params.xChannel}
                  yChannelSelector={params.yChannel}
                />
              </filter>
            </defs>
          </svg>
          <div ref={containerRef} className="inline-block overflow-visible">
            <div
              ref={imageRef}
              className="flex h-[200px] w-[200px] items-center justify-center rounded-md border bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
              style={{ filter: "url(#dissolve-dev)", willChange: "transform, opacity" }}
            >
              <span className="text-4xl font-bold text-white/90">Test</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={dissolve} disabled={dissolving}>
            Dissolve
          </Button>
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
          <Button variant="secondary" onClick={() => setParams(DEFAULTS)}>
            Defaults
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <Slider label="Duration" value={params.duration} min={200} max={3000} step={50} unit="ms" onChange={(v) => set("duration", v)} />
        <Slider label="Max Scale" value={params.maxScale} min={100} max={5000} step={50} onChange={(v) => set("maxScale", v)} />
        <Slider label="Opacity Fade Start" value={params.opacityFadeStart} min={0} max={0.9} step={0.05} onChange={(v) => set("opacityFadeStart", v)} />
        <Slider label="Scale Up Amount" value={params.scaleUp} min={0} max={0.5} step={0.01} onChange={(v) => set("scaleUp", v)} />

        <div className="col-span-2 mt-2 border-t pt-2 text-sm font-semibold text-muted-foreground">Big Noise (directional flow)</div>
        <Slider label="Big Noise Freq" value={params.bigNoiseFreq} min={0.001} max={0.05} step={0.001} onChange={(v) => set("bigNoiseFreq", v)} />
        <Slider label="Big Noise Octaves" value={params.bigNoiseOctaves} min={1} max={5} step={1} onChange={(v) => set("bigNoiseOctaves", v)} />
        <Slider label="Component Slope" value={params.compSlope} min={1} max={20} step={0.5} onChange={(v) => set("compSlope", v)} />
        <Slider label="Component Intercept" value={params.compIntercept} min={-10} max={0} step={0.5} onChange={(v) => set("compIntercept", v)} />

        <div className="col-span-2 mt-2 border-t pt-2 text-sm font-semibold text-muted-foreground">Fine Noise (particle texture)</div>
        <Slider label="Fine Noise Freq" value={params.fineNoiseFreq} min={0.1} max={5} step={0.1} onChange={(v) => set("fineNoiseFreq", v)} />
        <Slider label="Fine Noise Octaves" value={params.fineNoiseOctaves} min={1} max={5} step={1} onChange={(v) => set("fineNoiseOctaves", v)} />

        <div className="col-span-2 mt-2 border-t pt-2 text-sm font-semibold text-muted-foreground">Filter Region (perimeter)</div>
        <Slider label="Filter X" value={params.filterX} min={-500} max={0} step={10} unit="%" onChange={(v) => set("filterX", v)} />
        <Slider label="Filter Y" value={params.filterY} min={-500} max={0} step={10} unit="%" onChange={(v) => set("filterY", v)} />
        <Slider label="Filter Width" value={params.filterW} min={100} max={1100} step={10} unit="%" onChange={(v) => set("filterW", v)} />
        <Slider label="Filter Height" value={params.filterH} min={100} max={1100} step={10} unit="%" onChange={(v) => set("filterH", v)} />

        <div className="col-span-2 mt-2 border-t pt-2 text-sm font-semibold text-muted-foreground">Other</div>
        <Select label="Easing" value={params.easing} options={["linear", "ease-in", "ease-out", "ease-in-out"]} onChange={(v) => set("easing", v)} />
        <Select label="X Channel" value={params.xChannel} options={["R", "G", "B", "A"]} onChange={(v) => set("xChannel", v)} />
        <Select label="Y Channel" value={params.yChannel} options={["R", "G", "B", "A"]} onChange={(v) => set("yChannel", v)} />
      </div>

      {/* Current values as code */}
      <div className="rounded-md bg-muted p-4">
        <p className="mb-2 text-sm font-medium">Values for implementation:</p>
        <pre className="text-xs">
{`// use-dissolve-effect.ts
duration: ${params.duration}
maxScale: ${params.maxScale}
opacityFadeStart: ${params.opacityFadeStart}
scaleUp: ${params.scaleUp}
easing: ${params.easing}

// image-upload.tsx - Filter region
x="${params.filterX}%" y="${params.filterY}%" width="${params.filterW}%" height="${params.filterH}%"
// Big noise
baseFrequency="${params.bigNoiseFreq}" numOctaves={${params.bigNoiseOctaves}}
// Component transfer
slope="${params.compSlope}" intercept="${params.compIntercept}"
// Fine noise
baseFrequency="${params.fineNoiseFreq}" numOctaves={${params.fineNoiseOctaves}}
// Displacement
xChannelSelector="${params.xChannel}" yChannelSelector="${params.yChannel}"`}
        </pre>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}: <span className="font-mono text-muted-foreground">{value}{unit && ` ${unit}`}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}: <span className="font-mono text-muted-foreground">{value}</span>
      </label>
      <select className="w-full rounded border bg-background px-2 py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

"use client";

import type { ScanResult } from "@/lib/scan/types";
import { type SimKey } from "./data";
import { clamp, safeHost } from "./shared";
import { PreviewToolbar, PreviewCanvas, PreviewLegend, type FocusPoint } from "./preview-parts";

export function PreviewPanel({
  result,
  input,
  onInput,
  onSubmit,
  sim,
  setSim,
  showMarkers,
  setShowMarkers,
  showFocusPath,
  setShowFocusPath,
}: {
  result: ScanResult;
  input: string;
  onInput: (v: string) => void;
  onSubmit: () => void;
  sim: SimKey;
  setSim: (s: SimKey) => void;
  showMarkers: boolean;
  setShowMarkers: (v: boolean) => void;
  showFocusPath: boolean;
  setShowFocusPath: (v: boolean) => void;
}) {
  const host = safeHost(result.finalUrl);

  const focusPoints: FocusPoint[] = (result.keyboard?.focusPath ?? [])
    .filter((s) => s.left !== null && s.top !== null)
    .map((s) => ({
      n: s.n,
      cx: clamp(s.left! + (s.width ?? 0) / 2, 2, 98),
      cy: clamp(s.top! + (s.height ?? 0) / 2, 2, 98),
      visible: s.focusVisible,
      label: s.label,
    }));

  return (
    <section className="scroll-slim lg:sticky lg:top-20.5 lg:-mt-1.5 lg:-ml-1.5 lg:max-h-[calc(100vh-98px)] lg:overflow-y-auto lg:pt-1.5 lg:pr-1.5 lg:pl-1.5">
      <PreviewToolbar
        result={result}
        input={input}
        onInput={onInput}
        onSubmit={onSubmit}
        sim={sim}
        setSim={setSim}
        showMarkers={showMarkers}
        setShowMarkers={setShowMarkers}
        showFocusPath={showFocusPath}
        setShowFocusPath={setShowFocusPath}
        hasFocusPath={focusPoints.length > 0}
      />

      <PreviewCanvas
        result={result}
        host={host}
        sim={sim}
        showMarkers={showMarkers}
        showFocusPath={showFocusPath}
        focusPoints={focusPoints}
      />

      <PreviewLegend
        markers={result.markers}
        showFocusPath={showFocusPath}
        focusPoints={focusPoints}
      />
    </section>
  );
}

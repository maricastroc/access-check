"use client";

import { useEffect, useRef, useState } from "react";
import type { ScanResult, Severity } from "@/lib/scan/types";
import type { FindingView } from "@/lib/report/findings";
import {
  Button,
  CodeBlock,
  ColorSwatch,
  Marker,
  OccurrenceStepper,
  ProvenancePanel,
  SectionKicker,
  StatusSeal,
} from "@/components/ui";
import { modeDesc, previewFilters, type SimKey } from "./data";
import { clamp } from "./shared";
import { type Layer, type MarkerView } from "./report-ui";

const CAPTURE_WIDTH = 1200;
const CAPTURE_HEIGHT = 800;

export type FocusPoint = { n: number; cx: number; cy: number; visible: boolean; label: string };

function tintFor(severity: Severity | null): string {
  switch (severity) {
    case "critical":
      return "rgba(179,38,30,.16)";
    case "serious":
      return "rgba(168,90,6,.16)";
    case "moderate":
      return "rgba(138,106,0,.16)";
    default:
      return "rgba(60,92,122,.16)";
  }
}

function MarkerLayer({
  views,
  selectedSeverity,
  onSelect,
}: {
  views: MarkerView[];
  selectedSeverity: Severity | null;
  onSelect: (markerN: number) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {views.map((v) => {
        const belongs = v.findingId !== null;
        const box = belongs
          ? { border: "2px solid var(--color-ink)", background: tintFor(selectedSeverity) }
          : { border: "1px dashed rgba(23,24,26,.45)", background: "transparent" };
        return (
          <div key={v.marker.n} style={{ opacity: v.dimmed ? 0.45 : 1 }}>
            <span
              aria-hidden
              className="absolute"
              style={{
                left: `${v.marker.left}%`,
                top: `${v.marker.top}%`,
                width: `${v.marker.width}%`,
                height: `${v.marker.height}%`,
                ...box,
              }}
            />
            <span
              className="pointer-events-auto absolute"
              style={{
                left: `${clamp(v.marker.left + v.marker.width, 3, 96)}%`,
                top: `${clamp(v.marker.top, 3, 96)}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <Marker
                n={v.marker.n}
                state={v.state}
                label={v.label}
                ariaPressed={v.state === "selected"}
                ariaLabel={`Occurrence ${v.marker.n}: ${v.marker.label}`}
                onSelect={() => onSelect(v.marker.n)}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FocusLayer({ points }: { points: FocusPoint[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <polyline
          points={points.map((p) => `${p.cx},${p.cy}`).join(" ")}
          fill="none"
          stroke="var(--color-steel)"
          strokeWidth={1.2}
          strokeDasharray="3 2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {points.map((p) => (
        <span
          key={p.n}
          className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center border font-cond text-[11px] font-semibold text-surface"
          style={{
            left: `${p.cx}%`,
            top: `${p.cy}%`,
            background: p.visible ? "var(--color-steel)" : "var(--color-critical)",
            borderColor: "var(--color-surface)",
          }}
          title={`${p.n}. ${p.label}${p.visible ? "" : " — no visible focus indicator"}`}
        >
          {p.n}
        </span>
      ))}
    </div>
  );
}

/** Reports the live display scale (image width / native width) straight from the
 *  ResizeObserver, so the legend can't get stuck on the initial value. */
function useCaptureScale(report?: (pct: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !report) return;
    const update = () => report(Math.round((el.clientWidth / CAPTURE_WIDTH) * 100));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [report]);
  return ref;
}

/**
 * The capture palco: the real screenshot scaled to the container width, with the
 * marker or focus overlay sized exactly to the image (so both stay aligned at any
 * scale). `onScale` reports the current display scale for the legend.
 */
export function CaptureStage({
  result,
  host,
  sim,
  layer,
  markerViews,
  focusPoints,
  selectedFinding,
  onSelectMarker,
  height,
  onScale,
}: {
  result: ScanResult;
  host: string;
  sim: SimKey;
  layer: Layer;
  markerViews: MarkerView[];
  focusPoints: FocusPoint[];
  selectedFinding: FindingView | null;
  onSelectMarker: (markerN: number) => void;
  height: number;
  onScale?: (pct: number) => void;
}) {
  const ref = useCaptureScale(onScale);

  if (!result.screenshot) {
    return (
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ height, background: "#FBFAF7" }}
      >
        <div className="hatch-outside flex items-center gap-3 border border-dashed border-border px-6 py-8">
          <span className="text-[13px] text-muted">capture not generated ·</span>
          <code className="font-mono text-[12.5px] text-moderate-text">screenshot-unavailable</code>
        </div>
      </div>
    );
  }

  return (
    // Height follows the capture's true 1200×800 ratio so the whole viewport
    // shows and the marker overlay stays aligned at any column width — a fixed
    // height would clip the bottom of the capture on wide screens.
    <div className="relative overflow-hidden" style={{ background: "#FBFAF7" }}>
      <div ref={ref} className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.screenshot ?? undefined}
          alt={`Captured screenshot of ${host}`}
          className="block w-full transition-[filter] duration-200"
          style={{ filter: previewFilters[sim] }}
        />
        {layer === "markers" && (
          <MarkerLayer
            views={markerViews}
            selectedSeverity={selectedFinding?.severity ?? null}
            onSelect={onSelectMarker}
          />
        )}
        {layer === "focus" && focusPoints.length > 0 && <FocusLayer points={focusPoints} />}
      </div>
    </div>
  );
}

export function EvidenceFrame({
  result,
  host,
  sim,
  layer,
  collapsed,
  onToggleCollapse,
  markerViews,
  focusPoints,
  selectedFinding,
  occurrenceIndex,
  onPrev,
  onNext,
  onSelectMarker,
}: {
  result: ScanResult;
  host: string;
  sim: SimKey;
  layer: Layer;
  collapsed: boolean;
  onToggleCollapse: () => void;
  markerViews: MarkerView[];
  focusPoints: FocusPoint[];
  selectedFinding: FindingView | null;
  occurrenceIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelectMarker: (markerN: number) => void;
}) {
  const [scalePct, setScalePct] = useState(60);

  const legend = collapsed
    ? "Capture collapsed"
    : `Captured page · ${CAPTURE_WIDTH} × ${CAPTURE_HEIGHT} · scale ${scalePct}%`;
  const visionNote =
    sim === "normal" ? "default render · no vision filter" : `simulating ${modeDesc[sim].split(" —")[0].toLowerCase()}`;

  return (
    <div className="border border-ink bg-surface">
      {/* legend bar */}
      <div className="flex items-center justify-between gap-3 border-b border-ink px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <SectionKicker>{legend}</SectionKicker>
          {!collapsed && <span className="text-[12px] text-muted">{visionNote}</span>}
        </div>
        <Button variant="secondary" size="sm" onClick={onToggleCollapse} className="shrink-0">
          {collapsed ? "Show capture" : "Collapse capture"}
        </Button>
      </div>

      {/* capture palco */}
      {!collapsed && (
        <div className="border-b border-ink">
          <CaptureStage
            result={result}
            host={host}
            sim={sim}
            layer={layer}
            markerViews={markerViews}
            focusPoints={focusPoints}
            selectedFinding={selectedFinding}
            onSelectMarker={onSelectMarker}
            height={540}
            onScale={setScalePct}
          />
        </div>
      )}

      {/* technical drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="border-b border-ink p-4 lg:border-r lg:border-b-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionKicker>Element and code</SectionKicker>
            {selectedFinding && selectedFinding.markers.length > 0 && (
              <OccurrenceStepper
                index={Math.min(occurrenceIndex, selectedFinding.markers.length - 1)}
                total={selectedFinding.markers.length}
                onPrev={onPrev}
                onNext={onNext}
              />
            )}
          </div>

          {selectedFinding ? (
            <div className="mt-3 space-y-3">
              <code className="block font-mono text-[13px] text-steel">
                {selectedFinding.selectors[0] ?? selectedFinding.ruleId}
              </code>

              {selectedFinding.markers.length === 0 && (
                <p className="flex items-center gap-2 text-[12.5px] text-muted">
                  <span aria-hidden className="inline-block h-3 w-3 border border-dashed border-border" />
                  This finding&apos;s element is outside the captured area — no marker was placed.
                </p>
              )}
              {selectedFinding.markers.length > 0 &&
                selectedFinding.markers.length < selectedFinding.elements && (
                  <p className="text-[12px] text-muted">
                    {selectedFinding.markers.length} of {selectedFinding.elements} located on the capture.
                  </p>
                )}

              {selectedFinding.fixCode && (
                <CodeBlock
                  lines={[
                    {
                      text: selectedFinding.fixCode,
                      tone: selectedFinding.fixStatus === "verified" ? "added" : "default",
                    },
                  ]}
                />
              )}

              {selectedFinding.measurement?.toHex && (
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  {selectedFinding.measurement.fromHex && (
                    <>
                      <ColorSwatch hex={selectedFinding.measurement.fromHex} size={16} />
                      <span className="font-mono text-[12px] text-muted">
                        {selectedFinding.measurement.fromHex.toUpperCase()}
                      </span>
                      <span aria-hidden className="text-muted">
                        →
                      </span>
                    </>
                  )}
                  <ColorSwatch hex={selectedFinding.measurement.toHex} size={16} />
                  <span className="font-mono text-[12px] text-ink">
                    {selectedFinding.measurement.toHex.toUpperCase()}
                  </span>
                </div>
              )}

              <StatusSeal status={selectedFinding.fixStatus}>
                {selectedFinding.fixStatus === "verified"
                  ? "Re-audited in a sandbox copy"
                  : undefined}
              </StatusSeal>
              <p className="text-[12px] text-muted">
                Fixes are applied and reverted in a copy. {host} was not altered.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-muted">
              Select a finding to inspect its element, code and sandbox re-audit.
            </p>
          )}
        </div>

        <div className="bg-band">
          <ProvenancePanel
            viewport={`${CAPTURE_WIDTH} × ${CAPTURE_HEIGHT}`}
            durationMs={result.durationMs}
          />
        </div>
      </div>
    </div>
  );
}

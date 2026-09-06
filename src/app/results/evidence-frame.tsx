"use client";

import { useEffect, useRef, useState } from "react";
import type { ScanResult, Severity } from "@/lib/scan/types";
import type { FindingView } from "@/lib/report/findings";
import { Button, CodeBlock, Marker, ProvenancePanel, SectionKicker } from "@/components/ui";
import { modeDesc, previewFilters, type SimKey } from "./data";
import { clamp } from "./shared";
import { type Layer, type MarkerView } from "./report-ui";
import type { FocusPoint } from "./report-model";

export type { FocusPoint };

const CAPTURE_WIDTH = 1200;
const CAPTURE_HEIGHT = 800;

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
                ariaLabel={`Marker ${v.marker.n}: ${v.marker.label}`}
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
          title={`${p.n}. ${p.label}${p.visible ? "" : " (no visible focus indicator)"}`}
        >
          {p.n}
        </span>
      ))}
    </div>
  );
}

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

function CaptureSkeleton({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden px-6"
      style={{ height, background: "#FBFAF7" }}
    >
      <div
        aria-hidden
        className="w-full max-w-160 border border-hairline bg-surface motion-safe:animate-pulse"
      >
        <div className="flex items-center gap-3 border-b border-hairline px-3 py-2.5">
          <span className="block h-2 w-14 bg-hairline" />
          <span className="ml-auto block h-2 w-28 bg-band" />
        </div>
        <div className="p-4">
          <span className="block h-3.5 w-2/5 bg-hairline" />
          <span className="mt-2.5 block h-2 w-3/5 bg-band" />
          <span className="mt-5 block h-24 w-full bg-band" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <span className="block h-11 bg-band" />
            <span className="block h-11 bg-band" />
            <span className="block h-11 bg-band" />
          </div>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        Taking the screenshot of the page.
      </p>
    </div>
  );
}

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
  quickFromSite = false,
  onRunFull,
  pending = false,
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
  quickFromSite?: boolean;
  onRunFull?: () => void;
  pending?: boolean;
}) {
  const ref = useCaptureScale(onScale);

  if (!result.screenshot && pending) return <CaptureSkeleton height={height} />;

  if (!result.screenshot) {
    return (
      <div
        className="hatch-outside flex items-center justify-center overflow-hidden px-6"
        style={{ height, background: "#FBFAF7" }}
      >
        <div className="w-full max-w-105 border border-border bg-surface p-5">
          <SectionKicker>{quickFromSite ? "Not captured yet" : "Not available"}</SectionKicker>
          <p className="mt-2 text-[14px] leading-normal text-ink">
            {quickFromSite
              ? "The site audit reads every page without stopping to photograph them."
              : "The screenshot could not be taken this time."}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-normal text-muted">
            {quickFromSite
              ? "The findings for this page are complete. Run the full audit to add the screenshot, the issue markers and the focus path."
              : "The findings for this page are unaffected — only the capture is missing."}
          </p>
          {onRunFull && (
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={onRunFull}>
                {quickFromSite ? "Run full audit" : "Try again"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden" style={{ background: "#FBFAF7" }}>
      <div ref={ref} className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.screenshot ?? undefined}
          alt={`Screenshot of ${host}`}
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
  onSelectMarker,
  quickFromSite = false,
  onRunFull,
  pending = false,
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
  onSelectMarker: (markerN: number) => void;
  quickFromSite?: boolean;
  onRunFull?: () => void;
  pending?: boolean;
}) {
  const [scalePct, setScalePct] = useState(60);

  const legend = collapsed
    ? "Screenshot collapsed"
    : result.screenshot
      ? `Screenshot · ${CAPTURE_WIDTH} × ${CAPTURE_HEIGHT} · scale ${scalePct}%`
      : pending
        ? "Screenshot · being taken"
        : "Screenshot";
  const visionNote =
    sim === "normal"
      ? "default render · no vision filter"
      : `simulating ${modeDesc[sim].split(".")[0].toLowerCase()}`;

  return (
    <div className="border border-ink bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-ink px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <SectionKicker>{legend}</SectionKicker>
          {!collapsed && <span className="text-[12px] text-muted">{visionNote}</span>}
        </div>
        <Button variant="secondary" size="sm" onClick={onToggleCollapse} className="shrink-0">
          {collapsed ? "Show screenshot" : "Collapse screenshot"}
        </Button>
      </div>

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
            quickFromSite={quickFromSite}
            onRunFull={onRunFull}
            pending={pending}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="border-b border-ink p-4 lg:border-r lg:border-b-0">
          <SectionKicker>Element and code</SectionKicker>
          {selectedFinding ? (
            <div className="mt-3 space-y-2.5">
              <code className="block font-mono text-[13px] text-steel">
                {selectedFinding.affectedSelectors[0] ?? selectedFinding.ruleId}
              </code>
              <p className="text-[12.5px] text-muted">
                <span className="font-medium text-ink tabular-nums">
                  {selectedFinding.elements}
                </span>{" "}
                element{selectedFinding.elements === 1 ? "" : "s"} ·{" "}
                {selectedFinding.markers.length} shown on the screenshot
              </p>
              {selectedFinding.markers.length === 0 && (
                <p className="flex items-start gap-2 text-[12px] text-muted">
                  <span
                    aria-hidden
                    className="mt-0.5 inline-block h-3 w-3 shrink-0 border border-dashed border-border"
                  />
                  {selectedFinding.noMarkerReason}
                </p>
              )}
              {selectedFinding.fixCode && (
                <CodeBlock
                  lines={[
                    {
                      text: selectedFinding.fixCode,
                      tone: selectedFinding.verdict.kind === "verified" ? "added" : "default",
                    },
                  ]}
                />
              )}
              <p className="text-[12px] text-muted">
                Full impact, fix preview and verification are in the findings panel.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-muted">
              Select a finding to inspect its element and code.
            </p>
          )}
        </div>

        <div className="bg-band">
          <ProvenancePanel
            viewport={result.screenshot ? `${CAPTURE_WIDTH} × ${CAPTURE_HEIGHT}` : undefined}
            durationMs={result.durationMs}
            passes={
              quickFromSite
                ? "Site-audit pass: axe rules and this project's own detections. Keyboard, expanded UI and fix verification run in the full audit."
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}

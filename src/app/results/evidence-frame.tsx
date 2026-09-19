"use client";

import { useEffect, useRef, useState } from "react";
import type { ScanResult, Severity } from "@/lib/scan/types";
import { locatedMarkers, type FindingView } from "@/lib/report/findings";
import { Button, CodeBlock, Marker, ProvenancePanel, SectionKicker } from "@/components/ui";
import { modeDesc, previewFilters, type SimKey } from "./data";
import { clamp } from "./shared";
import {
  focusPathShape,
  scrollTargetFor,
  type ActiveCapture,
  type Layer,
  type MarkerView,
} from "./report-ui";
import { OVERVIEW_CAPTURE } from "@/lib/scan/types";
import type { OverviewStop } from "@/lib/scan/types";
import { MAX_OVERVIEW_HEIGHT } from "@/lib/scan/overview-plan";
import type { MessageKey, Translate } from "@/lib/i18n/t";
import type { FocusPoint } from "./report-model";
import { RegionInspector } from "./region-inspector";
import type { InspectRegion } from "./report-ui";
import { useT } from "@/lib/i18n/provider";
import { scrollBehavior } from "@/lib/motion";

export type { FocusPoint };

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

const severityEdge: Record<string, string> = {
  critical: "double",
  serious: "solid",
  moderate: "dashed",
  minor: "dotted",
};

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
        const edge = severityEdge[v.marker.severity] ?? "solid";
        const box = belongs
          ? {
              borderWidth: edge === "double" ? 4 : 2,
              borderStyle: edge,
              borderColor: "var(--color-ink)",
              background: tintFor(selectedSeverity),
            }
          : {
              borderWidth: edge === "double" ? 3 : 1,
              borderStyle: edge,
              borderColor: "rgba(23,24,26,.45)",
              background: "transparent",
            };
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

function FocusLayer({
  points,
  selected,
  onSelectStop,
  t,
}: {
  points: FocusPoint[];
  selected: number | null;
  onSelectStop: (n: number) => void;
  t: Translate;
}) {
  const { segments, breaks } = focusPathShape(points);
  const first = points[0]?.n;
  const last = points[points.length - 1]?.n;

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {segments.map((s) => {
          const live = selected !== null && (s.from === selected || s.to === selected);
          return (
            <line
              key={`${s.from}-${s.to}`}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={live ? "var(--color-ink)" : "var(--color-steel)"}
              strokeWidth={1}
              strokeOpacity={live ? 0.8 : 0.32}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      {points.map((p) => {
        const away = breaks.filter((b) => b.at === p.n);
        const isSelected = selected === p.n;
        const isEnd = p.n === first || p.n === last;
        const fill = p.visible ? "var(--color-steel)" : "var(--color-critical)";

        return (
          <span
            key={p.n}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.cx}%`, top: `${p.cy}%`, zIndex: isSelected ? 2 : 1 }}
          >
            <span className="relative flex items-center">
              <span
                className="flex items-center justify-center rounded-full font-cond font-semibold text-surface transition-[width,height] duration-150"
                style={{
                  width: isSelected ? 22 : 17,
                  height: isSelected ? 22 : 17,
                  fontSize: isSelected ? 11 : 10,
                  background: isSelected ? "var(--color-ink)" : fill,
                  border: "1px solid rgba(252, 251, 248, 0.9)",
                  boxShadow: isSelected
                    ? "0 0 0 2px var(--color-ink), 0 2px 8px rgba(23, 24, 26, 0.35)"
                    : isEnd
                      ? "0 0 0 2px rgba(252, 251, 248, 0.55), 0 0 0 3px rgba(60, 92, 122, 0.45)"
                      : "0 1px 2px rgba(23, 24, 26, 0.25)",
                }}
                title={`${p.n}. ${p.label}${p.visible ? "" : ` (${t("results.noVisibleFocus")})`}`}
              >
                {p.n}
              </span>
              {away.map((b) => (
                <button
                  key={`${b.at}-${b.to}`}
                  type="button"
                  onClick={() => onSelectStop(b.to)}
                  className="pointer-events-auto ml-1 flex h-4.5 cursor-pointer items-center rounded-full border border-steel/40 bg-surface/95 px-1.5 font-cond text-[10px] font-semibold text-steel hover:border-ink hover:text-ink"
                  aria-label={t(
                    b.direction === "down" ? "focusPath.continuesDown" : "focusPath.continuesUp",
                    { stop: b.to },
                  )}
                >
                  <span aria-hidden>
                    {b.direction === "down" ? "\u2193" : "\u2191"}
                    {b.to}
                  </span>
                </button>
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function useCaptureScale(width: number, captureId: string, report?: (pct: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !report) return;
    const update = () => report(Math.round((el.clientWidth / width) * 100));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [report, width, captureId]);
  return ref;
}

function CaptureSkeleton({ height }: { height: number }) {
  const t = useT();
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
        {t("results.takingScreenshot")}
      </p>
    </div>
  );
}

export function CaptureStage({
  host,
  sim,
  layer,
  markerViews,
  focusPoints,
  selectedFinding,
  onSelectMarker,
  capture,
  overviewTop = null,
  selectedStop = null,
  onSelectStop,
  height,
  onScale,
  quickFromSite = false,
  onRunFull,
  pending = false,
}: {
  host: string;
  sim: SimKey;
  layer: Layer;
  markerViews: MarkerView[];
  focusPoints: FocusPoint[];
  selectedFinding: FindingView | null;
  onSelectMarker: (markerN: number) => void;
  capture: ActiveCapture;
  overviewTop?: number | null;
  selectedStop?: number | null;
  onSelectStop: (n: number) => void;
  height: number;
  onScale?: (pct: number) => void;
  quickFromSite?: boolean;
  onRunFull?: () => void;
  pending?: boolean;
}) {
  const t = useT();
  const ref = useCaptureScale(capture.width, capture.id, onScale);
  const scroller = useRef<HTMLDivElement>(null);
  const memory = useRef<Record<string, number>>({});
  const parked = useRef<Record<string, number>>({});
  const lastSelected = useRef<number | null>(null);
  const tiles = capture.tiles ?? [];
  const [missing, setMissing] = useState<number[]>([]);
  const [missingFor, setMissingFor] = useState(capture.id);

  if (missingFor !== capture.id) {
    setMissingFor(capture.id);
    setMissing([]);
  }

  const native = tiles.length === 0 && capture.id !== OVERVIEW_CAPTURE;
  const scrolls = tiles.length > 0 || native;
  const selected = markerViews.find((v) => v.state === "selected")?.marker ?? null;
  const selectedN = selected?.n ?? null;
  const stop =
    selectedStop === null ? null : (focusPoints.find((p) => p.n === selectedStop) ?? null);
  const stopTop = stop?.cy ?? null;
  const lastStop = useRef<number | null>(null);
  const selectedTop = selected?.top ?? null;
  const selectedLeft = selected?.left ?? null;

  useEffect(() => {
    const box = scroller.current;
    const column = ref.current;
    if (!box || !column) return;

    const changed = lastSelected.current !== selectedN;
    lastSelected.current = selectedN;

    if (changed && overviewTop !== null && capture.id !== OVERVIEW_CAPTURE) {
      parked.current[OVERVIEW_CAPTURE] = overviewTop;
    }

    let placed = -1;
    const apply = () => {
      const height = column.clientHeight;
      if (height <= 0 || height === placed) return;
      placed = height;

      const waiting = parked.current[capture.id];
      if (waiting !== undefined) {
        delete parked.current[capture.id];
        box.scrollTo({
          top: scrollTargetFor(waiting, height, box.clientHeight),
          behavior: scrollBehavior(),
        });
        return;
      }

      if (changed && selectedTop !== null) {
        box.scrollTo({
          top: scrollTargetFor(selectedTop, height, box.clientHeight),
          left:
            selectedLeft === null
              ? box.scrollLeft
              : scrollTargetFor(selectedLeft, column.clientWidth, box.clientWidth),
          behavior: scrollBehavior(),
        });
        return;
      }

      const remembered = memory.current[capture.id];
      if (remembered !== undefined) box.scrollTo({ top: remembered, behavior: "auto" });
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(column);
    return () => ro.disconnect();
  }, [selectedN, selectedTop, selectedLeft, overviewTop, capture.id, ref]);

  useEffect(() => {
    const box = scroller.current;
    const column = ref.current;
    if (!box || !column) return;
    if (lastStop.current === selectedStop) return;
    if (stopTop === null) return;
    lastStop.current = selectedStop;

    box.scrollTo({
      top: scrollTargetFor(stopTop, column.clientHeight, box.clientHeight),
      behavior: scrollBehavior(),
    });
  }, [selectedStop, stopTop, ref]);

  if (!capture.image && pending) return <CaptureSkeleton height={height} />;

  if (!capture.image) {
    return (
      <div
        className="hatch-outside flex items-center justify-center overflow-hidden px-6"
        style={{ height, background: "#FBFAF7" }}
      >
        <div className="w-full max-w-105 border border-border bg-surface p-5">
          <SectionKicker>
            {quickFromSite ? t("capture.notCaptured") : t("capture.notAvailable")}
          </SectionKicker>
          <p className="mt-2 text-[14px] leading-normal text-ink">
            {quickFromSite ? t("capture.siteAuditNote") : t("capture.failed")}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-normal text-muted">
            {quickFromSite ? t("capture.runFullNote") : t("capture.unaffected")}
          </p>
          {onRunFull && (
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={onRunFull}>
                {quickFromSite ? t("capture.runFull") : t("capture.tryAgain")}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrolls ? scroller : undefined}
      onScroll={
        scrolls
          ? (e) => {
              memory.current[capture.id] = e.currentTarget.scrollTop;
            }
          : undefined
      }
      className={scrolls ? "relative overflow-auto" : "relative overflow-hidden"}
      style={{ background: "#FBFAF7", ...(scrolls ? { height } : null) }}
    >
      <div
        ref={ref}
        key={capture.id}
        className="ac-capture-swap relative"
        style={native ? { width: capture.width } : { width: "100%" }}
      >
        {tiles.length > 0 ? (
          tiles.map((tile) =>
            missing.includes(tile.docY) ? (
              <div
                key={tile.docY}
                className="hatch-outside flex w-full items-center justify-center"
                style={{ aspectRatio: `${tile.width} / ${tile.height}` }}
              >
                <span className="border border-border bg-surface px-3 py-2 text-[12px] text-muted">
                  {t("capture.tileUnavailable", {
                    from: Math.round(tile.docY),
                    to: Math.round(tile.docY + tile.docHeight),
                  })}
                </span>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={tile.docY}
                src={tile.image}
                width={tile.width}
                height={tile.height}
                loading="lazy"
                decoding="async"
                onError={() =>
                  setMissing((at) => (at.includes(tile.docY) ? at : [...at, tile.docY]))
                }
                alt={t("panel.tileAlt", {
                  url: host,
                  from: Math.round(tile.docY),
                  to: Math.round(tile.docY + tile.docHeight),
                })}
                className="block w-full align-top transition-[filter] duration-200"
                style={{
                  aspectRatio: `${tile.width} / ${tile.height}`,
                  filter: previewFilters[sim],
                }}
              />
            ),
          )
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={capture.image ?? undefined}
            alt={t("panel.screenshotAlt", { url: host })}
            className={native ? "block max-w-none" : "block w-full"}
            style={{
              filter: previewFilters[sim],
              ...(native ? { width: capture.width, height: capture.height } : null),
            }}
          />
        )}
        {layer === "markers" && markerViews.length > 0 && (
          <MarkerLayer
            views={markerViews}
            selectedSeverity={selectedFinding?.severity ?? null}
            onSelect={onSelectMarker}
          />
        )}
        {layer === "markers" && markerViews.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/85 px-3 py-2 text-[12px] leading-normal text-surface">
            {t("capture.noMarkersLanded")}
          </p>
        )}
        {layer === "markers" && !native && markerViews.length > 0 && selectedN === null && (
          <p className="pointer-events-none sticky bottom-0 left-0 z-10 flex items-center gap-2 bg-ink/85 px-3 py-2 text-[12px] leading-normal text-surface">
            <span
              aria-hidden
              className="inline-flex size-4 shrink-0 items-center justify-center border border-surface font-cond text-[10px] font-semibold"
            >
              1
            </span>
            {t("capture.markerHint")}
          </p>
        )}
        {layer === "focus" && focusPoints.length > 0 && (
          <FocusLayer
            t={t}
            points={focusPoints}
            selected={selectedStop}
            onSelectStop={onSelectStop}
          />
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {capture.id !== OVERVIEW_CAPTURE
          ? t("capture.announceContextual")
          : tiles.length > 0
            ? t("capture.announceOverviewScroll")
            : t("capture.announceOverview")}
      </p>
    </div>
  );
}

const partialWhy: Record<OverviewStop, MessageKey> = {
  complete: "capture.partialWhyError",
  tiles: "capture.partialWhyTiles",
  height: "capture.partialWhyHeight",
  bytes: "capture.partialWhyBytes",
  time: "capture.partialWhyTime",
  error: "capture.partialWhyError",
};

function legendKey(capture: ActiveCapture): MessageKey {
  if (capture.id !== OVERVIEW_CAPTURE) return "capture.evidenceLabel";
  if (!capture.tiles || capture.tiles.length === 0) return "capture.frameLabel";
  return capture.partial ? "capture.overviewPartialLabel" : "capture.overviewLabel";
}

export function PartialOverviewNote({ capture }: { capture: ActiveCapture }) {
  const t = useT();
  const captured = Math.round(capture.capturedHeight ?? 0);
  const total = Math.round(capture.documentHeight ?? 0);

  return (
    <div className="border-b border-ink bg-band px-3 py-2.5">
      <SectionKicker>{t("capture.partialTitle")}</SectionKicker>
      <p className="mt-1.5 text-[12.5px] leading-normal text-ink">
        {t("capture.partialBody", { captured, total })}{" "}
        {t(partialWhy[capture.stoppedBy ?? "error"], { limit: MAX_OVERVIEW_HEIGHT })}
      </p>
      <p className="mt-1 text-[12.5px] leading-normal text-muted">{t("capture.partialCrops")}</p>
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
  capture,
  overviewTop,
  selectedStop = null,
  onSelectStop,
  inspect = null,
  onBackToOverview,
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
  capture: ActiveCapture;
  overviewTop?: number | null;
  selectedStop?: number | null;
  onSelectStop: (n: number) => void;
  inspect?: { region: InspectRegion; label: string; tone: string } | null;
  onBackToOverview?: () => void;
  quickFromSite?: boolean;
  onRunFull?: () => void;
  pending?: boolean;
}) {
  const t = useT();
  const [scalePct, setScalePct] = useState(60);

  const legend = collapsed
    ? t("capture.collapsed")
    : capture.image
      ? t(legendKey(capture), {
          width: capture.width,
          height: capture.height,
          scale: scalePct,
        })
      : pending
        ? t("capture.beingTaken")
        : t("capture.screenshot");
  const visionNote =
    sim === "normal"
      ? t("capture.defaultRender")
      : t("capture.simulating", { mode: t(modeDesc[sim]).split(".")[0].toLowerCase() });

  return (
    <div className="border border-ink bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-ink px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <SectionKicker>{legend}</SectionKicker>
          {!collapsed && <span className="text-[12px] text-muted">{visionNote}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!collapsed && capture.id !== OVERVIEW_CAPTURE && onBackToOverview && (
            <Button variant="tertiary" size="sm" onClick={onBackToOverview}>
              {t("capture.backToOverview")}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onToggleCollapse}>
            {collapsed ? t("capture.show") : t("capture.collapse")}
          </Button>
        </div>
      </div>

      {!collapsed && capture.partial && capture.tiles && capture.tiles.length > 0 && (
        <PartialOverviewNote capture={capture} />
      )}

      {!collapsed && (
        <div className="border-b border-ink">
          <CaptureStage
            capture={capture}
            overviewTop={overviewTop}
            selectedStop={selectedStop}
            onSelectStop={onSelectStop}
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
          {inspect && capture.tiles && capture.tiles.length > 0 && (
            <div id="region-inspector" className="mb-4 scroll-mt-20">
              <RegionInspector t={t} host={host} sim={sim} capture={capture} inspect={inspect} />
            </div>
          )}
          <SectionKicker>{t("capture.elementAndCode")}</SectionKicker>
          {selectedFinding ? (
            <div className="mt-3 space-y-2.5">
              <code className="block font-mono text-[13px] text-steel">
                {selectedFinding.affectedSelectors[0] ?? selectedFinding.ruleId}
              </code>
              <p className="text-[12.5px] text-muted">
                <span className="font-medium text-ink tabular-nums">
                  {selectedFinding.elements}
                </span>{" "}
                {t("unit.elementNoun", { count: selectedFinding.elements })} ·{" "}
                {t("capture.shownOnScreenshot", { count: locatedMarkers(selectedFinding) })}
              </p>
              {locatedMarkers(selectedFinding) === 0 && (
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
              <p className="text-[12px] text-muted">{t("results.fullImpactNote")}</p>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-muted">{t("results.selectFinding")}</p>
          )}
        </div>

        <div className="bg-band">
          <ProvenancePanel
            t={t}
            viewport={capture.image ? `${capture.width} × ${capture.height}` : undefined}
            durationMs={result.durationMs}
            passes={quickFromSite ? t("results.siteAuditPassNote") : undefined}
          />
        </div>
      </div>
    </div>
  );
}

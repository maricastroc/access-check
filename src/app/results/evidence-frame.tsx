"use client";

import type { ScanResult, Severity } from "@/lib/scan/types";
import { locatedMarkers, type FindingView } from "@/lib/report/findings";
import { verdictTone } from "@/lib/report/verdict";
import {
  Button,
  CodeBlock,
  ElementIdentityLine,
  Marker,
  ProvenancePanel,
  SectionKicker,
} from "@/components/ui";
import { clamp } from "./shared";
import type { Layer, MarkerView } from "./report-ui";
import { useT } from "@/lib/i18n/provider";

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
  layer,
  markerViews,
  selectedFinding,
  onSelectMarker,
  screenshot,
  height,
  quickFromSite = false,
  onRunFull,
  pending = false,
}: {
  host: string;
  layer: Layer;
  markerViews: MarkerView[];
  selectedFinding: FindingView | null;
  onSelectMarker: (markerN: number) => void;
  screenshot: string | null;
  height: number;
  quickFromSite?: boolean;
  onRunFull?: () => void;
  pending?: boolean;
}) {
  const t = useT();
  const selectedN = markerViews.find((v) => v.state === "selected")?.marker.n ?? null;

  if (!screenshot && pending) return <CaptureSkeleton height={height} />;

  if (!screenshot) {
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
    <div className="relative overflow-hidden" style={{ background: "#FBFAF7" }}>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshot}
          alt={t("panel.screenshotAlt", { url: host })}
          className="block w-full"
        />
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
        {layer === "markers" && markerViews.length > 0 && selectedN === null && (
          <p className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 bg-ink/85 px-3 py-2 text-[12px] leading-normal text-surface">
            <span
              aria-hidden
              className="inline-flex size-4 shrink-0 items-center justify-center border border-surface font-cond text-[10px] font-semibold"
            >
              1
            </span>
            {t("capture.markerHint")}
          </p>
        )}
      </div>
    </div>
  );
}

export function EvidenceFrame({
  result,
  host,
  layer,
  collapsed,
  onToggleCollapse,
  markerViews,
  selectedFinding,
  onSelectMarker,
  quickFromSite = false,
  onRunFull,
  pending = false,
}: {
  result: ScanResult;
  host: string;
  layer: Layer;
  collapsed: boolean;
  onToggleCollapse: () => void;
  markerViews: MarkerView[];
  selectedFinding: FindingView | null;
  onSelectMarker: (markerN: number) => void;
  quickFromSite?: boolean;
  onRunFull?: () => void;
  pending?: boolean;
}) {
  const t = useT();

  const legend = collapsed
    ? t("capture.collapsed")
    : result.screenshot
      ? t("capture.frameLabel", { width: 1200, height: 800 })
      : pending
        ? t("capture.beingTaken")
        : t("capture.screenshot");

  return (
    <div className="border border-ink bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-ink px-3 py-2.5">
        <SectionKicker>{legend}</SectionKicker>
        <Button variant="secondary" size="sm" onClick={onToggleCollapse}>
          {collapsed ? t("capture.show") : t("capture.collapse")}
        </Button>
      </div>

      {!collapsed && (
        <div className="border-b border-ink">
          <CaptureStage
            host={host}
            layer={layer}
            markerViews={markerViews}
            selectedFinding={selectedFinding}
            onSelectMarker={onSelectMarker}
            screenshot={result.screenshot}
            height={540}
            quickFromSite={quickFromSite}
            onRunFull={onRunFull}
            pending={pending}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="border-b border-ink p-4 lg:border-r lg:border-b-0">
          <SectionKicker>{t("capture.elementAndCode")}</SectionKicker>
          {selectedFinding ? (
            <div className="mt-3 space-y-2.5">
              <ElementIdentityLine finding={selectedFinding} t={t} />
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
                      tone:
                        verdictTone(selectedFinding.verdict) === "verified" ? "added" : "default",
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
            viewport={result.screenshot ? "1200 × 800" : undefined}
            durationMs={result.durationMs}
            passes={quickFromSite ? t("results.siteAuditPassNote") : undefined}
          />
        </div>
      </div>
    </div>
  );
}

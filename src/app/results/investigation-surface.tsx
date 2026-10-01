"use client";

import { VIEWPORT_CAPTURE, type ScanResult } from "@/lib/scan/types";
import { readableContext, type StopPlacement } from "@/lib/scan/placement";
import { Button } from "@/components/ui";
import { CaptureMarks, type PlacedMark, type PlacedStop } from "@/components/investigation";
import { cn } from "@/lib/cn";
import type { Translate } from "@/lib/i18n/t";
import type { ActiveCapture, Layer } from "./report-ui";

function stopNotice(placement: StopPlacement, n: number, t: Translate): string | null {
  if (placement.kind === "placed") return null;
  if (placement.kind === "region-missed") {
    const key =
      placement.reason === "bytes"
        ? "capture.regionMissedBytes"
        : placement.reason === "failed"
          ? "capture.regionMissedFailed"
          : "capture.regionMissedTime";
    return t(key, { docY: placement.docY });
  }
  if (placement.kind === "outside") return t("capture.stopOutside", { n, docY: placement.docY });
  if (placement.kind === "inside-scroller") {
    const context = readableContext(placement.context);
    return context
      ? t("capture.stopInsideScroller", { n, context })
      : t("capture.stopInsideScrollerPlain", { n });
  }
  return t("capture.stopUnplaced", { n });
}

export function LayerSwitch({
  value,
  onChange,
  disabled,
  t,
}: {
  value: Layer;
  onChange: (layer: Layer) => void;
  disabled: boolean;
  t: Translate;
}) {
  const options: [Layer, string][] = [
    ["findings", t("layers.findings")],
    ["path", t("layers.path")],
    ["none", t("layers.none")],
  ];
  return (
    <div role="group" aria-label={t("layers.label")} className="flex flex-wrap items-center gap-1">
      <span aria-hidden className="mr-1 text-[13.5px] text-muted">
        {t("layers.label")}
      </span>
      {options.map(([layer, label]) => (
        <button
          key={layer}
          type="button"
          aria-pressed={value === layer}
          disabled={disabled}
          onClick={() => onChange(layer)}
          className={cn(
            "h-8 cursor-pointer px-2 text-[14px] disabled:cursor-default disabled:text-disabled",
            value === layer
              ? "font-semibold text-ink underline decoration-2 underline-offset-[7px]"
              : "text-ink-2 hover:text-ink",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Skeleton({ t }: { t: Translate }) {
  return (
    <div className="flex aspect-[3/2] w-full items-center justify-center bg-surface px-6">
      <div aria-hidden className="w-full max-w-160 motion-safe:animate-pulse">
        <span className="block h-3.5 w-2/5 bg-hairline" />
        <span className="mt-2.5 block h-2 w-3/5 bg-band" />
        <span className="mt-5 block h-24 w-full bg-band" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <span className="block h-11 bg-band" />
          <span className="block h-11 bg-band" />
          <span className="block h-11 bg-band" />
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {t("results.takingScreenshot")}
      </p>
    </div>
  );
}

function Absent({
  title,
  body,
  note,
  action,
}: {
  title: string;
  body: string;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="hatch-outside flex aspect-[3/2] w-full items-center justify-center px-6">
      <div className="w-full max-w-105 bg-surface p-5">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-[14px] leading-normal text-ink-2">{body}</p>
        {note && <p className="mt-1.5 text-[13px] leading-normal text-muted">{note}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

export function InvestigationSurface({
  result,
  host,
  capture,
  onBackToFirst,
  layer,
  onLayer,
  marks,
  selectedId,
  occIndex,
  hoveredId,
  ring,
  stops,
  sequence,
  currentStop,
  anchorStop,
  stopWhere,
  wholePath,
  onSelectMark,
  onSelectStop,
  onHover,
  quickFromSite = false,
  onRunFull,
  pending = false,
  compact = false,
  t,
}: {
  result: ScanResult;
  host: string;
  capture: ActiveCapture;
  onBackToFirst: () => void;
  layer: Layer;
  onLayer: (layer: Layer) => void;
  marks: PlacedMark[];
  selectedId: string | null;
  occIndex: number;
  hoveredId: string | null;
  ring: boolean;
  stops: PlacedStop[];
  sequence: number[];
  currentStop: number | null;
  anchorStop: number | null;
  stopWhere: StopPlacement | null;
  wholePath: boolean;
  onSelectMark: (findingId: string, index: number) => void;
  onSelectStop: (n: number) => void;
  onHover: (id: string | null) => void;
  quickFromSite?: boolean;
  onRunFull?: () => void;
  pending?: boolean;
  compact?: boolean;
  t: Translate;
}) {
  const contextual = capture.id !== VIEWPORT_CAPTURE;
  const legend = contextual
    ? t("capture.regionLabel", { docY: Math.round(capture.docY) })
    : result.screenshot
      ? t("capture.frameLabel", { width: 1200, height: 800 })
      : pending
        ? t("capture.beingTaken")
        : t("capture.screenshot");

  const selectedOnCapture = marks.some((m) => m.findingId === selectedId);
  const caption =
    !capture.image || layer === "none"
      ? null
      : layer === "path"
        ? currentStop !== null && stopWhere && stopWhere.kind !== "placed"
          ? stopNotice(stopWhere, currentStop, t)
          : stops.length === 0
            ? t("capture.noStopsLanded")
            : currentStop === null
              ? t("capture.focusHint")
              : null
        : marks.length === 0
          ? t("capture.noMarkersLanded")
          : selectedId === null
            ? t("capture.markerHint")
            : !selectedOnCapture
              ? t("chain.notOnCapture")
              : null;

  let stage;
  if (capture.missed) {
    stage = (
      <Absent
        title={t("capture.regionMissedTitle")}
        body={t(
          capture.missed === "bytes"
            ? "capture.regionMissedBytes"
            : capture.missed === "failed"
              ? "capture.regionMissedFailed"
              : "capture.regionMissedTime",
          { docY: Math.round(capture.docY) },
        )}
      />
    );
  } else if (!capture.image && pending) {
    stage = <Skeleton t={t} />;
  } else if (!capture.image) {
    stage = (
      <Absent
        title={quickFromSite ? t("capture.notCaptured") : t("capture.notAvailable")}
        body={quickFromSite ? t("capture.siteAuditNote") : t("capture.failed")}
        note={quickFromSite ? t("capture.runFullNote") : t("capture.unaffected")}
        action={
          onRunFull && (
            <Button variant="primary" size="sm" onClick={onRunFull}>
              {quickFromSite ? t("capture.runFull") : t("capture.tryAgain")}
            </Button>
          )
        }
      />
    );
  } else {
    stage = (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={capture.image}
          alt={t("panel.screenshotAlt", { url: host })}
          className="ac-capture-swap block w-full outline outline-ink/20"
          key={capture.id}
        />
        <CaptureMarks
          marks={marks}
          selectedId={selectedId}
          occIndex={occIndex}
          hoveredId={hoveredId}
          layer={layer}
          ring={ring}
          stops={stops}
          sequence={sequence}
          currentStop={currentStop}
          anchorStop={anchorStop}
          wholePath={wholePath}
          travel
          quiet={compact}
          interactive
          onSelect={onSelectMark}
          onSelectStop={onSelectStop}
          onHover={onHover}
          t={t}
        />
      </div>
    );
  }

  return (
    <section
      id="evidence"
      aria-labelledby="capture-legend"
      className={cn(
        "flex scroll-mt-16 flex-col bg-booth",
        !compact && "lg:sticky lg:top-14 lg:h-[calc(100vh-56px)]",
      )}
    >
      <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-2">
        <h2 id="capture-legend" className="text-[13.5px] font-semibold text-ink-2">
          {legend}
        </h2>
        {contextual && (
          <button
            type="button"
            onClick={onBackToFirst}
            className="h-8 cursor-pointer text-[13.5px] font-semibold text-ink underline decoration-1 underline-offset-4 hover:decoration-2"
          >
            {t("capture.backToFirst")}
          </button>
        )}
        <div className="ml-auto">
          <LayerSwitch value={layer} onChange={onLayer} disabled={!capture.image} t={t} />
        </div>
      </div>
      <div
        id="capture-scroll"
        className={cn(
          "scroll-slim min-h-0 flex-1 overflow-auto pt-5 pb-8",
          compact ? "px-6" : "pr-[clamp(72px,7vw,120px)] pl-10",
        )}
      >
        <figure id="capture-figure" className="relative w-full max-w-[1200px]">
          {stage}
        </figure>
        {caption && (
          <p className="mt-3 max-w-[70ch] text-[13.5px] leading-normal text-ink" role="status">
            {caption}
          </p>
        )}
      </div>
    </section>
  );
}

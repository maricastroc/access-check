import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { ScanMarker, ScanResult } from "@/lib/scan/types";
import { modeDesc, modeList, previewFilters, type SimKey } from "./data";
import { clamp, markerColor } from "./shared";

export type FocusPoint = { n: number; cx: number; cy: number; visible: boolean; label: string };

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-[9px] border px-3 text-xs font-medium transition-colors ${
        active
          ? "border-brand-200 bg-brand-50 text-brand-600"
          : "border-line-strong bg-card text-muted"
      }`}
    >
      <span className={`size-1.75 rounded-full ${active ? "bg-brand-500" : "bg-faint"}`} />
      {children}
    </button>
  );
}

export function PreviewToolbar({
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
  hasFocusPath,
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
  hasFocusPath: boolean;
}) {
  const simLabel = modeList.find((m) => m.key === sim)!.label;
  return (
    <>
      <div className="mb-3.5 flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex w-full min-w-0 flex-col gap-1.5 sm:flex-1"
        >
          <div className="flex h-8.5 w-full items-center gap-2 overflow-hidden rounded-[9px] border border-line bg-card pr-2 pl-3 text-[13px] focus-within:border-brand-300 focus-within:[outline:2px_solid_var(--color-brand-500)] focus-within:[outline-offset:2px]">
            <span className="size-1.75 shrink-0 rounded-full bg-success" />
            <input
              value={input}
              onChange={(e) => onInput(e.target.value)}
              aria-label="URL to scan"
              placeholder="https://yourwebsite.com"
              className="min-w-0 flex-1 bg-transparent py-1 font-medium placeholder:font-normal placeholder:text-muted/70 focus:[outline:none]!"
            />
            {input && (
              <button
                type="button"
                onClick={() => onInput("")}
                aria-label="Clear URL"
                className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                <FontAwesomeIcon icon={faXmark} className="text-xs" />
              </button>
            )}
          </div>
          <span className="hidden pl-0.5 text-xs whitespace-nowrap text-muted sm:block">
            Scanned {result.scannedElements} elements · {(result.durationMs / 1000).toFixed(1)}s
          </span>
        </form>
        <div className="flex shrink-0 items-center gap-2 text-xs text-ink-soft sm:h-8.5">
          <span className="text-muted">Viewing as</span>
          <span className="rounded-[7px] border border-brand-300 bg-brand-50 px-2.5 py-0.75 font-semibold text-brand-600">
            {simLabel}
          </span>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold tracking-wider text-muted uppercase">
          Vision simulation
        </span>
        <span className="text-[11px] text-faint">See the page as ~8% of users do</span>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-0.5 rounded-[11px] bg-ui-bg p-1">
          {modeList.map((m) => (
            <button
              key={m.key}
              onClick={() => setSim(m.key)}
              className={`cursor-pointer rounded-lg px-3.25 py-2 text-[12.5px] whitespace-nowrap transition-colors ${
                m.key === sim
                  ? "bg-card font-semibold text-ink shadow-[0_1px_2px_rgba(16,18,29,.1),0_0_0_1px_rgba(16,18,29,.04)]"
                  : "font-medium text-ink-soft hover:text-ink"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <ToggleButton active={showMarkers} onClick={() => setShowMarkers(!showMarkers)}>
            {showMarkers ? "Markers on" : "Markers off"}
          </ToggleButton>
          {hasFocusPath && (
            <ToggleButton active={showFocusPath} onClick={() => setShowFocusPath(!showFocusPath)}>
              Focus path
            </ToggleButton>
          )}
        </div>
      </div>

      <div className="mb-2.5 flex items-center gap-2 text-xs leading-relaxed text-muted">
        <span className="size-1.25 rounded-full bg-dot" />
        {modeDesc[sim]}
      </div>
    </>
  );
}

function MarkerOverlay({ markers }: { markers: ScanMarker[] }) {
  return (
    <>
      {markers.map((m) => (
        <span key={m.n}>
          <span
            className="pointer-events-none absolute rounded-md"
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: `${m.width}%`,
              height: `${m.height}%`,
              border: `2px dashed ${markerColor(m.severity)}`,
              background: `${markerColor(m.severity)}1f`,
            }}
          />
          <span
            className="absolute z-10 flex size-5.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-[0_2px_5px_rgba(0,0,0,.3)]"
            style={{
              left: `${clamp(m.left + m.width, 3.5, 96.5)}%`,
              top: `${clamp(m.top, 4, 96)}%`,
              background: markerColor(m.severity),
            }}
          >
            {m.n}
          </span>
        </span>
      ))}
    </>
  );
}

function FocusPathOverlay({ points }: { points: FocusPoint[] }) {
  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points={points.map((p) => `${p.cx},${p.cy}`).join(" ")}
          fill="none"
          stroke="var(--color-brand-500)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          opacity={0.7}
        />
      </svg>
      {points.map((p) => (
        <span
          key={p.n}
          className="absolute z-10 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-[0_2px_5px_rgba(0,0,0,.3)]"
          style={{
            left: `${p.cx}%`,
            top: `${p.cy}%`,
            background: p.visible ? "var(--color-brand-500)" : "var(--color-critical)",
          }}
          title={`${p.n}. ${p.label}${p.visible ? "" : " — no visible focus indicator"}`}
        >
          {p.n}
        </span>
      ))}
    </>
  );
}

export function PreviewCanvas({
  result,
  host,
  sim,
  showMarkers,
  showFocusPath,
  focusPoints,
}: {
  result: ScanResult;
  host: string;
  sim: SimKey;
  showMarkers: boolean;
  showFocusPath: boolean;
  focusPoints: FocusPoint[];
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line-strong bg-card shadow-[0_1px_2px_rgba(16,18,29,.04),0_14px_40px_-12px_rgba(16,18,29,.14)]">
      <div className="flex h-10.5 items-center gap-3.5 border-b border-line bg-surface px-3.5">
        <div className="flex gap-1.75">
          <span className="size-2.75 rounded-full bg-[#ff5f57]" />
          <span className="size-2.75 rounded-full bg-[#febc2e]" />
          <span className="size-2.75 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex h-6.25 flex-1 items-center gap-1.75 truncate rounded-[7px] border border-line-strong bg-card px-2.75 font-mono text-[11.5px] text-muted">
          <span className="size-2.75 shrink-0 rounded-full border-[1.5px] border-ui-border" />
          <span className="truncate">{host}</span>
        </div>
        <span className="text-[11px] text-faint">Live preview</span>
      </div>

      <div className="relative overflow-hidden bg-card">
        {result.screenshot ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.screenshot}
              alt={`Screenshot of ${host}`}
              className="block w-full transition-[filter] duration-300"
              style={{ filter: previewFilters[sim] }}
            />
            {showMarkers && <MarkerOverlay markers={result.markers} />}
            {showFocusPath && focusPoints.length > 0 && <FocusPathOverlay points={focusPoints} />}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-muted">
            No preview available
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-white/90" />
      </div>
    </div>
  );
}

export function PreviewLegend({
  markers,
  showFocusPath,
  focusPoints,
}: {
  markers: ScanMarker[];
  showFocusPath: boolean;
  focusPoints: FocusPoint[];
}) {
  return (
    <>
      {markers.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="mr-0.5 self-center text-[11.5px] text-muted">
            {markers.length} issue{markers.length > 1 ? "s" : ""} in view
          </span>
          {markers.map((m) => (
            <span
              key={m.n}
              className="inline-flex max-w-55 items-center gap-1.75 rounded-lg border border-line bg-card py-1.25 pr-2.5 pl-1.5 text-xs text-ink-soft"
            >
              <span
                className="flex size-4.5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-white"
                style={{ background: markerColor(m.severity) }}
              >
                {m.n}
              </span>
              <span className="truncate">{m.label}</span>
            </span>
          ))}
        </div>
      )}

      {showFocusPath && focusPoints.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-1.75">
            <span className="size-2.75 rounded-full bg-brand-500" />
            Tab order 1 → {focusPoints.length}
          </span>
          <span className="inline-flex items-center gap-1.75">
            <span className="size-2.75 rounded-full bg-critical" />
            No visible focus indicator
          </span>
        </div>
      )}
    </>
  );
}

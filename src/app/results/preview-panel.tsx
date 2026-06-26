"use client";

import type { ScanResult } from "@/lib/scan/types";
import { modeDesc, modeList, previewFilters, type SimKey } from "./data";
import { clamp, markerColor, safeHost } from "./shared";

export function PreviewPanel({
  result,
  input,
  onInput,
  onSubmit,
  sim,
  setSim,
  showMarkers,
  setShowMarkers,
}: {
  result: ScanResult;
  input: string;
  onInput: (v: string) => void;
  onSubmit: () => void;
  sim: SimKey;
  setSim: (s: SimKey) => void;
  showMarkers: boolean;
  setShowMarkers: (v: boolean) => void;
}) {
  const simLabel = modeList.find((m) => m.key === sim)!.label;
  const host = safeHost(result.finalUrl);

  return (
    <section className="scroll-slim lg:sticky lg:top-20.5 lg:max-h-[calc(100vh-98px)] lg:overflow-y-auto lg:pr-1.5">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex min-w-0 items-center gap-2.5"
        >
          <div className="flex h-8.5 max-w-105 items-center gap-2 overflow-hidden rounded-[9px] border border-line bg-card pr-2 pl-3 text-[13px]">
            <span className="size-1.75 shrink-0 rounded-full bg-success" />
            <input
              value={input}
              onChange={(e) => onInput(e.target.value)}
              aria-label="URL to scan"
              className="min-w-0 flex-1 bg-transparent py-1 font-medium focus:outline-none"
            />
          </div>
          <span className="hidden text-xs whitespace-nowrap text-muted sm:block">
            Scanned {result.scannedElements} elements · {(result.durationMs / 1000).toFixed(1)}s
          </span>
        </form>
        <div className="flex items-center gap-2 text-xs text-ink-soft">
          <span className="text-muted">Viewing as</span>
          <span className="rounded-[7px] bg-brand-50 px-2.5 py-0.75 font-semibold text-brand-600">
            {simLabel}
          </span>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-0.5 rounded-[11px] bg-[#eaebef] p-1">
          {modeList.map((m) => {
            const active = m.key === sim;
            return (
              <button
                key={m.key}
                onClick={() => setSim(m.key)}
                className={`rounded-lg px-3.25 py-2 text-[12.5px] whitespace-nowrap transition-colors ${
                  active
                    ? "bg-card font-semibold text-ink shadow-[0_1px_2px_rgba(16,18,29,.1),0_0_0_1px_rgba(16,18,29,.04)]"
                    : "font-medium text-ink-soft hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowMarkers(!showMarkers)}
          className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-[9px] border px-3 text-xs font-medium transition-colors ${
            showMarkers
              ? "border-brand-200 bg-brand-50 text-brand-600"
              : "border-line-strong bg-card text-muted"
          }`}
        >
          <span className={`size-1.75 rounded-full ${showMarkers ? "bg-brand-500" : "bg-faint"}`} />
          {showMarkers ? "Markers on" : "Markers off"}
        </button>
      </div>

      <div className="mb-2.5 flex items-center gap-2 text-xs leading-relaxed text-muted">
        <span className="size-1.25 rounded-full bg-[#c2c6ce]" />
        {modeDesc[sim]}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-line-strong bg-card shadow-[0_1px_2px_rgba(16,18,29,.04),0_14px_40px_-12px_rgba(16,18,29,.14)]">
        <div className="flex h-10.5 items-center gap-3.5 border-b border-line bg-[#f7f8fa] px-3.5">
          <div className="flex gap-1.75">
            <span className="size-2.75 rounded-full bg-[#ff5f57]" />
            <span className="size-2.75 rounded-full bg-[#febc2e]" />
            <span className="size-2.75 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex h-6.25 flex-1 items-center gap-1.75 truncate rounded-[7px] border border-line-strong bg-card px-2.75 font-mono text-[11.5px] text-muted">
            <span className="size-2.75 shrink-0 rounded-full border-[1.5px] border-[#b7bcc4]" />
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
              {showMarkers &&
                result.markers.map((m) => {
                  const badgeX = clamp(m.left + m.width, 3.5, 96.5);
                  const badgeY = clamp(m.top, 4, 96);
                  return (
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
                          left: `${badgeX}%`,
                          top: `${badgeY}%`,
                          background: markerColor(m.severity),
                        }}
                      >
                        {m.n}
                      </span>
                    </span>
                  );
                })}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted">
              No preview available
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-white/90" />
        </div>
      </div>

      {result.markers.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="mr-0.5 self-center text-[11.5px] text-muted">
            {result.markers.length} issue
            {result.markers.length > 1 ? "s" : ""} in view
          </span>
          {result.markers.map((m) => (
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
    </section>
  );
}

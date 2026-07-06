"use client";

import { useState } from "react";
import Link from "next/link";
import type { ScanListItem } from "@/lib/scans";
import { DeleteScanButton } from "./history-buttons";
import { dateFmt, host, scoreColor } from "./history-utils";

export function ScanCard({ scan, delta }: { scan: ScanListItem; delta: number | null }) {
  const [loaded, setLoaded] = useState(false);

  const sev = [
    { label: "Critical", value: scan.counts.critical, color: "#c62a2f" },
    { label: "Serious", value: scan.counts.serious, color: "#a85a06" },
    { label: "Moderate", value: scan.counts.moderate, color: "#8a6a00" },
  ];

  return (
    <div className="group relative">
      <DeleteScanButton id={scan.id} />
      <Link
        href={`/report/${scan.id}`}
        className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-soft transition-shadow hover:shadow-card"
      >
        <div className="relative aspect-video overflow-hidden border-b border-line bg-canvas">
          {!loaded && <div aria-hidden className="ac-skeleton absolute inset-0" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/scan/${scan.id}/screenshot`}
            alt={`Screenshot of ${host(scan.finalUrl)}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02] ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
          <span
            className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-card"
            style={{ background: scoreColor(scan.score) }}
          >
            {scan.score}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-ink">{host(scan.finalUrl)}</span>
              {delta !== null && delta !== 0 && (
                <span
                  className="shrink-0 text-[11px] font-bold"
                  style={{ color: delta > 0 ? "#16764f" : "#c62a2f" }}
                >
                  {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted">{dateFmt.format(scan.createdAt)}</div>
          </div>

          <div className="mt-auto flex items-center gap-3 text-xs text-muted">
            {sev.map((s) => (
              <span key={s.label} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.value}
              </span>
            ))}
            <span className="ml-auto font-medium text-success">{scan.counts.passed} passed</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

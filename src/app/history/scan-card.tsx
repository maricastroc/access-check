"use client";

import { useState } from "react";
import Link from "next/link";
import type { ScanListItem } from "@/lib/scans";
import { DeleteScanButton } from "./history-buttons";
import { dateFmt, host, scoreColor } from "./history-utils";
import { useT } from "@/lib/i18n/provider";

export function ScanCard({ scan, delta }: { scan: ScanListItem; delta: number | null }) {
  const t = useT();
  const [loaded, setLoaded] = useState(false);

  const sev = [
    { label: "Critical", value: scan.counts.critical, color: "var(--color-critical)" },
    { label: "Serious", value: scan.counts.serious, color: "var(--color-serious)" },
    { label: "Moderate", value: scan.counts.moderate, color: "var(--color-moderate)" },
  ];

  return (
    <div className="group relative">
      <DeleteScanButton id={scan.id} />
      <Link
        href={`/report/${scan.id}`}
        className="flex flex-col overflow-hidden border border-hairline bg-surface transition-shadow"
      >
        <div className="relative aspect-video overflow-hidden border-b border-hairline bg-canvas">
          {!loaded && <div aria-hidden className="ac-skeleton absolute inset-0" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/scan/${scan.id}/screenshot`}
            alt={t("panel.screenshotAlt", { url: host(scan.finalUrl) })}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02] ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
          <span
            className="absolute top-3 right-3 flex size-11 items-center justify-center text-sm font-bold text-white shadow-selected"
            style={{ background: scoreColor(scan.score) }}
          >
            <span className="sr-only">{t("history.scoreLabel")} </span>
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
                  style={{ color: delta > 0 ? "var(--color-verified)" : "var(--color-critical)" }}
                >
                  <span aria-hidden>{delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}</span>
                  <span className="sr-only">
                    {delta > 0
                      ? t("history.scoreUp", { count: delta })
                      : t("history.scoreDown", { count: Math.abs(delta) })}
                  </span>
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
            <span className="ml-auto font-medium text-verified">{scan.counts.passed} passed</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

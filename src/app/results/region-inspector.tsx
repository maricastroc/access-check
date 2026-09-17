import { useEffect, useRef, useState } from "react";
import type { Translate } from "@/lib/i18n/t";
import { inspectionOrigin, type ActiveCapture, type InspectRegion } from "./report-ui";
import { previewFilters, type SimKey } from "./data";

const BOX_HEIGHT = 260;

function useBoxWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
}

export function RegionInspector({
  capture,
  inspect,
  sim,
  host,
  t,
}: {
  capture: ActiveCapture;
  inspect: { region: InspectRegion; label: string; tone: string };
  sim: SimKey;
  host: string;
  t: Translate;
}) {
  const { region, label, tone } = inspect;
  const tiles = capture.tiles ?? [];
  const scale = capture.scale ?? 1;
  const page = { width: capture.width, height: capture.capturedHeight ?? capture.height };

  const [ref, width] = useBoxWidth();
  const box = { width: width || page.width, height: BOX_HEIGHT };
  const origin = inspectionOrigin(region, box, page);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 pb-2">
        <span className="text-[12px] text-muted">{label}</span>
        <span className="font-mono text-[11px] text-steel tabular-nums">
          {t("inspect.nativeScale", {
            x: Math.round(region.x),
            y: Math.round(region.y),
          })}
        </span>
      </div>

      <div
        ref={ref}
        className="relative overflow-hidden border border-border bg-band"
        style={{ height: BOX_HEIGHT }}
      >
        {tiles.map((tile) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={tile.docY}
            src={tile.image}
            width={tile.width}
            height={tile.height}
            loading="lazy"
            decoding="async"
            alt={t("panel.tileAlt", {
              url: host,
              from: Math.round(tile.docY),
              to: Math.round(tile.docY + tile.docHeight),
            })}
            className="absolute max-w-none"
            style={{
              left: -origin.x,
              top: tile.docY - origin.y,
              width: tile.width / scale,
              height: tile.height / scale,
              filter: previewFilters[sim],
            }}
          />
        ))}

        <span
          aria-hidden
          className="absolute border-2"
          style={{
            left: region.x - origin.x,
            top: region.y - origin.y,
            width: Math.max(region.w, 4),
            height: Math.max(region.h, 4),
            borderColor: tone,
            boxShadow: "0 0 0 9999px rgba(20, 20, 20, 0.22)",
          }}
        />
      </div>
    </div>
  );
}

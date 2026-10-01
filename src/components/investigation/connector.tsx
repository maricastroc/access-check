"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Geometry = {
  d: string;
  page: string | null;
  start: { x: number; y: number };
  end: { x: number; y: number; off: "up" | "down" | null };
  label: { x: number; y: number; limit: number } | null;
};

export function Connector({
  from,
  to,
  fromBounds,
  belowOf,
  gutter,
  gutterOffset,
  minWidth,
  redrawKey,
  dashed = false,
  label,
  labelAfter,
}: {
  from: string;
  to: string;
  fromBounds: string;
  belowOf: string;
  gutter: string;
  gutterOffset: number;
  minWidth: number;
  redrawKey: string;
  dashed?: boolean;
  label?: ReactNode;
  labelAfter?: string;
}) {
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [len, setLen] = useState(0);
  const [chipLeft, setChipLeft] = useState<number | null>(null);
  const path = useRef<SVGPathElement>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const last = useRef("");
  const hasLabel = Boolean(label);

  useEffect(() => {
    const clear = () => {
      if (last.current === "") return;
      last.current = "";
      setGeo(null);
    };
    const measure = () => {
      frame.current = 0;
      const a = document.querySelector(from);
      const b = document.querySelector(to);
      const fb = document.querySelector(fromBounds);
      const top = document.querySelector(belowOf);
      const g = document.querySelector(gutter);
      if (!a || !b || !fb || !top || !g || window.innerWidth < minWidth) return clear();

      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const fr = fb.getBoundingClientRect();
      const sy = ar.top + ar.height / 2;
      if (sy < fr.top + 4 || sy > fr.bottom - 4 || ar.right < fr.left || ar.left > fr.right) {
        return clear();
      }

      const gx = g.getBoundingClientRect().left + gutterOffset;
      const sx = Math.min(ar.right, gx - 12);
      const upper = top.getBoundingClientRect().bottom + 8;
      const lower = window.innerHeight - 8;
      const raw = br.top + br.height / 2;
      const off = raw < upper ? "up" : raw > lower ? "down" : null;
      const ty = Math.min(Math.max(raw, upper), lower);
      const tx = br.left - 3;
      const after = labelAfter ? document.querySelector(labelAfter)?.getBoundingClientRect() : null;
      const edge = after ? Math.min(Math.max(after.right, sx), gx) : sx;
      const d = off ? `M ${edge} ${sy} H ${gx} V ${ty}` : `M ${edge} ${sy} H ${gx} V ${ty} H ${tx}`;
      const page = edge > sx + 1 ? `M ${sx} ${sy} H ${edge}` : null;
      const labelAt = hasLabel
        ? { x: after ? Math.max(after.right, sx) + 10 : gx, y: sy, limit: gx - 8 }
        : null;

      const signature = `${d}|${page}|${off}|${labelAt?.x}`;
      if (signature === last.current) return;
      last.current = signature;
      setGeo({
        d,
        page,
        start: { x: sx, y: sy },
        end: { x: off ? gx : tx, y: ty, off },
        label: labelAt,
      });
    };
    const schedule = () => {
      if (!frame.current) frame.current = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    for (const sel of [fromBounds, gutter]) {
      const el = document.querySelector(sel);
      if (el) ro.observe(el);
    }
    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [
    from,
    to,
    fromBounds,
    belowOf,
    gutter,
    gutterOffset,
    minWidth,
    redrawKey,
    labelAfter,
    hasLabel,
  ]);

  useLayoutEffect(() => {
    if (path.current) setLen(Math.ceil(path.current.getTotalLength()));
  }, [redrawKey, geo?.d]);

  useLayoutEffect(() => {
    if (!geo?.label || !chip.current) return;
    const w = chip.current.getBoundingClientRect().width;
    setChipLeft(Math.min(geo.label.x, geo.label.limit - w));
  }, [geo, label]);

  if (!geo) return null;

  const arrow = (x: number, y: number, dir: "up" | "down") =>
    dir === "up"
      ? `M ${x - 5} ${y + 6} L ${x} ${y} L ${x + 5} ${y + 6}`
      : `M ${x - 5} ${y - 6} L ${x} ${y} L ${x + 5} ${y - 6}`;

  return (
    <>
      <svg
        aria-hidden
        className="pointer-events-none fixed inset-0 z-20 h-full w-full overflow-visible"
      >
        {geo.page && (
          <>
            <path d={geo.page} fill="none" stroke="var(--color-halo)" strokeWidth="3" />
            <path
              d={geo.page}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth="1.25"
              strokeDasharray={dashed ? "4 3" : undefined}
            />
          </>
        )}
        <path
          d={geo.d}
          fill="none"
          stroke="var(--color-halo)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          key={redrawKey}
          ref={path}
          d={geo.d}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeDasharray={dashed ? "5 4" : undefined}
          className={dashed ? "ac-appear" : "ac-draw"}
          style={dashed ? undefined : { ["--len" as string]: len || 2000 }}
        />
        <rect
          x={geo.start.x - 3}
          y={geo.start.y - 3}
          width="6"
          height="6"
          fill="var(--color-ink)"
          stroke="var(--color-halo)"
          strokeWidth="1.5"
        />
        {geo.end.off && (
          <path
            d={arrow(geo.end.x, geo.end.y, geo.end.off)}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="2"
          />
        )}
      </svg>
      {label && geo.label && (
        <span
          ref={chip}
          aria-hidden
          className="pointer-events-none fixed z-20 -translate-y-1/2"
          style={{
            left: chipLeft ?? geo.label.x,
            top: geo.label.y,
            visibility: chipLeft === null ? "hidden" : undefined,
          }}
        >
          {label}
        </span>
      )}
    </>
  );
}

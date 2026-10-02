"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Geometry = {
  d: string;
  page: string | null;
  end: { x: number; y: number; off: "up" | "down" | null };
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
  pageEdge,
  dashed = false,
}: {
  from: string;
  to: string;
  fromBounds: string;
  belowOf: string;
  gutter: string;
  gutterOffset: number;
  minWidth: number;
  redrawKey: string;
  pageEdge: string;
  dashed?: boolean;
}) {
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [len, setLen] = useState(0);
  const path = useRef<SVGPathElement>(null);
  const frame = useRef(0);
  const last = useRef("");

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
      const sy = ar.top - 4;
      if (sy < fr.top + 4 || sy > fr.bottom - 4 || ar.right < fr.left || ar.left > fr.right) {
        return clear();
      }

      const gx = g.getBoundingClientRect().left + gutterOffset;
      const sx = Math.min(ar.right + 6, gx - 12);
      const upper = top.getBoundingClientRect().bottom + 8;
      const lower = window.innerHeight - 8;
      const raw = br.top + br.height / 2;
      const off = raw < upper ? "up" : raw > lower ? "down" : null;
      const ty = Math.min(Math.max(raw, upper), lower);
      const tx = br.left - 3;
      const figure = document.querySelector(pageEdge)?.getBoundingClientRect();
      const edge = figure ? Math.min(Math.max(figure.right, sx), gx) : sx;
      const d = off ? `M ${edge} ${sy} H ${gx} V ${ty}` : `M ${edge} ${sy} H ${gx} V ${ty} H ${tx}`;
      const page = edge > sx + 1 ? `M ${sx} ${sy} H ${edge}` : null;

      const signature = `${d}|${page}|${off}`;
      if (signature === last.current) return;
      last.current = signature;
      setGeo({ d, page, end: { x: off ? gx : tx, y: ty, off } });
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
  }, [from, to, fromBounds, belowOf, gutter, gutterOffset, minWidth, redrawKey, pageEdge]);

  useLayoutEffect(() => {
    if (path.current) setLen(Math.ceil(path.current.getTotalLength()));
  }, [redrawKey, geo?.d]);

  if (!geo) return null;

  const arrow = (x: number, y: number, dir: "up" | "down") =>
    dir === "up"
      ? `M ${x - 5} ${y + 6} L ${x} ${y} L ${x + 5} ${y + 6}`
      : `M ${x - 5} ${y - 6} L ${x} ${y} L ${x + 5} ${y - 6}`;

  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 h-full w-full overflow-visible"
    >
      {geo.page && (
        <path
          d={geo.page}
          fill="none"
          stroke="var(--color-ink)"
          strokeOpacity="0.7"
          strokeWidth="1"
          strokeDasharray={dashed ? "4 3" : undefined}
        />
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
      {geo.end.off && (
        <path
          d={arrow(geo.end.x, geo.end.y, geo.end.off)}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Translate } from "@/lib/i18n/t";
import { occurrenceTag } from "@/lib/report/occurrences";
import { cn } from "@/lib/cn";
import { GhostRing, Locus, Tag, type Box, type Sev } from "./notation";

export type PlacedMark = {
  findingId: string;
  n: number;
  sev: Sev;
  index: number;
  total: number;
  title: string;
  kind: string;
  box: Box;
};

export type PlacedStop = { n: number; box: Box; visible: boolean; label: string };

type Focusable = {
  key: string;
  findingId: string | null;
  index: number;
  stop: number | null;
  box: Box;
  label: string;
};

const NEIGHBOURS = 2;

const cornerTag: CSSProperties = { transform: "translate(calc(-50% - 5px), calc(-50% - 5px))" };

export function CaptureMarks({
  marks,
  selectedId,
  occIndex,
  hoveredId = null,
  layer,
  ring = false,
  stops = [],
  sequence = [],
  currentStop = null,
  anchorStop = null,
  wholePath = false,
  travel = false,
  interactive,
  onSelect,
  onSelectStop,
  onHover,
  t,
}: {
  marks: PlacedMark[];
  selectedId: string | null;
  occIndex: number;
  hoveredId?: string | null;
  layer: "findings" | "path" | "none";
  ring?: boolean;
  stops?: PlacedStop[];
  sequence?: number[];
  currentStop?: number | null;
  anchorStop?: number | null;
  wholePath?: boolean;
  travel?: boolean;
  interactive: boolean;
  onSelect?: (findingId: string, index: number) => void;
  onSelectStop?: (n: number) => void;
  onHover?: (findingId: string | null) => void;
  t: Translate;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const firstOf = new Map<string, PlacedMark>();
  for (const m of marks) {
    const seen = firstOf.get(m.findingId);
    if (!seen || m.index < seen.index) firstOf.set(m.findingId, m);
  }
  const selected = marks.filter((m) => m.findingId === selectedId);
  const current = selected.find((m) => m.index === occIndex) ?? null;
  const overview = selectedId === null;

  const order: Focusable[] = [];
  if (layer === "findings") {
    for (const m of firstOf.values()) {
      if (m.findingId === selectedId) continue;
      order.push({
        key: `${m.findingId}:${m.index}`,
        findingId: m.findingId,
        index: m.index,
        stop: null,
        box: m.box,
        label: t("marks.finding", { n: m.n, kind: m.kind, title: m.title }),
      });
    }
    for (const m of selected) {
      if (m.index === occIndex) continue;
      order.push({
        key: `${m.findingId}:${m.index}`,
        findingId: m.findingId,
        index: m.index,
        stop: null,
        box: m.box,
        label: t("marks.occurrence", { n: m.n, i: m.index + 1, total: m.total, title: m.title }),
      });
    }
  } else if (layer === "path") {
    for (const s of stops) {
      order.push({
        key: `stop:${s.n}`,
        findingId: null,
        index: 0,
        stop: s.n,
        box: s.box,
        label: s.visible
          ? t("marks.stopLabel", { n: s.n, label: s.label })
          : t("marks.stopNoFocus", { n: s.n, label: s.label }),
      });
    }
  }

  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    if (order.length === 0) return;
    const next = (i + order.length) % order.length;
    setActive(next);
    refs.current[next]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    if (e.key in step) {
      e.preventDefault();
      move(active + step[e.key]);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      move(order.length - 1);
    }
  };

  const position = new Map(sequence.map((n, i) => [n, i]));
  const at = currentStop === null ? -1 : (position.get(currentStop) ?? -1);
  const near = (n: number) => at >= 0 && Math.abs((position.get(n) ?? -99) - at) <= NEIGHBOURS;
  const point = (b: Box) => ({ x: (b.left / 100) * size.w, y: (b.top / 100) * size.h });
  const stopBox = new Map(stops.map((s) => [s.n, s]));
  const segments: { a: { x: number; y: number }; b: { x: number; y: number }; key: string }[] = [];
  for (let i = 1; i < sequence.length; i++) {
    const a = stopBox.get(sequence[i - 1]);
    const b = stopBox.get(sequence[i]);
    if (!a || !b || !near(a.n) || !near(b.n)) continue;
    segments.push({ a: point(a.box), b: point(b.box), key: `${a.n}-${b.n}` });
  }
  const whole = sequence
    .map((n) => stopBox.get(n))
    .filter((s): s is PlacedStop => Boolean(s))
    .map((s) => {
      const p = point(s.box);
      return `${p.x},${p.y}`;
    })
    .join(" ");
  const focusedStop = currentStop !== null ? stopBox.get(currentStop) : undefined;
  const hovered =
    !overview && hoveredId !== selectedId ? marks.filter((m) => m.findingId === hoveredId) : [];

  return (
    <div ref={root} className="pointer-events-none absolute inset-0">
      {layer === "findings" &&
        hovered.map((m) => <Locus key={`hover-${m.index}`} box={m.box} weight="sibling" />)}

      {layer === "findings" &&
        ring &&
        selected.map((m) => <GhostRing key={`ring-${m.index}`} box={m.box} />)}
      {layer === "findings" &&
        selected.map((m) =>
          m.index === occIndex ? null : (
            <Locus key={`sib-${m.index}`} box={m.box} weight="sibling" extra={ring ? 8 : 0} />
          ),
        )}
      {layer === "findings" && current && (
        <Locus
          key={`current-${current.findingId}`}
          box={current.box}
          weight="current"
          anchor="locus-current"
          extra={ring ? 8 : 0}
          className={cn("ac-acquire", travel && "ac-travel")}
        />
      )}

      {layer === "path" && size.w > 0 && (
        <>
          <svg aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
            {wholePath && (
              <polyline
                points={whole}
                fill="none"
                stroke="var(--color-path)"
                strokeOpacity="0.4"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
            )}
            {segments.map(({ a, b, key }) => {
              const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
              return (
                <g key={key}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="var(--color-halo)"
                    strokeWidth="4"
                  />
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="var(--color-path)"
                    strokeWidth="2"
                  />
                  <path
                    d="M -5 -5 L 1 0 L -5 5"
                    transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${angle})`}
                    fill="none"
                    stroke="var(--color-path)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </svg>
          {stops
            .filter((s) => !s.visible)
            .map((s) => (
              <GhostRing key={`ring-${s.n}`} box={s.box} />
            ))}
          {focusedStop && (
            <Locus
              key={`stop-${focusedStop.n}`}
              box={focusedStop.box}
              weight="current"
              extra={focusedStop.visible ? 0 : 8}
              anchor={focusedStop.n === anchorStop ? "locus-current" : undefined}
              className="ac-acquire"
            />
          )}
        </>
      )}

      <div
        role={interactive && order.length > 0 ? "group" : undefined}
        aria-label={interactive && order.length > 0 ? t("marks.group") : undefined}
        aria-hidden={interactive ? undefined : true}
        onKeyDown={interactive ? onKey : undefined}
      >
        {order.map((m, i) => {
          let tag;
          let style: CSSProperties;
          if (m.stop !== null) {
            const isNow = m.stop === currentStop;
            const p = point(m.box);
            tag = near(m.stop) ? (
              <Tag
                n={m.stop}
                sev="none"
                shape="circle"
                size={isNow ? 26 : 20}
                onPage
                selected={isNow}
              />
            ) : (
              <span
                aria-hidden
                className="block size-2.5 rounded-full border-2 border-path bg-surface"
                style={{ boxShadow: "0 0 0 1.5px var(--color-halo)" }}
              />
            );
            style = {
              left: p.x,
              top: p.y,
              transform: "translate(-50%, -50%)",
              zIndex: isNow ? 3 : 2,
            };
          } else {
            const mark = marks.find((x) => x.findingId === m.findingId && x.index === m.index)!;
            const mine = m.findingId === selectedId;
            const lit = overview || mine || m.findingId === hoveredId;
            tag = (
              <Tag
                n={mine ? occurrenceTag(mark.n, mark.index, mark.total) : mark.n}
                sev={mark.sev}
                size={lit ? 20 : 17}
                quiet={!lit}
                onPage
                selected={m.findingId === hoveredId && !mine}
              />
            );
            style = {
              left: `${m.box.left}%`,
              top: `${m.box.top}%`,
              ...cornerTag,
              zIndex: mine ? 3 : lit ? 2 : 1,
            };
          }

          if (!interactive) {
            return (
              <span key={m.key} className="absolute" style={style}>
                {tag}
              </span>
            );
          }
          return (
            <button
              key={m.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              tabIndex={i === (active < order.length ? active : 0) ? 0 : -1}
              aria-label={m.label}
              aria-pressed={m.stop !== null ? m.stop === currentStop : undefined}
              onFocus={() => {
                setActive(i);
                if (m.findingId) onHover?.(m.findingId);
              }}
              onBlur={() => onHover?.(null)}
              onMouseEnter={() => m.findingId && onHover?.(m.findingId)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => {
                if (m.stop !== null) onSelectStop?.(m.stop);
                else if (m.findingId) onSelect?.(m.findingId, m.index);
              }}
              className="pointer-events-auto absolute flex min-h-6 min-w-6 cursor-pointer items-center justify-center"
              style={style}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

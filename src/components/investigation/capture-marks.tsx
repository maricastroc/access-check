"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
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
const GAP = 3;
const SIBLING_TAGS = 4;
const MARGIN = 18;

type Rect = { x: number; y: number; w: number; h: number };

type TagItem = {
  key: string;
  focus: Focusable | null;
  node: ReactNode;
  size: number;
  text: string;
  shape: "square" | "circle";
  anchor: Rect;
  inset: number;
  yields: boolean;
  own?: Rect;
  z: number;
};

function tagSize(text: string, size: number, shape: "square" | "circle") {
  const font = size <= 18 ? 11.5 : size >= 26 ? 14 : 12.5;
  const w = Math.max(size, Math.ceil(text.length * font * 0.62 + (shape === "circle" ? 8 : 10)));
  return { w, h: size };
}

function clash(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP
  );
}

function placeTags(items: TagItem[], bounds: { w: number; h: number }) {
  const taken: Rect[] = [];
  const placed = new Map<string, Rect>();
  for (const item of items) {
    const { w, h } = tagSize(item.text, item.size, item.shape);
    const a = item.anchor;
    const i = item.inset;
    const candidates: Rect[] =
      item.shape === "circle"
        ? [
            { x: a.x - i - w, y: a.y - i - h, w, h },
            { x: a.x - i, y: a.y - i - h - 2, w, h },
            { x: a.x - i - w - 2, y: a.y - i, w, h },
            { x: a.x - i - w, y: a.y + a.h + i, w, h },
            { x: a.x - w / 2, y: a.y - h / 2, w, h },
          ]
        : [
            { x: a.x - i, y: a.y - i - h - 2, w, h },
            { x: a.x - i, y: a.y + a.h + i + 2, w, h },
            { x: a.x - i - w - 2, y: a.y - i, w, h },
            ...(item.yields
              ? []
              : [1, -1, 2, -2, 3].map((k) => ({
                  x: a.x - i + k * (w + GAP),
                  y: a.y - i - h - 2,
                  w,
                  h,
                }))),
          ];
    const fits = (r: Rect) =>
      r.y >= -MARGIN &&
      r.y + r.h <= bounds.h + MARGIN &&
      r.x >= -MARGIN &&
      r.x + r.w <= bounds.w + i;
    const free = candidates.find((r) => fits(r) && !taken.some((o) => clash(r, o)));
    const chosen = free ?? (item.yields ? null : (candidates.find(fits) ?? candidates[0]));
    if (!chosen) continue;
    const r = { ...chosen, x: Math.min(Math.max(chosen.x, -MARGIN), bounds.w + i - chosen.w) };
    taken.push(r);
    if (item.own) taken.push(item.own);
    placed.set(item.key, r);
  }
  return placed;
}

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

  const position = new Map(sequence.map((n, i) => [n, i]));
  const at = currentStop === null ? -1 : (position.get(currentStop) ?? -1);
  const near = (n: number) => at >= 0 && Math.abs((position.get(n) ?? -99) - at) <= NEIGHBOURS;
  const point = (b: Box) => ({ x: (b.left / 100) * size.w, y: (b.top / 100) * size.h });
  const stopBox = new Map(stops.map((s) => [s.n, s]));

  const focusedStop = currentStop !== null ? stopBox.get(currentStop) : undefined;
  const hovered =
    !overview && hoveredId !== selectedId ? marks.filter((m) => m.findingId === hoveredId) : [];

  const px = (box: Box): Rect => ({
    x: (box.left / 100) * size.w,
    y: (box.top / 100) * size.h,
    w: (box.width / 100) * size.w,
    h: (box.height / 100) * size.h,
  });
  const ringGap = ring ? 6 : 0;
  const items: TagItem[] = [];
  const selectedTotal = current?.total ?? selected[0]?.total ?? 0;
  const beside = new Set([
    (occIndex + 1) % Math.max(selectedTotal, 1),
    (occIndex - 1 + selectedTotal) % Math.max(selectedTotal, 1),
  ]);

  if (layer === "findings") {
    if (current) {
      const r = px(current.box);
      const inset = 5 + ringGap;
      const text = occurrenceTag(current.n, current.index, current.total);
      items.push({
        key: `current:${current.findingId}`,
        focus: null,
        node: <Tag n={text} sev={current.sev} size={20} onPage selected />,
        size: 20,
        text,
        shape: "square",
        anchor: r,
        inset,
        yields: false,
        own: { x: r.x - inset, y: r.y - inset, w: r.w + inset * 2, h: r.h + inset * 2 },
        z: 4,
      });
    }
    const siblings = selected
      .filter((m) => m.index !== occIndex)
      .sort((x, y) => Math.abs(x.index - occIndex) - Math.abs(y.index - occIndex));
    for (const m of siblings) {
      if (siblings.length > SIBLING_TAGS && !beside.has(m.index)) continue;
      const text = occurrenceTag(m.n, m.index, m.total);
      items.push({
        key: `${m.findingId}:${m.index}`,
        focus: {
          key: `${m.findingId}:${m.index}`,
          findingId: m.findingId,
          index: m.index,
          stop: null,
          box: m.box,
          label: t("marks.occurrence", { n: m.n, i: m.index + 1, total: m.total, title: m.title }),
        },
        node: <Tag n={text} sev={m.sev} size={17} quiet onPage />,
        size: 17,
        text,
        shape: "square",
        anchor: px(m.box),
        inset: 4 + ringGap,
        yields: true,
        z: 3,
      });
    }
    for (const m of [...firstOf.values()].sort((x, y) => x.n - y.n)) {
      if (m.findingId === selectedId) continue;
      const lit = overview || m.findingId === hoveredId;
      items.push({
        key: `${m.findingId}:${m.index}`,
        focus: {
          key: `${m.findingId}:${m.index}`,
          findingId: m.findingId,
          index: m.index,
          stop: null,
          box: m.box,
          label: t("marks.finding", { n: m.n, kind: m.kind, title: m.title }),
        },
        node: (
          <Tag
            n={m.n}
            sev={m.sev}
            size={lit ? 20 : 17}
            quiet={!lit}
            onPage
            selected={m.findingId === hoveredId && !overview}
          />
        ),
        size: lit ? 20 : 17,
        text: String(m.n),
        shape: "square",
        anchor: px(m.box),
        inset: 4,
        yields: !overview,
        z: lit ? 2 : 1,
      });
    }
  } else if (layer === "path") {
    const shown = stops
      .filter((s) => wholePath || currentStop === null || near(s.n) || s.n === currentStop)
      .sort(
        (x, y) =>
          Number(y.n === currentStop) - Number(x.n === currentStop) ||
          Math.abs((position.get(x.n) ?? 0) - at) - Math.abs((position.get(y.n) ?? 0) - at),
      );
    for (const s of shown) {
      const isNow = s.n === currentStop;
      const close = near(s.n) || isNow;
      const p = px(s.box);
      items.push({
        key: `stop:${s.n}`,
        focus: {
          key: `stop:${s.n}`,
          findingId: null,
          index: 0,
          stop: s.n,
          box: s.box,
          label: s.visible
            ? t("marks.stopLabel", { n: s.n, label: s.label })
            : t("marks.stopNoFocus", { n: s.n, label: s.label }),
        },
        node: close ? (
          <Tag n={s.n} sev="none" shape="circle" size={isNow ? 26 : 20} onPage selected={isNow} />
        ) : (
          <span
            aria-hidden
            data-sev={s.visible ? undefined : "serious"}
            className={cn(
              "block size-2.5 rounded-full border-2 bg-surface",
              s.visible ? "border-path" : "border-(--sev-ink)",
            )}
            style={{ boxShadow: "0 0 0 1.5px var(--color-halo)" }}
          />
        ),
        size: close ? (isNow ? 26 : 20) : 10,
        text: close ? String(s.n) : "",
        shape: "circle",
        anchor: close ? p : { x: p.x, y: p.y, w: 0, h: 0 },
        inset: close ? (isNow ? 5 : 2) + (s.visible ? 0 : 6) : 0,
        yields: !close,
        own: isNow
          ? {
              x: p.x - 5 - (s.visible ? 0 : 6),
              y: p.y - 5 - (s.visible ? 0 : 6),
              w: p.w + 10 + (s.visible ? 0 : 12),
              h: p.h + 10 + (s.visible ? 0 : 12),
            }
          : undefined,
        z: isNow ? 4 : close ? 3 : 1,
      });
    }
  }

  const spots = size.w > 0 ? placeTags(items, size) : new Map<string, Rect>();
  const visible = items.filter((item) => spots.has(item.key));
  const centre = (n: number, box: Box) => {
    const spot = spots.get(`stop:${n}`);
    return spot ? { x: spot.x + spot.w / 2, y: spot.y + spot.h / 2 } : point(box);
  };
  const whole = sequence
    .map((n) => stopBox.get(n))
    .filter((s): s is PlacedStop => Boolean(s))
    .map((s) => {
      const p = centre(s.n, s.box);
      return `${p.x},${p.y}`;
    })
    .join(" ");
  const segments: { a: { x: number; y: number }; b: { x: number; y: number }; key: string }[] = [];
  for (let i = 1; i < sequence.length; i++) {
    const a = stopBox.get(sequence[i - 1]);
    const b = stopBox.get(sequence[i]);
    if (!a || !b || !near(a.n) || !near(b.n)) continue;
    segments.push({ a: centre(a.n, a.box), b: centre(b.n, b.box), key: `${a.n}-${b.n}` });
  }

  const order = visible
    .filter((item): item is TagItem & { focus: Focusable } => item.focus !== null)
    .map((item) => item.focus);

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

  return (
    <div ref={root} className="pointer-events-none absolute inset-0">
      {layer === "findings" &&
        hovered.map((m) => <Locus key={`hover-${m.index}`} box={m.box} weight="sibling" />)}

      {layer === "findings" &&
        ring &&
        selected
          .filter((m) => m.index === occIndex || beside.has(m.index))
          .map((m) => <GhostRing key={`ring-${m.index}`} box={m.box} />)}
      {layer === "findings" &&
        selected.map((m) =>
          m.index === occIndex ? null : (
            <Locus key={`sib-${m.index}`} box={m.box} weight="sibling" extra={ringGap} />
          ),
        )}
      {layer === "findings" && current && (
        <Locus
          key={`current-${current.findingId}`}
          box={current.box}
          weight="current"
          anchor="locus-current"
          extra={ringGap}
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
            .filter((s) => !s.visible && (s.n === currentStop || near(s.n)))
            .map((s) => (
              <GhostRing key={`ring-${s.n}`} box={s.box} />
            ))}
          {focusedStop && (
            <Locus
              key={`stop-${focusedStop.n}`}
              box={focusedStop.box}
              weight="current"
              extra={focusedStop.visible ? 0 : 6}
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
        {visible.map((item) => {
          const r = spots.get(item.key)!;
          const style = {
            left: r.x + r.w / 2,
            top: r.y + r.h / 2,
            transform: "translate(-50%, -50%)",
            zIndex: item.z,
          };
          const m = item.focus;
          if (!interactive || !m) {
            return (
              <span key={item.key} aria-hidden className="absolute flex" style={style}>
                {item.node}
              </span>
            );
          }
          const i = order.indexOf(m);
          return (
            <button
              key={item.key}
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
              {item.node}
            </button>
          );
        })}
      </div>
    </div>
  );
}

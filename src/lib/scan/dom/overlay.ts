import { PALETTE, withAlpha } from "../../palette";

export type OverlayTone =
  | "critical"
  | "serious"
  | "moderate"
  | "minor"
  | "review"
  | "none"
  | "path";

export type OverlayMark = {
  n: number;
  selector: string;
  tag: string;
  tone: OverlayTone;
  shape?: "square" | "circle";
  quiet?: boolean;
  ring?: boolean;
  label?: string;
  pick?: string;
  alternates?: { selector: string; pick?: string }[];
  alert?: OverlayTone;
  badge?: { tag: string; tone: OverlayTone; pick?: string };
};

export type OverlayOptions = { scroll?: boolean; timeoutMs?: number; path?: boolean };

export type OverlaySide = "above" | "below" | "left" | "right";

export type OverlayReport = {
  drawn: number;
  missing: number[];
  offScreen: number[];
  focused: {
    found: boolean;
    onScreen: boolean;
    side: OverlaySide | null;
    hidden: boolean;
  } | null;
  movedScroll: boolean;
};

export const OVERLAY_PICK = "overlay:pick";
export const OVERLAY_VIEW = "overlay:view";

const ROOT_ID = "accesscheck-overlay";
const SVG = "http://www.w3.org/2000/svg";

const INK = PALETTE.ink;
const INK_2 = PALETTE["ink-2"];
const SHADE = withAlpha(PALETTE.ink, 0.42);
const HALO = "rgba(255,255,255,.94)";

const TONE: Record<OverlayTone, string> = {
  critical: PALETTE.critical,
  serious: PALETTE.serious,
  moderate: PALETTE.moderate,
  minor: INK_2,
  review: PALETTE.review,
  none: INK_2,
  path: PALETTE.path,
};

const FILLED = new Set<OverlayTone>(["critical", "serious", "moderate", "path"]);

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; }
.layer { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; overflow: visible; pointer-events: none; }
.locus { position: fixed; pointer-events: none; }
.corners {
  position: absolute; pointer-events: none;
  background:
    linear-gradient(var(--ink), var(--ink)) top left / var(--arm) var(--bar),
    linear-gradient(var(--ink), var(--ink)) top left / var(--bar) var(--arm),
    linear-gradient(var(--ink), var(--ink)) top right / var(--arm) var(--bar),
    linear-gradient(var(--ink), var(--ink)) top right / var(--bar) var(--arm),
    linear-gradient(var(--ink), var(--ink)) bottom left / var(--arm) var(--bar),
    linear-gradient(var(--ink), var(--ink)) bottom left / var(--bar) var(--arm),
    linear-gradient(var(--ink), var(--ink)) bottom right / var(--arm) var(--bar),
    linear-gradient(var(--ink), var(--ink)) bottom right / var(--bar) var(--arm);
  background-repeat: no-repeat;
}
.ring { position: fixed; pointer-events: none; }
.ring-hatch {
  position: absolute; inset: -4px; padding: 4px;
  background: repeating-linear-gradient(135deg, ${withAlpha(PALETTE.serious, 0.34)} 0 1px, transparent 1px 4px);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
}
.ring-line { position: absolute; inset: -4px; border: 1.5px dashed ${TONE.serious}; outline: 1px solid ${HALO}; }
.tag {
  position: fixed; display: inline-flex; align-items: center; justify-content: center;
  height: 20px; min-width: 20px; padding: 0 5px; margin: 0; border: 0;
  font: 600 12.5px/1 "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums; letter-spacing: 0; white-space: nowrap;
  color: #fff; background: var(--tone);
  box-shadow: 0 0 0 1.5px ${HALO}, 0 0 0 2.5px ${SHADE};
  pointer-events: none; user-select: none; -webkit-user-select: none;
}
.tag.circle { border-radius: 999px; padding: 0 4px; }
.tag[data-alert]::before {
  content: ""; position: absolute; inset: -6px; padding: 3px; border-radius: inherit; pointer-events: none;
  background: repeating-linear-gradient(-45deg, var(--alert) 0 1.5px, ${HALO} 1.5px 3.5px);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
}
.tag.outline { background: #fff; color: ${INK}; border: 1.5px solid ${INK_2}; }
.tag.review { background: #fff; color: var(--tone); border: 1.5px dashed var(--tone); }
.tag.quiet { background: #fff; color: ${INK_2}; border: 1px solid ${INK_2}; height: 18px; min-width: 18px; font-size: 11.5px; }
.tag.circle.quiet { color: var(--tone); border: 1.5px solid var(--tone); }
.tag.current {
  height: 22px; min-width: 22px; font-size: 13px;
  box-shadow: 0 0 0 1.5px ${HALO}, 0 0 0 2.5px ${SHADE}, 0 0 0 4px #fff, 0 0 0 6px ${INK};
}
.tag[data-pick] { pointer-events: auto; cursor: pointer; }
.tag[data-pick]:hover { box-shadow: 0 0 0 1.5px ${HALO}, 0 0 0 2px #fff, 0 0 0 4px ${INK}; }
.edge {
  position: fixed; display: inline-flex; align-items: center; gap: 6px;
  height: 26px; padding: 0 8px; margin: 0; border: 0;
  font: 600 12.5px/1 "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums; white-space: nowrap;
  color: #fff; background: ${INK};
  box-shadow: 0 0 0 1.5px ${HALO};
  pointer-events: auto; cursor: pointer; user-select: none; -webkit-user-select: none;
}
.edge[data-side="above"] { top: 10px; right: 14px; }
.edge[data-side="below"] { bottom: 10px; right: 14px; }
.edge[data-side="left"] { left: 10px; transform: translateY(-50%); }
.edge[data-side="right"] { right: 10px; transform: translateY(-50%); }
@media (forced-colors: active) {
  .corners { --ink: CanvasText !important; }
  .tag, .edge { forced-color-adjust: none; }
}
`;

const LOCUS = {
  current: { inset: 5, arm: "min(13px, 42%)", bar: 2.5, halo: 3 },
  sibling: { inset: 4, arm: "min(8px, 40%)", bar: 1.5, halo: 2 },
} as const;

const RING = 6;
const SIBLING_TAGS = 4;
const NUDGES = 4;

type Rect = { x: number; y: number; w: number; h: number };

type Choice = { el: Element; pick: string | undefined };

type Painted = {
  mark: OverlayMark;
  el: Element;
  choices: Choice[];
  roaming: boolean;
  current: boolean;
  locus: HTMLElement;
  tag: HTMLElement;
  badge: HTMLElement | null;
  ring: HTMLElement | null;
  visible: boolean;
  rect: DOMRect;
  spot: Rect | null;
};

let painted: Painted[] = [];
let lines: SVGSVGElement | null = null;
let edge: HTMLElement | null = null;
let drawPath = false;
let onMove: (() => void) | null = null;
let watcher: MutationObserver | null = null;
let viewTotal: number | null = null;
let lastShown = -1;
let frame = 0;
let timer = 0;
let sessionScroll: { x: number; y: number } | null = null;

function calm(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function css(el: Element, props: Record<string, string>): void {
  const style = (el as HTMLElement).style;
  for (const [prop, value] of Object.entries(props)) style.setProperty(prop, value);
}

function post(message: { type: string } & Record<string, unknown>): void {
  const runtime = (
    globalThis as {
      chrome?: { runtime?: { id?: string; sendMessage?: (message: unknown) => unknown } };
    }
  ).chrome?.runtime;
  if (!runtime?.id || !runtime.sendMessage) return;
  try {
    void Promise.resolve(runtime.sendMessage(message)).catch(() => {});
  } catch {
    return;
  }
}

function tell(key: string): void {
  post({ type: OVERLAY_PICK, key });
}

function reportView(): void {
  if (viewTotal === null) return;
  const shown = painted.filter((p) => p.visible).length;
  if (shown === lastShown) return;
  lastShown = shown;
  post({ type: OVERLAY_VIEW, shown, total: viewTotal });
}

function swallow(el: HTMLElement, act: () => void): void {
  for (const type of ["pointerdown", "mousedown"]) {
    el.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }
  for (const type of ["pointerup", "mouseup"]) {
    el.addEventListener(type, (e) => e.stopPropagation());
  }
  el.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.isTrusted) act();
  });
}

function corners(cfg: (typeof LOCUS)[keyof typeof LOCUS], halo: boolean): HTMLElement {
  const el = document.createElement("span");
  el.className = "corners";
  const inset = halo ? cfg.inset + cfg.halo / 2 : cfg.inset;
  css(el, {
    "--ink": halo ? HALO : INK,
    "--arm": halo ? `calc(${cfg.arm} + ${cfg.halo}px)` : cfg.arm,
    "--bar": `${halo ? cfg.bar + cfg.halo : cfg.bar}px`,
    inset: `${-inset}px`,
  });
  return el;
}

function locusFor(mark: OverlayMark, current: boolean): HTMLElement {
  const cfg = current ? LOCUS.current : LOCUS.sibling;
  const el = document.createElement("div");
  el.className = "locus";
  el.dataset.mark = String(mark.n);
  el.dataset.tag = mark.tag;
  el.dataset.tone = mark.tone;
  el.dataset.current = String(current);
  if (mark.ring) el.dataset.ring = "true";
  const extra = mark.ring ? RING : 0;
  const halo = corners(cfg, true);
  const ink = corners(cfg, false);
  if (extra) {
    css(halo, { inset: `${-(cfg.inset + cfg.halo / 2 + extra)}px` });
    css(ink, { inset: `${-(cfg.inset + extra)}px` });
  }
  el.append(halo, ink);
  if (!current) css(el, { opacity: mark.quiet ? "0.8" : "1" });
  return el;
}

function tagFor(mark: OverlayMark, current: boolean): HTMLElement {
  const el = document.createElement("span");
  const circle = mark.shape === "circle";
  const quiet = !current && mark.quiet === true;
  const classes = ["tag"];
  if (circle) classes.push("circle");
  if (current) classes.push("current");
  if (quiet) classes.push("quiet");
  else if (!circle && mark.tone === "review") classes.push("review");
  else if (!FILLED.has(mark.tone)) classes.push("outline");
  el.className = classes.join(" ");
  el.textContent = mark.tag;
  css(el, { "--tone": TONE[mark.tone] });
  if (mark.alert) {
    el.dataset.alert = mark.alert;
    css(el, { "--alert": TONE[mark.alert] });
  }
  if (mark.label) el.title = mark.label;
  if (mark.pick) {
    el.dataset.pick = mark.pick;
    swallow(el, () => {
      if (el.dataset.pick) tell(el.dataset.pick);
    });
  }
  return el;
}

function badgeFor(mark: OverlayMark): HTMLElement | null {
  if (!mark.badge) return null;
  const { tag, tone, pick } = mark.badge;
  const el = tagFor({ n: mark.n, selector: mark.selector, tag, tone, pick }, false);
  el.classList.add("badge");
  el.dataset.for = String(mark.n);
  return el;
}

function placeBadge(badge: HTMLElement, beside: Rect, taken: Rect[]): void {
  badge.style.setProperty("display", "inline-flex");
  const w = badge.offsetWidth || 28;
  const h = badge.offsetHeight || 20;
  const y = beside.y + (beside.h - h) / 2;
  const sides: Rect[] = [
    { x: beside.x + beside.w + 3, y, w, h },
    { x: beside.x - w - 3, y, w, h },
    { x: beside.x, y: beside.y - h - 3, w, h },
    { x: beside.x, y: beside.y + beside.h + 3, w, h },
  ];
  const fits = (c: Rect) =>
    c.x >= 2 && c.x + c.w <= innerWidth - 2 && c.y >= 2 && c.y + c.h <= innerHeight - 2;
  const spot = sides.find((c) => fits(c) && !taken.some((o) => clash(c, o))) ?? sides[0];
  taken.push(spot);
  css(badge, { left: `${spot.x}px`, top: `${spot.y}px` });
}

function ringFor(): HTMLElement {
  const el = document.createElement("div");
  el.className = "ring";
  const hatch = document.createElement("span");
  hatch.className = "ring-hatch";
  const line = document.createElement("span");
  line.className = "ring-line";
  el.append(hatch, line);
  return el;
}

function seen(r: DOMRect): boolean {
  return (
    r.width > 0 &&
    r.height > 0 &&
    r.bottom > 0 &&
    r.right > 0 &&
    r.top < innerHeight &&
    r.left < innerWidth
  );
}

function rendered(el: Element, r: DOMRect): boolean {
  if (r.width === 0 || r.height === 0) return false;
  return el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true;
}

function clipped(el: Element, r: DOMRect): boolean {
  if (getComputedStyle(el).position === "fixed") return false;
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const cs = getComputedStyle(node);
    const clipsX = cs.overflowX !== "visible";
    const clipsY = cs.overflowY !== "visible";
    if (clipsX || clipsY) {
      const box = node.getBoundingClientRect();
      if (clipsX && (r.right <= box.left || r.left >= box.right)) return true;
      if (clipsY && (r.bottom <= box.top || r.top >= box.bottom)) return true;
    }
    if (cs.position === "fixed") return false;
  }
  return false;
}

function shows(el: Element, r: DOMRect): boolean {
  return seen(r) && rendered(el, r) && !clipped(el, r);
}

function sideOf(r: DOMRect): OverlaySide | null {
  if (r.width === 0 && r.height === 0) return null;
  if (r.bottom <= 0) return "above";
  if (r.top >= innerHeight) return "below";
  if (r.right <= 0) return "left";
  if (r.left >= innerWidth) return "right";
  return null;
}

function svg<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function anchorOf(p: Painted): { x: number; y: number } {
  if (p.spot) return { x: p.spot.x + p.spot.w / 2, y: p.spot.y + p.spot.h / 2 };
  return { x: p.rect.left, y: p.rect.top };
}

function drawPathLines(layer: SVGSVGElement, current: Painted | null): void {
  const byN = new Map(painted.filter((p) => p.visible).map((p) => [p.mark.n, p]));
  for (const p of painted) {
    const next = byN.get(p.mark.n + 1);
    if (!p.visible || !next) continue;
    const a = anchorOf(p);
    const b = anchorOf(next);
    const near = current !== null && (p === current || next === current);
    const g = svg("g", { opacity: near ? 1 : 0.7 });
    g.append(
      svg("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: HALO, "stroke-width": 4 }),
      svg("line", {
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        stroke: TONE.path,
        "stroke-width": near ? 2 : 1.5,
      }),
    );
    if (Math.hypot(b.x - a.x, b.y - a.y) > 28) {
      const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      g.append(
        svg("path", {
          d: "M -5 -5 L 1 0 L -5 5",
          transform: `translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${angle})`,
          fill: "none",
          stroke: TONE.path,
          "stroke-width": 2,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        }),
      );
    }
    layer.append(g);
  }
}

const ARROW: Record<OverlaySide, string> = { above: "↑", below: "↓", left: "←", right: "→" };

function placeEdge(current: Painted | null): void {
  if (!edge) return;
  const hide = () => edge?.style.setProperty("display", "none");
  if (!current) return hide();

  if (!current.visible) {
    const side = sideOf(current.rect);
    if (!side) return hide();
    edge.dataset.side = side;
    edge.textContent = `${ARROW[side]} ${current.mark.tag}`;
    edge.style.setProperty("display", "inline-flex");
    if (side === "left" || side === "right") css(edge, { top: `${innerHeight / 2}px` });
    else edge.style.removeProperty("top");
    return;
  }

  hide();
}

function clash(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w + 3 && b.x < a.x + a.w + 3 && a.y < b.y + b.h + 3 && b.y < a.y + a.h + 3;
}

function nearestFree(c: Rect, taken: Rect[]): Rect {
  for (let step = 1; step <= NUDGES; step++) {
    for (const dir of [1, -1]) {
      const spot = { ...c, x: c.x + dir * step * (c.w + 3) };
      const inside = spot.x >= 2 && spot.x + spot.w <= innerWidth - 2;
      if (inside && !taken.some((o) => clash(spot, o))) return spot;
    }
  }
  return c;
}

function placeTags(): void {
  for (const p of painted) p.spot = null;
  const current = painted.find((p) => p.current && p.visible) ?? null;
  const taken: Rect[] = [];
  const tags: Rect[] = [];
  const siblings = painted.filter((p) => p.visible && !p.current && p.mark.quiet);
  const last = Math.max(0, ...painted.map((p) => p.mark.n));
  const beside = current
    ? new Set([current.mark.n - 1 || last, current.mark.n === last ? 1 : current.mark.n + 1])
    : new Set<number>();
  const order = painted
    .filter((p) => p.visible)
    .sort(
      (a, b) =>
        Number(b.current) - Number(a.current) ||
        Number(Boolean(a.mark.quiet)) - Number(Boolean(b.mark.quiet)) ||
        Math.abs(a.mark.n - (current?.mark.n ?? 0)) - Math.abs(b.mark.n - (current?.mark.n ?? 0)),
    );
  for (const p of order) {
    const circle = p.mark.shape === "circle";
    const sibling = !p.current && !circle && Boolean(p.mark.quiet);
    if (sibling && siblings.length > SIBLING_TAGS && !beside.has(p.mark.n)) {
      p.tag.style.setProperty("display", "none");
      continue;
    }
    const w = p.tag.offsetWidth || 22;
    const h = p.tag.offsetHeight || 20;
    const r = p.rect;
    const inset =
      (circle && !p.current ? 2 : p.current ? LOCUS.current.inset : LOCUS.sibling.inset) +
      (p.mark.ring ? RING : 0);
    const candidates: Rect[] = circle
      ? [
          { x: r.left - inset - w, y: r.top - inset - h, w, h },
          { x: r.left - inset, y: r.top - inset - h - 2, w, h },
          { x: r.left - inset - w - 2, y: r.top - inset, w, h },
          { x: r.left - inset - w, y: r.bottom + inset, w, h },
          { x: r.left - w / 2, y: r.top - h / 2, w, h },
        ]
      : [
          { x: r.left - inset, y: r.top - inset - h - 2, w, h },
          { x: r.left - inset, y: r.bottom + inset + 2, w, h },
          { x: r.left - inset - w - 2, y: r.top - inset, w, h },
        ];
    const fits = (c: Rect) =>
      c.y >= 0 && c.y + c.h <= innerHeight && c.x + c.w > 0 && c.x < innerWidth;
    const free = candidates.find((c) => fits(c) && !taken.some((o) => clash(c, o)));
    const chosen =
      free ?? (sibling ? null : nearestFree(candidates.find(fits) ?? candidates[0], taken));
    if (!chosen) {
      p.tag.style.setProperty("display", "none");
      continue;
    }
    const x = Math.min(Math.max(chosen.x, 2), innerWidth - w - 2);
    const y = Math.min(Math.max(chosen.y, 2), innerHeight - h - 2);
    p.spot = { x, y, w, h };
    taken.push({ x, y, w, h });
    tags.push({ x, y, w, h });
    if (p.current) {
      const box = circle ? (p.mark.ring ? RING : 0) + LOCUS.current.inset : inset;
      taken.push({
        x: r.left - box,
        y: r.top - box,
        w: r.width + box * 2,
        h: r.height + box * 2,
      });
    }
    css(p.tag, { left: `${x}px`, top: `${y}px` });
  }
  for (const p of order) {
    if (p.badge && p.spot) placeBadge(p.badge, p.spot, tags);
  }
}

function place(): void {
  frame = 0;
  for (const p of painted) {
    if (p.roaming) {
      const shown =
        p.choices.find((c) => shows(c.el, c.el.getBoundingClientRect())) ?? p.choices[0];
      p.el = shown.el;
      if (shown.pick) p.tag.dataset.pick = shown.pick;
    }
    const r = p.el.getBoundingClientRect();
    p.rect = r;
    p.visible = p.roaming
      ? shows(p.el, r)
      : seen(r) && (p.mark.shape === "circle" || !clipped(p.el, r));
    const show = p.visible ? "block" : "none";
    p.locus.style.setProperty("display", show);
    p.tag.style.setProperty("display", p.visible ? "inline-flex" : "none");
    p.badge?.style.setProperty("display", "none");
    if (p.ring) p.ring.style.setProperty("display", show);
    if (!p.visible) continue;
    const box = {
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    };
    css(p.locus, box);
    if (p.ring) css(p.ring, box);
  }
  placeTags();
  reportView();
  if (!lines) return;
  lines.replaceChildren();
  const current = painted.find((p) => p.current) ?? null;
  if (drawPath) drawPathLines(lines, current);
  placeEdge(current);
}

function schedule(): void {
  if (!frame) frame = requestAnimationFrame(place);
}

export function overlayRestoreScroll(): boolean {
  if (!sessionScroll) return false;
  const moved = window.scrollX !== sessionScroll.x || window.scrollY !== sessionScroll.y;
  window.scrollTo({ left: sessionScroll.x, top: sessionScroll.y, behavior: "instant" });
  return moved;
}

export function overlayClear(): void {
  if (timer) {
    clearTimeout(timer);
    timer = 0;
  }
  if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  sessionScroll = null;
  if (onMove) {
    removeEventListener("scroll", onMove, true);
    removeEventListener("resize", onMove);
    onMove = null;
  }
  watcher?.disconnect();
  watcher = null;
  viewTotal = null;
  lastShown = -1;
  painted = [];
  lines = null;
  edge = null;
  drawPath = false;
  document.getElementById(ROOT_ID)?.remove();
}

function host(): { root: HTMLElement; shadow: ShadowRoot } {
  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("data-accesscheck", "overlay");
  for (const [prop, value] of [
    ["display", "block"],
    ["visibility", "visible"],
    ["opacity", "1"],
    ["position", "fixed"],
    ["left", "0"],
    ["top", "0"],
    ["width", "0"],
    ["height", "0"],
    ["margin", "0"],
    ["padding", "0"],
    ["border", "0"],
    ["pointer-events", "none"],
    ["z-index", "2147483647"],
  ]) {
    root.style.setProperty(prop, value, "important");
  }
  const shadow = root.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = STYLE;
  shadow.append(style);
  return { root, shadow };
}

function find(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

export function overlayShow(
  marks: OverlayMark[],
  focus: number | null,
  opts: OverlayOptions = {},
): OverlayReport {
  const carried = drawPath && opts.path === true ? sessionScroll : null;
  overlayClear();
  sessionScroll = carried ?? { x: window.scrollX, y: window.scrollY };
  drawPath = opts.path === true;
  viewTotal = focus === null ? marks.length : null;

  const { root, shadow } = host();
  const missing: number[] = [];
  let found: Element | null = null;

  lines = svg("svg", { class: "layer" });
  const marksLayer = document.createElement("div");
  const badgesLayer = document.createElement("div");
  const tagsLayer = document.createElement("div");

  const ordered = [...marks].sort(
    (a, b) => Number(a.n === focus) - Number(b.n === focus) || Number(!a.quiet) - Number(!b.quiet),
  );

  for (const mark of ordered) {
    const choices = [{ selector: mark.selector, pick: mark.pick }, ...(mark.alternates ?? [])]
      .map(({ selector, pick }) => ({ el: find(selector), pick }))
      .filter((c): c is Choice => c.el !== null);
    const el = choices[0]?.el;
    if (!el) {
      missing.push(mark.n);
      continue;
    }
    const current = focus !== null && mark.n === focus;
    if (current) found = el;
    const ring = mark.ring ? ringFor() : null;
    const locus = locusFor(mark, current);
    if (mark.shape === "circle" && !current) locus.style.setProperty("visibility", "hidden");
    const tag = tagFor(mark, current);
    tag.dataset.for = String(mark.n);
    if (ring) {
      ring.dataset.for = String(mark.n);
      marksLayer.append(ring);
    }
    marksLayer.append(locus);
    tagsLayer.append(tag);
    const badge = badgeFor(mark);
    if (badge) badgesLayer.append(badge);
    painted.push({
      mark,
      el,
      choices,
      roaming: mark.alternates !== undefined,
      current,
      locus,
      tag,
      badge,
      ring,
      visible: false,
      rect: el.getBoundingClientRect(),
      spot: null,
    });
  }

  painted.sort((a, b) => a.mark.n - b.mark.n);

  if (painted.length === 0) {
    return {
      drawn: 0,
      missing,
      offScreen: [],
      movedScroll: false,
      focused: focus === null ? null : { found: false, onScreen: false, side: null, hidden: false },
    };
  }

  const current = painted.find((p) => p.current) ?? null;
  if (current) {
    edge = document.createElement("span");
    edge.className = "edge";
    edge.dataset.edge = "true";
    edge.style.setProperty("display", "none");
    const target = current.el;
    swallow(edge, () =>
      target.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: calm() ? "instant" : "smooth",
      }),
    );
  }

  shadow.append(lines, marksLayer, badgesLayer, tagsLayer);
  if (edge) shadow.append(edge);
  document.documentElement.appendChild(root);

  if (opts.scroll && found) {
    const r = found.getBoundingClientRect();
    const visible = r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    if (!visible || clipped(found, r)) {
      found.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    }
  }

  place();
  onMove = schedule;
  addEventListener("scroll", onMove, { passive: true, capture: true });
  addEventListener("resize", onMove, { passive: true });
  watcher = new MutationObserver(schedule);
  watcher.observe(document.documentElement, { subtree: true, childList: true, attributes: true });

  if (current && current.visible && !calm()) {
    current.locus.animate(
      [
        { transform: "scale(1.12)", opacity: 0.2 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 180, easing: "cubic-bezier(.2,.7,.2,1)" },
    );
  }

  if (opts.timeoutMs && opts.timeoutMs > 0) {
    timer = setTimeout(overlayClear, opts.timeoutMs) as unknown as number;
  }

  const offScreen = painted.filter((p) => !p.visible).map((p) => p.mark.n);

  return {
    drawn: painted.length,
    missing,
    offScreen,
    movedScroll:
      sessionScroll !== null &&
      (window.scrollX !== sessionScroll.x || window.scrollY !== sessionScroll.y),
    focused:
      focus === null
        ? null
        : {
            found: found !== null,
            onScreen: current !== null && current.visible,
            side: current && !current.visible ? sideOf(current.rect) : null,
            hidden:
              current !== null &&
              (!rendered(current.el, current.rect) || clipped(current.el, current.rect)),
          },
  };
}

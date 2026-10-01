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
};

export type OverlayOptions = { scroll?: boolean; timeoutMs?: number; path?: boolean };

export type OverlaySide = "above" | "below" | "left" | "right";

export type OverlayReport = {
  drawn: number;
  missing: number[];
  offScreen: number[];
  focused: { found: boolean; onScreen: boolean; side: OverlaySide | null } | null;
  movedScroll: boolean;
};

export const OVERLAY_PICK = "overlay:pick";

const ROOT_ID = "accesscheck-overlay";
const SVG = "http://www.w3.org/2000/svg";

const INK = "#121211";
const INK_2 = "#363633";
const HALO = "rgba(255,255,255,.94)";

const TONE: Record<OverlayTone, string> = {
  critical: "#b42318",
  serious: "#9c4400",
  moderate: "#7a5d00",
  minor: INK_2,
  review: "#5e35b1",
  none: INK_2,
  path: "#1c4fd6",
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
  position: absolute; inset: -6px; padding: 6px;
  background: repeating-linear-gradient(135deg, rgba(156,68,0,.28) 0 1.5px, transparent 1.5px 5px);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
}
.ring-line { position: absolute; inset: -6px; border: 1.5px dashed ${TONE.serious}; outline: 1px solid ${HALO}; }
.tag {
  position: fixed; display: inline-flex; align-items: center; justify-content: center;
  height: 20px; min-width: 20px; padding: 0 5px; margin: 0; border: 0;
  font: 600 12.5px/1 "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums; letter-spacing: 0; white-space: nowrap;
  color: #fff; background: var(--tone);
  box-shadow: 0 0 0 1.5px ${HALO}, 0 0 0 2.5px rgba(18,18,17,.42);
  transform: translate(calc(-50% - 5px), calc(-50% - 5px));
  pointer-events: none; user-select: none; -webkit-user-select: none;
}
.tag.circle { border-radius: 999px; padding: 0 4px; transform: translate(-50%, -50%); }
.tag.outline { background: #fff; color: ${INK}; border: 1.5px solid ${INK_2}; }
.tag.review { background: #fff; color: var(--tone); border: 1.5px dashed var(--tone); }
.tag.quiet { background: #fff; color: ${INK_2}; border: 1px solid ${INK_2}; height: 18px; min-width: 18px; font-size: 11.5px; }
.tag.circle.quiet { color: var(--tone); border: 1.5px solid var(--tone); }
.tag.current {
  height: 26px; min-width: 26px; font-size: 14px;
  box-shadow: 0 0 0 1.5px ${HALO}, 0 0 0 2.5px rgba(18,18,17,.42), 0 0 0 4px #fff, 0 0 0 6px ${INK};
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
  current: { inset: 5, arm: "min(13px, 42%)", bar: 2.5 },
  sibling: { inset: 4, arm: "min(8px, 40%)", bar: 1.5 },
} as const;

type Painted = {
  mark: OverlayMark;
  el: Element;
  current: boolean;
  locus: HTMLElement;
  tag: HTMLElement;
  ring: HTMLElement | null;
  visible: boolean;
  rect: DOMRect;
};

let painted: Painted[] = [];
let lines: SVGSVGElement | null = null;
let edge: HTMLElement | null = null;
let drawPath = false;
let onMove: (() => void) | null = null;
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

function tell(key: string): void {
  const runtime = (
    globalThis as {
      chrome?: { runtime?: { id?: string; sendMessage?: (message: unknown) => unknown } };
    }
  ).chrome?.runtime;
  if (!runtime?.id || !runtime.sendMessage) return;
  try {
    void Promise.resolve(runtime.sendMessage({ type: OVERLAY_PICK, key })).catch(() => {});
  } catch {
    return;
  }
}

function swallow(el: HTMLElement, act: () => void): void {
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
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
  const inset = halo ? cfg.inset + 1.5 : cfg.inset;
  css(el, {
    "--ink": halo ? HALO : INK,
    "--arm": halo ? `calc(${cfg.arm} + 3px)` : cfg.arm,
    "--bar": `${halo ? cfg.bar + 3 : cfg.bar}px`,
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
  const extra = mark.ring ? 8 : 0;
  const halo = corners(cfg, true);
  const ink = corners(cfg, false);
  if (extra) {
    css(halo, { inset: `${-(cfg.inset + 1.5 + extra)}px` });
    css(ink, { inset: `${-(cfg.inset + extra)}px` });
  }
  el.append(halo, ink);
  if (!current) css(el, { opacity: mark.quiet ? "0.85" : "1" });
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
  if (mark.label) el.title = mark.label;
  if (mark.pick) {
    el.dataset.pick = mark.pick;
    const key = mark.pick;
    swallow(el, () => tell(key));
  }
  return el;
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

function place(): void {
  frame = 0;
  for (const p of painted) {
    const r = p.el.getBoundingClientRect();
    p.rect = r;
    p.visible = seen(r);
    const show = p.visible ? "block" : "none";
    p.locus.style.setProperty("display", show);
    p.tag.style.setProperty("display", p.visible ? "inline-flex" : "none");
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
    const lift = p.mark.ring ? 8 : 0;
    const circle = p.mark.shape === "circle";
    const half = (p.tag.offsetWidth || 24) / 2 + (circle ? 2 : 7);
    const tall = (p.tag.offsetHeight || 20) / 2 + (circle ? 2 : 7);
    const low = r.top - lift < tall;
    css(p.tag, {
      left: `${Math.min(Math.max(r.left - lift, half), innerWidth - half)}px`,
      top: `${circle ? Math.max(r.top - lift, tall) : low ? Math.max(r.top, 0) + tall : r.top - lift}px`,
    });
  }
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

  const { root, shadow } = host();
  const missing: number[] = [];
  let found: Element | null = null;

  lines = svg("svg", { class: "layer" });
  const marksLayer = document.createElement("div");
  const tagsLayer = document.createElement("div");

  const ordered = [...marks].sort(
    (a, b) => Number(a.n === focus) - Number(b.n === focus) || Number(!a.quiet) - Number(!b.quiet),
  );

  for (const mark of ordered) {
    const el = find(mark.selector);
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
    painted.push({
      mark,
      el,
      current,
      locus,
      tag,
      ring,
      visible: false,
      rect: el.getBoundingClientRect(),
    });
  }

  painted.sort((a, b) => a.mark.n - b.mark.n);

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

  shadow.append(lines, marksLayer, tagsLayer);
  if (edge) shadow.append(edge);
  document.documentElement.appendChild(root);

  if (opts.scroll && found) {
    const r = found.getBoundingClientRect();
    const visible = r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    if (!visible) found.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }

  place();
  onMove = schedule;
  addEventListener("scroll", onMove, { passive: true, capture: true });
  addEventListener("resize", onMove, { passive: true });

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
          },
  };
}

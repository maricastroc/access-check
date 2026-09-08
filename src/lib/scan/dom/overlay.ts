export type OverlayMark = {
  n: number;
  selector: string;
  kind: "stop" | "attention" | "failure";
  label?: string;
};

export type OverlayReport = {
  drawn: number;
  missing: number[];
  offScreen: number[];
  focused: { found: boolean; onScreen: boolean } | null;
  movedScroll: boolean;
};

const ROOT_ID = "accesscheck-overlay";

const COLOR: Record<OverlayMark["kind"], string> = {
  stop: "#1a56c4",
  attention: "#8a5a00",
  failure: "#b3261e",
};

const WORD: Record<OverlayMark["kind"], string> = {
  stop: "stop",
  attention: "check order",
  failure: "no focus ring",
};

type Painted = { mark: OverlayMark; el: Element; box: HTMLElement; focused: boolean };

let painted: Painted[] = [];
let onMove: (() => void) | null = null;
let timer = 0;
let sessionScroll: { x: number; y: number } | null = null;

function place(): void {
  for (const p of painted) {
    const r = p.el.getBoundingClientRect();
    const visible =
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.right > 0 &&
      r.top < innerHeight &&
      r.left < innerWidth;

    p.box.style.setProperty("display", visible ? "block" : "none");
    if (!visible) continue;
    p.box.style.setProperty("left", `${r.left}px`);
    p.box.style.setProperty("top", `${r.top}px`);
    p.box.style.setProperty("width", `${r.width}px`);
    p.box.style.setProperty("height", `${r.height}px`);
  }
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
  sessionScroll = null;
  if (onMove) {
    removeEventListener("scroll", onMove, true);
    removeEventListener("resize", onMove);
    onMove = null;
  }
  painted = [];
  document.getElementById(ROOT_ID)?.remove();
}

function host(): HTMLElement {
  const el = document.createElement("div");
  el.id = ROOT_ID;
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("data-accesscheck", "overlay");

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
    el.style.setProperty(prop, value);
  }
  return el;
}

function boxFor(mark: OverlayMark, focused: boolean): HTMLElement {
  const color = COLOR[mark.kind];
  const box = document.createElement("div");
  for (const [prop, value] of [
    ["position", "fixed"],
    ["box-sizing", "border-box"],
    ["pointer-events", "none"],
    ["border", `${focused ? 3 : 2}px solid ${color}`],
    ["border-radius", "2px"],
    ["background", focused ? "rgba(26,86,196,.10)" : "transparent"],
    ["outline", "1px solid rgba(255,255,255,.92)"],
    ["outline-offset", "0px"],
    ["box-shadow", focused ? "0 0 0 3px rgba(23,24,26,.60)" : "0 0 0 2px rgba(23,24,26,.35)"],
    ["opacity", focused ? "1" : "0.45"],
  ]) {
    box.style.setProperty(prop, value);
  }

  const badge = document.createElement("span");
  badge.textContent = focused ? `${mark.n} · ${mark.label ?? WORD[mark.kind]}` : String(mark.n);
  for (const [prop, value] of [
    ["position", "absolute"],
    ["left", "-2px"],
    ["top", "-20px"],
    ["min-width", "18px"],
    ["height", "18px"],
    ["padding", "0 5px"],
    ["display", "inline-flex"],
    ["align-items", "center"],
    ["justify-content", "center"],
    ["white-space", "nowrap"],
    ["background", color],
    ["color", "#fff"],
    ["font", `${focused ? 700 : 600} 12px/1 ui-sans-serif, system-ui, sans-serif`],
    ["border-radius", "2px"],
    ["outline", "1px solid rgba(255,255,255,.92)"],
    ["box-shadow", "0 0 0 2px rgba(23,24,26,.35)"],
    ["pointer-events", "none"],
  ]) {
    badge.style.setProperty(prop, value);
  }
  box.appendChild(badge);
  return box;
}

export function overlayShow(
  marks: OverlayMark[],
  focus: number | null,
  opts: { scroll?: boolean; timeoutMs?: number } = {},
): OverlayReport {
  const carried = sessionScroll;
  overlayClear();
  sessionScroll = carried ?? { x: window.scrollX, y: window.scrollY };

  const root = host();
  const missing: number[] = [];
  let found: Element | null = null;

  for (const mark of marks) {
    let el: Element | null = null;
    try {
      el = document.querySelector(mark.selector);
    } catch {
      el = null;
    }
    if (!el) {
      missing.push(mark.n);
      continue;
    }

    const focused = focus !== null && mark.n === focus;
    if (focused) found = el;

    const box = boxFor(mark, focused);
    root.appendChild(box);
    painted.push({ mark, el, box, focused });
  }

  document.documentElement.appendChild(root);

  if (opts.scroll && found) {
    const r = found.getBoundingClientRect();
    const visible = r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    if (!visible) found.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }

  place();
  onMove = place;
  addEventListener("scroll", onMove, { passive: true, capture: true });
  addEventListener("resize", onMove, { passive: true });

  if (opts.timeoutMs && opts.timeoutMs > 0) {
    timer = setTimeout(overlayClear, opts.timeoutMs) as unknown as number;
  }

  const offScreen = painted
    .filter((p) => p.box.style.getPropertyValue("display") === "none")
    .map((p) => p.mark.n);

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
            onScreen: found !== null && !offScreen.includes(focus),
          },
  };
}

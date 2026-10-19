import { PALETTE, withAlpha } from "../../palette";
import { post } from "./overlay";

export const PREVIEW_UNDO = "preview:undo";
export const PREVIEW_STYLE_ID = "accesscheck-preview";
export const PREVIEW_BAR_ID = "accesscheck-preview-bar";

export type PreviewRequest = {
  css: string;
  text: string;
  undo: string;
  lang: string;
  avoid: string[];
};

export type PreviewCorner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

const CORNERS: PreviewCorner[] = ["bottom-right", "bottom-left", "top-right", "top-left"];
const GAP = 12;
const AVOIDED = 60;

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; }
.bar {
  position: fixed; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px;
  max-width: calc(100vw - ${GAP * 2}px); padding: 8px 8px 8px 12px; margin: 0;
  font: 600 13px/1.4 "Atkinson Hyperlegible Next", system-ui, sans-serif;
  color: #fff; background: ${PALETTE.ink};
  box-shadow: 0 0 0 1.5px rgba(255,255,255,.94), 0 2px 10px ${withAlpha(PALETTE.ink, 0.28)};
}
.bar[data-corner^="bottom"] { bottom: ${GAP}px; }
.bar[data-corner^="top"] { top: ${GAP}px; }
.bar[data-corner$="right"] { right: ${GAP}px; }
.bar[data-corner$="left"] { left: ${GAP}px; }
button {
  min-height: 28px; padding: 0 10px; margin: 0; cursor: pointer;
  font: inherit; color: #fff; background: transparent; border: 1.5px solid #fff;
}
button:hover { background: rgba(255,255,255,.14); }
button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
`;

let style: HTMLStyleElement | null = null;
let host: HTMLElement | null = null;
let bar: HTMLElement | null = null;
let avoid: string[] = [];
let onMove: (() => void) | null = null;
let frame = 0;

function find(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function covered(corner: PreviewCorner, w: number, h: number, targets: DOMRect[]): number {
  const x = corner.endsWith("right") ? innerWidth - GAP - w : GAP;
  const y = corner.startsWith("bottom") ? innerHeight - GAP - h : GAP;
  return targets.reduce((sum, r) => {
    const ow = Math.min(x + w, r.right + 4) - Math.max(x, r.left - 4);
    const oh = Math.min(y + h, r.bottom + 4) - Math.max(y, r.top - 4);
    return sum + (ow > 0 && oh > 0 ? ow * oh : 0);
  }, 0);
}

function placeBar(): void {
  frame = 0;
  if (!bar) return;
  const targets = avoid
    .slice(0, AVOIDED)
    .map(find)
    .filter((el): el is Element => el !== null)
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);
  const { width, height } = bar.getBoundingClientRect();
  const now = bar.dataset.corner as PreviewCorner;
  const free = CORNERS.find((c) => covered(c, width, height, targets) === 0);
  const least = [...CORNERS].sort(
    (a, b) => covered(a, width, height, targets) - covered(b, width, height, targets),
  )[0];
  const next = covered(now, width, height, targets) === 0 ? now : (free ?? least);
  if (next !== now) bar.dataset.corner = next;
}

function schedule(): void {
  if (!frame) frame = requestAnimationFrame(placeBar);
}

function keepToItself(el: HTMLElement): void {
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "keydown", "keyup"]) {
    el.addEventListener(type, (e) => e.stopPropagation());
  }
}

function barFor(req: PreviewRequest): HTMLElement {
  const root = document.createElement("div");
  root.id = PREVIEW_BAR_ID;
  root.setAttribute("data-accesscheck", "preview");
  for (const [prop, value] of [
    ["display", "block"],
    ["position", "fixed"],
    ["left", "0"],
    ["top", "0"],
    ["width", "0"],
    ["height", "0"],
    ["margin", "0"],
    ["padding", "0"],
    ["border", "0"],
    ["z-index", "2147483647"],
  ]) {
    root.style.setProperty(prop, value, "important");
  }
  const shadow = root.attachShadow({ mode: "open" });
  const sheet = document.createElement("style");
  sheet.textContent = STYLE;
  bar = document.createElement("div");
  bar.className = "bar";
  bar.lang = req.lang;
  bar.setAttribute("role", "status");
  bar.dataset.corner = CORNERS[0];
  const text = document.createElement("span");
  text.textContent = req.text;
  const undo = document.createElement("button");
  undo.type = "button";
  undo.textContent = req.undo;
  keepToItself(undo);
  undo.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.isTrusted) return;
    previewClear();
    post({ type: PREVIEW_UNDO });
  });
  bar.append(text, undo);
  shadow.append(sheet, bar);
  return root;
}

export function previewShow(req: PreviewRequest): { applied: number } {
  previewClear();
  style = document.createElement("style");
  style.id = PREVIEW_STYLE_ID;
  style.textContent = req.css;
  host = barFor(req);
  avoid = req.avoid;
  document.documentElement.append(style, host);
  placeBar();
  onMove = schedule;
  addEventListener("scroll", onMove, { passive: true, capture: true });
  addEventListener("resize", onMove, { passive: true });
  return { applied: req.avoid.filter((selector) => find(selector) !== null).length };
}

export function previewSide(after: boolean): boolean {
  const sheet = style?.sheet;
  if (!sheet) return false;
  sheet.disabled = !after;
  return true;
}

export function previewClear(): boolean {
  if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  if (onMove) {
    removeEventListener("scroll", onMove, true);
    removeEventListener("resize", onMove);
    onMove = null;
  }
  const left = [style, host, find(`#${PREVIEW_STYLE_ID}`), find(`#${PREVIEW_BAR_ID}`)].filter(
    (el): el is Element => el !== null && el.isConnected,
  );
  for (const el of left) el.remove();
  style = null;
  host = null;
  bar = null;
  avoid = [];
  return left.length > 0;
}

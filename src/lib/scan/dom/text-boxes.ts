import type { Rect } from "./label-spots";

export type TextBoxes = { free: Rect[]; pinned: Rect[]; sticky: boolean };

type Hold = "fixed" | "sticky" | null;

function holdOf(el: Element, memo: Map<Element, Hold>): Hold {
  const known = memo.get(el);
  if (known !== undefined) return known;
  const position = getComputedStyle(el).position;
  const hold: Hold =
    position === "fixed"
      ? "fixed"
      : position === "sticky"
        ? "sticky"
        : el.parentElement
          ? holdOf(el.parentElement, memo)
          : null;
  memo.set(el, hold);
  return hold;
}

export function readTextBoxes(top: number, bottom: number): TextBoxes {
  const out: TextBoxes = { free: [], pinned: [], sticky: false };
  const root = document.body ?? document.documentElement;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const near = new Map<Element, boolean>();
  const holds = new Map<Element, Hold>();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue?.trim()) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    let close = near.get(parent);
    if (close === undefined) {
      const r = parent.getBoundingClientRect();
      close =
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > top &&
        r.top < bottom &&
        (parent.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true);
      near.set(parent, close);
    }
    if (!close) continue;
    range.selectNodeContents(node);
    const hold = holdOf(parent, holds);
    if (hold === "sticky") out.sticky = true;
    for (const r of range.getClientRects()) {
      if (r.width <= 0 || r.height <= 0 || r.bottom <= top || r.top >= bottom) continue;
      (hold === "fixed" ? out.pinned : out.free).push({
        x: r.left,
        y: r.top,
        w: r.width,
        h: r.height,
      });
    }
  }
  return out;
}

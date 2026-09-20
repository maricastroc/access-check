import { cssPath } from "./selector";

const SCROLLABLE = /auto|scroll|overlay/;

export type DomRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  docX: number;
  docY: number;
  scrolled: boolean;
};

export function collectRects(selectors: string[]): (DomRect | null)[] {
  return selectors.map((selector) => {
    try {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const flow = flowOffsetOf(el);
      return {
        x: r.left,
        y: r.top,
        w: r.width,
        h: r.height,
        docX: r.left + window.scrollX,
        docY: r.top + window.scrollY,
        scrolled: flow.scrolled,
      };
    } catch {
      return null;
    }
  });
}

export function documentHeight(): number {
  return Math.max(
    document.documentElement.scrollHeight,
    document.body ? document.body.scrollHeight : 0,
  );
}

export function stickyInset(): number {
  const probes = [0.25, 0.5, 0.75].map((f) => document.elementFromPoint(window.innerWidth * f, 4));
  let inset = 0;

  for (const el of probes) {
    let node: Element | null = el;
    while (node && node !== document.body) {
      const position = getComputedStyle(node).position;
      if (position === "fixed" || position === "sticky") {
        const box = node.getBoundingClientRect();
        if (box.top <= 0 && box.bottom > inset) inset = box.bottom;
        break;
      }
      node = node.parentElement;
    }
  }

  return Math.min(Math.round(inset), Math.round(window.innerHeight / 3));
}

export function scrollToDocY(docY: number): number {
  const max = Math.max(0, documentHeight() - window.innerHeight);
  const target = Math.max(0, Math.min(max, Math.round(docY)));
  window.scrollTo(0, target);
  return Math.round(window.scrollY);
}

export function readViewport(): { width: number; height: number } {
  return { width: window.innerWidth, height: window.innerHeight };
}

export type FlowOffset = { x: number; y: number; scrolled: boolean; context: string };

function scrollsOwnContent(el: Element): boolean {
  const overflowsY = el.scrollHeight > el.clientHeight;
  const overflowsX = el.scrollWidth > el.clientWidth;
  if (!overflowsY && !overflowsX) return false;

  const style = getComputedStyle(el);
  return (
    (overflowsY && SCROLLABLE.test(style.overflowY)) ||
    (overflowsX && SCROLLABLE.test(style.overflowX))
  );
}

export function flowOffsetOf(el: Element | null): FlowOffset {
  const root = document.scrollingElement;
  let x = 0;
  let y = 0;
  let container: Element | null = null;

  let node: Element | null = el?.parentElement ?? null;
  while (node) {
    if (node !== root) {
      x += node.scrollLeft;
      y += node.scrollTop;
      if (container === null && scrollsOwnContent(node)) container = node;
    }
    node = node.parentElement;
  }

  return {
    x,
    y,
    scrolled: container !== null,
    context: container === null ? "" : cssPath(container),
  };
}

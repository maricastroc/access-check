import { cssPath } from "./selector";

const SCROLLABLE = /auto|scroll|overlay/;

export type DomRect = { x: number; y: number; w: number; h: number };

export function collectRects(selectors: string[]): (DomRect | null)[] {
  return selectors.map((selector) => {
    try {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    } catch {
      return null;
    }
  });
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

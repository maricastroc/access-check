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

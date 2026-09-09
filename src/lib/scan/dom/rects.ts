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

export type DocRect = DomRect & { docX: number; docY: number; pinned: boolean };

function isPinned(selector: string): boolean {
  try {
    let node = document.querySelector(selector);
    while (node && node !== document.body) {
      if (getComputedStyle(node).position === "fixed") return true;
      node = node.parentElement;
    }
  } catch {
    return false;
  }
  return false;
}

export function collectDocRects(selectors: string[]): (DocRect | null)[] {
  const left = window.scrollX;
  const top = window.scrollY;
  return collectRects(selectors).map((r, i) =>
    r ? { ...r, docX: r.x + left, docY: r.y + top, pinned: isPinned(selectors[i]) } : null,
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

  return Math.min(inset, Math.round(window.innerHeight / 3));
}

export function scrollToDocY(docY: number, topMargin: number): number {
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const target = Math.max(0, Math.min(max, Math.round(docY - topMargin)));
  window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior });
  return window.scrollY;
}

type FrozenOverlay = { el: HTMLElement; position: string; visibility: string };

let frozen: FrozenOverlay[] = [];

export function freezeOverlays(): number {
  restoreOverlays();

  for (const node of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
    const position = getComputedStyle(node).position;
    if (position !== "fixed" && position !== "sticky") continue;
    frozen.push({
      el: node,
      position: node.style.position,
      visibility: node.style.visibility,
    });
    if (position === "fixed") node.style.visibility = "hidden";
    else node.style.position = "static";
  }

  return frozen.length;
}

export function restoreOverlays(): void {
  for (const item of frozen) {
    item.el.style.position = item.position;
    item.el.style.visibility = item.visibility;
  }
  frozen = [];
}

export function documentHeight(): number {
  return Math.max(
    document.documentElement.scrollHeight,
    document.body ? document.body.scrollHeight : 0,
  );
}

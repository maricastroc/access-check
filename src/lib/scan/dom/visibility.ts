export function inLayout(el: Element): boolean {
  const he = el as HTMLElement;
  if (typeof he.checkVisibility === "function") {
    return he.checkVisibility({ visibilityProperty: true });
  }
  return getComputedStyle(he).visibility === "visible" && el.getClientRects().length > 0;
}

export function isRendered(el: Element): boolean {
  if (!inLayout(el)) return false;

  const he = el as HTMLElement;
  if (he.offsetParent === null && getComputedStyle(he).position !== "fixed") {
    return el.getClientRects().length > 0;
  }
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

const CLIPS = new Set(["hidden", "clip"]);

export function collapsedAway(el: Element): boolean {
  if (getComputedStyle(el).position === "fixed") return false;

  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const cs = getComputedStyle(node);
    if (!CLIPS.has(cs.overflowX) && !CLIPS.has(cs.overflowY)) continue;
    const r = node.getBoundingClientRect();
    if (CLIPS.has(cs.overflowY) && r.height <= 0) return true;
    if (CLIPS.has(cs.overflowX) && r.width <= 0) return true;
  }
  return false;
}

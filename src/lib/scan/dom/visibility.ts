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

function clippedAway(el: Element, box: DOMRect): boolean {
  let left = box.left;
  let top = box.top;
  let right = box.right;
  let bottom = box.bottom;

  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const cs = getComputedStyle(node);
    const clipsX = CLIPS.has(cs.overflowX);
    const clipsY = CLIPS.has(cs.overflowY);
    if (!clipsX && !clipsY) continue;
    const r = node.getBoundingClientRect();
    if (clipsX) {
      left = Math.max(left, r.left);
      right = Math.min(right, r.right);
    }
    if (clipsY) {
      top = Math.max(top, r.top);
      bottom = Math.min(bottom, r.bottom);
    }
    if (right - left < 1 || bottom - top < 1) return true;
  }
  return false;
}

function covered(el: Element, box: DOMRect): boolean {
  const inset = (a: number, b: number, f: number) => a + (b - a) * f;
  const points = [
    [0.5, 0.5],
    [0.2, 0.2],
    [0.8, 0.2],
    [0.2, 0.8],
    [0.8, 0.8],
  ]
    .map(([fx, fy]) => [inset(box.left, box.right, fx), inset(box.top, box.bottom, fy)])
    .filter(([x, y]) => x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight);

  if (points.length === 0) return false;

  return points.every(([x, y]) => {
    const hit = document.elementFromPoint(x, y);
    return hit !== null && hit !== el && !el.contains(hit) && !hit.contains(el);
  });
}

export function showsOnScreen(el: Element): boolean {
  const he = el as HTMLElement;
  if (typeof he.checkVisibility === "function") {
    const visible = he.checkVisibility({
      opacityProperty: true,
      visibilityProperty: true,
      contentVisibilityAuto: true,
    });
    if (!visible) return false;
  } else if (!inLayout(el)) {
    return false;
  }

  const box = el.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return false;
  if (collapsedAway(el) || clippedAway(el, box)) return false;
  return !covered(el, box);
}

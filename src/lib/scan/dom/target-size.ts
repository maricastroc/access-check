import { cssPath } from "./selector";
import type { RawTargetSize } from "../target-size";

export function collectTargetSizeRaw(interactive: string): RawTargetSize {
  const isVisible = (el: Element): boolean => {
    const he = el as HTMLElement;
    if (he.offsetParent === null && getComputedStyle(he).position !== "fixed") {
      return el.getClientRects().length > 0;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const isInline = (el: Element): boolean => {
    if (getComputedStyle(el).display !== "inline") return false;
    const parent = el.parentElement;
    if (!parent) return false;
    const own = (el.textContent ?? "").trim().length;
    const parentText = (parent.textContent ?? "").trim().length;
    return parentText > own;
  };

  const targets: {
    selector: string;
    x: number;
    y: number;
    w: number;
    h: number;
    inline: boolean;
  }[] = [];

  for (const el of Array.from(document.querySelectorAll(interactive))) {
    const tabindex = el.getAttribute("tabindex");
    if (tabindex !== null && parseInt(tabindex, 10) < 0) continue;
    if ((el as HTMLButtonElement).disabled) continue;
    if (el.getAttribute("aria-hidden") === "true") continue;
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    const sel = cssPath(el);
    if (!sel) continue;
    targets.push({
      selector: sel,
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
      inline: isInline(el),
    });
  }

  return { targets };
}

import type { Page } from "playwright-core";
import type { AuditFinding } from "./audits";
import { MAX_AUDIT_SELECTORS } from "./audits";

/**
 * WCAG 2.5.8 · Target Size (Minimum) — AA, added in WCAG 2.2.
 *
 * axe-core ships a `target-size` rule, but it is experimental and not part of
 * the wcag22aa tag set we run, so in practice this is a blind spot. We measure
 * every pointer target ourselves and apply the spacing exception the same way
 * the spec describes it: an undersized target is fine if a 24px-diameter circle
 * centred on it does not touch any neighbouring target's circle or box.
 */

const MIN_SIZE = 24;
const RADIUS = MIN_SIZE / 2;

export type TargetRect = {
  selector: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Inline element sitting inside a run of text — exempt from 2.5.8. */
  inline: boolean;
};

export type RawTargetSize = {
  targets: TargetRect[];
};

export type TargetSizeReport = {
  measured: number;
  findings: AuditFinding[];
};

type Center = { cx: number; cy: number };

function center(t: TargetRect): Center {
  return { cx: t.x + t.w / 2, cy: t.y + t.h / 2 };
}

function centerDistance(a: TargetRect, b: TargetRect): number {
  const ca = center(a);
  const cb = center(b);
  return Math.hypot(ca.cx - cb.cx, ca.cy - cb.cy);
}

/** Distance from a point to the nearest edge of a rect (0 when inside it). */
function pointRectDistance(cx: number, cy: number, r: TargetRect): number {
  const dx = Math.max(r.x - cx, 0, cx - (r.x + r.w));
  const dy = Math.max(r.y - cy, 0, cy - (r.y + r.h));
  return Math.hypot(dx, dy);
}

function isUndersized(t: TargetRect): boolean {
  return t.w > 0 && t.h > 0 && (t.w < MIN_SIZE || t.h < MIN_SIZE);
}

/**
 * An undersized target keeps enough spacing when no other target crowds the
 * 24px circle centred on it: neither another centre within 24px, nor another
 * target's box within the 12px radius.
 */
function isCrowded(t: TargetRect, all: TargetRect[]): boolean {
  const { cx, cy } = center(t);
  return all.some(
    (o) => o !== t && (centerDistance(t, o) < MIN_SIZE || pointRectDistance(cx, cy, o) < RADIUS),
  );
}

export function analyzeTargetSize(raw: RawTargetSize): TargetSizeReport {
  const { targets } = raw;
  const offenders = targets.filter(
    (t) => !t.inline && isUndersized(t) && isCrowded(t, targets),
  );

  const findings: AuditFinding[] = [];
  if (offenders.length > 0) {
    const n = offenders.length;
    findings.push({
      id: "target-size",
      severity: "serious",
      criterion: "WCAG 2.5.8 · Target Size (Minimum)",
      title: `${n} touch ${n === 1 ? "target is" : "targets are"} smaller than 24×24px`,
      desc:
        `${n} interactive ${n === 1 ? "control is" : "controls are"} below the 24×24 CSS pixel ` +
        "minimum and sit too close to another target to earn the spacing exception. Small, " +
        "crowded targets are hard to hit for people with motor impairments or on touch screens.",
      fix:
        "Grow each control to at least 24×24px, or add enough spacing around it that a 24px " +
        "circle centred on it clears its neighbours (padding on the control usually does both).",
      count: n,
      selectors: offenders.slice(0, MAX_AUDIT_SELECTORS).map((t) => t.selector),
    });
  }

  return { measured: targets.length, findings };
}

const INTERACTIVE =
  'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex], ' +
  '[role="button"], [role="link"], [role="checkbox"], [role="radio"], ' +
  '[role="tab"], [role="menuitem"], [role="switch"], [contenteditable="true"], [onclick]';

export async function collectTargetSize(page: Page): Promise<TargetSizeReport> {
  const raw = (await page.evaluate((interactive) => {
    const cssPath = (el: Element | null): string => {
      if (!el || el.nodeType !== 1) return "";
      const parts: string[] = [];
      let node: Element | null = el;
      while (node && node.nodeType === 1 && parts.length < 5) {
        if (node.id) {
          parts.unshift(`#${CSS.escape(node.id)}`);
          break;
        }
        let sel = node.tagName.toLowerCase();
        const parent: Element | null = node.parentElement;
        if (parent) {
          const sameTag = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
          if (sameTag.length > 1) sel += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
        parts.unshift(sel);
        node = parent;
      }
      return parts.join(" > ");
    };

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
  }, INTERACTIVE)) as RawTargetSize;

  return analyzeTargetSize(raw);
}

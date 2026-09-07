import type { Page } from "playwright-core";
import type { AuditFinding } from "./audits";
import { MAX_AUDIT_SELECTORS } from "./audits";

const MIN_SIZE = 24;
const RADIUS = MIN_SIZE / 2;

export type TargetRect = {
  selector: string;
  x: number;
  y: number;
  w: number;
  h: number;
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

function pointRectDistance(cx: number, cy: number, r: TargetRect): number {
  const dx = Math.max(r.x - cx, 0, cx - (r.x + r.w));
  const dy = Math.max(r.y - cy, 0, cy - (r.y + r.h));
  return Math.hypot(dx, dy);
}

function isUndersized(t: TargetRect): boolean {
  return t.w > 0 && t.h > 0 && (t.w < MIN_SIZE || t.h < MIN_SIZE);
}

function isCrowded(t: TargetRect, all: TargetRect[]): boolean {
  const { cx, cy } = center(t);
  return all.some(
    (o) => o !== t && (centerDistance(t, o) < MIN_SIZE || pointRectDistance(cx, cy, o) < RADIUS),
  );
}

export function analyzeTargetSize(raw: RawTargetSize): TargetSizeReport {
  const { targets } = raw;
  const offenders = targets.filter((t) => !t.inline && isUndersized(t) && isCrowded(t, targets));

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

export const INTERACTIVE =
  'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex], ' +
  '[role="button"], [role="link"], [role="checkbox"], [role="radio"], ' +
  '[role="tab"], [role="menuitem"], [role="switch"], [contenteditable="true"], [onclick]';

export async function collectTargetSize(page: Page): Promise<TargetSizeReport> {
  const raw = (await page.evaluate(
    (interactive) => window.__accessCheckDom!.collectTargetSizeRaw(interactive),
    INTERACTIVE,
  )) as RawTargetSize;
  return analyzeTargetSize(raw);
}

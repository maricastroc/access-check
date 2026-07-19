import type { Page } from "playwright-core";
import type { AuditFinding } from "./audits";
import { MAX_AUDIT_SELECTORS } from "./audits";

/**
 * WCAG 2.3.3 · Animation from Interactions (AAA) and 2.2.2 · Pause, Stop, Hide.
 *
 * axe-core checks markup, never behaviour, so nobody verifies that a site
 * actually honours the user's "reduce motion" preference. We emulate
 * `prefers-reduced-motion: reduce`, then read `document.getAnimations()` to find
 * animations that keep running anyway — infinite loops or long, non-trivial
 * movement that should have been cut.
 */

/** Below this we treat the animation as a harmless micro-transition. */
const TRIVIAL_MS = 250;

export type RunningAnimation = {
  selector: string;
  /** Effective duration in ms (single iteration). */
  durationMs: number;
  /** Infinite when the animation loops forever. */
  infinite: boolean;
  /** CSS properties the animation touches (best-effort; empty for JS/WAAPI). */
  properties: string[];
};

export type RawReducedMotion = {
  ran: boolean;
  animations: RunningAnimation[];
};

export type ReducedMotionReport = {
  ran: boolean;
  running: number;
  findings: AuditFinding[];
};

/**
 * A fade of a single opacity/visibility property is exempt — those are gentle
 * and explicitly allowed. Anything moving or looping forever is not.
 */
const GENTLE_PROPS = new Set(["opacity", "visibility"]);

function isDisruptive(a: RunningAnimation): boolean {
  if (a.infinite) return true;
  if (a.durationMs < TRIVIAL_MS) return false;
  if (a.properties.length > 0 && a.properties.every((p) => GENTLE_PROPS.has(p))) return false;
  return true;
}

export function analyzeReducedMotion(raw: RawReducedMotion): ReducedMotionReport {
  if (!raw.ran) return { ran: false, running: 0, findings: [] };

  const disruptive = raw.animations.filter(isDisruptive);
  const selectors = [...new Set(disruptive.map((a) => a.selector))].filter(Boolean);

  const findings: AuditFinding[] = [];
  if (selectors.length > 0) {
    const n = selectors.length;
    findings.push({
      id: "reduced-motion",
      severity: "moderate",
      criterion: "WCAG 2.3.3 · Animation from Interactions",
      title: `${n} ${n === 1 ? "element keeps" : "elements keep"} animating under reduced motion`,
      desc:
        `With prefers-reduced-motion: reduce set, ${n} ${n === 1 ? "element" : "elements"} still ` +
        "ran a looping or long, non-trivial animation. Motion the user asked to avoid can trigger " +
        "nausea, dizziness or migraines for people with vestibular disorders.",
      fix:
        "Wrap non-essential animation in @media (prefers-reduced-motion: reduce) and disable or " +
        "shorten it there — e.g. animation: none or a brief opacity fade instead of movement.",
      count: n,
      selectors: selectors.slice(0, MAX_AUDIT_SELECTORS),
    });
  }

  return { ran: true, running: raw.animations.length, findings };
}

export async function collectReducedMotion(page: Page): Promise<ReducedMotionReport> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  try {
    await page.waitForTimeout(400);

    const raw = (await page.evaluate(() => {
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

      const anims =
        typeof document.getAnimations === "function" ? document.getAnimations() : [];

      const out: {
        selector: string;
        durationMs: number;
        infinite: boolean;
        properties: string[];
      }[] = [];

      for (const anim of anims) {
        if (anim.playState !== "running") continue;
        const effect = anim.effect as KeyframeEffect | null;
        const target = effect?.target ?? null;
        if (!target) continue;

        const timing = effect?.getTiming?.() ?? {};
        const duration = typeof timing.duration === "number" ? timing.duration : 0;
        const infinite = timing.iterations === Infinity;

        let properties: string[] = [];
        try {
          const frames = effect?.getKeyframes?.() ?? [];
          const props = new Set<string>();
          for (const frame of frames) {
            for (const key of Object.keys(frame)) {
              if (key === "offset" || key === "composite" || key === "easing") continue;
              props.add(key);
            }
          }
          properties = [...props];
        } catch {
          //
        }

        out.push({
          selector: cssPath(target as Element),
          durationMs: duration,
          infinite,
          properties,
        });
      }

      return { ran: true, animations: out };
    })) as RawReducedMotion;

    return analyzeReducedMotion(raw);
  } finally {
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
}

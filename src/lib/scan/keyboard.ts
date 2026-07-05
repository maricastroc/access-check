import type { Page } from "playwright-core";
import type { Severity } from "./types";
import { severityOrder } from "./derive";

export type KeyboardIssueId =
  | "focus-not-visible"
  | "focus-order"
  | "keyboard-trap"
  | "positive-tabindex"
  | "unreachable-control";

export type FocusStop = {
  n: number;
  selector: string;
  label: string;
  tag: string;
  focusVisible: boolean;
  left: number | null;
  top: number | null;
  width: number | null;
  height: number | null;
};

export type KeyboardFinding = {
  id: KeyboardIssueId;
  severity: Severity;
  criterion: string;
  title: string;
  desc: string;
  fix: string;
  /** quantos elementos/paradas o finding cobre */
  count: number;
  /** amostra de seletores afetados (limitada pra não estourar o payload) */
  selectors: string[];
};

export type KeyboardReport = {
  totalStops: number;
  totalInteractive: number;
  reachableInteractive: number;
  truncated: boolean;
  cycleComplete: boolean;
  focusPath: FocusStop[];
  findings: KeyboardFinding[];
};

export type RawKeyboard = {
  focusPath: FocusStop[];
  trapSelector: string | null;
  positiveTabindex: string[];
  unreachable: string[];
  totalInteractive: number;
  reachableInteractive: number;
  truncated: boolean;
  cycleComplete: boolean;
};

const CRITERION: Record<KeyboardIssueId, string> = {
  "focus-not-visible": "WCAG 2.4.7 · Focus Visible",
  "focus-order": "WCAG 2.4.3 · Focus Order",
  "keyboard-trap": "WCAG 2.1.2 · No Keyboard Trap",
  "positive-tabindex": "WCAG 2.4.3 · Focus Order",
  "unreachable-control": "WCAG 2.1.1 · Keyboard",
};

const MAX_FINDING_SELECTORS = 8;

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function readingOrderInversions(stops: FocusStop[]): {
  count: number;
  selectors: string[];
} {
  const BAND = 3;
  const positioned = stops.filter(
    (s): s is FocusStop & { top: number; left: number } => s.top !== null && s.left !== null,
  );
  const selectors: string[] = [];
  for (let i = 1; i < positioned.length; i++) {
    const prev = positioned[i - 1];
    const cur = positioned[i];
    const dy = cur.top - prev.top;
    if (dy < -BAND) {
      selectors.push(cur.selector);
    } else if (Math.abs(dy) <= BAND && cur.left < prev.left - BAND) {
      selectors.push(cur.selector); 
    }
  }
  const unique = [...new Set(selectors)];
  return { count: unique.length, selectors: unique };
}

export function buildKeyboardReport(raw: RawKeyboard): KeyboardReport {
  const findings: KeyboardFinding[] = [];

  if (raw.trapSelector) {
    findings.push({
      id: "keyboard-trap",
      severity: "critical",
      criterion: CRITERION["keyboard-trap"],
      title: "Keyboard focus is trapped",
      desc:
        "Pressing Tab kept focus on the same element instead of advancing. " +
        "Keyboard and screen-reader users can get stuck here with no way out.",
      fix:
        "Ensure the element doesn't intercept Tab, or (if it's a modal) provide " +
        "a documented way to leave — Esc to close and returning focus to the trigger.",
      count: 1,
      selectors: [raw.trapSelector],
    });
  }

  if (raw.cycleComplete && !raw.truncated && raw.unreachable.length > 0) {
    const n = raw.unreachable.length;
    findings.push({
      id: "unreachable-control",
      severity: "serious",
      criterion: CRITERION["unreachable-control"],
      title: `${n} interactive ${plural(n, "control is", "controls are")} not keyboard-reachable`,
      desc:
        `${n} ${plural(n, "element behaves", "elements behave")} as interactive ` +
        "(click handlers or ARIA roles) but Tab never reaches " +
        `${plural(n, "it", "them")} — so ${plural(n, "it's", "they're")} usable by mouse only.`,
      fix:
        'Give each control a native focusable element (<button>, <a href>) or ' +
        'add tabindex="0" and keyboard handlers so it can be reached and operated.',
      count: n,
      selectors: raw.unreachable.slice(0, MAX_FINDING_SELECTORS),
    });
  }

  const invisible = raw.focusPath.filter((s) => !s.focusVisible);
  if (invisible.length > 0) {
    const n = invisible.length;
    findings.push({
      id: "focus-not-visible",
      severity: "serious",
      criterion: CRITERION["focus-not-visible"],
      title: `No visible focus indicator on ${n} ${plural(n, "element", "elements")}`,
      desc:
        `Focusing ${plural(n, "this element", "these elements")} by keyboard produced ` +
        "no detectable outline, box-shadow, border or background change. Sighted " +
        "keyboard users can't tell where they are on the page.",
      fix:
        "Add a clear :focus-visible style — e.g. outline: 2px solid; outline-offset: 2px; " +
        "— instead of removing the outline with outline: none.",
      count: n,
      selectors: invisible.slice(0, MAX_FINDING_SELECTORS).map((s) => s.selector),
    });
  }

  const inv = readingOrderInversions(raw.focusPath);
  if (inv.count > 0) {
    findings.push({
      id: "focus-order",
      severity: "moderate",
      criterion: CRITERION["focus-order"],
      title: `Focus order jumps out of sequence ${inv.count} ${plural(inv.count, "time", "times")}`,
      desc:
        "The Tab order doesn't follow the visual reading order (top-to-bottom, " +
        "left-to-right). Focus jumps backwards or upward, which is disorienting " +
        "for keyboard and screen-reader users.",
      fix:
        "Match the DOM order to the visual order and avoid reordering with CSS " +
        "(order, flex-direction: row-reverse, absolute positioning) or positive tabindex.",
      count: inv.count,
      selectors: inv.selectors.slice(0, MAX_FINDING_SELECTORS),
    });
  }

  if (raw.positiveTabindex.length > 0) {
    const n = raw.positiveTabindex.length;
    findings.push({
      id: "positive-tabindex",
      severity: "moderate",
      criterion: CRITERION["positive-tabindex"],
      title: `${n} ${plural(n, "element uses", "elements use")} a positive tabindex`,
      desc:
        "A positive tabindex overrides the natural tab order and is almost always " +
        "a source of confusing, hard-to-maintain focus behaviour.",
      fix:
        'Replace positive tabindex values with tabindex="0" (or none) and let the ' +
        "DOM order define the sequence.",
      count: n,
      selectors: raw.positiveTabindex.slice(0, MAX_FINDING_SELECTORS),
    });
  }

  findings.sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );

  return {
    totalStops: raw.focusPath.length,
    totalInteractive: raw.totalInteractive,
    reachableInteractive: raw.reachableInteractive,
    truncated: raw.truncated,
    cycleComplete: raw.cycleComplete,
    focusPath: raw.focusPath,
    findings,
  };
}

const MAX_TAB_STOPS = 50;

type Viewport = { width: number; height: number };

type FocusStyle = {
  outlineStyle: string;
  outlineWidth: string;
  outlineColor: string;
  boxShadow: string;
  borderTopWidth: string;
  borderTopColor: string;
  backgroundColor: string;
};

function hasFocusIndicator(focused: FocusStyle, base: FocusStyle): boolean {
  if (focused.outlineStyle !== "none" && parseFloat(focused.outlineWidth) > 0) return true;
  if (focused.boxShadow !== base.boxShadow && focused.boxShadow !== "none") return true;
  if (focused.borderTopWidth !== base.borderTopWidth) return true;
  if (focused.borderTopColor !== base.borderTopColor) return true;
  if (focused.backgroundColor !== base.backgroundColor) return true;
  if (focused.outlineColor !== base.outlineColor) return true;
  return false;
}

type RawStop = {
  selector: string;
  tag: string;
  label: string;
  isBody: boolean;
  isIframe: boolean;
  style: FocusStyle;
  rect: { x: number; y: number; w: number; h: number } | null;
};

export async function collectKeyboard(page: Page, viewport: Viewport): Promise<KeyboardReport> {
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__acVisited = [];
    w.__acCssPath = (el: Element | null): string => {
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

    w.__acLabel = (el: Element): string => {
      const aria = el.getAttribute("aria-label");
      if (aria && aria.trim()) return aria.trim().slice(0, 60);
      const labelledby = el.getAttribute("aria-labelledby");
      if (labelledby) {
        const ref = document.getElementById(labelledby.split(/\s+/)[0]);
        const t = ref?.textContent?.replace(/\s+/g, " ").trim();
        if (t) return t.slice(0, 60);
      }
      const text = el.textContent?.replace(/\s+/g, " ").trim();
      if (text) return text.slice(0, 60);
      const alt = el.getAttribute("alt");
      if (alt && alt.trim()) return alt.trim().slice(0, 60);
      const title = el.getAttribute("title");
      if (title && title.trim()) return title.trim().slice(0, 60);
      return el.tagName.toLowerCase();
    };

    (document.activeElement as HTMLElement | null)?.blur?.();
  });

  const rawStops: RawStop[] = [];
  let trapSelector: string | null = null;
  let cycleComplete = false;
  let truncated = false;
  let prevSelector: string | null = null;

  for (let i = 0; i < MAX_TAB_STOPS; i++) {
    await page.keyboard.press("Tab");
    const info = (await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const w = window as unknown as {
        __acCssPath: (e: Element | null) => string;
        __acLabel: (e: Element) => string;
        __acVisited: Element[];
      };
      if (!el || el === document.body || el === document.documentElement) {
        return { isBody: true } as const;
      }
      w.__acVisited.push(el);
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        isBody: false,
        selector: w.__acCssPath(el),
        tag: el.tagName.toLowerCase(),
        label: w.__acLabel(el),
        isIframe: el.tagName === "IFRAME",
        style: {
          outlineStyle: cs.outlineStyle,
          outlineWidth: cs.outlineWidth,
          outlineColor: cs.outlineColor,
          boxShadow: cs.boxShadow,
          borderTopWidth: cs.borderTopWidth,
          borderTopColor: cs.borderTopColor,
          backgroundColor: cs.backgroundColor,
        },
        rect:
          r.width > 0 || r.height > 0
            ? { x: r.left, y: r.top, w: r.width, h: r.height }
            : null,
      };
    })) as { isBody: true } | (RawStop & { isBody: false });

    if (info.isBody) {
      cycleComplete = true;
      break;
    }

    if (prevSelector !== null && info.selector === prevSelector) {
      if (!info.isIframe) trapSelector = info.selector;
      break;
    }

    if (rawStops.length > 0 && info.selector === rawStops[0].selector) {
      cycleComplete = true;
      break;
    }

    rawStops.push(info);
    prevSelector = info.selector;

    if (i === MAX_TAB_STOPS - 1) truncated = true;
  }

  const uniqueSelectors = [...new Set(rawStops.map((s) => s.selector))];
  const baseStyles =
    uniqueSelectors.length === 0
      ? {}
      : ((await page.evaluate((selectors) => {
          (document.activeElement as HTMLElement | null)?.blur?.();
          const out: Record<string, FocusStyle> = {};
          for (const sel of selectors) {
            try {
              const el = document.querySelector(sel);
              if (!el) continue;
              const cs = getComputedStyle(el);
              out[sel] = {
                outlineStyle: cs.outlineStyle,
                outlineWidth: cs.outlineWidth,
                outlineColor: cs.outlineColor,
                boxShadow: cs.boxShadow,
                borderTopWidth: cs.borderTopWidth,
                borderTopColor: cs.borderTopColor,
                backgroundColor: cs.backgroundColor,
              };
            } catch {
              //
            }
          }
          return out;
        }, uniqueSelectors)) as Record<string, FocusStyle>);

  const reach = (await page.evaluate(() => {
    const w = window as unknown as {
      __acCssPath: (e: Element | null) => string;
      __acVisited: Element[];
    };
    const visited = new Set(w.__acVisited);
    const INTERACTIVE =
      'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex], ' +
      '[role="button"], [role="link"], [role="checkbox"], [role="radio"], ' +
      '[role="tab"], [role="menuitem"], [role="switch"], [contenteditable="true"], [onclick]';

    const isVisible = (el: Element): boolean => {
      const he = el as HTMLElement;
      if (he.offsetParent === null && getComputedStyle(he).position !== "fixed") {
        return el.getClientRects().length > 0;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const candidates = Array.from(document.querySelectorAll(INTERACTIVE)).filter((el) => {
      const tabindex = el.getAttribute("tabindex");
      if (tabindex !== null && parseInt(tabindex, 10) < 0) return false;
      if ((el as HTMLButtonElement).disabled) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      return isVisible(el);
    });

    const unreachable = candidates.filter((el) => !visited.has(el)).map((el) => w.__acCssPath(el));

    const positiveTabindex = Array.from(document.querySelectorAll("[tabindex]"))
      .filter((el) => parseInt(el.getAttribute("tabindex") || "0", 10) > 0)
      .map((el) => w.__acCssPath(el));

    const g = window as unknown as Record<string, unknown>;
    delete g.__acVisited;
    delete g.__acCssPath;
    delete g.__acLabel;

    return {
      totalInteractive: candidates.length,
      reachableInteractive: candidates.length - unreachable.length,
      unreachable,
      positiveTabindex: [...new Set(positiveTabindex)],
    };
  })) as {
    totalInteractive: number;
    reachableInteractive: number;
    unreachable: string[];
    positiveTabindex: string[];
  };

  const focusPath: FocusStop[] = rawStops.map((s, i) => {
    const base = baseStyles[s.selector];
    const focusVisible = base ? hasFocusIndicator(s.style, base) : true;
    const r = s.rect;
    const onScreen =
      r !== null && r.y >= 0 && r.y <= viewport.height && r.x >= 0 && r.x <= viewport.width;
    return {
      n: i + 1,
      selector: s.selector,
      label: s.label,
      tag: s.tag,
      focusVisible,
      left: onScreen ? (r!.x / viewport.width) * 100 : null,
      top: onScreen ? (r!.y / viewport.height) * 100 : null,
      width: onScreen ? (r!.w / viewport.width) * 100 : null,
      height: onScreen ? (r!.h / viewport.height) * 100 : null,
    };
  });

  return buildKeyboardReport({
    focusPath,
    trapSelector,
    positiveTabindex: reach.positiveTabindex,
    unreachable: reach.unreachable,
    totalInteractive: reach.totalInteractive,
    reachableInteractive: reach.reachableInteractive,
    truncated,
    cycleComplete,
  });
}

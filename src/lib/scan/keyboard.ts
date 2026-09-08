import type { Page } from "playwright-core";
import type { Severity } from "./types";
import type { FocusProbe, FocusReach, FocusStyle } from "./dom/focus";
import { severityOrder } from "./derive";

export type KeyboardIssueId =
  | "focus-not-visible"
  | "focus-order"
  | "keyboard-trap"
  | "positive-tabindex"
  | "unreachable-control";

export type FocusRect = { x: number; y: number; w: number; h: number };

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
  html?: string;
  rect?: FocusRect | null;
  onScreen?: boolean;
  focusStyle?: FocusStyle;
  baseStyle?: FocusStyle | null;
};

export type KeyboardCertainty = "conclusive" | "needs-review";

export type WalkEnd = "cycle" | "cap" | "timeout" | "opaque" | "trap";

export type KeyboardOccurrence = {
  stop: number | null;
  selector: string;
  tag: string;
  label: string;
  html: string | null;
  rect: FocusRect | null;
  onScreen: boolean;
  reason: string;
  certainty: KeyboardCertainty;
  from?: number;
  to?: number;
};

export type KeyboardFinding = {
  id: KeyboardIssueId;
  severity: Severity;
  criterion: string;
  title: string;
  desc: string;
  fix: string;
  count: number;
  selectors: string[];
  occurrences: KeyboardOccurrence[];
};

export type KeyboardReport = {
  totalStops: number;
  totalInteractive: number;
  reachableInteractive: number;
  truncated: boolean;
  cycleComplete: boolean;
  startedAtTop: boolean;
  stoppedBy: WalkEnd;
  focusPath: FocusStop[];
  findings: KeyboardFinding[];
};

export type RawKeyboard = {
  focusPath: FocusStop[];
  startedAtTop: boolean;
  stoppedBy: WalkEnd;
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

export type OrderJump = {
  from: number;
  to: number;
  selector: string;
  direction: "up" | "back";
};

export function readingOrderInversions(stops: FocusStop[]): {
  count: number;
  selectors: string[];
  jumps: OrderJump[];
} {
  const BAND = 3;
  const positioned = stops.filter(
    (s): s is FocusStop & { top: number; left: number } => s.top !== null && s.left !== null,
  );

  const jumps: OrderJump[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < positioned.length; i++) {
    const prev = positioned[i - 1];
    const cur = positioned[i];
    const dy = cur.top - prev.top;

    let direction: OrderJump["direction"] | null = null;
    if (dy < -BAND) direction = "up";
    else if (Math.abs(dy) <= BAND && cur.left < prev.left - BAND) direction = "back";
    if (direction === null) continue;

    if (seen.has(cur.selector)) continue;
    seen.add(cur.selector);
    jumps.push({ from: prev.n, to: cur.n, selector: cur.selector, direction });
  }

  return { count: jumps.length, selectors: jumps.map((j) => j.selector), jumps };
}

function region(top: number | null): string {
  if (top === null) return "outside the visible viewport";
  if (top < 25) return "near the top of the page";
  if (top < 60) return "in the middle of the page";
  return "near the bottom of the page";
}

function occurrenceOf(
  stop: FocusStop,
  reason: string,
  certainty: KeyboardCertainty,
  extra: Partial<KeyboardOccurrence> = {},
): KeyboardOccurrence {
  return {
    stop: stop.n,
    selector: stop.selector,
    tag: stop.tag,
    label: stop.label,
    html: stop.html ?? null,
    rect: stop.rect ?? null,
    onScreen: stop.onScreen ?? stop.top !== null,
    reason,
    certainty,
    ...extra,
  };
}

function occurrenceForSelector(
  selector: string,
  stops: FocusStop[],
  reason: string,
  certainty: KeyboardCertainty,
): KeyboardOccurrence {
  const stop = stops.find((s) => s.selector === selector);
  if (stop) return occurrenceOf(stop, reason, certainty);
  return {
    stop: null,
    selector,
    tag: "",
    label: "",
    html: null,
    rect: null,
    onScreen: false,
    reason,
    certainty,
  };
}

function invisibleReason(stop: FocusStop): string {
  const focused = stop.focusStyle;
  const base = stop.baseStyle;
  if (!focused || !base) {
    return (
      "Focus reached this element and produced no detectable outline, box-shadow, border or " +
      "background change."
    );
  }

  const unchanged: string[] = [];
  if (focused.outlineStyle === "none" || parseFloat(focused.outlineWidth) === 0) {
    unchanged.push(
      `no outline appeared (outline-style: ${focused.outlineStyle}, outline-width: ${focused.outlineWidth})`,
    );
  }
  if (focused.boxShadow === base.boxShadow) {
    unchanged.push(`the box-shadow stayed ${base.boxShadow}`);
  }
  if (
    focused.borderTopWidth === base.borderTopWidth &&
    focused.borderTopColor === base.borderTopColor
  ) {
    unchanged.push(`the border stayed ${base.borderTopWidth} ${base.borderTopColor}`);
  }
  if (focused.backgroundColor === base.backgroundColor) {
    unchanged.push(`the background stayed ${base.backgroundColor}`);
  }

  return (
    `Focus reached this element and nothing changed: ${unchanged.join("; ")}. ` +
    "A focus indicator is expected here — an outline, a box-shadow, a border or a background " +
    "that differs from the element's resting style."
  );
}

function jumpReason(jump: OrderJump, byStop: Map<number, FocusStop>): string {
  const from = byStop.get(jump.from);
  const to = byStop.get(jump.to);
  const movement =
    jump.direction === "up"
      ? "focus moved back up the page"
      : "focus moved back to the left on the same line";

  const where =
    from && to
      ? `, from ${region(from.top)} ("${from.label}") to ${region(to.top)} ("${to.label}")`
      : "";

  const measured =
    from?.rect && to?.rect
      ? ` Measured from the top of the viewport: ${Math.round(from.rect.y)}px → ${Math.round(to.rect.y)}px.`
      : "";

  return (
    `Stop ${jump.from} → Stop ${jump.to}: ${movement}${where}.${measured} ` +
    "This is geometric evidence, not proof: check whether it matches the reading order you intend."
  );
}

export function buildKeyboardReport(raw: RawKeyboard): KeyboardReport {
  const findings: KeyboardFinding[] = [];
  const stops = raw.focusPath;
  const byStop = new Map(stops.map((s) => [s.n, s]));

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
        "Make sure the element doesn't intercept Tab, or (if it's a dialog) give a clear " +
        "way to leave: press Esc to close it and return focus to the control that opened it.",
      count: 1,
      selectors: [raw.trapSelector],
      occurrences: [
        occurrenceForSelector(
          raw.trapSelector,
          stops,
          "Tab was pressed here and focus stayed on this same element, so the walk could go no further.",
          "conclusive",
        ),
      ],
    });
  }

  if (raw.startedAtTop && raw.cycleComplete && !raw.truncated && raw.unreachable.length > 0) {
    const n = raw.unreachable.length;
    findings.push({
      id: "unreachable-control",
      severity: "serious",
      criterion: CRITERION["unreachable-control"],
      title: `${n} interactive ${plural(n, "control is", "controls are")} not keyboard-reachable`,
      desc:
        `${n} ${plural(n, "element behaves", "elements behave")} as interactive ` +
        "(click handlers or ARIA roles) but Tab never reaches " +
        `${plural(n, "it", "them")}, so ${plural(n, "it's", "they're")} usable by mouse only.`,
      fix:
        "Give each control a native focusable element (<button>, <a href>) or " +
        'add tabindex="0" and keyboard handlers so it can be reached and operated.',
      count: n,
      selectors: raw.unreachable.slice(0, MAX_FINDING_SELECTORS),
      occurrences: raw.unreachable.map((selector) =>
        occurrenceForSelector(
          selector,
          stops,
          "This element looks interactive (a click handler or an ARIA role) but the Tab walk " +
            "never landed on it. Confirm it is meant to be operable.",
          "needs-review",
        ),
      ),
    });
  }

  const invisible = stops.filter((s) => !s.focusVisible);
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
        "Add a clear :focus-visible style (for example outline: 2px solid; outline-offset: 2px;) " +
        "instead of removing the outline with outline: none.",
      count: n,
      selectors: invisible.slice(0, MAX_FINDING_SELECTORS).map((s) => s.selector),
      occurrences: invisible.map((s) => occurrenceOf(s, invisibleReason(s), "conclusive")),
    });
  }

  const inv = readingOrderInversions(stops);
  if (inv.count > 0) {
    findings.push({
      id: "focus-order",
      severity: "moderate",
      criterion: CRITERION["focus-order"],
      title: `Focus order jumps out of sequence ${inv.count} ${plural(inv.count, "time", "times")}`,
      desc:
        "The Tab order doesn't follow the visual reading order (top-to-bottom, " +
        "left-to-right). Focus jumps backwards or upward, which is disorienting " +
        "for keyboard and screen-reader users. Each jump is listed below: whether it is wrong " +
        "depends on the reading order the page intends, so they need a human check.",
      fix:
        "Match the DOM order to the visual order and avoid reordering with CSS " +
        "(order, flex-direction: row-reverse, absolute positioning) or positive tabindex.",
      count: inv.count,
      selectors: inv.selectors.slice(0, MAX_FINDING_SELECTORS),
      occurrences: inv.jumps.map((jump) => {
        const to = byStop.get(jump.to);
        const reason = jumpReason(jump, byStop);
        return to
          ? occurrenceOf(to, reason, "needs-review", { from: jump.from, to: jump.to })
          : {
              ...occurrenceForSelector(jump.selector, stops, reason, "needs-review"),
              from: jump.from,
              to: jump.to,
            };
      }),
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
        "a source of confusing, hard-to-maintain focus behavior.",
      fix:
        'Replace positive tabindex values with tabindex="0" (or none) and let the ' +
        "DOM order define the sequence.",
      count: n,
      selectors: raw.positiveTabindex.slice(0, MAX_FINDING_SELECTORS),
      occurrences: raw.positiveTabindex.map((selector) =>
        occurrenceForSelector(
          selector,
          stops,
          "This element carries a positive tabindex, so it is pulled out of the document order " +
            "and visited before elements that come before it on the page.",
          "conclusive",
        ),
      ),
    });
  }

  findings.sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

  return {
    totalStops: stops.length,
    totalInteractive: raw.totalInteractive,
    reachableInteractive: raw.reachableInteractive,
    truncated: raw.truncated,
    cycleComplete: raw.cycleComplete,
    startedAtTop: raw.startedAtTop,
    stoppedBy: raw.stoppedBy,
    focusPath: stops,
    findings,
  };
}

const MAX_TAB_STOPS = 50;

const MAX_REWIND_STEPS = 25;

export type Viewport = { width: number; height: number };

function hasFocusIndicator(focused: FocusStyle, base: FocusStyle): boolean {
  if (focused.outlineStyle !== "none" && parseFloat(focused.outlineWidth) > 0) return true;
  if (focused.boxShadow !== base.boxShadow && focused.boxShadow !== "none") return true;
  if (focused.borderTopWidth !== base.borderTopWidth) return true;
  if (focused.borderTopColor !== base.borderTopColor) return true;
  if (focused.backgroundColor !== base.backgroundColor) return true;
  if (focused.outlineColor !== base.outlineColor) return true;
  return false;
}

export type FocusPathIO = {
  start(): Promise<void>;
  focusFirst(): Promise<"focused" | "empty" | "failed">;
  relativeToSeed(): Promise<"before" | "at" | "after" | "unknown">;
  pressTab(): Promise<void>;
  pressShiftTab(): Promise<void>;
  readStop(): Promise<FocusProbe>;
  peekStop(): Promise<FocusProbe>;
  readBaseStyles(selectors: string[]): Promise<Record<string, FocusStyle>>;
  readReach(): Promise<FocusReach>;
  end(): Promise<unknown>;
};

type Rewind = { startedAtTop: boolean; startAtSeed: boolean };

async function rewindToTop(io: FocusPathIO): Promise<Rewind> {
  const seeded = await io.focusFirst();
  if (seeded === "empty") return { startedAtTop: true, startAtSeed: false };
  if (seeded === "failed") return { startedAtTop: false, startAtSeed: false };

  for (let i = 0; i < MAX_REWIND_STEPS; i++) {
    await io.pressShiftTab();
    if ((await io.peekStop()).isBody) return { startedAtTop: true, startAtSeed: false };

    if ((await io.relativeToSeed()) === "after") {
      // Nothing precedes the seed: the walk wrapped to the end of the page.
      const again = await io.focusFirst();
      return { startedAtTop: again === "focused", startAtSeed: again === "focused" };
    }
  }

  return { startedAtTop: false, startAtSeed: false };
}

export async function collectFocusPath(
  io: FocusPathIO,
  viewport: Viewport,
  opts: { maxMs?: number; maxStops?: number } = {},
): Promise<RawKeyboard> {
  const maxStops = opts.maxStops ?? MAX_TAB_STOPS;
  const deadline =
    opts.maxMs && opts.maxMs > 0 ? Date.now() + opts.maxMs * 0.6 : Number.POSITIVE_INFINITY;

  await io.start();
  const rewind = await rewindToTop(io);

  const stops: FocusProbe[] = [];
  let trapSelector: string | null = null;
  let cycleComplete = false;
  let truncated = false;
  let stoppedBy: WalkEnd = "cycle";
  let prevSelector: string | null = null;

  try {
    for (let i = 0; i < maxStops; i++) {
      if (Date.now() >= deadline) {
        truncated = true;
        stoppedBy = "timeout";
        break;
      }

      if (i > 0 || !rewind.startAtSeed) await io.pressTab();
      const info = await io.readStop();

      if (info.isBody) {
        cycleComplete = true;
        break;
      }

      if (prevSelector !== null && info.selector === prevSelector) {
        if (stops.length === 1 && info.selector === stops[0].selector) {
          cycleComplete = true;
          stoppedBy = "cycle";
          break;
        }

        if (!info.isIframe && !info.hasShadowRoot) {
          trapSelector = info.selector;
          stoppedBy = "trap";
        } else {
          truncated = true;
          stoppedBy = "opaque";
        }
        break;
      }

      if (stops.length > 0 && info.selector === stops[0].selector) {
        cycleComplete = true;
        break;
      }

      stops.push(info);
      prevSelector = info.selector;

      if (i === maxStops - 1) {
        truncated = true;
        stoppedBy = "cap";
      }
    }

    const unique = [...new Set(stops.map((s) => s.selector))];
    const baseStyles = unique.length === 0 ? {} : await io.readBaseStyles(unique);
    const reach = await io.readReach();

    const focusPath: FocusStop[] = stops.map((s, i) => {
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
        html: s.html,
        rect: r,
        onScreen,
        focusStyle: s.style,
        baseStyle: base ?? null,
      };
    });

    return {
      focusPath,
      startedAtTop: rewind.startedAtTop,
      stoppedBy,
      trapSelector,
      positiveTabindex: reach.positiveTabindex,
      unreachable: reach.unreachable,
      totalInteractive: reach.totalInteractive,
      reachableInteractive: reach.reachableInteractive,
      truncated,
      cycleComplete,
    };
  } finally {
    await io.end().catch(() => {});
  }
}

export async function collectKeyboard(
  page: Page,
  viewport: Viewport,
  opts: { maxMs?: number } = {},
): Promise<KeyboardReport> {
  const raw = await collectFocusPath(
    {
      start: () => page.evaluate(() => window.__accessCheckDom!.focusProbeStart()),
      focusFirst: () => page.evaluate(() => window.__accessCheckDom!.focusFirstStop()),
      relativeToSeed: () => page.evaluate(() => window.__accessCheckDom!.focusRelativeToSeed()),
      pressTab: () => page.keyboard.press("Tab"),
      pressShiftTab: () => page.keyboard.press("Shift+Tab"),
      readStop: () => page.evaluate(() => window.__accessCheckDom!.readFocusedStop()),
      peekStop: () => page.evaluate(() => window.__accessCheckDom!.readFocusedStop(false)),
      readBaseStyles: (selectors) =>
        page.evaluate((sel) => window.__accessCheckDom!.readBaseStyles(sel), selectors),
      readReach: () => page.evaluate(() => window.__accessCheckDom!.readFocusReach()),
      end: () => page.evaluate(() => window.__accessCheckDom!.focusProbeEnd()),
    },
    viewport,
    opts,
  );

  return buildKeyboardReport(raw);
}

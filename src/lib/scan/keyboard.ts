import type { Page } from "playwright-core";
import type { Severity } from "./types";
import type { FocusProbe, FocusReach, FocusStyle } from "./dom/focus";
import { severityOrder } from "./derive";
import type { Translate } from "../i18n/t";

export type KeyboardIssueId =
  | "focus-not-visible"
  | "focus-order"
  | "keyboard-trap"
  | "positive-tabindex"
  | "unreachable-control";

export type FocusRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  docX?: number;
  docY?: number;
};

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
  docX?: number | null;
  docY?: number | null;
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

function region(top: number | null, t: Translate): string {
  if (top === null) return t("keyboard.region.offscreen");
  if (top < 25) return t("keyboard.region.top");
  if (top < 60) return t("keyboard.region.middle");
  return t("keyboard.region.bottom");
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

function invisibleReason(stop: FocusStop, t: Translate): string {
  const focused = stop.focusStyle;
  const base = stop.baseStyle;
  if (!focused || !base) return t("keyboard.invisible.noStyles");

  const unchanged: string[] = [];
  if (focused.outlineStyle === "none" || parseFloat(focused.outlineWidth) === 0) {
    unchanged.push(
      t("keyboard.invisible.noOutline", {
        style: focused.outlineStyle,
        width: focused.outlineWidth,
      }),
    );
  }
  if (focused.boxShadow === base.boxShadow) {
    unchanged.push(t("keyboard.invisible.boxShadow", { value: base.boxShadow }));
  }
  if (
    focused.borderTopWidth === base.borderTopWidth &&
    focused.borderTopColor === base.borderTopColor
  ) {
    unchanged.push(
      t("keyboard.invisible.border", {
        width: base.borderTopWidth,
        color: base.borderTopColor,
      }),
    );
  }
  if (focused.backgroundColor === base.backgroundColor) {
    unchanged.push(t("keyboard.invisible.background", { value: base.backgroundColor }));
  }

  return t("keyboard.invisible.nothingChanged", { unchanged: unchanged.join("; ") });
}

function jumpReason(jump: OrderJump, byStop: Map<number, FocusStop>, t: Translate): string {
  const from = byStop.get(jump.from);
  const to = byStop.get(jump.to);
  const movement = jump.direction === "up" ? t("keyboard.jump.up") : t("keyboard.jump.back");

  const where =
    from && to
      ? t("keyboard.jump.where", {
          fromRegion: region(from.top, t),
          fromLabel: from.label,
          toRegion: region(to.top, t),
          toLabel: to.label,
        })
      : "";

  const measured =
    from?.rect && to?.rect
      ? t("keyboard.jump.measured", {
          from: Math.round(from.rect.y),
          to: Math.round(to.rect.y),
        })
      : "";

  return t("keyboard.jump.reason", { from: jump.from, to: jump.to, movement, where, measured });
}

export function buildKeyboardReport(raw: RawKeyboard, t: Translate): KeyboardReport {
  const findings: KeyboardFinding[] = [];
  const stops = raw.focusPath;
  const byStop = new Map(stops.map((s) => [s.n, s]));

  if (raw.trapSelector) {
    findings.push({
      id: "keyboard-trap",
      severity: "critical",
      criterion: CRITERION["keyboard-trap"],
      title: t("keyboard.trap.title"),
      desc: t("keyboard.trap.desc"),
      fix: t("keyboard.trap.fix"),
      count: 1,
      selectors: [raw.trapSelector],
      occurrences: [
        occurrenceForSelector(raw.trapSelector, stops, t("keyboard.trap.occurrence"), "conclusive"),
      ],
    });
  }

  if (raw.startedAtTop && raw.cycleComplete && !raw.truncated && raw.unreachable.length > 0) {
    const n = raw.unreachable.length;
    findings.push({
      id: "unreachable-control",
      severity: "serious",
      criterion: CRITERION["unreachable-control"],
      title: t("keyboard.unreachable.title", { count: n }),
      desc: t("keyboard.unreachable.desc", { count: n }),
      fix: t("keyboard.unreachable.fix"),
      count: n,
      selectors: raw.unreachable.slice(0, MAX_FINDING_SELECTORS),
      occurrences: raw.unreachable.map((selector) =>
        occurrenceForSelector(
          selector,
          stops,
          t("keyboard.unreachable.occurrence"),
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
      title: t("keyboard.invisible.title", { count: n }),
      desc: t("keyboard.invisible.desc", { count: n }),
      fix: t("keyboard.invisible.fix"),
      count: n,
      selectors: invisible.slice(0, MAX_FINDING_SELECTORS).map((s) => s.selector),
      occurrences: invisible.map((s) => occurrenceOf(s, invisibleReason(s, t), "conclusive")),
    });
  }

  const inv = readingOrderInversions(stops);
  if (inv.count > 0) {
    findings.push({
      id: "focus-order",
      severity: "moderate",
      criterion: CRITERION["focus-order"],
      title: t("keyboard.order.title", { count: inv.count }),
      desc: t("keyboard.order.desc"),
      fix: t("keyboard.order.fix"),
      count: inv.count,
      selectors: inv.selectors.slice(0, MAX_FINDING_SELECTORS),
      occurrences: inv.jumps.map((jump) => {
        const to = byStop.get(jump.to);
        const reason = jumpReason(jump, byStop, t);
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
      title: t("keyboard.tabindex.title", { count: n }),
      desc: t("keyboard.tabindex.desc"),
      fix: t("keyboard.tabindex.fix"),
      count: n,
      selectors: raw.positiveTabindex.slice(0, MAX_FINDING_SELECTORS),
      occurrences: raw.positiveTabindex.map((selector) =>
        occurrenceForSelector(selector, stops, t("keyboard.tabindex.occurrence"), "conclusive"),
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
        docX: r?.docX ?? null,
        docY: r?.docY ?? null,
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
  t: Translate,
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

  return buildKeyboardReport(raw, t);
}

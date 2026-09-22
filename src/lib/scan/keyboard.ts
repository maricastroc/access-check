import type { Page } from "playwright-core";
import type { EvidenceClass, Severity } from "./types";
import type { FocusProbe, FocusReach, FocusScopePart, FocusStyle, RestingStyle } from "./dom/focus";
import type { ElementIdentity } from "./dom/identity";
import { severityOrder } from "./derive";
import type { MessageKey, Translate } from "../i18n/t";

export type KeyboardIssueId =
  | "focus-not-visible"
  | "focus-indicator-unclear"
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
  flowX?: number;
  flowY?: number;
  scrolled?: boolean;
  flowContext?: string;
};

export type FocusStop = {
  n: number;
  selector: string;
  label: string;
  tag: string;
  identity?: ElementIdentity | null;
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
  focusIndicator?: FocusIndicator;
  indicatorOn?: string | null;
  indicatorSharedWith?: number;
};

export type FocusIndicator = "own" | "component" | "shared" | "opaque" | "none";

export type KeyboardCertainty = "conclusive" | "needs-review";

export type WalkEnd = "cycle" | "cap" | "timeout" | "opaque" | "trap";

export type KeyboardOccurrence = {
  stop: number | null;
  selector: string;
  tag: string;
  label: string;
  identity?: ElementIdentity | null;
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
  evidence: EvidenceClass;
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
  identities?: Record<string, ElementIdentity>;
  totalInteractive: number;
  reachableInteractive: number;
  truncated: boolean;
  cycleComplete: boolean;
};

const CRITERION: Record<KeyboardIssueId, string> = {
  "focus-not-visible": "WCAG 2.4.7 · Focus Visible",
  "focus-indicator-unclear": "WCAG 2.4.7 · Focus Visible",
  "focus-order": "WCAG 2.4.3 · Focus Order",
  "keyboard-trap": "WCAG 2.1.2 · No Keyboard Trap",
  "positive-tabindex": "WCAG 2.4.3 · Focus Order",
  "unreachable-control": "WCAG 2.1.1 · Keyboard",
};

const MAX_FINDING_SELECTORS = 8;

const MAX_FINDING_OCCURRENCES = 24;

export type OrderBasis = "flow" | "document" | "viewport";

export type OrderJump = {
  from: number;
  to: number;
  selector: string;
  direction: "up" | "back";
  basis: OrderBasis;
};

export function readingOrderInversions(stops: FocusStop[]): {
  count: number;
  selectors: string[];
  jumps: OrderJump[];
} {
  const BAND_PCT = 3;
  const BAND_PX = 4;

  const positioned = stops.filter(
    (s): s is FocusStop & { top: number; left: number } => s.top !== null && s.left !== null,
  );

  type Point = { x: number; y: number; h: number };
  type Reading = { a: Point; b: Point; band: number; basis: OrderBasis };

  const flowPoint = (s: FocusStop): Point | null =>
    s.rect && s.rect.flowX != null && s.rect.flowY != null
      ? { x: s.rect.flowX, y: s.rect.flowY, h: s.rect.h }
      : null;

  const docPoint = (s: FocusStop): Point | null =>
    s.rect && s.rect.docX != null && s.rect.docY != null
      ? { x: s.rect.docX, y: s.rect.docY, h: s.rect.h }
      : null;

  const viewportPoint = (s: FocusStop & { top: number; left: number }): Point => ({
    x: s.left,
    y: s.top,
    h: s.height ?? 0,
  });

  const sameScrollContext = (a: FocusStop, b: FocusStop): boolean =>
    (a.rect?.flowContext ?? "") === (b.rect?.flowContext ?? "");

  const insideAContainer = (s: FocusStop): boolean => s.rect?.scrolled === true;

  const readingOf = (
    prev: FocusStop & { top: number; left: number },
    cur: FocusStop & { top: number; left: number },
  ): Reading | null => {
    const prevFlow = flowPoint(prev);
    const curFlow = flowPoint(cur);
    if (prevFlow && curFlow) {
      if (!sameScrollContext(prev, cur)) return null;
      return { a: prevFlow, b: curFlow, band: BAND_PX, basis: "flow" };
    }

    if (insideAContainer(prev) || insideAContainer(cur)) return null;

    const prevDoc = docPoint(prev);
    const curDoc = docPoint(cur);
    if (prevDoc && curDoc) {
      return { a: prevDoc, b: curDoc, band: BAND_PX, basis: "document" };
    }

    return {
      a: viewportPoint(prev),
      b: viewportPoint(cur),
      band: BAND_PCT,
      basis: "viewport",
    };
  };

  const sameRow = (a: Point, b: Point, band: number) => {
    if (a.h <= 0 || b.h <= 0) return Math.abs(a.y - b.y) <= band;
    const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return overlap > Math.min(a.h, b.h) / 2;
  };

  const jumps: OrderJump[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < positioned.length; i++) {
    const prev = positioned[i - 1];
    const cur = positioned[i];
    const reading = readingOf(prev, cur);
    if (reading === null) continue;
    const { a, b, band, basis } = reading;

    let direction: OrderJump["direction"] | null = null;
    if (sameRow(a, b, band)) {
      if (b.x < a.x - band) direction = "back";
    } else if (b.y - a.y < -band) direction = "up";
    if (direction === null) continue;

    if (seen.has(cur.selector)) continue;
    seen.add(cur.selector);
    jumps.push({ from: prev.n, to: cur.n, selector: cur.selector, direction, basis });
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
    identity: stop.identity ?? null,
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
  identities: Record<string, ElementIdentity> = {},
): KeyboardOccurrence {
  const stop = stops.find((s) => s.selector === selector);
  if (stop) return occurrenceOf(stop, reason, certainty);
  const identity = identities[selector] ?? null;
  return {
    stop: null,
    selector,
    tag: identity?.tag ?? "",
    label: identity?.name ?? "",
    identity,
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
  if (stop.focusIndicator === "none") unchanged.push(t("keyboard.invisible.component"));

  return t("keyboard.invisible.nothingChanged", { unchanged: unchanged.join("; ") });
}

function measuredOn(
  stop: FocusStop,
  basis: OrderBasis,
  axis: OrderJump["direction"],
): number | null {
  const rect = stop.rect;
  if (!rect) return null;
  const sideways = axis === "back";
  if (basis === "flow") return (sideways ? rect.flowX : rect.flowY) ?? null;
  if (basis === "document") return (sideways ? rect.docX : rect.docY) ?? null;
  return sideways ? rect.x : rect.y;
}

const MEASURED_KEY: Record<OrderBasis, Record<OrderJump["direction"], MessageKey>> = {
  flow: { back: "keyboard.jump.measuredAcross", up: "keyboard.jump.measuredDown" },
  document: { back: "keyboard.jump.measuredAcross", up: "keyboard.jump.measuredDown" },
  viewport: { back: "keyboard.jump.measuredFromLeft", up: "keyboard.jump.measured" },
};

function jumpReason(jump: OrderJump, byStop: Map<number, FocusStop>, t: Translate): string {
  const from = byStop.get(jump.from);
  const to = byStop.get(jump.to);
  const movement = jump.direction === "up" ? t("keyboard.jump.up") : t("keyboard.jump.back");
  const onPage = jump.basis !== "viewport";

  const where =
    !from || !to
      ? ""
      : onPage
        ? t("keyboard.jump.whereLabels", { fromLabel: from.label, toLabel: to.label })
        : t("keyboard.jump.where", {
            fromRegion: region(from.top, t),
            fromLabel: from.label,
            toRegion: region(to.top, t),
            toLabel: to.label,
          });

  const a = from ? measuredOn(from, jump.basis, jump.direction) : null;
  const b = to ? measuredOn(to, jump.basis, jump.direction) : null;

  const measured =
    a === null || b === null
      ? ""
      : t(MEASURED_KEY[jump.basis][jump.direction], {
          from: Math.round(a),
          to: Math.round(b),
        });

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
      evidence: "measured",
      criterion: CRITERION["keyboard-trap"],
      title: t("keyboard.trap.title"),
      desc: t("keyboard.trap.desc"),
      fix: t("keyboard.trap.fix"),
      count: 1,
      selectors: [raw.trapSelector],
      occurrences: [
        occurrenceForSelector(
          raw.trapSelector,
          stops,
          t("keyboard.trap.occurrence"),
          "conclusive",
          raw.identities,
        ),
      ],
    });
  }

  if (raw.unreachable.length > 0) {
    const n = raw.unreachable.length;
    const conclusive = raw.startedAtTop && raw.cycleComplete && !raw.truncated;
    findings.push({
      id: "unreachable-control",
      severity: conclusive ? "serious" : "moderate",
      evidence: conclusive ? "measured" : "heuristic",
      criterion: CRITERION["unreachable-control"],
      title: conclusive
        ? t("keyboard.unreachable.title", { count: n })
        : t("keyboard.notReached.title", { count: n }),
      desc: conclusive
        ? t("keyboard.unreachable.desc", { count: n })
        : t("keyboard.notReached.desc", { count: n }),
      fix: conclusive ? t("keyboard.unreachable.fix") : t("keyboard.notReached.fix"),
      count: n,
      selectors: raw.unreachable.slice(0, MAX_FINDING_SELECTORS),
      occurrences: raw.unreachable
        .slice(0, MAX_FINDING_OCCURRENCES)
        .map((selector) =>
          occurrenceForSelector(
            selector,
            stops,
            conclusive ? t("keyboard.unreachable.occurrence") : t("keyboard.notReached.occurrence"),
            "needs-review",
            raw.identities,
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
      evidence: "measured",
      criterion: CRITERION["focus-not-visible"],
      title: t("keyboard.invisible.title", { count: n }),
      desc: t("keyboard.invisible.desc", { count: n }),
      fix: t("keyboard.invisible.fix"),
      count: n,
      selectors: invisible.slice(0, MAX_FINDING_SELECTORS).map((s) => s.selector),
      occurrences: invisible.map((s) => occurrenceOf(s, invisibleReason(s, t), "conclusive")),
    });
  }

  const unclear = stops.filter(
    (s) => s.focusIndicator === "shared" || s.focusIndicator === "opaque",
  );
  if (unclear.length > 0) {
    const n = unclear.length;
    findings.push({
      id: "focus-indicator-unclear",
      severity: "moderate",
      evidence: "heuristic",
      criterion: CRITERION["focus-indicator-unclear"],
      title: t("keyboard.unclear.title", { count: n }),
      desc: t("keyboard.unclear.desc", { count: n }),
      fix: t("keyboard.unclear.fix"),
      count: n,
      selectors: unclear.slice(0, MAX_FINDING_SELECTORS).map((s) => s.selector),
      occurrences: unclear.map((s) =>
        occurrenceOf(
          s,
          s.focusIndicator === "opaque"
            ? t("keyboard.unclear.opaque")
            : t("keyboard.unclear.occurrence", {
                container: s.indicatorOn ?? "",
                count: s.indicatorSharedWith ?? 0,
              }),
          "needs-review",
        ),
      ),
    });
  }

  const inv = readingOrderInversions(stops);
  if (inv.count > 0) {
    findings.push({
      id: "focus-order",
      severity: "moderate",
      evidence: "heuristic",
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
      evidence: "measured",
      criterion: CRITERION["positive-tabindex"],
      title: t("keyboard.tabindex.title", { count: n }),
      desc: t("keyboard.tabindex.desc"),
      fix: t("keyboard.tabindex.fix"),
      count: n,
      selectors: raw.positiveTabindex.slice(0, MAX_FINDING_SELECTORS),
      occurrences: raw.positiveTabindex.map((selector) =>
        occurrenceForSelector(
          selector,
          stops,
          t("keyboard.tabindex.occurrence"),
          "conclusive",
          raw.identities,
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

const PAINTED: (keyof FocusStyle)[] = [
  "borderBottomWidth",
  "borderBottomColor",
  "backgroundImage",
  "color",
  "textDecorationLine",
  "opacity",
  "transform",
];

const differs = (a: FocusStyle, b: FocusStyle, key: keyof FocusStyle) =>
  a[key] !== undefined && b[key] !== undefined && a[key] !== b[key];

function hasFocusIndicator(focused: FocusStyle, base: FocusStyle): boolean {
  if (focused.outlineStyle !== "none" && parseFloat(focused.outlineWidth) > 0) return true;
  if (focused.boxShadow !== base.boxShadow && focused.boxShadow !== "none") return true;
  if (focused.borderTopWidth !== base.borderTopWidth) return true;
  if (focused.borderTopColor !== base.borderTopColor) return true;
  if (focused.backgroundColor !== base.backgroundColor) return true;
  if (focused.outlineColor !== base.outlineColor) return true;
  return PAINTED.some((key) => differs(focused, base, key));
}

const drawn = (s: FocusStyle) =>
  s.content === undefined || (s.content !== "none" && s.content !== "normal");

const outlined = (s: FocusStyle) => s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;

export function visiblyChanged(focused: FocusStyle, base: FocusStyle): boolean {
  if (!drawn(focused) && !drawn(base)) return false;
  if (drawn(focused) !== drawn(base)) return true;
  if (focused.content !== base.content) return true;
  if (outlined(focused) || outlined(base)) {
    if (
      focused.outlineStyle !== base.outlineStyle ||
      focused.outlineWidth !== base.outlineWidth ||
      focused.outlineColor !== base.outlineColor
    )
      return true;
  }
  return (
    focused.boxShadow !== base.boxShadow ||
    focused.borderTopWidth !== base.borderTopWidth ||
    focused.borderTopColor !== base.borderTopColor ||
    focused.backgroundColor !== base.backgroundColor ||
    PAINTED.some((key) => differs(focused, base, key))
  );
}

export type IndicatorReading = {
  indicator: FocusIndicator;
  on: string | null;
  sharedWith: number;
};

export function focusIndicatorOf(
  focused: FocusStyle,
  focusedScope: FocusScopePart[] | undefined,
  base: RestingStyle,
): IndicatorReading {
  if (hasFocusIndicator(focused, base)) return { indicator: "own", on: null, sharedWith: 0 };
  if (!focusedScope || !base.scope) return { indicator: "none", on: null, sharedWith: 0 };

  const resting = new Map((base.scope ?? []).map((part) => [part.key, part]));
  const current = new Map((focusedScope ?? []).map((part) => [part.key, part]));
  let shared: FocusScopePart | null = null;

  for (const key of new Set([...current.keys(), ...resting.keys()])) {
    const now = current.get(key);
    const before = resting.get(key);
    const changed = !now || !before || visiblyChanged(now.style, before.style);
    if (!changed) continue;
    const part = (now ?? before)!;
    if (!part.shared) return { indicator: "component", on: null, sharedWith: 0 };
    shared ??= part;
  }

  if (shared)
    return { indicator: "shared", on: shared.name || null, sharedWith: shared.sharedWith };
  return { indicator: "none", on: null, sharedWith: 0 };
}

function stripScope(base: RestingStyle): FocusStyle {
  const style: RestingStyle = { ...base };
  delete style.scope;
  return style;
}

export type FocusPathIO = {
  start(): Promise<void>;
  focusFirst(): Promise<"focused" | "empty" | "failed">;
  focusSelector(selector: string): Promise<boolean>;
  relativeToSeed(): Promise<"before" | "at" | "after" | "unknown">;
  pressTab(): Promise<void>;
  pressShiftTab(): Promise<void>;
  readStop(): Promise<FocusProbe>;
  peekStop(): Promise<FocusProbe>;
  readBaseStyles(selectors: string[]): Promise<Record<string, RestingStyle>>;
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
  opts: {
    maxMs?: number;
    maxStops?: number;
    resumeFrom?: Pick<RawKeyboard, "focusPath" | "startedAtTop">;
  } = {},
): Promise<RawKeyboard> {
  const maxStops = opts.maxStops ?? MAX_TAB_STOPS;
  const deadline =
    opts.maxMs && opts.maxMs > 0 ? Date.now() + opts.maxMs * 0.6 : Number.POSITIVE_INFINITY;

  await io.start();

  const earlier = opts.resumeFrom?.focusPath ?? [];
  const lastEarlier = earlier[earlier.length - 1];
  const resumed = lastEarlier ? await io.focusSelector(lastEarlier.selector) : false;
  const rewind = resumed
    ? { startedAtTop: opts.resumeFrom!.startedAtTop, startAtSeed: false }
    : await rewindToTop(io);
  const prior = resumed ? earlier : [];
  const firstSelector = prior[0]?.selector ?? null;

  const stops: FocusProbe[] = [];
  let trapSelector: string | null = null;
  let cycleComplete = false;
  let truncated = false;
  let stoppedBy: WalkEnd = "cycle";
  let prevSelector: string | null = resumed ? lastEarlier!.selector : null;

  const seenFirst = (selector: string) =>
    firstSelector !== null
      ? selector === firstSelector
      : stops.length > 0 && selector === stops[0].selector;

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
        if (prior.length === 0 && stops.length === 1 && info.selector === stops[0].selector) {
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

      if ((prior.length > 0 || stops.length > 0) && seenFirst(info.selector)) {
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

    const walked: FocusStop[] = stops.map((s, i) => {
      const base = baseStyles[s.selector];
      const reading = base ? focusIndicatorOf(s.style, s.scope, base) : null;
      const indicator =
        reading && reading.indicator === "none" && s.hasShadowRoot ? "opaque" : reading?.indicator;
      const focusVisible = indicator ? indicator !== "none" : true;
      const r = s.rect;
      const onScreen =
        r !== null && r.y >= 0 && r.y <= viewport.height && r.x >= 0 && r.x <= viewport.width;
      return {
        n: prior.length + i + 1,
        selector: s.selector,
        label: s.label,
        tag: s.tag,
        identity: s.identity,
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
        baseStyle: base ? stripScope(base) : null,
        ...(reading && indicator
          ? {
              focusIndicator: indicator,
              indicatorOn: reading.on,
              indicatorSharedWith: reading.sharedWith,
            }
          : {}),
      };
    });

    const focusPath = [...prior, ...walked];
    const visited = new Set(focusPath.map((s) => s.selector));
    const unreachable = reach.unreachable.filter((selector) => !visited.has(selector));

    return {
      focusPath,
      startedAtTop: rewind.startedAtTop,
      stoppedBy,
      trapSelector,
      positiveTabindex: reach.positiveTabindex,
      identities: reach.identities,
      unreachable,
      totalInteractive: reach.totalInteractive,
      reachableInteractive: Math.max(0, reach.totalInteractive - unreachable.length),
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
      focusSelector: (selector) =>
        page.evaluate((sel) => window.__accessCheckDom!.focusSelector(sel), selector),
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

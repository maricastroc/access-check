import { accessibleName, identityOf, type ElementIdentity } from "./identity";
import { overlayClear } from "./overlay";
import { flowOffsetOf } from "./rects";
import { cssPath } from "./selector";
import { isRendered } from "./visibility";

export type FocusStyle = {
  outlineStyle: string;
  outlineWidth: string;
  outlineColor: string;
  boxShadow: string;
  borderTopWidth: string;
  borderTopColor: string;
  backgroundColor: string;
};

export type FocusProbe = {
  isBody: boolean;
  selector: string;
  tag: string;
  label: string;
  identity: ElementIdentity | null;
  html: string;
  isIframe: boolean;
  hasShadowRoot: boolean;
  style: FocusStyle;
  rect: {
    x: number;
    y: number;
    w: number;
    h: number;
    docX: number;
    docY: number;
    flowX: number;
    flowY: number;
    scrolled: boolean;
    flowContext: string;
  } | null;
};

export type FocusReach = {
  totalInteractive: number;
  reachableInteractive: number;
  unreachable: string[];
  positiveTabindex: string[];
  identities: Record<string, ElementIdentity>;
};

const INTERACTIVE =
  'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex], ' +
  '[role="button"], [role="link"], [role="checkbox"], [role="radio"], ' +
  '[role="tab"], [role="menuitem"], [role="switch"], [contenteditable="true"], [onclick]';

type ScrollMark = { el: Element; top: number; left: number };

let visited: Element[] = [];
let seeded: Element | null = null;
let restoreTo: Element | null = null;
let restoreScroll: { x: number; y: number } | null = null;
let scrollMarks: ScrollMark[] = [];

function rememberScrolls(): void {
  const root = document.scrollingElement;
  scrollMarks = [];

  for (const el of Array.from(document.querySelectorAll("*"))) {
    if (el === root) continue;
    if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) continue;
    scrollMarks.push({ el, top: el.scrollTop, left: el.scrollLeft });
  }
}

function restoreScrolls(): void {
  for (const mark of scrollMarks) {
    if (!document.contains(mark.el)) continue;
    if (mark.el.scrollTop !== mark.top) mark.el.scrollTop = mark.top;
    if (mark.el.scrollLeft !== mark.left) mark.el.scrollLeft = mark.left;
  }
  scrollMarks = [];
}

function styleOf(el: Element): FocusStyle {
  const cs = getComputedStyle(el);
  return {
    outlineStyle: cs.outlineStyle,
    outlineWidth: cs.outlineWidth,
    outlineColor: cs.outlineColor,
    boxShadow: cs.boxShadow,
    borderTopWidth: cs.borderTopWidth,
    borderTopColor: cs.borderTopColor,
    backgroundColor: cs.backgroundColor,
  };
}

function labelOf(el: Element): string {
  return accessibleName(el) || el.tagName.toLowerCase();
}

const SNIPPET_ATTRS = [
  "id",
  "class",
  "type",
  "role",
  "name",
  "alt",
  "title",
  "placeholder",
  "aria-label",
  "aria-labelledby",
  "aria-hidden",
  "tabindex",
  "disabled",
  "href",
];

function snippetValue(name: string, raw: string): string {
  const value = name === "href" ? raw.trim().split(/[?#]/)[0] : raw.trim();
  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}

function htmlOf(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const parts = [tag];
  for (const name of SNIPPET_ATTRS) {
    const raw = el.getAttribute(name);
    if (raw === null) continue;
    parts.push(raw === "" ? name : `${name}="${snippetValue(name, raw)}"`);
  }

  const text = el.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const inner = text.length > 60 ? `${text.slice(0, 60)}…` : text;
  return `<${parts.join(" ")}>${inner}</${tag}>`;
}

function tabbableCandidates(): Element[] {
  return Array.from(document.querySelectorAll(INTERACTIVE)).filter((el) => {
    const tabindex = el.getAttribute("tabindex");
    if (tabindex !== null && parseInt(tabindex, 10) < 0) return false;
    if ((el as HTMLButtonElement).disabled) return false;
    if (el.matches(":disabled")) return false;
    if (el.closest('[inert], [aria-hidden="true"]')) return false;
    return isRendered(el);
  });
}

export function focusFirstStop(): "focused" | "empty" | "failed" {
  const candidates = tabbableCandidates();
  if (candidates.length === 0) return "empty";

  const positive = candidates
    .map((el) => ({ el, order: parseInt(el.getAttribute("tabindex") || "0", 10) }))
    .filter((x) => x.order > 0)
    .sort((a, b) => a.order - b.order);

  const first = (positive[0]?.el ?? candidates[0]) as HTMLElement;
  try {
    first.focus({ preventScroll: true });
  } catch {
    first.focus?.();
  }
  seeded = first;
  return document.activeElement === first ? "focused" : "failed";
}

export function focusSelector(selector: string): boolean {
  let el: Element | null = null;
  try {
    el = document.querySelector(selector);
  } catch {
    return false;
  }
  if (!el) return false;

  const he = el as HTMLElement;
  try {
    he.focus({ preventScroll: false });
  } catch {
    he.focus?.();
  }
  return document.activeElement === he;
}

export function focusRelativeToSeed(): "before" | "at" | "after" | "unknown" {
  const el = document.activeElement;
  if (!seeded || !el || el === document.body || el === document.documentElement) return "unknown";
  if (el === seeded) return "at";

  const position = seeded.compareDocumentPosition(el);
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return "before";
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return "after";
  return "unknown";
}

export function focusProbeStart(): void {
  overlayClear();
  visited = [];
  seeded = null;
  const active = document.activeElement;
  restoreTo = active && active !== document.body ? active : null;
  restoreScroll = { x: window.scrollX, y: window.scrollY };
  rememberScrolls();
  (active as HTMLElement | null)?.blur?.();
}

export function readFocusedStop(record = true): FocusProbe {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body || el === document.documentElement) {
    return {
      isBody: true,
      selector: "",
      tag: "",
      label: "",
      identity: null,
      html: "",
      isIframe: false,
      hasShadowRoot: false,
      style: styleOf(document.body),
      rect: null,
    };
  }

  if (record) visited.push(el);
  const r = el.getBoundingClientRect();
  const flow = flowOffsetOf(el);
  return {
    isBody: false,
    selector: cssPath(el),
    tag: el.tagName.toLowerCase(),
    label: labelOf(el),
    identity: identityOf(el),
    html: htmlOf(el),
    isIframe: el.tagName === "IFRAME",
    hasShadowRoot: el.shadowRoot !== null,
    style: styleOf(el),
    rect:
      r.width > 0 || r.height > 0
        ? {
            x: r.left,
            y: r.top,
            w: r.width,
            h: r.height,
            docX: r.left + window.scrollX,
            docY: r.top + window.scrollY,
            flowX: r.left + window.scrollX + flow.x,
            flowY: r.top + window.scrollY + flow.y,
            scrolled: flow.scrolled,
            flowContext: flow.context,
          }
        : null,
  };
}

export function readBaseStyles(selectors: string[]): Record<string, FocusStyle> {
  (document.activeElement as HTMLElement | null)?.blur?.();

  const out: Record<string, FocusStyle> = {};
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) out[sel] = styleOf(el);
    } catch {
      continue;
    }
  }
  return out;
}

export function readFocusReach(): FocusReach {
  const seen = new Set(visited);
  const candidates = tabbableCandidates();

  const missed = candidates.filter((el) => !seen.has(el));
  const positive = Array.from(document.querySelectorAll("[tabindex]")).filter(
    (el) => parseInt(el.getAttribute("tabindex") || "0", 10) > 0,
  );

  const identities: Record<string, ElementIdentity> = {};
  for (const el of [...missed, ...positive]) {
    const selector = cssPath(el);
    if (selector && !(selector in identities)) identities[selector] = identityOf(el);
  }

  const unreachable = missed.map((el) => cssPath(el));
  return {
    totalInteractive: candidates.length,
    reachableInteractive: candidates.length - unreachable.length,
    unreachable,
    positiveTabindex: [...new Set(positive.map((el) => cssPath(el)))],
    identities,
  };
}

export function focusProbeEnd(): { x: number; y: number } | null {
  (document.activeElement as HTMLElement | null)?.blur?.();

  if (restoreTo && document.contains(restoreTo)) {
    const el = restoreTo as HTMLElement;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus?.();
    }
  }

  restoreScrolls();

  const scroll = restoreScroll;
  if (scroll) window.scrollTo(scroll.x, scroll.y);

  visited = [];
  seeded = null;
  restoreTo = null;
  restoreScroll = null;
  return scroll;
}

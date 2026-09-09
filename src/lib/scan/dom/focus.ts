import { overlayClear } from "./overlay";
import { cssPath } from "./selector";

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
  html: string;
  isIframe: boolean;
  hasShadowRoot: boolean;
  style: FocusStyle;
  rect: { x: number; y: number; w: number; h: number; docX: number; docY: number } | null;
};

export type FocusReach = {
  totalInteractive: number;
  reachableInteractive: number;
  unreachable: string[];
  positiveTabindex: string[];
};

const INTERACTIVE =
  'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex], ' +
  '[role="button"], [role="link"], [role="checkbox"], [role="radio"], ' +
  '[role="tab"], [role="menuitem"], [role="switch"], [contenteditable="true"], [onclick]';

let visited: Element[] = [];
let seeded: Element | null = null;
let restoreTo: Element | null = null;
let restoreScroll: { x: number; y: number } | null = null;

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

function isVisible(el: Element): boolean {
  const he = el as HTMLElement;
  if (he.offsetParent === null && getComputedStyle(he).position !== "fixed") {
    return el.getClientRects().length > 0;
  }
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function tabbableCandidates(): Element[] {
  return Array.from(document.querySelectorAll(INTERACTIVE)).filter((el) => {
    const tabindex = el.getAttribute("tabindex");
    if (tabindex !== null && parseInt(tabindex, 10) < 0) return false;
    if ((el as HTMLButtonElement).disabled) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return isVisible(el);
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
      html: "",
      isIframe: false,
      hasShadowRoot: false,
      style: styleOf(document.body),
      rect: null,
    };
  }

  if (record) visited.push(el);
  const r = el.getBoundingClientRect();
  return {
    isBody: false,
    selector: cssPath(el),
    tag: el.tagName.toLowerCase(),
    label: labelOf(el),
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

  const unreachable = candidates.filter((el) => !seen.has(el)).map((el) => cssPath(el));
  const positiveTabindex = Array.from(document.querySelectorAll("[tabindex]"))
    .filter((el) => parseInt(el.getAttribute("tabindex") || "0", 10) > 0)
    .map((el) => cssPath(el));

  return {
    totalInteractive: candidates.length,
    reachableInteractive: candidates.length - unreachable.length,
    unreachable,
    positiveTabindex: [...new Set(positiveTabindex)],
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

  const scroll = restoreScroll;
  if (scroll) window.scrollTo(scroll.x, scroll.y);

  visited = [];
  seeded = null;
  restoreTo = null;
  restoreScroll = null;
  return scroll;
}

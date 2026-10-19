import type { ScanResult } from "../../src/lib/scan/types";
import type {
  OVERLAY_HOVER,
  OVERLAY_PICK,
  OVERLAY_VIEW,
  OverlayAway,
  OverlayMark,
  OverlayReport,
} from "../../src/lib/scan/dom/overlay";
import type { PREVIEW_UNDO, PreviewRequest } from "../../src/lib/scan/dom/preview";
import type { FOLLOW_FOCUS } from "../../src/lib/scan/dom/follow";
import type { StopRef } from "../../src/lib/scan/dom/focus";
import type { MessageKey } from "../../src/lib/i18n/t";

export type AuditStage = "structure" | "rules" | "focus" | "report";

export type AuditTask = "audit" | "focus-path";

export type PanelState =
  | { kind: "idle" }
  | { kind: "running"; url: string; task: AuditTask; stage: AuditStage }
  | { kind: "done"; result: ScanResult; deepError?: string }
  | { kind: "error"; message: string; recoverable: boolean }
  | { kind: "unsupported"; url: string; reason: MessageKey };

export type HighlightRequest = {
  type: "panel:highlight";
  marks: OverlayMark[];
  focus: number | null;
  scroll: boolean;
  path: boolean;
  timeoutMs: number;
};

export type HighlightReply = { ok: true; report: OverlayReport } | { ok: false; message: string };

export type PreviewReply = { ok: true; applied: number } | { ok: false; message: string };

export type FollowReply = { ok: true } | { ok: false; message: string };

export type PanelMessage =
  | { type: "panel:hello" }
  | { type: "panel:audit" }
  | { type: "panel:focus-path" }
  | HighlightRequest
  | { type: "panel:continue-walk" }
  | { type: "panel:clear-highlight" }
  | { type: "panel:hover"; key: string | null }
  | ({ type: "panel:preview" } & PreviewRequest)
  | { type: "panel:preview-side"; after: boolean }
  | { type: "panel:preview-clear" }
  | { type: "panel:preview-ended" }
  | { type: typeof PREVIEW_UNDO }
  | { type: "panel:follow"; stops: StopRef[] }
  | { type: "panel:follow-stop" }
  | { type: typeof FOLLOW_FOCUS; stops: number[] }
  | { type: "panel:restore-scroll" }
  | { type: "panel:state"; state: PanelState }
  | { type: "panel:page-changed" }
  | { type: typeof OVERLAY_PICK; key: string }
  | { type: typeof OVERLAY_VIEW; shown: number; total: number; away: OverlayAway }
  | { type: typeof OVERLAY_HOVER; key: string | null };

const BLOCKED: { test: (url: string) => boolean; reason: MessageKey }[] = [
  {
    test: (u) => u.startsWith("chrome://") || u.startsWith("edge://") || u.startsWith("about:"),
    reason: "blocked.chromePages",
  },
  {
    test: (u) => u.startsWith("chrome-extension://") || u.startsWith("moz-extension://"),
    reason: "blocked.extensionPage",
  },
  {
    test: (u) =>
      u.includes("chromewebstore.google.com") || u.includes("chrome.google.com/webstore"),
    reason: "blocked.webStore",
  },
  {
    test: (u) => u.startsWith("view-source:") || u.endsWith(".pdf"),
    reason: "blocked.builtinViewer",
  },
  {
    test: (u) => u.startsWith("file://"),
    reason: "blocked.localFile",
  },
];

function routeOf(hash: string): string {
  return /^#!?\//.test(hash) ? hash : "";
}

export function sameDocument(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    left.hash = routeOf(left.hash);
    right.hash = routeOf(right.hash);
    return left.href === right.href;
  } catch {
    return a === b;
  }
}

export function unsupportedReason(url: string | undefined): MessageKey | null {
  if (!url) return "blocked.noAddress";
  return BLOCKED.find((rule) => rule.test(url))?.reason ?? null;
}

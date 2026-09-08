import type { ScanResult } from "../../src/lib/scan/types";
import type { OverlayMark, OverlayReport } from "../../src/lib/scan/dom/overlay";

export type AuditStage = "structure" | "rules" | "focus" | "report";

export type AuditMode = "expanded" | "quick";

export type PanelState =
  | { kind: "idle" }
  | { kind: "running"; url: string; mode: AuditMode; stage: AuditStage }
  | { kind: "done"; result: ScanResult; deepError?: string }
  | { kind: "error"; message: string; recoverable: boolean }
  | { kind: "unsupported"; url: string; reason: string };

export type HighlightRequest = {
  type: "panel:highlight";
  marks: OverlayMark[];
  focus: number | null;
  scroll: boolean;
  timeoutMs: number;
};

export type HighlightReply = { ok: true; report: OverlayReport } | { ok: false; message: string };

export type PanelMessage =
  | { type: "panel:hello" }
  | { type: "panel:audit"; deep: boolean }
  | { type: "panel:focus-path" }
  | HighlightRequest
  | { type: "panel:clear-highlight" }
  | { type: "panel:restore-scroll" }
  | { type: "panel:state"; state: PanelState };

const BLOCKED: { test: (url: string) => boolean; reason: string }[] = [
  {
    test: (u) => u.startsWith("chrome://") || u.startsWith("edge://") || u.startsWith("about:"),
    reason: "Chrome does not let any extension run on its own pages.",
  },
  {
    test: (u) => u.startsWith("chrome-extension://") || u.startsWith("moz-extension://"),
    reason: "This is an extension page, not a web page.",
  },
  {
    test: (u) =>
      u.includes("chromewebstore.google.com") || u.includes("chrome.google.com/webstore"),
    reason: "Chrome blocks extensions on the Web Store.",
  },
  {
    test: (u) => u.startsWith("view-source:") || u.endsWith(".pdf"),
    reason: "Chrome's built-in viewer has no page for the audit to read.",
  },
  {
    test: (u) => u.startsWith("file://"),
    reason: "Local files need the extension's file access turned on in chrome://extensions.",
  },
];

export function unsupportedReason(url: string | undefined): string | null {
  if (!url) return "This tab has no address the audit can read.";
  return BLOCKED.find((rule) => rule.test(url))?.reason ?? null;
}

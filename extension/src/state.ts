import type { ScanResult } from "../../src/lib/scan/types";

export type PanelState =
  | { kind: "idle" }
  | { kind: "loading"; url: string }
  | { kind: "done"; result: ScanResult }
  | { kind: "error"; message: string; recoverable: boolean }
  | { kind: "unsupported"; url: string; reason: string };

export type PanelMessage =
  | { type: "panel:hello" }
  | { type: "panel:audit" }
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

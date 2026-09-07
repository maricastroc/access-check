import type { ScanResult } from "../../src/lib/scan/types";
import { unsupportedReason, type PanelMessage, type PanelState } from "./state";

const SCREENSHOT_QUALITY = 72;

let state: PanelState = { kind: "idle" };
let auditedTabId: number | null = null;

function publish(next: PanelState): void {
  state = next;
  const message: PanelMessage = { type: "panel:state", state };
  chrome.runtime.sendMessage(message).catch(() => {});
}

async function auditTab(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !tab.windowId) return;

  const blocked = unsupportedReason(tab.url);
  if (blocked) {
    auditedTabId = null;
    publish({ kind: "unsupported", url: tab.url ?? "", reason: blocked });
    return;
  }

  auditedTabId = tab.id;
  publish({ kind: "loading", url: tab.url ?? "" });

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["vendor/axe.min.js", "dom-engine.js", "audit.js"],
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__accessCheckAudit!(),
    });
    if (!result) throw new Error("The audit returned nothing.");

    const shot = await chrome.tabs
      .captureVisibleTab(tab.windowId, { format: "jpeg", quality: SCREENSHOT_QUALITY })
      .catch(() => null);

    publish({ kind: "done", result: { ...(result as ScanResult), screenshot: shot } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const lostAccess = /Cannot access|permission|Frame with ID|No tab with id/i.test(message);
    publish({
      kind: "error",
      recoverable: true,
      message: lostAccess
        ? "This tab moved on, so the one-tab permission lapsed. Click the AccessCheck icon on the page to audit it again."
        : message,
    });
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) await chrome.sidePanel.open({ tabId: tab.id });
  await auditTab(tab);
});

chrome.runtime.onMessage.addListener((message: PanelMessage, _sender, sendResponse) => {
  if (message.type === "panel:hello") {
    sendResponse(state);
    return;
  }

  if (message.type === "panel:audit") {
    void (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || (auditedTabId !== null && tab.id !== auditedTabId)) {
        publish({
          kind: "error",
          recoverable: true,
          message:
            "Auditing another tab needs a click on the AccessCheck icon there: that click is what grants access to it.",
        });
        return;
      }
      await auditTab(tab);
    })();
    sendResponse({ ok: true });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === auditedTabId) {
    auditedTabId = null;
    state = { kind: "idle" };
  }
});

(globalThis as unknown as { __accessCheckAuditTab?: typeof auditTab }).__accessCheckAuditTab =
  auditTab;

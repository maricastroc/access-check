import type { ScanResult } from "../../src/lib/scan/types";

const SCREENSHOT_QUALITY = 72;

const results = new Map<number, ScanResult>();

async function auditTab(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !tab.windowId) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["vendor/axe.min.js", "audit.js"],
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__accessCheckAudit!(),
    });
    if (!result) throw new Error("The audit returned nothing.");

    const shot = await chrome.tabs
      .captureVisibleTab(tab.windowId, { format: "jpeg", quality: SCREENSHOT_QUALITY })
      .catch(() => null);

    const scan: ScanResult = { ...result, screenshot: shot };
    const view = await chrome.tabs.create({ url: chrome.runtime.getURL("report.html") });
    if (view.id) results.set(view.id, scan);
  } catch (e) {
    const view = await chrome.tabs.create({ url: chrome.runtime.getURL("report.html") });
    if (view.id) {
      results.set(view.id, { error: e instanceof Error ? e.message : String(e) } as never);
    }
  }
}

chrome.action.onClicked.addListener(auditTab);

(globalThis as unknown as { __accessCheckAuditTab?: typeof auditTab }).__accessCheckAuditTab =
  auditTab;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg !== "result") return;
  const id = sender.tab?.id;
  sendResponse(id === undefined ? null : (results.get(id) ?? null));
});

chrome.tabs.onRemoved.addListener((tabId) => results.delete(tabId));

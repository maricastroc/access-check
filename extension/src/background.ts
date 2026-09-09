import type { ScanResult } from "../../src/lib/scan/types";
import type { OverlayMark, OverlayReport } from "../../src/lib/scan/dom/overlay";
import { withScoring } from "../../src/lib/scan/scored";
import type { AuditContext } from "./audit";
import { walkChangedPage, warningsAfterDeepAudit } from "./coverage";
import { CONTENT_SIGNATURE } from "../../src/lib/scan/page-ready";
import { axeLocaleFor } from "../../src/lib/i18n/axe-locale";
import { normalizeReportLocale } from "../../src/lib/i18n/locale";
import { translator } from "../../src/lib/i18n/t";
import { DeepAuditCancelled, DeepAuditError, runDeepAudit } from "./deep";
import {
  unsupportedReason,
  type AuditMode,
  type AuditStage,
  type HighlightReply,
  type PanelMessage,
  type PanelState,
} from "./state";

const SCREENSHOT_QUALITY = 72;

const STORE = "panelState";

const LOCALE = normalizeReportLocale(chrome.i18n.getUILanguage());
const t = translator(LOCALE);

let state: PanelState = { kind: "idle" };
let auditedTabId: number | null = null;
let deepTabId: number | null = null;
let running = false;

function publish(next: PanelState): void {
  state = next;
  void chrome.storage.session.set({ [STORE]: { state, auditedTabId, deepTabId } }).catch(() => {});
  const message: PanelMessage = { type: "panel:state", state };
  chrome.runtime.sendMessage(message).catch(() => {});
}

type Stored = { state: PanelState; auditedTabId: number | null; deepTabId?: number | null };

async function restore(): Promise<PanelState> {
  if (state.kind !== "idle") return state;
  const stored = await chrome.storage.session.get(STORE).catch(() => ({}));
  const saved = (stored as Record<string, Stored>)[STORE];
  if (!saved) return state;

  state = saved.state;
  auditedTabId = saved.auditedTabId;

  if (state.kind === "running") {
    if (typeof saved.deepTabId === "number") {
      await chrome.debugger.detach({ tabId: saved.deepTabId }).catch(() => {});
    }
    deepTabId = null;
    publish({
      kind: "error",
      recoverable: true,
      message: t("background.wokeUp"),
    });
  }

  return state;
}

function stage(url: string, mode: AuditMode, at: AuditStage): void {
  publish({ kind: "running", url, mode, stage: at });
}

function describeDeepFailure(e: unknown): string {
  if (e instanceof DeepAuditCancelled) return t("deep.cancelled");
  if (e instanceof DeepAuditError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

async function contentSignature(tabId: number): Promise<string | null> {
  const [frame] = await chrome.scripting
    .executeScript({ target: { tabId }, func: CONTENT_SIGNATURE })
    .catch(() => [{ result: null }]);
  return (frame?.result as string | null) ?? null;
}

async function withFocusPath(
  base: ScanResult,
  tabId: number,
): Promise<{ result: ScanResult; deepError?: string }> {
  const warnings = base.warnings ?? [];
  try {
    deepTabId = tabId;
    const before = await contentSignature(tabId);
    const keyboard = await runDeepAudit(tabId, t);
    const after = await contentSignature(tabId);

    const kept = warningsAfterDeepAudit(warnings, t);
    const withWalk =
      before !== null && after !== null && before !== after ? [...kept, walkChangedPage(t)] : kept;
    return {
      result: withScoring({
        ...base,
        keyboard,
        warnings: withWalk,
        partial: withWalk.length > 0,
      }),
    };
  } catch (e) {
    const message = describeDeepFailure(e);
    const kept = warningsAfterDeepAudit(warnings, t, message);
    return {
      result: withScoring({ ...base, warnings: kept, partial: kept.length > 0 }),
      deepError: message,
    };
  } finally {
    deepTabId = null;
  }
}

async function runAudit(tab: chrome.tabs.Tab, opts: { deep: boolean }): Promise<void> {
  if (!tab.id || !tab.windowId) return;
  if (running) return;
  running = true;

  const mode: AuditMode = opts.deep ? "expanded" : "quick";
  const url = tab.url ?? "";

  try {
    const blocked = unsupportedReason(tab.url);
    if (blocked) {
      auditedTabId = null;
      publish({ kind: "unsupported", url, reason: blocked });
      return;
    }

    auditedTabId = tab.id;
    stage(url, mode, "structure");

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["vendor/axe.min.js", "dom-engine.js", "audit.js"],
    });

    const [{ result: settled }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__accessCheckSettle!(),
    });
    if (!settled) throw new Error(t("background.pageUnreadable"));

    const axeLocale = axeLocaleFor(LOCALE);

    let context: AuditContext = { readiness: settled, primed: false, axeLocale, locale: LOCALE };
    if (opts.deep) {
      const [{ result: primed }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (before: typeof settled) => window.__accessCheckPrime!(before),
        args: [settled],
      });
      context = { readiness: primed?.readiness, primed: true, axeLocale, locale: LOCALE };
    }

    stage(url, mode, "rules");
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (given: AuditContext) => window.__accessCheckAudit!(given),
      args: [context],
    });
    if (!result) throw new Error(t("background.auditEmpty"));

    const shot = await chrome.tabs
      .captureVisibleTab(tab.windowId, { format: "jpeg", quality: SCREENSHOT_QUALITY })
      .catch(() => null);

    const base = { ...(result as ScanResult), screenshot: shot };

    if (!opts.deep) {
      stage(url, mode, "report");
      publish({ kind: "done", result: base });
      return;
    }

    stage(url, mode, "focus");
    const walked = await withFocusPath(base, tab.id);

    stage(url, mode, "report");
    publish({ kind: "done", result: walked.result, deepError: walked.deepError });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const lostAccess = /Cannot access|permission|Frame with ID|No tab with id/i.test(message);
    publish({
      kind: "error",
      recoverable: true,
      message: lostAccess ? t("background.permissionLapsed") : message,
    });
  } finally {
    running = false;
  }
}

async function addFocusPath(): Promise<void> {
  if (running) return;
  if (state.kind !== "done") return;
  if (auditedTabId === null) return;

  const previous = state.result;
  const url = previous.finalUrl;
  running = true;

  try {
    stage(url, "expanded", "focus");
    const walked = await withFocusPath(previous, auditedTabId);
    stage(url, "expanded", "report");
    publish({ kind: "done", result: walked.result, deepError: walked.deepError });
  } finally {
    running = false;
  }
}

async function inAuditedTab<T>(run: (tabId: number) => Promise<T>): Promise<T> {
  if (auditedTabId === null) throw new Error(t("background.nothingAudited"));
  await chrome.scripting.executeScript({
    target: { tabId: auditedTabId },
    files: ["dom-engine.js"],
  });
  return run(auditedTabId);
}

async function showOverlay(
  marks: OverlayMark[],
  focus: number | null,
  opts: { scroll: boolean; timeoutMs: number },
): Promise<OverlayReport> {
  return inAuditedTab(async (tabId) => {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (m: OverlayMark[], f: number | null, o: { scroll: boolean; timeoutMs: number }) =>
        window.__accessCheckDom!.overlayShow(m, f, o),
      args: [marks, focus, opts],
    });
    return result as OverlayReport;
  });
}

async function restoreOverlayScroll(): Promise<void> {
  if (auditedTabId === null) return;
  await chrome.scripting
    .executeScript({
      target: { tabId: auditedTabId },
      func: () => window.__accessCheckDom?.overlayRestoreScroll(),
    })
    .catch(() => {});
}

async function clearOverlay(): Promise<void> {
  if (auditedTabId === null) return;
  await chrome.scripting
    .executeScript({
      target: { tabId: auditedTabId },
      func: () => window.__accessCheckDom?.overlayClear(),
    })
    .catch(() => {});
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) await chrome.sidePanel.open({ tabId: tab.id });
  await runAudit(tab, { deep: true });
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "panel") return;
  port.onDisconnect.addListener(() => {
    void clearOverlay();
  });
});

chrome.runtime.onMessage.addListener((message: PanelMessage, _sender, sendResponse) => {
  if (message.type === "panel:hello") {
    void restore().then(sendResponse);
    return true;
  }

  if (message.type === "panel:focus-path") {
    void restore().then(() => addFocusPath());
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "panel:highlight") {
    void restore()
      .then(() =>
        showOverlay(message.marks, message.focus, {
          scroll: message.scroll,
          timeoutMs: message.timeoutMs,
        }),
      )
      .then(
        (report) => sendResponse({ ok: true, report } satisfies HighlightReply),
        (e: unknown) =>
          sendResponse({
            ok: false,
            message:
              e instanceof Error && /Cannot access|No tab with id|Frame with ID/i.test(e.message)
                ? t("background.tabUnreachable")
                : t("background.markupFailed"),
          } satisfies HighlightReply),
      );
    return true;
  }

  if (message.type === "panel:restore-scroll") {
    void restore()
      .then(() => restoreOverlayScroll())
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "panel:clear-highlight") {
    void restore()
      .then(() => clearOverlay())
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "panel:audit") {
    const deep = message.deep;
    void (async () => {
      await restore();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || (auditedTabId !== null && tab.id !== auditedTabId)) {
        publish({
          kind: "error",
          recoverable: true,
          message: t("background.otherTab"),
        });
        return;
      }
      await runAudit(tab, { deep });
    })();
    sendResponse({ ok: true });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === auditedTabId) {
    auditedTabId = null;
    publish({ kind: "idle" });
  }
});

const seams = globalThis as unknown as {
  __accessCheckAuditTab?: (tab: chrome.tabs.Tab, opts?: { deep: boolean }) => Promise<void>;
  __accessCheckDeepAudit?: typeof addFocusPath;
  __accessCheckForgetState?: () => void;
};
seams.__accessCheckAuditTab = (tab, opts) => runAudit(tab, { deep: opts?.deep ?? false });
seams.__accessCheckDeepAudit = addFocusPath;
seams.__accessCheckForgetState = () => {
  state = { kind: "idle" };
  auditedTabId = null;
};

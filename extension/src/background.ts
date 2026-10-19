import type { ScanResult } from "../../src/lib/scan/types";
import type { KeyboardReport } from "../../src/lib/scan/keyboard";
import type { StopRef } from "../../src/lib/scan/dom/focus";
import type { OverlayMark, OverlayOptions, OverlayReport } from "../../src/lib/scan/dom/overlay";
import { PREVIEW_UNDO, type PreviewRequest } from "../../src/lib/scan/dom/preview";
import { workQueue } from "../../src/lib/report/findings";
import { stopCandidates } from "../../src/lib/report/occurrences";
import { withScoring } from "../../src/lib/scan/scored";
import type { AuditContext } from "./audit";
import { walkChangedPage, warningsAfterDeepAudit } from "./coverage";
import { CONTENT_SIGNATURE } from "../../src/lib/scan/page-ready";
import { axeLocaleFor } from "../../src/lib/i18n/axe-locale";
import { translator, type MessageKey } from "../../src/lib/i18n/t";
import { browserLocale, LOCALE_KEY, readLocale } from "./locale-preference";
import { DeepAuditCancelled, DeepAuditError, runDeepAudit } from "./deep";
import {
  sameDocument,
  unsupportedReason,
  type AuditTask,
  type AuditStage,
  type HighlightReply,
  type PanelMessage,
  type FollowReply,
  type PanelState,
  type PreviewReply,
} from "./state";

const SCREENSHOT_QUALITY = 72;

const STORE = "panelState";

let locale = browserLocale();
let t = translator(locale);

async function syncLocale(): Promise<void> {
  locale = await readLocale();
  t = translator(locale);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && LOCALE_KEY in changes) void syncLocale();
});

let state: PanelState = { kind: "idle" };
let auditedTabId: number | null = null;
let deepTabId: number | null = null;
let previewTabId: number | null = null;
let running = false;

function save(): void {
  void chrome.storage.session
    .set({ [STORE]: { state, auditedTabId, deepTabId, previewTabId } })
    .catch(() => {});
}

function publish(next: PanelState): void {
  state = next;
  save();
  const message: PanelMessage = { type: "panel:state", state };
  chrome.runtime.sendMessage(message).catch(() => {});
}

type Stored = {
  state: PanelState;
  auditedTabId: number | null;
  deepTabId?: number | null;
  previewTabId?: number | null;
};

async function restore(): Promise<PanelState> {
  await syncLocale();
  if (state.kind !== "idle") return state;
  const stored = await chrome.storage.session.get(STORE).catch(() => ({}));
  const saved = (stored as Record<string, Stored>)[STORE];
  if (!saved) return state;

  state = saved.state;
  auditedTabId = saved.auditedTabId;
  previewTabId = saved.previewTabId ?? null;

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

function stage(url: string, task: AuditTask, at: AuditStage): void {
  publish({ kind: "running", url, task, stage: at });
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

async function stopsForTargets(
  tabId: number,
  base: ScanResult,
  keyboard: KeyboardReport,
): Promise<Record<string, number> | undefined> {
  const selectors = stopCandidates(workQueue(base).flatMap((g) => g.findings));
  if (selectors.length === 0 || keyboard.focusPath.length === 0) return undefined;
  const stops: StopRef[] = keyboard.focusPath.map(({ n, selector }) => ({ n, selector }));
  const [frame] = await chrome.scripting
    .executeScript({
      target: { tabId },
      func: (s: StopRef[], sel: string[]) => window.__accessCheckDom!.matchStops(s, sel),
      args: [stops, selectors],
    })
    .catch(() => [undefined]);
  return (frame?.result as Record<string, number> | undefined) ?? undefined;
}

async function withFocusPath(
  base: ScanResult,
  tabId: number,
  resumeFrom?: ScanResult["keyboard"],
): Promise<{ result: ScanResult; deepError?: string }> {
  const warnings = base.warnings ?? [];
  try {
    deepTabId = tabId;
    const before = await contentSignature(tabId);
    const walked = await runDeepAudit(tabId, t, resumeFrom);
    const after = await contentSignature(tabId);
    const targetStops = await stopsForTargets(tabId, base, walked);
    const keyboard = targetStops ? { ...walked, targetStops } : walked;

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

async function runAudit(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !tab.windowId) return;
  if (running) return;
  running = true;
  await restore();

  const url = tab.url ?? "";

  try {
    await clearOverlay();
    await endPreview();
    await endFollow();
    const blocked = unsupportedReason(tab.url);
    if (blocked) {
      auditedTabId = null;
      publish({ kind: "unsupported", url, reason: blocked });
      return;
    }

    auditedTabId = tab.id;
    stage(url, "audit", "structure");

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["vendor/axe.min.js", "dom-engine.js", "audit.js"],
    });

    const [{ result: settled }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__accessCheckSettle!(),
    });
    if (!settled) throw new Error(t("background.pageUnreadable"));

    const axeLocale = axeLocaleFor(locale);

    const [{ result: primed }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (before: typeof settled) => window.__accessCheckPrime!(before),
      args: [settled],
    });
    const context: AuditContext = {
      readiness: primed?.readiness ?? settled,
      primed: true,
      axeLocale,
      locale,
    };

    stage(url, "audit", "rules");
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

    stage(url, "audit", "report");
    publish({ kind: "done", result: base });
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

async function addFocusPath(opts: { resume?: boolean } = {}): Promise<void> {
  if (running) return;
  if (state.kind !== "done") return;
  if (auditedTabId === null) return;

  const previous = state.result;
  const url = previous.finalUrl;
  const tabId = auditedTabId;
  running = true;

  try {
    if (!(await inFront(tabId))) {
      publish({ kind: "done", result: previous, deepError: t("background.tabBehind") });
      return;
    }
    if (!(await showsPage(tabId, url))) {
      await clearOverlay();
      publish({ kind: "done", result: previous, deepError: t("background.tabUnreachable") });
      return;
    }
    await endPreview();
    await endFollow();
    stage(url, "focus-path", "focus");
    const walked = await withFocusPath(
      previous,
      tabId,
      opts.resume ? previous.keyboard : undefined,
    );
    if (!(await showsPage(tabId, url))) {
      publish({ kind: "done", result: previous, deepError: t("deep.tabMovedOn") });
      return;
    }
    stage(url, "focus-path", "report");
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

class MovedOn extends Error {}

class Behind extends Error {}

async function inFront(tabId: number): Promise<boolean> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  return tab?.active !== false;
}

function drawFailure(e: unknown, otherwise: MessageKey = "background.markupFailed"): string {
  if (e instanceof Behind) return t("background.tabBehind");
  if (e instanceof MovedOn) return t("background.tabUnreachable");
  if (e instanceof Error && /Cannot access|No tab with id|Frame with ID/i.test(e.message)) {
    return t("background.tabUnreachable");
  }
  return t(otherwise);
}

async function showsPage(tabId: number, audited: string): Promise<boolean> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  return Boolean(tab?.url) && sameDocument(tab!.url!, audited);
}

async function onAuditedPage(tabId: number): Promise<boolean> {
  if (state.kind !== "done") return true;
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  return !tab?.url || sameDocument(tab.url, state.result.finalUrl);
}

async function showOverlay(
  marks: OverlayMark[],
  focus: number | null,
  opts: OverlayOptions,
): Promise<OverlayReport> {
  if (auditedTabId !== null && !(await onAuditedPage(auditedTabId))) {
    await clearOverlay();
    throw new MovedOn();
  }
  if (auditedTabId !== null && !(await inFront(auditedTabId))) throw new Behind();
  return inAuditedTab(async (tabId) => {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (m: OverlayMark[], f: number | null, o: OverlayOptions) =>
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

async function hoverOverlay(key: string | null): Promise<void> {
  if (auditedTabId === null || state.kind !== "done") return;
  await chrome.scripting
    .executeScript({
      target: { tabId: auditedTabId },
      func: (k: string | null) => window.__accessCheckDom?.overlayHover(k),
      args: [key],
    })
    .catch(() => {});
}

async function showPreview(request: PreviewRequest): Promise<number> {
  if (running) throw new Error("busy");
  if (auditedTabId !== null && !(await onAuditedPage(auditedTabId))) {
    await clearOverlay();
    throw new MovedOn();
  }
  if (auditedTabId !== null && !(await inFront(auditedTabId))) throw new Behind();
  return inAuditedTab(async (tabId) => {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (r: PreviewRequest) => window.__accessCheckDom!.previewShow(r),
      args: [request],
    });
    previewTabId = tabId;
    save();
    return (result as { applied: number }).applied;
  });
}

async function sidePreview(after: boolean): Promise<void> {
  if (previewTabId === null) return;
  await chrome.scripting
    .executeScript({
      target: { tabId: previewTabId },
      func: (a: boolean) => window.__accessCheckDom?.previewSide(a),
      args: [after],
    })
    .catch(() => {});
}

async function endPreview(tell = true): Promise<void> {
  const tabId = previewTabId ?? auditedTabId;
  const was = previewTabId !== null;
  previewTabId = null;
  if (was) save();
  if (tabId !== null) {
    await chrome.scripting
      .executeScript({
        target: { tabId },
        func: () => window.__accessCheckDom?.previewClear() ?? false,
      })
      .catch(() => {});
  }
  if (was && tell) {
    const message: PanelMessage = { type: "panel:preview-ended" };
    chrome.runtime.sendMessage(message).catch(() => {});
  }
}

async function startFollow(stops: StopRef[]): Promise<void> {
  if (running) throw new Error("busy");
  if (auditedTabId !== null && !(await onAuditedPage(auditedTabId))) throw new MovedOn();
  await inAuditedTab((tabId) =>
    chrome.scripting.executeScript({
      target: { tabId },
      func: (s: StopRef[]) => window.__accessCheckDom!.followStart(s),
      args: [stops],
    }),
  );
}

async function endFollow(): Promise<void> {
  if (auditedTabId === null) return;
  await chrome.scripting
    .executeScript({
      target: { tabId: auditedTabId },
      func: () => window.__accessCheckDom?.followStop(),
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
  await runAudit(tab);
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "panel") return;
  port.onDisconnect.addListener(() => {
    void restore()
      .then(clearOverlay)
      .then(() => endPreview(false))
      .then(endFollow);
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

  if (message.type === "panel:continue-walk") {
    void restore().then(() => addFocusPath({ resume: true }));
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "panel:highlight") {
    void restore()
      .then(() =>
        showOverlay(message.marks, message.focus, {
          scroll: message.scroll,
          path: message.path,
          timeoutMs: message.timeoutMs,
        }),
      )
      .then(
        (report) => sendResponse({ ok: true, report } satisfies HighlightReply),
        (e: unknown) =>
          sendResponse({
            ok: false,
            message: drawFailure(e),
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

  if (message.type === "panel:hover") {
    void restore()
      .then(() => hoverOverlay(message.key))
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "panel:preview") {
    const { css, text, undo, lang, avoid } = message;
    void restore()
      .then(() => showPreview({ css, text, undo, lang, avoid }))
      .then(
        (applied) => sendResponse({ ok: true, applied } satisfies PreviewReply),
        (e: unknown) =>
          sendResponse({
            ok: false,
            message: drawFailure(e, "background.previewFailed"),
          } satisfies PreviewReply),
      );
    return true;
  }

  if (message.type === "panel:preview-side") {
    void restore()
      .then(() => sidePreview(message.after))
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "panel:preview-clear") {
    void restore()
      .then(() => endPreview(false))
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "panel:follow") {
    void restore()
      .then(() => startFollow(message.stops))
      .then(
        () => sendResponse({ ok: true } satisfies FollowReply),
        (e: unknown) => sendResponse({ ok: false, message: drawFailure(e) } satisfies FollowReply),
      );
    return true;
  }

  if (message.type === "panel:follow-stop") {
    void restore()
      .then(endFollow)
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === PREVIEW_UNDO) {
    void restore().then(() => {
      previewTabId = null;
      save();
    });
    return;
  }

  if (message.type === "panel:clear-highlight") {
    void restore()
      .then(() => clearOverlay())
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "panel:audit") {
    void (async () => {
      await restore();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || (auditedTabId !== null && tab.id !== auditedTabId)) {
        await clearOverlay();
        publish({
          kind: "error",
          recoverable: true,
          message: t("background.otherTab"),
        });
        return;
      }
      await runAudit(tab);
    })();
    sendResponse({ ok: true });
  }
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  const url = change.url;
  if (!url && change.status !== "complete") return;
  void restore().then(async () => {
    if (tabId !== auditedTabId || state.kind !== "done") return;
    if (url && !sameDocument(url, state.result.finalUrl)) await clearOverlay();
    const message: PanelMessage = { type: "panel:page-changed" };
    chrome.runtime.sendMessage(message).catch(() => {});
  });
});

chrome.tabs.onActivated.addListener(() => {
  void restore().then(async () => {
    if (auditedTabId === null || state.kind !== "done") return;
    if (state.deepError === t("background.tabBehind") && (await inFront(auditedTabId))) {
      publish({ kind: "done", result: state.result });
    }
    const message: PanelMessage = { type: "panel:page-changed" };
    chrome.runtime.sendMessage(message).catch(() => {});
  });
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (!change.url && change.status !== "loading") return;
  void restore().then(() => (tabId === previewTabId ? endPreview() : undefined));
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void restore().then(() =>
    previewTabId !== null && tabId !== previewTabId ? endPreview() : undefined,
  );
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void restore().then(() => {
    if (tabId === previewTabId) {
      previewTabId = null;
      save();
    }
    if (tabId !== auditedTabId) return;
    auditedTabId = null;
    publish({ kind: "idle" });
  });
});

const seams = globalThis as unknown as {
  __accessCheckAuditTab?: (tab: chrome.tabs.Tab) => Promise<void>;
  __accessCheckDeepAudit?: typeof addFocusPath;
  __accessCheckContinueWalk?: () => Promise<void>;
  __accessCheckForgetState?: () => void;
};
seams.__accessCheckAuditTab = (tab) => runAudit(tab);
seams.__accessCheckDeepAudit = addFocusPath;
seams.__accessCheckContinueWalk = () => addFocusPath({ resume: true });
seams.__accessCheckForgetState = () => {
  state = { kind: "idle" };
  auditedTabId = null;
};

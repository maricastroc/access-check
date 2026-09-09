import {
  buildKeyboardReport,
  collectFocusPath,
  type KeyboardReport,
} from "../../src/lib/scan/keyboard";
import type { FocusStyle } from "../../src/lib/scan/dom/focus";
import { translator, type Translate } from "../../src/lib/i18n/t";

export class DeepAuditError extends Error {
  constructor(
    message: string,
    readonly recoverable = true,
  ) {
    super(message);
  }
}

export class DeepAuditCancelled extends DeepAuditError {
  constructor(t: Translate = translator()) {
    super(t("deep.cancelledPlain"));
  }
}

const TAB_KEY = {
  key: "Tab",
  code: "Tab",
  windowsVirtualKeyCode: 9,
  nativeVirtualKeyCode: 9,
} as const;

const SHIFT = 8;

const MAX_MS = 20_000;

function attachReason(message: string, t: Translate): string {
  if (/already attached/i.test(message)) return t("deep.alreadyAttached");
  if (/Cannot access|chrome:\/\/|extensions gallery|devtools/i.test(message)) {
    return t("deep.notDebuggable");
  }
  return t("deep.attachRefused", { reason: message });
}

async function inPage<T>(tabId: number, fn: () => T): Promise<T> {
  const [frame] = await chrome.scripting.executeScript({ target: { tabId }, func: fn });
  return frame.result as T;
}

export async function runDeepAudit(tabId: number, t: Translate): Promise<KeyboardReport> {
  const target = { tabId };
  let detachFailure: string | null = null;
  let report: KeyboardReport | null = null;

  try {
    await chrome.debugger.attach(target, "1.3");
  } catch (e) {
    throw new DeepAuditError(attachReason(e instanceof Error ? e.message : String(e), t));
  }

  let cancelled = false;
  let attached = true;
  const onDetach = (source: chrome.debugger.Debuggee, reason: string) => {
    if (source.tabId !== tabId) return;
    attached = false;
    if (reason === "canceled_by_user") cancelled = true;
  };
  chrome.debugger.onDetach.addListener(onDetach);

  const tab = async (modifiers: number) => {
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      modifiers,
      ...TAB_KEY,
    });
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
      type: "keyUp",
      modifiers,
      ...TAB_KEY,
    });
  };

  try {
    const viewport = await inPage(tabId, () => window.__accessCheckDom!.readViewport());

    const raw = await collectFocusPath(
      {
        start: () => inPage(tabId, () => window.__accessCheckDom!.focusProbeStart()),
        focusFirst: () => inPage(tabId, () => window.__accessCheckDom!.focusFirstStop()),
        relativeToSeed: () => inPage(tabId, () => window.__accessCheckDom!.focusRelativeToSeed()),
        pressTab: () => tab(0),
        pressShiftTab: () => tab(SHIFT),
        readStop: () => inPage(tabId, () => window.__accessCheckDom!.readFocusedStop()),
        peekStop: () => inPage(tabId, () => window.__accessCheckDom!.readFocusedStop(false)),
        readBaseStyles: async (selectors) => {
          const [frame] = await chrome.scripting.executeScript({
            target,
            func: (sel: string[]) => window.__accessCheckDom!.readBaseStyles(sel),
            args: [selectors],
          });
          return frame.result as Record<string, FocusStyle>;
        },
        readReach: () => inPage(tabId, () => window.__accessCheckDom!.readFocusReach()),
        end: () => inPage(tabId, () => window.__accessCheckDom!.focusProbeEnd()),
      },
      viewport,
      { maxMs: MAX_MS },
    );

    report = buildKeyboardReport(raw, t);
  } catch (e) {
    if (cancelled) throw new DeepAuditCancelled(t);
    const message = e instanceof Error ? e.message : String(e);
    throw new DeepAuditError(
      /No tab with given id|detached|Inspected target/i.test(message)
        ? t("deep.tabMovedOn")
        : t("deep.unfinished", { reason: message }),
    );
  } finally {
    chrome.debugger.onDetach.removeListener(onDetach);
    if (attached) {
      const released = await chrome.debugger
        .detach(target)
        .then(() => true)
        .catch(async () => {
          await new Promise((r) => setTimeout(r, 100));
          return chrome.debugger
            .detach(target)
            .then(() => true)
            .catch(() => false);
        });

      if (!released) {
        detachFailure = t("deep.notReleased");
      }
    }
  }

  if (detachFailure !== null) throw new DeepAuditError(detachFailure);
  return report!;
}

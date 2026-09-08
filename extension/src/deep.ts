import {
  buildKeyboardReport,
  collectFocusPath,
  type KeyboardReport,
} from "../../src/lib/scan/keyboard";
import type { FocusStyle } from "../../src/lib/scan/dom/focus";

export class DeepAuditError extends Error {
  constructor(
    message: string,
    readonly recoverable = true,
  ) {
    super(message);
  }
}

export class DeepAuditCancelled extends DeepAuditError {
  constructor() {
    super("The deep audit was cancelled, so the focus path was not walked.");
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

function attachReason(message: string): string {
  if (/already attached/i.test(message)) {
    return "Another debugger is attached to this tab — usually DevTools. Close it and run the deep audit again.";
  }
  if (/Cannot access|chrome:\/\/|extensions gallery|devtools/i.test(message)) {
    return "Chrome does not allow debugging this page, so the focus path cannot be walked here.";
  }
  return `Chrome refused to attach the debugger: ${message}`;
}

async function inPage<T>(tabId: number, fn: () => T): Promise<T> {
  const [frame] = await chrome.scripting.executeScript({ target: { tabId }, func: fn });
  return frame.result as T;
}

export async function runDeepAudit(tabId: number): Promise<KeyboardReport> {
  const target = { tabId };
  let detachFailure: string | null = null;
  let report: KeyboardReport | null = null;

  try {
    await chrome.debugger.attach(target, "1.3");
  } catch (e) {
    throw new DeepAuditError(attachReason(e instanceof Error ? e.message : String(e)));
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

    report = buildKeyboardReport(raw);
  } catch (e) {
    if (cancelled) throw new DeepAuditCancelled();
    const message = e instanceof Error ? e.message : String(e);
    throw new DeepAuditError(
      /No tab with given id|detached|Inspected target/i.test(message)
        ? "The tab moved on while the focus path was being walked, so the deep audit stopped."
        : `The deep audit could not finish: ${message}`,
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
        detachFailure =
          "Chrome would not release the debugger. The banner on the tab may stay until you reload it.";
      }
    }
  }

  if (detachFailure !== null) throw new DeepAuditError(detachFailure);
  return report!;
}

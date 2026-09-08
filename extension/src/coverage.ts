import type { ScanResult, ScanWarning, ScanWarningCode } from "../../src/lib/scan/types";
import type { KeyboardReport } from "../../src/lib/scan/keyboard";

const KEYBOARD_MISSING: ScanWarning = {
  code: "keyboard-skipped",
  message:
    'The focus path was not walked. Use "Walk the focus path now" to send real Tab presses through the page.',
};

const LAZY_CONTENT: ScanWarning = {
  code: "lazy-content-skipped",
  message:
    "Content that only renders once you scroll to it was not loaded, so anything below the fold " +
    "was not read. The expanded audit walks the page first; this reading did not.",
};

export const UNAVAILABLE: ScanWarning[] = [
  KEYBOARD_MISSING,
  LAZY_CONTENT,
  {
    code: "contexts-skipped",
    message: "The mobile-viewport pass needs viewport emulation, not available in this build.",
  },
  {
    code: "audits-skipped",
    message: "The reduced-motion check needs media emulation, not available in this build.",
  },
  {
    code: "verification-skipped",
    message: "Fixes are not tested here: this build never writes to the audited page.",
  },
];

export function warningsAfterDeepAudit(
  warnings: ScanWarning[],
  failure?: string | null,
): ScanWarning[] {
  const rest = warnings.filter((w) => w.code !== "keyboard-skipped");
  if (!failure) return rest;
  return [
    { code: "keyboard-skipped", message: `The focus path was not walked. ${failure}` },
    ...rest,
  ];
}

export const WALK_CHANGED_PAGE: ScanWarning = {
  code: "walk-changed-page",
  message:
    "Typing Tab through this page opened content that stayed open — a menu, a panel or a " +
    "suggestion list. The rules had already read the page by then, so auditing again can give a " +
    "slightly different reading of the same page.",
};

export const CONTENT_UNSETTLED: ScanWarning = {
  code: "content-unsettled",
  message:
    "The page was still changing after six seconds of waiting, so the rules read a moving target. " +
    "Findings from a page that has not settled are not reliable, and will differ between runs.",
};

export function warningsAfterPriming(warnings: ScanWarning[], primed: boolean): ScanWarning[] {
  return primed ? warnings.filter((w) => w.code !== "lazy-content-skipped") : warnings;
}

export type AuditScope = {
  kicker: string;
  lead: string | null;
  summary: string;
  note: string;
  badge: string | null;
  focusPath: "walked" | "truncated" | "partial" | "skipped";
};

const SKIPPED_CHECKS: ScanWarningCode[] = [
  "keyboard-skipped",
  "contexts-skipped",
  "audits-skipped",
  "verification-skipped",
  "lazy-content-skipped",
];

const CAVEAT_PHRASE: Partial<Record<ScanWarningCode, string>> = {
  "content-unsettled": "page still changing",
  "walk-changed-page": "the walk opened content",
  "cross-origin-assets": "some styles unreadable",
  "screenshot-unavailable": "no screenshot",
  "markers-skipped": "no markers on the screenshot",
  "fix-details-skipped": "fix details missing",
  "stream-interrupted": "reading interrupted",
};

function coverageSummary(result: ScanResult): string {
  const warnings = result.warnings ?? [];
  const missing = warnings.filter((w) => SKIPPED_CHECKS.includes(w.code)).length;
  const caveat = warnings.map((w) => CAVEAT_PHRASE[w.code]).find(Boolean);

  if (missing > 0) {
    return `Partial coverage · ${missing} check${missing === 1 ? "" : "s"} unavailable`;
  }
  if (caveat) return `Partial coverage · ${caveat}`;
  return "Every check this build runs completed";
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function focusPathLines(keyboard: KeyboardReport): { line: string; notes: string[] } {
  const stops = keyboard.focusPath.length;
  const total = keyboard.totalInteractive;
  const rest = Math.max(0, total - stops);
  const notes: string[] = [];

  if (total === 0 && stops === 0) {
    return { line: "No keyboard-focusable controls were found on this page.", notes };
  }

  const line =
    keyboard.stoppedBy === "cycle"
      ? `Walked the full tab order: ${plural(stops, "stop", "stops")} across ${plural(total, "detected control", "detected controls")}.`
      : `Checked the first ${stops} of ${plural(total, "detected control", "detected controls")}.`;

  if (!keyboard.startedAtTop) {
    notes.push(
      `Partial: the walk could not be taken back to the first control, so these ${plural(stops, "stop", "stops")} start somewhere inside the tab order.`,
    );
  }

  const leftover =
    rest > 0
      ? `the remaining ${plural(rest, "control was", "controls were")} not evaluated`
      : "it may not have reached the end of the tab order";

  if (keyboard.stoppedBy === "cap") {
    notes.push(`Partial: the walk reached its ${stops}-stop limit, so ${leftover}.`);
  } else if (keyboard.stoppedBy === "timeout") {
    notes.push(
      `Partial: the walk ran out of time after ${plural(stops, "stop", "stops")}, so ${leftover}.`,
    );
  } else if (keyboard.stoppedBy === "opaque") {
    notes.push(
      `Partial: focus moved into an iframe or a shadow root, which this build cannot see into, so ${leftover}.`,
    );
  } else if (keyboard.stoppedBy === "trap") {
    notes.push(`Partial: focus was trapped at stop ${stops}, so ${leftover}.`);
  }

  return { line, notes };
}

const STILL_MISSING =
  "The mobile viewport, reduced motion and verified fixes are still not checked here, so this " +
  "is not a full audit.";

export function auditScope(result: ScanResult): AuditScope {
  const walked = result.keyboard;

  if (!walked) {
    const why = (result.warnings ?? []).find((w) => w.code === "keyboard-skipped")?.message;
    return {
      kicker: "Quick audit score",
      lead: "Preliminary result",
      summary: coverageSummary(result),
      badge: null,
      note:
        `The focus path was not verified, so nothing here can speak for keyboard use. ${why ?? ""} ` +
        STILL_MISSING,
      focusPath: "skipped",
    };
  }

  if (!walked.startedAtTop) {
    return {
      kicker: "Current-tab audit score",
      lead: null,
      summary: coverageSummary(result),
      badge: "Includes keyboard focus path · partial",
      note:
        `The focus path could not be taken back to the first control, so these ${walked.focusPath.length} ` +
        `stops start somewhere inside the page rather than at the beginning of the tab order. ${STILL_MISSING}`,
      focusPath: "partial",
    };
  }

  if (walked.truncated) {
    return {
      kicker: "Current-tab audit score",
      lead: null,
      summary: coverageSummary(result),
      badge: `Includes keyboard focus path · stopped at ${walked.focusPath.length}`,
      note:
        `The focus path stopped early after ${walked.focusPath.length} stops, so anything past ` +
        `that point was never reached. ${STILL_MISSING}`,
      focusPath: "truncated",
    };
  }

  return {
    kicker: "Current-tab audit score",
    lead: null,
    summary: coverageSummary(result),
    badge: "Includes keyboard focus path",
    note: `The focus path was walked to the end with real Tab presses. ${STILL_MISSING}`,
    focusPath: "walked",
  };
}

export function crossOriginWarning(assets: { styleSheets: number; media: number }): ScanWarning {
  const parts: string[] = [];
  if (assets.styleSheets > 0) {
    parts.push(`${assets.styleSheets} stylesheet${assets.styleSheets === 1 ? "" : "s"}`);
  }
  if (assets.media > 0) {
    parts.push(`${assets.media} media file${assets.media === 1 ? "" : "s"}`);
  }

  const single = assets.styleSheets + assets.media === 1;

  return {
    code: "cross-origin-assets",
    message:
      `${parts.join(" and ")} on this page ${single ? "comes" : "come"} from another origin, ` +
      "which this build is not allowed to fetch. Rules that read those files — the " +
      "orientation-lock check — report as needing review instead of passing. Everything read " +
      "from the page itself is unaffected.",
  };
}

import type { ScanResult, ScanWarning, ScanWarningCode } from "../../src/lib/scan/types";
import type { KeyboardReport } from "../../src/lib/scan/keyboard";
import type { MessageKey, Translate } from "../../src/lib/i18n/t";

export function unavailableWarnings(t: Translate): ScanWarning[] {
  return [
    { code: "keyboard-skipped", message: t("warning.keyboardSkipped") },
    { code: "lazy-content-skipped", message: t("warning.lazyContent") },
    { code: "contexts-skipped", message: t("warning.contextsSkipped") },
    { code: "audits-skipped", message: t("warning.auditsSkipped") },
    { code: "verification-skipped", message: t("warning.verificationSkipped") },
  ];
}

export function warningsAfterDeepAudit(
  warnings: ScanWarning[],
  t: Translate,
  failure?: string | null,
): ScanWarning[] {
  const rest = warnings.filter((w) => w.code !== "keyboard-skipped");
  if (!failure) return rest;
  return [
    { code: "keyboard-skipped", message: t("warning.keyboardFailed", { reason: failure }) },
    ...rest,
  ];
}

export function walkChangedPage(t: Translate): ScanWarning {
  return { code: "walk-changed-page", message: t("warning.walkChangedPage") };
}

export function contentUnsettled(t: Translate): ScanWarning {
  return { code: "content-unsettled", message: t("warning.contentUnsettled") };
}

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

const CAVEAT_KEY: Partial<Record<ScanWarningCode, MessageKey>> = {
  "content-unsettled": "caveat.contentUnsettled",
  "walk-changed-page": "caveat.walkChangedPage",
  "cross-origin-assets": "caveat.crossOriginAssets",
  "screenshot-unavailable": "caveat.screenshotUnavailable",
  "markers-skipped": "caveat.markersSkipped",
  "fix-details-skipped": "caveat.fixDetailsSkipped",
  "stream-interrupted": "caveat.streamInterrupted",
};

function coverageSummary(result: ScanResult, t: Translate): string {
  const warnings = result.warnings ?? [];
  const missing = warnings.filter((w) => SKIPPED_CHECKS.includes(w.code)).length;
  const caveat = warnings.map((w) => CAVEAT_KEY[w.code]).find(Boolean);

  if (missing > 0) {
    return t("coverage.partialChecks", { count: missing });
  }
  if (caveat) return t("coverage.partialCaveat", { caveat: t(caveat) });
  return t("coverage.complete");
}

export function focusPathLines(
  keyboard: KeyboardReport,
  t: Translate,
): { line: string; notes: string[] } {
  const stops = keyboard.focusPath.length;
  const total = keyboard.totalInteractive;
  const rest = Math.max(0, total - stops);
  const notes: string[] = [];

  if (total === 0 && stops === 0) {
    return { line: t("focusPath.none"), notes };
  }

  const stopsText = t("unit.stop", { count: stops });
  const controlsText = t("unit.detectedControl", { count: total });

  const line =
    keyboard.stoppedBy === "cycle"
      ? t("focusPath.full", { stops: stopsText, controls: controlsText })
      : t("focusPath.firstOnly", { count: stops, stops, controls: controlsText });

  if (!keyboard.startedAtTop) {
    notes.push(t("focusPath.notFromTop", { stops: stopsText }));
  }

  const leftover =
    rest > 0 ? t("focusPath.leftoverSome", { count: rest }) : t("focusPath.leftoverNone");

  if (keyboard.stoppedBy === "cap") {
    notes.push(t("focusPath.stoppedByCap", { stops, leftover }));
  } else if (keyboard.stoppedBy === "timeout") {
    notes.push(t("focusPath.stoppedByTimeout", { stops: stopsText, leftover }));
  } else if (keyboard.stoppedBy === "opaque") {
    notes.push(t("focusPath.stoppedByOpaque", { leftover }));
  } else if (keyboard.stoppedBy === "trap") {
    notes.push(t("focusPath.stoppedByTrap", { stops, leftover }));
  }

  return { line, notes };
}

export function auditScope(result: ScanResult, t: Translate): AuditScope {
  const walked = result.keyboard;
  const rest = t("scope.stillMissing");

  if (!walked) {
    const why = (result.warnings ?? []).find((w) => w.code === "keyboard-skipped")?.message;
    return {
      kicker: t("scope.quickKicker"),
      lead: t("scope.preliminaryLead"),
      summary: coverageSummary(result, t),
      badge: null,
      note: t("scope.skippedNote", { why: why ?? "", rest }),
      focusPath: "skipped",
    };
  }

  if (!walked.startedAtTop) {
    return {
      kicker: t("scope.currentTabKicker"),
      lead: null,
      summary: coverageSummary(result, t),
      badge: t("scope.partialBadge"),
      note: t("scope.partialNote", { stops: walked.focusPath.length, rest }),
      focusPath: "partial",
    };
  }

  if (walked.truncated) {
    return {
      kicker: t("scope.currentTabKicker"),
      lead: null,
      summary: coverageSummary(result, t),
      badge: t("scope.truncatedBadge", { stops: walked.focusPath.length }),
      note: t("scope.truncatedNote", { stops: walked.focusPath.length, rest }),
      focusPath: "truncated",
    };
  }

  return {
    kicker: t("scope.currentTabKicker"),
    lead: null,
    summary: coverageSummary(result, t),
    badge: t("scope.walkedBadge"),
    note: t("scope.walkedNote", { rest }),
    focusPath: "walked",
  };
}

export function crossOriginWarning(
  assets: { styleSheets: number; media: number },
  t: Translate,
): ScanWarning {
  const parts: string[] = [];
  if (assets.styleSheets > 0) {
    parts.push(t("unit.styleSheet", { count: assets.styleSheets }));
  }
  if (assets.media > 0) {
    parts.push(t("unit.mediaFile", { count: assets.media }));
  }

  const single = assets.styleSheets + assets.media === 1;

  return {
    code: "cross-origin-assets",
    message: t("warning.crossOrigin", {
      assets: parts.join(` ${t("unit.and")} `),
      verb: single ? t("warning.crossOriginComes") : t("warning.crossOriginCome"),
    }),
  };
}

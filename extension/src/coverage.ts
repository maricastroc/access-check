import type { ScanResult, ScanWarning, ScanWarningCode } from "../../src/lib/scan/types";
import { focusPathLines } from "../../src/lib/report/focus-coverage";
import type { MessageKey, Translate } from "../../src/lib/i18n/t";

export { focusPathLines };

export function unavailableWarnings(t: Translate): ScanWarning[] {
  return [
    { code: "keyboard-skipped", message: t("warning.keyboardSkipped") },
    { code: "lazy-content-skipped", message: t("warning.lazyContent") },
    { code: "contexts-skipped", message: t("warning.contextsSkipped") },
    { code: "reduced-motion-skipped", message: t("warning.reducedMotionSkipped") },
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
  "reduced-motion-skipped",
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

export function auditScope(result: ScanResult, t: Translate): AuditScope {
  const walked = result.keyboard;
  const rest = t("scope.stillMissing");

  if (!walked) {
    const why = (result.warnings ?? []).find((w) => w.code === "keyboard-skipped")?.message;
    return {
      kicker: t("scope.currentTabKicker"),
      lead: t("scope.focusPathPending"),
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

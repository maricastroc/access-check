import type { ScanResult } from "@/lib/scan/types";
import { buildFindings, type FindingView } from "../../lib/report/findings";
import { violationsBehindScore } from "@/lib/scan/scored";
import { scoreBreakdown, type ScoreBreakdown } from "../../lib/report/score";
import { buildWcagReading, type WcagReadingModel } from "../../lib/report/wcag";
import { clamp, safeHost } from "./shared";

export type FocusPoint = {
  n: number;
  cx: number;
  cy: number;
  visible: boolean;
  label: string;
  docX?: number;
  docY?: number;
};

export type ReportView = {
  findings: FindingView[];
  breakdown: ScoreBreakdown;
  wcag: WcagReadingModel;
  focusPoints: FocusPoint[];
  host: string;
};

export function buildReportView(result: ScanResult): ReportView {
  const focusPoints: FocusPoint[] = (result.keyboard?.focusPath ?? [])
    .filter((s) => s.left !== null && s.top !== null)
    .map((s) => ({
      n: s.n,
      cx: clamp(s.left! + (s.width ?? 0) / 2, 2, 98),
      cy: clamp(s.top! + (s.height ?? 0) / 2, 2, 98),
      visible: s.focusVisible,
      label: s.label,
      ...(s.docX != null && s.docY != null
        ? { docX: s.docX + (s.rect?.w ?? 0) / 2, docY: s.docY + (s.rect?.h ?? 0) / 2 }
        : null),
    }));

  return {
    findings: buildFindings(result),
    breakdown: scoreBreakdown(violationsBehindScore(result), result.score),
    wcag: buildWcagReading(result.violations),
    focusPoints,
    host: safeHost(result.finalUrl),
  };
}

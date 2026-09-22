import type { ScanResult } from "@/lib/scan/types";
import { buildFindings, type FindingView } from "../../lib/report/findings";
import { violationsBehindScore } from "@/lib/scan/scored";
import { scoreBreakdown, type ScoreBreakdown } from "../../lib/report/score";
import { wcagReadingOf, type WcagReadingModel } from "../../lib/report/wcag";
import { safeHost } from "./shared";

export type ReportView = {
  findings: FindingView[];
  breakdown: ScoreBreakdown;
  wcag: WcagReadingModel;
  host: string;
};

export function buildReportView(result: ScanResult): ReportView {
  return {
    findings: buildFindings(result),
    breakdown: scoreBreakdown(violationsBehindScore(result), result.score),
    wcag: wcagReadingOf(result),
    host: safeHost(result.finalUrl),
  };
}

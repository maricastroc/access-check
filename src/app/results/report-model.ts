import type { ScanResult } from "@/lib/scan/types";
import { workQueue, type FindingView, type QueueGroup } from "../../lib/report/findings";
import type { Translate } from "@/lib/i18n/t";
import { wcagReadingOf, type WcagReadingModel } from "../../lib/report/wcag";
import { safeHost } from "./shared";

export type ReportView = {
  groups: { group: QueueGroup; findings: FindingView[] }[];
  findings: FindingView[];
  wcag: WcagReadingModel;
  host: string;
};

export function buildReportView(result: ScanResult): ReportView {
  const groups = workQueue(result);
  return {
    groups,
    findings: groups.flatMap((g) => g.findings),
    wcag: wcagReadingOf(result),
    host: safeHost(result.finalUrl),
  };
}

export function workLine(result: ScanResult, t: Translate): string {
  const groups = workQueue(result);
  const inGroup = (group: QueueGroup) =>
    groups.find((g) => g.group === group)?.findings.length ?? 0;
  const toFix = inGroup("fix");
  const toCheck = inGroup("check");
  return [
    toFix > 0 ? t("panel.toFix", { count: toFix }) : null,
    toCheck > 0 ? t("panel.toCheck", { count: toCheck }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

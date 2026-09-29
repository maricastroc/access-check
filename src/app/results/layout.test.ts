import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const view = read("./results-view.tsx");
const band = read("./summary-band.tsx");
const mobile = read("./mobile-report.tsx");
const about = read("./about-audit.tsx");
const margin = read("./findings-margin.tsx");
const frame = read("./evidence-frame.tsx");
const states = read("./states.tsx");
const pdf = read("../report/summary-page.tsx");
const markdown = read("../../lib/report/markdown.ts");
const queue = read("./work-queue.tsx");
const detail = read("../../components/ui/finding-detail.tsx");
const row = read("../../components/ui/finding-row.tsx");

const FIXED_WORDS = /(>|\})\s*[A-Za-z][a-z]+( [a-z]+)*\s*(<|\{)/g;

describe("the top of the results says only what the reader needs first", () => {
  it("keeps the verdict, its note, the work left and the WCAG chips", () => {
    expect(band).toContain("{t(STANDING_LABEL[standing])}");
    expect(band).toContain("{t(STANDING_NOTE[standing])}");
    expect(band).toContain("const work = workLine(result, t);");
    expect(band).toContain("<WcagChips");
  });

  it("drops the counts row, the summary paragraph and the share of what is left", () => {
    expect(band).not.toContain("result.summary");
    expect(band).not.toContain("countedSeverities");
    expect(band).not.toContain("PriorityList");
    expect(band).not.toContain("counts.passed");
  });

  it("no longer opens the page with the partial report", () => {
    expect(view).not.toContain("PartialNotice");
    expect(states).not.toContain("PartialNotice");
  });
});

describe("what describes the audit lives in About this audit", () => {
  it("holds the coverage, the checks that passed and the provenance", () => {
    expect(about).toContain('t("results.partialReport")');
    expect(about).toContain("<WarningList");
    expect(about).toContain('t("results.runAgainMoreTime")');
    expect(about).toContain("result.passed.map");
    expect(about).toContain("<ProvenancePanel");
  });

  it("starts closed and says at a glance whether the report is partial", () => {
    expect(about).toContain("<details");
    expect(about).not.toMatch(/<details[^>]*\sopen/);
    expect(about).toContain('partial ? t("results.partialReport")');
    expect(about).toContain('stale ? t("standing.staleTitle")');
    expect(about).toContain("<StaleScoringNotice");
  });

  it("comes after the screenshot and the queue, on the desktop and on a phone", () => {
    expect(view.indexOf("<AboutAudit")).toBeGreaterThan(view.indexOf("<FindingsMargin"));
    expect(mobile).toContain("<AboutAudit");
  });

  it("left the screenshot and the queue to the finding", () => {
    expect(frame).not.toContain("ProvenancePanel");
    expect(margin).not.toContain("checksPassedLabel");
  });
});

describe("the share of what is left is gone from every report", () => {
  it("is not in the phone layout, the PDF or the Markdown export", () => {
    expect(mobile).not.toContain("PriorityList");
    expect(pdf).not.toContain("PriorityList");
    expect(pdf).not.toContain("priority.kicker");
    expect(markdown).not.toContain("priority.kicker");
    expect(markdown).not.toContain("priority.share");
  });
});

describe("the findings read as one work queue", () => {
  it("is grouped the same way on the desktop and on a phone", () => {
    expect(margin).toContain("<WorkQueue");
    expect(mobile).toContain("<WorkQueue");
    expect(view).toContain("groups={view.groups}");
  });

  it("keeps To fix open and folds the other groups until they are needed", () => {
    expect(queue).toContain('new Set(["fix"])');
    expect(queue).toContain("<details");
    expect(queue).toContain("setOpened(new Set([...opened, holding]))");
  });

  it("no longer keeps the manual reviews in a list of their own", () => {
    expect(margin).not.toContain("result.incomplete");
    expect(margin).not.toContain("reviewGuidance");
  });

  it("tells a manual review how to check it instead of calling it a guess", () => {
    expect(detail).toContain('finding.kind === "manual-review" ? (');
    expect(detail).toContain('finding.kind !== "manual-review"');
    expect(detail).toContain("guide.steps.map");
  });
});

describe("an opened finding reads where, what to change, why, then the details", () => {
  const body = detail.slice(detail.indexOf("export function FindingDetail"));

  it("keeps that order on the desktop and on a phone", () => {
    const order = ["<Where", "<WhatToChange", "<Why", "<Details"].map((part) => body.indexOf(part));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(body.indexOf("<HowToCheck")).toBeLessThan(body.indexOf("<Why"));
  });

  it("keeps the fix's own test inside what to change", () => {
    const change = detail.slice(
      detail.indexOf("function WhatToChange"),
      detail.indexOf("function HowToCheck"),
    );
    expect(change).toContain("<VerdictSeal");
    expect(detail).not.toContain("detail.verificationResult");
  });

  it("ties where to the screenshot and folds the measurements into the details", () => {
    const where = detail.slice(
      detail.indexOf("function Where"),
      detail.indexOf("function WhatToChange"),
    );
    expect(where).toContain('t("results.showOnScreenshot")');
    expect(where).toContain("finding.noMarkerReason");
    const details = detail.slice(detail.indexOf("function Details"));
    expect(details).toContain("<details");
    expect(details).not.toMatch(/<details[^>]*\sopen/);
    expect(details).toContain("finding.occurrences");
    const why = detail.slice(detail.indexOf("function Why"), detail.indexOf("function Details"));
    expect(why).not.toContain("finding.occurrences");
  });

  it("leaves the screenshot without a second copy of the element and its code", () => {
    expect(frame).not.toContain("elementAndCode");
    expect(frame).not.toContain("CodeBlock");
    expect(frame).not.toContain("ElementIdentityLine");
    expect(mobile).not.toContain('t("results.showOnScreenshot")');
  });
});

describe("the results screens write no words of their own", () => {
  it.each([
    ["summary-band.tsx", band],
    ["mobile-report.tsx", mobile],
    ["about-audit.tsx", about],
    ["findings-margin.tsx", margin],
    ["evidence-frame.tsx", frame],
    ["work-queue.tsx", queue],
    ["finding-row.tsx", row],
    ["finding-detail.tsx", detail],
  ])("%s takes its text from the catalog", (_, source) => {
    expect(source.match(FIXED_WORDS) ?? []).toEqual([]);
  });
});

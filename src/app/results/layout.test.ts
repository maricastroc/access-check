import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/messages/en";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const view = read("./results-view.tsx");
const caseFile = read("./case-file.tsx");
const surface = read("./investigation-surface.tsx");
const mobile = read("./mobile-report.tsx");
const about = read("./about-audit.tsx");
const figure = read("./evidence-figure.tsx");
const states = read("./states.tsx");
const pdf = read("../report/summary-page.tsx");
const markdown = read("../../lib/report/markdown.ts");
const summary = read("../../components/investigation/summary.tsx");
const list = read("../../components/investigation/finding-list.tsx");
const chain = read("../../components/investigation/evidence-chain.tsx");
const marks = read("../../components/investigation/capture-marks.tsx");
const nav = read("../../components/investigation/occurrence-nav.tsx");
const sequence = read("../../components/investigation/focus-sequence.tsx");
const connector = read("../../components/investigation/connector.tsx");

const FIXED_WORDS = /(>|\})\s*[A-Za-z][a-z]+( [a-z]+)*\s*(<|\{)/g;
const CODE_WORDS = /^[>}]\s*(else|return|const|let|if|for|while|case|default|try|catch|finally)\b/;

const fixedWords = (source: string) =>
  (source.match(FIXED_WORDS) ?? []).filter((match) => !CODE_WORDS.test(match));

describe("the top of the case file says only what the reader needs first", () => {
  it("leads with where the page stands, then the work left, by number", () => {
    const order = [
      "STANDING_LABEL[standing]",
      "STANDING_NOTE[standing]",
      't("panel.toFix"',
      't("panel.toCheck"',
      't("summary.passed"',
    ].map((token) => summary.indexOf(token));
    expect(order.every((at) => at > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(caseFile).toContain("<WcagChips");
  });

  it("drops the score, the summary paragraph and the share of what is left", () => {
    for (const source of [summary, caseFile]) {
      expect(source).not.toContain("result.score");
      expect(source).not.toContain("result.summary");
      expect(source).not.toContain("PriorityList");
    }
  });

  it("no longer opens the page with the partial report", () => {
    expect(view).not.toContain("PartialNotice");
    expect(states).not.toContain("PartialNotice");
  });

  it("says when the reading came from an older scoring model", () => {
    expect(caseFile).toContain("scoringIsCurrent(result)");
    expect(caseFile).toContain('t("standing.staleTitle")');
  });
});

describe("what describes the audit lives in About this audit", () => {
  it("holds the coverage, the checks that passed and the provenance", () => {
    expect(about).toContain('t("results.partialReport")');
    expect(about).toContain("<WarningList");
    expect(about).toContain('t("results.runAgainMoreTime")');
    expect(about).toContain("passedChecks(result, t).map");
    expect(about).toContain("<ProvenancePanel");
  });

  it("starts closed and says at a glance whether the report is partial", () => {
    expect(about).toContain("<details");
    expect(about).not.toMatch(/<details[^>]*\sopen/);
    expect(about).toContain('partial ? t("results.partialReport")');
    expect(about).toContain("<StaleScoringNotice");
  });

  it("comes after the investigation, on the desktop and on a phone", () => {
    expect(view.indexOf("<AboutAudit")).toBeGreaterThan(view.indexOf("<CaseFile"));
    expect(mobile).toContain("<AboutAudit");
  });

  it("leaves the capture to the investigation", () => {
    expect(surface).not.toContain("ProvenancePanel");
    expect(caseFile).not.toContain("checksPassedLabel");
  });
});

describe("the share of what is left is gone from every report", () => {
  it("is not in the phone layout, the PDF or the Markdown export", () => {
    expect(mobile).not.toContain("PriorityList");
    expect(pdf).not.toContain("PriorityList");
    expect(markdown).not.toContain("priority.kicker");
    expect(markdown).not.toContain("priority.share");
  });
});

describe("the findings read as one queue, on every screen", () => {
  it("is the same list on the desktop and on a phone", () => {
    expect(view).toContain("<CaseFile");
    expect(mobile).toContain("<CaseFile");
    expect(caseFile).toContain("<FindingList");
    expect(view).toContain("groups={view.groups}");
  });

  it("keeps To fix open and folds the other groups until they are needed", () => {
    expect(list).toContain('new Set(["fix"])');
    expect(list).toContain("<details");
    expect(list).toContain("setOpened(new Set([...opened, holding]))");
  });

  it("titles each row as a heading that holds its toggle, not a heading inside a button", () => {
    expect(list).toMatch(/<h3[^>]*>\s*<button/);
    expect(list).toContain("aria-expanded={open}");
  });
});

describe("an opened finding reads as a chain of evidence", () => {
  it("draws its stations from what the engine knows, not a fixed form", () => {
    expect(chain).toContain("chainOf(finding, occ)");
    expect(chain).toContain("chain.stations.map");
    expect(chain).not.toContain('t("panel.whatToChange")');
  });

  it("keeps a manual review human, with steps to check it", () => {
    expect(chain).toContain('t("chain.decide")');
    expect(chain).toContain("reviewGuidance(f.ruleId, t)");
    expect(chain).toContain("guide.steps.map");
  });

  it("keeps how a fix was tested inside the verdict, folded", () => {
    const verdict = chain.slice(chain.indexOf("function Verdict("), chain.indexOf("const END_KEY"));
    expect(verdict).toContain('t("chain.howVerified")');
    expect(verdict).toContain("<details");
    expect(verdict).not.toMatch(/<details[^>]*\sopen/);
    expect(verdict).toContain('t("detail.sandboxNote", { host })');
  });

  it("names the same occurrence the same way on the page and in the chain", () => {
    expect(marks).toContain("occurrenceTag(current.n, current.index, current.total)");
    expect(marks).toContain("occurrenceTag(m.n, m.index, m.total)");
    expect(nav).toContain("occurrenceTag(n, i, total)");
    expect(view).toContain("occurrenceTag(inv.selected.n, inv.occIndex, inv.occurrences.length)");
  });

  it("says a mark is missing without saying the element is", () => {
    expect(surface).toContain('t("chain.notOnCaptureHere", { tag: selectedTag ?? "" })');
    expect(en["chain.notOnCapture"]).not.toMatch(/not on any capture|outside/i);
  });

  it("explains a guess instead of presenting it as a settled failure", () => {
    expect(chain).toContain('f.evidence === "heuristic"');
    expect(chain).toContain('t("evidence.heuristic.title")');
  });
});

describe("the capture stays readable when the page is crowded", () => {
  it("names the choice of marks as one labelled choice, not a row of links", () => {
    const layers = surface.slice(surface.indexOf("export function LayerSwitch("));
    expect(layers).toContain("<fieldset");
    expect(layers).toContain("<legend className=");
    expect(layers).toContain('type="radio"');
    expect(en["layers.label"]).toBe("Marks");
    expect(en["layers.none"]).toBe("None");
  });

  it("keeps tags beside the element and lets the other occurrences give way", () => {
    expect(marks).toContain("{ x: a.x - i, y: a.y - i - h - 2, w, h }");
    expect(marks).toContain("const SIBLING_TAGS = 4;");
    expect(marks).toContain("siblings.length > SIBLING_TAGS && !beside.has(m.index)");
  });

  it("draws one leader from the bracket and no second label beside it", () => {
    expect(connector).toContain("const sy = ar.top - 4;");
    expect(connector).not.toContain("label");
    expect(view).not.toContain("chipOf");
  });
});

describe("the focus path is a sequence, drawn near the current stop", () => {
  it("draws every stop quietly until one is picked, then only its neighbourhood", () => {
    expect(marks).toContain("const NEIGHBOURS = 2;");
    expect(marks).toContain("wholePath &&");
    expect(marks).toContain(
      ".filter((s) => wholePath || currentStop === null || near(s.n) || s.n === currentStop)",
    );
    expect(sequence).toContain('t("panel.showComplete")');
  });

  it("names the stepping controls and says which stop is current", () => {
    expect(sequence).toContain('aria-label={t("panel.previousStop")}');
    expect(sequence).toContain('aria-label={t("panel.nextStop")}');
    expect(sequence).toContain('aria-current={now ? "step" : undefined}');
  });
});

describe("the results screens write no words of their own", () => {
  it.each([
    ["case-file.tsx", caseFile],
    ["investigation-surface.tsx", surface],
    ["mobile-report.tsx", mobile],
    ["about-audit.tsx", about],
    ["evidence-figure.tsx", figure],
    ["summary.tsx", summary],
    ["finding-list.tsx", list],
    ["evidence-chain.tsx", chain],
    ["capture-marks.tsx", marks],
    ["focus-sequence.tsx", sequence],
  ])("%s takes its text from the catalog", (_, source) => {
    expect(fixedWords(source)).toEqual([]);
  });
});

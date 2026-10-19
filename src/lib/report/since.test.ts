import { describe, expect, it } from "vitest";
import type { ScanResult, ScanViolation, Severity } from "@/lib/scan/types";
import type { KeyboardReport } from "@/lib/scan/keyboard";
import { sinceLast } from "./since";

const rule = (id: string, severity: Severity, where: string): ScanViolation => ({
  id,
  severity,
  title: id,
  criterion: "WCAG 4.1.2 · Name, Role, Value",
  where,
  desc: "d",
  fix: "f",
  nodes: 1,
  verification: "unchecked",
});

function audit(violations: ScanViolation[], over: Partial<ScanResult> = {}): ScanResult {
  const count = (s: Severity) => violations.filter((v) => v.severity === s).length;
  return {
    url: "https://example.com/",
    finalUrl: "https://example.com/",
    title: "Example",
    scannedElements: 10,
    durationMs: 1000,
    screenshot: null,
    score: 70,
    counts: {
      critical: count("critical"),
      serious: count("serious"),
      moderate: count("moderate"),
      minor: count("minor"),
      passed: 30,
      bestPractice: 0,
      manualReview: 0,
    },
    summary: "s",
    violations,
    incomplete: [],
    bestPractice: [],
    passed: [],
    markers: [],
    fixFirst: [],
    ...over,
  };
}

function walked(selectors: string[]): KeyboardReport {
  return {
    totalStops: 3,
    totalInteractive: 3,
    reachableInteractive: 3,
    truncated: false,
    cycleComplete: true,
    startedAtTop: true,
    stoppedBy: "cycle",
    focusPath: [],
    findings:
      selectors.length > 0
        ? [
            {
              id: "focus-not-visible",
              severity: "serious",
              evidence: "measured",
              criterion: "WCAG 2.4.7 · Focus Visible",
              title: "No visible focus indicator",
              desc: "d",
              fix: "f",
              count: selectors.length,
              selectors,
              occurrences: [],
            },
          ]
        : [],
  } as KeyboardReport;
}

describe("what changed since the last audit", () => {
  it("knows a finding by its rule and element, not by the number it is shown under", () => {
    const before = audit([
      rule("button-name", "critical", "button.cart"),
      rule("link-name", "serious", "a.logo"),
    ]);
    const after = audit([
      rule("link-name", "serious", "a.logo"),
      rule("image-alt", "serious", "img.hero"),
    ]);

    const since = sinceLast(before, after);

    expect(since.cleared).toEqual([
      { id: "wcag:button-name", n: 1, title: "Button without an accessible name" },
    ]);
    expect(since.added.map((f) => f.id)).toEqual(["wcag:image-alt"]);
    expect(since.still).toBe(1);
  });

  it("calls a rule that moved to another element cleared there and new here", () => {
    const since = sinceLast(
      audit([rule("link-name", "serious", "a.logo")]),
      audit([rule("link-name", "serious", "a.footer")]),
    );

    expect(since.cleared.map((f) => f.id)).toEqual(["wcag:link-name"]);
    expect(since.added.map((f) => f.id)).toEqual(["wcag:link-name"]);
    expect(since.still).toBe(0);
  });

  it("keeps a finding that still fails on one of its elements", () => {
    const shared: ScanViolation = {
      ...rule("color-contrast", "serious", "p.muted"),
      fixGroups: [
        { text: "t", code: "c", selectors: ["p.muted", "span.price"] },
      ] as ScanViolation["fixGroups"],
    };
    const since = sinceLast(
      audit([shared]),
      audit([rule("color-contrast", "serious", "span.price")]),
    );

    expect(since).toMatchObject({ cleared: [], added: [], still: 1 });
  });

  it("says when nothing changed", () => {
    const page = [rule("link-name", "serious", "a.logo")];
    expect(sinceLast(audit(page), audit(page))).toMatchObject({
      cleared: [],
      added: [],
      still: 1,
      before: "failing",
      after: "failing",
      because: null,
    });
  });

  it("says when the result holds only because of a new finding", () => {
    const since = sinceLast(
      audit([
        rule("button-name", "critical", "button.cart"),
        rule("link-name", "serious", "a.logo"),
      ]),
      audit([
        rule("link-name", "serious", "a.logo"),
        rule("aria-hidden-focus", "critical", "div.menu"),
      ]),
    );

    expect(since.before).toBe("blocked");
    expect(since.after).toBe("blocked");
    expect(since.because).toEqual({ holds: "critical", count: 1 });
  });

  it("gives no reason when a finding that was already there holds the result", () => {
    const since = sinceLast(
      audit([rule("button-name", "critical", "button.cart")]),
      audit([
        rule("button-name", "critical", "button.cart"),
        rule("aria-hidden-focus", "critical", "div.menu"),
      ]),
    );

    expect(since.because).toBeNull();
  });

  it("leaves keyboard findings out until both audits walked the whole tab order", () => {
    const page = [rule("link-name", "serious", "a.logo")];
    const before = audit(page, { keyboard: walked(["a.plain"]) });

    expect(sinceLast(before, audit(page))).toMatchObject({ cleared: [], added: [], still: 1 });
    expect(
      sinceLast(before, audit(page, { keyboard: { ...walked([]), truncated: true } })).cleared,
    ).toEqual([]);
    expect(
      sinceLast(before, audit(page, { keyboard: walked([]) })).cleared.map((f) => f.id),
    ).toEqual(["keyboard:focus-not-visible"]);
  });
});

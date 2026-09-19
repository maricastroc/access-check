import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { focusPathLines } from "./focus-coverage";
import type { KeyboardReport, WalkEnd } from "@/lib/scan/keyboard";
import { translator } from "@/lib/i18n/t";

const t = translator();

const source = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const list = source("../../app/results/focus-path-list.tsx");
const panel = source("../../../extension/src/panel.tsx");

function walk(over: Partial<KeyboardReport>): KeyboardReport {
  return {
    totalStops: 0,
    totalInteractive: 0,
    reachableInteractive: 0,
    truncated: false,
    cycleComplete: true,
    startedAtTop: true,
    stoppedBy: "cycle",
    focusPath: [],
    findings: [],
    ...over,
  };
}

const ENDINGS: WalkEnd[] = ["cycle", "cap", "timeout", "opaque", "trap"];

describe("a reading never shows a tab order without saying how much of it it saw", () => {
  it("has something to say however the walk ended", () => {
    for (const stoppedBy of ENDINGS) {
      const { line, notes } = focusPathLines(
        walk({
          stoppedBy,
          truncated: stoppedBy !== "cycle",
          cycleComplete: stoppedBy === "cycle",
          totalInteractive: 105,
          focusPath: Array.from({ length: 50 }, (_, i) => ({
            n: i + 1,
            selector: `#s${i}`,
            label: `s${i}`,
            tag: "button",
            focusVisible: true,
            left: 1,
            top: 1,
            width: 1,
            height: 1,
          })),
        }),
        t,
      );

      expect(line, `no coverage line for a walk that ended by ${stoppedBy}`).not.toBe("");
      if (stoppedBy !== "cycle") {
        expect(
          notes.length,
          `a partial walk ended by ${stoppedBy} carried no note`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("never claims the full order after a capped walk", () => {
    const { line } = focusPathLines(
      walk({ stoppedBy: "cap", truncated: true, cycleComplete: false, totalInteractive: 105 }),
      t,
    );
    expect(line).not.toContain("full tab order");
  });
});

describe("both surfaces put that statement above the stops", () => {
  it("the report's list does", () => {
    expect(list.indexOf("coverage.line")).toBeGreaterThan(-1);
    expect(list.indexOf("coverage.line")).toBeLessThan(list.indexOf("stops.map"));
    expect(list.indexOf("coverage.notes")).toBeLessThan(list.indexOf("stops.map"));
  });

  it("the panel does", () => {
    expect(panel.indexOf("lines.line")).toBeGreaterThan(-1);
    expect(panel.indexOf("lines.line")).toBeLessThan(panel.indexOf("panel.showFocusPath"));
    expect(panel.indexOf("lines?.notes")).toBeLessThan(panel.indexOf("panel.showFocusPath"));
  });

  it("the panel offers to carry on only when the walk was cut short", () => {
    expect(panel).toContain("walked.truncated && (");
    expect(panel).toContain("panel.continueWalk");
  });
});

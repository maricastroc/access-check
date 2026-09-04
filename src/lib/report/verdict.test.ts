import { describe, expect, it } from "vitest";
import type { FixGroup } from "@/lib/scan/types";
import { buildVerdict, verdictLabel, verdictMessage, type VerdictInput } from "./verdict";

function group(count: number, verification: FixGroup["verification"]): FixGroup {
  return { text: "t", count, selectors: [], verification };
}

const base: VerdictInput = {
  kind: "wcag",
  isWcag: true,
  elements: 1,
  fixGroups: null,
  hasAutoFix: true,
  verifySkipped: false,
};

describe("buildVerdict", () => {
  it("verified — a single re-audited cluster cleared", () => {
    const v = buildVerdict({ ...base, elements: 7, fixGroups: [group(7, "verified")] });
    expect(v.kind).toBe("verified");
    expect(v.clearedElements).toBe(7);
    expect(verdictMessage(v)).toContain("clears all 7");
  });

  it("partial — some cleared, some still flag", () => {
    const v = buildVerdict({
      ...base,
      elements: 7,
      fixGroups: [group(5, "verified"), group(2, "failed")],
    });
    expect(v.kind).toBe("partial");
    expect(v.clearedElements).toBe(5);
    expect(v.failedElements).toBe(2);
    expect(verdictMessage(v)).toContain("5 of 7");
  });

  it("failed — applied but the rule still flags, with a contrast reason", () => {
    const v = buildVerdict({ ...base, fixVerification: "failed", fixGroups: null });
    expect(v.kind).toBe("failed");
    expect(verdictMessage(v, { measured: 2.4, required: 4.5, fixed: 3.01, fromHex: null, toHex: null, bgHex: null, prop: null })).toContain("3.01:1");
  });

  it("unverifiable — an auto fix exists but nothing was re-audited", () => {
    const v = buildVerdict({ ...base, fixVerification: "unchecked", hasAutoFix: true });
    expect(v.kind).toBe("unverifiable");
  });

  it("no-auto-fix — no applicable correction", () => {
    const v = buildVerdict({ ...base, fixVerification: "unchecked", hasAutoFix: false });
    expect(v.kind).toBe("no-auto-fix");
    expect(verdictMessage(v)).toContain("no automatic correction");
  });

  it("best-practice and complementary never claim a WCAG fix", () => {
    expect(buildVerdict({ ...base, kind: "best-practice", isWcag: false }).kind).toBe("best-practice");
    expect(buildVerdict({ ...base, kind: "keyboard" }).kind).toBe("complementary");
  });

  it("labels stay honest — verified is the only 'Verified fix'", () => {
    expect(verdictLabel(buildVerdict({ ...base, fixVerification: "verified" }))).toBe("Verified fix");
    expect(verdictLabel(buildVerdict({ ...base, fixVerification: "failed" }))).not.toContain("Verified");
    expect(verdictLabel(buildVerdict({ ...base, kind: "best-practice", isWcag: false }))).toBe("Best practice");
  });
});

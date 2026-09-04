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

describe("buildVerdict — never extrapolates one representative to a whole cluster", () => {
  it("sampled — a multi-element cluster whose single representative cleared is NOT 'all cleared'", () => {
    const v = buildVerdict({ ...base, elements: 7, fixGroups: [group(7, "verified")] });
    expect(v.kind).toBe("sampled");
    expect(v.reaudited).toBe(1);
    expect(v.sampledCleared).toBe(1);
    expect(v.fullyCovered).toBe(false);
    const msg = verdictMessage(v);
    expect(msg).toContain("The sampled element passed");
    expect(msg).toContain("other 6");
    expect(msg).toContain("not individually verified");
    expect(msg).not.toMatch(/clears all|7 of 7|cleared/i);
  });

  it("sampled — multiple clusters count reps, not cluster sizes (the real '4 of 7' shape)", () => {
    const v = buildVerdict({
      ...base,
      elements: 7,
      fixGroups: [group(3, "verified"), group(2, "failed"), group(1, "verified"), group(1, "failed")],
    });
    expect(v.kind).toBe("sampled");
    expect(v.reaudited).toBe(4);
    expect(v.sampledCleared).toBe(2);
    expect(v.sampledFailed).toBe(2);
    const msg = verdictMessage(v);
    expect(msg).toContain("Re-audited 4 of 7");
    expect(msg).toContain("2 passed");
    expect(msg).toContain("2 still flag");
    expect(msg).toContain("other 3");
    expect(msg).not.toMatch(/4 of 7 (occurrences )?(were )?cleared/i);
  });

  it("verified — only when every occurrence is its own re-audited cluster", () => {
    const v = buildVerdict({
      ...base,
      elements: 3,
      fixGroups: [group(1, "verified"), group(1, "verified"), group(1, "verified")],
    });
    expect(v.kind).toBe("verified");
    expect(v.fullyCovered).toBe(true);
    expect(verdictMessage(v)).toContain("each of the 3 occurrences");
  });

  it("partial — full individual coverage, mixed results, keeps the precise M of N", () => {
    const v = buildVerdict({
      ...base,
      elements: 3,
      fixGroups: [group(1, "verified"), group(1, "verified"), group(1, "failed")],
    });
    expect(v.kind).toBe("partial");
    expect(v.fullyCovered).toBe(true);
    expect(v.sampledCleared).toBe(2);
    expect(v.sampledFailed).toBe(1);
    expect(verdictMessage(v)).toContain("2 of 3 cleared");
  });

  it("verified — a genuine single element", () => {
    const v = buildVerdict({ ...base, fixVerification: "verified" });
    expect(v.kind).toBe("verified");
    expect(v.fullyCovered).toBe(true);
    expect(verdictMessage(v)).toContain("the rule stopped flagging the element");
  });

  it("failed — applied but the rule still flags, with a contrast reason", () => {
    const v = buildVerdict({ ...base, fixVerification: "failed", fixGroups: null });
    expect(v.kind).toBe("failed");
    expect(
      verdictMessage(v, { measured: 2.4, required: 4.5, fixed: 3.01, fromHex: null, toHex: null, bgHex: null, prop: null }),
    ).toContain("3.01:1");
  });

  it("failed — a multi-element sample that only failed says the rest were not verified", () => {
    const v = buildVerdict({ ...base, elements: 5, fixGroups: [group(5, "failed")] });
    expect(v.kind).toBe("failed");
    expect(verdictMessage(v)).toContain("not individually verified");
  });

  it("unverifiable — an auto fix exists but nothing was re-audited", () => {
    const v = buildVerdict({ ...base, fixVerification: "unchecked", hasAutoFix: true });
    expect(v.kind).toBe("unverifiable");
    expect(v.reaudited).toBe(0);
  });

  it("no-auto-fix — no applicable correction", () => {
    const v = buildVerdict({ ...base, fixVerification: "unchecked", hasAutoFix: false });
    expect(v.kind).toBe("no-auto-fix");
    expect(verdictMessage(v)).toContain("no automatic fix");
  });

  it("best-practice and complementary never claim a WCAG fix", () => {
    expect(buildVerdict({ ...base, kind: "best-practice", isWcag: false }).kind).toBe("best-practice");
    expect(buildVerdict({ ...base, kind: "keyboard" }).kind).toBe("complementary");
  });

  it("labels stay honest — verified is the only 'Verified fix'", () => {
    expect(verdictLabel(buildVerdict({ ...base, fixVerification: "verified" }))).toBe("Verified fix");
    expect(verdictLabel(buildVerdict({ ...base, elements: 7, fixGroups: [group(7, "verified")] }))).toBe(
      "One example checked",
    );
    expect(verdictLabel(buildVerdict({ ...base, fixVerification: "failed" }))).not.toContain("Verified");
    expect(verdictLabel(buildVerdict({ ...base, kind: "best-practice", isWcag: false }))).toBe("Best practice");
  });
});

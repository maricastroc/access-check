import { describe, expect, it } from "vitest";
import type { FixVerification, ScanResult, ScanViolation } from "@/lib/scan/types";
import { verifyStats } from "./shared";

const group = (verification: FixVerification) => ({
  text: "aplique o conserto",
  count: 1,
  selectors: ["#x"],
  verification,
});

const violation = (opts: {
  verification?: FixVerification;
  groups?: FixVerification[];
}): ScanViolation => ({
  id: "rule",
  severity: "serious",
  title: "issue",
  criterion: "1.4.3",
  where: "body",
  desc: "desc",
  fix: "fix",
  nodes: 1,
  verification: opts.verification,
  fixGroups: opts.groups?.map(group),
});

const result = (violations: ScanViolation[]) => ({ violations }) as unknown as ScanResult;

describe("verifyStats", () => {
  it("a page with no violations has nothing to verify", () => {
    expect(verifyStats(result([]))).toEqual({ verified: 0, checked: 0 });
  });

  it("a verified fix (without groups) counts in verified and in checked", () => {
    expect(verifyStats(result([violation({ verification: "verified" })]))).toEqual({
      verified: 1,
      checked: 1,
    });
  });

  it("a failed fix counts in checked but not in verified", () => {
    expect(verifyStats(result([violation({ verification: "failed" })]))).toEqual({
      verified: 0,
      checked: 1,
    });
  });

  it("unchecked fixes and those without verification are ignored", () => {
    const stats = verifyStats(result([violation({ verification: "unchecked" }), violation({})]));
    expect(stats).toEqual({ verified: 0, checked: 0 });
  });

  it("when there are fixGroups, uses the groups and ignores the top-level verification", () => {
    const stats = verifyStats(
      result([violation({ verification: "verified", groups: ["failed", "failed"] })]),
    );
    expect(stats).toEqual({ verified: 0, checked: 2 });
  });

  it("counts each fixGroups group by its own result", () => {
    const stats = verifyStats(
      result([violation({ groups: ["verified", "verified", "failed", "unchecked"] })]),
    );
    expect(stats).toEqual({ verified: 2, checked: 3 });
  });

  it("aggregates the results across several violations", () => {
    const stats = verifyStats(
      result([
        violation({ verification: "verified" }),
        violation({ groups: ["verified", "failed"] }),
        violation({ verification: "unchecked" }),
      ]),
    );
    expect(stats).toEqual({ verified: 2, checked: 3 });
  });
});

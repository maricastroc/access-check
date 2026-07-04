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

// verifyStats só lê `violations`; o resto do ScanResult é irrelevante aqui.
const result = (violations: ScanViolation[]) => ({ violations }) as unknown as ScanResult;

describe("verifyStats", () => {
  it("página sem violações não tem nada a verificar", () => {
    expect(verifyStats(result([]))).toEqual({ verified: 0, checked: 0 });
  });

  it("um fix verified (sem grupos) conta em verified e em checked", () => {
    expect(verifyStats(result([violation({ verification: "verified" })]))).toEqual({
      verified: 1,
      checked: 1,
    });
  });

  it("um fix failed conta em checked mas não em verified", () => {
    expect(verifyStats(result([violation({ verification: "failed" })]))).toEqual({
      verified: 0,
      checked: 1,
    });
  });

  it("fixes unchecked e sem verification são ignorados", () => {
    const stats = verifyStats(result([violation({ verification: "unchecked" }), violation({})]));
    expect(stats).toEqual({ verified: 0, checked: 0 });
  });

  it("quando há fixGroups, usa os grupos e ignora o verification do topo", () => {
    // topo diz "verified", mas os dois grupos falharam → não conta como verified
    const stats = verifyStats(
      result([violation({ verification: "verified", groups: ["failed", "failed"] })]),
    );
    expect(stats).toEqual({ verified: 0, checked: 2 });
  });

  it("conta cada grupo do fixGroups pelo seu próprio resultado", () => {
    const stats = verifyStats(
      result([violation({ groups: ["verified", "verified", "failed", "unchecked"] })]),
    );
    expect(stats).toEqual({ verified: 2, checked: 3 });
  });

  it("agrega os resultados entre várias violações", () => {
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

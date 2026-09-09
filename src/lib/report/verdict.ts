import type { FixGroup, ScanViolation } from "@/lib/scan/types";
import type { ContrastMeasurement } from "./contrast";
import type { Translate } from "../i18n/t";

export type VerdictKind =
  | "verified"
  | "partial"
  | "sampled"
  | "failed"
  | "unverifiable"
  | "no-auto-fix"
  | "best-practice"
  | "complementary";

export type Verdict = {
  kind: VerdictKind;
  totalElements: number;
  sampledCleared: number;
  sampledFailed: number;
  reaudited: number;
  fullyCovered: boolean;
  shared: boolean;
};

export type VerdictInput = {
  kind: string;
  isWcag: boolean;
  elements: number;
  fixGroups: FixGroup[] | null;
  fixVerification?: ScanViolation["verification"];
  hasAutoFix: boolean;
  verifySkipped: boolean;
};

const COMPLEMENTARY = new Set([
  "keyboard",
  "target-size",
  "reduced-motion",
  "live-regions",
  "context",
]);

export function buildVerdict(input: VerdictInput): Verdict {
  const totalElements = input.elements;
  const shared = totalElements > 1;
  const seal = (kind: VerdictKind, extra?: Partial<Verdict>): Verdict => ({
    kind,
    totalElements,
    sampledCleared: 0,
    sampledFailed: 0,
    reaudited: 0,
    fullyCovered: false,
    shared,
    ...extra,
  });

  if (input.kind === "best-practice") return seal("best-practice");
  if (COMPLEMENTARY.has(input.kind)) return seal("complementary");

  const groups =
    input.fixGroups && input.fixGroups.length > 0
      ? input.fixGroups.map((g) => ({ count: g.count, verification: g.verification }))
      : [{ count: totalElements, verification: input.fixVerification ?? "unchecked" }];

  const sampledCleared = groups.filter((g) => g.verification === "verified").length;
  const sampledFailed = groups.filter((g) => g.verification === "failed").length;
  const reaudited = sampledCleared + sampledFailed;

  if (reaudited === 0) {
    return input.hasAutoFix || input.verifySkipped ? seal("unverifiable") : seal("no-auto-fix");
  }

  const sumCounts = groups.reduce((n, g) => n + g.count, 0);
  const everyGroupSingle = groups.every((g) => g.count === 1);
  const allReaudited = groups.every(
    (g) => g.verification === "verified" || g.verification === "failed",
  );
  const fullyCovered = everyGroupSingle && allReaudited && sumCounts === totalElements;

  const base = { totalElements, sampledCleared, sampledFailed, reaudited, fullyCovered, shared };

  if (fullyCovered) {
    if (sampledFailed === 0) return { kind: "verified", ...base };
    if (sampledCleared === 0) return { kind: "failed", ...base };
    return { kind: "partial", ...base };
  }

  if (sampledCleared === 0) return { kind: "failed", ...base };
  return { kind: "sampled", ...base };
}

export function verdictLabel(v: Verdict, t: Translate): string {
  switch (v.kind) {
    case "verified":
      return t("verdict.label.verified");
    case "partial":
      return t("verdict.label.partial");
    case "sampled":
      return v.reaudited > 1 ? t("verdict.label.sampledMany") : t("verdict.label.sampledOne");
    case "failed":
      return t("verdict.label.failed");
    case "unverifiable":
      return t("verdict.label.unverifiable");
    case "no-auto-fix":
      return t("verdict.label.noAutoFix");
    case "best-practice":
      return t("verdict.label.bestPractice");
    case "complementary":
      return t("verdict.label.complementary");
  }
}

export function verdictMessage(
  v: Verdict,
  t: Translate,
  measurement?: ContrastMeasurement | null,
): string {
  const n = v.totalElements;
  const notChecked = n - v.reaudited;
  const others = (count: number) => t("verdict.others", { count });

  switch (v.kind) {
    case "verified":
      return v.shared ? t("verdict.verifiedShared", { count: n }) : t("verdict.verifiedSingle");
    case "partial":
      return t("verdict.partial", {
        cleared: v.sampledCleared,
        total: n,
        failed: v.sampledFailed,
      });
    case "sampled":
      if (v.reaudited === 1) {
        return t("verdict.sampledOne", { others: others(notChecked) });
      }
      return t("verdict.sampledMany", {
        reaudited: v.reaudited,
        total: n,
        cleared: v.sampledCleared,
        failedTail:
          v.sampledFailed > 0 ? t("verdict.sampledFailedTail", { failed: v.sampledFailed }) : "",
        others: others(notChecked),
      });
    case "failed": {
      const subject =
        n === 1 ? t("verdict.failedSubjectSingle") : t("verdict.failedSubjectSampled");
      const tail = n > 1 ? ` ${others(notChecked)}` : "";
      if (measurement?.fixed != null) {
        return t("verdict.failedMeasured", {
          subject,
          ratio: measurement.fixed.toFixed(2),
          tail,
        });
      }
      return t("verdict.failedPlain", { subject, tail });
    }
    case "unverifiable":
      return t("verdict.unverifiable");
    case "no-auto-fix":
      return t("verdict.noAutoFix");
    case "best-practice":
      return t("verdict.bestPractice");
    case "complementary":
      return t("verdict.complementary");
  }
}

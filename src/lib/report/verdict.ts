import type { FixGroup, ScanViolation } from "@/lib/scan/types";
import type { ContrastMeasurement } from "./contrast";

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

export function verdictLabel(v: Verdict): string {
  switch (v.kind) {
    case "verified":
      return "Verified fix";
    case "partial":
      return "Partly verified";
    case "sampled":
      return v.reaudited > 1 ? "Examples checked" : "One example checked";
    case "failed":
      return "Needs human review";
    case "unverifiable":
      return "Could not verify";
    case "no-auto-fix":
      return "Needs human review";
    case "best-practice":
      return "Best practice";
    case "complementary":
      return "Not re-audited";
  }
}

export function verdictMessage(v: Verdict, measurement?: ContrastMeasurement | null): string {
  const n = v.totalElements;
  const notChecked = n - v.reaudited;
  const others = (count: number) =>
    `The other ${count} occurrence${count === 1 ? "" : "s"} share the same suggestion but ${count === 1 ? "was" : "were"} not individually verified.`;

  switch (v.kind) {
    case "verified":
      return v.shared
        ? `Applied in a sandbox copy and re-audited: the rule stopped flagging each of the ${n} occurrences.`
        : "Applied in a sandbox copy and re-audited: the rule stopped flagging the element.";
    case "partial":
      return `Re-audited each occurrence in a sandbox copy: ${v.sampledCleared} of ${n} cleared, ${v.sampledFailed} still flag. Review the ones that still flag.`;
    case "sampled":
      if (v.reaudited === 1) {
        return `The sampled element passed after the suggested change in a sandbox copy. ${others(notChecked)}`;
      }
      return `Re-audited ${v.reaudited} of ${n} occurrences in a sandbox copy (one representative per suggested fix): ${v.sampledCleared} passed${v.sampledFailed > 0 ? `, ${v.sampledFailed} still flag` : ""}. The other ${notChecked} ${notChecked === 1 ? "was" : "were"} not individually verified.`;
    case "failed": {
      const subject = n === 1 ? "This element" : "The sampled element";
      const tail = n > 1 ? ` ${others(notChecked)}` : "";
      if (measurement?.fixed != null) {
        return `${subject} still fails after the suggested change: the new color reaches ${measurement.fixed.toFixed(2)}:1 against the sampled background, but the rule still flags it. The real background may be an image, gradient or overlapping layer.${tail}`;
      }
      return `${subject} still fails after the change was applied in a sandbox copy. Review it by hand.${tail}`;
    }
    case "unverifiable":
      return "The element couldn't be re-audited in the sandbox copy (it wasn't found, or verification was cut short for time). Confirm the change by hand.";
    case "no-auto-fix":
      return "This finding has no automatic fix. A person needs to decide the right change for the page.";
    case "best-practice":
      return "Best practice, not a WCAG success criterion. Worth fixing, but it does not affect the WCAG reading.";
    case "complementary":
      return "Found by a complementary pass (keyboard, mobile, vision or dynamic state); it isn't re-audited in a sandbox copy. Fix and re-run to confirm.";
  }
}

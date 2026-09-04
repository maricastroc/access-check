import type { FixGroup, ScanViolation } from "@/lib/scan/types";
import type { ContrastMeasurement } from "./contrast";

/**
 * The verification verdict, derived ONLY from evidence the engine produced.
 *
 * The engine re-audits a fix by applying it to one representative element of a
 * fix-cluster and re-running the rule scoped to that element:
 *   verified  → the rule stopped flagging it,
 *   failed    → it still flags,
 *   unchecked → no applicable fix, element not found, or verification skipped.
 *
 * We never claim "verified" / "resolves all" without a `verified` outcome, and
 * when a fix fails we surface the concrete reason instead of a generic notice.
 */

export type VerdictKind =
  | "verified" // every verifiable cluster cleared the rule
  | "partial" // some cleared, some still flag
  | "failed" // applied but the rule still flags
  | "unverifiable" // an automatic fix exists but couldn't be re-audited
  | "no-auto-fix" // no automatic correction; needs a human
  | "best-practice" // not a WCAG success criterion
  | "complementary"; // keyboard / audit / context pass — not sandbox-verified

export type Verdict = {
  kind: VerdictKind;
  clearedElements: number;
  failedElements: number;
  totalElements: number;
  /** True when the same change is shared across more than one element. */
  shared: boolean;
};

export type VerdictInput = {
  kind: string; // FindingView.kind
  isWcag: boolean;
  elements: number;
  fixGroups: FixGroup[] | null;
  fixVerification?: ScanViolation["verification"];
  hasAutoFix: boolean; // a concrete, applicable fix exists (fixCode / measurement)
  verifySkipped: boolean; // the engine emitted "verification-skipped"
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

  if (input.kind === "best-practice") {
    return kindOnly("best-practice", totalElements);
  }
  if (COMPLEMENTARY.has(input.kind)) {
    return kindOnly("complementary", totalElements);
  }

  const groups: { count: number; verification: string }[] =
    input.fixGroups && input.fixGroups.length > 0
      ? input.fixGroups.map((g) => ({ count: g.count, verification: g.verification }))
      : [{ count: totalElements, verification: input.fixVerification ?? "unchecked" }];

  const clearedElements = sum(groups, "verified");
  const failedElements = sum(groups, "failed");
  const verifiableElements = clearedElements + failedElements;
  const shared = totalElements > 1;

  if (verifiableElements === 0) {
    // Nothing was actually re-audited.
    if (input.hasAutoFix || input.verifySkipped) {
      return { kind: "unverifiable", clearedElements: 0, failedElements: 0, totalElements, shared };
    }
    return { kind: "no-auto-fix", clearedElements: 0, failedElements: 0, totalElements, shared };
  }

  if (failedElements === 0) {
    return { kind: "verified", clearedElements, failedElements: 0, totalElements, shared };
  }
  if (clearedElements === 0) {
    return { kind: "failed", clearedElements: 0, failedElements, totalElements, shared };
  }
  return { kind: "partial", clearedElements, failedElements, totalElements, shared };
}

function kindOnly(kind: VerdictKind, totalElements: number): Verdict {
  return { kind, clearedElements: 0, failedElements: 0, totalElements, shared: totalElements > 1 };
}

function sum(groups: { count: number; verification: string }[], outcome: string): number {
  return groups.reduce((n, g) => (g.verification === outcome ? n + g.count : n), 0);
}

/** The one-line status label used on the seal (kept short; the detail carries the reason). */
export function verdictLabel(v: Verdict): string {
  switch (v.kind) {
    case "verified":
      return "Verified fix";
    case "partial":
      return "Partly verified";
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

/** The evidence-based sentence shown under the fix. `measurement` sharpens contrast reasons. */
export function verdictMessage(v: Verdict, measurement?: ContrastMeasurement | null): string {
  const n = v.totalElements;
  switch (v.kind) {
    case "verified":
      return v.shared
        ? `Applied in a sandbox copy and re-audited: the rule stopped flagging the element. ${n} occurrences share this change, which clears all ${n}.`
        : "Applied in a sandbox copy and re-audited: the rule stopped flagging the element.";
    case "partial":
      return `Re-audited in a sandbox copy: ${v.clearedElements} of ${n} occurrences were cleared, ${v.failedElements} still flag. Review the remaining elements individually.`;
    case "failed":
      if (measurement?.fixed != null) {
        return `The suggested color reaches ${measurement.fixed.toFixed(2)}:1 against the sampled background, but the rule still fails when re-audited — the real background may be an image, gradient or overlapping layer. Review this element.`;
      }
      return "The suggested change was applied in a sandbox copy, but the rule still flags the element. Review this element by hand.";
    case "unverifiable":
      return "The element couldn't be re-audited in the sandbox copy (it wasn't found, or verification was cut short for time). Confirm the change by hand.";
    case "no-auto-fix":
      return "This finding has no automatic correction — it needs a person to decide the right change for the page.";
    case "best-practice":
      return "Best practice, not a WCAG success criterion. Worth fixing, but it does not affect the WCAG reading.";
    case "complementary":
      return "Found by a complementary pass (keyboard, mobile, vision or dynamic state); it isn't re-audited in a sandbox copy. Fix and re-run to confirm.";
  }
}

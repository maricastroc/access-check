import { Budget, withBudget } from "./budget";
import type { ScanWarning, ScanWarningCode } from "./types";

export type StageId =
  | "navigation"
  | "prime"
  | "content-ready"
  | "axe"
  | "element-info"
  | "markers"
  | "verify"
  | "audits"
  | "screenshot"
  | "keyboard"
  | "contexts";

export type StageTier = "essential" | "assembly" | "optional";

export type StageSpec = {
  tier: StageTier;
  maxMs: number;
  minMs: number;
  warning?: ScanWarningCode;
  affectsReport?: boolean;
};

export const STAGES: Record<StageId, StageSpec> = {
  navigation: { tier: "essential", maxMs: 15_000, minMs: 3_000 },
  prime: { tier: "assembly", maxMs: 2_500, minMs: 1_200 },
  "content-ready": {
    tier: "essential",
    maxMs: 6_000,
    minMs: 600,
    warning: "content-unsettled",
    affectsReport: true,
  },
  axe: { tier: "essential", maxMs: 20_000, minMs: 500 },
  "element-info": {
    tier: "assembly",
    maxMs: 4_000,
    minMs: 500,
    warning: "fix-details-skipped",
    affectsReport: true,
  },
  markers: { tier: "assembly", maxMs: 2_000, minMs: 300, warning: "markers-skipped" },
  verify: {
    tier: "optional",
    maxMs: 6_000,
    minMs: 2_000,
    warning: "verification-skipped",
    affectsReport: true,
  },
  audits: {
    tier: "optional",
    maxMs: 6_000,
    minMs: 2_000,
    warning: "audits-skipped",
    affectsReport: true,
  },
  screenshot: { tier: "optional", maxMs: 6_000, minMs: 1_500, warning: "screenshot-unavailable" },
  keyboard: {
    tier: "optional",
    maxMs: 8_000,
    minMs: 3_000,
    warning: "keyboard-skipped",
    affectsReport: true,
  },
  contexts: {
    tier: "optional",
    maxMs: 8_000,
    minMs: 3_000,
    warning: "contexts-skipped",
    affectsReport: true,
  },
};

export const OPTIONAL_ORDER: StageId[] = ["verify", "audits", "screenshot", "keyboard", "contexts"];

export const ASSEMBLY_RESERVE_MS = 6_000;
export const ASSEMBLY_RESERVE_SHARE = 0.15;

export function assemblyReserveFor(totalMs: number): number {
  return Math.min(ASSEMBLY_RESERVE_MS, Math.round(totalMs * ASSEMBLY_RESERVE_SHARE));
}

export type StageOutcome<T> = {
  value: T;
  ran: boolean;
  skipped: boolean;
  timedOut: boolean;
};

export class ScanPolicy {
  private readonly emitted = new Map<ScanWarningCode, ScanWarning>();
  private readonly skipped = new Set<StageId>();
  private assemblyHeld = true;

  constructor(
    private readonly budget: Budget,
    private readonly text: Record<ScanWarningCode, string>,
    assemblyReserveMs?: number,
  ) {
    this.assemblyReserveMs = assemblyReserveMs ?? assemblyReserveFor(budget.total());
  }

  private readonly assemblyReserveMs: number;

  allowance(id: StageId): number {
    const spec = STAGES[id];
    const held = spec.tier === "essential" && this.assemblyHeld ? this.assemblyReserveMs : 0;
    return Math.max(0, Math.min(spec.maxMs, this.budget.spendable() - held));
  }

  canRun(id: StageId): boolean {
    return this.allowance(id) >= STAGES[id].minMs;
  }

  releaseAssemblyReserve(): void {
    this.assemblyHeld = false;
  }

  async run<T>(id: StageId, fn: (allowanceMs: number) => Promise<T>, fallback: T) {
    const allowance = this.allowance(id);
    if (allowance < STAGES[id].minMs) {
      this.skip(id);
      return { value: fallback, ran: false, skipped: true, timedOut: false } as StageOutcome<T>;
    }

    const { value, timedOut } = await withBudget(() => fn(allowance), allowance, fallback);
    if (timedOut) this.skip(id);
    return { value, ran: !timedOut, skipped: false, timedOut } as StageOutcome<T>;
  }

  skip(id: StageId): void {
    this.skipped.add(id);
    const code = STAGES[id].warning;
    if (code) this.warn(code);
  }

  warn(code: ScanWarningCode): void {
    if (this.emitted.has(code)) return;
    this.emitted.set(code, { code, message: this.text[code] });
  }

  wasSkipped(id: StageId): boolean {
    return this.skipped.has(id);
  }

  get partial(): boolean {
    for (const code of this.emitted.keys()) {
      if (code === "stream-interrupted") return true;
      const spec = Object.values(STAGES).find((s) => s.warning === code);
      if (spec?.affectsReport) return true;
    }
    return false;
  }

  warnings(): ScanWarning[] {
    return [...this.emitted.values()];
  }
}

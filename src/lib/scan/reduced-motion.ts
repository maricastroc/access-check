import type { Page } from "playwright-core";
import type { AuditFinding } from "./audits";
import { MAX_AUDIT_SELECTORS } from "./audits";
import type { Translate } from "../i18n/t";

const TRIVIAL_MS = 250;

export type RunningAnimation = {
  selector: string;
  durationMs: number;
  infinite: boolean;
  properties: string[];
};

export type RawReducedMotion = {
  ran: boolean;
  animations: RunningAnimation[];
};

export type ReducedMotionReport = {
  ran: boolean;
  running: number;
  findings: AuditFinding[];
};

const GENTLE_PROPS = new Set(["opacity", "visibility"]);

function isDisruptive(a: RunningAnimation): boolean {
  if (a.infinite) return true;
  if (a.durationMs < TRIVIAL_MS) return false;
  if (a.properties.length > 0 && a.properties.every((p) => GENTLE_PROPS.has(p))) return false;
  return true;
}

export function analyzeReducedMotion(raw: RawReducedMotion, t: Translate): ReducedMotionReport {
  if (!raw.ran) return { ran: false, running: 0, findings: [] };

  const disruptive = raw.animations.filter(isDisruptive);
  const selectors = [...new Set(disruptive.map((a) => a.selector))].filter(Boolean);

  const findings: AuditFinding[] = [];
  if (selectors.length > 0) {
    const n = selectors.length;
    findings.push({
      id: "reduced-motion",
      severity: "moderate",
      criterion: t("audit.motion.criterion"),
      title: t("audit.motion.title", { count: n }),
      desc: t("audit.motion.desc", { count: n }),
      fix: t("audit.motion.fix"),
      count: n,
      selectors: selectors.slice(0, MAX_AUDIT_SELECTORS),
    });
  }

  return { ran: true, running: raw.animations.length, findings };
}

export async function collectReducedMotion(page: Page, t: Translate): Promise<ReducedMotionReport> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  try {
    await page.waitForTimeout(200);

    const raw = (await page.evaluate(() => {
      const anims = typeof document.getAnimations === "function" ? document.getAnimations() : [];

      const out: {
        selector: string;
        durationMs: number;
        infinite: boolean;
        properties: string[];
      }[] = [];

      for (const anim of anims) {
        if (anim.playState !== "running") continue;
        const effect = anim.effect as KeyframeEffect | null;
        const target = effect?.target ?? null;
        if (!target) continue;

        const timing = effect?.getTiming?.() ?? {};
        const duration = typeof timing.duration === "number" ? timing.duration : 0;
        const infinite = timing.iterations === Infinity;

        let properties: string[] = [];
        try {
          const frames = effect?.getKeyframes?.() ?? [];
          const props = new Set<string>();
          for (const frame of frames) {
            for (const key of Object.keys(frame)) {
              if (key === "offset" || key === "composite" || key === "easing") continue;
              props.add(key);
            }
          }
          properties = [...props];
        } catch {
          //
        }

        out.push({
          selector: window.__accessCheckDom!.cssPath(target as Element),
          durationMs: duration,
          infinite,
          properties,
        });
      }

      return { ran: true, animations: out };
    })) as RawReducedMotion;

    return analyzeReducedMotion(raw, t);
  } finally {
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
}

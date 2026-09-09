import type { Page } from "playwright-core";
import type { AuditFinding } from "./audits";
import { MAX_AUDIT_SELECTORS, sortFindings } from "./audits";
import type { MessageKey, Translate } from "../i18n/t";

const VALID_LIVE = new Set(["polite", "assertive", "off"]);
const ASSERTIVE_ROLES = new Set(["alert"]);

export type LiveRegion = {
  selector: string;
  role: string | null;
  ariaLive: string | null;
  hidden: boolean;
  ariaHidden: boolean;
};

export type RawLiveRegions = {
  regions: LiveRegion[];
};

export type LiveRegionsReport = {
  regions: number;
  findings: AuditFinding[];
};

function group(
  id: string,
  severity: AuditFinding["severity"],
  regions: LiveRegion[],
  keys: { title: MessageKey; desc: MessageKey; fix: MessageKey },
  t: Translate,
): AuditFinding | null {
  if (regions.length === 0) return null;
  const selectors = [...new Set(regions.map((r) => r.selector))].filter(Boolean);
  const count = selectors.length;
  return {
    id,
    severity,
    criterion: t("audit.live.criterion"),
    title: t(keys.title, { count }),
    desc: t(keys.desc, { count }),
    fix: t(keys.fix),
    count,
    selectors: selectors.slice(0, MAX_AUDIT_SELECTORS),
  };
}

export function analyzeLiveRegions(raw: RawLiveRegions, t: Translate): LiveRegionsReport {
  const regions = raw.regions;

  const invalid = regions.filter((r) => r.ariaLive !== null && !VALID_LIVE.has(r.ariaLive));
  const hidden = regions.filter((r) => r.hidden || r.ariaHidden);
  const muted = regions.filter(
    (r) => r.role !== null && ASSERTIVE_ROLES.has(r.role) && r.ariaLive === "off",
  );

  const findings = [
    group(
      "live-region-invalid",
      "serious",
      invalid,
      {
        title: "audit.live.invalidTitle",
        desc: "audit.live.invalidDesc",
        fix: "audit.live.invalidFix",
      },
      t,
    ),
    group(
      "live-region-hidden",
      "serious",
      hidden,
      {
        title: "audit.live.hiddenTitle",
        desc: "audit.live.hiddenDesc",
        fix: "audit.live.hiddenFix",
      },
      t,
    ),
    group(
      "live-region-muted",
      "moderate",
      muted,
      { title: "audit.live.mutedTitle", desc: "audit.live.mutedDesc", fix: "audit.live.mutedFix" },
      t,
    ),
  ].filter((f): f is AuditFinding => f !== null);

  return { regions: regions.length, findings: sortFindings(findings) };
}

export async function collectLiveRegions(page: Page, t: Translate): Promise<LiveRegionsReport> {
  const raw = (await page.evaluate(() =>
    window.__accessCheckDom!.collectLiveRegionsRaw(),
  )) as RawLiveRegions;
  return analyzeLiveRegions(raw, t);
}

import type { Page } from "playwright-core";
import type { AuditFinding } from "./audits";
import { MAX_AUDIT_SELECTORS, sortFindings } from "./audits";

/**
 * WCAG 4.1.3 · Status Messages (AA).
 *
 * axe validates ARIA attribute *syntax*, but not whether a live region is set
 * up so it can ever announce. We inspect every live region on the page and flag
 * the configurations that silently swallow updates: invalid aria-live values,
 * regions hidden with display:none / aria-hidden (so nothing is announced), and
 * alerts explicitly muted with aria-live="off".
 *
 * This is the static half of the check — it inspects configuration, not runtime
 * behaviour. Catching updates that happen *outside* any live region is a
 * separate, dynamic pass.
 */

const VALID_LIVE = new Set(["polite", "assertive", "off"]);
/** Roles that imply an interruptive (assertive) announcement. */
const ASSERTIVE_ROLES = new Set(["alert"]);

export type LiveRegion = {
  selector: string;
  role: string | null;
  ariaLive: string | null;
  /** Removed from layout entirely (display:none / visibility:hidden). */
  hidden: boolean;
  /** aria-hidden="true" — pruned from the accessibility tree. */
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
  title: (n: number) => string,
  desc: string,
  fix: string,
): AuditFinding | null {
  if (regions.length === 0) return null;
  const selectors = [...new Set(regions.map((r) => r.selector))].filter(Boolean);
  return {
    id,
    severity,
    criterion: "WCAG 4.1.3 · Status Messages",
    title: title(selectors.length),
    desc,
    fix,
    count: selectors.length,
    selectors: selectors.slice(0, MAX_AUDIT_SELECTORS),
  };
}

export function analyzeLiveRegions(raw: RawLiveRegions): LiveRegionsReport {
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
      (n) => `${n} live ${n === 1 ? "region has" : "regions have"} an invalid aria-live value`,
      "aria-live must be polite, assertive or off. Any other value is ignored, so screen " +
        "readers never announce updates to the region.",
      'Set aria-live to "polite" for routine updates or "assertive" for urgent ones.',
    ),
    group(
      "live-region-hidden",
      "serious",
      hidden,
      (n) =>
        `${n} live ${n === 1 ? "region is" : "regions are"} hidden and can't announce`,
      "The region is removed from the accessibility tree (display:none, visibility:hidden or " +
        "aria-hidden), so updates written into it are never announced. Note this is different " +
        "from the valid visually-hidden pattern, which keeps the node in the tree.",
      "Keep the live region in the tree — use a clip/sr-only pattern instead of display:none, " +
        "and drop aria-hidden from it.",
    ),
    group(
      "live-region-muted",
      "moderate",
      muted,
      (n) => `${n} ${n === 1 ? "alert is" : "alerts are"} muted with aria-live="off"`,
      'An element with role="alert" is meant to interrupt, but aria-live="off" silences it — ' +
        "the two contradict each other and nothing is announced.",
      'Remove aria-live="off" from the alert (role="alert" is assertive by default).',
    ),
  ].filter((f): f is AuditFinding => f !== null);

  return { regions: regions.length, findings: sortFindings(findings) };
}

export async function collectLiveRegions(page: Page): Promise<LiveRegionsReport> {
  const raw = (await page.evaluate(() => {
    const cssPath = (el: Element | null): string => {
      if (!el || el.nodeType !== 1) return "";
      const parts: string[] = [];
      let node: Element | null = el;
      while (node && node.nodeType === 1 && parts.length < 5) {
        if (node.id) {
          parts.unshift(`#${CSS.escape(node.id)}`);
          break;
        }
        let sel = node.tagName.toLowerCase();
        const parent: Element | null = node.parentElement;
        if (parent) {
          const sameTag = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
          if (sameTag.length > 1) sel += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
        parts.unshift(sel);
        node = parent;
      }
      return parts.join(" > ");
    };

    const nodes = Array.from(
      document.querySelectorAll(
        '[aria-live], [role="alert"], [role="status"], [role="log"]',
      ),
    );

    const regions = nodes.map((el) => {
      const cs = getComputedStyle(el);
      const role = el.getAttribute("role");
      const ariaLive = el.getAttribute("aria-live");
      return {
        selector: cssPath(el),
        role: role ? role.trim().toLowerCase() : null,
        ariaLive: ariaLive !== null ? ariaLive.trim().toLowerCase() : null,
        hidden: cs.display === "none" || cs.visibility === "hidden",
        ariaHidden: el.getAttribute("aria-hidden") === "true",
      };
    });

    return { regions };
  })) as RawLiveRegions;

  return analyzeLiveRegions(raw);
}

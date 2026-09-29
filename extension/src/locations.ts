import type { FindingView } from "../../src/lib/report/findings";
import type { ElementIdentity } from "../../src/lib/scan/dom/identity";
import type { FocusRect, KeyboardCertainty } from "../../src/lib/scan/keyboard";

export type Location = {
  selector: string;
  identity: ElementIdentity | null;
  tag: string;
  label: string;
  stop: number | null;
  keyboard: boolean;
  reason: string | null;
  measured: string | null;
  html: string | null;
  rect: FocusRect | null;
  onScreen: boolean;
  certainty: KeyboardCertainty;
};

const DOCUMENT_ONLY = /^(html|head|title|meta|link|base|script|style)(?![\w-])/i;

export function locatable(selector: string): boolean {
  const steps = selector
    .trim()
    .split(/\s*>\s*|\s+/)
    .filter(Boolean);
  const target = steps[steps.length - 1];
  if (!target) return false;
  return !DOCUMENT_ONLY.test(target) && !steps.some((step) => /^head(?![\w-])/i.test(step));
}

export function locationsOf(finding: FindingView): Location[] {
  if (finding.occurrences.length > 0) {
    return finding.occurrences.map((o) => ({
      selector: o.selector,
      identity: o.identity ?? null,
      tag: o.tag,
      label: o.label,
      stop: o.stop,
      keyboard: true,
      reason: o.reason || null,
      measured: o.measured ?? null,
      html: o.html,
      rect: o.rect,
      onScreen: o.onScreen,
      certainty: o.certainty,
    }));
  }

  return [...new Set(finding.affectedSelectors)].filter(locatable).map((selector) => {
    const identity = finding.identities[selector] ?? null;
    return {
      selector,
      identity,
      tag: identity?.tag ?? "",
      label: identity?.name ?? "",
      stop: null,
      keyboard: false,
      reason: null,
      measured: null,
      html: null,
      rect: null,
      onScreen: false,
      certainty: "conclusive",
    };
  });
}

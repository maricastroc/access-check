import { VIEWPORT_CAPTURE, type ScanMarker } from "@/lib/scan/types";
import type { ElementIdentity } from "@/lib/scan/dom/identity";
import type { FocusRect, KeyboardCertainty } from "@/lib/scan/keyboard";
import { captureOf } from "@/lib/scan/placement";
import type { FindingView } from "./findings";
import { isDocLevelCategory, type Unplaced } from "./guidance";

export type Occurrence = {
  index: number;
  selector: string;
  identity: ElementIdentity | null;
  tag: string;
  name: string | null;
  stop: number | null;
  keyboard: boolean;
  reason: string | null;
  measured: string | null;
  certainty: KeyboardCertainty;
  html: string | null;
  rect: FocusRect | null;
  onScreen: boolean;
  markers: ScanMarker[];
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

function byCapture(markers: ScanMarker[]): ScanMarker[] {
  return [...markers].sort((a, b) => {
    const first = (m: ScanMarker) => (captureOf(m) === VIEWPORT_CAPTURE ? 0 : 1);
    return first(a) - first(b) || a.n - b.n;
  });
}

export function occurrencesOf(finding: FindingView): Occurrence[] {
  const base: Omit<Occurrence, "index" | "markers">[] =
    finding.occurrences.length > 0
      ? finding.occurrences.map((o) => ({
          selector: o.selector,
          identity: o.identity ?? finding.identities[o.selector] ?? null,
          tag: o.tag,
          name: o.label || null,
          stop: o.stop,
          keyboard: true,
          reason: o.reason || null,
          measured: o.measured ?? null,
          certainty: o.certainty,
          html: o.html,
          rect: o.rect,
          onScreen: o.onScreen,
        }))
      : [...new Set(finding.affectedSelectors)].filter(locatable).map((selector) => {
          const identity = finding.identities[selector] ?? null;
          return {
            selector,
            identity,
            tag: identity?.tag ?? "",
            name: identity?.name ?? null,
            stop: null,
            keyboard: false,
            reason: null,
            measured: null,
            certainty: "conclusive" as const,
            html: null,
            rect: null,
            onScreen: false,
          };
        });

  const tied = finding.markers.some((m) => m.selector);
  return base.map((o, index) => ({
    ...o,
    index,
    markers: byCapture(
      tied
        ? finding.markers.filter((m) => m.selector === o.selector)
        : index === 0
          ? finding.markers
          : [],
    ),
  }));
}

export function unplacedAs(
  ruleId: string,
  kind: string,
  selectors: string[],
  elements: number,
): Unplaced | null {
  if (selectors.some(locatable)) return null;
  if (selectors.length === 0 && elements > 0) return "shadow-root";
  if (selectors.length > 0 || isDocLevelCategory(ruleId, kind)) return "whole-page";
  return null;
}

export function unplaced(finding: FindingView): Unplaced | null {
  if (occurrencesOf(finding).length > 0) return null;
  return unplacedAs(finding.ruleId, finding.kind, finding.affectedSelectors, finding.elements);
}

export function appliesToWholePage(finding: FindingView): boolean {
  return unplaced(finding) === "whole-page";
}

export function insideShadowRoot(finding: FindingView): boolean {
  return unplaced(finding) === "shadow-root";
}

export function occurrenceTag(n: number, index: number, total: number): string {
  return total > 1 ? `${n}·${index + 1}` : String(n);
}

export function stepOccurrence(index: number, total: number, delta: 1 | -1): number {
  if (total <= 0) return 0;
  return (index + delta + total) % total;
}

export function unlistedOccurrences(finding: FindingView, listed: number): number {
  return Math.max(0, finding.elements - listed);
}

export type StopFinding = {
  stop: number;
  findingId: string;
  n: number;
  index: number;
  tag: string;
};

export function stopCandidates(findings: FindingView[]): string[] {
  const selectors = findings.flatMap((f) =>
    occurrencesOf(f)
      .filter((o) => !o.keyboard)
      .map((o) => o.selector),
  );
  return [...new Set(selectors)];
}

export function findingsAtStops(
  findings: FindingView[],
  targetStops: Record<string, number> = {},
): StopFinding[] {
  return findings
    .flatMap((f) => {
      const all = occurrencesOf(f);
      return all.flatMap((o) => {
        const stop = o.stop ?? targetStops[o.selector] ?? null;
        if (stop === null) return [];
        return [
          {
            stop,
            findingId: f.id,
            n: f.n,
            index: o.index,
            tag: occurrenceTag(f.n, o.index, all.length),
          },
        ];
      });
    })
    .sort((a, b) => a.stop - b.stop || a.n - b.n || a.index - b.index);
}

export function firstAtEachStop(found: StopFinding[]): Map<number, StopFinding> {
  const first = new Map<number, StopFinding>();
  for (const f of found) {
    const seen = first.get(f.stop);
    if (!seen || f.n < seen.n) first.set(f.stop, f);
  }
  return first;
}

import { SectionKicker } from "./section-kicker";

/**
 * Where the analysis came from — and the standing guarantee that the audited
 * site is never modified (fixes are applied and reverted in a sandbox copy).
 */
export function ProvenancePanel({
  viewport,
  durationMs,
  passes,
}: {
  viewport?: string;
  durationMs?: number;
  passes?: string;
}) {
  return (
    <div className="bg-band p-4">
      <SectionKicker tone="steel">Provenance</SectionKicker>
      <div className="mt-2 space-y-2 text-[12.5px] leading-normal text-body">
        <p>
          Headless Chromium · axe-core with WCAG A &amp; AA rules
          {viewport ? ` · screenshot taken at ${viewport}` : ""}
          {typeof durationMs === "number" ? ` in ${(durationMs / 1000).toFixed(1)}s` : ""}.
        </p>
        <p>{passes ?? "Complementary passes: keyboard, mobile viewport, expanded UI, vision, motion, live regions."}</p>
        <p>
          Fixes are applied and reverted on a copy, so the audited site is never altered.
        </p>
      </div>
    </div>
  );
}

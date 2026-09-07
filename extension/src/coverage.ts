import type { ScanWarning } from "../../src/lib/scan/types";

export const UNAVAILABLE: ScanWarning[] = [
  {
    code: "keyboard-skipped",
    message: "The focus path needs real Tab presses, which this prototype does not do.",
  },
  {
    code: "contexts-skipped",
    message: "The mobile-viewport pass needs viewport emulation, not available in this prototype.",
  },
  {
    code: "audits-skipped",
    message: "The reduced-motion check needs media emulation, not available in this prototype.",
  },
  {
    code: "verification-skipped",
    message: "Fixes are not tested here: this prototype never writes to the audited page.",
  },
];

export function crossOriginWarning(assets: { styleSheets: number; media: number }): ScanWarning {
  const parts: string[] = [];
  if (assets.styleSheets > 0) {
    parts.push(`${assets.styleSheets} stylesheet${assets.styleSheets === 1 ? "" : "s"}`);
  }
  if (assets.media > 0) {
    parts.push(`${assets.media} media file${assets.media === 1 ? "" : "s"}`);
  }

  const single = assets.styleSheets + assets.media === 1;

  return {
    code: "cross-origin-assets",
    message:
      `${parts.join(" and ")} on this page ${single ? "comes" : "come"} from another origin, ` +
      "which this build is not allowed to fetch. Rules that read those files — the " +
      "orientation-lock check — report as needing review instead of passing. Everything read " +
      "from the page itself is unaffected.",
  };
}

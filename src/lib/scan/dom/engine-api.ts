import type { AxeResults, Locale } from "axe-core";
import type { ElementInfo } from "../remediate";
import type { RawLiveRegions } from "../live-regions";
import type { RawTargetSize } from "../target-size";
import type { DomRect } from "./rects";
import type { FocusProbe, FocusReach, FocusStyle } from "./focus";
import type { OverlayMark, OverlayReport } from "./overlay";
import type { PaintCalm, PrimeReport } from "./prime";

export const DOM_ENGINE_VERSION = 8;

export type DomEngine = {
  version: number;
  cssPath(el: Element | null): string;
  collectElementInfo(selectors: string[]): Record<string, ElementInfo>;
  collectRects(selectors: string[]): (DomRect | null)[];
  readViewport(): { width: number; height: number };
  primeLazyContent(): Promise<PrimeReport>;
  waitForPaintCalm(baseline: number, maxMs: number): Promise<PaintCalm>;
  collectLiveRegionsRaw(): RawLiveRegions;
  collectTargetSizeRaw(interactive: string): RawTargetSize;
  runAxe(
    tags: string[],
    options?: { preload?: boolean; locale?: Locale | null },
  ): Promise<AxeResults>;
  crossOriginAssets(): { styleSheets: number; media: number };
  focusProbeStart(): void;
  focusFirstStop(): "focused" | "empty" | "failed";
  focusRelativeToSeed(): "before" | "at" | "after" | "unknown";
  readFocusedStop(record?: boolean): FocusProbe;
  readBaseStyles(selectors: string[]): Record<string, FocusStyle>;
  readFocusReach(): FocusReach;
  focusProbeEnd(): { x: number; y: number } | null;
  overlayShow(
    marks: OverlayMark[],
    focus: number | null,
    opts?: { scroll?: boolean; timeoutMs?: number },
  ): OverlayReport;
  overlayClear(): void;
  overlayRestoreScroll(): boolean;
  AXE_TAGS: string[];
};

declare global {
  interface Window {
    __accessCheckDom?: DomEngine;
  }
}

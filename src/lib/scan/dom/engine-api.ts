import type { AxeResults } from "axe-core";
import type { ElementInfo } from "../remediate";
import type { RawLiveRegions } from "../live-regions";
import type { RawTargetSize } from "../target-size";
import type { DomRect } from "./rects";

export const DOM_ENGINE_VERSION = 2;

export type DomEngine = {
  version: number;
  cssPath(el: Element | null): string;
  collectElementInfo(selectors: string[]): Record<string, ElementInfo>;
  collectRects(selectors: string[]): (DomRect | null)[];
  readViewport(): { width: number; height: number };
  collectLiveRegionsRaw(): RawLiveRegions;
  collectTargetSizeRaw(interactive: string): RawTargetSize;
  runAxe(tags: string[], options?: { preload?: boolean }): Promise<AxeResults>;
  crossOriginAssets(): { styleSheets: number; media: number };
  AXE_TAGS: string[];
};

declare global {
  interface Window {
    __accessCheckDom?: DomEngine;
  }
}

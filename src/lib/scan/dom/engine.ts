import { AXE_TAGS, crossOriginAssets, runAxeInPage } from "./axe";
import { collectElementInfo } from "./element-info";
import {
  focusFirstStop,
  focusProbeEnd,
  focusProbeStart,
  focusRelativeToSeed,
  readBaseStyles,
  readFocusReach,
  readFocusedStop,
} from "./focus";
import { DOM_ENGINE_VERSION, type DomEngine } from "./engine-api";
import { overlayClear, overlayRestoreScroll, overlayShow } from "./overlay";
import { collectLiveRegionsRaw } from "./live-regions";
import { primeLazyContent, waitForPaintCalm } from "./prime";
import {
  collectDocRects,
  collectRects,
  documentHeight,
  freezeOverlays,
  readViewport,
  restoreOverlays,
  scrollToDocY,
  stickyInset,
} from "./rects";
import { cssPath } from "./selector";
import { collectTargetSizeRaw } from "./target-size";

const engine: DomEngine = {
  version: DOM_ENGINE_VERSION,
  cssPath,
  collectElementInfo,
  collectRects,
  collectDocRects,
  stickyInset,
  scrollToDocY,
  freezeOverlays,
  restoreOverlays,
  documentHeight,
  readViewport,
  primeLazyContent,
  waitForPaintCalm,
  collectLiveRegionsRaw,
  collectTargetSizeRaw,
  runAxe: runAxeInPage,
  crossOriginAssets,
  focusProbeStart,
  focusFirstStop,
  focusRelativeToSeed,
  readFocusedStop,
  readBaseStyles,
  readFocusReach,
  focusProbeEnd,
  overlayShow,
  overlayClear,
  overlayRestoreScroll,
  AXE_TAGS,
};

window.__accessCheckDom = engine;

import { AXE_TAGS, crossOriginAssets, runAxeInPage } from "./axe";
import { collectElementInfo } from "./element-info";
import { collectIdentities } from "./identity";
import {
  focusFirstStop,
  focusProbeEnd,
  focusProbeStart,
  focusRelativeToSeed,
  focusSelector,
  readBaseStyles,
  readFocusReach,
  readFocusedStop,
} from "./focus";
import { DOM_ENGINE_VERSION, type DomEngine } from "./engine-api";
import { overlayClear, overlayRestoreScroll, overlayShow } from "./overlay";
import { collectLiveRegionsRaw } from "./live-regions";
import { primeLazyContent, waitForPaintCalm } from "./prime";
import { collectRects, readViewport } from "./rects";
import { cssPath } from "./selector";
import { verifyFixes } from "./verify";
import { collectTargetSizeRaw } from "./target-size";

const engine: DomEngine = {
  version: DOM_ENGINE_VERSION,
  cssPath,
  collectElementInfo,
  collectIdentities,
  collectRects,
  readViewport,
  primeLazyContent,
  waitForPaintCalm,
  collectLiveRegionsRaw,
  collectTargetSizeRaw,
  runAxe: runAxeInPage,
  crossOriginAssets,
  verifyFixes,
  focusProbeStart,
  focusFirstStop,
  focusSelector,
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

import { AXE_TAGS, crossOriginAssets, runAxeInPage } from "./axe";
import { collectElementInfo } from "./element-info";
import { collectIdentities } from "./identity";
import {
  focusFirstStop,
  focusProbeEnd,
  focusProbeStart,
  focusRelativeToSeed,
  focusSelector,
  matchStops,
  readBaseStyles,
  readFocusReach,
  readFocusedStop,
} from "./focus";
import { DOM_ENGINE_VERSION, type DomEngine } from "./engine-api";
import { overlayClear, overlayHover, overlayRestoreScroll, overlayShow } from "./overlay";
import { previewClear, previewShow, previewSide } from "./preview";
import { followStart, followStop } from "./follow";
import { collectLiveRegionsRaw } from "./live-regions";
import { primeLazyContent, waitForPaintCalm } from "./prime";
import { collectRects, documentHeight, readViewport, scrollToDocY, stickyInset } from "./rects";
import { readTextBoxes } from "./text-boxes";
import { cssPath } from "./selector";
import { verifyFixes } from "./verify";
import { collectTargetSizeRaw } from "./target-size";

const engine: DomEngine = {
  version: DOM_ENGINE_VERSION,
  cssPath,
  collectElementInfo,
  collectIdentities,
  collectRects,
  readTextBoxes,
  readViewport,
  documentHeight,
  stickyInset,
  scrollToDocY,
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
  matchStops,
  overlayShow,
  overlayClear,
  overlayHover,
  overlayRestoreScroll,
  previewShow,
  previewSide,
  previewClear,
  followStart,
  followStop,
  AXE_TAGS,
};

if (window.__accessCheckDom?.version !== engine.version) window.__accessCheckDom = engine;

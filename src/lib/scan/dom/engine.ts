import { AXE_TAGS, crossOriginAssets, runAxeInPage } from "./axe";
import { collectElementInfo } from "./element-info";
import { DOM_ENGINE_VERSION, type DomEngine } from "./engine-api";
import { collectLiveRegionsRaw } from "./live-regions";
import { collectRects, readViewport } from "./rects";
import { cssPath } from "./selector";
import { collectTargetSizeRaw } from "./target-size";

const engine: DomEngine = {
  version: DOM_ENGINE_VERSION,
  cssPath,
  collectElementInfo,
  collectRects,
  readViewport,
  collectLiveRegionsRaw,
  collectTargetSizeRaw,
  runAxe: runAxeInPage,
  crossOriginAssets,
  AXE_TAGS,
};

window.__accessCheckDom = engine;

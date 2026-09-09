import type { CDPSession, Page } from "playwright";
import type { OverviewStop, OverviewTile, ScanOverview } from "./types";
import {
  capturedHeightOf,
  emptyOverview,
  MAX_OVERVIEW_BYTES,
  MAX_OVERVIEW_MS,
  OVERVIEW_FALLBACK_SCALE,
  OVERVIEW_FORMAT,
  OVERVIEW_MIME,
  OVERVIEW_SCALE,
  planTiles,
  shouldRetrySmaller,
  type TilePlan,
} from "./overview-plan";

export { MAX_OVERVIEW_MS };

export type TileShot = { data: string; bytes: number };

export type TakeTile = (tile: TilePlan, scale: number) => Promise<TileShot | null>;

export type OverviewPass = { tiles: OverviewTile[]; bytes: number; stoppedBy: OverviewStop };

async function captureTile(
  cdp: CDPSession,
  clip: { x: number; y: number; width: number; height: number },
  quality: number,
  scale: number,
): Promise<TileShot | null> {
  const shot = await cdp
    .send("Page.captureScreenshot", {
      format: OVERVIEW_FORMAT,
      quality,
      clip: { ...clip, scale },
      captureBeyondViewport: true,
      fromSurface: true,
    })
    .catch(() => null);

  if (!shot?.data) return null;
  return { data: shot.data, bytes: Math.floor((shot.data.length * 3) / 4) };
}

export async function capturePass(
  plan: TilePlan[],
  scale: number,
  take: TakeTile,
  opts: { pageWidth: number; timeCap: number; planStop: OverviewStop; now?: () => number },
): Promise<OverviewPass> {
  const now = opts.now ?? Date.now;
  const tiles: OverviewTile[] = [];
  let stoppedBy = opts.planStop;
  let bytes = 0;

  for (const tile of plan) {
    if (now() > opts.timeCap) {
      stoppedBy = "time";
      break;
    }

    const shot = await take(tile, scale);

    if (!shot) {
      stoppedBy = tiles.length === 0 ? "error" : "time";
      break;
    }

    if (bytes + shot.bytes > MAX_OVERVIEW_BYTES) {
      stoppedBy = "bytes";
      break;
    }
    bytes += shot.bytes;

    tiles.push({
      image: `data:${OVERVIEW_MIME};base64,${shot.data}`,
      docY: tile.docY,
      docHeight: tile.docHeight,
      width: Math.round(opts.pageWidth * scale),
      height: Math.round(tile.docHeight * scale),
    });
  }

  return { tiles, bytes, stoppedBy };
}

export type OverviewOptions = {
  viewport: { width: number; height: number };
  quality: number;
  deadline: number;
};

export async function captureOverview(page: Page, opts: OverviewOptions): Promise<ScanOverview> {
  const { viewport, quality, deadline } = opts;
  const startedAt = Date.now();
  const timeCap = Math.min(deadline, startedAt + MAX_OVERVIEW_MS);

  const documentHeight = await page.evaluate(() => window.__accessCheckDom!.documentHeight());
  const plan = planTiles(documentHeight);
  if (plan.tiles.length === 0) return emptyOverview(viewport.width, documentHeight);

  let pass: OverviewPass = { tiles: [], bytes: 0, stoppedBy: plan.stoppedBy };
  let scale = OVERVIEW_SCALE;
  let cdp: CDPSession | null = null;

  try {
    await page.evaluate(() => window.__accessCheckDom!.freezeOverlays());
    cdp = await page.context().newCDPSession(page);

    const session = cdp;
    const take: TakeTile = (tile, at) =>
      captureTile(
        session,
        { x: 0, y: tile.docY, width: viewport.width, height: tile.docHeight },
        quality,
        at,
      );
    const passOpts = { pageWidth: viewport.width, timeCap, planStop: plan.stoppedBy };

    const preferredAt = Date.now();
    pass = await capturePass(plan.tiles, scale, take, passOpts);

    if (
      shouldRetrySmaller({
        stoppedBy: pass.stoppedBy,
        captured: pass.tiles.length,
        planned: plan.tiles.length,
        timeLeftMs: timeCap - Date.now(),
        spentMs: Date.now() - preferredAt,
      })
    ) {
      const smaller = await capturePass(plan.tiles, OVERVIEW_FALLBACK_SCALE, take, passOpts);
      if (capturedHeightOf(smaller.tiles) > capturedHeightOf(pass.tiles)) {
        pass = smaller;
        scale = OVERVIEW_FALLBACK_SCALE;
      }
    }
  } catch {
    if (pass.tiles.length === 0) return emptyOverview(viewport.width, documentHeight);
    pass = { ...pass, stoppedBy: "error" };
  } finally {
    if (cdp) await cdp.detach().catch(() => {});
    await page.evaluate(() => window.__accessCheckDom!.restoreOverlays()).catch(() => {});
  }

  const settled = await page
    .evaluate(() => window.__accessCheckDom!.documentHeight())
    .catch(() => documentHeight);

  const capturedHeight = capturedHeightOf(pass.tiles);

  return {
    tiles: pass.tiles,
    scale,
    pageWidth: viewport.width,
    documentHeight: Math.max(documentHeight, settled),
    capturedHeight,
    complete: pass.stoppedBy === "complete" && capturedHeight >= documentHeight,
    stoppedBy: capturedHeight >= Math.max(documentHeight, settled) ? "complete" : pass.stoppedBy,
    grew: settled > documentHeight ? true : undefined,
  };
}

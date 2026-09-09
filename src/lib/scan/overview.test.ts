import { describe, expect, it, vi } from "vitest";
import { capturePass, type TakeTile } from "./overview";
import {
  MAX_OVERVIEW_BYTES,
  OVERVIEW_MIME,
  OVERVIEW_SCALE,
  planTiles,
  type TilePlan,
} from "./overview-plan";

const FAR_FUTURE = 10_000;

function stub(shots: (number | null)[]): TakeTile {
  let n = 0;
  return async () => {
    const bytes = shots[n];
    n += 1;
    return bytes === null || bytes === undefined ? null : { data: `tile-${n}`, bytes };
  };
}

function pass(plan: TilePlan[], take: TakeTile, at = OVERVIEW_SCALE, now = () => 0) {
  return capturePass(plan, at, take, {
    pageWidth: 1200,
    timeCap: FAR_FUTURE,
    planStop: "complete",
    now,
  });
}

describe("photographing the page block by block", () => {
  it("hands back blocks the report can render, in the overview's own format", async () => {
    const { tiles } = planTiles(3_000);

    const result = await pass(tiles, stub([50_000, 20_000]));

    expect(result.tiles.map((t) => t.image)).toEqual([
      `data:${OVERVIEW_MIME};base64,tile-1`,
      `data:${OVERVIEW_MIME};base64,tile-2`,
    ]);
    expect(result.stoppedBy).toBe("complete");
  });

  it("records each block at the size it was actually photographed", async () => {
    const { tiles } = planTiles(3_000);

    const result = await pass(tiles, stub([50_000, 20_000]), 0.75);

    expect(result.tiles[0]).toMatchObject({ docY: 0, docHeight: 2000, width: 900, height: 1500 });
    expect(result.tiles[1]).toMatchObject({ docY: 2000, docHeight: 1000, width: 900, height: 750 });
  });

  it("photographs the same page smaller when asked for a smaller scale", async () => {
    const { tiles } = planTiles(2_000);

    const result = await pass(tiles, stub([50_000]), 0.5);

    expect(result.tiles[0]).toMatchObject({ width: 600, height: 1000 });
  });

  it("stops before it overshoots the weight a reading may carry", async () => {
    const { tiles } = planTiles(16_000);
    const heavy = Math.floor(MAX_OVERVIEW_BYTES / 3);

    const result = await pass(
      tiles,
      stub([heavy, heavy, heavy, heavy, heavy, heavy, heavy, heavy]),
    );

    expect(result.tiles).toHaveLength(3);
    expect(result.bytes).toBeLessThanOrEqual(MAX_OVERVIEW_BYTES);
    expect(result.stoppedBy).toBe("bytes");
  });

  it("calls it an error when not even the first block comes back", async () => {
    const { tiles } = planTiles(4_000);

    const result = await pass(tiles, stub([null]));

    expect(result.tiles).toEqual([]);
    expect(result.stoppedBy).toBe("error");
  });

  it("keeps the blocks it already has when a later one fails", async () => {
    const { tiles } = planTiles(6_000);

    const result = await pass(tiles, stub([10_000, null]));

    expect(result.tiles).toHaveLength(1);
    expect(result.stoppedBy).toBe("time");
  });

  it("gives up on the clock rather than overrunning the audit", async () => {
    const { tiles } = planTiles(6_000);
    const take = vi.fn(stub([10_000, 10_000, 10_000]));
    const clock = vi
      .fn<() => number>()
      .mockReturnValueOnce(0)
      .mockReturnValue(FAR_FUTURE + 1);

    const result = await pass(tiles, take, OVERVIEW_SCALE, clock);

    expect(result.tiles).toHaveLength(1);
    expect(result.stoppedBy).toBe("time");
    expect(take).toHaveBeenCalledTimes(1);
  });

  it("carries the plan's own reason through when every block was taken", async () => {
    const { tiles, stoppedBy } = planTiles(40_000);

    const result = await capturePass(tiles, OVERVIEW_SCALE, stub(tiles.map(() => 1_000)), {
      pageWidth: 1200,
      timeCap: FAR_FUTURE,
      planStop: stoppedBy,
      now: () => 0,
    });

    expect(result.tiles).toHaveLength(8);
    expect(result.stoppedBy).toBe("height");
  });
});

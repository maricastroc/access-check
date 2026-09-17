import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanOverview } from "./types";

const store = new Map<string, unknown>();
const set = vi.fn(async (key: string, value: unknown) => {
  store.set(key, value);
});
const get = vi.fn(async (key: string) => store.get(key) ?? null);
const findUnique = vi.fn();

vi.mock("@/lib/redis", () => ({
  redis: { set, get },
  namespaced: (key: string) => `access-check:${key}`,
}));
vi.mock("@/lib/prisma", () => ({ prisma: { tile: { findUnique } } }));

const { publishOverview, readTile, tileIdOf, TILE_PATH } = await import("./tile-store");

const overview = (tiles: number): ScanOverview => ({
  tiles: Array.from({ length: tiles }, (_, i) => ({
    image: `data:image/webp;base64,dGlsZS${i}`,
    docY: i * 2000,
    docHeight: 2000,
    width: 1200,
    height: 2000,
  })),
  scale: 1,
  pageWidth: 1200,
  documentHeight: tiles * 2000,
  capturedHeight: tiles * 2000,
  complete: true,
  stoppedBy: "complete",
});

beforeEach(() => {
  store.clear();
  set.mockClear();
  get.mockClear();
  findUnique.mockReset();
  findUnique.mockResolvedValue(null);
});

describe("publishing the overview", () => {
  it("hands back a web address for every block and keeps its place on the page", async () => {
    const published = await publishOverview(overview(3));

    expect(published.tiles).toHaveLength(3);
    published.tiles.forEach((tile, i) => {
      expect(tile.image.startsWith(`${TILE_PATH}/`)).toBe(true);
      expect(tile.docY).toBe(i * 2000);
      expect(tile.height).toBe(2000);
    });
  });

  it("gives each block its own address", async () => {
    const published = await publishOverview(overview(3));
    const ids = published.tiles.map((t) => tileIdOf(t.image));

    expect(new Set(ids).size).toBe(3);
  });

  it("leaves an overview with no blocks untouched", async () => {
    const empty = overview(0);

    expect(await publishOverview(empty)).toBe(empty);
  });

  it("keeps the picture inline when it cannot be stored", async () => {
    set.mockRejectedValueOnce(new Error("redis down"));
    const published = await publishOverview(overview(1));

    expect(published.tiles[0].image.startsWith("data:")).toBe(true);
  });
});

describe("reading a block back", () => {
  it("returns what was stored", async () => {
    const published = await publishOverview(overview(1));
    const id = tileIdOf(published.tiles[0].image)!;

    expect((await readTile(id))?.data).toBe("dGlsZS0");
  });

  it("falls back to the saved audit once the cache has expired", async () => {
    findUnique.mockResolvedValue({
      data: Buffer.from("saved-bytes"),
      mimeType: "image/webp",
    });

    const tile = await readTile("9d4b1e22-77aa-4c31-8f05-6b1d2e3f4a5b");

    expect(tile?.data).toBe(Buffer.from("saved-bytes").toString("base64"));
  });

  it("reports nothing when a block is gone from both places", async () => {
    expect(await readTile("3f1a7c58-0b2e-4c8d-9a61-2b7c4d5e6f70")).toBeNull();
  });

  it("does not go looking for an address that could never have been issued", async () => {
    expect(await readTile("../../etc/passwd")).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("survives the saved audit being unreachable", async () => {
    findUnique.mockRejectedValue(new Error("db down"));

    expect(await readTile("3f1a7c58-0b2e-4c8d-9a61-2b7c4d5e6f70")).toBeNull();
  });
});

describe("reading an address", () => {
  it("recognises a stored block", () => {
    expect(tileIdOf(`${TILE_PATH}/abc-123`)).toBe("abc-123");
  });

  it("ignores a picture that is still inline", () => {
    expect(tileIdOf("data:image/webp;base64,abc")).toBeNull();
  });
});

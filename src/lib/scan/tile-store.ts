import { randomUUID } from "crypto";
import { namespaced, redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { logWarn } from "@/lib/observability/log";
import type { ScanOverview, OverviewTile } from "./types";

export const TILE_TTL_SECONDS = 60 * 60;

export const TILE_PATH = "/api/tile";

type StoredTile = { mimeType: string; data: string };

const MEMORY_TILES = 64;

const memory = new Map<string, StoredTile>();

function remember(key: string, tile: StoredTile): void {
  memory.delete(key);
  memory.set(key, tile);
  while (memory.size > MEMORY_TILES) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
}

const TILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function keyOf(id: string): string {
  return `tile:${id}`;
}

function parseDataUrl(image: string): StoredTile | null {
  const match = image.match(/^data:([^;]+);base64,(.+)$/);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

async function putTile(tile: OverviewTile): Promise<OverviewTile> {
  const parsed = parseDataUrl(tile.image);
  if (!parsed) return tile;

  const id = randomUUID();

  if (redis) {
    try {
      await redis.set(namespaced(keyOf(id)), parsed, { ex: TILE_TTL_SECONDS });
    } catch (e) {
      logWarn("tile.write.failed", e, { id });
      return tile;
    }
  }

  remember(keyOf(id), parsed);
  return { ...tile, image: `${TILE_PATH}/${id}` };
}

export async function publishOverview(overview: ScanOverview): Promise<ScanOverview> {
  if (overview.tiles.length === 0) return overview;

  const tiles = await Promise.all(overview.tiles.map(putTile));
  return { ...overview, tiles };
}

export function tileIdOf(image: string): string | null {
  return image.startsWith(`${TILE_PATH}/`) ? image.slice(TILE_PATH.length + 1) : null;
}

export async function readTile(id: string): Promise<StoredTile | null> {
  if (!TILE_ID.test(id)) return null;

  const local = memory.get(keyOf(id));
  if (local) return local;

  const cached = redis
    ? await redis.get<StoredTile>(namespaced(keyOf(id))).catch(() => null)
    : null;
  if (cached?.data) {
    remember(keyOf(id), cached);
    return cached;
  }

  const saved = await prisma.tile
    .findUnique({ where: { id }, select: { data: true, mimeType: true } })
    .catch(() => null);
  if (!saved) return null;

  const stored = {
    mimeType: saved.mimeType,
    data: Buffer.from(saved.data).toString("base64"),
  };
  remember(keyOf(id), stored);
  return stored;
}

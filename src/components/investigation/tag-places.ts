import {
  candidates,
  chooseSpot,
  clash,
  leaderOf,
  overlap,
  type Rect,
  type Spot,
} from "@/lib/scan/dom/label-spots";

export type TagRequest = {
  key: string;
  anchor: Rect;
  inset: number;
  w: number;
  h: number;
  shape: "square" | "circle";
  yields: boolean;
  fixed?: boolean;
  own?: Rect;
};

export type Leader = { x1: number; y1: number; x2: number; y2: number };

export type PlacedTag = { spot: Rect; leader: Leader | null };

export const OVERHANG = 18;

const shift = (r: Rect, by: number): Rect => ({ ...r, x: r.x + by, y: r.y + by });

const measured = (r: Rect) => [r.x, r.y, r.w, r.h].every(Number.isFinite);

export function aroundOf(request: Pick<TagRequest, "anchor" | "inset">): Rect {
  const { anchor: a, inset: i } = request;
  return { x: a.x - i, y: a.y - i, w: a.w + i * 2, h: a.h + i * 2 };
}

export function placeTags(
  requests: TagRequest[],
  bounds: { w: number; h: number },
  obstacles: { texts: Rect[]; marked: Rect[] },
): Map<string, PlacedTag> {
  const view = { w: bounds.w + OVERHANG * 2, h: bounds.h + OVERHANG * 2 };
  const texts = obstacles.texts.filter(measured).map((r) => shift(r, OVERHANG));
  const marked = obstacles.marked.filter(measured).map((r) => shift(r, OVERHANG));
  const taken: Rect[] = [];
  const placed = new Map<string, PlacedTag>();
  const fits = (c: Rect) => c.x >= 0 && c.y >= 0 && c.x + c.w <= view.w && c.y + c.h <= view.h;

  const leastCrowded = (
    around: Rect,
    size: { w: number; h: number },
    shape: TagRequest["shape"],
  ) => {
    const all = candidates(around, size, shape);
    const inside = all.filter(fits);
    const pool = inside.length > 0 ? inside : all.filter((c) => !c.far);
    const crowd = (c: Rect) => taken.reduce((sum, o) => sum + overlap(c, o), 0);
    return pool.reduce((best, c) => (crowd(c) < crowd(best) ? c : best));
  };

  for (const request of requests) {
    const around = shift(aroundOf(request), OVERHANG);
    const size = { w: request.w, h: request.h };
    const near = candidates(around, size, request.shape).filter((c) => !c.far);
    let spot: Spot | null = null;
    if (request.fixed) {
      spot = near.find((c) => fits(c) && !taken.some((o) => clash(c, o))) ?? null;
    } else {
      const chosen = chooseSpot({
        around,
        size,
        shape: request.shape,
        view,
        texts,
        marked,
        taken,
      });
      const own = shift(request.anchor, OVERHANG);
      const onAnother =
        chosen !== null &&
        marked.some(
          (m) =>
            !(m.x === own.x && m.y === own.y && m.w === own.w && m.h === own.h) &&
            overlap(chosen, m) > 0,
        );
      spot = request.yields
        ? onAnother
          ? null
          : chosen
        : (chosen ?? leastCrowded(around, size, request.shape));
    }
    if (!spot) continue;
    const x = Math.min(Math.max(spot.x, 0), view.w - spot.w);
    const y = Math.min(Math.max(spot.y, 0), view.h - spot.h);
    const kept = { x, y, w: spot.w, h: spot.h };
    taken.push(kept);
    if (request.own) taken.push(shift(request.own, OVERHANG));
    const back = shift(kept, -OVERHANG);
    placed.set(request.key, {
      spot: back,
      leader: spot.far ? leaderOf(back, aroundOf(request)) : null,
    });
  }
  return placed;
}

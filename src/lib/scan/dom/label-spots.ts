export type Rect = { x: number; y: number; w: number; h: number };

export type LabelShape = "square" | "circle";

export type SpotRequest = {
  around: Rect;
  size: { w: number; h: number };
  shape: LabelShape;
  view: { w: number; h: number };
  texts: readonly Rect[];
  marked: readonly Rect[];
  taken: readonly Rect[];
};

export type Spot = Rect & { far: boolean };

export const GAPS = [2, 14, 30] as const;

export const WEIGHT = { text: 4, marked: 1, distance: 2, order: 0.5 } as const;

const EDGE = 2;

type Side =
  | "above"
  | "below"
  | "left"
  | "right"
  | "aboveEnd"
  | "belowEnd"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight";

const SIDES: Record<Side, (a: Rect, w: number, h: number, g: number) => Rect> = {
  above: (a, w, h, g) => ({ x: a.x, y: a.y - h - g, w, h }),
  below: (a, w, h, g) => ({ x: a.x, y: a.y + a.h + g, w, h }),
  left: (a, w, h, g) => ({ x: a.x - w - g, y: a.y, w, h }),
  right: (a, w, h, g) => ({ x: a.x + a.w + g, y: a.y, w, h }),
  aboveEnd: (a, w, h, g) => ({ x: a.x + a.w - w, y: a.y - h - g, w, h }),
  belowEnd: (a, w, h, g) => ({ x: a.x + a.w - w, y: a.y + a.h + g, w, h }),
  topLeft: (a, w, h, g) => ({ x: a.x - w - (g - EDGE), y: a.y - h - (g - EDGE), w, h }),
  topRight: (a, w, h, g) => ({ x: a.x + a.w + (g - EDGE), y: a.y - h - (g - EDGE), w, h }),
  bottomLeft: (a, w, h, g) => ({ x: a.x - w - (g - EDGE), y: a.y + a.h + (g - EDGE), w, h }),
  bottomRight: (a, w, h, g) => ({ x: a.x + a.w + (g - EDGE), y: a.y + a.h + (g - EDGE), w, h }),
};

const ORDER: Record<LabelShape, Side[]> = {
  square: [
    "above",
    "below",
    "left",
    "aboveEnd",
    "belowEnd",
    "right",
    "topLeft",
    "bottomLeft",
    "topRight",
    "bottomRight",
  ],
  circle: [
    "topLeft",
    "above",
    "left",
    "bottomLeft",
    "below",
    "right",
    "topRight",
    "bottomRight",
    "aboveEnd",
    "belowEnd",
  ],
};

export function overlap(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

export function clash(a: Rect, b: Rect, margin = 3): boolean {
  return (
    a.x < b.x + b.w + margin &&
    b.x < a.x + a.w + margin &&
    a.y < b.y + b.h + margin &&
    b.y < a.y + a.h + margin
  );
}

function inside(c: Rect, view: SpotRequest["view"]): boolean {
  return c.x >= EDGE && c.y >= EDGE && c.x + c.w <= view.w - EDGE && c.y + c.h <= view.h - EDGE;
}

export function candidates(around: Rect, size: SpotRequest["size"], shape: LabelShape): Spot[] {
  return GAPS.flatMap((gap, g) =>
    ORDER[shape].map((side) => ({ ...SIDES[side](around, size.w, size.h, gap), far: g > 0 })),
  );
}

export function costOf(c: Rect, gap: number, rank: number, req: SpotRequest): number {
  const text = req.texts.reduce((sum, t) => sum + overlap(c, t), 0);
  const marked = req.marked.reduce((sum, m) => sum + overlap(c, m), 0);
  return WEIGHT.text * text + WEIGHT.marked * marked + WEIGHT.distance * gap + WEIGHT.order * rank;
}

export function chooseSpot(req: SpotRequest): Spot | null {
  const reach = GAPS[GAPS.length - 1] + Math.max(req.size.w, req.size.h);
  const area = {
    x: req.around.x - reach,
    y: req.around.y - reach,
    w: req.around.w + reach * 2,
    h: req.around.h + reach * 2,
  };
  const near = {
    ...req,
    texts: req.texts.filter((t) => overlap(t, area) > 0),
    marked: req.marked.filter((m) => overlap(m, area) > 0),
  };
  const sides = ORDER[req.shape].length;
  const all = candidates(req.around, req.size, req.shape);
  let best: Spot | null = null;
  let lowest = Infinity;
  for (let i = 0; i < all.length; i++) {
    const c = all[i];
    if (!inside(c, req.view) || req.taken.some((o) => clash(c, o))) continue;
    const cost = costOf(c, GAPS[Math.floor(i / sides)], i % sides, near);
    if (cost < lowest) {
      lowest = cost;
      best = c;
    }
  }
  return best;
}

export function leaderOf(
  spot: Rect,
  around: Rect,
): { x1: number; y1: number; x2: number; y2: number } {
  const cx = spot.x + spot.w / 2;
  const cy = spot.y + spot.h / 2;
  const x2 = Math.min(Math.max(cx, around.x), around.x + around.w);
  const y2 = Math.min(Math.max(cy, around.y), around.y + around.h);
  const x1 = Math.min(Math.max(x2, spot.x), spot.x + spot.w);
  const y1 = Math.min(Math.max(y2, spot.y), spot.y + spot.h);
  return { x1, y1, x2, y2 };
}

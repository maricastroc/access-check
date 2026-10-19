import type { TextBox } from "./types";

type Rect = { x: number; y: number; w: number; h: number };

export const MAX_TEXT_BOXES = 400;

const MIN_SIDE = 2;
const SAME_LINE = 3;
const WORD_GAP = 8;
const LINE_GAP = 6;

function clipTo(r: Rect, view: { width: number; height: number }): Rect | null {
  const x = Math.max(0, r.x);
  const y = Math.max(0, r.y);
  const w = Math.min(view.width, r.x + r.w) - x;
  const h = Math.min(view.height, r.y + r.h) - y;
  return w >= MIN_SIDE && h >= MIN_SIDE ? { x, y, w, h } : null;
}

function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}

function joinLines(rects: Rect[]): Rect[] {
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const out: Rect[] = [];
  for (const r of sorted) {
    const last = out.at(-1);
    if (
      last &&
      Math.abs(last.y - r.y) <= SAME_LINE &&
      Math.abs(last.h - r.h) <= SAME_LINE &&
      r.x <= last.x + last.w + WORD_GAP
    ) {
      out[out.length - 1] = union(last, r);
    } else {
      out.push(r);
    }
  }
  return out;
}

function joinBlocks(rects: Rect[]): Rect[] {
  const out: Rect[] = [];
  for (const r of [...rects].sort((a, b) => a.x - b.x || a.y - b.y)) {
    const near = out.findIndex(
      (o) =>
        r.y <= o.y + o.h + LINE_GAP &&
        o.y <= r.y + r.h + LINE_GAP &&
        r.x < o.x + o.w &&
        o.x < r.x + r.w,
    );
    if (near >= 0) out[near] = union(out[near], r);
    else out.push(r);
  }
  return out;
}

const percent = (value: number, of: number) => Math.round((value / of) * 1000) / 10;

export function compactTextBoxes(
  rects: Rect[],
  view: { width: number; height: number },
): TextBox[] {
  let boxes = joinLines(rects.map((r) => clipTo(r, view)).filter((r): r is Rect => r !== null));
  if (boxes.length > MAX_TEXT_BOXES) boxes = joinBlocks(boxes);
  if (boxes.length > MAX_TEXT_BOXES) {
    boxes = [...boxes].sort((a, b) => b.w * b.h - a.w * a.h).slice(0, MAX_TEXT_BOXES);
  }
  return boxes.map((r) => [
    percent(r.x, view.width),
    percent(r.y, view.height),
    percent(r.w, view.width),
    percent(r.h, view.height),
  ]);
}

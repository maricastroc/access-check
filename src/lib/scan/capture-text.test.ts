import { describe, expect, it } from "vitest";
import { compactTextBoxes, MAX_TEXT_BOXES } from "./capture-text";

const view = { width: 1200, height: 800 };

describe("the text boxes a capture keeps", () => {
  it("keeps them in percent of the capture, as the marks are", () => {
    expect(compactTextBoxes([{ x: 120, y: 80, w: 240, h: 20 }], view)).toEqual([[10, 10, 20, 2.5]]);
  });

  it("cuts them to the capture and drops what falls outside or is too thin", () => {
    expect(
      compactTextBoxes(
        [
          { x: -60, y: 790, w: 180, h: 30 },
          { x: 1300, y: 10, w: 50, h: 20 },
          { x: 10, y: 10, w: 1, h: 20 },
        ],
        view,
      ),
    ).toEqual([[0, 98.8, 10, 1.3]]);
  });

  it("joins the words of one line into one box", () => {
    const words = [0, 1, 2, 3].map((i) => ({ x: 100 + i * 64, y: 200, w: 60, h: 18 }));
    expect(compactTextBoxes(words, view)).toHaveLength(1);
  });

  it("keeps separate lines apart while there is room", () => {
    const lines = [0, 1, 2].map((i) => ({ x: 100, y: 200 + i * 24, w: 400, h: 18 }));
    expect(compactTextBoxes(lines, view)).toHaveLength(3);
  });

  it("stays under its limit on a page full of text, by joining lines into blocks", () => {
    const lines = Array.from({ length: 900 }, (_, i) => ({
      x: (i % 3) * 400,
      y: Math.floor(i / 3) * 2.6,
      w: 380,
      h: 2.4,
    }));
    const kept = compactTextBoxes(lines, view);
    expect(kept.length).toBeLessThanOrEqual(MAX_TEXT_BOXES);
    expect(kept.length).toBeLessThan(10);
  });
});

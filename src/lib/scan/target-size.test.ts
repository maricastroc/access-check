import { describe, expect, it } from "vitest";
import { analyzeTargetSize, type TargetRect } from "./target-size";

const target = (
  selector: string,
  x: number,
  y: number,
  w: number,
  h: number,
  inline = false,
): TargetRect => ({ selector, x, y, w, h, inline });

describe("analyzeTargetSize", () => {
  it("large targets produce no finding", () => {
    const r = analyzeTargetSize({
      targets: [target("#a", 0, 0, 40, 40), target("#b", 0, 100, 48, 24)],
    });
    expect(r.findings).toHaveLength(0);
    expect(r.measured).toBe(2);
  });

  it("small but isolated target passes via the spacing exception", () => {
    const r = analyzeTargetSize({
      targets: [target("#tiny", 0, 0, 16, 16), target("#far", 200, 200, 16, 16)],
    });
    expect(r.findings).toHaveLength(0);
  });

  it("small targets crowding each other both violate", () => {
    const r = analyzeTargetSize({
      targets: [target("#a", 0, 0, 16, 16), target("#b", 20, 0, 16, 16)],
    });
    const f = r.findings.find((x) => x.id === "target-size");
    expect(f?.count).toBe(2);
    expect(f?.selectors).toEqual(expect.arrayContaining(["#a", "#b"]));
    expect(f?.severity).toBe("serious");
  });

  it("small target hugging a large neighbour violates", () => {
    const r = analyzeTargetSize({
      targets: [target("#small", 0, 0, 16, 16), target("#big", 18, 0, 60, 60)],
    });
    const f = r.findings.find((x) => x.id === "target-size");
    expect(f?.count).toBe(1);
    expect(f?.selectors).toEqual(["#small"]);
  });

  it("inline links inside text are exempt", () => {
    const r = analyzeTargetSize({
      targets: [
        target("#link", 0, 0, 16, 16, true),
        target("#other", 20, 0, 16, 16, true),
      ],
    });
    expect(r.findings).toHaveLength(0);
  });

  it("only one undersized dimension is enough to flag", () => {
    const r = analyzeTargetSize({
      targets: [target("#thin", 0, 0, 60, 12), target("#n", 0, 14, 60, 12)],
    });
    expect(r.findings.find((x) => x.id === "target-size")?.count).toBe(2);
  });

  it("ignores zero-size targets", () => {
    const r = analyzeTargetSize({
      targets: [target("#ghost", 0, 0, 0, 0), target("#n", 5, 0, 0, 0)],
    });
    expect(r.findings).toHaveLength(0);
  });

  it("caps the reported selectors but keeps the full count", () => {
    const targets: TargetRect[] = [];
    for (let i = 0; i < 12; i++) targets.push(target(`#t-${i}`, i * 10, 0, 16, 16));
    const f = analyzeTargetSize({ targets }).findings.find((x) => x.id === "target-size");
    expect(f?.count).toBe(12);
    expect(f?.selectors.length).toBe(8);
  });
});

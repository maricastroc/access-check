import { describe, expect, it } from "vitest";
import { analyzeReducedMotion, type RunningAnimation } from "./reduced-motion";

const anim = (selector: string, extra: Partial<RunningAnimation> = {}): RunningAnimation => ({
  selector,
  durationMs: extra.durationMs ?? 1000,
  infinite: extra.infinite ?? false,
  properties: extra.properties ?? ["transform"],
});

describe("analyzeReducedMotion", () => {
  it("returns nothing when the check did not run", () => {
    const r = analyzeReducedMotion({ ran: false, animations: [] });
    expect(r.ran).toBe(false);
    expect(r.findings).toHaveLength(0);
  });

  it("no running animations under reduce → clean", () => {
    const r = analyzeReducedMotion({ ran: true, animations: [] });
    expect(r.ran).toBe(true);
    expect(r.findings).toHaveLength(0);
  });

  it("infinite animation always violates, even if short", () => {
    const r = analyzeReducedMotion({
      ran: true,
      animations: [anim("#spinner", { durationMs: 100, infinite: true })],
    });
    const f = r.findings.find((x) => x.id === "reduced-motion");
    expect(f?.count).toBe(1);
    expect(f?.selectors).toContain("#spinner");
    expect(f?.severity).toBe("moderate");
  });

  it("short one-shot transition is ignored", () => {
    const r = analyzeReducedMotion({
      ran: true,
      animations: [anim("#btn", { durationMs: 120, infinite: false })],
    });
    expect(r.findings).toHaveLength(0);
  });

  it("long transform animation violates", () => {
    const r = analyzeReducedMotion({
      ran: true,
      animations: [anim("#hero", { durationMs: 800, properties: ["transform"] })],
    });
    expect(r.findings.find((x) => x.id === "reduced-motion")?.count).toBe(1);
  });

  it("long opacity-only fade is exempt", () => {
    const r = analyzeReducedMotion({
      ran: true,
      animations: [anim("#toast", { durationMs: 800, properties: ["opacity"] })],
    });
    expect(r.findings).toHaveLength(0);
  });

  it("counts unique selectors and reports running total", () => {
    const r = analyzeReducedMotion({
      ran: true,
      animations: [
        anim("#a", { infinite: true }),
        anim("#a", { infinite: true }),
        anim("#b", { durationMs: 900 }),
      ],
    });
    const f = r.findings.find((x) => x.id === "reduced-motion");
    expect(f?.count).toBe(2);
    expect(r.running).toBe(3);
  });
});

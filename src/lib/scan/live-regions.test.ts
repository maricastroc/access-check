import { describe, expect, it } from "vitest";
import { analyzeLiveRegions, type LiveRegion } from "./live-regions";

const region = (selector: string, extra: Partial<LiveRegion> = {}): LiveRegion => ({
  selector,
  role: extra.role ?? null,
  ariaLive: extra.ariaLive ?? null,
  hidden: extra.hidden ?? false,
  ariaHidden: extra.ariaHidden ?? false,
});

describe("analyzeLiveRegions", () => {
  it("well-formed regions produce no finding", () => {
    const r = analyzeLiveRegions({
      regions: [
        region("#a", { ariaLive: "polite" }),
        region("#b", { role: "status", ariaLive: "polite" }),
        region("#c", { role: "alert" }),
      ],
    });
    expect(r.findings).toHaveLength(0);
    expect(r.regions).toBe(3);
  });

  it("visually-hidden (clip) live region is fine — not display:none", () => {
    const r = analyzeLiveRegions({
      regions: [region("#sr", { ariaLive: "polite", hidden: false })],
    });
    expect(r.findings).toHaveLength(0);
  });

  it("invalid aria-live value is flagged", () => {
    const r = analyzeLiveRegions({
      regions: [region("#x", { ariaLive: "loud" })],
    });
    const f = r.findings.find((x) => x.id === "live-region-invalid");
    expect(f?.count).toBe(1);
    expect(f?.severity).toBe("serious");
  });

  it("display:none live region is flagged as hidden", () => {
    const r = analyzeLiveRegions({
      regions: [region("#toast", { ariaLive: "polite", hidden: true })],
    });
    expect(r.findings.find((x) => x.id === "live-region-hidden")?.count).toBe(1);
  });

  it("aria-hidden live region is flagged as hidden", () => {
    const r = analyzeLiveRegions({
      regions: [region("#s", { role: "status", ariaHidden: true })],
    });
    expect(r.findings.find((x) => x.id === "live-region-hidden")?.count).toBe(1);
  });

  it('alert muted with aria-live="off" is flagged', () => {
    const r = analyzeLiveRegions({
      regions: [region("#alert", { role: "alert", ariaLive: "off" })],
    });
    const f = r.findings.find((x) => x.id === "live-region-muted");
    expect(f?.count).toBe(1);
    expect(f?.severity).toBe("moderate");
  });

  it("a status with aria-live=off is not treated as a muted alert", () => {
    const r = analyzeLiveRegions({
      regions: [region("#s", { role: "status", ariaLive: "off" })],
    });
    expect(r.findings.find((x) => x.id === "live-region-muted")).toBeUndefined();
  });

  it("orders findings most-severe first", () => {
    const r = analyzeLiveRegions({
      regions: [
        region("#muted", { role: "alert", ariaLive: "off" }),
        region("#bad", { ariaLive: "nope" }),
      ],
    });
    expect(r.findings[0].severity).toBe("serious");
    expect(r.findings.at(-1)?.severity).toBe("moderate");
  });
});

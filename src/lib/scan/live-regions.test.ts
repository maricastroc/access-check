import { describe, expect, it } from "vitest";
import { analyzeLiveRegions, type LiveRegion } from "./live-regions";
import { translator } from "../i18n/t";

const t = translator();

const region = (selector: string, extra: Partial<LiveRegion> = {}): LiveRegion => ({
  selector,
  role: extra.role ?? null,
  ariaLive: extra.ariaLive ?? null,
  hidden: extra.hidden ?? false,
  ariaHidden: extra.ariaHidden ?? false,
  hasText: extra.hasText,
});

describe("analyzeLiveRegions", () => {
  it("well-formed regions produce no finding", () => {
    const r = analyzeLiveRegions(
      {
        regions: [
          region("#a", { ariaLive: "polite" }),
          region("#b", { role: "status", ariaLive: "polite" }),
          region("#c", { role: "alert" }),
        ],
      },
      t,
    );
    expect(r.findings).toHaveLength(0);
    expect(r.regions).toBe(3);
  });

  it("visually-hidden (clip) live region is fine — not display:none", () => {
    const r = analyzeLiveRegions(
      {
        regions: [region("#sr", { ariaLive: "polite", hidden: false })],
      },
      t,
    );
    expect(r.findings).toHaveLength(0);
  });

  it("invalid aria-live value is flagged", () => {
    const r = analyzeLiveRegions(
      {
        regions: [region("#x", { ariaLive: "loud" })],
      },
      t,
    );
    const f = r.findings.find((x) => x.id === "live-region-invalid");
    expect(f?.count).toBe(1);
    expect(f?.severity).toBe("serious");
  });

  it("a display:none live region asks for a human check instead of failing", () => {
    const r = analyzeLiveRegions(
      {
        regions: [region("#toast", { ariaLive: "polite", hidden: true, hasText: false })],
      },
      t,
    );
    expect(r.findings.find((x) => x.id === "live-region-hidden")).toBeUndefined();
    const f = r.findings.find((x) => x.id === "live-region-conditional");
    expect(f?.count).toBe(1);
    expect(f?.evidence).toBe("heuristic");
  });

  it("an alert that starts hidden, waiting to be revealed, is not a failure", () => {
    const r = analyzeLiveRegions(
      {
        regions: [region("#thanks", { role: "alert", hidden: true, hasText: true })],
      },
      t,
    );
    expect(r.findings.map((x) => x.id)).toEqual(["live-region-conditional"]);
    expect(r.findings[0].evidence).toBe("heuristic");
  });

  it("a region showing text with aria-hidden is a measured failure", () => {
    const r = analyzeLiveRegions(
      {
        regions: [region("#s", { role: "status", ariaHidden: true, hasText: true })],
      },
      t,
    );
    const f = r.findings.find((x) => x.id === "live-region-hidden");
    expect(f?.count).toBe(1);
    expect(f?.evidence).toBe("measured");
    expect(f?.severity).toBe("serious");
  });

  it("an empty region with aria-hidden asks for a human check", () => {
    const r = analyzeLiveRegions(
      {
        regions: [region("#s", { role: "status", ariaHidden: true, hasText: false })],
      },
      t,
    );
    expect(r.findings.map((x) => x.id)).toEqual(["live-region-conditional"]);
  });

  it("a region hidden both ways is read as starting hidden", () => {
    const r = analyzeLiveRegions(
      {
        regions: [
          region("#s", { ariaLive: "polite", ariaHidden: true, hidden: true, hasText: true }),
        ],
      },
      t,
    );
    expect(r.findings.map((x) => x.id)).toEqual(["live-region-conditional"]);
  });

  it('alert muted with aria-live="off" is flagged', () => {
    const r = analyzeLiveRegions(
      {
        regions: [region("#alert", { role: "alert", ariaLive: "off" })],
      },
      t,
    );
    const f = r.findings.find((x) => x.id === "live-region-muted");
    expect(f?.count).toBe(1);
    expect(f?.severity).toBe("moderate");
  });

  it("a status with aria-live=off is not treated as a muted alert", () => {
    const r = analyzeLiveRegions(
      {
        regions: [region("#s", { role: "status", ariaLive: "off" })],
      },
      t,
    );
    expect(r.findings.find((x) => x.id === "live-region-muted")).toBeUndefined();
  });

  it("orders findings most-severe first", () => {
    const r = analyzeLiveRegions(
      {
        regions: [
          region("#muted", { role: "alert", ariaLive: "off" }),
          region("#bad", { ariaLive: "nope" }),
        ],
      },
      t,
    );
    expect(r.findings[0].severity).toBe("serious");
    expect(r.findings.at(-1)?.severity).toBe("moderate");
  });
});

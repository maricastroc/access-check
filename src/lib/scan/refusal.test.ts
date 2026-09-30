import { describe, expect, it } from "vitest";
import { refusedByTheSite } from "./refusal";

describe("telling a refused visit from a broken page", () => {
  it("reads a 403 or a 429 as the site turning the visit away", () => {
    expect(refusedByTheSite(403, {}, "https://www.aesop.com/")).toBe(true);
    expect(refusedByTheSite(429, {}, "https://example.com/")).toBe(true);
  });

  it("reads a bot challenge as a refusal whatever the status", () => {
    expect(refusedByTheSite(503, { "cf-mitigated": "challenge" }, "https://example.com/")).toBe(
      true,
    );
    expect(
      refusedByTheSite(503, {}, "https://www.aesop.com/?__cf_chl_rt_tk=akmZlb2i5bZ2hoOUt5E"),
    ).toBe(true);
    expect(refusedByTheSite(401, { "x-datadome": "protected" }, "https://example.com/")).toBe(true);
  });

  it("leaves a missing page or a failing server as an error of the page", () => {
    expect(refusedByTheSite(404, {}, "https://example.com/gone")).toBe(false);
    expect(refusedByTheSite(500, { server: "cloudflare" }, "https://example.com/")).toBe(false);
    expect(refusedByTheSite(200, { "cf-mitigated": "challenge" }, "https://example.com/")).toBe(
      false,
    );
  });
});

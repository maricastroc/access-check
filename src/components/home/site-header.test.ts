import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const header = readFileSync(fileURLToPath(new URL("./site-header.tsx", import.meta.url)), "utf8");

describe("the site header", () => {
  it("points its section links at the home page, so they work from any page", () => {
    const hrefs = [...header.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.filter((href) => href.startsWith("#"))).toEqual([]);
    expect(hrefs).toContain("/#how");
  });
});

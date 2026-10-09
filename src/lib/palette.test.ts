import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PALETTE, type PaletteToken } from "./palette";
import { contrastRatio } from "./scan/remediate";

const css = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");

const theme = Object.fromEntries(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [
    m[1],
    m[2].toLowerCase(),
  ]),
) as Record<string, string>;

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const WHITE = "#ffffff";
const color = (name: PaletteToken | typeof WHITE) => (name === WHITE ? WHITE : theme[name]);

const TEXT = 4.5;
const LARGE = 3;
const MARK = 3;

const CHECKS: [string, PaletteToken | typeof WHITE, PaletteToken, number][] = [
  ["ink on canvas", "ink", "canvas", TEXT],
  ["ink on surface", "ink", "surface", TEXT],
  ["ink on booth", "ink", "booth", TEXT],
  ["ink on band", "ink", "band", TEXT],
  ["ink on code", "ink", "code", TEXT],
  ["ink-2 on canvas", "ink-2", "canvas", TEXT],
  ["ink-2 on surface", "ink-2", "surface", TEXT],
  ["ink-2 on booth", "ink-2", "booth", TEXT],
  ["body on surface", "body", "surface", TEXT],
  ["muted on canvas", "muted", "canvas", TEXT],
  ["muted on surface", "muted", "surface", TEXT],
  ["muted on band", "muted", "band", TEXT],
  ["muted on booth", "muted", "booth", TEXT],
  ["steel on surface", "steel", "surface", TEXT],
  ["surface on ink", "surface", "ink", TEXT],
  ["white on critical", WHITE, "critical", TEXT],
  ["ink on serious", "ink", "serious", TEXT],
  ["ink on moderate", "ink", "moderate", TEXT],
  ["white on accent", WHITE, "accent", TEXT],
  ["white on path", WHITE, "path", TEXT],
  ["white on verified", WHITE, "verified", TEXT],
  ["critical on surface", "critical", "surface", TEXT],
  ["serious large text on surface", "serious", "surface", LARGE],
  ["moderate-text on surface", "moderate-text", "surface", TEXT],
  ["moderate-text on canvas", "moderate-text", "canvas", TEXT],
  ["critical-text on canvas", "critical-text", "canvas", TEXT],
  ["critical-text on surface", "critical-text", "surface", TEXT],
  ["serious-text on canvas", "serious-text", "canvas", TEXT],
  ["serious-text on surface", "serious-text", "surface", TEXT],
  ["review-text on canvas", "review-text", "canvas", TEXT],
  ["review-text on surface", "review-text", "surface", TEXT],
  ["verified on surface", "verified", "surface", TEXT],
  ["review on surface", "review", "surface", TEXT],
  ["path on surface", "path", "surface", TEXT],
  ["ink focus and brackets on canvas", "ink", "canvas", MARK],
  ["ink focus and brackets on booth", "ink", "booth", MARK],
  ["critical mark on canvas", "critical", "canvas", MARK],
  ["serious mark on canvas", "serious", "canvas", MARK],
  ["moderate mark edge on canvas", "moderate-text", "canvas", MARK],
  ["review mark on canvas", "review", "canvas", MARK],
  ["verified glyph on canvas", "verified", "canvas", MARK],
  ["path line on surface", "path", "surface", MARK],
  ["gauge ticks on surface", "rule", "surface", MARK],
];

describe("the palette the site and the page overlay share", () => {
  it("is the same in the stylesheet and in the module the overlay reads", () => {
    for (const [name, value] of Object.entries(PALETTE)) {
      expect(theme[name], name).toBe(value);
    }
  });

  it("keeps every colour the product draws with in the theme", () => {
    expect(Object.keys(theme).sort()).toEqual(Object.keys(PALETTE).sort());
  });
});

describe("the palette keeps WCAG contrast where the product uses it", () => {
  it.each(CHECKS)("%s", (_, fg, bg, need) => {
    expect(contrastRatio(rgb(color(fg)), rgb(color(bg)))).toBeGreaterThanOrEqual(need);
  });

  it("checks all forty-three uses", () => {
    expect(CHECKS).toHaveLength(43);
  });
});

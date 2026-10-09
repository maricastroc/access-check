import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ORDER, THEMES } from "./themes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const TEXT = 4.5;
const MARK = 3;
const WHITE = "#ffffff";

const CHECKS = [
  ["ink", "canvas", TEXT], ["ink", "surface", TEXT], ["ink", "booth", TEXT], ["ink", "band", TEXT],
  ["ink", "code", TEXT], ["ink-2", "canvas", TEXT], ["ink-2", "surface", TEXT], ["ink-2", "booth", TEXT],
  ["body", "surface", TEXT], ["muted", "canvas", TEXT], ["muted", "surface", TEXT], ["muted", "band", TEXT],
  ["muted", "booth", TEXT], ["steel", "surface", TEXT], ["surface", "ink", TEXT], [WHITE, "critical", TEXT],
  [WHITE, "serious", TEXT], [WHITE, "moderate", TEXT], [WHITE, "path", TEXT], [WHITE, "verified", TEXT],
  ["critical", "surface", TEXT], ["serious", "surface", TEXT], ["moderate-text", "surface", TEXT],
  ["moderate-text", "canvas", TEXT], ["critical-text", "canvas", TEXT], ["critical-text", "surface", TEXT],
  ["serious-text", "canvas", TEXT], ["serious-text", "surface", TEXT], ["review-text", "canvas", TEXT],
  ["review-text", "surface", TEXT], ["verified", "surface", TEXT], ["review", "surface", TEXT],
  ["path", "surface", TEXT], ["ink", "canvas", MARK], ["ink", "booth", MARK], ["critical", "canvas", MARK],
  ["serious", "canvas", MARK], ["moderate", "canvas", MARK], ["review", "canvas", MARK],
  ["verified", "canvas", MARK], ["path", "surface", MARK], ["rule", "surface", MARK],
];

const EXTRA = [
  ["body", "canvas", TEXT], ["body", "band", TEXT], ["ink-2", "band", TEXT], ["muted", "code", TEXT],
  ["steel", "canvas", TEXT], ["steel", "band", TEXT], ["serious-text", "band", TEXT],
  ["critical-text", "band", TEXT], ["moderate-text", "band", TEXT], ["verified", "canvas", TEXT],
  ["verified", "band", TEXT], ["review-text", "band", TEXT], ["serious", "ink", MARK],
  ["surface", "serious", TEXT], ["critical", "booth", MARK], ["serious", "booth", MARK],
];

const pick = (colors, name) => (name === WHITE ? WHITE : colors[name]);

export function audit(colors) {
  const run = (list) =>
    list.map(([fg, bg, need]) => {
      const ratio = contrast(pick(colors, fg), pick(colors, bg));
      return { fg, bg, need, ratio, ok: ratio >= need };
    });
  return { core: run(CHECKS), extra: run(EXTRA) };
}

const fontVars = (theme) => {
  const { sans, mono, display } = theme.stack;
  const w = theme.weights ?? {};
  return [
    `  --font-sans: ${sans};`,
    `  --font-cond: ${sans};`,
    `  --font-mono: ${mono};`,
    `  --default-font-family: ${sans};`,
    `  --default-mono-font-family: ${mono};`,
    display ? `  --font-display: ${display};` : null,
    w.medium ? `  --font-weight-medium: ${w.medium};` : null,
    w.semibold ? `  --font-weight-semibold: ${w.semibold};` : null,
    w.bold ? `  --font-weight-bold: ${w.bold};` : null,
  ].filter(Boolean);
};

export function cssOf(name) {
  const theme = THEMES[name];
  const lines = [];
  if (theme.google) lines.push(`/* fonts: ${theme.google} */`);
  lines.push(":root {");
  lines.push(...fontVars(theme));
  for (const [token, hex] of Object.entries(theme.colors)) lines.push(`  --color-${token}: ${hex};`);
  lines.push("  --color-halo: rgba(255, 255, 255, 0.94);");
  lines.push("}");
  lines.push("body { font-family: var(--font-sans); }");
  if (theme.css) lines.push(theme.css.trim());
  return `${lines.join("\n")}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(join(HERE, "themes"), { recursive: true });
  let failed = 0;
  for (const name of ORDER) {
    writeFileSync(join(HERE, "themes", `${name}.css`), cssOf(name));
    const { core, extra } = audit(THEMES[name].colors);
    const bad = [...core, ...extra].filter((c) => !c.ok);
    const low = [...core, ...extra].sort((a, b) => a.ratio / a.need - b.ratio / b.need).slice(0, 4);
    console.log(
      `${name.padEnd(9)} core ${core.filter((c) => c.ok).length}/${core.length} · extra ${extra.filter((c) => c.ok).length}/${extra.length}` +
        `  tightest: ${low.map((c) => `${c.fg}/${c.bg} ${c.ratio.toFixed(2)}`).join(", ")}`,
    );
    for (const c of bad) console.log(`   ✗ ${c.fg} on ${c.bg}: ${c.ratio.toFixed(2)} < ${c.need}`);
    if (name !== "original") failed += bad.length;
  }
  process.exitCode = failed ? 1 : 0;
}

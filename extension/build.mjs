import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { buildDomEngine, ENGINE_FILE } from "../scripts/build-dom-engine.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const repo = join(root, "..");

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "vendor"), { recursive: true });

const engine = await buildDomEngine();

await build({
  alias: { "@": join(repo, "src") },
  entryPoints: {
    audit: join(root, "src/audit.ts"),
    background: join(root, "src/background.ts"),
    panel: join(root, "src/panel.tsx"),
  },
  jsx: "automatic",
  outdir: dist,
  bundle: true,
  format: "iife",
  target: "chrome110",
  legalComments: "none",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
});

copyFileSync(join(repo, "node_modules/axe-core/axe.min.js"), join(dist, "vendor/axe.min.js"));
copyFileSync(ENGINE_FILE, join(dist, "dom-engine.js"));
copyFileSync(join(root, "manifest.json"), join(dist, "manifest.json"));

for (const locale of readdirSync(join(root, "_locales"))) {
  mkdirSync(join(dist, "_locales", locale), { recursive: true });
  copyFileSync(
    join(root, "_locales", locale, "messages.json"),
    join(dist, "_locales", locale, "messages.json"),
  );
}

mkdirSync(join(dist, "icons"), { recursive: true });
for (const size of [16, 32, 48, 128]) {
  copyFileSync(join(root, `icons/icon-${size}.png`), join(dist, `icons/icon-${size}.png`));
}
copyFileSync(join(root, "src/panel.html"), join(dist, "panel.html"));

const cssEntry = join(root, "src/panel.css");
const css = await postcss([tailwind]).process(readFileSync(cssEntry, "utf8"), {
  from: cssEntry,
  to: join(dist, "panel.css"),
});
writeFileSync(join(dist, "panel.css"), css.css);

console.log(`extension built at extension/dist (dom engine sha256 ${engine.hash})`);

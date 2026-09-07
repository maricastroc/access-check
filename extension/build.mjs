import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const repo = join(root, "..");

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "vendor"), { recursive: true });

await build({
  alias: { "@": join(repo, "src") },
  entryPoints: {
    audit: join(root, "src/audit.ts"),
    background: join(root, "src/background.ts"),
    report: join(root, "src/report.ts"),
  },
  outdir: dist,
  bundle: true,
  format: "iife",
  target: "chrome110",
  legalComments: "none",
});

copyFileSync(join(repo, "node_modules/axe-core/axe.min.js"), join(dist, "vendor/axe.min.js"));
copyFileSync(join(root, "manifest.json"), join(dist, "manifest.json"));
copyFileSync(join(root, "src/report.html"), join(dist, "report.html"));
copyFileSync(join(root, "src/report.css"), join(dist, "report.css"));

console.log("extension built at extension/dist");

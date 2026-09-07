import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

export const ENGINE_DIR = join(repo, "dom-engine");
export const ENGINE_FILE = join(ENGINE_DIR, "dom-engine.js");

export async function buildDomEngine() {
  mkdirSync(ENGINE_DIR, { recursive: true });

  await build({
    entryPoints: [join(repo, "src/lib/scan/dom/engine.ts")],
    outfile: ENGINE_FILE,
    bundle: true,
    format: "iife",
    target: "chrome110",
    platform: "browser",
    legalComments: "none",
  });

  const source = readFileSync(ENGINE_FILE, "utf8");
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 16);
  writeFileSync(join(ENGINE_DIR, "dom-engine.sha256"), `${hash}\n`);

  return { file: ENGINE_FILE, bytes: source.length, hash };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bytes, hash } = await buildDomEngine();
  console.log(`dom engine built at dom-engine/dom-engine.js (${bytes} bytes, sha256 ${hash})`);
}

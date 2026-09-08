import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const repo = process.cwd();
const DIST = join(repo, "extension/dist");
const RELEASES = join(repo, "release");

const EXPECTED = new Set([
  "manifest.json",
  "panel.html",
  "panel.css",
  "panel.js",
  "background.js",
  "audit.js",
  "dom-engine.js",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
  "vendor/axe.min.js",
]);

const ICON_SIZES = {
  "icons/icon-16.png": 16,
  "icons/icon-32.png": 32,
  "icons/icon-48.png": 48,
  "icons/icon-128.png": 128,
};

const REMOTE_CODE = [
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /sendBeacon/,
  /new\s+WebSocket/,
  /importScripts\s*\(/,
];

const problems = [];
const fail = (why) => problems.push(why);

function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full, base) : [relative(base, full)];
  });
}

function pngSize(file) {
  const head = readFileSync(file).subarray(0, 24);
  if (head.subarray(1, 4).toString() !== "PNG") return null;
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

console.log("building…");
execFileSync("node", ["extension/build.mjs"], { stdio: "pipe" });

const files = walk(DIST).sort();
for (const file of files) if (!EXPECTED.has(file)) fail(`unexpected file in the build: ${file}`);
for (const file of EXPECTED) if (!files.includes(file)) fail(`missing from the build: ${file}`);
for (const file of files) if (file.endsWith(".map")) fail(`a source map would ship: ${file}`);

const manifest = JSON.parse(readFileSync(join(DIST, "manifest.json"), "utf8"));
if (/prototype/i.test(JSON.stringify(manifest))) fail('the manifest still says "prototype"');
if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? ""))
  fail(`version is not x.y.z: ${manifest.version}`);
if (manifest.host_permissions) fail("the manifest asks for host permissions");
if (manifest.optional_permissions) fail("the manifest declares optional permissions");
if ((manifest.description ?? "").length > 132)
  fail("the description is over the store's 132-character limit");
if (!manifest.icons || !manifest.action?.default_icon) fail("the manifest declares no icons");

const EXPECTED_PERMISSIONS = ["activeTab", "debugger", "scripting", "sidePanel", "storage"];
const declared = [...(manifest.permissions ?? [])].sort();
if (JSON.stringify(declared) !== JSON.stringify(EXPECTED_PERMISSIONS)) {
  fail(`permissions changed: ${JSON.stringify(declared)}`);
}

for (const [file, size] of Object.entries(ICON_SIZES)) {
  const found = pngSize(join(DIST, file));
  if (!found) fail(`${file} is not a PNG`);
  else if (found.width !== size || found.height !== size) {
    fail(`${file} is ${found.width}×${found.height}, expected ${size}×${size}`);
  }
}

for (const file of files.filter((f) => f.endsWith(".js") && !f.startsWith("vendor/"))) {
  const source = readFileSync(join(DIST, file), "utf8");
  for (const pattern of REMOTE_CODE) {
    if (pattern.test(source)) fail(`${file} contains ${pattern} — the store forbids remote code`);
  }
}

const vendored = readFileSync(join(DIST, "vendor/axe.min.js"));
const published = join(repo, "node_modules/axe-core/axe.min.js");
if (!existsSync(published))
  fail("axe-core is not installed, so the vendored copy cannot be verified");
else if (!vendored.equals(readFileSync(published))) {
  fail("vendor/axe.min.js does not match the installed axe-core package");
}
const axeVersion = JSON.parse(
  readFileSync(join(repo, "node_modules/axe-core/package.json"), "utf8"),
).version;

if (!existsSync(join(repo, "extension/PRIVACY.md"))) fail("no privacy policy in the repository");

if (problems.length > 0) {
  console.error("\nrefusing to package:\n- " + problems.join("\n- "));
  process.exit(1);
}

mkdirSync(RELEASES, { recursive: true });
const zip = join(RELEASES, `accesscheck-${manifest.version}.zip`);
if (existsSync(zip)) {
  console.error(
    `\n${relative(repo, zip)} already exists. Bump the version or remove it on purpose.`,
  );
  process.exit(1);
}

const stage = mkdtempSync(join(tmpdir(), "accesscheck-pack-"));
cpSync(DIST, stage, { recursive: true });
execFileSync("find", [stage, "-exec", "touch", "-t", "198001010000", "{}", ";"]);
execFileSync("zip", ["-X", "-q", zip, ...files], { cwd: stage });
rmSync(stage, { recursive: true, force: true });

const bytes = statSync(zip).size;
const sum = createHash("sha256").update(readFileSync(zip)).digest("hex");

console.log(`\n${relative(repo, zip)}`);
console.log(`${files.length} files, ${(bytes / 1024).toFixed(1)} KB`);
console.log(`sha256 ${sum}`);
console.log(`bundled axe-core ${axeVersion}, byte-identical to the installed package`);
console.log("\ncontents:\n  " + files.join("\n  "));

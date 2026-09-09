import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { chromium } from "playwright";

const repo = process.cwd();
const RELEASES = join(repo, "release");

const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
};

const version = JSON.parse(readFileSync(join(repo, "extension/manifest.json"), "utf8")).version;
const zip = join(RELEASES, `accesscheck-${version}.zip`);

if (!existsSync(zip)) {
  console.error(`No archive for version ${version}. Run \`npm run pack\` first.`);
  process.exit(1);
}

const unpacked = mkdtempSync(join(tmpdir(), "ac-release-"));
execFileSync("unzip", ["-q", zip, "-d", unpacked]);

const walk = (dir, base = dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full, base) : [relative(base, full)];
  });

const files = walk(unpacked).sort();
const manifest = JSON.parse(readFileSync(join(unpacked, "manifest.json"), "utf8"));
const bytes = statSync(zip).size;
const sum = createHash("sha256").update(readFileSync(zip)).digest("hex");

console.log(
  "archive:",
  JSON.stringify({
    file: relative(repo, zip),
    files: files.length,
    kb: +(bytes / 1024).toFixed(1),
    sum,
  }),
);

for (const file of files) {
  const source = readFileSync(join(unpacked, file));
  check(!file.endsWith(".map"), `a source map shipped: ${file}`);
  check(
    !/prototype/i.test(source.toString("utf8", 0, Math.min(source.length, 200_000))) ||
      file.startsWith("vendor/") ||
      file.endsWith(".js"),
    `"prototype" appears in ${file}`,
  );
}
check(!/prototype/i.test(JSON.stringify(manifest)), 'the shipped manifest says "prototype"');
if (manifest.name === "__MSG_extName__") {
  const fallback = `_locales/${manifest.default_locale}/messages.json`;
  check(Boolean(manifest.default_locale), "the archive localizes its name with no default_locale");
  check(files.includes(fallback), `${fallback} is missing from the archive`);
  const named = files.includes(fallback)
    ? JSON.parse(readFileSync(join(unpacked, fallback), "utf8")).extName?.message
    : null;
  check(named === "AccessCheck", `${fallback} names the extension "${named}"`);
} else {
  check(manifest.name === "AccessCheck", `the shipped name is "${manifest.name}"`);
}
check(/^\d+\.\d+\.\d+$/.test(manifest.version), `version is not x.y.z: ${manifest.version}`);
check((manifest.description ?? "").length <= 132, "the description is over 132 characters");
check(manifest.host_permissions === undefined, "the archive asks for host permissions");
check(manifest.optional_permissions === undefined, "the archive declares optional permissions");

const pngSize = (file) => {
  const head = readFileSync(join(unpacked, file)).subarray(0, 24);
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
};
for (const size of [16, 32, 48, 128]) {
  const path = `icons/icon-${size}.png`;
  check(files.includes(path), `${path} is missing from the archive`);
  if (files.includes(path)) {
    const found = pngSize(path);
    check(
      found.width === size && found.height === size,
      `${path} is ${found.width}×${found.height}`,
    );
  }
  check(
    manifest.icons?.[String(size)] === `icons/icon-${size}.png`,
    `the manifest omits the ${size}px icon`,
  );
  check(
    manifest.action?.default_icon?.[String(size)] === `icons/icon-${size}.png`,
    `the toolbar icon omits ${size}px`,
  );
}

const storeAssets = [
  { file: "store/store-icon-128.png", width: 128, height: 128, what: "the store icon" },
  { file: "store/promo-tile-440x280.png", width: 440, height: 280, what: "the small promo tile" },
];
for (let i = 1; i <= 5; i++) {
  const [name] = readdirSync(join(repo, "store/screenshots")).filter((f) => f.startsWith(`${i}-`));
  if (!name) {
    failures.push(`screenshot ${i} has not been produced`);
    continue;
  }
  storeAssets.push({
    file: `store/screenshots/${name}`,
    width: 1280,
    height: 800,
    what: `screenshot ${i}`,
  });
}

for (const asset of storeAssets) {
  const path = join(repo, asset.file);
  if (!existsSync(path)) {
    failures.push(`${asset.what} is missing (${asset.file})`);
    continue;
  }
  const head = readFileSync(path).subarray(0, 24);
  const isPng = head.subarray(1, 4).toString() === "PNG";
  check(isPng, `${asset.file} is not a PNG`);
  if (!isPng) continue;
  const width = head.readUInt32BE(16);
  const height = head.readUInt32BE(20);
  check(
    width === asset.width && height === asset.height,
    `${asset.file} is ${width}×${height}, the store wants ${asset.width}×${asset.height}`,
  );
}

const policy = join(repo, "extension/PRIVACY.md");
check(existsSync(policy), "no privacy policy in the repository");
if (existsSync(policy)) {
  const text = readFileSync(policy, "utf8");
  check(/Effective \d/.test(text), "the privacy policy has no effective date");
  check(/debugger/i.test(text), "the privacy policy does not mention the debugger permission");
  check(text.length > 1500, "the privacy policy is too thin to answer the store's questions");
}
check(existsSync(join(repo, "src/app/privacy/page.tsx")), "the policy is not published anywhere");
check(
  existsSync(join(repo, "extension/STORE-LISTING.md")),
  "the listing copy has not been written",
);

execFileSync("node", ["extension/build.mjs"], { stdio: "pipe" });
const rebuilt = walk(join(repo, "extension/dist")).sort();
check(
  JSON.stringify(rebuilt) === JSON.stringify(files),
  "the archive does not hold the same files a fresh build produces",
);
for (const file of files) {
  const a = readFileSync(join(unpacked, file));
  const b = readFileSync(join(repo, "extension/dist", file));
  check(a.equals(b), `${file} differs from a fresh build`);
}

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "ac-release-p-")), {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${unpacked}`, `--load-extension=${unpacked}`],
});

try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });

  const loaded = await sw.evaluate(async () => ({
    manifest: chrome.runtime.getManifest(),
    granted: (await chrome.permissions.getAll()).permissions.sort(),
    apis: {
      debugger: typeof chrome.debugger,
      scripting: typeof chrome.scripting,
      sidePanel: typeof chrome.sidePanel,
      storage: typeof chrome.storage?.session,
    },
  }));
  console.log(
    "chrome loaded:",
    JSON.stringify({
      name: loaded.manifest.name,
      version: loaded.manifest.version,
      granted: loaded.granted,
      apis: loaded.apis,
    }),
  );

  check(loaded.manifest.name === "AccessCheck", "Chrome loaded a different name");
  check(loaded.manifest.version === manifest.version, "Chrome loaded a different version");
  check(
    JSON.stringify(loaded.granted) ===
      JSON.stringify(["activeTab", "debugger", "scripting", "sidePanel", "storage"]),
    `Chrome granted ${JSON.stringify(loaded.granted)}`,
  );
  for (const [api, kind] of Object.entries(loaded.apis)) {
    check(kind !== "undefined", `chrome.${api} is not available to the packed extension`);
  }
  check(loaded.manifest.host_permissions === undefined, "Chrome loaded host permissions");
  check(!!loaded.manifest.icons, "Chrome loaded no icons");
} finally {
  await ctx.close();
}

if (failures.length > 0) {
  console.error("\nFAILED:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.log("\nthe release archive is ready to upload");
}

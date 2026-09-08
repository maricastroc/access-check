import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const DIST = join(process.cwd(), "extension/dist");
const EXT = mkdtempSync(join(tmpdir(), "ac-manifest-"));
cpSync(DIST, EXT, { recursive: true });

const declared = JSON.parse(readFileSync(join(DIST, "manifest.json"), "utf8"));

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "ac-manifest-p-")), {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});

const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
};

try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });

  const seen = await sw.evaluate(async () => ({
    granted: (await chrome.permissions.getAll()).permissions.sort(),
    hasDebugger: await chrome.permissions.contains({ permissions: ["debugger"] }),
    apis: {
      debugger: typeof chrome.debugger,
      scripting: typeof chrome.scripting,
      sidePanel: typeof chrome.sidePanel,
      storage: typeof chrome.storage?.session,
    },
    hostPermissions: chrome.runtime.getManifest().host_permissions,
    optional: chrome.runtime.getManifest().optional_permissions,
    loaded: chrome.runtime.getManifest(),
  }));
  const loaded = seen.loaded;
  console.log("chrome loaded:", JSON.stringify({ ...seen, loaded: undefined }, null, 1));

  for (const permission of declared.permissions) {
    check(seen.granted.includes(permission), `Chrome did not grant "${permission}"`);
  }
  check(seen.hasDebugger, "the debugger permission is not held, so the deep audit cannot attach");

  for (const [api, kind] of Object.entries(seen.apis)) {
    check(kind !== "undefined", `chrome.${api} is not available to the extension`);
  }

  check(
    seen.optional === undefined,
    "optional_permissions is set: Chrome refuses some of them, debugger among them",
  );
  check(seen.hostPermissions === undefined, "the shipped manifest asks for host permissions");
  const stable = (value) =>
    JSON.stringify(value, (_key, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
        : v,
    );
  for (const [name, value] of Object.entries(declared)) {
    if (name === "optional_permissions") continue;
    check(
      stable(loaded[name]) === stable(value),
      `Chrome loaded "${name}" differently from the packed manifest`,
    );
  }

  if (failures.length > 0) {
    console.error("\nFAILED:\n- " + failures.join("\n- "));
    process.exitCode = 1;
  } else {
    console.log("\nthe shipped manifest loads clean");
  }
} finally {
  await ctx.close();
}

import { execFile } from "child_process";
import { mkdtemp, readdir, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { removeCoreDumps, withoutCoreDumps } from "./core-dumps";

const run = promisify(execFile);

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "core-dumps-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("withoutCoreDumps", () => {
  it("runs the executable with its arguments and core dumps turned off", async () => {
    const executable = path.join(dir, "it's chromium");
    await writeFile(executable, `#!/bin/sh\necho "core=$(ulimit -c) args=$*"\n`, { mode: 0o755 });

    const launcher = await withoutCoreDumps(executable, dir);
    const { stdout } = await run(launcher, ["--headless", "--no-sandbox"]);

    expect(launcher).not.toBe(executable);
    expect(stdout.trim()).toBe("core=0 args=--headless --no-sandbox");
  });

  it("launches the executable directly when there is no shell", async () => {
    const executable = path.join(dir, "chromium");

    expect(await withoutCoreDumps(executable, dir, path.join(dir, "no-shell"))).toBe(executable);
  });
});

describe("removeCoreDumps", () => {
  it("deletes core dumps and leaves the browser files alone", async () => {
    for (const name of ["core.chromium.39", "core.chromium.81", "core", "chromium", "al2023"]) {
      await writeFile(path.join(dir, name), "x");
    }

    expect(await removeCoreDumps(dir)).toBe(3);
    expect((await readdir(dir)).sort()).toEqual(["al2023", "chromium"]);
  });
});

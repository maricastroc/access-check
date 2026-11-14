import { mkdir, mkdtemp, rm, symlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deletedOpenMb, largestEntries } from "./tmp-usage";

const MB = 1024 * 1024;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "tmp-usage-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("largestEntries", () => {
  it("lists the biggest entries first, sizing folders by everything inside", async () => {
    await mkdir(path.join(root, "profile/cache"), { recursive: true });
    await writeFile(path.join(root, "profile/cache/a"), Buffer.alloc(3 * MB, 1));
    await writeFile(path.join(root, "profile/b"), Buffer.alloc(2 * MB, 1));
    await writeFile(path.join(root, "core.123"), Buffer.alloc(4 * MB, 1));
    await writeFile(path.join(root, "tiny"), "x");

    const entries = await largestEntries(root, 5, 1);

    expect(Object.keys(entries)).toEqual(["tmp:profile", "tmp:core.123"]);
    expect(entries["tmp:profile"]).toBe(5);
    expect(entries["tmp:core.123"]).toBe(4);
  });

  it("keeps only the requested number of entries", async () => {
    for (const name of ["a", "b", "c"]) {
      await writeFile(path.join(root, name), Buffer.alloc(2 * MB, 1));
    }

    expect(Object.keys(await largestEntries(root, 2, 1))).toHaveLength(2);
  });
});

describe("deletedOpenMb", () => {
  it("adds up deleted files under the folder that a process still holds open", async () => {
    const tmp = path.join(root, "tmp");
    await mkdir(tmp);
    const held = path.join(tmp, "shm (deleted)");
    await writeFile(held, Buffer.alloc(3 * MB, 1));
    await writeFile(path.join(tmp, "live"), Buffer.alloc(2 * MB, 1));

    const proc = path.join(root, "proc");
    await mkdir(path.join(proc, "41/fd"), { recursive: true });
    await mkdir(path.join(proc, "42/fd"), { recursive: true });
    await mkdir(path.join(proc, "self"), { recursive: true });
    await symlink(held, path.join(proc, "41/fd/7"));
    await symlink(held, path.join(proc, "42/fd/9"));
    await symlink(path.join(tmp, "live"), path.join(proc, "42/fd/10"));

    expect(await deletedOpenMb(tmp, proc)).toBe(3);
  });

  it("reports nothing where there is no process table", async () => {
    expect(await deletedOpenMb(root, path.join(root, "missing"))).toBeUndefined();
  });
});

import { existsSync } from "fs";
import { readdir, rm, writeFile } from "fs/promises";
import path from "path";

const SHELL = "/bin/sh";
const CORE_DUMP = /^core(\.chromium)?(\.\d+)?$/;

function quoted(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export async function withoutCoreDumps(
  executable: string,
  dir: string,
  shell = SHELL,
): Promise<string> {
  if (!existsSync(shell)) return executable;
  const launcher = path.join(dir, "chromium-no-core");
  const script = `#!${shell}\nulimit -c 0\nexec ${quoted(executable)} "$@"\n`;
  await writeFile(launcher, script, { mode: 0o755 });
  return launcher;
}

export async function removeCoreDumps(dir: string): Promise<number> {
  const names = await readdir(dir).catch(() => [] as string[]);
  const dumps = names.filter((name) => CORE_DUMP.test(name));
  await Promise.all(dumps.map((name) => rm(path.join(dir, name), { force: true })));
  return dumps.length;
}

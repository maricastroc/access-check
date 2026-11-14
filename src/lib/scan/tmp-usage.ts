import { lstat, readdir, readlink, stat } from "fs/promises";
import path from "path";

const MB = 1024 * 1024;
const MAX_VISITS = 20_000;

async function diskBytes(target: string, budget: { visits: number }): Promise<number> {
  if (budget.visits-- <= 0) return 0;
  const info = await lstat(target).catch(() => null);
  if (!info) return 0;
  let total = info.blocks * 512;
  if (!info.isDirectory()) return total;
  const names = await readdir(target).catch(() => [] as string[]);
  for (const name of names) total += await diskBytes(path.join(target, name), budget);
  return total;
}

export async function largestEntries(
  dir: string,
  limit = 5,
  minMb = 1,
): Promise<Record<string, number>> {
  const names = await readdir(dir).catch(() => [] as string[]);
  const budget = { visits: MAX_VISITS };
  const sized: [string, number][] = [];
  for (const name of names) {
    sized.push([name, Math.round((await diskBytes(path.join(dir, name), budget)) / MB)]);
  }
  return Object.fromEntries(
    sized
      .filter(([, mb]) => mb >= minMb)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, mb]) => [`tmp:${name}`, mb]),
  );
}

export async function deletedOpenMb(dir: string, procRoot = "/proc"): Promise<number | undefined> {
  const pids = await readdir(procRoot).catch(() => null);
  if (!pids) return undefined;
  const prefix = dir.endsWith(path.sep) ? dir : dir + path.sep;
  const seen = new Set<string>();
  let total = 0;
  for (const pid of pids.filter((name) => /^\d+$/.test(name))) {
    const fdDir = path.join(procRoot, pid, "fd");
    const fds = await readdir(fdDir).catch(() => [] as string[]);
    for (const fd of fds) {
      const fdPath = path.join(fdDir, fd);
      const target = await readlink(fdPath).catch(() => "");
      if (!target.startsWith(prefix) || !target.endsWith(" (deleted)")) continue;
      const info = await stat(fdPath).catch(() => null);
      if (!info) continue;
      const key = `${info.dev}:${info.ino}`;
      if (seen.has(key)) continue;
      seen.add(key);
      total += info.blocks * 512;
    }
  }
  return Math.round(total / MB);
}

import { readdir, readFile } from "fs/promises";
import path from "path";

export type ProcessFilter = {
  parentPid: number;
  executable: string;
  procRoot?: string;
};

function parentOf(stat: string): { state: string; ppid: number } | null {
  const end = stat.lastIndexOf(")");
  if (end < 0) return null;
  const [state, ppid] = stat
    .slice(end + 2)
    .split(" ")
    .slice(0, 2);
  const parsed = Number(ppid);
  return state && Number.isInteger(parsed) ? { state, ppid: parsed } : null;
}

export async function childProcesses({
  parentPid,
  executable,
  procRoot = "/proc",
}: ProcessFilter): Promise<number[]> {
  const entries = await readdir(procRoot).catch(() => [] as string[]);
  const found: number[] = [];

  await Promise.all(
    entries
      .filter((entry) => /^\d+$/.test(entry))
      .map(async (entry) => {
        const dir = path.join(procRoot, entry);
        const stat = await readFile(path.join(dir, "stat"), "utf8").catch(() => null);
        const parent = stat ? parentOf(stat) : null;
        if (!parent || parent.ppid !== parentPid || parent.state === "Z") return;

        const cmdline = await readFile(path.join(dir, "cmdline"), "utf8").catch(() => "");
        if (cmdline.split("\0")[0] !== executable) return;
        found.push(Number(entry));
      }),
  );

  return found.sort((a, b) => a - b);
}

export function killProcessGroups(pids: number[]): number {
  let killed = 0;
  for (const pid of pids) {
    for (const target of [-pid, pid]) {
      try {
        process.kill(target, "SIGKILL");
        killed += 1;
        break;
      } catch {
        continue;
      }
    }
  }
  return killed;
}

import { spawn } from "child_process";
import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { childProcesses, killProcessGroups } from "./processes";

const CHROMIUM = "/tmp/chromium";

let root: string | null = null;

async function fakeProc(
  entries: Record<string, { comm: string; state?: string; ppid: number; cmd: string[] }>,
) {
  root = await mkdtemp(path.join(os.tmpdir(), "proc-"));
  for (const [pid, entry] of Object.entries(entries)) {
    const dir = path.join(root, pid);
    await mkdir(dir);
    await writeFile(
      path.join(dir, "stat"),
      `${pid} (${entry.comm}) ${entry.state ?? "S"} ${entry.ppid} ${pid} ${pid} 0 -1`,
    );
    await writeFile(path.join(dir, "cmdline"), entry.cmd.join("\0") + "\0");
  }
  return root;
}

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = null;
});

describe("childProcesses", () => {
  it("lists only the browsers this process started", async () => {
    const procRoot = await fakeProc({
      "200": { comm: "chromium", ppid: 100, cmd: [CHROMIUM, "--single-process"] },
      "201": { comm: "chromium", ppid: 100, cmd: [CHROMIUM, "--single-process"] },
      "300": { comm: "chromium", ppid: 999, cmd: [CHROMIUM] },
      "400": { comm: "node", ppid: 100, cmd: ["/usr/bin/node", "worker.js"] },
      "500": { comm: "crashpad_handler", ppid: 200, cmd: ["/tmp/chrome_crashpad_handler"] },
    });

    expect(await childProcesses({ parentPid: 100, executable: CHROMIUM, procRoot })).toEqual([
      200, 201,
    ]);
  });

  it("reads the parent past a process name with spaces and parentheses", async () => {
    const procRoot = await fakeProc({
      "210": { comm: "Chrome (renderer) 1", ppid: 100, cmd: [CHROMIUM, "--type=renderer"] },
    });

    expect(await childProcesses({ parentPid: 100, executable: CHROMIUM, procRoot })).toEqual([210]);
  });

  it("skips processes that already exited", async () => {
    const procRoot = await fakeProc({
      "220": { comm: "chromium", state: "Z", ppid: 100, cmd: [CHROMIUM] },
    });

    expect(await childProcesses({ parentPid: 100, executable: CHROMIUM, procRoot })).toEqual([]);
  });

  it("finds nothing where there is no process table", async () => {
    const procRoot = path.join(os.tmpdir(), "no-such-proc-root");
    expect(await childProcesses({ parentPid: 100, executable: CHROMIUM, procRoot })).toEqual([]);
  });
});

describe("killProcessGroups", () => {
  it("kills a detached process together with its group", async () => {
    const child = spawn("sleep", ["30"], { detached: true, stdio: "ignore" });
    const exited = new Promise<NodeJS.Signals | null>((resolve) =>
      child.once("exit", (_code, signal) => resolve(signal)),
    );

    expect(killProcessGroups([child.pid!])).toBe(1);
    expect(await exited).toBe("SIGKILL");
  });

  it("ignores processes that are already gone", () => {
    expect(killProcessGroups([2 ** 22 + 12345])).toBe(0);
  });
});

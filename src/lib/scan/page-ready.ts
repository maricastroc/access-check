export type ContentReadiness = { ms: number; settled: boolean; samples: number };

export type ReadyOptions = {
  maxMs: number;
  sampleMs?: number;
  stableSamples?: number;
  now?: () => number;
};

export const CONTENT_SIGNATURE = () => {
  const d = document;
  const text = d.body ? d.body.innerText.length : 0;
  return `${d.querySelectorAll("*").length}|${d.styleSheets.length}|${text}`;
};

export async function waitForContentReady(
  probe: () => Promise<string | null>,
  sleep: (ms: number) => Promise<void>,
  opts: ReadyOptions,
): Promise<ContentReadiness> {
  const sampleMs = opts.sampleMs ?? 200;
  const stableSamples = opts.stableSamples ?? 2;
  const now = opts.now ?? Date.now;
  const startedAt = now();
  const elapsed = () => now() - startedAt;

  if (opts.maxMs <= 0) return { ms: 0, settled: false, samples: 0 };

  let previous: string | null = null;
  let stable = 0;
  let samples = 0;

  while (elapsed() < opts.maxMs) {
    const signature = await probe();
    samples += 1;

    if (signature !== null && signature === previous) {
      stable += 1;
      if (stable >= stableSamples) {
        return { ms: elapsed(), settled: true, samples };
      }
    } else {
      stable = 0;
      previous = signature;
    }

    const left = opts.maxMs - elapsed();
    if (left <= 0) break;
    await sleep(Math.min(sampleMs, left));
  }

  return { ms: elapsed(), settled: false, samples };
}

export type PrimeReport = {
  steps: number;
  ms: number;
  from: { x: number; y: number };
  reachedEnd: boolean;
  grew: number;
  restored: boolean;
  animatingBefore: number;
};

export type PaintCalm = { ms: number; calm: boolean; animating: number };

const STEP_MS = 120;
const MAX_STEPS = 12;

const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

const running = () =>
  document.getAnimations
    ? document.getAnimations().filter((a) => a.playState === "running").length
    : 0;

export async function waitForPaintCalm(baseline: number, maxMs: number): Promise<PaintCalm> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxMs) {
    if (running() <= baseline) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const animating = running();
  return { ms: Date.now() - startedAt, calm: animating <= baseline, animating };
}

export async function primeLazyContent(): Promise<PrimeReport> {
  const startedAt = Date.now();
  const from = { x: window.scrollX, y: window.scrollY };
  const before = document.querySelectorAll("*").length;
  const animatingBefore = running();

  const step = Math.max(window.innerHeight * 0.9, 400);
  let steps = 0;
  let reachedEnd = maxScroll() <= 0;

  while (!reachedEnd && steps < MAX_STEPS) {
    const target = (steps + 1) * step;
    window.scrollTo({ left: from.x, top: target, behavior: "instant" });
    steps += 1;
    await new Promise((resolve) => setTimeout(resolve, STEP_MS));
    if (target >= maxScroll()) reachedEnd = true;
  }

  if (steps > 0) window.scrollTo({ left: from.x, top: from.y, behavior: "instant" });

  return {
    steps,
    ms: Date.now() - startedAt,
    from,
    reachedEnd,
    grew: document.querySelectorAll("*").length - before,
    restored: window.scrollX === from.x && window.scrollY === from.y,
    animatingBefore,
  };
}

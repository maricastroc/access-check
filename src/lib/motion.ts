function query(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia("(prefers-reduced-motion: reduce)");
}

export function prefersReducedMotion(): boolean {
  return query()?.matches ?? false;
}

export function scrollBehavior(): ScrollBehavior {
  const mq = query();
  if (!mq) return "auto";
  return mq.matches ? "auto" : "smooth";
}

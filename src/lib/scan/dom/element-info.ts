import type { ElementInfo } from "../remediate";

export function collectElementInfo(selectors: string[]): Record<string, ElementInfo> {
  const out: Record<string, ElementInfo> = {};
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (!el) continue;
      out[sel] = {
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") ?? undefined,
        id: el.id || undefined,
        name: el.getAttribute("name") ?? undefined,
        placeholder: el.getAttribute("placeholder") ?? undefined,
        ariaLabel: el.getAttribute("aria-label") ?? undefined,
        src: el.getAttribute("src") ?? undefined,
        role: el.getAttribute("role") ?? undefined,
        text: (el.textContent ?? "").replace(/\s+/g, " ").trim() || undefined,
        title: el.getAttribute("title") ?? undefined,
        nearbyText:
          (() => {
            const fig = el.closest("figure");
            const cap = fig?.querySelector("figcaption")?.textContent;
            if (cap && cap.trim()) return cap.replace(/\s+/g, " ").trim();
            const link = el.closest("a");
            const lt = link?.textContent;
            if (lt && lt.trim()) return lt.replace(/\s+/g, " ").trim();
            return undefined;
          })() ?? undefined,
      };
    } catch {
      continue;
    }
  }
  return out;
}

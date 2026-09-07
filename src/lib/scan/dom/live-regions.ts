import type { RawLiveRegions } from "../live-regions";

export function collectLiveRegionsRaw(): RawLiveRegions {
  const cssPath = (el: Element | null): string => {
    if (!el || el.nodeType !== 1) return "";
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node.nodeType === 1 && parts.length < 5) {
      if (node.id) {
        parts.unshift(`#${CSS.escape(node.id)}`);
        break;
      }
      let sel = node.tagName.toLowerCase();
      const parent: Element | null = node.parentElement;
      if (parent) {
        const sameTag = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
        if (sameTag.length > 1) sel += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
      parts.unshift(sel);
      node = parent;
    }
    return parts.join(" > ");
  };

  const nodes = Array.from(
    document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"]'),
  );

  const regions = nodes.map((el) => {
    const cs = getComputedStyle(el);
    const role = el.getAttribute("role");
    const ariaLive = el.getAttribute("aria-live");
    return {
      selector: cssPath(el),
      role: role ? role.trim().toLowerCase() : null,
      ariaLive: ariaLive !== null ? ariaLive.trim().toLowerCase() : null,
      hidden: cs.display === "none" || cs.visibility === "hidden",
      ariaHidden: el.getAttribute("aria-hidden") === "true",
    };
  });

  return { regions };
}

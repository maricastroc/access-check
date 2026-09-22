import { cssPath } from "./selector";
import { inLayout } from "./visibility";
import type { RawLiveRegions } from "../live-regions";

export function collectLiveRegionsRaw(): RawLiveRegions {
  const nodes = Array.from(
    document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"]'),
  );

  const regions = nodes.map((el) => {
    const role = el.getAttribute("role");
    const ariaLive = el.getAttribute("aria-live");
    return {
      selector: cssPath(el),
      role: role ? role.trim().toLowerCase() : null,
      ariaLive: ariaLive !== null ? ariaLive.trim().toLowerCase() : null,
      hidden: !inLayout(el),
      ariaHidden: el.getAttribute("aria-hidden") === "true",
      hasText: (el.textContent ?? "").trim().length > 0,
    };
  });

  return { regions };
}

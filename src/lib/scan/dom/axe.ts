import type { AxeResults, ElementContext, Locale, RunOptions } from "axe-core";

declare global {
  interface Window {
    axe: {
      run(context: ElementContext, options: RunOptions): Promise<AxeResults>;
      configure(spec: { locale?: Locale }): void;
    };
  }
}

export const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
  "best-practice",
];

export async function runAxeInPage(
  tags: string[],
  options: { preload?: boolean; locale?: Locale | null } = {},
): Promise<AxeResults> {
  if (options.locale) {
    try {
      window.axe.configure({ locale: options.locale });
    } catch {
      void 0;
    }
  }

  return await window.axe.run(document, {
    runOnly: { type: "tag", values: tags },
    ...(options.preload === undefined ? {} : { preload: options.preload }),
  });
}

export function crossOriginAssets(): { styleSheets: number; media: number } {
  let styleSheets = 0;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      void sheet.cssRules;
    } catch {
      styleSheets += 1;
    }
  }

  const media = Array.from(document.querySelectorAll("audio, video, source")).filter((el) => {
    const src = el.getAttribute("src");
    if (!src) return false;
    try {
      return new URL(src, document.baseURI).origin !== location.origin;
    } catch {
      return false;
    }
  }).length;

  return { styleSheets, media };
}

import type { AxeResults, ElementContext, RunOptions } from "axe-core";

declare global {
  interface Window {
    axe: { run(context: ElementContext, options: RunOptions): Promise<AxeResults> };
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

export async function runAxeInPage(tags: string[]): Promise<AxeResults> {
  return await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
}

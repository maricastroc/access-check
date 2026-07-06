export type SortKey = "recent" | "score-desc" | "score-asc";
export type BandKey = "all" | "pass" | "warn" | "fail";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "score-desc", label: "Highest score" },
  { key: "score-asc", label: "Lowest score" },
];

export const BANDS: { key: BandKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pass", label: "Pass" },
  { key: "warn", label: "Warn" },
  { key: "fail", label: "Fail" },
];

export function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function scoreColor(score: number): string {
  if (score >= 90) return "#16764f";
  if (score >= 70) return "#8a6a00";
  return "#c62a2f";
}

export function band(score: number): BandKey {
  if (score >= 90) return "pass";
  if (score >= 70) return "warn";
  return "fail";
}

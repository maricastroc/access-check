export type PageStatus = "pending" | "running" | "done" | "failed";
export type SiteStatus = "running" | "completed" | "failed";

export type PageScore = { status: PageStatus; score: number | null };

export function aggregateScore(pages: PageScore[]): number | null {
  const scores = pages
    .filter((p) => p.status === "done" && p.score !== null)
    .map((p) => p.score as number);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

import { withBudget } from "./budget";

export const SCREENSHOT_MIME = "image/jpeg";
export const SCREENSHOT_QUALITY = 72;

const GRACE_MS = 750;

export async function captureScreenshot(
  take: (timeoutMs: number) => Promise<Buffer>,
  timeoutMs: number,
): Promise<string | null> {
  if (timeoutMs <= 0) return null;

  const { value } = await withBudget<Buffer | null>(
    () => take(timeoutMs),
    timeoutMs + GRACE_MS,
    null,
  );

  if (!value || value.length === 0) return null;
  return `data:${SCREENSHOT_MIME};base64,${value.toString("base64")}`;
}

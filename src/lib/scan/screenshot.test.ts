import { describe, expect, it, vi } from "vitest";
import { captureScreenshot } from "./screenshot";

const never = () => new Promise<Buffer>(() => undefined);
const delayed = (ms: number, buf: Buffer) =>
  new Promise<Buffer>((resolve) => setTimeout(() => resolve(buf), ms));

describe("captureScreenshot", () => {
  it("encodes a captured buffer as a jpeg data URI", async () => {
    const shot = await captureScreenshot(async () => Buffer.from("abc"), 1_000);
    expect(shot).toBe(`data:image/jpeg;base64,${Buffer.from("abc").toString("base64")}`);
  });

  it("returns null when the capture hangs, instead of blocking the scan", async () => {
    const started = Date.now();
    const shot = await captureScreenshot(never, 40);

    expect(shot).toBeNull();
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("returns null when the capture throws", async () => {
    const shot = await captureScreenshot(async () => {
      throw new Error("Target closed");
    }, 1_000);
    expect(shot).toBeNull();
  });

  it("returns null when there is no budget left for a preview", async () => {
    const take = vi.fn(never);
    expect(await captureScreenshot(take, 0)).toBeNull();
    expect(take).not.toHaveBeenCalled();
  });

  it("passes the remaining budget down as the capture timeout", async () => {
    const take = vi.fn(async () => Buffer.from("x"));
    await captureScreenshot(take, 2_500);
    expect(take).toHaveBeenCalledWith(2_500);
  });

  it("treats an empty buffer as no preview", async () => {
    expect(await captureScreenshot(async () => Buffer.alloc(0), 1_000)).toBeNull();
  });

  it("still resolves when the capture finishes just under the wire", async () => {
    const shot = await captureScreenshot(() => delayed(30, Buffer.from("ok")), 300);
    expect(shot).toContain("data:image/jpeg;base64,");
  });
});

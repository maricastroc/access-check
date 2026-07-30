import { afterEach, describe, expect, it, vi } from "vitest";
import { streamScan, type ScanStreamEvent } from "./stream";
import type { ScanPhase, ScanResult } from "./types";

const result = (score: number): ScanResult =>
  ({
    url: "https://example.com",
    finalUrl: "https://example.com/",
    title: "Example",
    score,
    counts: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      passed: 1,
      bestPractice: 0,
      manualReview: 0,
    },
  }) as ScanResult;

function mockStream(events: ScanStreamEvent[], ok = true) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      controller.close();
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(ok ? body : null, { status: ok ? 200 : 500 })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamScan", () => {
  it("returns the final result from a multi-event stream", async () => {
    const phases: ScanPhase[] = [];
    const cores: number[] = [];
    mockStream([
      { type: "phase", phase: "preparing" },
      { type: "phase", phase: "auditing" },
      { type: "core", result: result(80) },
      { type: "result", result: result(95) },
    ]);

    const final = await streamScan("https://example.com", {
      onPhase: (p) => phases.push(p),
      onCore: (r) => cores.push(r.score),
    });

    expect(phases).toEqual(["preparing", "auditing"]);
    expect(cores).toEqual([80]);
    expect(final.score).toBe(95);
  });

  it("returns the result from a single-event (cached) stream", async () => {
    mockStream([{ type: "result", result: result(72) }]);

    const final = await streamScan("https://example.com");

    expect(final.score).toBe(72);
    expect(final.counts.critical).toBe(0);
  });

  it("splits events that arrive across chunk boundaries", async () => {
    const encoder = new TextEncoder();
    const raw = `${JSON.stringify({ type: "phase", phase: "loading" })}\n${JSON.stringify({
      type: "result",
      result: result(50),
    })}\n`;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        // Split mid-JSON so a line spans two reads.
        controller.enqueue(encoder.encode(raw.slice(0, 20)));
        controller.enqueue(encoder.encode(raw.slice(20)));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(body, { status: 200 })),
    );

    const phases: ScanPhase[] = [];
    const final = await streamScan("https://example.com", { onPhase: (p) => phases.push(p) });

    expect(phases).toEqual(["loading"]);
    expect(final.score).toBe(50);
  });

  it("rejects when an error event arrives before any result", async () => {
    mockStream([
      { type: "phase", phase: "loading" },
      { type: "error", error: "Could not scan this page." },
    ]);

    await expect(streamScan("https://example.com")).rejects.toThrow("Could not scan this page.");
  });

  it("keeps the partial result when an error arrives after a core result", async () => {
    mockStream([
      { type: "core", result: result(64) },
      { type: "error", error: "Audits timed out." },
    ]);

    const final = await streamScan("https://example.com");

    expect(final.score).toBe(64);
  });

  it("rejects with the server message on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "Too many scans. Try again in a minute." }), {
            status: 429,
          }),
      ),
    );

    await expect(streamScan("https://example.com")).rejects.toThrow("Too many scans");
  });

  it("rejects when the stream closes without a result", async () => {
    mockStream([{ type: "phase", phase: "preparing" }]);

    await expect(streamScan("https://example.com")).rejects.toThrow("Scan failed.");
  });
});

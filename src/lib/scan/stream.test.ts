import { afterEach, describe, expect, it, vi } from "vitest";
import { streamScan, ScanStreamError, type ScanStreamEvent } from "./stream";
import type { ScanPhase, ScanResult } from "./types";

const result = (score: number, extra: Partial<ScanResult> = {}): ScanResult =>
  ({
    url: "https://example.com",
    finalUrl: "https://example.com/",
    title: "Example",
    score,
    screenshot: null,
    counts: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      passed: 1,
      bestPractice: 0,
      manualReview: 0,
    },
    ...extra,
  }) as ScanResult;

function mockStream(events: ScanStreamEvent[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      controller.close();
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status: 200 })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request body", () => {
  function captureFetch() {
    const fetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => {
        const encoder = new TextEncoder();
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              const done: ScanStreamEvent = { type: "result", result: result(100) };
              controller.enqueue(encoder.encode(`${JSON.stringify(done)}\n`));
              controller.close();
            },
          }),
          { status: 200 },
        );
      },
    );
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }

  function bodyOf(fetch: ReturnType<typeof captureFetch>) {
    return JSON.parse(String(fetch.mock.calls[0][1]?.body)) as { url: string; force?: boolean };
  }

  it("asks the server to skip its own caches on a forced re-audit", async () => {
    const fetch = captureFetch();
    await streamScan("https://example.com", {}, { force: true });
    expect(bodyOf(fetch)).toEqual({ url: "https://example.com", force: true });
  });

  it("says nothing about forcing on an ordinary audit", async () => {
    const fetch = captureFetch();
    await streamScan("https://example.com");
    expect(bodyOf(fetch)).toEqual({ url: "https://example.com" });
  });
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

  it("carries the preview from the core event into a screenshot-less final result", async () => {
    const shot = "data:image/jpeg;base64,AAAA";
    const { screenshot: _omitted, ...light } = result(90);
    void _omitted;

    mockStream([
      { type: "core", result: result(80, { screenshot: shot }) },
      { type: "result", result: light },
    ]);

    const final = await streamScan("https://example.com");

    expect(final.score).toBe(90);
    expect(final.screenshot).toBe(shot);
  });

  it("returns the result from a single-event (cached) stream", async () => {
    mockStream([{ type: "result", result: result(72) }]);

    const final = await streamScan("https://example.com");

    expect(final.score).toBe(72);
    expect(final.screenshot).toBeNull();
  });

  it("splits events that arrive across chunk boundaries", async () => {
    const encoder = new TextEncoder();
    const raw = `${JSON.stringify({ type: "phase", phase: "loading" })}\n${JSON.stringify({
      type: "result",
      result: result(50),
    })}\n`;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
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

  it("surfaces the server code when an error arrives before any result", async () => {
    mockStream([
      { type: "phase", phase: "loading" },
      { type: "error", error: "The page took too long to respond.", code: "navigation-timeout" },
    ]);

    await expect(streamScan("https://example.com")).rejects.toMatchObject({
      message: "The page took too long to respond.",
      code: "navigation-timeout",
    });
  });

  it("keeps the partial result when an error arrives after a core result", async () => {
    mockStream([
      { type: "core", result: result(64) },
      { type: "error", error: "Audits timed out.", code: "timeout" },
    ]);

    const final = await streamScan("https://example.com");

    expect(final.score).toBe(64);
    expect(final.partial).toBe(true);
    expect(final.warnings?.map((w) => w.code)).toContain("stream-interrupted");
  });

  it("keeps the partial result when the stream is cut off mid-scan", async () => {
    mockStream([
      { type: "phase", phase: "auditing" },
      { type: "core", result: result(41) },
    ]);

    const final = await streamScan("https://example.com");

    expect(final.score).toBe(41);
    expect(final.partial).toBe(true);
    expect(final.warnings?.map((w) => w.code)).toContain("stream-interrupted");
  });

  it("does not duplicate the interruption warning", async () => {
    mockStream([
      {
        type: "core",
        result: result(41, {
          warnings: [{ code: "stream-interrupted", message: "already there" }],
        }),
      },
    ]);

    const final = await streamScan("https://example.com");

    expect(final.warnings?.filter((w) => w.code === "stream-interrupted")).toHaveLength(1);
  });

  it("reports an interrupted stream that never produced anything", async () => {
    mockStream([{ type: "phase", phase: "preparing" }]);

    await expect(streamScan("https://example.com")).rejects.toMatchObject({
      code: "interrupted",
    });
  });

  it("rejects with the server message and code on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: "Too many scans. Try again in a minute.",
              code: "rate-limited",
            }),
            { status: 429 },
          ),
      ),
    );

    await expect(streamScan("https://example.com")).rejects.toMatchObject({
      message: "Too many scans. Try again in a minute.",
      code: "rate-limited",
    });
  });

  it("derives a code from the status when the body has none", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 429 })),
    );

    const err = await streamScan("https://example.com").catch((e) => e);
    expect(err).toBeInstanceOf(ScanStreamError);
    expect(err.code).toBe("rate-limited");
  });

  it("ignores an unparseable line instead of failing the whole scan", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("{not json}\n"));
        controller.enqueue(
          encoder.encode(`${JSON.stringify({ type: "result", result: result(33) })}\n`),
        );
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(body, { status: 200 })),
    );

    const final = await streamScan("https://example.com");
    expect(final.score).toBe(33);
  });
});

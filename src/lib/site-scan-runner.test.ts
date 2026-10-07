import { beforeEach, describe, expect, it, vi } from "vitest";
import { translator } from "./i18n/t";

const runScan = vi.fn();
const completePage = vi.fn();
const markPageRunning = vi.fn();

class ScanFailure extends Error {}

vi.mock("@/lib/scan/scan", () => ({ runScan, ScanFailure }));

vi.mock("@/lib/site-scans", () => ({
  CRAWL_SCAN_OPTS: { screenshot: false, keyboard: false, contexts: false, verifyFixes: false },
  completePage,
  markPageRunning,
}));

const { processPagesInline, scanOnePage } = await import("./site-scan-runner");

const RESULT = { title: "Example", score: 90 };
const pt = translator("pt-BR");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  runScan.mockResolvedValue(RESULT);
});

describe("scanOnePage", () => {
  it("scans the page in the locale the site audit started with", async () => {
    await scanOnePage("site_1", "https://example.com/", "pt-BR");

    expect(runScan).toHaveBeenCalledWith(
      "https://example.com/",
      expect.objectContaining({ locale: "pt-BR", screenshot: false, blockPrivateHosts: true }),
    );
    expect(completePage).toHaveBeenCalledWith("site_1", "https://example.com/", {
      ok: true,
      result: RESULT,
    });
  });

  it("keeps a scan failure's own message, already written in that locale", async () => {
    runScan.mockRejectedValue(new ScanFailure(pt("scanFail.unreachable")));

    await scanOnePage("site_1", "https://example.com/", "pt-BR");

    expect(completePage).toHaveBeenCalledWith("site_1", "https://example.com/", {
      ok: false,
      error: pt("scanFail.unreachable"),
    });
  });

  it("stores a translated generic message rather than an internal error", async () => {
    runScan.mockRejectedValue(new Error("Target crashed"));

    await scanOnePage("site_1", "https://example.com/", "pt-BR");

    expect(completePage).toHaveBeenCalledWith("site_1", "https://example.com/", {
      ok: false,
      error: pt("scanFail.generic"),
    });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Target crashed"));
  });
});

describe("processPagesInline", () => {
  it("scans every page in the same locale", async () => {
    const urls = ["https://example.com/", "https://example.com/about"];

    await processPagesInline("site_1", urls, "pt-BR");

    expect(runScan.mock.calls.map(([url, opts]) => [url, opts.locale])).toEqual([
      ["https://example.com/", "pt-BR"],
      ["https://example.com/about", "pt-BR"],
    ]);
  });
});

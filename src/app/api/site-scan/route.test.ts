import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_COOKIE } from "@/lib/i18n/server";

const createSiteScan = vi.fn();
const failSiteScan = vi.fn();
const canFanOut = vi.fn();
const enqueuePageScans = vi.fn();
const processPagesInline = vi.fn();

const ROOT = "https://example.com/";
const URLS = ["https://example.com/", "https://example.com/about"];

vi.mock("@/lib/rate-limit", () => ({
  clientKey: () => "client",
  siteScanRateLimit: { check: async () => "allowed" },
}));

vi.mock("@/lib/scan/discover", () => ({
  normalizeRoot: () => ROOT,
  discoverUrls: async () => URLS,
}));

vi.mock("@/lib/scan/ssrf", () => ({
  assertPublicUrl: vi.fn(async () => {}),
  BlockedUrlError: class BlockedUrlError extends Error {},
}));

vi.mock("@/lib/site-scans", () => ({ createSiteScan, failSiteScan }));
vi.mock("@/lib/qstash", () => ({ canFanOut, enqueuePageScans }));
vi.mock("@/lib/site-scan-runner", () => ({ processPagesInline }));

const { POST } = await import("./route");

function post(headers: Record<string, string> = {}): Promise<Response> {
  return POST(
    new Request("https://audit.test/api/site-scan", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ url: "example.com" }),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VERCEL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  createSiteScan.mockResolvedValue("site_1");
  canFanOut.mockReturnValue(true);
  enqueuePageScans.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/site-scan", () => {
  it("records the visitor's chosen locale on the audit and on every queued page", async () => {
    const res = await post({ cookie: `${LOCALE_COOKIE}=pt-BR` });

    expect(res.status).toBe(200);
    expect(createSiteScan).toHaveBeenCalledWith(ROOT, URLS, "pt-BR");
    expect(enqueuePageScans).toHaveBeenCalledWith(
      URLS.map((url) => ({ siteScanId: "site_1", url, locale: "pt-BR" })),
    );
  });

  it("follows the browser's language when no choice was stored", async () => {
    canFanOut.mockReturnValue(false);

    await post({ "accept-language": "pt-BR,pt;q=0.9" });

    expect(createSiteScan).toHaveBeenCalledWith(ROOT, URLS, "pt-BR");
    expect(processPagesInline).toHaveBeenCalledWith("site_1", URLS, "pt-BR");
  });

  it("keeps the same locale when the queue refuses the batch and pages run inline", async () => {
    enqueuePageScans.mockRejectedValue(new Error("queue down"));

    await post({ cookie: `${LOCALE_COOKIE}=pt-BR` });

    expect(processPagesInline).toHaveBeenCalledWith("site_1", URLS, "pt-BR");
  });

  it("audits in English for a visitor with no language signal", async () => {
    await post();

    expect(createSiteScan).toHaveBeenCalledWith(ROOT, URLS, "en");
    expect(enqueuePageScans).toHaveBeenCalledWith(
      URLS.map((url) => ({ siteScanId: "site_1", url, locale: "en" })),
    );
  });
});

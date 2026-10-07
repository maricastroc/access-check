import { beforeEach, describe, expect, it, vi } from "vitest";

const scanOnePage = vi.fn();

vi.mock("@/lib/qstash", () => ({ verifyQstashSignature: async () => true }));
vi.mock("@/lib/site-scan-runner", () => ({ scanOnePage }));

const { POST } = await import("./route");

function deliver(job: Record<string, unknown>): Promise<Response> {
  return POST(
    new Request("https://audit.test/api/site-scan/page", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(job),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  scanOnePage.mockResolvedValue(undefined);
});

describe("POST /api/site-scan/page", () => {
  it("scans the page in the locale the job carries", async () => {
    const res = await deliver({
      siteScanId: "site_1",
      url: "https://example.com/",
      locale: "pt-BR",
    });

    expect(res.status).toBe(200);
    expect(scanOnePage).toHaveBeenCalledWith("site_1", "https://example.com/", "pt-BR");
  });

  it("scans a job queued before jobs carried a locale in English", async () => {
    await deliver({ siteScanId: "site_1", url: "https://example.com/" });

    expect(scanOnePage).toHaveBeenCalledWith("site_1", "https://example.com/", "en");
  });

  it("falls back to English for a locale the product does not serve", async () => {
    await deliver({ siteScanId: "site_1", url: "https://example.com/", locale: "fr" });

    expect(scanOnePage).toHaveBeenCalledWith("site_1", "https://example.com/", "en");
  });
});

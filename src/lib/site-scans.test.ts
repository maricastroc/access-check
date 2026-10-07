import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const findUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma: { siteScan: { create, findUnique } } }));

const { createSiteScan, getSiteScan } = await import("./site-scans");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "site_1",
    rootUrl: "https://example.com/",
    status: "running",
    locale: "en",
    totalPages: 1,
    scannedPages: 0,
    failedPages: 0,
    score: null,
    error: null,
    createdAt: new Date("2026-10-07T12:00:00Z"),
    pages: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("site scan records", () => {
  it("store the locale the audit started in", async () => {
    create.mockResolvedValue({ id: "site_1" });

    await createSiteScan("https://example.com/", ["https://example.com/"], "pt-BR");

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rootUrl: "https://example.com/", locale: "pt-BR" }),
      }),
    );
  });

  it("report the stored locale with the snapshot", async () => {
    findUnique.mockResolvedValue(row({ locale: "pt-BR" }));

    expect((await getSiteScan("site_1"))?.locale).toBe("pt-BR");
  });

  it("read an unrecognised stored locale as English", async () => {
    findUnique.mockResolvedValue(row({ locale: "fr" }));

    expect((await getSiteScan("site_1"))?.locale).toBe("en");
  });
});

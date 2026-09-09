import { describe, expect, it } from "vitest";
import {
  DEFAULT_REPORT_LOCALE,
  axeLocaleFile,
  isReportLocale,
  langAttrs,
  localeFromAcceptLanguage,
  normalizeReportLocale,
} from "./locale";

describe("normalizeReportLocale", () => {
  it("accepts the shapes Chrome and browsers actually report", () => {
    expect(normalizeReportLocale("pt-BR")).toBe("pt-BR");
    expect(normalizeReportLocale("pt_BR")).toBe("pt-BR");
    expect(normalizeReportLocale("pt-br")).toBe("pt-BR");
    expect(normalizeReportLocale("pt")).toBe("pt-BR");
    expect(normalizeReportLocale("pt-PT")).toBe("pt-BR");
  });

  it("falls back to the default for anything not translated yet", () => {
    expect(normalizeReportLocale("en-US")).toBe(DEFAULT_REPORT_LOCALE);
    expect(normalizeReportLocale("es-ES")).toBe(DEFAULT_REPORT_LOCALE);
    expect(normalizeReportLocale("")).toBe(DEFAULT_REPORT_LOCALE);
    expect(normalizeReportLocale(null)).toBe(DEFAULT_REPORT_LOCALE);
    expect(normalizeReportLocale(undefined)).toBe(DEFAULT_REPORT_LOCALE);
  });
});

describe("localeFromAcceptLanguage", () => {
  it("honours quality weights rather than document order", () => {
    expect(localeFromAcceptLanguage("en-US;q=0.4,pt-BR;q=0.9")).toBe("pt-BR");
    expect(localeFromAcceptLanguage("pt-BR;q=0.3,en-US;q=0.8")).toBe(DEFAULT_REPORT_LOCALE);
  });

  it("reads a plain header in order", () => {
    expect(localeFromAcceptLanguage("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt-BR");
    expect(localeFromAcceptLanguage("en-GB,en;q=0.9")).toBe(DEFAULT_REPORT_LOCALE);
  });

  it("skips languages it cannot serve instead of giving up at the first one", () => {
    expect(localeFromAcceptLanguage("de-DE,fr;q=0.9,pt-BR;q=0.5")).toBe("pt-BR");
  });

  it("ignores the wildcard and zero-quality entries", () => {
    expect(localeFromAcceptLanguage("*")).toBe(DEFAULT_REPORT_LOCALE);
    expect(localeFromAcceptLanguage("pt-BR;q=0")).toBe(DEFAULT_REPORT_LOCALE);
  });

  it("survives a missing or malformed header", () => {
    expect(localeFromAcceptLanguage(null)).toBe(DEFAULT_REPORT_LOCALE);
    expect(localeFromAcceptLanguage("")).toBe(DEFAULT_REPORT_LOCALE);
    expect(localeFromAcceptLanguage(";;;")).toBe(DEFAULT_REPORT_LOCALE);
  });
});

describe("langAttrs", () => {
  it("marks a part only when it differs from the language around it", () => {
    expect(langAttrs("en")).toEqual({});
    expect(langAttrs(undefined)).toEqual({});
    expect(langAttrs("pt-BR")).toEqual({ lang: "pt-BR" });
  });

  it("stays silent once the surrounding interface speaks the same language", () => {
    expect(langAttrs("pt-BR", "pt-BR")).toEqual({});
    expect(langAttrs("en", "pt-BR")).toEqual({ lang: "en" });
  });
});

describe("axeLocaleFile", () => {
  it("maps to the file names axe-core ships, and asks for none in English", () => {
    expect(axeLocaleFile("en")).toBeNull();
    expect(axeLocaleFile("pt-BR")).toBe("pt_BR");
  });
});

describe("isReportLocale", () => {
  it("guards values arriving from storage or the wire", () => {
    expect(isReportLocale("pt-BR")).toBe(true);
    expect(isReportLocale("en")).toBe(true);
    expect(isReportLocale("fr")).toBe(false);
    expect(isReportLocale(null)).toBe(false);
  });
});

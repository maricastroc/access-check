import { describe, expect, it } from "vitest";
import { en } from "./messages/en";
import { ptBR } from "./messages/pt-BR";
import { REPORT_LOCALES } from "./locale";
import { translator, type MessageKey } from "./t";

const keys = Object.keys(en) as MessageKey[];

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

function variants(message: unknown): string[] {
  return typeof message === "string" ? [message] : Object.values(message as Record<string, string>);
}

describe("the translator", () => {
  const t = translator("en");

  it("fills placeholders from the values it is given", () => {
    expect(t("deep.attachRefused", { reason: "target busy" })).toBe(
      "Chrome refused to attach the debugger: target busy",
    );
  });

  it("leaves a placeholder alone when nothing was passed for it", () => {
    expect(t("deep.unfinished")).toContain("{reason}");
  });

  it("picks the singular only for exactly one", () => {
    expect(t("unit.stop", { count: 1 })).toBe("1 stop");
    expect(t("unit.stop", { count: 0 })).toBe("0 stops");
    expect(t("unit.stop", { count: 2 })).toBe("2 stops");
  });

  it("agrees in Portuguese, which the English catalog cannot decide for it", () => {
    const pt = translator("pt-BR");
    expect(pt("unit.stop", { count: 1 })).toBe("1 parada");
    expect(pt("unit.stop", { count: 3 })).toBe("3 paradas");
    expect(pt("coverage.partialChecks", { count: 1 })).toBe(
      "Cobertura parcial · 1 verificação indisponível",
    );
    expect(pt("coverage.partialChecks", { count: 3 })).toBe(
      "Cobertura parcial · 3 verificações indisponíveis",
    );
  });

  it("falls back to English rather than showing a raw key", () => {
    const unknown = translator("de" as never);
    expect(unknown("panel.locate")).toBe("Locate on page");
  });
});

describe("the catalogs stay in step", () => {
  it("covers every locale the product offers", () => {
    for (const locale of REPORT_LOCALES) {
      expect(translator(locale)("panel.locate")).not.toBe("panel.locate");
    }
  });

  it("translates every key, with no English left behind in the Portuguese one", () => {
    const untranslated = keys.filter(
      (key) =>
        typeof en[key] === "string" &&
        en[key] === ptBR[key] &&
        /[a-z]{4} [a-z]{4}/.test(en[key] as string),
    );
    expect(untranslated).toEqual([]);
  });

  it("keeps the same placeholders in both languages", () => {
    const drifted = keys.filter((key) => {
      const source = variants(en[key]).flatMap(placeholders).sort();
      const target = variants(ptBR[key]).flatMap(placeholders).sort();
      return JSON.stringify([...new Set(source)]) !== JSON.stringify([...new Set(target)]);
    });
    expect(drifted).toEqual([]);
  });

  it("has no empty message in either language", () => {
    const empty = keys.filter((key) =>
      [...variants(en[key]), ...variants(ptBR[key])].some((text) => text.trim().length === 0),
    );
    expect(empty).toEqual([]);
  });
});

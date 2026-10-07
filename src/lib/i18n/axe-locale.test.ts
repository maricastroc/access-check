import { describe, expect, it } from "vitest";
import template from "axe-core/locales/_template.json";
import ptBR from "axe-core/locales/pt_BR.json";
import { axeLocaleFor } from "./axe-locale";

type Tree = { [key: string]: unknown };

const isTree = (value: unknown): value is Tree =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function untranslated(english: Tree, local: Tree, path: string[] = []): string[] {
  return Object.entries(english).flatMap(([key, value]) => {
    if (!(key in local)) return [[...path, key].join(".")];
    const here = local[key];
    return isTree(value) && isTree(here) ? untranslated(value, here, [...path, key]) : [];
  });
}

function leaves(tree: Tree, path: string[] = []): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    isTree(value)
      ? leaves(value, [...path, key])
      : typeof value === "string"
        ? [[[...path, key].join("."), value] as [string, string]]
        : [],
  );
}

function at(tree: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((node, key) => (isTree(node) ? node[key] : undefined), tree);
}

const placeholders = (text: string) =>
  [...text.matchAll(/\$\{\s?data(\.\w+)?\s?\}/g)].map((m) => m[0]).sort();

const { lang: _lang, ...english } = template as Tree;
const local = axeLocaleFor("pt-BR") as unknown as Tree;

describe("the pt-BR axe locale", () => {
  it("leaves no rule or check message to fall back to English", () => {
    expect(untranslated(english, local)).toEqual([]);
  });

  it("keeps every placeholder of the English message it fills in", () => {
    const shipped = new Set(leaves(ptBR as Tree).map(([path]) => path));
    const added = leaves(local).filter(([path]) => !shipped.has(path));
    expect(added.length).toBeGreaterThan(0);
    for (const [path, text] of added) {
      const source = at(english, path);
      expect(typeof source, path).toBe("string");
      expect(placeholders(text), path).toEqual(placeholders(source as string));
    }
  });

  it("keeps the translations axe-core ships", () => {
    expect(at(local, "rules.link-in-text-block.help")).toBe(
      at(ptBR, "rules.link-in-text-block.help"),
    );
    expect(at(local, "checks.aria-errormessage.fail.singular")).toBe(
      at(ptBR, "checks.aria-errormessage.fail.singular"),
    );
  });

  it("names the target size rule and the link styling check in Portuguese", () => {
    expect(at(local, "rules.target-size.help")).toBe(
      "Alvos de toque devem ter 24px ou deixar espaço suficiente ao redor",
    );
    expect(at(local, "checks.link-in-text-block-style.fail")).toBe(
      "O link não tem um estilo, como sublinhado, que o distinga do texto ao redor",
    );
  });
});

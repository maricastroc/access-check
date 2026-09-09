import { describe, expect, it } from "vitest";
import { en } from "./messages/en";
import { ptBR } from "./messages/pt-BR";
import type { MessageKey } from "./t";

const keys = Object.keys(en) as MessageKey[];

function variants(message: unknown): string[] {
  return typeof message === "string" ? [message] : Object.values(message as Record<string, string>);
}

const CODE = /`[^`]*`|<[^>]+>|\b[a-z-]+:\s?[\w#.-]+|aria-[\w-]+|https?:\/\/\S+|\{[^}]*\}/g;

function prose(text: string): string {
  return text.replace(CODE, " ");
}

const ENGLISH_ONLY = [
  " the ",
  " and ",
  " with ",
  " that ",
  " which ",
  " from ",
  " they ",
  " their ",
  " your ",
  " you ",
  " this ",
  " these ",
  " were ",
  " have ",
  " been ",
  " only ",
  " each ",
  " score ",
  " page ",
  " check ",
  " checks ",
  " element ",
  " elements ",
  " findings ",
  " review ",
  " fails ",
  " passed ",
];

const ALLOWED_ENGLISH: MessageKey[] = ["home.md.filename"];

describe("the Portuguese catalog reads as Portuguese", () => {
  it("carries no English editorial prose", () => {
    const leaking: string[] = [];

    for (const key of keys) {
      if (ALLOWED_ENGLISH.includes(key)) continue;
      for (const text of variants(ptBR[key])) {
        const haystack = ` ${prose(text).toLowerCase()} `;
        const hit = ENGLISH_ONLY.find((word) => haystack.includes(word));
        if (hit) leaking.push(`${key}: "${hit.trim()}" in ${text.slice(0, 70)}`);
      }
    }

    expect(leaking).toEqual([]);
  });

  it("differs from English wherever the entry is real prose", () => {
    const identical = keys.filter((key) => {
      if (typeof en[key] !== "string") return false;
      const text = en[key] as string;
      if (text !== (ptBR[key] as string)) return false;
      return (
        prose(text)
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 3).length >= 3
      );
    });

    expect(identical).toEqual([]);
  });

  it("keeps the glossary consistent instead of mixing synonyms", () => {
    const all = keys
      .flatMap((key) => variants(ptBR[key]))
      .join(" ")
      .toLowerCase();

    for (const banned of ["achado", "cópia isolada", "de verdade", "manipulador", "nesta build"]) {
      expect(all).not.toContain(banned);
    }
  });

  it("never calls a failure automatic when it means automatically detected", () => {
    const all = keys
      .flatMap((key) => variants(ptBR[key]))
      .join(" ")
      .toLowerCase();

    expect(all).not.toContain("falha automática");
    expect(all).not.toContain("falhas automáticas");
    expect(all).not.toContain("problema automático");
  });
});

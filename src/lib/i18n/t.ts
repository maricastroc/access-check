import { DEFAULT_REPORT_LOCALE, type ReportLocale } from "./locale";
import { en, type Catalog } from "./messages/en";
import { ptBR } from "./messages/pt-BR";
import type { Message, Plural } from "./messages/shape";

export type { Message, Plural } from "./messages/shape";
export type { Catalog } from "./messages/en";

export type MessageKey = keyof Catalog;

export type Vars = Record<string, string | number>;

const CATALOGS: Record<ReportLocale, Catalog> = {
  en,
  "pt-BR": ptBR,
};

export type Translate = (key: MessageKey, vars?: Vars) => string;

function isPlural(message: Message): message is Plural {
  return typeof message !== "string";
}

function interpolate(template: string, vars: Vars | undefined): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

export function translator(locale: ReportLocale = DEFAULT_REPORT_LOCALE): Translate {
  const catalog = CATALOGS[locale] ?? CATALOGS[DEFAULT_REPORT_LOCALE];
  const fallback = CATALOGS[DEFAULT_REPORT_LOCALE];

  return (key, vars) => {
    const message: Message = catalog[key] ?? fallback[key];
    if (message === undefined) return String(key);

    if (isPlural(message)) {
      const count = Number(vars?.count ?? 0);
      return interpolate(count === 1 ? message.one : message.other, vars);
    }

    return interpolate(message, vars);
  };
}

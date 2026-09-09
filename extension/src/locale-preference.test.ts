import { beforeEach, describe, expect, it } from "vitest";
import {
  asPreference,
  FOLLOW_BROWSER,
  LOCALE_KEY,
  localeOf,
  readLocale,
  readPreference,
  writePreference,
} from "./locale-preference";

let store: Record<string, unknown>;
let uiLanguage: string;
let refuseStorage: boolean;

beforeEach(() => {
  store = {};
  uiLanguage = "en-US";
  refuseStorage = false;

  globalThis.chrome = {
    i18n: { getUILanguage: () => uiLanguage },
    storage: {
      local: {
        get: async (key: string) => {
          if (refuseStorage) throw new Error("storage unavailable");
          return key in store ? { [key]: store[key] } : {};
        },
        set: async (items: Record<string, unknown>) => {
          if (refuseStorage) throw new Error("storage unavailable");
          Object.assign(store, items);
        },
      },
    },
  } as unknown as typeof chrome;
});

describe("reading a stored language choice", () => {
  it("follows the browser until someone chooses otherwise", async () => {
    expect(await readPreference()).toBe(FOLLOW_BROWSER);
  });

  it("keeps a choice that was made", async () => {
    await writePreference("pt-BR");

    expect(store[LOCALE_KEY]).toBe("pt-BR");
    expect(await readPreference()).toBe("pt-BR");
    expect(await readLocale()).toBe("pt-BR");
  });

  it("lets someone hand the choice back to the browser", async () => {
    await writePreference("pt-BR");
    await writePreference(FOLLOW_BROWSER);

    expect(await readPreference()).toBe(FOLLOW_BROWSER);
  });

  it("ignores a stored value the report is not written in", () => {
    expect(asPreference("fr")).toBe(FOLLOW_BROWSER);
    expect(asPreference(42)).toBe(FOLLOW_BROWSER);
    expect(asPreference(undefined)).toBe(FOLLOW_BROWSER);
    expect(asPreference("pt-BR")).toBe("pt-BR");
  });

  it("reads in the browser's language rather than failing when storage will not answer", async () => {
    refuseStorage = true;
    uiLanguage = "pt-BR";

    expect(await readPreference()).toBe(FOLLOW_BROWSER);
    expect(await readLocale()).toBe("pt-BR");
  });
});

describe("resolving a choice to a language", () => {
  it("asks the browser only while the choice is automatic", () => {
    uiLanguage = "pt-BR";
    expect(localeOf(FOLLOW_BROWSER)).toBe("pt-BR");

    uiLanguage = "en-GB";
    expect(localeOf(FOLLOW_BROWSER)).toBe("en");
  });

  it("holds an explicit choice against the browser's own language", () => {
    uiLanguage = "en-US";
    expect(localeOf("pt-BR")).toBe("pt-BR");

    uiLanguage = "pt-BR";
    expect(localeOf("en")).toBe("en");
  });

  it("falls back to the report's default for a browser language it does not ship", () => {
    uiLanguage = "fr-FR";
    expect(localeOf(FOLLOW_BROWSER)).toBe("en");
  });
});

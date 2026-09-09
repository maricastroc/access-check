import { describe, expect, it } from "vitest";
import { LOCALE_COOKIE, localeFromRequest, translateForRequest } from "./server";

function request(headers: Record<string, string>): Request {
  return new Request("https://accesscheck.test/", { headers });
}

describe("locale resolution from a request", () => {
  it("prefers an explicit choice stored in the cookie", () => {
    expect(localeFromRequest(request({ cookie: `${LOCALE_COOKIE}=pt-BR` }))).toBe("pt-BR");
    expect(localeFromRequest(request({ cookie: `${LOCALE_COOKIE}=en` }))).toBe("en");
  });

  it("finds the cookie among others, in any position", () => {
    const cookie = `theme=dark; ${LOCALE_COOKIE}=pt-BR; session=abc`;
    expect(localeFromRequest(request({ cookie }))).toBe("pt-BR");
  });

  it("lets the cookie override the browser's preference", () => {
    const req = request({
      cookie: `${LOCALE_COOKIE}=en`,
      "accept-language": "pt-BR,pt;q=0.9",
    });
    expect(localeFromRequest(req)).toBe("en");
  });

  it("falls back to Accept-Language when no choice was stored", () => {
    expect(localeFromRequest(request({ "accept-language": "pt-BR,pt;q=0.9" }))).toBe("pt-BR");
    expect(localeFromRequest(request({ "accept-language": "en-GB,en;q=0.9" }))).toBe("en");
  });

  it("ignores a cookie holding a locale the product does not serve", () => {
    expect(localeFromRequest(request({ cookie: `${LOCALE_COOKIE}=fr` }))).toBe("en");
  });

  it("defaults to English with no signal at all", () => {
    expect(localeFromRequest(request({}))).toBe("en");
  });

  it("hands API routes a translator already bound to that locale", () => {
    const pt = translateForRequest(request({ cookie: `${LOCALE_COOKIE}=pt-BR` }));
    const en = translateForRequest(request({}));

    expect(pt("api.internal")).not.toBe(en("api.internal"));
    expect(pt("api.internal")).toContain("Tente de novo");
    expect(en("api.internal")).toContain("try again");
  });
});

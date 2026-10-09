import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { AXE_TAGS } from "../scan/dom/axe";
import { translator } from "../i18n/t";
import { REPORT_LOCALES } from "../i18n/locale";
import { passedChecks, ruleCheck, ruleTitle } from "./titles";

const axe = createRequire(import.meta.url)("axe-core") as {
  getRules(tags: string[]): { ruleId: string }[];
};
const ruleIds = axe.getRules(AXE_TAGS).map((r) => r.ruleId);

describe("every rule axe runs has a title of our own", () => {
  for (const locale of REPORT_LOCALES) {
    const t = translator(locale);

    it(`names the problem and the check in ${locale}`, () => {
      const missing = ruleIds.filter((id) => !ruleTitle(id, t) || !ruleCheck(id, t));
      expect(missing).toEqual([]);
    });

    it(`keeps ${locale} titles short, unpunctuated and distinct from the check`, () => {
      for (const id of ruleIds) {
        const title = ruleTitle(id, t)!;
        const check = ruleCheck(id, t)!;
        expect(title.length, id).toBeLessThanOrEqual(56);
        expect(title, id).not.toMatch(/[.;]$/);
        expect(title, id).not.toMatch(/\b(must|should|ensures?)\b/i);
        expect(check, id).not.toBe(title);
      }
    });
  }

  it("leaves rules it does not know to the text the scan carried", () => {
    expect(ruleTitle("focus-not-visible", translator("en"))).toBeNull();
  });
});

describe("the checks that passed", () => {
  const t = translator("en");

  it("read as the check, not as axe's rule sentence", () => {
    expect(
      passedChecks(
        {
          passed: ["Images must have alternative text", "Something new"],
          passedRules: ["image-alt", "a-rule-from-a-later-axe"],
        },
        t,
      ),
    ).toEqual(["Alternative text for images", "Something new"]);
  });

  it("fall back to the stored sentences for results saved before rule ids were kept", () => {
    expect(passedChecks({ passed: ["Documents must have a title"] }, t)).toEqual([
      "Documents must have a title",
    ]);
  });
});

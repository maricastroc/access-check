import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  fixAriaAllowedAttr,
  fixAriaName,
  fixAriaRequiredAttr,
  fixContrast,
  fixDocumentTitle,
  fixHtmlLang,
  fixImageAlt,
  fixLabel,
  fixMetaViewport,
  type ElementInfo,
} from "./remediate";

function hex(h: string) {
  const s = h.replace("#", "");
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  };
}

const el = (over: Partial<ElementInfo>): ElementInfo => ({
  tag: "input",
  ...over,
});

describe("contrastRatio", () => {
  it("black on white is the maximum (21:1)", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 0);
  });

  it("equal colors give 1:1", () => {
    const c = { r: 100, g: 120, b: 140 };
    expect(contrastRatio(c, c)).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    const a = { r: 30, g: 60, b: 90 };
    const b = { r: 200, g: 210, b: 220 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 5);
  });
});

describe("fixContrast", () => {
  it("suggests a color that actually reaches the target", () => {
    const fix = fixContrast({
      fgColor: "#999999",
      bgColor: "#ffffff",
      contrastRatio: 2.85,
      expectedContrastRatio: 4.5,
    });
    expect(fix).not.toBeNull();
    const m = fix!.code!.match(/color: (#[0-9a-f]{6});/);
    expect(m).not.toBeNull();
    expect(contrastRatio(hex(m![1]), hex("#ffffff"))).toBeGreaterThanOrEqual(4.5);
    expect(fix!.apply).toEqual({ kind: "style", prop: "color", value: m![1] });
  });

  it("accepts rgb() in addition to hex", () => {
    const fix = fixContrast({
      fgColor: "rgb(150, 150, 150)",
      bgColor: "rgb(255, 255, 255)",
      contrastRatio: 2.85,
      expectedContrastRatio: 4.5,
    });
    expect(fix?.code).toMatch(/^color: #[0-9a-f]{6};$/);
  });

  it("property: the suggested color (already rounded) always passes the target", () => {
    const targets = [3, 4.5, 7];
    for (let g = 0; g <= 255; g += 17) {
      const fg = `#${g.toString(16).padStart(2, "0").repeat(3)}`;
      for (const bg of ["#ffffff", "#000000", "#888888", "#3b82f6"]) {
        for (const target of targets) {
          const fix = fixContrast({
            fgColor: fg,
            bgColor: bg,
            contrastRatio: 1,
            expectedContrastRatio: target,
          });
          const m = fix?.code?.match(/color: (#[0-9a-f]{6});/);
          if (!m) continue;
          expect(contrastRatio(hex(m[1]), hex(bg))).toBeGreaterThanOrEqual(target);
        }
      }
    }
  });

  it("preserves the hue: blue stays blue, does not turn gray/black", () => {
    const fix = fixContrast({
      fgColor: "#6699ff",
      bgColor: "#ffffff",
      contrastRatio: 2.0,
      expectedContrastRatio: 4.5,
    });
    const m = fix!.code!.match(/color: (#[0-9a-f]{6});/)!;
    const c = hex(m[1]);
    expect(contrastRatio(c, hex("#ffffff"))).toBeGreaterThanOrEqual(4.5);
    expect(c.b).toBeGreaterThan(c.r);
    expect(c.b).toBeGreaterThan(c.g);
    expect(c.r === c.g && c.g === c.b).toBe(false);
    expect(fix!.text.toLowerCase()).toContain("hue");
  });

  it("offers the background as an alternative when the text already resolves it", () => {
    const fix = fixContrast({
      fgColor: "#999999",
      bgColor: "#ffffff",
      contrastRatio: 2.85,
      expectedContrastRatio: 4.5,
    });
    expect(fix!.text).toMatch(/set the background to #[0-9a-f]{6}/i);
  });

  it("when the text does not resolve it alone, suggests and validates the background", () => {
    const fix = fixContrast({
      fgColor: "#e0e0e0",
      bgColor: "#8a8a8a",
      contrastRatio: 1.6,
      expectedContrastRatio: 7,
    });
    expect(fix!.code).toMatch(/^background: #[0-9a-f]{6};$/);
    expect(fix!.apply).toMatchObject({ kind: "style", prop: "background-color" });
    const m = fix!.code!.match(/background: (#[0-9a-f]{6});/)!;
    expect(contrastRatio(hex("#e0e0e0"), hex(m[1]))).toBeGreaterThanOrEqual(7);
  });

  it("returns null when the colors are not parseable", () => {
    expect(
      fixContrast({
        fgColor: "rebeccapurple",
        bgColor: "#fff",
        contrastRatio: 3,
        expectedContrastRatio: 4.5,
      }),
    ).toBeNull();
  });
});

describe("fixLabel", () => {
  it("suggests nothing when there is already an aria-label", () => {
    expect(fixLabel(el({ ariaLabel: "Email" }))).toBeNull();
  });

  it("uses <label for> when there is an id, with aria-label as the validation mutation", () => {
    const fix = fixLabel(el({ id: "email", name: "email" }));
    expect(fix?.code).toBe('<label for="email">Email</label>');
    expect(fix?.apply).toEqual({
      kind: "attr",
      name: "aria-label",
      value: "Email",
    });
  });

  it("falls back to aria-label when there is no id", () => {
    const fix = fixLabel(el({ placeholder: "Your name" }));
    expect(fix?.code).toBe('aria-label="Your name"');
  });

  it("prioritizes placeholder over name and humanizes the name", () => {
    expect(fixLabel(el({ id: "x", placeholder: "Search" }))?.code).toContain("Search");
    expect(fixLabel(el({ id: "x", name: "amountToSend" }))?.code).toBe(
      '<label for="x">Amount to send</label>',
    );
  });
});

describe("fixImageAlt", () => {
  it("uses the title when it exists", () => {
    const fix = fixImageAlt(el({ tag: "img", title: "Company logo" }));
    expect(fix.code).toBe('alt="Company logo"');
    expect(fix.apply).toEqual({
      kind: "attr",
      name: "alt",
      value: "Company logo",
    });
  });

  it("infers from the file name, stripping @2x and the extension", () => {
    expect(fixImageAlt(el({ tag: "img", src: "/assets/euro-flag@2x.png" })).code).toBe(
      'alt="Euro flag"',
    );
  });

  it("falls back to empty alt when nothing is inferable", () => {
    expect(fixImageAlt(el({ tag: "img" })).code).toBe('alt=""');
  });
});

describe("fixAriaName", () => {
  it("uses the visible text of the control", () => {
    const fix = fixAriaName(el({ tag: "button", text: "Submit" }));
    expect(fix.code).toBe('aria-label="Submit"');
    expect(fix.apply).toEqual({
      kind: "attr",
      name: "aria-label",
      value: "Submit",
    });
  });

  it("falls back to a generic placeholder without clues", () => {
    expect(fixAriaName(el({ tag: "a" })).code).toBe('aria-label="Describe this control"');
  });
});

describe("document-level fixes", () => {
  it("html lang", () => {
    expect(fixHtmlLang().apply).toEqual({
      kind: "doc",
      target: "lang",
      value: "en",
    });
  });
  it("document title", () => {
    expect(fixDocumentTitle().apply).toMatchObject({
      kind: "doc",
      target: "title",
    });
  });
  it("viewport", () => {
    expect(fixMetaViewport().apply?.kind).toBe("viewport");
  });
});

describe("ARIA attribute fixes", () => {
  it("lists the missing required attributes", () => {
    const fix = fixAriaRequiredAttr(["aria-valuenow", "aria-valuemin"]);
    expect(fix?.code).toContain('aria-valuenow="…"');
    expect(fix?.code).toContain('aria-valuemin="…"');
    expect(fix?.apply).toBeUndefined();
  });

  it("returns null with no attributes", () => {
    expect(fixAriaRequiredAttr([])).toBeNull();
    expect(fixAriaAllowedAttr([])).toBeNull();
  });

  it("extracts only the name of the forbidden attribute", () => {
    expect(fixAriaAllowedAttr(['aria-foo="bar"'])!.code).toBe("Remove: aria-foo");
  });
});

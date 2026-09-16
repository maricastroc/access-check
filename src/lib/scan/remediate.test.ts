import { describe, expect, it } from "vitest";
import { translator } from "../i18n/t";

const t = translator();
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
  type FixApply,
  type FixResult,
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

function rendered(apply: FixApply): string {
  switch (apply.kind) {
    case "attr":
      return `${apply.name}="${apply.value}"`;
    case "style":
      return `${apply.prop}: ${apply.value};`;
    case "doc":
      return apply.target === "lang"
        ? `<html lang="${apply.value}">`
        : `<title>${apply.value}</title>`;
    case "viewport":
      return `<meta name="viewport" content="${apply.value}">`;
  }
}

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
    const fix = fixContrast(
      {
        fgColor: "#999999",
        bgColor: "#ffffff",
        contrastRatio: 2.85,
        expectedContrastRatio: 4.5,
      },
      t,
    );
    expect(fix).not.toBeNull();
    const m = fix!.code!.match(/color: (#[0-9a-f]{6});/);
    expect(m).not.toBeNull();
    expect(contrastRatio(hex(m![1]), hex("#ffffff"))).toBeGreaterThanOrEqual(4.5);
    expect(fix!.apply).toEqual({ kind: "style", prop: "color", value: m![1] });
  });

  it("accepts rgb() in addition to hex", () => {
    const fix = fixContrast(
      {
        fgColor: "rgb(150, 150, 150)",
        bgColor: "rgb(255, 255, 255)",
        contrastRatio: 2.85,
        expectedContrastRatio: 4.5,
      },
      t,
    );
    expect(fix?.code).toMatch(/^color: #[0-9a-f]{6};$/);
  });

  it("property: the suggested color (already rounded) always passes the target", () => {
    const targets = [3, 4.5, 7];
    for (let g = 0; g <= 255; g += 17) {
      const fg = `#${g.toString(16).padStart(2, "0").repeat(3)}`;
      for (const bg of ["#ffffff", "#000000", "#888888", "#3b82f6"]) {
        for (const target of targets) {
          const fix = fixContrast(
            {
              fgColor: fg,
              bgColor: bg,
              contrastRatio: 1,
              expectedContrastRatio: target,
            },
            t,
          );
          const m = fix?.code?.match(/^color: (#[0-9a-f]{6});$/);
          if (!m) continue;
          expect(contrastRatio(hex(m[1]), hex(bg))).toBeGreaterThanOrEqual(target);
        }
      }
    }
  });

  it("preserves the hue: blue stays blue, does not turn gray/black", () => {
    const fix = fixContrast(
      {
        fgColor: "#6699ff",
        bgColor: "#ffffff",
        contrastRatio: 2.0,
        expectedContrastRatio: 4.5,
      },
      t,
    );
    const m = fix!.code!.match(/color: (#[0-9a-f]{6});/)!;
    const c = hex(m[1]);
    expect(contrastRatio(c, hex("#ffffff"))).toBeGreaterThanOrEqual(4.5);
    expect(c.b).toBeGreaterThan(c.r);
    expect(c.b).toBeGreaterThan(c.g);
    expect(c.r === c.g && c.g === c.b).toBe(false);
    expect(fix!.text.toLowerCase()).toContain("hue");
  });

  it("offers the background as an alternative when the text already resolves it", () => {
    const fix = fixContrast(
      {
        fgColor: "#999999",
        bgColor: "#ffffff",
        contrastRatio: 2.85,
        expectedContrastRatio: 4.5,
      },
      t,
    );
    expect(fix!.text).toMatch(/set the background to #[0-9a-f]{6}/i);
  });

  it("when the text does not resolve it alone, suggests and validates the background", () => {
    const fix = fixContrast(
      {
        fgColor: "#e0e0e0",
        bgColor: "#8a8a8a",
        contrastRatio: 1.6,
        expectedContrastRatio: 7,
      },
      t,
    );
    expect(fix!.code).toMatch(/^background-color: #[0-9a-f]{6};$/);
    expect(fix!.apply).toMatchObject({ kind: "style", prop: "background-color" });
    const m = fix!.code!.match(/background-color: (#[0-9a-f]{6});/)!;
    expect(contrastRatio(hex("#e0e0e0"), hex(m[1]))).toBeGreaterThanOrEqual(7);
  });

  it("is deterministic: the code shows exactly the declaration the verifier applies", () => {
    const fg = fixContrast(
      { fgColor: "#999999", bgColor: "#ffffff", contrastRatio: 2.85, expectedContrastRatio: 4.5 },
      t,
    );
    const bg = fixContrast(
      { fgColor: "#e0e0e0", bgColor: "#8a8a8a", contrastRatio: 1.6, expectedContrastRatio: 7 },
      t,
    );
    for (const fix of [fg, bg]) {
      expect(fix?.confidence).toBe("deterministic");
      expect(fix!.code).toBe(rendered(fix!.apply!));
    }
  });

  it("is only a suggestion when neither color can reach the target", () => {
    const fix = fixContrast(
      { fgColor: "#808080", bgColor: "#7a7a7a", contrastRatio: 1.1, expectedContrastRatio: 21 },
      t,
    );
    expect(fix?.confidence).toBe("suggested");
    expect(fix?.apply).toBeUndefined();
  });

  it("returns null when the colors are not parseable", () => {
    expect(
      fixContrast(
        {
          fgColor: "rebeccapurple",
          bgColor: "#fff",
          contrastRatio: 3,
          expectedContrastRatio: 4.5,
        },
        t,
      ),
    ).toBeNull();
  });
});

describe("fixLabel", () => {
  it("suggests nothing when there is already an aria-label", () => {
    expect(fixLabel(el({ ariaLabel: "Email" }), t)).toBeNull();
  });

  it("with an id, shows <label for> and carries no different transformation to verify", () => {
    const fix = fixLabel(el({ id: "email", name: "email" }), t);
    expect(fix?.confidence).toBe("contextual");
    expect(fix?.code).toBe('<label for="email">Email</label>');
    expect(fix?.apply).toBeUndefined();
  });

  it("without an id, applies exactly the aria-label it shows", () => {
    const fix = fixLabel(el({ placeholder: "Your name" }), t);
    expect(fix?.confidence).toBe("contextual");
    expect(fix?.code).toBe('aria-label="Your name"');
    expect(fix?.apply).toEqual({ kind: "attr", name: "aria-label", value: "Your name" });
    expect(fix!.code).toBe(rendered(fix!.apply!));
  });

  it("prioritizes placeholder over name and humanizes the name", () => {
    expect(fixLabel(el({ id: "x", placeholder: "Search" }), t)?.code).toContain("Search");
    expect(fixLabel(el({ id: "x", name: "amountToSend" }), t)?.code).toBe(
      '<label for="x">Amount to send</label>',
    );
  });

  it("without any clue, keeps the placeholder text as guidance and applies nothing", () => {
    const fix = fixLabel(el({}), t);
    expect(fix?.confidence).toBe("suggested");
    expect(fix?.code).toBe('aria-label="Describe this field"');
    expect(fix?.apply).toBeUndefined();
  });
});

describe("fixImageAlt", () => {
  it("uses the title when it exists, as a contextual guess", () => {
    const fix = fixImageAlt(el({ tag: "img", title: "Company logo" }), t);
    expect(fix.confidence).toBe("contextual");
    expect(fix.code).toBe('alt="Company logo"');
    expect(fix.apply).toEqual({
      kind: "attr",
      name: "alt",
      value: "Company logo",
    });
  });

  it("infers from the file name, stripping @2x and the extension", () => {
    const fix = fixImageAlt(el({ tag: "img", src: "/assets/euro-flag@2x.png" }), t);
    expect(fix.code).toBe('alt="Euro flag"');
    expect(fix.confidence).toBe("contextual");
  });

  it('never proposes alt="" as a transformation when nothing shows the image is decorative', () => {
    const fix = fixImageAlt(el({ tag: "img" }), t);
    expect(fix.confidence).toBe("suggested");
    expect(fix.apply).toBeUndefined();
    expect(fix.code).toBe('alt="…"');
    expect(fix.text).toContain('alt ("")');
  });
});

describe("fixAriaName", () => {
  it("uses the visible text of the control, as a contextual guess", () => {
    const fix = fixAriaName(el({ tag: "button", text: "Submit" }), t);
    expect(fix.confidence).toBe("contextual");
    expect(fix.code).toBe('aria-label="Submit"');
    expect(fix.apply).toEqual({
      kind: "attr",
      name: "aria-label",
      value: "Submit",
    });
  });

  it("without clues, keeps a placeholder as guidance and applies nothing", () => {
    const fix = fixAriaName(el({ tag: "a" }), t);
    expect(fix.confidence).toBe("suggested");
    expect(fix.code).toBe('aria-label="Describe this control"');
    expect(fix.apply).toBeUndefined();
  });
});

describe("document-level fixes", () => {
  it("html lang never invents a language", () => {
    for (const locale of ["en", "pt-BR"] as const) {
      const fix = fixHtmlLang(translator(locale));
      expect(fix.confidence).toBe("suggested");
      expect(fix.apply).toBeUndefined();
      expect(fix.code).toBe('<html lang="…">');
      expect(fix.code).not.toMatch(/lang="(en|pt)/);
    }
  });

  it("document title is guidance, not a placeholder applied to the page", () => {
    const fix = fixDocumentTitle(t);
    expect(fix.confidence).toBe("suggested");
    expect(fix.apply).toBeUndefined();
  });

  it("viewport replaces the whole content, so it stays contextual", () => {
    const fix = fixMetaViewport(t);
    expect(fix.confidence).toBe("contextual");
    expect(fix.apply?.kind).toBe("viewport");
    expect(fix.code).toBe(rendered(fix.apply!));
  });
});

describe("ARIA attribute fixes", () => {
  it("lists the missing required attributes", () => {
    const fix = fixAriaRequiredAttr(["aria-valuenow", "aria-valuemin"], t);
    expect(fix?.confidence).toBe("suggested");
    expect(fix?.code).toContain('aria-valuenow="…"');
    expect(fix?.code).toContain('aria-valuemin="…"');
    expect(fix?.apply).toBeUndefined();
  });

  it("returns null with no attributes", () => {
    expect(fixAriaRequiredAttr([], t)).toBeNull();
    expect(fixAriaAllowedAttr([], t)).toBeNull();
  });

  it("extracts only the name of the forbidden attribute", () => {
    const fix = fixAriaAllowedAttr(['aria-foo="bar"'], t);
    expect(fix!.code).toBe("Remove: aria-foo");
    expect(fix!.confidence).toBe("suggested");
    expect(fix!.apply).toBeUndefined();
  });
});

describe("every fix keeps what it shows and what it applies in step", () => {
  const all: FixResult[] = [
    fixContrast(
      { fgColor: "#999999", bgColor: "#ffffff", contrastRatio: 2.85, expectedContrastRatio: 4.5 },
      t,
    )!,
    fixContrast(
      { fgColor: "#e0e0e0", bgColor: "#8a8a8a", contrastRatio: 1.6, expectedContrastRatio: 7 },
      t,
    )!,
    fixLabel(el({ id: "email" }), t)!,
    fixLabel(el({ placeholder: "Search" }), t)!,
    fixLabel(el({}), t)!,
    fixImageAlt(el({ tag: "img", title: "Logo" }), t),
    fixImageAlt(el({ tag: "img" }), t),
    fixAriaName(el({ tag: "button", text: "Go" }), t),
    fixAriaName(el({ tag: "button" }), t),
    fixHtmlLang(t),
    fixDocumentTitle(t),
    fixMetaViewport(t),
    fixAriaRequiredAttr(["aria-checked"], t)!,
    fixAriaAllowedAttr(["aria-foo"], t)!,
  ];

  it("a deterministic fix always carries the transformation it shows", () => {
    for (const fix of all.filter((f) => f.confidence === "deterministic")) {
      expect(fix.apply).toBeDefined();
      expect(fix.code).toBe(rendered(fix.apply!));
    }
  });

  it("any transformation that is carried renders to the exact code shown", () => {
    for (const fix of all) {
      if (fix.apply) expect(fix.code).toBe(rendered(fix.apply));
    }
  });

  it("a suggestion never carries a transformation", () => {
    for (const fix of all.filter((f) => f.confidence === "suggested")) {
      expect(fix.apply).toBeUndefined();
    }
  });
});

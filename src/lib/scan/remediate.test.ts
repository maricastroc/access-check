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

// "#rrggbb" -> Rgb, só pra recomputar contraste nos asserts.
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
  it("preto sobre branco é o máximo (21:1)", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 0);
  });

  it("cores iguais dão 1:1", () => {
    const c = { r: 100, g: 120, b: 140 };
    expect(contrastRatio(c, c)).toBeCloseTo(1, 5);
  });

  it("é simétrico", () => {
    const a = { r: 30, g: 60, b: 90 };
    const b = { r: 200, g: 210, b: 220 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 5);
  });
});

describe("fixContrast", () => {
  it("sugere uma cor que realmente atinge o alvo", () => {
    const fix = fixContrast({
      fgColor: "#999999",
      bgColor: "#ffffff",
      contrastRatio: 2.85,
      expectedContrastRatio: 4.5,
    });
    expect(fix).not.toBeNull();
    const m = fix!.code!.match(/color: (#[0-9a-f]{6});/);
    expect(m).not.toBeNull();
    // a cor sugerida, recomputada, precisa passar no alvo
    expect(contrastRatio(hex(m![1]), hex("#ffffff"))).toBeGreaterThanOrEqual(4.5);
    expect(fix!.apply).toEqual({ kind: "style", prop: "color", value: m![1] });
  });

  it("aceita rgb() além de hex", () => {
    const fix = fixContrast({
      fgColor: "rgb(150, 150, 150)",
      bgColor: "rgb(255, 255, 255)",
      contrastRatio: 2.85,
      expectedContrastRatio: 4.5,
    });
    expect(fix?.code).toMatch(/^color: #[0-9a-f]{6};$/);
  });

  it("propriedade: a cor sugerida (já arredondada) sempre passa no alvo", () => {
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
          if (!m) continue; // null = impossível nesse fundo, comportamento ok
          expect(contrastRatio(hex(m[1]), hex(bg))).toBeGreaterThanOrEqual(target);
        }
      }
    }
  });

  it("preserva o matiz: azul continua azul, não vira cinza/preto", () => {
    const fix = fixContrast({
      fgColor: "#6699ff",
      bgColor: "#ffffff",
      contrastRatio: 2.0,
      expectedContrastRatio: 4.5,
    });
    const m = fix!.code!.match(/color: (#[0-9a-f]{6});/)!;
    const c = hex(m[1]);
    expect(contrastRatio(c, hex("#ffffff"))).toBeGreaterThanOrEqual(4.5);
    // ainda azulado: canal azul domina e a cor não colapsou pra cinza
    expect(c.b).toBeGreaterThan(c.r);
    expect(c.b).toBeGreaterThan(c.g);
    expect(c.r === c.g && c.g === c.b).toBe(false);
    // e a explicação deve deixar claro que só a luminosidade mudou
    expect(fix!.text.toLowerCase()).toContain("hue");
  });

  it("oferece o fundo como alternativa quando o texto já resolve", () => {
    const fix = fixContrast({
      fgColor: "#999999",
      bgColor: "#ffffff",
      contrastRatio: 2.85,
      expectedContrastRatio: 4.5,
    });
    expect(fix!.text).toMatch(/set the background to #[0-9a-f]{6}/i);
  });

  it("quando o texto não resolve sozinho, sugere e valida o fundo", () => {
    // alvo AAA (7:1) num fundo cinza-médio: nem preto nem branco no texto passam,
    // mas escurecer o fundo (mantendo o matiz) resolve.
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

  it("devolve null quando as cores não são parseáveis", () => {
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
  it("não sugere nada quando já há aria-label", () => {
    expect(fixLabel(el({ ariaLabel: "Email" }))).toBeNull();
  });

  it("usa <label for> quando há id, com aria-label como mutação de validação", () => {
    const fix = fixLabel(el({ id: "email", name: "email" }));
    expect(fix?.code).toBe('<label for="email">Email</label>');
    expect(fix?.apply).toEqual({
      kind: "attr",
      name: "aria-label",
      value: "Email",
    });
  });

  it("cai pra aria-label quando não há id", () => {
    const fix = fixLabel(el({ placeholder: "Your name" }));
    expect(fix?.code).toBe('aria-label="Your name"');
  });

  it("prioriza placeholder sobre name e humaniza o name", () => {
    expect(fixLabel(el({ id: "x", placeholder: "Search" }))?.code).toContain("Search");
    expect(fixLabel(el({ id: "x", name: "amountToSend" }))?.code).toBe(
      '<label for="x">Amount to send</label>',
    );
  });
});

describe("fixImageAlt", () => {
  it("usa o title quando existe", () => {
    const fix = fixImageAlt(el({ tag: "img", title: "Company logo" }));
    expect(fix.code).toBe('alt="Company logo"');
    expect(fix.apply).toEqual({
      kind: "attr",
      name: "alt",
      value: "Company logo",
    });
  });

  it("infere do nome do arquivo, tirando @2x e extensão", () => {
    expect(fixImageAlt(el({ tag: "img", src: "/assets/euro-flag@2x.png" })).code).toBe(
      'alt="Euro flag"',
    );
  });

  it("cai pra alt vazio quando nada é inferível", () => {
    expect(fixImageAlt(el({ tag: "img" })).code).toBe('alt=""');
  });
});

describe("fixAriaName", () => {
  it("usa o texto visível do controle", () => {
    const fix = fixAriaName(el({ tag: "button", text: "Submit" }));
    expect(fix.code).toBe('aria-label="Submit"');
    expect(fix.apply).toEqual({
      kind: "attr",
      name: "aria-label",
      value: "Submit",
    });
  });

  it("cai pra um placeholder genérico sem pistas", () => {
    expect(fixAriaName(el({ tag: "a" })).code).toBe('aria-label="Describe this control"');
  });
});

describe("fixes a nível de documento", () => {
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

describe("fixes de atributo ARIA", () => {
  it("lista os atributos obrigatórios ausentes", () => {
    const fix = fixAriaRequiredAttr(["aria-valuenow", "aria-valuemin"]);
    expect(fix?.code).toContain('aria-valuenow="…"');
    expect(fix?.code).toContain('aria-valuemin="…"');
    expect(fix?.apply).toBeUndefined(); // não auto-aplicável
  });

  it("retorna null sem atributos", () => {
    expect(fixAriaRequiredAttr([])).toBeNull();
    expect(fixAriaAllowedAttr([])).toBeNull();
  });

  it("extrai só o nome do atributo proibido", () => {
    expect(fixAriaAllowedAttr(['aria-foo="bar"'])!.code).toBe("Remove: aria-foo");
  });
});

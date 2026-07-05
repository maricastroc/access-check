import { describe, expect, it } from "vitest";
import {
  buildKeyboardReport,
  readingOrderInversions,
  type FocusStop,
  type RawKeyboard,
} from "./keyboard";

const stop = (
  n: number,
  left: number | null,
  top: number | null,
  extra: Partial<FocusStop> = {},
): FocusStop => ({
  n,
  selector: extra.selector ?? `#el-${n}`,
  label: extra.label ?? `el ${n}`,
  tag: extra.tag ?? "a",
  focusVisible: extra.focusVisible ?? true,
  left,
  top,
  width: extra.width ?? 5,
  height: extra.height ?? 2,
});

const rawBase: RawKeyboard = {
  focusPath: [],
  trapSelector: null,
  positiveTabindex: [],
  unreachable: [],
  totalInteractive: 0,
  reachableInteractive: 0,
  truncated: false,
  cycleComplete: true,
};

describe("readingOrderInversions", () => {
  it("ordem top-to-bottom limpa não gera inversões", () => {
    const stops = [stop(1, 10, 10), stop(2, 10, 30), stop(3, 10, 50)];
    expect(readingOrderInversions(stops).count).toBe(0);
  });

  it("acusa salto pra uma linha acima", () => {
    const stops = [stop(1, 10, 50), stop(2, 10, 10)];
    const inv = readingOrderInversions(stops);
    expect(inv.count).toBe(1);
    expect(inv.selectors).toContain("#el-2");
  });

  it("acusa volta pra esquerda na mesma linha", () => {
    const stops = [stop(1, 60, 20), stop(2, 10, 20)];
    expect(readingOrderInversions(stops).count).toBe(1);
  });

  it("micro-desalinhamento dentro da banda não conta", () => {
    const stops = [stop(1, 30, 20), stop(2, 28, 19)];
    expect(readingOrderInversions(stops).count).toBe(0);
  });

  it("ignora paradas fora da tela (posição null)", () => {
    const stops = [stop(1, 10, 10), stop(2, null, null), stop(3, 10, 40)];
    expect(readingOrderInversions(stops).count).toBe(0);
  });

  it("não conta o mesmo seletor duas vezes", () => {
    const stops = [stop(1, 60, 40), stop(2, 10, 10, { selector: "#dup" }), stop(3, 60, 40), stop(4, 10, 10, { selector: "#dup" })];
    const inv = readingOrderInversions(stops);
    expect(inv.selectors).toEqual([...new Set(inv.selectors)]);
  });
});

describe("buildKeyboardReport", () => {
  it("sem sintomas → nenhum finding", () => {
    const r = buildKeyboardReport({ ...rawBase, focusPath: [stop(1, 10, 10), stop(2, 10, 30)] });
    expect(r.findings).toHaveLength(0);
    expect(r.totalStops).toBe(2);
  });

  it("armadilha de teclado vira finding crítico", () => {
    const r = buildKeyboardReport({ ...rawBase, trapSelector: "#modal", focusPath: [stop(1, 10, 10)] });
    const trap = r.findings.find((f) => f.id === "keyboard-trap");
    expect(trap?.severity).toBe("critical");
    expect(trap?.selectors).toContain("#modal");
  });

  it("foco invisível conta só as paradas sem indicador", () => {
    const focusPath = [
      stop(1, 10, 10, { focusVisible: true }),
      stop(2, 10, 30, { focusVisible: false, selector: "#hidden" }),
      stop(3, 10, 50, { focusVisible: false, selector: "#hidden2" }),
    ];
    const r = buildKeyboardReport({ ...rawBase, focusPath });
    const f = r.findings.find((x) => x.id === "focus-not-visible");
    expect(f?.count).toBe(2);
    expect(f?.selectors).toEqual(["#hidden", "#hidden2"]);
  });

  it("controle inalcançável só reporta com ciclo completo e sem truncar", () => {
    const withTruncation = buildKeyboardReport({
      ...rawBase,
      unreachable: ["#ghost"],
      truncated: true,
      cycleComplete: false,
    });
    expect(withTruncation.findings.find((f) => f.id === "unreachable-control")).toBeUndefined();

    const complete = buildKeyboardReport({
      ...rawBase,
      unreachable: ["#ghost"],
      truncated: false,
      cycleComplete: true,
    });
    expect(complete.findings.find((f) => f.id === "unreachable-control")?.severity).toBe("serious");
  });

  it("tabindex positivo vira finding moderado", () => {
    const r = buildKeyboardReport({ ...rawBase, positiveTabindex: ["#a", "#b"] });
    const f = r.findings.find((x) => x.id === "positive-tabindex");
    expect(f?.count).toBe(2);
    expect(f?.severity).toBe("moderate");
  });

  it("ordena findings por severidade (crítico primeiro)", () => {
    const r = buildKeyboardReport({
      ...rawBase,
      trapSelector: "#trap",
      positiveTabindex: ["#a"],
      focusPath: [stop(1, 10, 50, { focusVisible: false }), stop(2, 10, 10, { focusVisible: false })],
    });
    expect(r.findings[0].severity).toBe("critical");
    const rank = { critical: 0, serious: 1, moderate: 2, minor: 3 } as const;
    for (let i = 1; i < r.findings.length; i++) {
      expect(rank[r.findings[i].severity]).toBeGreaterThanOrEqual(rank[r.findings[i - 1].severity]);
    }
  });

  it("propaga contagens de alcance", () => {
    const r = buildKeyboardReport({
      ...rawBase,
      totalInteractive: 12,
      reachableInteractive: 10,
    });
    expect(r.totalInteractive).toBe(12);
    expect(r.reachableInteractive).toBe(10);
  });
});

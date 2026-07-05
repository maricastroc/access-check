// Análise de navegação por teclado e foco — a parte que o axe-core não cobre.
// O axe inspeciona o DOM estático; aqui a gente *dirige* o browser: tabula a
// página de verdade (page.keyboard.press("Tab"), que garante o estado
// :focus-visible) e observa o que acontece com o foco a cada parada.
//
// Cobre: foco invisível (WCAG 2.4.7), ordem de foco quebrada (2.4.3),
// armadilha de teclado (2.1.2), tabindex positivo (2.4.3) e controle
// interativo inalcançável por teclado (2.1.1).
//
// A lógica de decisão (contar inversões, montar findings, severidade) é pura e
// testada — no mesmo espírito de derive/diff/group. Só a coleta toca o browser.

import type { Page } from "playwright-core";
import type { Severity } from "./types";
import { severityOrder } from "./derive";

export type KeyboardIssueId =
  | "focus-not-visible"
  | "focus-order"
  | "keyboard-trap"
  | "positive-tabindex"
  | "unreachable-control";

/** Uma parada da travessia por Tab: onde o foco pousou e como ele aparece. */
export type FocusStop = {
  /** ordem de tabulação, 1-based */
  n: number;
  selector: string;
  /** nome acessível aproximado (ou a tag, quando não há) */
  label: string;
  tag: string;
  /** o foco produziu algum indicador visível (outline/box-shadow/borda/fundo)? */
  focusVisible: boolean;
  // Posição em % relativa ao screenshot (0–100). null = fora da área capturada
  // (abaixo da dobra ou sem caixa), então não é desenhado no overlay.
  left: number | null;
  top: number | null;
  width: number | null;
  height: number | null;
};

export type KeyboardFinding = {
  id: KeyboardIssueId;
  severity: Severity;
  criterion: string;
  title: string;
  desc: string;
  fix: string;
  /** quantos elementos/paradas o finding cobre */
  count: number;
  /** amostra de seletores afetados (limitada pra não estourar o payload) */
  selectors: string[];
};

export type KeyboardReport = {
  /** número de paradas de foco percorridas */
  totalStops: number;
  /** controles interativos detectados na página */
  totalInteractive: number;
  /** quantos desses o Tab realmente alcançou */
  reachableInteractive: number;
  /** a travessia bateu no teto de Tabs (contagem de alcance é parcial) */
  truncated: boolean;
  /** o foco voltou ao início / esgotou naturalmente (ciclo completo) */
  cycleComplete: boolean;
  focusPath: FocusStop[];
  findings: KeyboardFinding[];
};

// Dados crus coletados do browser, antes de virarem findings. Separar isto do
// KeyboardReport é o que deixa a montagem de findings pura e testável.
export type RawKeyboard = {
  focusPath: FocusStop[];
  /** seletor onde o foco ficou preso, se houve armadilha */
  trapSelector: string | null;
  positiveTabindex: string[];
  unreachable: string[];
  totalInteractive: number;
  reachableInteractive: number;
  truncated: boolean;
  cycleComplete: boolean;
};

const CRITERION: Record<KeyboardIssueId, string> = {
  "focus-not-visible": "WCAG 2.4.7 · Focus Visible",
  "focus-order": "WCAG 2.4.3 · Focus Order",
  "keyboard-trap": "WCAG 2.1.2 · No Keyboard Trap",
  "positive-tabindex": "WCAG 2.4.3 · Focus Order",
  "unreachable-control": "WCAG 2.1.1 · Keyboard",
};

const MAX_FINDING_SELECTORS = 8;

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/**
 * Conta inversões entre a ordem de tabulação e a ordem de leitura visual
 * (cima→baixo, esquerda→direita). Uma parada que salta pra uma linha *acima* da
 * anterior, ou que na mesma linha volta pra *esquerda*, é uma inversão — o
 * clássico sintoma de tabindex bagunçado ou ordem de DOM divergente do layout.
 *
 * Só considera paradas posicionadas (visíveis na área capturada) e usa uma
 * banda de tolerância pra não acusar micro-desalinhamentos.
 */
export function readingOrderInversions(stops: FocusStop[]): {
  count: number;
  selectors: string[];
} {
  const BAND = 3; // % do viewport — ~24px vertical / ~36px horizontal
  const positioned = stops.filter(
    (s): s is FocusStop & { top: number; left: number } => s.top !== null && s.left !== null,
  );
  const selectors: string[] = [];
  for (let i = 1; i < positioned.length; i++) {
    const prev = positioned[i - 1];
    const cur = positioned[i];
    const dy = cur.top - prev.top;
    if (dy < -BAND) {
      selectors.push(cur.selector); // pulou pra uma linha acima
    } else if (Math.abs(dy) <= BAND && cur.left < prev.left - BAND) {
      selectors.push(cur.selector); // mesma linha, andou pra trás
    }
  }
  const unique = [...new Set(selectors)];
  return { count: unique.length, selectors: unique };
}

/**
 * Monta o relatório de teclado a partir dos dados crus. Puro e determinístico:
 * é aqui que cada sintoma vira um finding com severidade e critério WCAG.
 */
export function buildKeyboardReport(raw: RawKeyboard): KeyboardReport {
  const findings: KeyboardFinding[] = [];

  // Armadilha de teclado — o pior caso: quem navega por teclado fica preso.
  if (raw.trapSelector) {
    findings.push({
      id: "keyboard-trap",
      severity: "critical",
      criterion: CRITERION["keyboard-trap"],
      title: "Keyboard focus is trapped",
      desc:
        "Pressing Tab kept focus on the same element instead of advancing. " +
        "Keyboard and screen-reader users can get stuck here with no way out.",
      fix:
        "Ensure the element doesn't intercept Tab, or (if it's a modal) provide " +
        "a documented way to leave — Esc to close and returning focus to the trigger.",
      count: 1,
      selectors: [raw.trapSelector],
    });
  }

  // Controles alcançáveis só pelo mouse. Só reportamos quando a travessia
  // completou o ciclo sem truncar — senão a lista de "não visitados" é parcial
  // e geraria falso positivo.
  if (raw.cycleComplete && !raw.truncated && raw.unreachable.length > 0) {
    const n = raw.unreachable.length;
    findings.push({
      id: "unreachable-control",
      severity: "serious",
      criterion: CRITERION["unreachable-control"],
      title: `${n} interactive ${plural(n, "control is", "controls are")} not keyboard-reachable`,
      desc:
        `${n} ${plural(n, "element behaves", "elements behave")} as interactive ` +
        "(click handlers or ARIA roles) but Tab never reaches " +
        `${plural(n, "it", "them")} — so ${plural(n, "it's", "they're")} usable by mouse only.`,
      fix:
        'Give each control a native focusable element (<button>, <a href>) or ' +
        'add tabindex="0" and keyboard handlers so it can be reached and operated.',
      count: n,
      selectors: raw.unreachable.slice(0, MAX_FINDING_SELECTORS),
    });
  }

  // Foco sem indicador visível.
  const invisible = raw.focusPath.filter((s) => !s.focusVisible);
  if (invisible.length > 0) {
    const n = invisible.length;
    findings.push({
      id: "focus-not-visible",
      severity: "serious",
      criterion: CRITERION["focus-not-visible"],
      title: `No visible focus indicator on ${n} ${plural(n, "element", "elements")}`,
      desc:
        `Focusing ${plural(n, "this element", "these elements")} by keyboard produced ` +
        "no detectable outline, box-shadow, border or background change. Sighted " +
        "keyboard users can't tell where they are on the page.",
      fix:
        "Add a clear :focus-visible style — e.g. outline: 2px solid; outline-offset: 2px; " +
        "— instead of removing the outline with outline: none.",
      count: n,
      selectors: invisible.slice(0, MAX_FINDING_SELECTORS).map((s) => s.selector),
    });
  }

  // Ordem de foco visualmente fora de sequência.
  const inv = readingOrderInversions(raw.focusPath);
  if (inv.count > 0) {
    findings.push({
      id: "focus-order",
      severity: "moderate",
      criterion: CRITERION["focus-order"],
      title: `Focus order jumps out of sequence ${inv.count} ${plural(inv.count, "time", "times")}`,
      desc:
        "The Tab order doesn't follow the visual reading order (top-to-bottom, " +
        "left-to-right). Focus jumps backwards or upward, which is disorienting " +
        "for keyboard and screen-reader users.",
      fix:
        "Match the DOM order to the visual order and avoid reordering with CSS " +
        "(order, flex-direction: row-reverse, absolute positioning) or positive tabindex.",
      count: inv.count,
      selectors: inv.selectors.slice(0, MAX_FINDING_SELECTORS),
    });
  }

  // tabindex positivo — anti-padrão que força uma ordem manual frágil.
  if (raw.positiveTabindex.length > 0) {
    const n = raw.positiveTabindex.length;
    findings.push({
      id: "positive-tabindex",
      severity: "moderate",
      criterion: CRITERION["positive-tabindex"],
      title: `${n} ${plural(n, "element uses", "elements use")} a positive tabindex`,
      desc:
        "A positive tabindex overrides the natural tab order and is almost always " +
        "a source of confusing, hard-to-maintain focus behaviour.",
      fix:
        'Replace positive tabindex values with tabindex="0" (or none) and let the ' +
        "DOM order define the sequence.",
      count: n,
      selectors: raw.positiveTabindex.slice(0, MAX_FINDING_SELECTORS),
    });
  }

  findings.sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );

  return {
    totalStops: raw.focusPath.length,
    totalInteractive: raw.totalInteractive,
    reachableInteractive: raw.reachableInteractive,
    truncated: raw.truncated,
    cycleComplete: raw.cycleComplete,
    focusPath: raw.focusPath,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Coleta no browser (impura — dirige o Playwright). Mantida enxuta: só junta os
// dados crus e delega toda a decisão pra buildKeyboardReport acima.
// ---------------------------------------------------------------------------

const MAX_TAB_STOPS = 50;

type Viewport = { width: number; height: number };

// Estilos que revelam um indicador de foco. Lidos com foco e sem foco pra
// comparar — a diferença é o que prova que existe um indicador.
type FocusStyle = {
  outlineStyle: string;
  outlineWidth: string;
  outlineColor: string;
  boxShadow: string;
  borderTopWidth: string;
  borderTopColor: string;
  backgroundColor: string;
};

/** Há indicador de foco se algo mudou visualmente entre foco e não-foco. */
function hasFocusIndicator(focused: FocusStyle, base: FocusStyle): boolean {
  // Outline presente enquanto focado já basta (é o indicador padrão do browser
  // e o mais comum nos customizados).
  if (focused.outlineStyle !== "none" && parseFloat(focused.outlineWidth) > 0) return true;
  if (focused.boxShadow !== base.boxShadow && focused.boxShadow !== "none") return true;
  if (focused.borderTopWidth !== base.borderTopWidth) return true;
  if (focused.borderTopColor !== base.borderTopColor) return true;
  if (focused.backgroundColor !== base.backgroundColor) return true;
  if (focused.outlineColor !== base.outlineColor) return true;
  return false;
}

// Raw de cada parada, direto do page.evaluate (posição ainda em px).
type RawStop = {
  selector: string;
  tag: string;
  label: string;
  isBody: boolean;
  isIframe: boolean;
  style: FocusStyle;
  rect: { x: number; y: number; w: number; h: number } | null;
};

/**
 * Dirige a travessia por Tab na página e devolve os dados crus. Não decide
 * nada — só observa. Envolva em try/catch no chamador: uma falha aqui nunca
 * deve derrubar o scan inteiro.
 */
export async function collectKeyboard(page: Page, viewport: Viewport): Promise<KeyboardReport> {
  // Instala helpers uma vez no contexto da página e zera o registro de visitados
  // (guardado por referência, pra medir alcance sem tocar no DOM).
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__acVisited = [];
    // Gera um seletor CSS estável e curto pro elemento.
    w.__acCssPath = (el: Element | null): string => {
      if (!el || el.nodeType !== 1) return "";
      const parts: string[] = [];
      let node: Element | null = el;
      while (node && node.nodeType === 1 && parts.length < 5) {
        if (node.id) {
          parts.unshift(`#${CSS.escape(node.id)}`);
          break;
        }
        let sel = node.tagName.toLowerCase();
        const parent: Element | null = node.parentElement;
        if (parent) {
          const sameTag = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
          if (sameTag.length > 1) sel += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
        parts.unshift(sel);
        node = parent;
      }
      return parts.join(" > ");
    };
    // Nome acessível aproximado (não é o algoritmo completo do ARIA, mas cobre
    // os casos comuns o suficiente pra rotular a parada).
    w.__acLabel = (el: Element): string => {
      const aria = el.getAttribute("aria-label");
      if (aria && aria.trim()) return aria.trim().slice(0, 60);
      const labelledby = el.getAttribute("aria-labelledby");
      if (labelledby) {
        const ref = document.getElementById(labelledby.split(/\s+/)[0]);
        const t = ref?.textContent?.replace(/\s+/g, " ").trim();
        if (t) return t.slice(0, 60);
      }
      const text = el.textContent?.replace(/\s+/g, " ").trim();
      if (text) return text.slice(0, 60);
      const alt = el.getAttribute("alt");
      if (alt && alt.trim()) return alt.trim().slice(0, 60);
      const title = el.getAttribute("title");
      if (title && title.trim()) return title.trim().slice(0, 60);
      return el.tagName.toLowerCase();
    };
    // Começa do topo do documento pra primeira Tab cair no primeiro focável.
    (document.activeElement as HTMLElement | null)?.blur?.();
  });

  const rawStops: RawStop[] = [];
  let trapSelector: string | null = null;
  let cycleComplete = false;
  let truncated = false;
  let prevSelector: string | null = null;

  for (let i = 0; i < MAX_TAB_STOPS; i++) {
    await page.keyboard.press("Tab");
    const info = (await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const w = window as unknown as {
        __acCssPath: (e: Element | null) => string;
        __acLabel: (e: Element) => string;
        __acVisited: Element[];
      };
      if (!el || el === document.body || el === document.documentElement) {
        return { isBody: true } as const;
      }
      w.__acVisited.push(el);
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        isBody: false,
        selector: w.__acCssPath(el),
        tag: el.tagName.toLowerCase(),
        label: w.__acLabel(el),
        isIframe: el.tagName === "IFRAME",
        style: {
          outlineStyle: cs.outlineStyle,
          outlineWidth: cs.outlineWidth,
          outlineColor: cs.outlineColor,
          boxShadow: cs.boxShadow,
          borderTopWidth: cs.borderTopWidth,
          borderTopColor: cs.borderTopColor,
          backgroundColor: cs.backgroundColor,
        },
        rect:
          r.width > 0 || r.height > 0
            ? { x: r.left, y: r.top, w: r.width, h: r.height }
            : null,
      };
    })) as { isBody: true } | (RawStop & { isBody: false });

    // Foco voltou pro body/documento → esgotou os focáveis (headless não tem
    // barra de endereço pra receber o foco), então o ciclo se fechou.
    if (info.isBody) {
      cycleComplete = true;
      break;
    }

    // Mesmo elemento duas vezes seguidas: preso. Iframes repetem de propósito
    // (o foco entra no documento aninhado, que não enxergamos), então não
    // contam como armadilha — apenas paramos.
    if (prevSelector !== null && info.selector === prevSelector) {
      if (!info.isIframe) trapSelector = info.selector;
      break;
    }

    // Voltou pro primeiro elemento → ciclo completo.
    if (rawStops.length > 0 && info.selector === rawStops[0].selector) {
      cycleComplete = true;
      break;
    }

    rawStops.push(info);
    prevSelector = info.selector;

    if (i === MAX_TAB_STOPS - 1) truncated = true;
  }

  // Passe de baseline: com o foco removido, lê o estilo "em repouso" de cada
  // elemento visitado, pra comparar com o estilo que capturamos sob foco.
  const uniqueSelectors = [...new Set(rawStops.map((s) => s.selector))];
  const baseStyles =
    uniqueSelectors.length === 0
      ? {}
      : ((await page.evaluate((selectors) => {
          (document.activeElement as HTMLElement | null)?.blur?.();
          const out: Record<string, FocusStyle> = {};
          for (const sel of selectors) {
            try {
              const el = document.querySelector(sel);
              if (!el) continue;
              const cs = getComputedStyle(el);
              out[sel] = {
                outlineStyle: cs.outlineStyle,
                outlineWidth: cs.outlineWidth,
                outlineColor: cs.outlineColor,
                boxShadow: cs.boxShadow,
                borderTopWidth: cs.borderTopWidth,
                borderTopColor: cs.borderTopColor,
                backgroundColor: cs.backgroundColor,
              };
            } catch {
              // seletor inválido — ignora
            }
          }
          return out;
        }, uniqueSelectors)) as Record<string, FocusStyle>);

  // Alcance: compara o conjunto de interativos com os que foram de fato
  // visitados (por referência), e coleta tabindex positivos. Limpa os helpers.
  const reach = (await page.evaluate(() => {
    const w = window as unknown as {
      __acCssPath: (e: Element | null) => string;
      __acVisited: Element[];
    };
    const visited = new Set(w.__acVisited);
    const INTERACTIVE =
      'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex], ' +
      '[role="button"], [role="link"], [role="checkbox"], [role="radio"], ' +
      '[role="tab"], [role="menuitem"], [role="switch"], [contenteditable="true"], [onclick]';

    const isVisible = (el: Element): boolean => {
      const he = el as HTMLElement;
      if (he.offsetParent === null && getComputedStyle(he).position !== "fixed") {
        return el.getClientRects().length > 0;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const candidates = Array.from(document.querySelectorAll(INTERACTIVE)).filter((el) => {
      const tabindex = el.getAttribute("tabindex");
      if (tabindex !== null && parseInt(tabindex, 10) < 0) return false; // fora do tab
      if ((el as HTMLButtonElement).disabled) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      return isVisible(el);
    });

    const unreachable = candidates.filter((el) => !visited.has(el)).map((el) => w.__acCssPath(el));

    const positiveTabindex = Array.from(document.querySelectorAll("[tabindex]"))
      .filter((el) => parseInt(el.getAttribute("tabindex") || "0", 10) > 0)
      .map((el) => w.__acCssPath(el));

    // Limpa os globais que instalamos.
    const g = window as unknown as Record<string, unknown>;
    delete g.__acVisited;
    delete g.__acCssPath;
    delete g.__acLabel;

    return {
      totalInteractive: candidates.length,
      reachableInteractive: candidates.length - unreachable.length,
      unreachable,
      positiveTabindex: [...new Set(positiveTabindex)],
    };
  })) as {
    totalInteractive: number;
    reachableInteractive: number;
    unreachable: string[];
    positiveTabindex: string[];
  };

  // Converte px → % relativo ao screenshot (mesma base dos markers) e monta as
  // paradas finais, já com o veredito de foco visível.
  const focusPath: FocusStop[] = rawStops.map((s, i) => {
    const base = baseStyles[s.selector];
    const focusVisible = base ? hasFocusIndicator(s.style, base) : true;
    const r = s.rect;
    const onScreen =
      r !== null && r.y >= 0 && r.y <= viewport.height && r.x >= 0 && r.x <= viewport.width;
    return {
      n: i + 1,
      selector: s.selector,
      label: s.label,
      tag: s.tag,
      focusVisible,
      left: onScreen ? (r!.x / viewport.width) * 100 : null,
      top: onScreen ? (r!.y / viewport.height) * 100 : null,
      width: onScreen ? (r!.w / viewport.width) * 100 : null,
      height: onScreen ? (r!.h / viewport.height) * 100 : null,
    };
  });

  return buildKeyboardReport({
    focusPath,
    trapSelector,
    positiveTabindex: reach.positiveTabindex,
    unreachable: reach.unreachable,
    totalInteractive: reach.totalInteractive,
    reachableInteractive: reach.reachableInteractive,
    truncated,
    cycleComplete,
  });
}

// Geração de remediação determinística (sem IA). Cobre contraste, alt, rótulos,
// nomes acessíveis, lang, title, viewport e atributos ARIA. Cada gerador
// devolve `text` (prosa), `code` (trecho copiável) e, quando o conserto é
// auto-aplicável, `apply` — a mutação DOM que o passo de validação re-testa.

/** Dados de contraste que o axe-core já calcula por nó. */
export type ContrastData = {
  fgColor: string;
  bgColor: string;
  contrastRatio: number;
  expectedContrastRatio: number;
};

/**
 * Mutação DOM equivalente ao fix, para o passo de validação aplicar no próprio
 * navegador e re-rodar o axe. É deliberadamente estruturada (não a string de
 * UI) pra validação ser determinística em vez de re-parsear `code`.
 *
 * `attr`/`style` agem sobre o elemento da violação; `doc`/`viewport` agem a
 * nível de documento. Geradores cujo conserto não dá pra aplicar com segurança
 * (ex.: remover atributos ARIA) omitem `apply` e simplesmente não são validados.
 */
export type FixApply =
  | { kind: "attr"; name: string; value: string }
  | { kind: "style"; prop: string; value: string }
  | { kind: "doc"; target: "lang" | "title"; value: string }
  | { kind: "viewport"; value: string };

/**
 * Resultado de um gerador: `text` é a explicação em prosa; `code` é o trecho
 * copiável (CSS/HTML) exibido como chip, quando existe; `apply` é a mutação
 * estruturada usada pela validação (quando o fix é auto-aplicável).
 */
export type FixResult = { text: string; code?: string; apply?: FixApply };

/** Atributos do elemento que os geradores de elemento usam pro snippet. */
export type ElementInfo = {
  tag: string;
  type?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  ariaLabel?: string;
  src?: string;
  role?: string;
  /** textContent visível, aparado e truncado — usado pra adivinhar nomes */
  text?: string;
  /** atributo title do próprio elemento */
  title?: string;
  /** texto de contexto (figcaption, link/figura que envolve a imagem) */
  nearbyText?: string;
};

/** "/assets/euro-flag@2x.png" → "Euro flag". Vazio se não der pra inferir. */
function altFromSrc(src: string): string {
  try {
    const file = src.split(/[?#]/)[0].split("/").pop() ?? "";
    const base = file.replace(/\.[a-z0-9]+$/i, ""); // tira extensão
    return humanize(base.replace(/@\d+x$/i, "")); // tira @2x/@3x
  } catch {
    return "";
  }
}

type Rgb = { r: number; g: number; b: number };

/** "amount_to_send" / "amountToSend" → "Amount to send". */
function humanize(raw: string): string {
  const words = raw
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase
    .replace(/[_-]+/g, " ") // snake / kebab
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Gera um fix concreto pra input sem rótulo acessível (WCAG 4.1.2 / regra
 * `label`). Usa id/name/placeholder pra adivinhar um texto e escolhe entre
 * `<label for>` (quando há id) e `aria-label`.
 */
export function fixLabel(el: ElementInfo): FixResult | null {
  if (el.ariaLabel && el.ariaLabel.trim()) return null; // já tem nome acessível

  const guess =
    (el.placeholder && el.placeholder.trim()) ||
    (el.name && humanize(el.name)) ||
    (el.id && humanize(el.id)) ||
    "Describe this field";

  // A validação aplica sempre um aria-label (nome acessível equivalente),
  // mesmo quando recomendamos um <label for> na UI: inserir um <label> no DOM
  // é mais frágil e o resultado pro leitor de tela é o mesmo.
  const apply = { kind: "attr", name: "aria-label", value: guess } as const;

  if (el.id) {
    return {
      text:
        `This ${el.tag} has no accessible name. Add a <label> linked by its ` +
        `id ("${el.id}") so screen readers announce it.`,
      code: `<label for="${el.id}">${guess}</label>`,
      apply,
    };
  }

  return {
    text:
      `This ${el.tag} has no id to bind a <label> to. Add an aria-label ` +
      `(or give it an id and a <label for>) so it has an accessible name.`,
    code: `aria-label="${guess}"`,
    apply,
  };
}

/** WCAG 3.1.1 — <html> sem lang. Fix mecânico, não depende do DOM. */
export function fixHtmlLang(): FixResult {
  return {
    text:
      "The <html> element has no lang attribute, so assistive tech can't " +
      "tell which language to read. Set it to the page's primary language.",
    code: `<html lang="en">`,
    apply: { kind: "doc", target: "lang", value: "en" },
  };
}

/** WCAG 2.4.2 — documento sem <title>. */
export function fixDocumentTitle(): FixResult {
  return {
    text:
      "The page has no <title>, the first thing screen readers announce and " +
      "the label browsers show in tabs and history. Add a descriptive one.",
    code: `<title>Descriptive page title</title>`,
    apply: { kind: "doc", target: "title", value: "Descriptive page title" },
  };
}

/** WCAG 1.4.4 — viewport que bloqueia zoom (user-scalable=no / maximum-scale). */
export function fixMetaViewport(): FixResult {
  return {
    text:
      "The viewport meta tag blocks pinch-zoom, which low-vision users rely " +
      "on. Remove user-scalable=no and any maximum-scale below 5.",
    code: `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    apply: {
      kind: "viewport",
      value: "width=device-width, initial-scale=1",
    },
  };
}

/**
 * WCAG 4.1.2 — controle interativo (button, link, etc.) sem nome acessível.
 * Sugere texto visível quando faz sentido, ou um aria-label adivinhado.
 */
export function fixAriaName(el: ElementInfo): FixResult {
  const guess =
    (el.text && el.text.trim().slice(0, 60)) ||
    (el.ariaLabel && el.ariaLabel.trim()) ||
    (el.name && humanize(el.name)) ||
    (el.id && humanize(el.id)) ||
    "Describe this control";

  const noun = el.tag === "a" ? "link" : el.tag === "button" ? "button" : el.tag;
  return {
    text:
      `This ${noun} has no accessible name, so screen readers announce it as ` +
      `just "${noun}". Add visible text inside it, or an aria-label.`,
    code: `aria-label="${guess}"`,
    apply: { kind: "attr", name: "aria-label", value: guess },
  };
}

/** WCAG 4.1.2 — role exige atributos ARIA que estão ausentes (axe lista quais). */
export function fixAriaRequiredAttr(missing: string[]): FixResult | null {
  const attrs = missing.filter(Boolean);
  if (attrs.length === 0) return null;
  return {
    text:
      `This element's role requires ARIA attributes that are missing: ` +
      `${attrs.join(", ")}. Add each one with a valid value.`,
    code: attrs.map((a) => `${a}="…"`).join(" "),
  };
}

/** WCAG 4.1.2 — atributos ARIA não permitidos pra esse role/elemento. */
export function fixAriaAllowedAttr(invalid: string[]): FixResult | null {
  // axe entrega itens como 'aria-foo="bar"'; queremos só o nome do atributo.
  const names = invalid.map((s) => s.split("=")[0].trim()).filter(Boolean);
  if (names.length === 0) return null;
  return {
    text:
      `These ARIA attributes aren't allowed on this element and should be ` +
      `removed (or change the element's role to one that permits them): ` +
      `${names.join(", ")}.`,
    code: `Remove: ${names.join(", ")}`,
  };
}

/**
 * WCAG 1.1.1 — imagem sem alt. Heurística em cascata: title do elemento →
 * texto de contexto (figcaption/link) → nome do arquivo. Cai pro alt="" quando
 * nada é inferível.
 */
export function fixImageAlt(el: ElementInfo): FixResult {
  const clean = (s?: string) => (s ? s.replace(/\s+/g, " ").trim() : "");

  // title costuma ser a descrição mais direta; depois o texto ao redor; por
  // fim o nome do arquivo. Limita o tamanho pra um alt enxuto.
  const guess = (
    clean(el.title) ||
    clean(el.nearbyText).slice(0, 80) ||
    (el.src ? altFromSrc(el.src) : "")
  ).trim();

  if (guess) {
    return {
      text:
        `This image has no alt text. Suggested description below — confirm it ` +
        `matches the image, or use an empty alt ("") if it's purely decorative.`,
      code: `alt="${guess}"`,
      apply: { kind: "attr", name: "alt", value: guess },
    };
  }
  return {
    text:
      "This image has no alt text. Add a short description if it's meaningful, " +
      `or an empty alt ("") if it's decorative so screen readers skip it.`,
    code: `alt=""`,
    apply: { kind: "attr", name: "alt", value: "" },
  };
}

/** Aceita "#rrggbb", "#rgb" ou "rgb(a)(…)". Devolve null se não reconhecer. */
function parseColor(input: string): Rgb | null {
  const s = input.trim().toLowerCase();

  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  const rgb = s.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(",").map((p) => parseFloat(p));
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n)))
      return { r: parts[0], g: parts[1], b: parts[2] };
  }
  return null;
}

function toHex({ r, g, b }: Rgb): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Luminância relativa WCAG (0–1). */
function luminance({ r, g, b }: Rgb): number {
  const chan = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

/** Razão de contraste WCAG entre duas cores (1–21). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Acha a cor de texto mais próxima da original que atinge `target` de contraste
 * contra `bg`, andando em direção ao preto ou ao branco (o que estiver mais
 * perto de já passar). Devolve null se nem preto nem branco resolverem.
 */
function nearestPassingFg(fg: Rgb, bg: Rgb, target: number): Rgb | null {
  // Decide o sentido: escurecer ou clarear, conforme o fundo.
  const towardBlack = luminance(bg) > 0.5;
  const goal: Rgb = towardBlack ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };

  if (contrastRatio(goal, bg) < target) return null; // impossível nesse fundo

  // Busca binária no fator de mistura fg→goal (0 = original, 1 = goal).
  // Mistura em canais inteiros (0–255): é o que a cor vira depois de virar
  // hex, então a busca enxerga o mesmo valor que o usuário vai colar — sem
  // isso o resultado arredondado pode cair logo abaixo do alvo.
  let lo = 0;
  let hi = 1;
  const mix = (t: number): Rgb => ({
    r: Math.round(fg.r + (goal.r - fg.r) * t),
    g: Math.round(fg.g + (goal.g - fg.g) * t),
    b: Math.round(fg.b + (goal.b - fg.b) * t),
  });

  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(mix(mid), bg) >= target) hi = mid;
    else lo = mid;
  }
  // O arredondamento pode fazer mix(hi) recuar; caminha em direção ao goal até
  // a cor inteira passar de fato (goal já foi garantido lá em cima).
  for (let t = hi; t <= 1; t += 1 / 255) {
    const c = mix(t);
    if (contrastRatio(c, bg) >= target) return c;
  }
  return goal;
}

/**
 * Gera um fix concreto pra uma violação de contraste. Retorna um texto pronto
 * pra exibir no card "Suggested fix", ou null se não der pra calcular.
 */
export function fixContrast(data: ContrastData): FixResult | null {
  const fg = parseColor(data.fgColor);
  const bg = parseColor(data.bgColor);
  if (!fg || !bg) return null;

  const target = data.expectedContrastRatio || 4.5;
  const suggestion = nearestPassingFg(fg, bg, target);
  if (!suggestion) {
    return {
      text:
        `Text color ${toHex(fg)} on ${toHex(bg)} reaches only ` +
        `${data.contrastRatio.toFixed(2)}:1 (needs ${target.toFixed(1)}:1). ` +
        `No text-color change clears it on this background — darken or ` +
        `lighten the background instead.`,
    };
  }

  const newHex = toHex(suggestion);
  const ratio = contrastRatio(suggestion, bg);
  return {
    text:
      `Replace text color ${toHex(fg)} with ${newHex} → ${ratio.toFixed(2)}:1 ` +
      `against ${toHex(bg)} (was ${data.contrastRatio.toFixed(2)}:1, needs ` +
      `${target.toFixed(1)}:1).`,
    code: `color: ${newHex};`,
    apply: { kind: "style", prop: "color", value: newHex },
  };
}

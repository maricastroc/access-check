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

// --- OKLCH: espaço perceptual pra ajustar SÓ a luminosidade sem torcer o matiz.
// Andar em direção ao preto/branco em RGB dessatura a cor (um azul de marca
// vira cinza-azulado). Em OKLCH a gente mexe só no L (lightness) e mantém C
// (croma) e H (matiz), então a sugestão continua "a mesma cor", só mais
// clara/escura. Constantes do OKLab (Björn Ottosson). O contraste em si segue
// sendo medido pela luminância WCAG (contrastRatio), que é o padrão do critério.

type Oklch = { L: number; C: number; H: number };

function srgbToLinear(v: number): number {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function linearToChannel(v: number): number {
  const clamped = Math.max(0, Math.min(1, v)); // gamut clamp em sRGB linear
  const x = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(x * 255);
}

function srgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return { L, C: Math.hypot(a, bb), H: Math.atan2(bb, a) };
}

function oklchToSrgb({ L, C, H }: Oklch): Rgb {
  const a = C * Math.cos(H);
  const bb = C * Math.sin(H);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bb;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return {
    r: linearToChannel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToChannel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToChannel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

/**
 * Acha a cor mais próxima da original que atinge `target` de contraste contra
 * `other`, mexendo SÓ na luminosidade (L do OKLCH) e mantendo matiz e croma.
 * `dir` = 1 clareia, -1 escurece. null se nem no extremo (L=1/0, com o mesmo
 * croma) o contraste é alcançado.
 */
function nearestPassingLightness(color: Rgb, other: Rgb, target: number, dir: 1 | -1): Rgb | null {
  const { L: startL, C, H } = srgbToOklch(color);
  const extremeL = dir === 1 ? 1 : 0;
  const at = (L: number) => oklchToSrgb({ L, C, H });
  if (contrastRatio(at(extremeL), other) < target) return null; // nem no extremo passa

  // Busca binária pelo L mais perto do original que ainda passa — o contraste é
  // monotônico do original em direção ao extremo.
  let near = startL; // falha
  let far = extremeL; // passa
  for (let i = 0; i < 30; i++) {
    const mid = (near + far) / 2;
    if (contrastRatio(at(mid), other) >= target) far = mid;
    else near = mid;
  }
  // Arredondar pra 8-bit pode cair logo abaixo do alvo; anda mais um tico em
  // direção ao extremo até a cor inteira passar de fato (o extremo já é garantido).
  const step = dir === 1 ? 1 / 512 : -1 / 512;
  for (let L = far; dir === 1 ? L <= 1 : L >= 0; L += step) {
    const c = at(L);
    if (contrastRatio(c, other) >= target) return c;
  }
  return at(extremeL);
}

/**
 * Sugestão de cor de TEXTO. Prefere mexer só na luminosidade (matiz preservado);
 * só cai pro preto/branco puro (dessaturando) se o matiz original não alcançar
 * o contraste nem no extremo. `huePreserved` diz qual dos dois aconteceu.
 */
function nearestPassingFg(
  fg: Rgb,
  bg: Rgb,
  target: number,
): { rgb: Rgb; huePreserved: boolean } | null {
  // Escolhe o extremo que mais aumenta o contraste contra o fundo.
  const dir: 1 | -1 = contrastRatio(BLACK, bg) >= contrastRatio(WHITE, bg) ? -1 : 1;
  const hp = nearestPassingLightness(fg, bg, target, dir);
  if (hp) return { rgb: hp, huePreserved: true };
  const extreme = dir === -1 ? BLACK : WHITE;
  if (contrastRatio(extreme, bg) >= target) return { rgb: extreme, huePreserved: false };
  return null;
}

/** Sugestão de FUNDO (a "opção de ajustar o fundo"), mantendo o matiz do fundo. */
function nearestPassingBg(fg: Rgb, bg: Rgb, target: number): Rgb | null {
  const dir: 1 | -1 = contrastRatio(fg, BLACK) >= contrastRatio(fg, WHITE) ? -1 : 1;
  const hp = nearestPassingLightness(bg, fg, target, dir);
  if (hp) return hp;
  const extreme = dir === -1 ? BLACK : WHITE;
  if (contrastRatio(fg, extreme) >= target) return extreme;
  return null;
}

/**
 * Gera um fix concreto pra uma violação de contraste. O conserto primário é
 * mexer no texto (preservando o matiz); quando dá, o fundo é oferecido como
 * alternativa. Se o texto não resolve sozinho, o fix vira uma mudança de fundo
 * (também verificável). Retorna texto pronto pro card, ou null se não parseável.
 */
export function fixContrast(data: ContrastData): FixResult | null {
  const fg = parseColor(data.fgColor);
  const bg = parseColor(data.bgColor);
  if (!fg || !bg) return null;

  const target = data.expectedContrastRatio || 4.5;
  const was = `(was ${data.contrastRatio.toFixed(2)}:1, needs ${target.toFixed(1)}:1)`;

  const fgFix = nearestPassingFg(fg, bg, target);
  const bgFix = nearestPassingBg(fg, bg, target);

  if (fgFix) {
    const newHex = toHex(fgFix.rgb);
    const ratio = contrastRatio(fgFix.rgb, bg);
    const hueNote = fgFix.huePreserved
      ? " Same hue — only the lightness changes."
      : " (hue shifted toward neutral to reach contrast on this background)";
    let text =
      `Replace text color ${toHex(fg)} with ${newHex} → ${ratio.toFixed(2)}:1 ` +
      `against ${toHex(bg)} ${was}.${hueNote}`;
    if (bgFix) text += ` Or keep the text and set the background to ${toHex(bgFix)}.`;
    return {
      text,
      code: `color: ${newHex};`,
      apply: { kind: "style", prop: "color", value: newHex },
    };
  }

  if (bgFix) {
    const bgHex = toHex(bgFix);
    const ratio = contrastRatio(fg, bgFix);
    return {
      text:
        `Text color ${toHex(fg)} can't reach ${target.toFixed(1)}:1 on ${toHex(bg)} ` +
        `by changing the text alone. Set the background to ${bgHex} instead → ` +
        `${ratio.toFixed(2)}:1 ${was}. Same background hue — only its lightness changes.`,
      // "background: #hex" de propósito (não "background-color") pra não colidir
      // com quem procura "color: #hex" no snippet.
      code: `background: ${bgHex};`,
      apply: { kind: "style", prop: "background-color", value: bgHex },
    };
  }

  return {
    text:
      `Text color ${toHex(fg)} on ${toHex(bg)} reaches only ` +
      `${data.contrastRatio.toFixed(2)}:1 (needs ${target.toFixed(1)}:1). ` +
      `Neither the text nor the background clears it by lightness alone on these ` +
      `hues — pick a darker or lighter pairing.`,
  };
}

const ORIGINAL_COLORS = {
  canvas: "#f6eedd",
  surface: "#fffcf4",
  band: "#efe4cd",
  code: "#f2e9d6",
  booth: "#e9d7b4",
  ink: "#151f47",
  "ink-2": "#2f3a5c",
  body: "#3d4766",
  muted: "#525a70",
  disabled: "#8c8f99",
  hairline: "#e6d9bf",
  border: "#cfbf9c",
  rule: "#8e7f63",
  critical: "#da2218",
  "critical-text": "#d12117",
  "critical-hatch": "#f39a8f",
  serious: "#bf4900",
  "serious-text": "#b84600",
  "serious-hatch": "#f6ae6a",
  moderate: "#916800",
  "moderate-text": "#7a5800",
  "moderate-hatch": "#e8c55a",
  verified: "#008046",
  review: "#824ee9",
  "review-text": "#7d4be0",
  path: "#2c64f2",
  steel: "#2d5486",
};

export const THEMES = {
  original: {
    label: "Original",
    idea: "A versão em produção: papel creme em três camadas, tinta marinho e o laranja de grave como acento.",
    fonts: {
      sans: { family: "Atkinson Hyperlegible Next", role: "Títulos e interface" },
      mono: { family: "Atkinson Hyperlegible Mono", role: "Medições, seletores e código" },
    },
    stack: {
      sans: "var(--font-atkinson), ui-sans-serif, system-ui, sans-serif",
      mono: "var(--font-atkinson-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
    },
    colors: ORIGINAL_COLORS,
  },

  nanquim: {
    label: "Nanquim",
    idea: "A identidade original, amadurecida. O marinho e o laranja ficam, o creme sai. A porcelana vira o fundo, e o próprio marinho tinge as faixas e a mesa de luz da captura.",
    google:
      "family=Schibsted+Grotesk:wght@400..800&family=IBM+Plex+Mono:wght@400;500;600",
    fonts: {
      sans: { family: "Schibsted Grotesk", role: "Títulos e interface" },
      mono: { family: "IBM Plex Mono", role: "Medições, seletores e código" },
    },
    stack: {
      sans: '"Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
    },
    weights: { semibold: 570 },
    colors: {
      canvas: "#f6f5f1",
      surface: "#fffefc",
      band: "#e9edf5",
      code: "#eef1f6",
      booth: "#dde2eb",
      ink: "#131c45",
      "ink-2": "#2c3659",
      body: "#384263",
      muted: "#4e566e",
      disabled: "#868b9b",
      hairline: "#e0e3ea",
      border: "#c2c8d5",
      rule: "#78809a",
      critical: "#d3211a",
      "critical-text": "#c81f19",
      "critical-hatch": "#f4a096",
      serious: "#bf4900",
      "serious-text": "#b04300",
      "serious-hatch": "#f6ae6a",
      moderate: "#8f6600",
      "moderate-text": "#735200",
      "moderate-hatch": "#e9c65c",
      verified: "#007843",
      review: "#7b48e0",
      "review-text": "#7043d4",
      path: "#2a5fe6",
      steel: "#2b4c88",
    },
    css: `
h1 { letter-spacing: -0.03em; }
li[data-finding] h3 { letter-spacing: -0.01em; }
.fixed.bottom-0 button { padding-inline: 10px; letter-spacing: -0.01em; }
`,
  },

  laudo: {
    label: "Laudo",
    idea: "Um relatório editorial. Branco de papel, faixas de argila rosada e tinta azul-preta, com um azul-ardósia de contraponto. A voz dos títulos ganha uma serifa, e a interface continua na Atkinson, a fonte desenhada para baixa visão.",
    google:
      "family=Newsreader:opsz,wght@6..72,300..700&family=Atkinson+Hyperlegible+Next:wght@200..800&family=Red+Hat+Mono:wght@300..700",
    fonts: {
      display: { family: "Newsreader", role: "Títulos, veredito e números grandes" },
      sans: { family: "Atkinson Hyperlegible Next", role: "Interface e texto corrido" },
      mono: { family: "Red Hat Mono", role: "Medições, seletores e código" },
    },
    stack: {
      sans: '"Atkinson Hyperlegible Next", ui-sans-serif, system-ui, sans-serif',
      mono: '"Red Hat Mono", ui-monospace, Menlo, monospace',
      display: '"Newsreader", Georgia, serif',
    },
    colors: {
      canvas: "#faf8f6",
      surface: "#ffffff",
      band: "#f2e8e1",
      code: "#f5eeea",
      booth: "#e6ddd6",
      ink: "#1a2133",
      "ink-2": "#333a4c",
      body: "#3e4454",
      muted: "#545866",
      disabled: "#8d9099",
      hairline: "#ebe2db",
      border: "#d1c4ba",
      rule: "#877b71",
      critical: "#cb2a1e",
      "critical-text": "#c2271c",
      "critical-hatch": "#f1a197",
      serious: "#b8480f",
      "serious-text": "#a8410d",
      "serious-hatch": "#f0b07c",
      moderate: "#8a6400",
      "moderate-text": "#705100",
      "moderate-hatch": "#e6c867",
      verified: "#0b7645",
      review: "#7550d8",
      "review-text": "#6c49cc",
      path: "#2f5fd0",
      steel: "#3d5a7a",
    },
    css: `
:is(h1, h2, p, span, div)[class*="text-[3"]:not(.font-mono),
:is(h1, h2, p, span, div)[class*="text-[4"]:not(.font-mono) {
  font-family: var(--font-display);
  font-weight: 500;
  letter-spacing: -0.01em;
}
`,
  },

  petroleo: {
    label: "Petróleo",
    idea: "Um instrumento de medição. Tinta petróleo, cinzas minerais e uma faixa verde-água. O laranja puxa para o vermelhão e o crítico vira carmim, para as severidades se separarem melhor.",
    google:
      "family=Commissioner:wght,FLAR,VOLM@100..900,0..100,0..100&family=Azeret+Mono:wght@300..700",
    fonts: {
      sans: { family: "Commissioner", role: "Títulos e interface" },
      mono: { family: "Azeret Mono", role: "Medições, seletores e código" },
    },
    stack: {
      sans: '"Commissioner", ui-sans-serif, system-ui, sans-serif',
      mono: '"Azeret Mono", ui-monospace, Menlo, monospace',
    },
    colors: {
      canvas: "#f2f5f5",
      surface: "#ffffff",
      band: "#ddeaea",
      code: "#e7efef",
      booth: "#d2dede",
      ink: "#0e2f3a",
      "ink-2": "#23434d",
      body: "#314e58",
      muted: "#465e66",
      disabled: "#83959a",
      hairline: "#d6e1e1",
      border: "#b1c3c3",
      rule: "#6a7e7e",
      critical: "#c41e3a",
      "critical-text": "#b81c37",
      "critical-hatch": "#f09aab",
      serious: "#c84d10",
      "serious-text": "#b2430e",
      "serious-hatch": "#f5ad7e",
      moderate: "#8a6800",
      "moderate-text": "#6f5400",
      "moderate-hatch": "#e7c85e",
      verified: "#0b7645",
      review: "#7a4bd6",
      "review-text": "#6f44c8",
      path: "#1f5fd8",
      steel: "#1d5e6c",
    },
    css: `
:is(h1, h2) { font-variation-settings: "FLAR" 40, "VOLM" 0; }
.fixed.bottom-0 button { padding-inline: 10px; letter-spacing: -0.01em; }
`,
  },

  salvia: {
    label: "Sálvia",
    idea: "Contemporâneo e expressivo. Tinta índigo, faixas de sálvia e uma mesa de luz verde-pedra. O laranja fica mais tangerina, e a grotesca expressiva muda de desenho conforme o tamanho.",
    google:
      "family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=DM+Mono:wght@300;400;500",
    fonts: {
      sans: { family: "Bricolage Grotesque", role: "Títulos e interface, com tamanho óptico automático" },
      mono: { family: "DM Mono", role: "Medições, seletores e código" },
    },
    stack: {
      sans: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
      mono: '"DM Mono", ui-monospace, Menlo, monospace',
    },
    colors: {
      canvas: "#f5f6f2",
      surface: "#fffffd",
      band: "#e5eadd",
      code: "#edf0e7",
      booth: "#d8ded0",
      ink: "#1f1f4b",
      "ink-2": "#383862",
      body: "#42425f",
      muted: "#54556a",
      disabled: "#8e8f9c",
      hairline: "#dfe4d8",
      border: "#c1c9b7",
      rule: "#7b8372",
      critical: "#cf281d",
      "critical-text": "#c4251b",
      "critical-hatch": "#f3a096",
      serious: "#c24f00",
      "serious-text": "#ad4600",
      "serious-hatch": "#f7b16c",
      moderate: "#8b6800",
      "moderate-text": "#6f5300",
      "moderate-hatch": "#e8c75c",
      verified: "#0b7645",
      review: "#7f46d6",
      "review-text": "#7440c8",
      path: "#2d5fe0",
      steel: "#45468c",
    },
    css: `
body { font-variation-settings: "wdth" 94; }
:is(h1, h2) { font-variation-settings: "wdth" 90; }
.fixed.bottom-0 button { padding-inline: 10px; letter-spacing: -0.01em; }
`,
  },
};

THEMES["nanquim-carmim"] = {
  ...THEMES.nanquim,
  label: "Nanquim com carmim",
  idea: "Nanquim com o crítico carmim do Petróleo, para o vermelho e o laranja das marcas se separarem melhor.",
  colors: {
    ...THEMES.nanquim.colors,
    critical: "#c41e3a",
    "critical-text": "#b81c37",
    "critical-hatch": "#f09aab",
  },
};

THEMES["nanquim-bricolage"] = {
  ...THEMES.nanquim,
  label: "Nanquim + Bricolage",
  idea: "A paleta do Nanquim sem mudança. A Bricolage entra só na camada de títulos e números de destaque, a Schibsted fica com o texto e a interface, e a IBM Plex Mono com tudo que é medido.",
  google:
    "family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Schibsted+Grotesk:wght@400..800&family=IBM+Plex+Mono:wght@400;500;600",
  fonts: {
    display: { family: "Bricolage Grotesque", role: "Títulos principais e números de destaque" },
    sans: { family: "Schibsted Grotesk", role: "Texto corrido, botões, navegação, listas e interface" },
    mono: { family: "IBM Plex Mono", role: "URLs, seletores, medições e identificadores" },
  },
  stack: {
    ...THEMES.nanquim.stack,
    display: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
  },
  css: `
li[data-finding] h3 { letter-spacing: -0.01em; }
.fixed.bottom-0 button { padding-inline: 10px; letter-spacing: -0.01em; }
:is(h1, h2).font-bold[class*="tracking-[-0.02em]"],
:is(h1, h2, p, span)[class*="text-[3"]:not(.font-mono),
:is(h1, h2, p, span)[class*="text-[4"]:not(.font-mono),
span[class*="text-[5"]:not(.font-mono) {
  font-family: var(--font-display);
  font-variation-settings: "wdth" 90;
  letter-spacing: -0.015em;
}
span.font-cond.text-serious:is([class*="text-[30px]"], [class*="text-[52px]"]) {
  font-family: var(--font-mono);
  font-variation-settings: normal;
  font-weight: 500;
  letter-spacing: -0.04em;
}
`,
};

export const FINISH = {
  borders: `
#case-file { border-left-color: transparent; }
span.inline-flex.items-center.gap-2.border.border-border.bg-surface:has(> span[aria-hidden].font-cond) {
  border-color: transparent;
  background: transparent;
  padding: 2px 0;
}
.flex.flex-wrap.gap-2:has(> span.inline-flex.border > span[aria-hidden].font-cond) { column-gap: 20px; row-gap: 6px; }
li[data-finding] h3 > button { grid-template-columns: auto minmax(0, 1fr); }
li[data-finding] h3 > button > span:nth-child(3) { grid-column: 2; padding-top: 7px; }
li[data-finding] h3 > button:not([aria-expanded="true"]) { padding-block: 16px; }
#how .relative.flex.flex-col.border { border-color: transparent; }
#checks .border.border-ink { border-color: var(--color-border); }
#evidence + section .mt-8.border.border-ink { border-color: var(--color-border); }
#evidence + section .border-b.border-ink { border-bottom-color: var(--color-hairline); }
#checks .border-b.border-ink { border-bottom-color: var(--color-hairline); }
div.border.border-border.bg-surface.p-6 { border-color: var(--color-hairline); }
div.border.border-border.bg-surface.p-5:has(> ul > li) { border-color: transparent; background: var(--color-code); }
`,
  rhythm: `
span.block.w-10.bg-steel[class*="h-0.75"] { display: none; }
div:has(> span.font-cond.uppercase + h2) > span.font-cond.uppercase,
div.mt-12.border.p-6 span.font-cond.uppercase {
  text-transform: none;
  letter-spacing: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-steel);
}
#how .font-cond[class*="text-[56px]"] { color: var(--color-ink) !important; }
#how .grid > div:nth-child(3) .font-cond[class*="text-[56px]"] { color: var(--color-verified) !important; }
#how p.font-cond .text-serious { color: var(--color-muted); }
#how .absolute.h-px[class*="bg-serious"] { background: var(--color-border); }
#how .font-cond.text-serious[class*="text-[17px]"] { color: var(--color-rule); }
#evidence + section { background: var(--color-band); }
#evidence + section + section { background: var(--color-canvas); }
`,
  details: `
span.inline-flex.font-cond.font-semibold[class*="text-[11px]"][style*="16px"] { width: 28px !important; }
span.inline-flex.font-cond.font-semibold[class*="text-[11px]"][style*="20px"] { width: 32px !important; }
span.inline-flex.font-cond.hatch-serious[class*="text-[11px]"] { background: var(--color-serious); }
[inert] [class~="gap-3.5"] > span.relative.inline-block { margin-left: 26px; }
[inert] span.relative.inline-block > span.absolute.top-0.right-0 {
  top: 50%;
  translate: calc(100% + 10px) -50%;
}
.border-t.border-ink[class~="p-3.5"] .flex.flex-wrap > span[aria-hidden].text-border { display: none; }
.border-t.border-ink[class~="p-3.5"] .flex.flex-wrap:has(> span[aria-hidden].text-border) { column-gap: 16px; }
`,
};

THEMES.acabamento = {
  ...THEMES["nanquim-carmim"],
  label: "Acabamento",
  idea: "A decisão de cor e tipo com as três frentes aplicadas: menos bordas e mais respiro no painel, ritmo menos repetitivo na página inicial e correção dos microdetalhes.",
  css: THEMES["nanquim-carmim"].css + FINISH.borders + FINISH.rhythm + FINISH.details,
};

export const ORDER = ["original", "nanquim", "laudo", "petroleo", "salvia", "nanquim-carmim", "nanquim-bricolage", "acabamento"];

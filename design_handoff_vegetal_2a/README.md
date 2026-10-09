# Handoff: AccessCheck · tela de resultados na direção “Vegetal 2a · Fio”

## Visão geral

Redesenho **visual** da página `/results` do AccessCheck (web app Next.js), na direção escolhida, **2a “Fio”**: a linguagem de desenho técnico da Vegetal (papel vegetal frio, grafite, sanguínea, balões numerados, cotas e conectores), com menos tinta e mais precisão.

Nada muda em arquitetura de informação, fluxo, dados, copy ou funcionalidade. Mudam tipografia, paleta, notação, espessuras, estados e movimento.

## Sobre os arquivos deste pacote

Os arquivos em `reference/` são **protótipos de design em HTML**: mostram aparência e comportamento, mas **não são código de produção para copiar**. A tarefa é **recriar este design no código existente** (`src/app/results/**`, `src/components/investigation/**`, `src/components/ui/**`, `src/app/globals.css`, `src/app/layout.tsx`), usando os padrões do repositório: React 19, Tailwind v4 com tokens em `@theme`, componentes atuais e i18n via `t()`.

- `reference/Vegetal 2a.dc.html`: abre a tela 2a completa, já interativa (1440×1000). Para ver, sirva a pasta `reference/` com qualquer servidor estático (por exemplo `npx serve reference`) e abra o arquivo.
- `reference/AccessCheck Results.dc.html`: fonte do protótipo, com template e lógica. Os valores exatos estão em `CFG.v2a` e nas funções `tagCss`, `locus`, `glyph`, `gauge` e `afterUpdate`. O componente aceita outras direções (`atual`, `tecnico`, `v2b`…); **use apenas `v2a`**.
- `tokens/globals.vegetal.css`: trechos prontos para colar em `src/app/globals.css`.
- `tokens/palette.vegetal.ts`: novo `PALETTE` para `src/lib/palette.ts`.
- `screenshots/2a-fio-contraste-aberto.png`: estado de referência a 2×, com o problema 4 (contraste) aberto.

Os dados do protótipo (Northwind Books, 7 problemas) são um fixture. Na produção, os dados vêm de `ScanResult`, como já acontece hoje.

## Fidelidade

**Alta fidelidade.** Cores, tipografia, tamanhos, espessuras e tempos são finais. Recrie com precisão de pixel nos componentes existentes. Quando este README e o protótipo divergirem, **vale este README**: ele incorpora ajustes posteriores, como `rule` em `#878B84` e cantos retos nos botões.

---

## Decisão 0: confirme com a pessoa antes de começar

Os tokens de `@theme` são globais. Eles também alimentam a home, `/report` (PDF), `/site` e, via `src/lib/palette.ts`, o overlay desenhado nas páginas auditadas. `palette.test.ts` exige que `globals.css` e `palette.ts` tenham exatamente as mesmas cores.

- **A. Tema global (recomendado):** trocar os tokens no `@theme` e em `palette.ts`. O produto inteiro adota a Vegetal; as outras páginas só herdam os tokens, sem redesenho. Depois, verifique visualmente home, `/report` e `/site`.
- **B. Só `/results`:** declarar os mesmos valores numa classe `.ac-vegetal` aplicada à raiz de `results-view.tsx`. Isso exige ajustar `palette.test.ts` para ler apenas o bloco `@theme`, e o overlay continua com a paleta antiga.

Sem resposta, siga **A**.

## Ordem de implementação

1. **Fontes** em `src/app/layout.tsx`:
   ```ts
   import { Archivo, Spline_Sans_Mono } from "next/font/google";
   const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin", "latin-ext"], axes: ["wdth"], display: "swap" });
   const splineMono = Spline_Sans_Mono({ variable: "--font-spline-mono", subsets: ["latin", "latin-ext"], display: "swap" });
   ```
   Substitui Atkinson Hyperlegible Next e Mono. Aplique `${archivo.variable} ${splineMono.variable}` no `<html>`. Archivo é variável em peso (100–900) e largura (62–125); os pesos fracionados (450, 480, 560) e `font-stretch` são intencionais.
2. **Tokens**: cole `tokens/globals.vegetal.css` em `globals.css`, nos blocos indicados, e substitua `PALETTE` por `tokens/palette.vegetal.ts`. Não crie novas cores sólidas. Translúcidos usam o modificador de opacidade do Tailwind (`border-ink/38`, `bg-ink/[0.025]`, `bg-verified/[0.07]`), para não quebrar `palette.test.ts`.
3. **Foco e movimento**: já estão no CSS do passo 2. Remova o foco em cantos de mira (`.ac-instrument … :focus-visible::after`) e mantenha o bloco `forced-colors`.
4. **Componentes**, um a um, conforme a seção “Especificação por região”.
5. **Microinterações**, conforme a seção “Movimento”.
6. **Verificação**: `npm run test` (`palette.test.ts`, `theme-tokens.test.ts`), `npm run check:results`, a auto-auditoria da landing citada no README do repo e checagem visual de home, `/report` e `/site`.

Restrições do repositório:
- `theme-tokens.test.ts` proíbe `rounded-*`, exceto `rounded-full` e `rounded-none`. Os balões usam `rounded-full`; todo o resto continua com cantos retos.
- Toda classe de cor precisa nomear um token existente.

---

## Especificação por região

Unidades em px de CSS a 1440×1000. `ink` = `#202428`, `canvas` = `#F1F2EE` etc., conforme a tabela de tokens.

### Tipografia (resumo)

| Papel | Família | Tamanho / altura | Peso | Largura (`font-stretch`) | Tracking |
| --- | --- | --- | --- | --- | --- |
| Título do estado (“Barreiras críticas”) | Archivo | 32 / 1.04 | 300 | 110% | −0.015em |
| Título do problema aberto | Archivo | 18.5 / 1.3 | 480 | 104% | −0.012em |
| Contagem (“7 para corrigir”) | Archivo | 20 | 450 | 106% | −0.01em |
| “1 para conferir à mão” | Archivo | 16 | 560 | 100% | −0.01em |
| Marca “AccessCheck” | Archivo | 18 | 560 | 106% | −0.01em |
| Título de linha fechada | Archivo | 15 / 1.375 | 560 | 100% | 0 |
| Rótulos (grupos, legenda, estações) | Archivo | 12.5 / 22 | 560 | 100% | 0.005em, **caixa normal** |
| Texto corrido | Archivo | 15 / 1.5 | 400 | 100% | 0 |
| Meta e secundário | Archivo | 13.5 · 13 · 12.5 | 400 | 100% | 0 |
| Botões | Archivo | 13.5 | 500 | 100% | 0 |
| Razão medida (“2.75:1”) | Spline Sans Mono | 30 / 1 | 300 | – | −0.04em |
| Razão corrigida (“4.51:1”) | Spline Sans Mono | 22 / 1 | 300 | – | 0 |
| URL, seletores, código | Spline Sans Mono | 14 · 13 · 13.5 | 500 (URL), 400 | – | 0 |
| Numerais das marcas | Spline Sans Mono | 11.5 (≤18px) · 12.5 · 14 (≥26px) | 500 | – | 0, `tabular-nums` |

A caixa-alta condensada da 1b sai de todos os rótulos. A hierarquia vem só de peso e tamanho.

### Barra superior (`top-bar.tsx`)
- Altura 56, padding horizontal 20, fundo `canvas`, borda inferior de 1px `hairline` (`#DFE1DB`).
- BrandMark de 21×23 em `ink`; “AccessCheck” conforme a tabela.
- URL em Spline Sans Mono 14/500 `ink`; separador “·” em `border`; data em 13 `muted`.
- Botões de altura 36, padding 0 16, gap 8, cantos retos:
  - secundários (Auditar de novo, Exportar Markdown): borda 1px `border` (`#C5C8C1`), fundo transparente, hover `bg-ink/[0.04]` com transição de 140ms;
  - primário (Exportar PDF): borda 1px `ink`, texto `ink`, fundo transparente, hover `bg-ink/[0.05]`. Nenhum botão é preenchido.
- Ícone de “Auditar de novo”: mantenha o FontAwesome atual (ou Lucide `rotate-cw`, 14px, traço 2.25).

### Área da captura (`investigation-surface.tsx`)
- Fundo `booth` (`#EAECE7`), **sem grade**.
- Cabeçalho: altura mínima 48, padding 8 20 0, `justify-between`.
- Legenda “Captura · 1200 × 800” em 12.5/560 `ink-2`, caixa normal.
- **LayerSwitch** (“Marcas: Problemas · Caminho do foco · Nenhuma”):
  - sem caixa nem fundo; cada opção com altura 28, padding 0 10, 13.5/450;
  - cor `ink-2`, a selecionada em `ink`, transição de cor de 180ms;
  - indicador: sublinhado de 1.5px `ink`, em `bottom:-1px`, `left = offsetLeft + 8`, `width = offsetWidth − 16`; desliza com `left/width 240ms var(--ease-vegetal)`;
  - foco no `label` via `:has(input:focus-visible)`, já no CSS.
- Captura: contorno de 1px `ink/20`. Paddings da área rolável sem mudança.
- **Marcas de corte** (novas, decorativas, `aria-hidden`): 8 fios de 1px em `rule` (`#878B84`), dois por canto, com 12px de comprimento e começando 8px fora do canto, sem tocar a imagem.
  - Canto superior esquerdo: horizontal `left:-20px; top:0; 12×1` e vertical `left:0; top:-20px; 1×12`.
  - Espelhe nos outros três cantos (por exemplo `left:calc(100% + 8px)`).

### Marcas sobre a captura (`capture-marks.tsx` + `notation.tsx`)
**Tag vira balão circular** (`rounded-full`), com fonte Spline Sans Mono 500 e `tabular-nums`. Largura mínima igual ao tamanho; padding horizontal de 4. Para colocação, use a largura `text.length × font × 0.62 + 8`.

| Uso | Tamanho |
| --- | --- |
| Ocorrência atual na captura · marcas acesas (visão geral, hover) | 18 |
| Marcas apagadas (outros problemas, irmãs) | 15 |
| Linha fechada · linha aberta | 22 · 28 |
| Índice do resumo: a corrigir · a conferir | 22 · 20 |
| Chips de ocorrência (4·1…4·4) | 22 |
| Etapas do caminho do foco: próximas · atual | 18 · 24 (**quadradas**, sem raio) |

Preenchimento por severidade:
- **Crítico:** cheio em `critical`, numeral branco (5.67:1).
- **Grave e moderado:** fundo `surface`, borda 1px na cor da severidade, numeral em `*-text`.
- **Revisão manual:** borda 1px tracejada `review`, numeral `review-text`.
- **Recomendação:** borda 1px `ink-2`, numeral `ink`.
- **Apagada:** borda 1px `rule`, fundo `surface`, numeral `ink-2`.
- **Sobre a página:** halo `box-shadow: 0 0 0 2px halo`.
- **Selecionada:** `0 0 0 2px canvas, 0 0 0 3px ink`.

**Locus “cota”** (substitui `Locus`, `Corners` e os cantos de mira):
- Caixa no retângulo do elemento com inset de −3px: borda 1px `ink`, sem preenchimento, `box-shadow: 0 0 0 1px halo, inset 0 0 0 1px halo`. Leva `data-anchor="locus-current"`.
- Quatro linhas de extensão: 1px `ink` a **40%** de opacidade, com halo de 1px, coincidindo com as bordas e ultrapassando a caixa em **7px** de cada lado.
- Cota: texto `${w} × ${h}` com as dimensões do elemento em px da página (por exemplo `227 × 25`), em Spline Sans Mono 10.5/13 `tabular-nums` `ink`, sem fundo, `text-shadow: 0 0 2px halo, 0 0 2px halo`. Alinhada à borda direita da caixa e 8px abaixo dela.
- Ocorrências irmãs e locus de hover: caixa de 1px tracejada `ink` com inset de −3, a 60%, sem extensões nem cota.
- Anel do foco invisível (`GhostRing`): mantém o tracejado `serious` com hachura.

**Caminho do foco:**
- Etapas próximas e atual: quadrados cheios `path` (`#2B5F8C`) com numeral branco.
- Etapas distantes: quadrado de 10px com borda 2px `path`, fundo `surface` e halo.
- Segmentos: sem mudança (halo de 4px, 2px `path`, chevrons).

### Resumo (`summary.tsx`, `case-file.tsx`)
- Padding 32 24 16.
- Título conforme a tabela. StandingMark de 20px com borda 2px `critical` e hachura `.ac-hatch` (45°, fio de 1px a cada 4px), gap 10.
- Nota: 15/1.5 `ink-2`, largura máxima 46ch, margem superior 10.
- Linhas de contagem: margem superior 24, gap 8. Tags de 22 (a corrigir) e 20 (a conferir).
- “2 recomendações · 35 verificações aprovadas”: 13.5 `muted`, margem superior 12.
- **WcagChips:**
  - chip com padding 6 10, borda 1px `hairline`, fundo transparente, texto 12.5 `body`;
  - quadrado de nível com 16px; “reprova” fica vazado, com borda 1px `serious` e letra em `serious-text` 600 (A em 11px, AA em 10, AAA em 8.5);
  - “não avaliado”: borda 1px `border`, letra `muted`;
  - a hachura de duas cores sai dos níveis.

### Lista de problemas (`finding-list.tsx`)
- Cabeçalho de grupo: rótulo conforme a tabela e contagem em 400 `muted` com margem esquerda de 6; padding 8 24. Os grupos recolhíveis mantêm `<details>` e chevron.
- **Linha fechada:**
  - grid `auto 1fr auto`, gap de coluna 14, padding 14 24;
  - tag de 22 com `pt-px`; título 15/560;
  - meta em 13.5 `muted`: rótulo de severidade em 560 `ink-2` · lacuna · contagem extra;
  - status em 13 `ink-2` com glifo de 18.
- **Linha aberta:**
  - padding 14 24 12; tag de 28;
  - fio a partir da tag: `border-l` de 1px `ink/38`, de `top:32` até `bottom:-12`, `left:13` (tracejado em revisão manual e heurística);
  - título conforme a tabela; rótulo de severidade 13.5/560 `ink-2` com margem superior 4; impacto 15/1.5 `ink-2` com margem superior 6.
- **Fundo:** a linha aberta **perde o `bg-surface`** e passa a ser marcada por fios de 1px `hairline` em cima e embaixo (`box-shadow: inset 0 1px 0 hairline, inset 0 -1px 0 hairline`).
- **Hover** (linha fechada ou aberta): `bg-ink/[0.025]`, transição de fundo de 160ms. Continua acendendo a marca correspondente na captura (`hoveredId`).

### Cadeia de evidência (`evidence-chain.tsx`, `notation.tsx`)
- **Estações:** padding esquerdo 44, inferior 28 (última: 4). Glifo numa caixa de 22 em `left:4`. Fio de `top:22` até o fim, `left:14`, 1px `ink/38`; sólido ou tracejado pelas regras atuais.
- **Rótulo de estação** (Localizado, Medido, Mudança, Correção testada): estilo de rótulo da tabela. Meta (“WCAG 1.4.3 AA”) em 12.5 `muted`.
- **Glifos**, com fundo `canvas`, já que a linha aberta não tem preenchimento:
  - Localizado: círculo de 15 com borda 1px `ink` e mira de dois fios de 1px cruzando o centro (substitui o quadrado de cantos);
  - Medido: quadrado de 16, borda 1.5px na cor da severidade, com `.ac-hatch`; sem medida, tracejado `review`;
  - Mudança: losango de 11 com borda 1.5px `ink`;
  - Correção testada: círculo de 18 em `verified` com check branco (`M5.4 9.15 L7.95 11.85 L12.9 6.3`, traço 2.1, pontas redondas);
  - Pessoa decide: círculo tracejado `review` com ponto central de 5px;
  - Reauditar e não testada: anel de 1.5px `ink-2`.
- **Medido:** “2.75:1” conforme a tabela, em `serious`; “4.5:1 exigido” em 15 `ink-2`.
- **RatioGauge, variante cota** (substitui o trecho hachurado):
  - altura 58; trilho de 1px `ink-2` em `top:32`; marcas de 1 a 7 com 1×5px `rule` em `top:28`;
  - **sem preenchimento entre os valores**: linha de cota de 1px `serious` em `top:26`, do medido ao exigido;
  - pontas de seta de 7×8 (triângulos CSS) em `serious`, apontando para fora em cada extremo;
  - “Δ 1.75”: Spline Sans Mono 11/500 `serious-text`, centralizado entre as marcas, `top:6`, padding 0 3, fundo `canvas`;
  - marca do exigido: 2×26 `ink` em `top:14`, com rótulo “4.5 exigido” em mono 12.5/500 `ink`, centralizado em `top:40`;
  - marca do medido: 2×21 `serious` em `top:12`, com rótulo “2.75” em mono 13/500 `serious`, alinhado à direita a 5px da marca, em `top:0`.
- **TextSample:**
  - caixa com altura mínima 44, padding 10 14, `outline` interno de 1px `hairline`;
  - legenda em 13 `muted`, com a etiqueta em 560 `ink-2`;
  - razão em mono 500: `verified` quando testada, `serious-text` quando medida;
  - amostras de 12px com borda 1px `rule` + hex em mono.
- **CodeChange:** fundo `code`, padding 4 0, mono 13.5/24. Linha removida com “−” em `critical` e `<del>`; linhas adicionadas com fundo `verified/[0.07]` e “+” em `verified`.
- **Correção testada:** “4.51:1” conforme a tabela, em `verified`; “passa de 4.5:1” em 15 `ink-2`; nota em 14.5 `ink-2` com margem superior 4. Disclosure “Como foi testado” em 13.5/560 `ink-2` com chevron.
- **OccurrenceNav:** chips de 22; os não atuais apagados, o atual com anel de seleção; gap 6, margem superior 12.
- **ElementDetails:** “Detalhes” em 13.5/560 com chevron.
  - Botões de copiar: altura mínima 32, padding 0 10, borda 1px `border`, fundo transparente, 13/560, hover com borda `ink`.
  - Ao copiar: rótulo “Copiado ✓” em `verified` (transição de cor de 160ms) e volta após 1.8s.
- **ProblemNav:** sem mudança de layout.

### Caminho do foco (seção na lista; `focus-sequence.tsx`)
- Título com o estilo de rótulo; texto de cobertura em 14 `ink-2`.
- Sequência de etapas quadradas: 18 apagadas (borda 1px `path`, numeral `path`) e 24 na atual (cheia + anel). Ligações de 10×2 `path`.
- Etapas com problema: wrapper com padding 3 e hachura da severidade do problema.
- Botões ← → de 32×32, borda 1px `border`, cantos retos. Checkbox com `accent-color: ink`.

### Conector (`connector.tsx`)
- Traço `ink` de 1px a **70%** de opacidade, com halo de 2.5px por baixo. Segmento interno à página: 1px a 70%.
- **Ponto de origem:** círculo de raio 2.5 em `ink`, com borda de 1px `halo`, no ponto (`sx`, `sy`) onde a linha sai do locus.
- Desenho com `stroke-dashoffset` em 360ms `var(--ease-vegetal)`. Tracejado `5 4` quando a cadeia não é medida; nesse caso, entra por fade de 180ms.

### Coluna do relatório
- Fundo `canvas`, `border-l` de 1px `hairline`.

---

## Movimento (“Fôlego”)

Uma curva para tudo, `--ease-vegetal: cubic-bezier(0.25, 0.1, 0.25, 1)`, com 300ms como duração base. A opacidade conduz as transições e nada se desloca mais de 2px. Use a Web Animations API (`element.animate`) em efeitos ligados a `selectedId` e `occIndex`, sempre protegida por `prefersReducedMotion()` de `src/lib/motion.ts`. Não adicione biblioteca de animação.

| Evento | O que anima | Duração / atraso |
| --- | --- | --- |
| Abrir problema | `<section>` da cadeia: altura de 0 até a altura medida | 300ms |
| | Cada estação: opacidade 0→1 e `translateY(2px→0)`, `fill: backwards` | 300ms, atraso 60 + i·40ms |
| | Fios (da tag e das estações): `scaleY(0→1)` com origem no topo | 420ms, atraso i·40ms |
| Trocar de ocorrência (mesmo problema) | Locus: `left/top/width/height` (`.ac-travel`) | 300ms |
| | Balão da ocorrência atual na captura acompanha o locus (`left/top`) | 300ms |
| | Linhas de extensão nascem de novo: `scaleX/scaleY(0→1)` a partir do centro | 220ms, atraso 180ms |
| | Cota: fade-in | 160ms, atraso 320ms |
| | Corpo das estações: opacidade 0.25→1 | 220ms, atraso i·24ms |
| Selecionar **outro** problema | Locus e balão **não viajam** (pulam); caixa em fade, extensões nascem, cota por último | 140 / 220 / 160ms (atraso 140) |
| Conector | Redesenhado após seleção, ocorrência ou camada; recalculado a cada frame durante a viagem, para seguir o locus | 360ms; rastreio por 300 + 120ms |
| Trocar camada (Marcas) | Overlay de marcas: opacidade 0→1; sublinhado desliza | 180ms; 240ms |
| Abrir grupo recolhido | Linhas: opacidade e 2px de subida, escalonadas | 200ms, atraso i·30ms |
| Disclosure (Detalhes, Como foi testado) | Altura 0→medida e opacidade | 200ms |
| Hover de linha | Fundo | 160ms |
| Tags (seleção, hover) | `box-shadow`, `background-color`, `color` | 140ms |
| Botões | Fundo | 140ms |
| Chevron | Rotação (já existe) | 150ms |
| Copiar | Cor do rótulo | 160ms |

O scroll automático da coluna ao selecionar não muda: `smooth`, ou `auto` com movimento reduzido. Com `prefers-reduced-motion: reduce`, tudo isso desliga (o `@media` atual já cobre o CSS; os `animate()` precisam checar antes de rodar). O estado final é sempre idêntico com e sem animação.

## Estado

Nenhum estado novo de produto. Os já existentes cobrem tudo: `inv.selectedId`, `inv.occIndex`, `hovered`, `layer`, `selectedStop`, `wholePath` e `captureId`.

Estado local de apresentação:
- posição e largura do sublinhado do LayerSwitch (medidas a cada troca de `layer`);
- ocorrência e finding anteriores, para decidir entre “viajar” e “pular”;
- dimensões da cota (vindas de `occ.rect`, em px da página).

## Acessibilidade (não pode regredir)
- **Contraste:** os 42 usos do `palette.test.ts` passam. Os menores: `muted` sobre `booth` e `band` a 4.96, `moderate` sobre `canvas` a 4.73 (o mínimo ali é 3) e `rule` sobre `surface` a 3.27.
- **Foco:** anel de 2px `ink` com offset de 2px em todo controle (13.89:1 sobre `canvas`). `forced-colors` continua usando `Highlight`.
- Navegação por setas entre as marcas, `aria-pressed`, `aria-current`, `aria-expanded` e `role="status"` se mantêm.
- Nenhuma informação depende só de cor: severidade = preenchimento (crítico) ou contorno (grave e moderado) + rótulo de texto; revisão = tracejado.
- `check:results` e `check-panel-ux` precisam continuar verdes. Sem deslocamento de layout ao abrir um problema: a animação de altura não pode alterar a posição final.

## Tokens

| Token | Valor | Uso |
| --- | --- | --- |
| canvas | `#F1F2EE` | Fundo da página, barra superior, coluna do relatório, fundo dos glifos |
| surface | `#F9F9F6` | Fundo dos balões, amostras, chips |
| booth · band | `#EAECE7` | Área da captura |
| code | `#E8EAE5` | Blocos de código |
| ink | `#202428` | Texto principal, linhas, locus, conector |
| ink-2 · body | `#474D53` | Texto secundário, rótulos |
| muted | `#5F656B` | Meta |
| disabled | `#A3A7A2` | Desabilitado |
| hairline | `#DFE1DB` | Fios estruturais |
| border | `#C5C8C1` | Borda de botões |
| rule | `#878B84` | Marcas da régua, marcas de corte, borda dos balões apagados, amostras |
| halo | `rgba(249,249,246,.94)` | Halo das marcas sobre a página |
| critical / -text / -hatch | `#B0442A` / `#A13C24` / `#E7CBC2` | Sanguínea |
| serious / -text / -hatch | `#9C5A1E` / `#8A4E17` / `#E6D3BF` | Bistre |
| moderate / -text / -hatch | `#7A6B1C` / `#685A14` / `#E1DCBD` | Ocre-oliva |
| verified | `#3A6E4A` | Viridiano |
| review / -text | `#625590` / `#574B83` | Violeta |
| path | `#2B5F8C` | Cianótipo (caminho do foco) |
| steel | `#3D5468` | Seletores no detalhe |
| Translúcidos | `ink/38` (fios da cadeia) · `ink/20` (contorno da captura) · `ink/[0.025]` (hover de linha) · `ink/[0.04–0.05]` (hover de botão) · `verified/[0.07]` (linhas adicionadas) · conector `ink` a 70% | – |

Espaçamentos e larguras de coluna não mudam: a coluna do relatório continua com `clamp(420px, 30vw, 500px)`. Cantos retos em tudo, exceto nos balões (`rounded-full`). Nenhuma sombra nova; elevação vem só de fios.

## Assets
- Fontes: Archivo (variável wght+wdth) e Spline Sans Mono, via `next/font/google`. Ambas têm licença OFL.
- Ícones: sem novos ícones. Mantenha o FontAwesome atual.
- `reference/assets/northwind/*.svg` são as artes do site de fixture (copiadas de `scripts/build-store-screenshots.mjs`) e servem só para o protótipo.

## Fora do escopo
- Painel da extensão (`extension/src/panel.css`). Se a pessoa quiser a mesma paleta lá depois, siga os mesmos tokens.
- Home, `/report` e `/site` não foram redesenhadas: no escopo A apenas herdam os tokens. Reporte qualquer problema visual em vez de redesenhar.
- Layout mobile (`mobile-report.tsx`): aplique os mesmos tokens, tipografia e notação; tamanhos compactos iguais aos da coluna do relatório.

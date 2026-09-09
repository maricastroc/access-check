# Chrome Web Store listing

Two fields, two places.

- **Summary** — max 132 characters. Lives in `extension/_locales/<locale>/messages.json` as
  `extDescription`, ships inside the package, and becomes `manifest.description`.
  `npm run check:release` fails the build if it goes over.
- **Detailed description** — typed into the Developer Dashboard per language, not part of the
  package. The text below is what to paste.

---

## English

### Summary (110 characters — unchanged for 1.1.0)

Inspect accessibility problems in the current tab: what failed, where it is, and the real keyboard focus path.

### Detailed description

AccessCheck audits the tab you are on and shows you the evidence, not just a list.

Open any finding and it expands into the element that produced it: the CSS selector, the element's
own HTML, a suggested fix, and — for keyboard findings — what actually happened when focus reached
it. Selector and HTML copy to the clipboard in one click, and "Locate on page" draws a box around
the element on the live page.

**What it checks**

- axe-core rules for WCAG 2.0, 2.1 and 2.2, levels A and AA
- The real keyboard focus path — the tab order walked stop by stop, with the stops that have no
  visible focus indicator called out
- Target size and live regions
- A screenshot of the visible page with the failing elements marked on it

**What it does not do**

It is not a compliance seal. Automated testing proves a minority of WCAG, and AccessCheck says so:
the score covers what the checks could prove, and everything that needs a human is listed
separately as manual review rather than folded into a number. When a check could not run, the
panel names it instead of quietly passing.

**How it treats your browser**

- No account, no sign-in, no telemetry
- It reads a tab only after you click the toolbar icon on that tab
- The audited page is never rewritten. The only thing AccessCheck draws is a temporary highlight
  box when you ask it to locate an element, and it clears that overlay and restores your scroll
  position when you are done
- Nothing is uploaded anywhere. The extension ships no network code at all, and the audit runs
  entirely in your browser

**Languages**

English and Português (Brasil). The panel follows your browser's language by default, and you can
change it at the bottom of the panel. The report follows the same choice, rule titles included, and
re-runs itself so nothing is left half-translated.

---

## Português (Brasil)

### Resumo (110 caracteres — inalterado na 1.1.0)

Veja os problemas de acessibilidade da aba atual: o que falhou, onde está e o caminho real do foco do teclado.

### Descrição detalhada

O AccessCheck audita a aba em que você está e mostra a evidência, não só uma lista.

Abra qualquer problema e ele se expande no elemento que o gerou: o seletor CSS, o HTML do próprio
elemento, uma correção sugerida e — nos problemas de teclado — o que de fato aconteceu quando o foco
chegou nele. Seletor e HTML vão para a área de transferência em um clique, e "Localizar na página"
desenha uma caixa em volta do elemento na página ao vivo.

**O que ele verifica**

- Regras do axe-core para WCAG 2.0, 2.1 e 2.2, níveis A e AA
- O caminho real do foco do teclado — a ordem de tabulação percorrida parada a parada, apontando
  as que não têm indicador de foco visível
- Tamanho de alvo e regiões dinâmicas
- Uma captura da parte visível da página com os elementos que falharam marcados nela

**O que ele não faz**

Não é um selo de conformidade. O teste automático prova uma minoria da WCAG, e o AccessCheck diz
isso: a nota cobre o que as verificações conseguiram provar, e tudo que depende de uma pessoa fica
listado à parte como revisão manual, em vez de virar número. Quando uma verificação não pôde rodar,
o painel diz qual foi, em vez de aprovar em silêncio.

**Como ele trata o seu navegador**

- Sem conta, sem login, sem telemetria
- Só lê uma aba depois que você clica no ícone da barra naquela aba
- A página auditada nunca é reescrita. A única coisa que o AccessCheck desenha é uma caixa de
  destaque temporária, quando você pede para localizar um elemento, e ele apaga esse destaque e
  devolve a sua posição de rolagem ao terminar
- Nada é enviado para lugar nenhum. A extensão não embarca nenhum código de rede, e a auditoria
  roda inteira no seu navegador

**Idiomas**

English e Português (Brasil). O painel segue o idioma do navegador por padrão, e você pode trocar no
rodapé do painel. O relatório acompanha a mesma escolha, títulos de regra inclusive, e se refaz
sozinho para não sobrar nada meio traduzido.

---

## Why the summary did not change

The 132-character summary should sell what the extension does, and the language choice is listing
metadata, not value. A reader browsing the store in Portuguese already sees this summary in
Portuguese — that is the signal, and spending characters to restate it costs more than it returns.

If you would rather name it explicitly, these fit:

- EN (111): Accessibility audit for the current tab, in English or Portuguese: what failed, where, and the real focus path.
- PT (110): Auditoria de acessibilidade da aba atual, em português ou inglês: o que falhou, onde e o caminho real do foco.

Swapping either one means editing `extDescription` in the matching `messages.json`, then
`npm run build:extension && npm run pack && npm run check:release` — and bumping the version again,
because the package itself changes.

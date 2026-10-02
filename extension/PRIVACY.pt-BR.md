# Extensão AccessCheck: política de privacidade

**Em vigor desde 2 de outubro de 2026.** Esta política cobre a extensão de
navegador do AccessCheck. O analisador hospedado no site do AccessCheck é um
produto separado, com contas e armazenamento próprios; esta política trata
apenas da extensão.

## Versão curta

A extensão lê a página que você mandar auditar, dentro do seu navegador, e
mostra o que encontrou. Nada do que ela lê sai do seu navegador. Não há conta,
não há analytics e não há rastreamento.

## O que a extensão lê

Quando você clica no ícone do AccessCheck em uma aba, e só então, ela lê
aquela aba:

- **O DOM da página**: elementos, atributos, estilos computados e posições,
  para que as regras possam decidir o que passa e o que falha.
- **Uma captura do viewport visível**: um único JPEG, mostrado com os
  marcadores em "Sobre esta auditoria" no painel.
- **Seletores CSS** dos elementos a que cada problema se refere, para você
  conseguir localizá-los.
- **Um trecho de HTML curto e abreviado** para cada ocorrência. Ele é
  reconstruído a partir de uma lista fixa de atributos (id, class, type, role,
  name, alt, title, placeholder, aria-\*, tabindex, disabled, href) e dos
  primeiros 60 caracteres do texto do elemento. O atributo `value` fica de fora
  de propósito, porque guarda o que você digitou num campo de formulário, e do
  `href` sobra apenas o caminho. A query string, onde costumam ficar tokens, é
  removida.

## O que a extensão escreve

Ela escreve na sua página de duas formas apenas:

- **Para testar uma correção.** Durante a auditoria, quando a correção pode ser
  calculada a partir de valores medidos, o que na prática significa uma cor de
  contraste, a extensão aplica aquela única propriedade de CSS no elemento, roda
  aquela única regra de novo e devolve o atributo exatamente como estava. Uma
  verificação automatizada do projeto compara o markup da página antes e depois,
  byte a byte, e quebra o build se houver qualquer diferença. Sugestões que
  dependem do que a página significa nunca são aplicadas.
- **Para mostrar onde estão os problemas.** Enquanto o relatório está aberto,
  ela desenha marcações numeradas num contêiner próprio na raiz do documento,
  sem que você precise pedir: uma para cada problema a corrigir que esteja na
  tela quando nenhum está aberto, ou os elementos do problema que você abrir.
  Inspecionar a ordem de tabulação desenha marcadores numerados do mesmo
  jeito. O contêiner é `aria-hidden`, não acrescenta nada à ordem de tabulação
  da página e nunca toca os elementos auditados. Só os números dele e a seta
  que aparece para um elemento fora da tela respondem a um clique: um número
  abre o seu problema, elemento ou parada no painel, e a seta rola a página até
  o elemento. Nenhum deles move o foco da página. Quando a aba passa a mostrar
  outra página, inclusive outra rota do mesmo app, as marcações são removidas e
  nada mais é desenhado. Tudo o que ela desenhou também é removido quando o
  painel fecha e no início de qualquer auditoria.

O que você digita num campo de formulário nunca é lido, escrito nem guardado.

## Para onde isso vai

Para lugar nenhum. Fica na memória da própria extensão e no
`chrome.storage.session`, que o Chrome mantém em memória e limpa quando você
fecha o navegador. É isso que permite ao relatório sobreviver quando o Chrome
suspende a extensão enquanto você lê.

A única coisa que fica depois que o navegador fecha é o idioma do relatório que
você escolheu no painel (`auto`, `en` ou `pt-BR`) no `chrome.storage.local`.
Nada sobre as páginas que você audita é guardado.

A extensão não envia nada para nós nem para ninguém: sem telemetria, sem
relatórios de erro, sem uploads. As únicas requisições que ela pode causar são
do axe-core relendo uma folha de estilo que a página já carregou, da origem da
própria página, porque algumas regras precisam do texto do CSS. Quando as folhas
de estilo vêm de outra origem, a extensão desliga essa releitura em vez de
buscá-las, e avisa isso no relatório.

O axe-core, o motor de regras, vai empacotado dentro da extensão e nunca é
baixado. Não há código hospedado remotamente de nenhum tipo.

Nada é vendido, compartilhado, transferido ou usado para publicidade, e não há
criação de perfil nem rastreamento.

## A permissão de depuração

Clicar no ícone da barra nunca anexa o depurador. Ele só é anexado quando você
aperta "Verificar teclado" para seguir a ordem real de foco do teclado da
página, o que exige pressionamentos legítimos de Tab que só o depurador do
Chrome consegue produzir. Por isso a extensão anexa o `chrome.debugger` à aba
**pelo tempo dessa verificação e nada mais**. Enquanto está anexado, o Chrome exibe o próprio aviso na
aba.

O depurador serve para uma coisa só: enviar Tab e Shift+Tab. A página é lida
pelo mesmo código que o resto da auditoria usa. O depurador é liberado antes de
o relatório final ser publicado, e uma verificação automatizada do projeto
quebra o build caso um relatório chegue a ser publicado com ele ainda anexado.

## As permissões e por que cada uma existe

- **activeTab**: dá acesso apenas à aba em que você clicou, e somente depois
  desse clique. A extensão não pede acesso permanente a nenhum site.
- **scripting**: injeta a auditoria naquela aba e desenha as marcações
  numeradas descritas acima enquanto o relatório está aberto.
- **sidePanel**: mostra o relatório ao lado da página.
- **storage**: `chrome.storage.session` para o único relatório descrito acima,
  e `chrome.storage.local` para o idioma do relatório que você escolheu. Nada
  além disso.
- **debugger**: a verificação de teclado, como descrita acima.

A extensão não solicita nenhuma permissão de host.

## Crianças

A extensão é uma ferramenta para desenvolvimento e não é direcionada a crianças.

## Alterações

Se esta política mudar, a data de vigência acima muda junto.

## Contato

marianacastrorc@gmail.com

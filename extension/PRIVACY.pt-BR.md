# Extensão AccessCheck — política de privacidade

**Em vigor desde 8 de setembro de 2026.** Esta política cobre a extensão de
navegador do AccessCheck. O analisador hospedado no site do AccessCheck é um
produto separado, com contas e armazenamento próprios; esta política trata
apenas da extensão.

## Versão curta

A extensão lê a página que você mandar auditar, dentro do seu navegador, e
mostra o que encontrou. Nada do que ela lê sai do seu navegador. Não há conta,
não há analytics e não há rastreamento.

## O que a extensão lê

Quando você clica no ícone do AccessCheck em uma aba — e só então — ela lê
aquela aba:

- **O DOM da página** — elementos, atributos, estilos computados e posições,
  para que as regras possam decidir o que passa e o que falha.
- **Uma captura do viewport visível** — um único JPEG, usado para desenhar os
  marcadores na seção de Evidência do relatório.
- **Seletores CSS** dos elementos a que cada problema se refere, para você
  conseguir localizá-los.
- **Um trecho de HTML curto e abreviado** para cada ocorrência. Ele é
  reconstruído a partir de uma lista fixa de atributos (id, class, type, role,
  name, alt, title, placeholder, aria-\*, tabindex, disabled, href). O atributo
  `value` fica de fora de propósito, porque guarda o que você digitou, e do
  `href` sobra apenas o caminho — a query string, onde costumam ficar tokens, é
  removida.

## Para onde isso vai

Para lugar nenhum. Fica na memória da própria extensão e no
`chrome.storage.session`, que o Chrome mantém em memória e limpa quando você
fecha o navegador. É isso que permite ao relatório sobreviver quando o Chrome
suspende a extensão enquanto você lê.

A extensão não envia nada para nós nem para ninguém — sem telemetria, sem
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

A auditoria expandida percorre a ordem real de foco do teclado da página. Para
isso são necessários pressionamentos legítimos de Tab, que só o depurador do
Chrome consegue produzir. Por isso a extensão anexa o `chrome.debugger` à aba
**pelo tempo desse percurso e nada mais**. Enquanto está anexado, o Chrome exibe
o próprio aviso na aba.

O depurador serve para uma coisa só: enviar Tab e Shift+Tab. A página é lida
pelo mesmo código que o resto da auditoria usa. O depurador é liberado antes de
o relatório final ser publicado, e uma verificação automatizada do projeto
quebra o build caso um relatório chegue a ser publicado com ele ainda anexado.

## As permissões e por que cada uma existe

- **activeTab** — dá acesso apenas à aba em que você clicou, e somente depois
  desse clique. A extensão não pede acesso permanente a nenhum site.
- **scripting** — injeta a auditoria naquela aba e desenha o destaque temporário
  quando você pede para localizar um elemento.
- **sidePanel** — mostra o relatório ao lado da página.
- **storage** — apenas `chrome.storage.session`, para o único relatório descrito
  acima.
- **debugger** — o percurso do foco do teclado, como descrito acima.

A extensão não solicita nenhuma permissão de host.

## Crianças

A extensão é uma ferramenta para desenvolvimento e não é direcionada a crianças.

## Alterações

Se esta política mudar, a data de vigência acima muda junto.

## Contato

marianacastrorc@gmail.com

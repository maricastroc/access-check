import type { Catalog } from "./en";

export const ptBR: Catalog = {
  "unit.stop": { one: "{count} parada", other: "{count} paradas" },
  "unit.detectedControl": {
    one: "{count} controle detectado",
    other: "{count} controles detectados",
  },
  "unit.styleSheet": { one: "{count} folha de estilo", other: "{count} folhas de estilo" },
  "unit.mediaFile": { one: "{count} arquivo de mídia", other: "{count} arquivos de mídia" },
  "unit.element": { one: "{count} elemento", other: "{count} elementos" },
  "unit.and": "e",

  "privacy.metaTitle": "Privacidade · extensão AccessCheck",
  "privacy.metaDescription":
    "O que a extensão de navegador do AccessCheck lê, e para onde isso vai.",
  "meta.title": "AccessCheck: meça, localize e rastreie cada barreira de acessibilidade",
  "meta.description":
    "Cole um endereço da web. O AccessCheck abre a página em um navegador real, roda o axe-core (WCAG níveis A e AA) e mais as verificações de teclado, celular e movimento. Cada problema volta ligado ao elemento que o causou, com uma correção já testada em uma cópia da página.",
  "nav.skipToContent": "Pular para o conteúdo",
  "nav.howItWorks": "Como funciona",
  "nav.checks": "Verificações",
  "nav.evidenceLens": "Evidências",
  "capture.stopOutside":
    "A parada {n} fica cerca de {docY}px abaixo do topo. Nenhuma captura deste relatório cobre esse ponto.",
  "capture.stopInsideScroller":
    "A parada {n} está dentro de uma área rolável ({context}). Esta captura foi feita com essa área em repouso, então a parada não aparece onde o percurso a encontrou.",
  "capture.stopInsideScrollerPlain":
    "A parada {n} está dentro de uma área rolável. Esta captura foi feita com essa área em repouso, então a parada não aparece onde o percurso a encontrou.",
  "capture.stopUnplaced": "A parada {n} não tinha posição mensurável na página.",
  "capture.noStopsLanded": "Nenhuma parada do foco aparece nesta captura.",
  "capture.focusHint": "Escolha uma parada no caminho do foco para acompanhá-la aqui.",
  "capture.regionLabel": "Captura da página a {docY}px do topo",
  "capture.backToFirst": "Voltar à primeira captura",
  "capture.regionMissedTitle": "Esta área não foi capturada",
  "capture.regionMissedTime":
    "A auditoria ficou sem tempo antes de capturar a página em torno de {docY}px do topo. O resto do relatório não é afetado.",
  "capture.regionMissedBytes":
    "O relatório atingiu o limite de tamanho antes de capturar a página em torno de {docY}px do topo. O resto do relatório não é afetado.",
  "capture.regionMissedFailed":
    "A página parou de responder enquanto a área em torno de {docY}px do topo era capturada. O resto do relatório não é afetado.",
  "capture.noMarkersLanded":
    "Nenhum problema está marcado nesta captura. Abra um problema e o relatório vai para a parte da página de onde ele veio.",
  "language.label": "Idioma",
  "language.followBrowser": "Padrão do navegador",

  "api.site.noAddress":
    "Nenhum endereço da web foi informado. Digite um endereço de site e tente de novo.",
  "api.site.rateLimited":
    "Auditorias de site demais em pouco tempo. Espere alguns minutos e tente de novo.",
  "api.site.unavailable":
    "As auditorias de site estão temporariamente indisponíveis. Audite uma única página ou tente mais tarde.",
  "api.site.disabled":
    "As auditorias de site não estão disponíveis agora. Audite uma única página.",
  "audit.live.criterion": "WCAG 4.1.3 \u00b7 Mensagens de status",
  "audit.live.invalidTitle": {
    one: "{count} região dinâmica com valor inválido em aria-live",
    other: "{count} regiões dinâmicas com valor inválido em aria-live",
  },
  "audit.live.invalidDesc":
    "O aria-live só aceita polite, assertive ou off. Qualquer outro valor é ignorado, e o leitor de tela nunca anuncia as atualizações dessa região.",
  "audit.live.invalidFix":
    'Use aria-live="polite" para atualizações de rotina e "assertive" para as urgentes.',
  "audit.live.hiddenTitle": {
    one: "{count} região dinâmica aparece na tela, mas está oculta para tecnologias assistivas",
    other:
      "{count} regiões dinâmicas aparecem na tela, mas estão ocultas para tecnologias assistivas",
  },
  "audit.live.hiddenDesc":
    'A região mostra texto na tela, mas tem aria-hidden="true". Por isso, o leitor de tela a trata como inexistente e nunca anuncia o que quem enxerga lê ali.',
  "audit.live.hiddenFix":
    "Remova o aria-hidden da região dinâmica. Se ela precisar ficar fora da tela, esconda-a com um padrão visível só para leitores de tela, que a mantém na árvore de acessibilidade.",
  "audit.live.conditionalTitle": {
    one: "{count} região dinâmica começa oculta",
    other: "{count} regiões dinâmicas começam ocultas",
  },
  "audit.live.conditionalDesc":
    'Quando a página foi lida, a região estava oculta (display:none, visibility:hidden, o atributo hidden ou aria-hidden) e ainda não mostrava nada. Isso é esperado para uma mensagem que a página revela depois de uma ação, e a maioria dos leitores de tela anuncia um role="alert" revelado assim. Mas um texto escrito na região enquanto ela continua oculta nunca é anunciado, e só lendo a página não dá para distinguir os dois casos.',
  "audit.live.conditionalFix":
    "Dispare o que preenche a região, como enviar o formulário ou adicionar ao carrinho, e ouça com um leitor de tela. Se a atualização não for anunciada, mantenha a região na árvore de acessibilidade e troque o texto dela, em vez de revelar uma região oculta.",
  "audit.live.mutedTitle": {
    one: '{count} alerta silenciado por aria-live="off"',
    other: '{count} alertas silenciados por aria-live="off"',
  },
  "audit.live.mutedDesc":
    'Um elemento com role="alert" existe para interromper, mas aria-live="off" o silencia. Como as duas declarações se contradizem, nada é anunciado.',
  "audit.live.mutedFix":
    'Remova o aria-live="off" do alerta. O role="alert" já é assertivo por padrão.',

  "audit.motion.criterion": "WCAG 2.3.3 \u00b7 Animação a partir de interações",
  "audit.motion.title": {
    one: "{count} elemento continua animando mesmo com movimento reduzido",
    other: "{count} elementos continuam animando mesmo com movimento reduzido",
  },
  "audit.motion.desc": {
    one: "Mesmo com prefers-reduced-motion: reduce ativo, {count} elemento manteve uma animação longa ou em repetição. Movimento que a pessoa pediu para evitar pode causar náusea, tontura ou enxaqueca em quem tem distúrbios vestibulares.",
    other:
      "Mesmo com prefers-reduced-motion: reduce ativo, {count} elementos mantiveram animações longas ou em repetição. Movimento que a pessoa pediu para evitar pode causar náusea, tontura ou enxaqueca em quem tem distúrbios vestibulares.",
  },
  "audit.motion.fix":
    "Coloque as animações não essenciais dentro de @media (prefers-reduced-motion: reduce) e desligue ou encurte a animação ali, por exemplo com animation: none ou uma transição rápida de opacidade no lugar do movimento.",

  "audit.target.criterion": "WCAG 2.5.8 \u00b7 Tamanho do alvo (mínimo)",
  "audit.target.title": {
    one: "{count} alvo de toque menor que 24\u00d724px",
    other: "{count} alvos de toque menores que 24\u00d724px",
  },
  "audit.target.desc": {
    one: "{count} controle interativo fica abaixo do mínimo de 24\u00d724 pixels CSS e está perto demais de outro alvo para se enquadrar na exceção de espaçamento. Alvos pequenos e amontoados são difíceis de acertar para quem tem limitação motora ou usa tela sensível ao toque.",
    other:
      "{count} controles interativos ficam abaixo do mínimo de 24\u00d724 pixels CSS e estão perto demais de outros alvos para se enquadrarem na exceção de espaçamento. Alvos pequenos e amontoados são difíceis de acertar para quem tem limitação motora ou usa tela sensível ao toque.",
  },
  "audit.target.fix":
    "Aumente cada controle para pelo menos 24×24px, ou dê espaço suficiente para que um círculo de 24px centrado nele não encoste nos vizinhos. Em geral, aumentar a área clicável do controle resolve os dois casos.",

  "scanFail.browserUnavailable":
    "O navegador que usamos para abrir a página parou de responder antes de a auditoria rodar.",
  "scanFail.browserSlow":
    "O navegador que usamos para abrir a página demorou demais para iniciar. Tente de novo.",
  "scanFail.unreachable": "Não foi possível acessar a página.",
  "scanFail.timeout": "A auditoria de acessibilidade não conseguiu terminar nesta página a tempo.",
  "scanFail.generic": "A auditoria falhou.",
  "scanFail.httpError":
    "A página devolveu um erro (HTTP {status}), então não conseguimos auditá-la. Confira o endereço e tente de novo.",
  "scanFail.navigationTimeout": "A página levou mais de {seconds}s para responder.",
  "scanFail.engineMissing":
    "Não foi possível carregar o motor de auditoria na página ({path}). Compile com `npm run build:engine`. {detail}",
  "scanFail.engineVersion":
    "O motor de auditoria na página informa a versão {found}, mas este driver precisa da {needed}. Compile de novo com `npm run build:engine`.",

  "home.lens.sharedColor": "Problema de contraste, outro elemento com a mesma cor",
  "home.lens.locatedElement": "Problema de contraste, elemento localizado",
  "home.lens.locatedVerified": "Elemento localizado, correção testada",
  "home.example.headingSkip": "Níveis de título pulados",

  "api.internal": "Algo deu errado do nosso lado. Tente de novo.",
  "api.badRequest": "Não conseguimos ler essa requisição. Recarregue a página e tente de novo.",
  "api.noAddress":
    "Nenhum endereço da web foi informado. Digite um endereço de página e tente de novo.",
  "api.rateLimited": "Auditorias demais em pouco tempo. Espere cerca de um minuto e tente de novo.",
  "api.invalidAddress": "Isso não parece um endereço da web válido. Confira e tente de novo.",
  "api.tooSlow":
    "Esta página demorou demais para terminar. Tente uma página mais leve em vez de uma página inicial grande.",
  "api.auditFailed": "Não conseguimos auditar esta página. Tente outro endereço da web.",

  "report.passedChecks": "Verificações aprovadas",
  "report.priorityProjection": "Projeção de prioridade",
  "report.current": "Atual",
  "report.estimated": "Estimado",
  "report.actionPlan": "Plano de ação",

  "md.reportTitle": "Relatório de acessibilidade: {name}",
  "md.url": "URL",
  "md.elementsScanned": "Elementos verificados",
  "md.generated": "Gerado em",
  "md.manualOutside": {
    one: "{count} item de revisão manual não entra nesta contagem.",
    other: "{count} itens de revisão manual não entram nesta contagem.",
  },
  "md.wcagReading": "Níveis da WCAG",
  "md.failsBy": "reprova em {criteria}",
  "md.noAFailures": "nenhuma falha de nível A detectada automaticamente",
  "md.noAAFailures": "nenhuma falha de nível AA detectada automaticamente",
  "md.aaaNote": "não avaliado. O AccessCheck cobre os níveis A e AA (WCAG 2.0/2.1/2.2)",
  "md.findings": "Problemas encontrados",
  "md.needsManualReview": "Precisa de revisão manual",
  "md.whereLabel": "Onde",
  "identity.in": "em {where}",
  "identity.nth": "{n} de {total}",
  "md.howToCheck": "Como conferir",
  "md.checksPassed": "Verificações automáticas aprovadas ({count})",
  "md.footer":
    "_As correções são testadas em uma cópia da página, então o site auditado nunca é alterado. Este resultado cobre só o que uma ferramenta decide sozinha. Não é uma declaração de conformidade._",
  "md.bestPracticeNote": "**Boa prática** (não é um critério de sucesso da WCAG)",
  "md.passLabel": "Verificação",
  "md.affected": "Afetados",
  "md.elementsLabel": "Elementos",
  "md.measuredLabel": "Medido",
  "md.minimumAA": "mínimo AA {required}:1",
  "md.fixReaches": "a correção alcança {ratio}:1",
  "md.impact": "Impacto",
  "md.suggestedFix": "Correção sugerida",
  "md.setProp": "Defina `{prop}` como {hex}.",
  "md.andMore": "(mais {count})",
  "md.noFailures":
    "Nenhuma falha detectada automaticamente nesta página. Isso não equivale a conformidade com a WCAG.",
  "md.manualOutsideScore":
    "Os testes automáticos não conseguiram decidir estes itens, então confirme à mão. Eles não entram nesta contagem.",

  "preview.stillFlagged":
    "O par calculado atinge o mínimo, mas a regra ainda sinaliza o elemento localizado quando roda de novo na página. O fundo real provavelmente é uma imagem, um gradiente ou uma camada sobreposta, e não a cor sólida que detectamos.",
  "preview.noColorReaches": "Nenhuma mudança de cor sozinha atinge o mínimo neste par de matizes.",

  "scanError.hint.invalidUrl": "Confira o endereço e tente de novo.",
  "scanError.hint.blockedUrl": "Só páginas públicas da web podem ser auditadas.",
  "scanError.hint.rateLimited": "Espere um momento antes de começar outra auditoria.",
  "scanError.hint.navigationTimeout":
    "O site pode estar lento, ou pode estar bloqueando navegadores automatizados.",
  "scanError.hint.navigationFailed": "Confira o endereço. O site também pode estar fora do ar.",
  "scanError.hint.httpError":
    "O endereço pode estar errado, ou a página pode ter sido removida ou exigir login.",
  "scanError.hint.auditFailed":
    "Esta página é muito pesada. Tente uma página específica em vez da página inicial.",
  "scanError.hint.browserUnavailable": "Espere um pouco e tente de novo.",
  "scanError.hint.timeout":
    "Esta página é muito pesada. Tente uma página específica em vez da página inicial.",
  "scanError.hint.interrupted": "A conexão caiu durante a auditoria. Tente de novo.",
  "scanError.hint.internal": "Algo deu errado do nosso lado. Tente de novo.",

  "scanError.message.invalidUrl": "Não conseguimos ler esse endereço.",
  "scanError.message.blockedUrl": "Esse endereço não pode ser auditado.",
  "scanError.message.rateLimited": "Auditorias demais em pouco tempo. Tente de novo em um minuto.",
  "scanError.message.navigationTimeout": "A página demorou demais para responder.",
  "scanError.message.navigationFailed": "Não conseguimos acessar a página.",
  "scanError.message.httpError":
    "A página devolveu um erro, então não conseguimos auditá-la. Confira o endereço e tente de novo.",
  "scanError.message.auditFailed": "Não conseguimos terminar a auditoria nesta página.",
  "scanError.message.browserUnavailable":
    "Não conseguimos iniciar o navegador usado para abrir a página. Tente de novo.",
  "scanError.message.timeout": "A auditoria ficou sem tempo nesta página.",
  "scanError.message.interrupted": "A auditoria parou antes de terminar.",
  "scanError.message.internal": "A auditoria parou antes de terminar. Tente de novo.",

  "scanWarning.screenshotUnavailable": "Não deu tempo de tirar a captura de tela.",
  "scanWarning.fixDetailsSkipped":
    "Alguns problemas mostram orientação geral em vez de uma correção específica, e identificam o elemento apenas pelo seletor.",
  "scanWarning.regionsSkipped":
    "Algumas áreas da página abaixo da primeira captura ficaram de fora, então alguns problemas ficam sem imagem de onde estão.",
  "scanWarning.markersSkipped": "Não foi possível posicionar as marcas na captura.",
  "scanWarning.contentUnsettled": "A página ainda estava carregando quando a auditoria rodou.",
  "scanWarning.verificationSkipped":
    "Desta vez as correções não foram testadas em uma cópia da página.",
  "scanWarning.auditsSkipped":
    "As verificações de tamanho de alvo, movimento e regiões dinâmicas foram puladas.",
  "scanWarning.keyboardSkipped": "A verificação de teclado e ordem de foco foi pulada.",
  "scanWarning.lazyContentSkipped":
    "Conteúdo que só aparece ao rolar não foi carregado antes da auditoria.",
  "scanWarning.walkChangedPage": "Navegar com Tab pela página abriu conteúdo que ficou aberto.",
  "scanWarning.contextsSkipped": "A verificação de celular e estados dinâmicos foi pulada.",
  "scanWarning.streamInterrupted":
    "A auditoria foi interrompida antes de todas as verificações terminarem.",
  "scanWarning.crossOriginAssets":
    "Alguns estilos e mídias vieram de outra origem e não puderam ser lidos.",

  "blocked.chromePages": "O Chrome não deixa nenhuma extensão rodar nas próprias páginas.",
  "blocked.extensionPage": "Esta é uma página de extensão, não uma página da web.",
  "blocked.webStore": "O Chrome bloqueia extensões na Web Store.",
  "blocked.builtinViewer":
    "O visualizador embutido do Chrome não tem uma página que a auditoria consiga ler.",
  "blocked.localFile":
    "Para auditar arquivos locais, ative o acesso a arquivos da extensão em chrome://extensions.",
  "blocked.noAddress": "Esta aba não tem endereço que a auditoria consiga ler.",

  "background.wokeUp":
    "O Chrome suspendeu a extensão antes de a auditoria terminar, então nada foi medido. Rode a auditoria de novo.",
  "background.pageUnreadable": "Não foi possível ler a página.",
  "background.auditEmpty": "A auditoria não devolveu nada.",
  "background.permissionLapsed":
    "Esta aba mudou de página, e o acesso que você deu a ela expirou. Clique no ícone do AccessCheck na página para auditá-la de novo.",
  "background.otherTab":
    "Para auditar outra aba, clique no ícone do AccessCheck nela. É esse clique que dá à extensão acesso à aba.",
  "background.nothingAudited": "Nada foi auditado nesta aba ainda.",
  "background.tabUnreachable":
    "Esta aba mudou de página, então a página auditada não pode mais ser acessada daqui.",
  "background.markupFailed": "Não foi possível desenhar as marcas na página.",
  "background.tabBehind":
    "Este relatório é de outra aba. Volte para ela para localizar os problemas na página ou verificar o teclado.",

  "deep.cancelled":
    "Você interrompeu, então o caminho do foco não foi percorrido. O resto deste relatório continua valendo.",
  "deep.cancelledPlain":
    "A verificação de teclado foi cancelada, então o caminho do foco não foi percorrido.",
  "deep.alreadyAttached":
    "Já existe um depurador conectado a esta aba, normalmente o DevTools. Feche-o e verifique o teclado de novo.",
  "deep.notDebuggable":
    "O Chrome não permite depurar esta página, então o caminho do foco não pode ser percorrido aqui.",
  "deep.attachRefused": "O Chrome não deixou conectar o depurador: {reason}",
  "deep.tabMovedOn":
    "A aba mudou de página enquanto o caminho do foco era percorrido, então a verificação de teclado parou.",
  "deep.unfinished": "A verificação de teclado não conseguiu terminar: {reason}",
  "deep.notReleased":
    "O Chrome não liberou o depurador. O aviso dele pode continuar na aba até você recarregá-la.",

  "engine.missing":
    "O motor de auditoria do AccessCheck não foi injetado nesta página. Recarregue a extensão e tente de novo.",
  "engine.versionMismatch":
    "O motor de auditoria na página informa a versão {found}, mas esta versão da extensão precisa da {needed}.",

  "warning.keyboardSkipped":
    'O caminho do foco não foi percorrido. Use "Verificar teclado" para percorrer a página pressionando Tab.',
  "warning.keyboardFailed": "O caminho do foco não foi percorrido. {reason}",
  "warning.lazyContent":
    "Conteúdo que só aparece quando você rola até ele não foi carregado, então nada abaixo da dobra foi lido. Normalmente a auditoria rola a página antes, mas desta vez não conseguiu.",
  "warning.contextsSkipped":
    "A verificação em viewport de celular precisa de emulação de viewport, que esta versão não tem.",
  "warning.reducedMotionSkipped":
    "A verificação de movimento reduzido precisa de emulação de mídia, que esta versão não tem. Tamanho do alvo e regiões dinâmicas foram verificados.",
  "warning.walkChangedPage":
    "Navegar com Tab por esta página abriu algo que ficou aberto, como um menu, um painel ou uma lista de sugestões. As regras já tinham lido a página, então auditar de novo pode dar um resultado um pouco diferente.",
  "warning.contentUnsettled":
    "A página ainda estava mudando depois de seis segundos de espera, então as regras leram um alvo em movimento. Problemas de uma página que não estabilizou não são confiáveis e podem variar entre execuções.",
  "warning.crossOrigin":
    "{assets} nesta página {verb} de outra origem, que esta versão não tem permissão para buscar. Regras que leem esses arquivos, como a verificação de trava de orientação, ficam marcadas para revisão em vez de aprovadas. Tudo o que foi lido da própria página não é afetado.",
  "warning.crossOriginComes": "vem",
  "warning.crossOriginCome": "vêm",

  "caveat.contentUnsettled": "página ainda mudando",
  "caveat.walkChangedPage": "o percurso abriu conteúdo",
  "caveat.crossOriginAssets": "alguns estilos não lidos",
  "caveat.screenshotUnavailable": "sem captura de tela",
  "caveat.markersSkipped": "sem marcas na captura",
  "caveat.fixDetailsSkipped": "detalhes da correção ausentes",
  "caveat.streamInterrupted": "auditoria interrompida",

  "coverage.partialChecks": {
    one: "Cobertura parcial · {count} verificação indisponível",
    other: "Cobertura parcial · {count} verificações indisponíveis",
  },
  "coverage.partialCaveat": "Cobertura parcial · {caveat}",
  "coverage.complete": "Todas as verificações desta versão foram concluídas",

  "focusPath.none": "Nenhum controle focalizável por teclado foi encontrado nesta página.",
  "focusPath.full": "Percorreu a ordem de tabulação inteira: {stops} em {controls}.",
  "focusPath.firstOnly": {
    one: "Verificou o primeiro de {controls}.",
    other: "Verificou os {stops} primeiros de {controls}.",
  },
  "focusPath.walkedSome": "Percorreu {stops} e passou por {reached} de {controls}.",
  "focusPath.notFromTop":
    "Parcial: não foi possível levar o percurso de volta ao primeiro controle, então estas {stops} começam em algum ponto dentro da ordem de tabulação.",
  "focusPath.leftoverSome": {
    one: "o controle restante não foi avaliado",
    other: "os {count} controles restantes não foram avaliados",
  },
  "focusPath.leftoverNone": "pode não ter chegado ao fim da ordem de tabulação",
  "focusPath.stoppedByCap":
    "Parcial: o percurso atingiu o limite de {stops} paradas, então {leftover}.",
  "focusPath.stoppedByTimeout":
    "Parcial: o percurso ficou sem tempo depois de {stops}, então {leftover}.",
  "focusPath.stoppedByOpaque":
    "Parcial: o foco entrou em um iframe ou shadow root, que esta versão não consegue enxergar, então {leftover}.",
  "focusPath.stoppedByTrap": "Parcial: o foco ficou preso na parada {stops}, então {leftover}.",

  "scope.stillMissing":
    "O viewport de celular e o movimento reduzido ainda não foram verificados aqui, então esta não é uma auditoria completa.",
  "scope.focusPathPending": "Teclado ainda não verificado",
  "scope.currentTabKicker": "Esta aba",
  "scope.skippedNote":
    "O caminho do foco não foi verificado, então nada aqui cobre o uso com teclado. {why} {rest}",
  "scope.partialBadge": "A verificação de teclado não começou no primeiro controle",
  "scope.partialNote":
    "Não foi possível levar o caminho do foco de volta ao primeiro controle, então estas {stops} paradas começam em algum ponto dentro da página, e não no início da ordem de tabulação. {rest}",
  "scope.truncatedBadge": "Verificação de teclado parou em {stops} paradas",
  "scope.truncatedNote":
    "O caminho do foco parou cedo, depois de {stops} paradas, então nada além desse ponto foi alcançado. {rest}",
  "scope.walkedBadge": "Inclui o caminho do foco do teclado",
  "scope.walkedNote": "O caminho do foco foi percorrido até o fim pressionando a tecla Tab. {rest}",

  "summary.scope": " entre as verificações que rodaram",
  "summary.bestPractice": {
    one: "{count} recomendação de boa prática",
    other: "{count} recomendações de boas práticas",
  },
  "summary.manualReview": {
    one: "{count} item de revisão manual",
    other: "{count} itens de revisão manual",
  },
  "summary.needsReview": {
    one: "{count} observação para uma pessoa conferir",
    other: "{count} observações para uma pessoa conferir",
  },
  "evidence.heuristic.title": "Por que isto não conta como falha",
  "evidence.heuristic.body":
    "É uma observação sobre como a página se comportou, não uma regra que passa ou falha, então não entra nesta contagem. O que resolveria a dúvida está na descrição acima.",
  "md.needsHumanCheck": "Observações para uma pessoa conferir",
  "md.needsHumanCheckNote":
    "Vêm do comportamento da página, não de uma regra que passa ou falha. Não entram nesta contagem, e cada uma diz o que resolveria a dúvida.",
  "standing.blocked": "Barreiras críticas",
  "standing.blockedNote":
    "Pelo menos uma barreira impede que quem usa tecnologia assistiva consiga passar.",
  "standing.failing": "Com falhas",
  "standing.failingNote": "Sem barreiras críticas, mas outras ainda dificultam tarefas reais.",
  "standing.gaps": "Lacunas pequenas",
  "standing.gapsNote": "Nada sério foi encontrado automaticamente. O que restou é pequeno.",
  "standing.clean": "Nenhuma regra falhou",
  "standing.cleanNote":
    "Uma ferramenta não enxerga tudo, então os itens abaixo ainda precisam de uma pessoa.",
  "standing.kicker": "Como esta página está",
  "standing.pending": "Ainda verificando",
  "standing.pendingNote":
    "Os primeiros resultados chegaram. Teclado, viewport de celular, menus expandidos, movimento e regiões dinâmicas ainda estão sendo verificados, e qualquer um deles pode mudar a avaliação desta página.",
  "standing.issueCount": {
    one: "{count} problema {severity}",
    other: "{count} problemas {severity}",
  },
  "standing.staleTitle": "Pontuado com um modelo anterior",
  "standing.staleBody":
    "Este resultado foi gerado antes do modelo de pontuação atual, que deixa as observações fora da contagem. As contagens e a ordenação seguem as regras antigas. Audite a página de novo para pontuá-la com o modelo atual.",
  "priority.kicker": "O que corrigir primeiro",
  "priority.note": "Ordenado por quanto do peso restante da página cada grupo carrega.",
  "priority.share": "{share}% do que resta",
  "priority.elements": {
    one: "em {count} elemento",
    other: "em {count} elementos",
  },
  "priority.nothing": "Nada pesa contra esta página.",
  "summary.remaining": {
    one: " Resta {parts}, fora desta contagem.",
    other: " Restam {parts}, fora desta contagem.",
  },
  "summary.critical": {
    one: "{count} problema crítico impede algumas pessoas de avançar, então a página não atende ao nível AA da WCAG. Comece por ele.",
    other:
      "{count} problemas críticos impedem algumas pessoas de avançar, então a página não atende ao nível AA da WCAG. Comece por eles.",
  },
  "summary.serious": {
    one: "Nenhuma barreira crítica{scope}, mas {count} problema grave ainda deixa a página mais difícil de usar para quem depende de tecnologia assistiva.",
    other:
      "Nenhuma barreira crítica{scope}, mas {count} problemas graves ainda deixam a página mais difícil de usar para quem depende de tecnologia assistiva.",
  },
  "summary.moderatePartial": "Apenas problemas moderados entre as verificações que rodaram.",
  "summary.moderate": "Bom resultado. Restam apenas problemas moderados para ajustar.",
  "summary.cleanPartial":
    "Nenhuma falha WCAG pontuada entre as verificações que rodaram. Como parte delas não rodou aqui, isso não significa que a página está livre de barreiras.",
  "summary.cleanNoFailures": "Nenhuma falha WCAG pontuada foi encontrada.",
  "summary.excellent": "Excelente. Nenhum problema detectado automaticamente nesta página.",

  "finding.kind.keyboard": "Teclado",
  "finding.kind.targetSize": "Tamanho do alvo",
  "finding.kind.reducedMotion": "Movimento reduzido",
  "finding.kind.liveRegions": "Regiões dinâmicas",
  "finding.kind.context": "Responsivo e dinâmico",
  "finding.kind.bestPractice": "Boas práticas",
  "finding.kind.manualReview": "Revisão manual",
  "finding.contextOnly":
    "Encontrado só neste contexto ({where}). Não falha no primeiro carregamento em desktop.",

  "review.generic.how":
    "Os testes automáticos não conseguiram decidir este caso, então uma pessoa precisa confirmar.",
  "review.generic.s1":
    "Inspecione cada elemento afetado nas ferramentas de desenvolvedor do navegador",
  "review.generic.s2": "Compare com o critério de sucesso da WCAG indicado aqui",
  "review.generic.s3": "Confirme se funciona como esperado para quem usa leitor de tela e teclado",

  "review.contrast.how":
    "O verificador não conseguiu ler o que está atrás deste texto. Normalmente é uma imagem de fundo, um gradiente, uma camada translúcida ou um elemento sobreposto.",
  "review.contrast.s1": "Olhe o texto sobre o fundo real, já renderizado",
  "review.contrast.s2": "Colete as cores do texto e do fundo com um conta-gotas",
  "review.contrast.s3":
    "Confirme pelo menos 4,5:1 (3:1 para texto grande, ou seja, 24px ou mais, ou 18,66px em negrito ou mais)",

  "review.linkInText.how":
    "Links dentro de um bloco de texto precisam ser distinguíveis sem depender só de cor.",
  "review.linkInText.s1":
    "Dê ao link uma pista que não seja cor, como um sublinhado (a opção mais segura)",
  "review.linkInText.s2":
    "Se for só cor, confirme pelo menos 3:1 de contraste em relação ao texto ao redor",
  "review.linkInText.s3": "Confirme uma mudança visível no hover e no foco por teclado",

  "review.scrollable.how":
    "Esta região rola, então quem usa teclado precisa conseguir alcançá-la e rolá-la.",
  "review.scrollable.s1": "Use Tab até chegar à região e tente rolar com as setas",
  "review.scrollable.s2": 'Se não for alcançável, acrescente tabindex="0" ao contêiner de rolagem',
  "review.scrollable.s3":
    "Garanta que o conteúdo interno continue alcançável em uma ordem que faça sentido",

  "review.nameMismatch.how":
    "O rótulo visível e o nome acessível são diferentes, e isso faz o controle por voz falhar para quem diz o que está vendo.",
  "review.nameMismatch.s1": "Compare o texto visível com o aria-label / aria-labelledby",
  "review.nameMismatch.s2": "Garanta que o nome acessível contenha o texto visível, na mesma ordem",
  "review.nameMismatch.s3": "Prefira remover o aria-label e deixar o texto visível ser o nome",

  "review.frame.how": "Esta página incorpora um <iframe> que o axe não consegue enxergar.",
  "review.frame.s1": "Dê ao <iframe> um atributo title curto e descritivo",
  "review.frame.s2":
    "Audite a página incorporada separadamente, já que o conteúdo dela não é verificado aqui",

  "review.tableHeader.how":
    "O axe não conseguiu confirmar que este cabeçalho de tabela está ligado às suas células de dados.",
  "review.tableHeader.s1": "Confirme se é mesmo uma tabela de dados, e não de layout",
  "review.tableHeader.s2":
    "Dê a cada cabeçalho um scope (col/row), ou ligue as células com headers/id",

  "review.autocomplete.how": "O valor de autocomplete não pôde ser validado automaticamente.",
  "review.autocomplete.s1":
    "Verifique se o propósito do campo corresponde a um token válido de autocomplete",
  "review.autocomplete.s2":
    "Use tokens padrão (name, email, tel, etc.) para os navegadores conseguirem preencher",

  "review.orientation.how": "A página pode travar o conteúdo em uma única orientação de tela.",
  "review.orientation.s1": "Gire o dispositivo ou emulador entre retrato e paisagem",
  "review.orientation.s2":
    "Confirme se o conteúdo e as funções continuam disponíveis nas duas orientações",

  "review.pAsHeading.how":
    "Um parágrafo está estilizado para parecer um título (negrito ou grande).",
  "review.pAsHeading.s1": "Se ele introduz uma seção, transforme em um título real, de <h1> a <h6>",
  "review.pAsHeading.s2": "Se for só texto em destaque, pode ignorar este caso",

  "review.nested.how":
    "Um controle interativo parece aninhado dentro de outro (por exemplo, um botão dentro de um link).",
  "review.nested.s1": "Confirme que não há controles focalizáveis dentro de outros controles",
  "review.nested.s2": "Simplifique a marcação para que cada controle fique separado",

  "home.lens.frameLabel": "Captura \u00b7 escala 43%",

  "home.md.filename": "accesscheck-aurora-coffee-com.md",
  "home.md.line1": "## aurora-coffee.com · Com falhas",
  "home.md.line2": "| severidade | problemas | elementos |",
  "home.md.line3": "| grave    | 1 | 7 |",
  "home.md.line4": "| moderado | 2 | 2 |",
  "home.md.line5": "### Corrija primeiro",
  "home.md.line6": "1. color-contrast · 1.4.3 · correção testada",

  "focusPath.insideScroller": "dentro de uma área rolável",
  "capture.markerHint": "Selecione uma marca para abrir o problema dela.",
  "detail.sharedColorPair": {
    one: "{count} ocorrência tem o mesmo par de cores detectado.",
    other: "{count} ocorrências têm o mesmo par de cores detectado.",
  },
  "capture.frameLabel": "Captura \u00b7 {width} \u00d7 {height}",
  "provenance.engine": "Chromium headless \u00b7 axe-core com as regras WCAG A e AA",
  "provenance.viewportNote": " \u00b7 captura feita em {viewport}",
  "provenance.finishedIn": " em {seconds}s",
  "provenance.finishedInStandalone": " \u00b7 concluída em {seconds}s",
  "provenance.sandboxNote":
    "As correções são aplicadas e revertidas em uma cópia, então o site auditado nunca é alterado.",
  "report.wcagDependsOn": {
    one: "Este resultado cobre só o que uma ferramenta decide sozinha. Atender à WCAG também depende do item de revisão manual listado na página 3.",
    other:
      "Este resultado cobre só o que uma ferramenta decide sozinha. Atender à WCAG também depende dos {count} itens de revisão manual listados na página 3.",
  },
  "home.lens.frameLabelFull":
    "Evidências \u00b7 aurora-coffee.com \u00b7 1200 \u00d7 800 \u00b7 escala 43%",

  "capture.notCaptured": "Ainda não capturada",
  "capture.notAvailable": "Indisponível",
  "capture.siteAuditNote": "A auditoria de site lê todas as páginas sem parar para capturá-las.",
  "capture.failed": "Não foi possível tirar a captura desta vez.",
  "capture.runFullNote":
    "Os problemas desta página estão completos. Rode a auditoria completa para incluir a captura, as marcas e o caminho do foco.",
  "capture.unaffected": "Os problemas desta página não são afetados. Só a captura está faltando.",
  "capture.runFull": "Rodar auditoria completa",
  "capture.tryAgain": "Tentar de novo",
  "capture.beingTaken": "Captura \u00b7 sendo tirada",
  "capture.screenshot": "Captura de tela",

  "results.auditedMinutesAgo": "Auditada há {minutes} min",
  "results.auditedAt": "Auditada em {when}",
  "phase.preparing": "preparando",
  "phase.loading": "abrindo a página",
  "phase.auditing": "rodando as verificações",
  "phase.processing": "processando os resultados",
  "phase.finalizing": "finalizando",
  "results.scanningStatus": "Auditando {url}. No momento: {phase}.",
  "report.roadmap.immediateTerm": "Imediato · em até 1 semana",
  "report.roadmap.immediateTitle": "Resolver os problemas críticos",
  "report.roadmap.immediateBody": {
    one: "Elimine primeiro o problema crítico. É o que mais pesa.",
    other: "Elimine primeiro os {count} problemas críticos. São os que mais pesam.",
  },
  "report.roadmap.shortTerm": "Curto prazo · 2 a 4 semanas",
  "report.roadmap.shortTitle": "Tratar os problemas graves",
  "report.roadmap.shortBody": {
    one: "Resolva o problema grave nos templates e componentes compartilhados.",
    other: "Resolva os {count} problemas graves nos templates e componentes compartilhados.",
  },
  "report.roadmap.longTerm": "Longo prazo · 1 a 3 meses",
  "report.roadmap.longTitle": "Refinar e auditar de novo",
  "report.roadmap.longBody":
    "Elimine os itens moderados restantes, faça a revisão manual e rode a auditoria de novo.",
  "report.noModerate": "Nenhum problema moderado.",

  "report.phase.preparing": "Iniciando um navegador e preparando a página.",
  "report.phase.loading": "Abrindo a página e deixando terminar de carregar.",
  "report.phase.auditing": "Rodando as verificações WCAG na página carregada.",
  "report.phase.processing":
    "Agrupando os problemas e associando cada um a um critério de sucesso da WCAG.",
  "report.phase.finalizing": "Pontuando e montando o relatório.",
  "report.freshNote": "O relatório vem de uma auditoria nova desta página, feita agora.",
  "report.buildFailed": "Não conseguimos gerar o relatório. Tente de novo.",
  "report.buildFailedTitle": "Não foi possível gerar o relatório",
  "report.newAudit": "Nova auditoria",
  "report.fixFirst": "Corrija primeiro",
  "report.buildingStatus": "Gerando o relatório de {url}. {detail}",

  "report.wcagLevelsChecked": "Níveis WCAG verificados",
  "report.internalScoreFooter": "Auditoria automática · não é uma declaração de conformidade",
  "report.pageOf": "WCAG A e AA \u00b7 Página {page} / 3",
  "report.headerTitle": "Relatório de acessibilidade \u00b7 {host}",
  "report.pagePassed": "A página passou em",
  "report.automatedChecks": "verificações automáticas",
  "report.passedLabel": "Aprovadas",
  "report.auditDate": "Data da auditoria",
  "report.auditDuration": "Duração da auditoria",
  "report.elementsChecked": "Elementos verificados",
  "report.exportedTitle": "Relatório de acessibilidade exportado",
  "report.executiveSummary": "Resumo executivo",
  "report.priorityRoadmap": "Roteiro de prioridades",
  "report.suggestedFix": "Correção sugerida",
  "report.element": "Elemento",
  "report.elementsAffected": "Elementos afetados",
  "report.criterion": "Critério",
  "report.backToResults": "Voltar para os resultados",
  "report.savePdf": "Salvar PDF",
  "report.printOrSavePdf": "Imprimir / Salvar em PDF",

  "results.reportView": "Visualização do relatório",
  "results.exportMarkdown": "Exportar Markdown",
  "results.exportPdf": "Exportar PDF",
  "results.newAudit": "Nova auditoria",
  "results.viewFinding": "Ver o problema",
  "results.findingsCount": "Problemas \u00b7 {count}",
  "results.nothingToFix": "Nenhuma verificação automática encontrou falha nesta página.",
  "chip.fails": "reprova em {sc}",
  "chip.noFailures": "sem falhas",
  "chip.notEvaluated": "não avaliado",
  "results.auditedJustNow": "Auditada agora mesmo",
  "results.backToSite": "Voltar para a auditoria do site",
  "results.siteAudit": "Auditoria do site",
  "results.reauditPage": "Auditar esta página de novo",
  "results.reaudit": "Auditar de novo",
  "results.stepsNote":
    "São os passos que o AccessCheck executa de fato, na ordem em que acontecem.",
  "results.partialReport": "Relatório parcial",
  "results.partialNote":
    "Este resultado cobre só o que conseguimos medir. O que ficou de fora está listado abaixo, sem estimativas.",

  "home.lens.locatedOccurrence": "Ocorrência localizada",
  "home.lens.verifiedInSandbox": "Testado em uma cópia da página",
  "home.lens.measurement": "Medição",
  "home.lens.measuredLabel": "medido",
  "home.lens.minLabel": "vs. mínimo",
  "home.lens.shareThisColor": {
    one: "{count} elemento usa esta cor",
    other: "{count} elementos usam esta cor",
  },
  "home.lens.suggestedFix": "Correção sugerida",
  "home.lens.sandbox": "Cópia da página",
  "home.lens.before": "Antes",
  "home.lens.after": "Depois",

  "stages.opening": "Abrindo a página e esperando que ela estabilize",
  "stages.rules": "Rodando as verificações WCAG A e AA (axe-core)",
  "stages.testingFixes": "Testando correções em uma cópia da página",
  "stages.screenshot": "Tirando a captura de tela",
  "stages.keyboardMobile": "Verificações de teclado e celular",

  "site.upTo": "de até {seconds}s",
  "site.findingPages": "Procurando páginas em {host}: {elapsed}s de até {budget}s",
  "site.readingSitemap": "Lendo o sitemap",
  "site.followingLinks": "Seguindo os links da página inicial",
  "site.choosingPages": "Escolhendo as páginas para auditar",
  "site.startFailed": "Não conseguimos iniciar a auditoria do site. Tente de novo.",
  "site.startFailedTitle": "Não foi possível iniciar a auditoria do site",
  "site.crawlProgress": "Andamento da auditoria do site: {done} de {total} páginas auditadas",

  "form.addressLabel": "Endereço do site a auditar",
  "form.addressHint": "Digite um endereço da web para auditar, como example.com.",
  "form.whatToAudit": "O que auditar",

  "results.couldNotOpen": "Não foi possível abrir a página",
  "results.tryAnotherUrl": "Tentar outro endereço",
  "results.seeWhatWeAudit": "Veja o que conseguimos auditar",
  "results.runAgainMoreTime": "Rodar de novo com mais tempo",
  "results.quickFromSite": "Resultado rápido da auditoria do site.",
  "results.showOnScreenshot": "Mostrar na captura",
  "results.takingScreenshot": "Tirando a captura de tela da página.",

  "site.tryAnotherAddress": "Tentar outro endereço",
  "site.auditJustThisPage": "Auditar só esta página",
  "site.listNote":
    "Montamos a lista a partir do sitemap e dos links que conseguimos alcançar, e depois auditamos cada página.",

  "report.sandboxApplied": "Testada em uma cópia da página. O site auditado não foi alterado.",
  "report.whereScoreCouldGo": "Até onde esta página pode chegar",
  "report.projectionBody":
    "Com os problemas críticos e graves resolvidos, a avaliação desta página seria",
  "report.accessibilityReport": "Relatório de acessibilidade",
  "report.detailedFindings": "Problemas detalhados",
  "report.noSeriousOnPage":
    "Nenhuma falha crítica ou grave detectada automaticamente nesta página. Itens moderados e revisão manual estão na página 3.",
  "report.sectionTwo": "Seção 02",

  "wcagReading.notEvaluated": "Não avaliado. O AccessCheck cobre os níveis A e AA",
  "wcagReading.internalNote":
    "Este resultado cobre as regras que uma ferramenta consegue decidir. A conformidade com a WCAG também depende de verificações que nenhuma ferramenta automática resolve sozinha.",
  "ratio.minAA": "{value} mín. AA",
  "ratio.fixedAt": "{value} corrigido",
  "ratio.minAAWithFix": "mín. AA {required}:1 \u00b7 corrigido {fixed}:1",
  "ratio.ariaLabel": "Contraste de {found} para 1, mínimo de {required} para 1",
  "ratio.ariaLabelFixed": ", a correção alcança {fixed} para 1",
  "score.ariaLabel": "Ordenação de prioridade: {score} de 100",
  "home.cta.notConformance": "Auditoria automática · não é uma declaração de conformidade",

  "home.hero.standards": "axe-core \u00b7 WCAG 2.0 / 2.1 / 2.2 \u00b7 níveis A e AA",
  "home.footerStandards": "axe-core \u00b7 Playwright \u00b7 WCAG A e AA",
  "home.cta.standards":
    "AccessCheck \u00b7 axe-core \u00b7 Playwright \u00b7 WCAG 2.0 / 2.1 / 2.2 níveis A e AA",
  "home.lens.measureFound": "a medição encontrada",
  "home.lens.exactSelector": "o seletor exato",
  "home.lens.reauditedInCopy": "testada em uma cópia",
  "form.scopePage": "Página",
  "form.scopeSite": "Site",
  "home.hero.title": "Localize o problema. Entenda a causa. Teste a correção.",
  "home.hero.passes": "+ verificações de teclado, viewport e movimento",
  "home.hero.body":
    "Cole o endereço de uma página e veja os problemas de acessibilidade diretamente onde eles acontecem. O inspetor destaca cada elemento, mostra a razão de contraste e o seletor CSS e ainda apresenta uma correção testada em uma cópia da própria página.",
  "home.hero.lensNote":
    "Selecione um problema e a marca dele acende na captura. Clique na marca e os detalhes abrem: imagem, medição e código no mesmo lugar.",
  "home.lens.title": "Veja a barreira no elemento que a causou",
  "home.lens.body":
    "Elemento, seletor, medição e diagnóstico aparecem conectados. Ao selecionar um problema, a marca correspondente é destacada e mostra a razão de contraste. As outras ficam com contorno tracejado, então dá para diferenciá-las sem depender só da cor.",
  "home.lens.contrastStory":
    "O texto branco no botão verde-claro some para quem tem baixa visão ou para qualquer pessoa sob sol forte. E esse é o botão de finalizar a compra.",
  "home.lens.sandboxNote": "Testado em uma cópia da página. O aurora-coffee.com não foi alterado.",
  "home.form.exportNote": "Exporte em PDF ou Markdown",
  "home.demo.roasted": "Torrado no Porto toda terça e enviado na mesma semana.",
  "home.demo.navMenu": "Cardápio",
  "home.demo.navBeans": "Grãos",
  "home.demo.headline": "Torra lenta,",
  "home.demo.headlineRest": "em pequenos lotes, desde 2011",
  "home.demo.order": "Peça agora",

  "home.mostRecent": "Auditoria pública mais recente · como a página está",
  "home.auditSite": "Auditar site",
  "home.auditPage": "Auditar página",
  "home.timing": "De 10 a 25 segundos por página",
  "home.quickExamples": "Exemplos rápidos:",
  "home.stage.open": "Abrir",
  "home.stage.locate": "Localizar",
  "home.stage.verify": "Testar",
  "home.stage.browserReady": "Chromium \u00b7 axe-core injetado \u00b7 página estabilizada",
  "home.axeRules.kicker": "regras do axe-core",
  "home.axeRules.note": "aprova ou reprova, sem margem para interpretação",
  "home.axeRules.countLine1": "critérios de sucesso",
  "home.axeRules.countLine2": "verificados automaticamente",
  "home.complementary.kicker": "verificações complementares",
  "home.complementary.note": "o que uma ferramenta não julga sozinha",
  "home.complementary.countLine1": "verificações que vão",
  "home.complementary.countLine2": "além do DOM estático",

  "results.checksPassedLabel": "verificações automáticas aprovadas",
  "results.stillChecking": "ainda verificando…",
  "results.focusOnContainer": "conferir foco",
  "results.measuredNeeds": "{measured}:1 \u00b7 mínimo {required}:1",
  "results.runFullAuditNote":
    "A captura de tela, as verificações de teclado e o teste das correções vêm com a auditoria completa.",
  "results.siteAuditPassNote":
    "Resultado da auditoria de site: regras do axe e as verificações próprias do AccessCheck. A verificação de teclado, o conteúdo expandido e o teste das correções rodam na auditoria completa da página.",
  "wcagReading.failsBy": "Reprova em",

  "home.howItWorks.kicker": "Como funciona",
  "home.howItWorks.title": "Abrir a página, localizar o problema, testar a correção",
  "home.checks.kicker": "Verificações incluídas",
  "home.checks.title":
    "Verificações automáticas e orientações para o que precisa de análise manual",
  "home.sandbox.kicker": "Teste em uma cópia",
  "home.sandbox.title": "Cada correção é testada em uma cópia. Seu site permanece intacto.",
  "home.sandbox.body":
    "Aplicamos a mudança em uma cópia da página, rodamos a verificação de novo e depois desfazemos. Se o problema deixa de aparecer, a correção é marcada como testada. Isso não é garantia, e o site original nunca é alterado.",
  "home.sandbox.nearestPassing": "a luminosidade aprovada mais próxima, no mesmo matiz",
  "home.sandbox.measurement": "Medição de contraste \u00b7 1.4.3 AA",
  "home.sandbox.found": "encontrado \u00b7 o mínimo para texto normal é {required}:1",
  "home.export.kicker": "Exportação",
  "home.export.title": "Duas exportações, dois públicos: quem decide e quem corrige",
  "home.export.pdfFor": "para quem decide",
  "home.export.pdfTitle": "Avaliação, prioridades e impacto em linguagem simples",
  "home.export.pdfBody":
    "Resumo, níveis de severidade e o impacto de cada problema nas pessoas. Pronto para enviar a um cliente ou ao time de produto, sem exigir contexto técnico.",
  "home.export.mdFor": "para quem corrige",
  "home.export.mdTitle": "Seletor, trecho de código e status da correção",
  "home.export.mdBody":
    "Tabela de severidade e lista priorizada, prontas para colar em um ticket ou pull request, já com as correções testadas marcadas.",

  "home.cta.measured": "Medido",
  "home.cta.located": "Localizado",
  "home.cta.verified": "Testado",
  "home.cta.title": "Audite uma página agora e veja onde está cada barreira",
  "home.cta.body": "O relatório fica pronto em menos de meio minuto e sai em PDF ou Markdown.",
  "home.form.useExtension": "Audite a aba em que você está com a extensão do Chrome",
  "home.cta.publicOnly":
    "Só conseguimos auditar páginas públicas. Endereços privados ou internos serão recusados.",

  "home.rule.contrast": "Contraste do texto sobre o fundo calculado",
  "home.rule.alt": "Alternativas textuais para imagens e ícones",
  "home.rule.name": "Nome acessível para campos, botões e controles ARIA",
  "home.rule.headings": "Ordem de títulos e relações estruturais",
  "home.rule.linkPurpose": "Propósito de link ambíguo ou sem rótulo",
  "home.rule.targetSize": "Tamanho mínimo do alvo",
  "home.rule.lang": "Idioma declarado da página",
  "home.rule.zoom": "Viewport que não bloqueia o zoom",

  "home.pass.keyboard": "Teclado",
  "home.pass.keyboardDesc":
    "Percorre a página com Tab para conferir a ordem de foco, armadilhas de teclado e indicadores de foco invisíveis",
  "home.pass.context": "Contexto",
  "home.pass.contextDesc":
    "Verifica a página de novo em tamanho de celular e depois de abrir menus e seções expansíveis",
  "home.pass.motion": "Movimento",
  "home.pass.motionDesc":
    "Verifica se a página respeita a preferência de movimento reduzido de quem acessa",
  "home.pass.live": "Dinâmico",
  "home.pass.liveDesc": "Observa atualizações anunciadas a leitores de tela (regiões dinâmicas)",
  "home.pass.review": "Revisão",
  "home.pass.reviewDesc":
    "Lista o que uma pessoa ainda precisa conferir, com o passo a passo para confirmar",

  "home.step1.title": "Aberta em um navegador real",
  "home.step1.body":
    "Abrimos a página em um navegador real, esperamos ela terminar de carregar e só então rodamos os testes do axe-core. Funciona inclusive em sites com política de segurança restritiva (CSP).",
  "home.step2.title": "Cada problema é medido e ligado a um elemento",
  "home.step2.body":
    "Razão de contraste, seletor CSS, trecho de código e posição na captura de tela. Problemas repetidos ficam agrupados, então uma correção só já resolve vários elementos.",
  "home.step3.title": "Cada correção é testada antes de ser sugerida",
  "home.step3.body":
    "Aplicamos a mudança em uma cópia da página, rodamos a verificação de novo e marcamos a correção como testada ou como pendente de revisão.",

  "home.example.title": "Texto abaixo do contraste mínimo",
  "home.example.summary":
    "Nenhuma barreira crítica, mas 1 problema grave ainda deixa a página mais difícil de usar para quem depende de tecnologia assistiva.",

  "impact.contrast":
    "Pessoas com baixa visão ou sensibilidade reduzida ao contraste podem não conseguir ler este texto, principalmente em telas de baixa qualidade ou sob luz forte.",
  "impact.alt":
    "Quem usa leitor de tela não recebe nada no lugar de uma imagem que deveria comunicar algo: ouve o nome do arquivo, ou silêncio, em vez do conteúdo.",
  "impact.name":
    "Quem usa leitor de tela ouve só o tipo do elemento (\u201clink\u201d, \u201cbotão\u201d, \u201ccampo\u201d) sem ideia do que ele faz, então não consegue decidir se aciona ou não.",
  "impact.lang":
    "O leitor de tela aplica as regras de pronúncia erradas, então a página é lida com o sotaque ou o idioma errado e pode ficar incompreensível.",
  "impact.title":
    "O título da página é a primeira coisa que um leitor de tela anuncia, e o rótulo mostrado em abas, histórico e favoritos. Sem ele, não dá para distinguir as páginas.",
  "impact.zoom":
    "Bloquear o zoom por pinça impede quem tem baixa visão de ampliar o texto, recurso do qual muita gente depende para conseguir ler no celular.",
  "impact.headingOrder":
    "Quem usa leitor de tela navega pelos níveis de título para percorrer a página, então um nível pulado ou fora de ordem torna a estrutura enganosa e esconde onde as seções começam.",
  "impact.headingOne":
    "Sem um título de primeiro nível, quem usa leitor de tela não tem referência confiável de \u201cdo que trata esta página\u201d e não consegue pular para o conteúdo principal por título.",
  "impact.landmark":
    "As regiões de referência (landmarks) deixam quem usa leitor de tela pular direto para a navegação, o conteúdo principal ou o rodapé. Conteúdo fora delas só é alcançado lendo a página inteira em ordem.",
  "impact.list":
    "Leitores de tela informam quantos itens há em uma lista e permitem navegar entre eles. Quando a estrutura da lista está incorreta, essas informações e opções de navegação podem ser perdidas.",
  "impact.aria":
    "ARIA incorreto ou incompleto faz a tecnologia assistiva anunciar o papel ou o estado errado, o que costuma ser pior do que não ter ARIA nenhum.",
  "impact.duplicateId":
    "Ids duplicados quebram as ligações entre rótulos, controles e referências ARIA, então o elemento errado é anunciado ou acionado.",
  "impact.frame":
    "Quem usa leitor de tela ouve um iframe sem rótulo, sem saber o que há dentro, e pode acabar pulando conteúdo importante.",
  "impact.focusVisible":
    "Quem enxerga e navega por teclado perde a noção de onde está na página quando o indicador de foco some, e não sabe qual controle está prestes a acionar.",
  "impact.focusOrder":
    "Quando a ordem do Tab não segue a ordem visual, quem usa teclado e leitor de tela é jogado de um lado para o outro da página e pode perder ou repetir conteúdo.",
  "impact.keyboardTrap":
    "Quem usa teclado fica preso: o foco entra em um componente e não consegue sair, então o resto da página fica inalcançável sem mouse.",
  "impact.tabindex":
    "Um tabindex positivo sobrepõe a ordem natural, então o foco do teclado pula de forma imprevisível e passa por cima de controles vizinhos.",
  "impact.reachable":
    "Estes controles não são alcançáveis por teclado, então quem não usa mouse simplesmente não consegue operá-los.",
  "impact.targetSize":
    "Alvos de toque pequenos são mais difíceis de acionar, especialmente para pessoas com dificuldade de coordenação motora, dedos maiores ou que estejam usando o dispositivo em movimento.",
  "impact.motion":
    "Quem ativou \u201creduzir movimento\u201d (muitas vezes porque animação provoca náusea ou vertigem) continua recebendo movimento que pediu ao sistema para suprimir.",
  "impact.live":
    "Quem usa leitor de tela perde atualizações como erros, confirmações e contagens, porque a região que deveria anunciá-las não está configurada para isso.",
  "impact.generic":
    "Quem usa tecnologia assistiva encontra aqui uma barreira que quem enxerga e usa mouse não encontra, então a mesma tarefa fica mais difícil ou impossível.",

  "fix.describeField": "Descreva este campo",
  "fix.describeControl": "Descreva este controle",
  "fix.descriptivePageTitle": "Título descritivo da página",
  "fix.labelWithId":
    'Este {tag} não tem nome acessível. Adicione um <label> ligado pelo id ("{id}") para os leitores de tela anunciarem.',
  "fix.labelNoId":
    "Este {tag} não tem id para ligar a um <label>. Adicione um aria-label (ou dê a ele um id e um <label for>) para que tenha nome acessível.",
  "fix.htmlLang":
    "O elemento <html> não tem atributo lang, então a tecnologia assistiva não sabe em que idioma ler. Defina o idioma principal da página.",
  "fix.documentTitle":
    "A página não tem <title>, a primeira coisa que os leitores de tela anunciam e o rótulo que os navegadores mostram em abas e histórico. Adicione um título descritivo.",
  "fix.metaViewport":
    "A meta tag viewport bloqueia o zoom por pinça, do qual quem tem baixa visão depende. Remova user-scalable=no e qualquer maximum-scale abaixo de 5.",
  "fix.ariaName":
    'Este {noun} não tem nome acessível, então os leitores de tela anunciam apenas "{noun}". Adicione texto visível dentro dele, ou um aria-label.',
  "fix.nounLink": "link",
  "fix.nounButton": "botão",
  "fix.ariaRequired":
    "O papel deste elemento exige atributos ARIA que estão faltando: {attrs}. Adicione cada um com um valor válido.",
  "fix.ariaNotAllowed":
    "Estes atributos ARIA não são permitidos neste elemento e devem ser removidos (ou mude o papel do elemento para um que os permita): {names}.",
  "fix.ariaRemove": "Remover: {names}",
  "fix.imageAltGuess":
    'Esta imagem não tem texto alternativo. Há uma descrição sugerida abaixo. Confirme se corresponde à imagem, ou use alt vazio ("") se ela for puramente decorativa.',
  "fix.imageAltNoGuess":
    'Esta imagem não tem texto alternativo. Adicione uma descrição curta se ela for significativa, ou um alt vazio ("") se for decorativa, para os leitores de tela pularem.',
  "fix.contrastWas": "(era {measured}:1, precisa de {required}:1)",
  "fix.contrastHueKept": " O matiz continua o mesmo, só a luminosidade muda.",
  "fix.contrastHueShifted":
    " (o matiz foi puxado para o neutro para atingir o contraste necessário sobre este fundo)",
  "fix.contrastForeground":
    "Troque a cor do texto {from} por {to} → {ratio}:1 sobre {bg} {was}.{hueNote}",
  "fix.contrastAlsoBackground": " Ou mantenha o texto e defina o fundo como {bg}.",
  "fix.contrastBackground":
    "A cor de texto {fg} não chega a {required}:1 sobre {bg} mudando só o texto. Defina o fundo como {newBg} → {ratio}:1 {was}. O matiz do fundo continua o mesmo, só a luminosidade muda.",
  "fix.contrastNeither":
    "A cor de texto {fg} sobre {bg} alcança apenas {measured}:1 (precisa de {required}:1). Nem o texto nem o fundo resolvem só pela luminosidade nesses matizes, então escolha um par mais escuro ou mais claro.",

  "fix.headingOne.action":
    "Adicione um <h1> que descreva o propósito principal da página, no início do conteúdo primário, antes do texto introdutório.",
  "fix.headingOne.caution":
    "Não adicione um título vazio ou escondido visualmente só para calar a regra, a menos que isso corresponda de fato à estrutura da página.",
  "fix.headingOrder.action":
    "Mude o título sinalizado para que os níveis só aumentem de um em um (h2 para h3, nunca h2 para h4). Renumere pela estrutura, não pelo tamanho visual, e use CSS para dimensionar.",
  "fix.headingOrder.caution":
    "Nunca pule um nível para conseguir uma fonte menor. Estilize o nível correto.",
  "fix.landmark.action":
    "Coloque o conteúdo principal dentro de um <main>. Mantenha a navegação do site em <nav>, a marca e a apresentação em <header> e as informações finais em <footer>, para que cada parte da página fique dentro de uma região de referência.",
  "fix.list.action":
    "Garanta que todo <li> seja filho direto de um <ul> ou <ol> (e que nada além de <li> fique diretamente dentro deles). Não simule listas com <div>s e marcadores.",
  "fix.duplicateId.action":
    "Dê ao elemento sinalizado um id único. Se vários controles compartilham um rótulo, aponte cada referência de label/aria para o próprio id em vez de reutilizar um só.",
  "fix.frame.action":
    "Adicione ao <iframe> um atributo title curto e descritivo dizendo o que ele contém.",
  "fix.focusVisible.action":
    "Dê aos elementos interativos um estilo de foco claramente visível. Estilize :focus-visible em vez de remover contornos. Nunca use outline: none sem uma substituição.",
  "fix.focusVisible.caution":
    "Não dependa só de mudança de cor. Mantenha um contorno ou box-shadow visível.",
  "fix.focusOrder.action":
    "Coloque os elementos no DOM na ordem em que as pessoas devem percorrê-los com Tab, e remova valores positivos de tabindex para que o foco siga a ordem do código.",
  "fix.keyboardTrap.action":
    "Garanta que o foco consiga sair do componente com Tab / Shift+Tab (e Esc para diálogos). Gerencie o foco em JS para que ele volte a um lugar que faça sentido quando o componente fechar.",
  "fix.tabindex.action":
    'Remova valores de tabindex maiores que 0. Use tabindex="0" para tornar um controle personalizado focalizável, ou -1 para focá-lo por código. Nunca use números positivos.',
  "fix.reachable.action":
    'Faça de cada controle um elemento focalizável nativo: use <button>/<a> em vez de uma <div> clicável, ou acrescente tabindex="0" e eventos de teclado ao controle personalizado.',
  "fix.targetSize.action":
    "Dê ao alvo pelo menos 24×24px de área de toque (44×44 é mais seguro em telas sensíveis ao toque), ou deixe espaço suficiente ao redor. Aumente a área do controle com padding em vez de só aumentar um ícone.",
  "fix.motion.action":
    "Coloque as animações não essenciais dentro de uma media query prefers-reduced-motion, para desligá-las para quem pediu menos movimento.",
  "fix.live.action":
    'Anuncie atualizações dinâmicas por uma região dinâmica: coloque o texto de status em um elemento com aria-live="polite" (ou role="status"), e os erros em aria-live="assertive".',

  "marker.bestPractice":
    "Boa prática, registrada como cobertura. Não se refere a um único elemento posicionado.",
  "marker.context":
    "Encontrado em outro contexto (tamanho de celular ou um estado aberto), então não está na captura de desktop.",
  "marker.keyboard":
    "Veio da verificação de teclado, então aparece no caminho do foco em vez de virar uma marca.",
  "marker.docLevel":
    "Aplica-se ao documento inteiro ou à estrutura da página, não a um único elemento posicionado.",
  "marker.shadowRoot":
    "O elemento afetado está dentro de um shadow root, que as marcas na página não alcançam.",
  "marker.offCapture":
    "O elemento afetado está numa parte da página que nenhuma captura deste relatório cobre, está oculto, ou não tem caixa visível.",

  "wcag.1.1.1": "Conteúdo não textual",
  "wcag.1.3.1": "Informações e relações",
  "wcag.1.3.5": "Identificar o propósito da entrada",
  "wcag.1.4.1": "Uso de cores",
  "wcag.1.4.3": "Contraste (mínimo)",
  "wcag.1.4.4": "Redimensionar texto",
  "wcag.1.4.10": "Refluxo",
  "wcag.1.4.11": "Contraste não textual",
  "wcag.2.1.1": "Teclado",
  "wcag.2.4.1": "Ignorar blocos",
  "wcag.2.4.2": "Página com título",
  "wcag.2.4.4": "Finalidade do link (no contexto)",
  "wcag.2.4.7": "Foco visível",
  "wcag.2.5.8": "Tamanho do alvo (mínimo)",
  "wcag.3.1.1": "Idioma da página",
  "wcag.3.3.2": "Rótulos ou instruções",
  "wcag.4.1.2": "Nome, função, valor",

  "severity.criticalDesc":
    "Bloqueia o acesso por completo para algumas pessoas que usam tecnologia assistiva.",
  "severity.seriousDesc": "Barreira grande. Muita gente não consegue concluir a tarefa.",
  "severity.moderateDesc": "Atrito perceptível, mas a tarefa continua possível.",
  "severity.minorDesc": "Item de acabamento, com impacto limitado.",

  "ssrf.privateAddress":
    "Este endereço é privado ou interno, então não podemos auditá-lo. Informe uma página pública da web.",
  "ssrf.invalidAddress": "Isso não parece um endereço da web válido. Confira e tente de novo.",
  "ssrf.onlyHttp":
    "Só páginas da web (endereços que começam com http ou https) podem ser auditadas.",
  "ssrf.notFound": "Não encontramos um site nesse endereço. Confira a grafia e tente de novo.",
  "report.projectionCaveat":
    ". É apenas uma projeção, não uma aprovação na WCAG. Atender à WCAG depende também dos itens moderados e da revisão manual.",
  "report.recommendations": "Recomendações",
  "report.wcagDisclaimer":
    "O AccessCheck roda o axe-core com as regras dos níveis A e AA da WCAG (2.0, 2.1 e 2.2). Os testes automáticos cobrem só parte dos critérios da WCAG. O restante exige a revisão de uma pessoa, muitas vezes com leitor de tela ou outra tecnologia assistiva. O nível AAA não é verificado, e este relatório não é uma declaração de conformidade.",
  "report.findingsIntro":
    "Cada problema aparece agrupado por severidade e associado ao critério de sucesso A/AA da WCAG, com o impacto nas pessoas, a medição quando existe e uma correção testada em uma cópia da página.",

  "site.theSite": "o site",
  "site.notFound": "Auditoria de site não encontrada.",
  "context.recheckShort": "Confira este elemento de novo no contexto em que ele falhou.",
  "context.recheckLong":
    "Confira este elemento de novo no contexto em que ele falhou. Nenhuma correção foi testada aqui.",

  "wcagReading.noA": "Nenhuma falha de nível A detectada automaticamente",
  "wcagReading.noAA": "Nenhuma falha de nível AA detectada automaticamente",
  "provenance.title": "Procedência",
  "provenance.complementary":
    "Verificações complementares: teclado, viewport de celular, interface expandida, movimento, regiões dinâmicas.",
  "stepper.previous": "Ocorrência anterior",
  "stepper.next": "Próxima ocorrência",
  "stepper.position": "Ocorrência {at} de {total}",
  "seal.verified": "Correção testada: aplicada por um instante, e a regra passou",
  "seal.needsReview": "Precisa de revisão: a sugestão sozinha não resolve",

  "site.score": "Nota do site",
  "site.runningAverage": "média parcial entre as páginas auditadas",
  "site.finalAverage": "média entre todas as páginas auditadas",
  "site.newAuditTitle": "Começar uma auditoria nova",
  "site.newAudit": "Nova auditoria",
  "site.fullAudit": "Auditoria de acessibilidade do site inteiro",
  "site.auditFailed": "A auditoria falhou",
  "site.noAutomatedFindings": "Nenhum problema detectado automaticamente",
  "site.noFindings": "Nenhum problema",
  "site.pageFailed": "Não foi possível auditar esta página.",

  "severity.critical": "Crítico",
  "severity.serious": "Grave",
  "severity.moderate": "Moderado",
  "severity.minor": "Leve",

  "detail.largeText": " (texto grande)",
  "detail.sampleText": "Texto de exemplo",
  "detail.verifiedOnElement": "Correção testada neste elemento",
  "detail.verifiedOnElementNote":
    "Passa no nível AA da WCAG: aplicada a este elemento por um instante e verificada de novo",
  "detail.calculatedNote":
    "Chegaria a {ratio}:1, calculado a partir das cores detectadas, sem teste na página",
  "detail.rule": "Regra",
  "detail.technicalSelector": "Seletor",
  "detail.humanDecision":
    "A mudança certa depende da estrutura da página, então confirme no contexto.",
  "detail.sandboxNote":
    "As correções são testadas em uma cópia da página. {host} não foi alterado.",
  "detail.pageNote":
    "A mudança foi aplicada nesta página por um instante e depois desfeita, deixando tudo como estava.",

  "verdict.label.verified": "Correção testada",
  "verdict.label.needsReview": "Precisa de revisão",

  "verdict.others": {
    one: "A outra ocorrência tem a mesma sugestão, mas não foi testada individualmente.",
    other: "As outras {count} ocorrências têm a mesma sugestão, mas não foram testadas uma a uma.",
  },
  "verdict.verifiedShared":
    "Aplicada por um instante em cada uma das {count} ocorrências, e a regra passou em todas.",
  "verdict.verifiedSingle": "Aplicada por um instante, e a regra passou.",
  "verdict.partial":
    "Testada em cada ocorrência e depois desfeita: {cleared} de {total} passaram e {failed} não. Revise as que continuam falhando.",
  "verdict.sampledOne":
    "A correção sugerida foi aplicada a um dos elementos e, após uma nova verificação, o problema não foi mais identificado. {others}",
  "verdict.sampledMany":
    "Testadas {reaudited} de {total} ocorrências, uma para cada correção sugerida, e depois a mudança foi desfeita: {cleared} passaram{failedTail}. {others}",
  "verdict.sampledFailedTail": " e {failed} não",
  "verdict.failedSubjectSingle": "Este elemento",
  "verdict.failedSubjectSampled": "O elemento representativo",
  "verdict.failedMeasured":
    "{subject} continua falhando depois da mudança sugerida: a nova cor chega a {ratio}:1 sobre o fundo detectado, mas a regra ainda sinaliza. O fundo real pode ser uma imagem, um gradiente ou uma camada sobreposta.{tail}",
  "verdict.failedPlain":
    "{subject} continua falhando com a mudança aplicada. Revise esse caso à mão.{tail}",
  "verdict.unverifiable":
    "Não deu para testar esta correção na página, porque o elemento sumiu ou o tempo acabou. Confira à mão.",
  "verdict.contextual":
    "Esta sugestão resolve a regra, mas só uma pessoa pode julgar se ela diz a coisa certa para esta página.",
  "verdict.noAutoFix":
    "Nenhuma correção automática se aplica aqui. A mudança certa depende da página, então precisa de uma pessoa.",
  "verdict.bestPractice":
    "Boa prática, não um critério de sucesso da WCAG. Vale corrigir, mas não entra no resultado da WCAG.",
  "verdict.complementary": "Corrija e audite de novo para confirmar.",

  "keyboard.region.offscreen": "fora do viewport visível",
  "keyboard.region.top": "perto do topo do viewport",
  "keyboard.region.middle": "no meio do viewport",
  "keyboard.region.bottom": "perto do fim do viewport",

  "keyboard.invisible.noOutline": "sem outline ({style}, {width})",
  "keyboard.invisible.boxShadow": "box-shadow sem mudança ({value})",
  "keyboard.invisible.border": "borda sem mudança ({width} {color})",
  "keyboard.invisible.background": "fundo sem mudança ({value})",
  "keyboard.invisible.component": "nada em volta mudou, nem o contêiner nem os ::before e ::after",
  "keyboard.invisible.reason": "O foco chegou a este elemento e nada mudou na tela.",
  "keyboard.invisible.measured": "{unchanged}.",
  "keyboard.invisible.title": {
    one: "Sem indicador de foco visível em {count} elemento",
    other: "Sem indicador de foco visível em {count} elementos",
  },
  "keyboard.invisible.desc": {
    one: "Quem usa teclado não consegue ver onde está na página.",
    other: "Quem usa teclado não consegue ver onde está na página.",
  },
  "keyboard.invisible.fix":
    "Dê a ele um estilo :focus-visible visível, como outline: 2px solid com outline-offset: 2px, em vez de remover o contorno.",

  "keyboard.unclear.title": {
    one: "{count} indicador de foco precisa ser conferido por uma pessoa",
    other: "{count} indicadores de foco precisam ser conferidos por uma pessoa",
  },
  "keyboard.unclear.desc": {
    one: "O foco chegou a este elemento, mas ele mesmo não mudou. Algo em volta pode ter mudado, então confira visualmente.",
    other:
      "O foco chegou a estes elementos, mas eles mesmos não mudaram. Algo em volta pode ter mudado, então confira visualmente.",
  },
  "keyboard.unclear.fix":
    "Navegue com Tab até cada um e observe. Se o destaque não apontar com clareza para o controle focado, dê ao controle um estilo :focus-visible próprio.",
  "keyboard.unclear.opaque":
    "O foco entrou no shadow root deste elemento, que esta versão não consegue ler, então nenhum indicador lá dentro foi medido.",
  "keyboard.unclear.occurrence": {
    one: "O elemento não mudou. Só {container} mudou, e ele também contém {count} outro controle.",
    other:
      "O elemento não mudou. Só {container} mudou, e ele também contém outros {count} controles.",
  },

  "keyboard.jump.up": "o foco voltou para cima na página",
  "keyboard.jump.back": "o foco voltou para a esquerda na mesma linha",
  "keyboard.jump.where": ', de {fromRegion} ("{fromLabel}") para {toRegion} ("{toLabel}")',
  "keyboard.jump.whereLabels": ', de "{fromLabel}" para "{toLabel}"',
  "keyboard.jump.measured": "A partir do topo do viewport: de {from}px para {to}px.",
  "keyboard.jump.measuredDown": "Ao longo da página: de {from}px para {to}px.",
  "keyboard.jump.measuredAcross": "Na largura da página: de {from}px para {to}px.",
  "keyboard.jump.measuredFromLeft": "A partir da esquerda do viewport: de {from}px para {to}px.",
  "keyboard.jump.reason": "Da parada {from} para a parada {to}, {movement}{where}.",

  "keyboard.trap.title": "O foco do teclado está preso",
  "keyboard.trap.desc":
    "Pressionar Tab deixou o foco no mesmo elemento. Quem usa teclado ou leitor de tela pode ficar preso aqui sem saída.",
  "keyboard.trap.fix":
    "Garanta que o elemento não capture o Tab. Se for um diálogo, faça o Esc fechá-lo e devolver o foco ao controle que o abriu.",
  "keyboard.trap.occurrence":
    "O Tab foi pressionado aqui e o foco não saiu do lugar, então a verificação não pôde seguir.",

  "keyboard.unreachable.title": {
    one: "{count} controle interativo não pode ser alcançado pelo teclado",
    other: "{count} controles interativos não podem ser alcançados pelo teclado",
  },
  "keyboard.unreachable.desc": {
    one: "{count} elemento funciona como controle, com um evento de clique ou um papel ARIA, mas o Tab nunca chega nele. Só quem usa mouse consegue usá-lo.",
    other:
      "{count} elementos funcionam como controles, com eventos de clique ou papéis ARIA, mas o Tab nunca chega neles. Só quem usa mouse consegue usá-los.",
  },
  "keyboard.unreachable.fix":
    'Use um controle nativo, como <button> ou <a href>, ou acrescente tabindex="0" e os eventos de teclado para que ele possa ser alcançado e usado.',
  "keyboard.unreachable.occurrence":
    "Este elemento funciona como controle, mas o Tab nunca parou nele. Confira se ele deveria ser utilizável.",

  "keyboard.order.title": {
    one: "A ordem de foco sai de sequência {count} vez",
    other: "A ordem de foco sai de sequência {count} vezes",
  },
  "keyboard.order.desc":
    "A ordem do Tab não segue a ordem em que a página é lida, então o foco volta para trás ou para cima. Cada salto só é um problema se fugir da ordem pensada para a página, então confira cada um visualmente.",
  "keyboard.order.fix":
    "Faça a ordem do DOM acompanhar a ordem visual e evite reordenar com CSS (order, row-reverse, posicionamento absoluto) ou com tabindex positivo.",

  "keyboard.tabindex.title": {
    one: "{count} elemento usa tabindex positivo",
    other: "{count} elementos usam tabindex positivo",
  },
  "keyboard.tabindex.desc":
    "Um tabindex positivo passa por cima da ordem natural de tabulação e costuma fazer o foco pular de forma confusa.",
  "keyboard.tabindex.fix":
    'Troque os valores positivos por tabindex="0", ou remova o atributo, e deixe a ordem do DOM definir a sequência.',
  "keyboard.tabindex.occurrence":
    "Este elemento tem tabindex positivo, então recebe o foco antes de elementos que vêm antes dele na página.",

  "stage.structure": "Lendo a estrutura da página",
  "stage.rules": "Rodando as regras de acessibilidade",
  "stage.focus": "Percorrendo o caminho do foco",
  "stage.report": "Preparando o relatório",

  "panel.backToSummary": ", voltar ao resumo",
  "panel.count.manualReview": "revisão manual",
  "panel.toFix": { one: "{count} para corrigir", other: "{count} para corrigir" },
  "panel.toCheck": { one: "{count} para conferir à mão", other: "{count} para conferir à mão" },
  "panel.keyboardNotCounted": "Teclado ainda não incluído",
  "panel.notOnScreen": {
    one: "1 problema não está destacado na página. Abra-o pela lista para localizar os elementos.",
    other:
      "{count} problemas não estão destacados na página. Abra-os pela lista para localizar os elementos.",
  },
  "panel.wholePage": {
    one: "1 problema afeta a página inteira e, por isso, não aparece destacado.",
    other: "{count} problemas afetam a página inteira e, por isso, não aparecem destacados.",
  },
  "panel.inShadowRoot": {
    one: "1 problema a corrigir está dentro de um shadow root, que as marcas não alcançam.",
    other:
      "{count} problemas a corrigir estão dentro de um shadow root, que as marcas não alcançam.",
  },

  "panel.screenshot": "Captura da parte visível da página",
  "panel.evidenceNote": "captura do viewport",
  "panel.evidenceNoteMarked": "captura do viewport · {count} marcados",
  "panel.screenshotAlt": "Captura de tela de {url}",

  "panel.copied": "Copiado",
  "panel.copyFailed": "Falha ao copiar",
  "panel.copySelector": "Copiar seletor",
  "panel.copyHtml": "Copiar HTML",

  "panel.neverReached": "Nunca alcançado por Tab",
  "panel.stopN": "Parada {n}",
  "panel.geometryUnsure":
    "A posição na tela sozinha não resolve este caso. Compare com a ordem de leitura que você pretende.",
  "panel.position": "Posição",
  "panel.measured": "Medido",
  "panel.positionValue": "{w}×{h}px em {x}, {y}",
  "panel.offViewport": " · fora do viewport no momento da medição",
  "panel.selector": "Seletor",
  "panel.html": "HTML",
  "panel.abbreviated":
    "Abreviado com …, e atributos que podem conter o que você digitou ficam de fora. É evidência, não código para colar de volta.",
  "panel.locating": "Procurando…",
  "panel.locate": "Localizar na página",

  "panel.alsoFailsIn": "Também falha em {contexts}",
  "panel.whatToChange": "O que mudar",
  "panel.details": "Detalhes",
  "panel.problemNavigation": "Navegação entre problemas",
  "panel.previousProblem": "Problema anterior",
  "panel.nextProblem": "Próximo problema",
  "panel.group.fix": "A corrigir",
  "panel.group.check": "Conferir à mão",
  "panel.group.recommend": "Recomendações",
  "panel.howToCheck": "Como conferir",
  "panel.readingLanguage":
    "Este resultado está em {language}. Audite a página de novo para vê-lo neste idioma.",
  "panel.noFailures": "Nenhuma das verificações desta versão encontrou falhas.",

  "panel.checksPerformed": "Verificações executadas",
  "panel.check.primed": "Rolou a página antes, para ler o conteúdo que só aparece com a rolagem",
  "panel.check.axe": "axe-core, WCAG A e AA (2.0, 2.1, 2.2) mais boas práticas",
  "panel.check.targetSize": "Tamanho do alvo (WCAG 2.5.8)",
  "panel.check.liveRegions": "Regiões dinâmicas (WCAG 4.1.3)",
  "panel.check.screenshot": "Captura do viewport visível",
  "panel.check.focusPath": "Caminho do foco percorrido com Tab",
  "panel.check.focusPathStopped": "Caminho do foco percorrido com Tab (parou cedo)",

  "panel.mark.stop": "parada",

  "panel.focusPath": "Caminho do foco",
  "panel.showFocusPath": "Inspecionar ordem de tabulação",
  "panel.previousStop": "Parada anterior",
  "panel.nextStop": "Próxima parada",
  "panel.stopOf": "Parada {at} de {total}",
  "panel.showComplete": "Mostrar o caminho completo",
  "panel.exitInspection": "Sair",
  "panel.drawingAll":
    "Todas as paradas estão desenhadas. A atual fica destacada e as outras ficam esmaecidas.",
  "panel.drawingWindow":
    "Desenhando a parada atual e {neighbours} de cada lado, para a página continuar legível.",
  "panel.walkingFocusPath": "Percorrendo o caminho do foco",
  "panel.runningNoteFocus":
    "O Chrome mostra um aviso enquanto o depurador está conectado. O depurador é liberado antes de o relatório voltar, e a página não é alterada.",
  "panel.walkDebuggerNote":
    "Para verificar a ordem de tabulação, o AccessCheck usa temporariamente o depurador do Chrome. Durante a verificação, o Chrome exibe um aviso e o DevTools fica indisponível nesta aba. Assim que o percurso termina, o depurador é desconectado.",
  "panel.walkNow": "Verificar teclado",
  "panel.roundChecked": {
    one: "Esta rodada verificou {count} parada.",
    other: "Esta rodada verificou {count} paradas.",
  },
  "panel.roundProblems": {
    one: "{count} problema de teclado entrou na lista.",
    other: "{count} problemas de teclado entraram na lista.",
  },
  "panel.roundNoProblems": "Nenhum problema de teclado encontrado até agora.",
  "panel.showKeyboardProblems": "Mostrar problemas de teclado",
  "panel.continueWalk": "Continuar de onde parou",
  "panel.continueWalkNote": "Retoma na parada {stops} e segue adiante, sem recomeçar.",

  "panel.auditingTab": "Auditando esta aba",
  "panel.runningNote":
    "O resultado aparece quando todos os passos acima terminarem. Qualquer mudança feita para testar uma correção é desfeita no mesmo instante.",
  "panel.announceStep": "Auditando. Passo {n}: {stage}.",

  "panel.coverageLimitations": "Limites da cobertura",
  "panel.notChecked": "Não verificado nesta versão",
  "panel.notCheckedNote":
    "Um resultado desta versão nunca significa que a página está livre de barreiras.",
  "panel.auditAgain": "Auditar esta aba de novo",
  "panel.reaudit": "Auditar de novo",
  "panel.aboutAudit": "Sobre esta auditoria",

  "panel.idleTitle": "Nada auditado ainda",
  "panel.idleBody":
    "Clique no ícone do AccessCheck na barra de ferramentas para auditar a página em que você está. Com o relatório pronto, você também pode verificar o teclado, o que usa o depurador do Chrome. Nada sai do seu navegador.",
  "panel.unsupportedKicker": "Sem suporte aqui",
  "panel.unsupportedTitle": "Esta página não pode ser auditada",
  "panel.errorKicker": "A auditoria falhou",
  "panel.errorTitle": "A auditoria não conseguiu terminar",
  "panel.tryAgain": "Tentar de novo",

  "panel.pageUnreachable": "Não foi possível acessar a página daqui.",
  "panel.elementGone":
    "Esse elemento não está mais na página. O DOM mudou depois que a auditoria rodou.",
  "panel.someStopsGone":
    "{missing} de {total} paradas não estão mais na página, então não puderam ser desenhadas.",
  "panel.someStopsOffScreen":
    "{offScreen} de {total} paradas estão fora do viewport agora, então só as outras foram desenhadas.",
  "chain.investigation": "Problema {n}",
  "chain.located": "Localizado",
  "chain.measured": "Medido",
  "chain.evidence": "Evidência",
  "chain.change": "Mudança",
  "chain.decide": "Uma pessoa decide",
  "chain.end.tested": "Correção testada",
  "chain.end.failed": "Ainda falha com a mudança",
  "chain.end.person": "Uma pessoa decide",
  "chain.end.fixPerson": "A correção depende de uma pessoa",
  "chain.end.recheck": "Confirme com uma nova auditoria",
  "chain.end.untested": "Correção não testada",
  "chain.testedOnCopy": "Testada em uma cópia da página.",
  "chain.testedOnPage": "Testada nesta página e depois desfeita.",
  "chain.notRemeasured":
    "Este elemento recebe a mudança testada em outro, mas não foi medido de novo.",
  "chain.howVerified": "Como foi testado",
  "chain.heardAs": "Leitores de tela dizem",
  "chain.role.button": "botão",
  "chain.role.link": "link",
  "chain.role.field": "campo",
  "chain.role.image": "imagem",
  "chain.noName": "sem nome",
  "chain.onThePage": "Na página",
  "chain.withChange": "Com a mudança",
  "chain.needed": "exigido",
  "chain.passes": "passa de {required}:1",
  "chain.atRest": "Em repouso",
  "chain.withFocus": "Com foco",
  "chain.noDifference": "Nenhuma diferença visível",
  "chain.ringShould": "O anel que deveria aparecer",
  "chain.notOnCapture": "Encontrada na página, sem marca nas capturas.",
  "chain.notOnCaptureHere":
    "{tag} foi encontrada na página, mas não está marcada em nenhuma captura.",
  "chain.occurrences": "Ocorrências",
  "chain.occurrenceAria": "Ocorrência {tag}: {label}",
  "chain.unlisted": {
    one: "Mais 1 elemento tem o mesmo problema, mas não aparece separadamente na lista.",
    other: "Mais {count} elementos têm o mesmo problema, mas não aparecem separadamente na lista.",
  },
  "chain.closeUp": "Detalhe de {label}",
  "chain.offAbove": "Acima do que a página mostra agora",
  "chain.offBelow": "Abaixo do que a página mostra agora",
  "chain.notShowing":
    "Este elemento está na página, mas não aparece agora, muitas vezes porque fica num menu, gaveta ou diálogo fechado. Abra e use Localizar na página de novo.",
  "chain.gap.name": "sem nome",
  "chain.gap.alt": "sem alt",
  "chain.gap.ring": "nada mostra o foco",
  "chain.gap.unmeasured": "sem medida",
  "chain.status.tested": "correção testada",
  "chain.status.person": "uma pessoa decide",
  "chain.status.fixPerson": "requer uma pessoa",
  "chain.status.recheck": "auditar de novo para confirmar",
  "chain.status.failed": "ainda falha",
  "summary.recommendations": { one: "1 recomendação", other: "{count} recomendações" },
  "summary.passed": { one: "1 regra passou", other: "{count} regras passaram" },
  "summary.index": "Problemas por número",
  "layers.label": "Marcas",
  "layers.findings": "Problemas",
  "layers.path": "Caminho do foco",
  "layers.none": "Nenhuma",
  "marks.group": "Marcas na captura. Use as setas para passar de uma a outra.",
  "marks.finding": "Problema {n}, {kind}: {title}",
  "marks.occurrence": "Problema {n}, ocorrência {i} de {total}: {title}",
  "marks.stopNoFocus": "Parada de foco {n}: {label}, nada mostra o foco",
  "marks.stopLabel": "Parada de foco {n}: {label}",
  "marks.stopWithFinding": "{stop}, problema {tag}",
  "focusPath.sequence": {
    one: "1 parada, na ordem em que o Tab chega nela",
    other: "{count} paradas, na ordem em que o Tab chega nelas",
  },
  "focusPath.related": "Problema {tag}",
  "focusPath.stopNoFocus": "nada mostra o foco",
  "unit.finding": { one: "{count} problema", other: "{count} problemas" },
  "wcag.2.1.2": "Sem bloqueio do teclado",
  "wcag.2.4.3": "Ordem do foco",
  "context.opened": "com “{label}” aberto",
  "context.disclosure": "Seção expansível",
  "context.menu": "Menu",
  "context.mobileViewport": "viewport de {width}px",
  "report.levelsValue": "A e AA · 2.0 / 2.1 / 2.2",
  "report.effortImpact": "Esforço: {effort} · Impacto: {impact}",
  "report.impactTag": "Impacto {impact}",
  "report.effort.quick": "baixo",
  "report.effort.moderate": "médio",
  "report.effort.involved": "alto",
  "report.impact.high": "alto",
  "report.impact.medium": "médio",
  "report.impact.low": "baixo",
  "report.moreModerate": {
    one: "+ {count} problema moderado",
    other: "+ {count} problemas moderados",
  },
  "report.moreInFullReport": "+ {count} no relatório completo",
  "report.measuredMinimum": "Medido {measured}:1 · mínimo AA {required}:1",
  "site.auditingProgress": "Auditando {done} de {total}",
  "site.done": { one: "Concluída · {count} página", other: "Concluída · {count} páginas" },
  "site.scoreLabel": "Nota do site: {score} de 100",
  "site.pagesAudited": { one: "página auditada", other: "páginas auditadas" },
  "site.pagesFailed": { one: "{count} página falhou", other: "{count} páginas falharam" },
  "site.pageScoreLabel": "Nota {score} de 100",
  "site.pageWaiting": "Aguardando…",
  "site.pageAuditing": "Auditando…",
  "site.openReport": "Abrir o relatório de {path}",
  "site.stillQueued": {
    one: "{count} página ainda na fila…",
    other: "{count} páginas ainda na fila…",
  },
  "site.findingPagesStatus": "Procurando páginas para auditar em {host}.",
  "ruler.progressLabel": "Andamento da auditoria: {elapsed}s de até {budget}s",
};

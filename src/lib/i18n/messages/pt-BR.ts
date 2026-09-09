import type { Catalog } from "./en";

export const ptBR: Catalog = {
  "unit.stop": { one: "{count} parada", other: "{count} paradas" },
  "unit.detectedControl": {
    one: "{count} controle detectado",
    other: "{count} controles detectados",
  },
  "unit.styleSheet": { one: "{count} folha de estilo", other: "{count} folhas de estilo" },
  "unit.mediaFile": { one: "{count} arquivo de mídia", other: "{count} arquivos de mídia" },
  "results.findingsAndElements": "{findings} \u00b7 {elements}",
  "unit.finding": { one: "{count} problema", other: "{count} problemas" },
  "unit.element": { one: "{count} elemento", other: "{count} elementos" },
  "unit.elementNoun": { one: "elemento", other: "elementos" },
  "unit.and": "e",

  "privacy.metaTitle": "Privacidade \u2014 extensão AccessCheck",
  "privacy.metaDescription":
    "O que a extensão de navegador do AccessCheck lê, e para onde isso vai.",
  "meta.title": "AccessCheck: meça, localize e rastreie cada barreira de acessibilidade",
  "meta.description":
    "Cole um endereço da web. O AccessCheck abre a página em um navegador real, roda o axe-core (WCAG níveis A e AA) e mais as análises de teclado, celular e visão. Cada problema volta ligado ao elemento que o causou, com uma correção já testada em uma cópia da página.",
  "nav.skipToContent": "Pular para o conteúdo",
  "nav.howItWorks": "Como funciona",
  "nav.checks": "Verificações",
  "nav.evidenceLens": "Evidências",
  "nav.history": "Histórico",
  "nav.account": "Conta",
  "nav.signOut": "Sair",
  "layer.markersShort": "Marcadores",
  "capture.noMarkersLanded":
    "Nenhum marcador cabe nesta captura: todos os elementos afetados estão fora da área capturada ou não têm caixa visível.",
  "nav.signIn": "Entrar",
  "language.label": "Idioma",
  "language.followBrowser": "Padrão do navegador",

  "api.site.noAddress":
    "Nenhum endereço da web foi informado. Digite um endereço de site e tente de novo.",
  "api.site.rateLimited":
    "Auditorias de site demais em pouco tempo. Espere alguns minutos e tente de novo.",
  "api.site.unavailable":
    "As auditorias de site estão temporariamente indisponíveis. Audite uma página só, ou tente mais tarde.",
  "api.site.disabled": "As auditorias de site não estão disponíveis agora. Audite uma página só.",
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
    one: "{count} região dinâmica está oculta e não consegue anunciar",
    other: "{count} regiões dinâmicas estão ocultas e não conseguem anunciar",
  },
  "audit.live.hiddenDesc":
    "A região está fora da árvore de acessibilidade (display:none, visibility:hidden ou aria-hidden), então nada escrito nela chega a ser anunciado. Isso é diferente do padrão de esconder só visualmente, que mantém o elemento na árvore.",
  "audit.live.hiddenFix":
    "Mantenha a região dinâmica na árvore de acessibilidade: em vez de display:none, use um padrão visível apenas para leitores de tela e remova o aria-hidden.",
  "audit.live.mutedTitle": {
    one: '{count} alerta silenciado por aria-live="off"',
    other: '{count} alertas silenciados por aria-live="off"',
  },
  "audit.live.mutedDesc":
    'Um elemento com role="alert" existe para interromper, mas aria-live="off" o silencia. Como as duas declarações se contradizem, nada é anunciado.',
  "audit.live.mutedFix":
    'Remova o aria-live="off" do alerta — role="alert" já é assertivo por padrão.',

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
    "Coloque as animações não essenciais dentro de @media (prefers-reduced-motion: reduce) e desligue ou encurte a animação ali — por exemplo, animation: none ou uma transição rápida de opacidade no lugar do movimento.",

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
    "Aumente cada controle para pelo menos 24\u00d724px, ou dê espaçamento suficiente para que um círculo de 24px centrado nele não encoste nos vizinhos — em geral, preencher o controle resolve os dois lados.",

  "audit.liveRegionHidden":
    "A região está removida da árvore de acessibilidade (display:none, visibility:hidden ou aria-hidden), então leitores de tela nunca a anunciam.",
  "audit.liveRegionFix":
    "Mantenha a região dinâmica na árvore de acessibilidade: use um padrão de recorte ou só-para-leitor-de-tela em vez de escondê-la.",
  "audit.liveRegionContradiction": "As duas se contradizem, então nada é anunciado.",
  "audit.targetSizeFix":
    "Aumente cada controle para pelo menos 24\u00d724px, ou dê espaçamento suficiente ao redor para que um alvo de 24px caiba sem sobrepor os vizinhos.",
  "audit.motionFix":
    "Envolva animações não essenciais em @media (prefers-reduced-motion: reduce) e desligue ou encurte a animação ali.",

  "scanFail.browserUnavailable":
    "O navegador que usamos para abrir a página parou de responder antes de a auditoria rodar.",
  "scanFail.browserSlow":
    "O navegador que usamos para abrir a página demorou demais para iniciar. Tente de novo.",
  "scanFail.unreachable": "Não foi possível alcançar a página.",
  "scanFail.timeout": "A auditoria de acessibilidade não conseguiu terminar nesta página a tempo.",
  "scanFail.generic": "A varredura falhou.",
  "scanFail.httpError":
    "A página devolveu um erro (HTTP {status}), então não conseguimos auditá-la. Confira o endereço e tente de novo.",
  "scanFail.navigationTimeout": "A página levou mais de {seconds}s para responder.",
  "scanFail.engineMissing":
    "Não foi possível carregar o motor de auditoria na página ({path}). Compile com `npm run build:engine`. {detail}",
  "scanFail.engineVersion":
    "O motor de auditoria na página informa a versão {found}, e este driver precisa da {needed}. Compile de novo com `npm run build:engine`.",

  "home.lens.sharedColor": "Problema de contraste, outro elemento com a mesma cor",
  "home.lens.locatedElement": "Problema de contraste, elemento localizado",
  "home.lens.locatedVerified": "Elemento localizado verificado",
  "home.example.headingSkip": "Níveis de título pulados",

  "api.internal": "Algo deu errado do nosso lado. Tente de novo.",
  "api.badRequest": "Não conseguimos ler essa requisição. Recarregue a página e tente de novo.",
  "api.noAddress":
    "Nenhum endereço da web foi informado. Digite um endereço de página e tente de novo.",
  "api.rateLimited": "Auditorias demais em pouco tempo. Espere cerca de um minuto e tente de novo.",
  "api.invalidAddress": "Isso não parece um endereço da web válido. Confira e tente de novo.",
  "api.tooSlow":
    "Esta página demorou demais para terminar. Tente uma página única e mais leve em vez de uma home grande.",
  "api.auditFailed": "Não conseguimos auditar esta página. Tente outro endereço da web.",

  "report.passedChecks": "Verificações aprovadas",
  "report.priorityProjection": "Projeção de prioridade",
  "report.current": "Atual",
  "report.estimated": "Estimado",
  "report.actionPlan": "Plano de ação",

  "md.reportTitle": "Relatório de acessibilidade: {name}",
  "md.reportTitleDash": "Relatório de acessibilidade \u2014 {name}",
  "md.url": "URL",
  "md.scoreLabel": "Nota",
  "md.priorityScore": "Nota interna de prioridade",
  "md.priorityNote": "(serve para priorizar, não atesta conformidade com a WCAG)",
  "md.elementsScanned": "Elementos analisados",
  "md.generated": "Gerado em",
  "md.whereScoreCanGo": "Até onde a nota pode chegar",
  "md.currentScore": "Nota interna de prioridade hoje: **{score} / 100**.",
  "md.colIfYouFix": "Se corrigir",
  "md.colElements": "Elementos",
  "md.colScoreRises": "Nota sobe para",
  "md.manualOutside": {
    one: "{count} item de revisão manual fica fora da nota.",
    other: "{count} itens de revisão manual ficam fora da nota.",
  },
  "md.nonLinear":
    " Cada linha mostra como a pontuação ficaria se você corrigisse apenas os problemas daquela severidade. Como o cálculo não é linear, corrigir problemas de diferentes severidades pode recuperar menos pontos do que a soma apresentada nas linhas.",
  "md.wcagReading": "Leitura WCAG",
  "md.failsBy": "reprova em {criteria}",
  "md.noAFailures": "nenhuma falha de nível A detectada automaticamente",
  "md.noAAFailures": "nenhuma falha de nível A detectada automaticamenteA",
  "md.aaaNote": "não avaliado. O AccessCheck cobre os níveis A e AA (WCAG 2.0/2.1/2.2)",
  "md.findings": "Problemas encontrados",
  "md.needsManualReview": "Precisa de revisão manual",
  "md.whereLabel": "Onde",
  "md.howToCheck": "Como conferir",
  "md.checksPassed": "Verificações automáticas aprovadas ({count})",
  "md.passedChecks": "Verificações aprovadas ({count})",
  "md.footer":
    "_A nota ajuda a priorizar as correções, mas não atesta conformidade. A avaliação completa da WCAG também inclui aspectos que exigem análise humana._",
  "md.bestPracticeNote": "**Boa prática** (não é um critério de sucesso da WCAG)",
  "md.passLabel": "Análise",
  "md.affected": "Afetados",
  "md.elementsLabel": "Elementos",
  "md.measuredLabel": "Medido",
  "md.minimumAA": "mínimo AA {required}:1",
  "md.fixReaches": "a correção alcança {ratio}:1",
  "md.impact": "Impacto",
  "md.suggestedFix": "Correção sugerida",
  "md.setProp": "Defina `{prop}` como {hex}.",
  "md.andMore": "(mais {count})",
  "md.summary": "Resumo",
  "md.colCritical": "Críticos",
  "md.colSerious": "Graves",
  "md.colModerate": "Moderados",
  "md.colMinor": "Leves",
  "md.colPassed": "Aprovadas",
  "md.fixFirst": "Corrija primeiro",
  "md.fixFirstLine": "**{title}** \u2014 impacto {impact}, esforço {effort}",
  "md.violations": "Violações",
  "md.severityHeading": "{severity} ({count})",
  "md.selectorLabel": "Seletor",
  "md.occurrencesLabel": "Ocorrências",
  "md.verifiedTag": "\u2705 Verificada \u2014 a reanálise passa",
  "md.needsReviewTag": "\u26a0\ufe0f Precisa de revisão \u2014 a reanálise ainda sinaliza",
  "md.resolvesElements": {
    one: "Resolve {count} elemento",
    other: "Resolve {count} elementos",
  },
  "md.keyboardHeading": "Teclado e foco",
  "md.tracedStops": {
    one: "{count} parada de foco percorrida",
    other: "{count} paradas de foco percorridas",
  },
  "md.reachableCounts": "{reachable}/{total} elementos interativos alcançáveis por teclado",
  "md.noInteractive": "nenhum controle interativo detectado",
  "md.severityLabel": "Severidade",
  "md.fixLabel": "Correção",
  "md.contextsHeading": "Responsivo e dinâmico",
  "md.viewportChecked": "viewport de {width}px",
  "md.openedStates": {
    one: "{count} estado aberto",
    other: "{count} estados abertos",
  },
  "md.rescannedBeyond":
    "Reanalisado além do carregamento inicial em desktop \u2014 conferimos {checked}.",
  "md.onlyAtWidth": "Só em {width}px",
  "md.noViolations": "Nenhuma violação detectada automaticamente. \ud83c\udf89",
  "md.noKeyboard": "Nenhum problema de teclado ou foco detectado. \ud83c\udf89",
  "md.noContexts": "Nenhuma violação nova apareceu nestes contextos. \ud83c\udf89",
  "md.manualNote": "O teste automatizado não conseguiu determinar estes \u2014 confirme à mão.",
  "md.noFailures":
    "Nenhuma falha detectada automaticamente nesta página. Isto é cobertura, não conformidade WCAG.",
  "md.manualOutsideScore":
    "O teste automatizado não conseguiu decidir estes, então confirme à mão. Eles ficam fora da nota.",

  "diff.noneCleared": "Nenhuma regra foi resolvida desde a última auditoria.",
  "diff.newOrWorse": "Novas ou piores",
  "diff.noneWorse": "Nenhuma regra nova sinalizada. Nada piorou.",

  "preview.stillFlagged":
    "O par calculado atinge o mínimo, mas a reauditoria ao vivo do elemento localizado ainda sinaliza. O fundo real provavelmente é uma imagem, um gradiente ou uma camada sobreposta, então a cor sólida que detectamos não é o fundo real.",
  "preview.noColorReaches": "Nenhuma mudança de cor sozinha atinge o mínimo neste par de matizes.",

  "scanError.hint.invalidUrl": "Confira o endereço e tente de novo.",
  "scanError.hint.blockedUrl": "Só páginas públicas da web podem ser auditadas.",
  "scanError.hint.rateLimited": "Espere um momento antes de começar outra auditoria.",
  "scanError.hint.navigationTimeout":
    "O site pode estar lento, ou pode estar bloqueando navegadores automatizados.",
  "scanError.hint.navigationFailed": "Confira o endereço, ou o site pode estar fora do ar.",
  "scanError.hint.httpError": "O endereço pode estar errado, removido, ou atrás de um login.",
  "scanError.hint.auditFailed":
    "Esta página é excepcionalmente pesada. Tente uma página específica em vez da home.",
  "scanError.hint.browserUnavailable": "Dê um instante e tente de novo.",
  "scanError.hint.timeout":
    "Esta página é excepcionalmente pesada. Tente uma página específica em vez da home.",
  "scanError.hint.interrupted": "A conexão caiu durante a auditoria. Tente de novo.",
  "scanError.hint.internal": "Algo deu errado do nosso lado. Tente de novo.",

  "scanError.message.invalidUrl": "Não conseguimos ler esse endereço.",
  "scanError.message.blockedUrl": "Esse endereço não pode ser auditado.",
  "scanError.message.rateLimited": "Auditorias demais em pouco tempo. Tente de novo em um minuto.",
  "scanError.message.navigationTimeout": "A página demorou demais para responder.",
  "scanError.message.navigationFailed": "Não conseguimos alcançar a página.",
  "scanError.message.httpError":
    "A página devolveu um erro, então não conseguimos auditá-la. Confira o endereço e tente de novo.",
  "scanError.message.auditFailed": "Não conseguimos terminar a auditoria nesta página.",
  "scanError.message.browserUnavailable":
    "Não conseguimos iniciar o navegador usado para abrir a página. Tente de novo.",
  "scanError.message.timeout": "A auditoria ficou sem tempo nesta página.",
  "scanError.message.interrupted": "A auditoria parou antes de terminar.",
  "scanError.message.internal": "A auditoria parou antes de conseguir terminar. Tente de novo.",

  "scanWarning.screenshotUnavailable": "Não deu tempo de tirar a captura de tela.",
  "scanWarning.fixDetailsSkipped":
    "Alguns problemas mostram orientação geral em vez de uma correção específica.",
  "scanWarning.markersSkipped": "Não foi possível posicionar os marcadores na captura.",
  "scanWarning.contentUnsettled": "A página ainda estava carregando quando a auditoria rodou.",
  "scanWarning.verificationSkipped":
    "Desta vez as correções não foram testadas em uma cópia da página.",
  "scanWarning.auditsSkipped":
    "As verificações de tamanho de alvo, movimento e regiões dinâmicas foram puladas.",
  "scanWarning.keyboardSkipped": "A verificação de teclado e ordem de foco foi pulada.",
  "scanWarning.lazyContentSkipped":
    "Conteúdo que só aparece ao rolar não foi carregado antes da auditoria.",
  "scanWarning.walkChangedPage": "Teclar Tab pela página abriu conteúdo que ficou aberto.",
  "scanWarning.contextsSkipped": "A verificação de celular e estados dinâmicos foi pulada.",
  "scanWarning.streamInterrupted":
    "A auditoria foi interrompida antes de todas as verificações terminarem.",
  "scanWarning.crossOriginAssets":
    "Alguns estilos e mídias vieram de outra origem e não puderam ser lidos.",

  "blocked.chromePages": "O Chrome não deixa nenhuma extensão rodar nas páginas dele.",
  "blocked.extensionPage": "Esta é uma página de extensão, não uma página da web.",
  "blocked.webStore": "O Chrome bloqueia extensões na Web Store.",
  "blocked.builtinViewer": "O visualizador embutido do Chrome não expõe uma página para auditar.",
  "blocked.localFile":
    "Arquivos locais exigem que o acesso a arquivos da extensão esteja ligado em chrome://extensions.",
  "blocked.noAddress": "Esta aba não tem endereço que a auditoria consiga ler.",

  "background.wokeUp":
    "O Chrome suspendeu a extensão antes de a auditoria terminar, então nada foi medido. Rode de novo.",
  "background.pageUnreadable": "Não foi possível ler a página.",
  "background.auditEmpty": "A auditoria não devolveu nada.",
  "background.permissionLapsed":
    "Esta aba mudou de página, então a permissão daquela aba expirou. Clique no ícone do AccessCheck na página para auditá-la de novo.",
  "background.otherTab":
    "Auditar outra aba exige um clique no ícone do AccessCheck lá: é esse clique que dá acesso a ela.",
  "background.nothingAudited": "Nada foi auditado nesta aba ainda.",
  "background.tabUnreachable": "Esta aba mudou de página, então não dá mais para alcançá-la daqui.",
  "background.markupFailed": "Não foi possível marcar a página.",

  "deep.cancelled":
    "Você interrompeu, então o caminho do foco não foi percorrido. O resto deste relatório continua valendo.",
  "deep.cancelledPlain":
    "A auditoria profunda foi cancelada, então o caminho do foco não foi percorrido.",
  "deep.alreadyAttached":
    "Já existe um depurador anexado a esta aba — normalmente o DevTools. Feche-o e rode a auditoria profunda de novo.",
  "deep.notDebuggable":
    "O Chrome não permite depurar esta página, então o caminho do foco não pode ser percorrido aqui.",
  "deep.attachRefused": "O Chrome recusou anexar o depurador: {reason}",
  "deep.tabMovedOn":
    "A aba mudou de página enquanto o caminho do foco era percorrido, então a auditoria profunda parou.",
  "deep.unfinished": "A auditoria profunda não conseguiu terminar: {reason}",
  "deep.notReleased":
    "O Chrome não liberou o depurador. O aviso na aba pode continuar até você recarregá-la.",

  "engine.missing":
    "O motor de auditoria do AccessCheck não foi injetado nesta página. Recarregue a extensão e tente de novo.",
  "engine.versionMismatch":
    "O motor de auditoria na página informa a versão {found}, e esta versão precisa da {needed}.",

  "warning.keyboardSkipped":
    'O caminho do foco não foi percorrido. Use "Percorrer o caminho do foco agora" para enviar pressionamentos reais de Tab pela página.',
  "warning.keyboardFailed": "O caminho do foco não foi percorrido. {reason}",
  "warning.lazyContent":
    "Conteúdo que só aparece quando você rola até ele não foi carregado, então nada abaixo da dobra foi lido. A auditoria expandida percorre a página antes; esta leitura não fez isso.",
  "warning.contextsSkipped":
    "A análise em viewport de celular precisa de emulação de viewport, indisponível nesta versão.",
  "warning.auditsSkipped":
    "A checagem de movimento reduzido precisa de emulação de mídia, indisponível nesta versão.",
  "warning.verificationSkipped":
    "As correções não são testadas aqui: esta versão nunca escreve na página auditada.",
  "warning.walkChangedPage":
    "Pressionar Tab por esta página abriu conteúdo que ficou aberto — um menu, um painel ou uma lista de sugestões. As regras já tinham lido a página até então, então auditar de novo pode dar uma leitura um pouco diferente da mesma página.",
  "warning.contentUnsettled":
    "A página ainda estava mudando depois de seis segundos de espera, então as regras leram um alvo em movimento. Problemas de uma página que não estabilizou não são confiáveis e variam entre execuções.",
  "warning.crossOrigin":
    "{assets} nesta página {verb} de outra origem, que esta versão não tem permissão para buscar. Regras que leem esses arquivos — a checagem de trava de orientação — aparecem como precisando de revisão em vez de aprovadas. Tudo que foi lido da própria página não é afetado.",
  "warning.crossOriginComes": "vem",
  "warning.crossOriginCome": "vêm",

  "caveat.contentUnsettled": "página ainda mudando",
  "caveat.walkChangedPage": "o percurso abriu conteúdo",
  "caveat.crossOriginAssets": "alguns estilos ilegíveis",
  "caveat.screenshotUnavailable": "sem captura de tela",
  "caveat.markersSkipped": "sem marcadores na captura",
  "caveat.fixDetailsSkipped": "detalhes da correção ausentes",
  "caveat.streamInterrupted": "leitura interrompida",

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
  "focusPath.notFromTop":
    "Parcial: não foi possível levar o percurso de volta ao primeiro controle, então estas {stops} começam em algum ponto dentro da ordem de tabulação.",
  "focusPath.leftoverSome": {
    one: "o controle restante não foi avaliado",
    other: "os {count} controles restantes não foram avaliados",
  },
  "focusPath.leftoverNone": "pode não ter chegado ao fim da ordem de tabulação",
  "focusPath.stoppedByCap":
    "Parcial: o percurso atingiu seu limite de {stops} paradas, então {leftover}.",
  "focusPath.stoppedByTimeout":
    "Parcial: o percurso ficou sem tempo depois de {stops}, então {leftover}.",
  "focusPath.stoppedByOpaque":
    "Parcial: o foco entrou em um iframe ou num shadow root, que esta versão não consegue enxergar, então {leftover}.",
  "focusPath.stoppedByTrap": "Parcial: o foco ficou preso na parada {stops}, então {leftover}.",

  "scope.stillMissing":
    "O viewport de celular, o movimento reduzido e as correções verificadas continuam fora daqui, então esta não é uma auditoria completa.",
  "scope.quickKicker": "Nota da auditoria rápida",
  "scope.currentTabKicker": "Nota da auditoria desta aba",
  "scope.preliminaryLead": "Resultado preliminar",
  "scope.skippedNote":
    "O caminho do foco não foi verificado, então nada aqui responde pelo uso com teclado. {why} {rest}",
  "scope.partialBadge": "Inclui o caminho do foco do teclado · parcial",
  "scope.partialNote":
    "Não foi possível levar o caminho do foco de volta ao primeiro controle, então estas {stops} paradas começam em algum ponto dentro da página, e não no início da ordem de tabulação. {rest}",
  "scope.truncatedBadge": "Inclui o caminho do foco do teclado · parou em {stops}",
  "scope.truncatedNote":
    "O caminho do foco parou cedo, depois de {stops} paradas, então nada além desse ponto foi alcançado. {rest}",
  "scope.walkedBadge": "Inclui o caminho do foco do teclado",
  "scope.walkedNote":
    "O caminho do foco foi percorrido até o fim com pressionamentos reais de Tab. {rest}",

  "summary.scope": " entre as verificações que rodaram",
  "summary.bestPractice": {
    one: "{count} recomendação de boa prática",
    other: "{count} recomendações de boas práticas",
  },
  "summary.manualReview": {
    one: "{count} item de revisão manual",
    other: "{count} itens de revisão manual",
  },
  "summary.remaining": {
    one: " Resta {parts}, fora da nota.",
    other: " Restam {parts}, fora da nota.",
  },
  "summary.critical": {
    one: "Base sólida, mas {count} problema crítico barra o nível AA da WCAG. Corrija ele primeiro.",
    other:
      "Base sólida, mas {count} problemas críticos barram o nível AA da WCAG. Corrija eles primeiro.",
  },
  "summary.serious": {
    one: "Nenhum bloqueio crítico{scope}, mas {count} problema grave ainda deixa a página mais difícil de usar para quem depende de tecnologia assistiva.",
    other:
      "Nenhum bloqueio crítico{scope}, mas {count} problemas graves ainda deixam a página mais difícil de usar para quem depende de tecnologia assistiva.",
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
  "finding.contextOnly":
    "Encontrado só neste contexto ({where}). Não falha no primeiro carregamento em desktop.",

  "review.generic.how":
    "O teste automatizado não conseguiu decidir este caso, então precisa de uma pessoa para confirmar.",
  "review.generic.s1":
    "Inspecione cada elemento afetado nas ferramentas de desenvolvedor do navegador",
  "review.generic.s2": "Confira contra o critério de sucesso da WCAG listado aqui",
  "review.generic.s3": "Confirme se a intenção se sustenta para quem usa leitor de tela e teclado",

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
    "Se for só cor, confirme pelo menos 3:1 de contraste contra o texto ao redor",
  "review.linkInText.s3": "Confirme uma mudança visível no hover e no foco por teclado",

  "review.scrollable.how":
    "Esta região rola, então quem usa teclado precisa conseguir alcançá-la e rolá-la.",
  "review.scrollable.s1": "Tabule até a região e tente rolar com as setas",
  "review.scrollable.s2": 'Se não for alcançável, acrescente tabindex="0" ao contêiner de rolagem',
  "review.scrollable.s3":
    "Garanta que o conteúdo interno continue alcançável em uma ordem que faça sentido",

  "review.nameMismatch.how":
    "O rótulo visível e o nome acessível divergem, o que quebra quem usa controle por voz e fala o que vê.",
  "review.nameMismatch.s1": "Compare o texto visível com o aria-label / aria-labelledby",
  "review.nameMismatch.s2": "Garanta que o nome acessível contenha o texto visível, na mesma ordem",
  "review.nameMismatch.s3": "Prefira remover o aria-label e deixar o texto visível ser o nome",

  "review.frame.how": "Esta página embute um <iframe> que o axe não consegue enxergar.",
  "review.frame.s1": "Dê ao <iframe> um atributo title curto e descritivo",
  "review.frame.s2": "Audite a página embutida separadamente. Ela tem a própria acessibilidade",

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
  "review.orientation.s2": "Confirme se conteúdo e funcionalidade sobrevivem nas duas orientações",

  "review.pAsHeading.how":
    "Um parágrafo está estilizado para parecer um título (negrito ou grande).",
  "review.pAsHeading.s1": "Se ele introduz uma seção, transforme em um título real, de <h1> a <h6>",
  "review.pAsHeading.s2": "Se é só texto enfatizado, este caso pode ser dispensado com segurança",

  "review.nested.how":
    "Um controle interativo parece aninhado dentro de outro (por exemplo, um botão dentro de um link).",
  "review.nested.s1": "Confirme que não há controles focalizáveis dentro de outros controles",
  "review.nested.s2": "Achate a marcação para que cada controle fique por conta própria",

  "vision.normal": "Normal",
  "vision.normalTitle": "Normal, sem filtro de visão",
  "vision.deuteranopia": "Deuteranopia",
  "vision.deuteranopiaTitle": "Deuteranopia (daltonismo vermelho-verde)",
  "vision.protanopia": "Protanopia",
  "vision.protanopiaTitle": "Protanopia (daltonismo vermelho-verde)",
  "vision.tritanopia": "Tritanopia",
  "vision.tritanopiaTitle": "Tritanopia (daltonismo azul-amarelo)",
  "vision.lowVision": "Baixa visão",
  "vision.lowVisionTitle": "Baixa visão (nitidez e contraste reduzidos)",
  "vision.grayscale": "Escala de cinza",
  "vision.grayscaleTitle": "Escala de cinza (sem cor)",
  "vision.short.deut": "Deuter.",
  "vision.short.gray": "Cinza",
  "home.lens.frameLabel": "Captura \u00b7 escala 43%",
  "vision.rail": "Visão",
  "layer.rail": "Sobreposição",
  "layer.markers": "Marcadores de problema",
  "layer.markersTitle": "Mostrar os marcadores de problema na captura",
  "layer.focus": "Caminho do foco",
  "layer.focusTitle": "Mostrar a ordem de foco do teclado",
  "layer.none": "Sem sobreposição",
  "layer.noneTitle": "Esconder a sobreposição",

  "capture.defaultRender": "renderização padrão \u00b7 sem filtro de visão",
  "capture.simulating": "simulando {mode}",

  "home.md.filename": "accesscheck-aurora-coffee-com.md",
  "home.md.line1": "## aurora-coffee.com: 53/100",
  "home.md.line2": "| severidade | problemas | elementos |",
  "home.md.line3": "| grave    | 1 | 7 |",
  "home.md.line4": "| moderado | 2 | 2 |",
  "home.md.line5": "### Corrija primeiro",
  "home.md.line6": "1. color-contrast \u00b7 1.4.3 \u00b7 verificada",

  "results.focusPathStops": "paradas no caminho do foco",
  "results.manualReviewItems": {
    one: "{count} item de revisão manual \u00b7",
    other: "{count} itens de revisão manual \u00b7",
  },
  "capture.evidenceLabel":
    "Evidência em alta resolução \u00b7 {width} \u00d7 {height} \u00b7 escala {scale}%",
  "capture.contextual": "Recorte do contexto \u00b7 {width} \u00d7 {height} \u00b7 escala {scale}%",
  "capture.announceContextual":
    "Mostrando o elemento afetado em resolução plena. Role a captura para ver o entorno.",
  "capture.announceOverview": "Mostrando a captura geral.",
  "capture.backToOverview": "Voltar à página inteira",
  "capture.openEvidence": "Ver a evidência",
  "capture.readOnEvidence":
    "Esta visão geral está em meia escala, para você se localizar. Abra um marcador para ler a evidência em resolução plena.",
  "capture.markerHint": "Selecione um marcador para abrir a evidência em resolução plena.",
  "detail.sharedColorPair": {
    one: "{count} ocorrência tem o mesmo par de cores detectado.",
    other: "{count} ocorrências têm o mesmo par de cores detectado.",
  },
  "detail.moreSelectors": "+{count} outros",
  "capture.overviewLabel": "Página inteira \u00b7 {width} \u00d7 {height} \u00b7 escala {scale}%",
  "capture.overviewPartialLabel":
    "Página inteira, parcial \u00b7 {width} \u00d7 {height} \u00b7 escala {scale}%",
  "capture.announceOverviewScroll":
    "Mostrando a página inteira. Role a captura para ver o restante.",
  "capture.partialTitle": "Esta visão geral não chega ao fim da página",
  "capture.partialBody":
    "Ela vai até {captured}px dos {total}px de altura desta página. Tudo o que vem depois foi auditado, mas não está nesta imagem.",
  "capture.partialWhyHeight": "A página é mais alta que os {limit}px que cabem em uma visão geral.",
  "capture.partialWhyTiles": "A página exige mais blocos do que cabem em uma visão geral.",
  "capture.partialWhyBytes": "Os blocos atingiram o peso que uma visão geral pode ocupar.",
  "capture.partialWhyTime": "A captura atingiu o tempo que uma visão geral pode levar.",
  "capture.partialWhyError":
    "A página parou de responder enquanto os últimos blocos eram capturados.",
  "capture.partialCrops":
    "Os problemas mais abaixo mantêm recortes próprios em resolução plena \u2014 abra um deles na lista para ver.",
  "capture.overviewGrew":
    "A página cresceu enquanto era fotografada, então o último bloco pode não coincidir com o que você vê agora.",
  "panel.tileAlt": "{url}, de {from}px a {to}px a partir do topo da página",
  "capture.evidenceShared": "aparece em um recorte feito para um elemento vizinho",
  "capture.frameLabel": "Captura \u00b7 {width} \u00d7 {height} \u00b7 escala {scale}%",
  "capture.shownOnScreenshot": "{count} visíveis na captura",
  "capture.onScreenshot": "\u00b7 na captura",
  "detail.elementsAffected": {
    one: "elemento afetado",
    other: "elementos afetados",
  },
  "provenance.engine": "Chromium headless \u00b7 axe-core com as regras WCAG A e AA",
  "provenance.viewportNote": " \u00b7 captura feita em {viewport}",
  "provenance.finishedIn": " em {seconds}s",
  "provenance.finishedInStandalone": " \u00b7 concluída em {seconds}s",
  "provenance.sandboxNote":
    "As correções são aplicadas e revertidas em uma cópia, então o site auditado nunca é alterado.",
  "report.wcagDependsOn": {
    one: "A nota é a nossa própria medida de prioridade, não uma aprovação ou reprovação na WCAG. Atender à WCAG depende também do {count} item de revisão manual listado na página 3.",
    other:
      "A nota é a nossa própria medida de prioridade, não uma aprovação ou reprovação na WCAG. Atender à WCAG depende também dos {count} itens de revisão manual listados na página 3.",
  },
  "home.lens.frameLabelFull":
    "Evidência \u00b7 aurora-coffee.com \u00b7 1200 \u00d7 800 \u00b7 escala 43%",

  "capture.notCaptured": "Ainda não capturada",
  "capture.notAvailable": "Indisponível",
  "capture.siteAuditNote": "A auditoria de site lê todas as páginas sem parar para fotografá-las.",
  "capture.failed": "Não foi possível tirar a captura desta vez.",
  "capture.runFullNote":
    "Os problemas desta página estão completos. Rode a auditoria completa para acrescentar a captura, os marcadores de problema e o caminho do foco.",
  "capture.unaffected":
    "Os problemas desta página não são afetados \u2014 só a captura está faltando.",
  "capture.runFull": "Rodar auditoria completa",
  "capture.tryAgain": "Tentar de novo",
  "capture.collapsed": "Captura recolhida",
  "capture.beingTaken": "Captura \u00b7 sendo tirada",
  "capture.screenshot": "Captura de tela",
  "capture.show": "Mostrar a captura",
  "capture.collapse": "Recolher a captura",
  "capture.collapseShort": "Recolher",
  "capture.elementAndCode": "Elemento e código",

  "results.auditedMinutesAgo": "Auditada há {minutes} min",
  "results.auditedAt": "Auditada em {when}",
  "phase.preparing": "preparando",
  "phase.loading": "abrindo a página",
  "phase.auditing": "rodando as verificações",
  "phase.processing": "processando os resultados",
  "phase.finalizing": "finalizando",
  "results.scanningStatus": "Auditando {url}. No momento: {phase}.",
  "report.roadmap.immediateTerm": "Imediato \u00b7 0\u20131 semana",
  "report.roadmap.immediateTitle": "Resolver os problemas críticos",
  "report.roadmap.immediateBody": {
    one: "Elimine primeiro o {count} problema crítico. Ele pesa mais na nota.",
    other: "Elimine primeiro os {count} problemas críticos. Eles pesam mais na nota.",
  },
  "report.roadmap.shortTerm": "Curto prazo \u00b7 2\u20134 semanas",
  "report.roadmap.shortTitle": "Tratar os problemas graves",
  "report.roadmap.shortBody": {
    one: "Trabalhe o {count} problema grave nos templates e componentes compartilhados.",
    other: "Trabalhe os {count} problemas graves nos templates e componentes compartilhados.",
  },
  "report.roadmap.longTerm": "Longo prazo \u00b7 1\u20133 meses",
  "report.roadmap.longTitle": "Refinar e reauditar",
  "report.roadmap.longBody":
    "Elimine os itens moderados restantes, faça as verificações de revisão manual e rode a auditoria de novo.",
  "report.noModerate": "Nenhum problema moderado.",

  "report.phase.preparing": "Iniciando um navegador e preparando a página.",
  "report.phase.loading": "Abrindo a página e deixando terminar de carregar.",
  "report.phase.auditing": "Rodando as verificações WCAG na página carregada.",
  "report.phase.processing":
    "Agrupando problemas e associando-os aos pontos de verificação da WCAG.",
  "report.phase.finalizing": "Pontuando e montando o relatório.",
  "report.freshNote":
    "O relatório é construído a partir de uma auditoria nova desta página, rodada agora.",
  "report.buildFailed": "Não conseguimos construir o relatório. Tente de novo.",
  "report.buildFailedTitle": "Não foi possível construir o relatório",
  "report.newAudit": "Nova auditoria",
  "report.fixFirst": "Corrija primeiro",
  "report.buildingStatus": "Construindo o relatório de {url}. {detail}",

  "report.wcagLevelsChecked": "Níveis WCAG verificados",
  "report.internalScoreFooter": "Nota interna \u00b7 não é uma declaração de conformidade",
  "report.pageOf": "WCAG A e AA \u00b7 Página {page} / 3",
  "report.headerTitle": "Relatório de acessibilidade \u00b7 {host}",
  "report.pagePassed": "A página passou em",
  "report.automatedChecks": "verificações automáticas",
  "report.passedLabel": "Aprovadas",
  "report.auditDate": "Data da auditoria",
  "report.auditDuration": "Duração da auditoria",
  "report.elementsChecked": "Elementos verificados",
  "report.exportedTitle": "Relatório de acessibilidade exportado",
  "report.internalScore": "Nota interna de prioridade",
  "report.executiveSummary": "Resumo executivo",
  "report.priorityRoadmap": "Roteiro de prioridades",
  "report.suggestedFix": "Correção sugerida",
  "report.selector": "Seletor",
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
  "results.findingsByPriority": "Problemas \u00b7 por prioridade",
  "results.findingsCount": "Problemas \u00b7 {count}",
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
    "A nota reflete apenas o que conseguimos medir. O que ficou de fora está listado abaixo — nada foi estimado.",

  "home.lens.locatedOccurrence": "Ocorrência localizada",
  "home.lens.verifiedInSandbox": "Verificado em cópia da página",
  "home.lens.measurement": "Medição",
  "home.lens.suggestedFix": "Correção sugerida",
  "home.lens.sandbox": "Cópia da página",
  "home.lens.before": "Antes",
  "home.lens.locate": "Localizar",
  "home.lens.verify": "Verificar",

  "history.deleteOneTitle": "Excluir esta auditoria?",
  "history.deleteOneBody":
    "Isso remove o relatório salvo e a captura de tela do seu histórico. Não dá para desfazer.",
  "history.deleteOne": "Excluir esta auditoria",
  "history.deleteAllTitle": "Limpar seu histórico de auditorias?",
  "history.deleteAllBody":
    "Isso exclui permanentemente todas as auditorias e capturas salvas. Não dá para desfazer.",
  "history.deleteAll": "Excluir todas as auditorias",

  "stages.opening": "Abrindo a página e esperando ela estabilizar",
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

  "login.title": "Entrar no AccessCheck",
  "login.github": "Entrar com GitHub",
  "login.google": "Entrar com Google",

  "results.couldNotOpen": "Não foi possível abrir a página",
  "results.tryAnotherUrl": "Tentar outro endereço",
  "results.seeWhatWeAudit": "Veja o que conseguimos auditar",
  "results.runAgainMoreTime": "Rodar de novo com mais tempo",
  "results.quickFromSite": "Resultado rápido da auditoria do site.",
  "results.tapMarker": "Toque em um marcador para abrir o problema correspondente.",
  "results.noFailuresMobile":
    "Nenhuma falha detectada automaticamente nesta página. Algumas coisas ainda precisam de conferência humana, listadas abaixo como itens de revisão manual.",
  "results.showOnScreenshot": "Mostrar na captura",
  "results.takingScreenshot": "Tirando a captura de tela da página.",
  "results.fullImpactNote":
    "O impacto completo, a prévia da correção e a verificação ficam no painel lateral.",
  "results.selectFinding": "Selecione um problema para inspecionar seu elemento e código.",

  "site.tryAnotherAddress": "Tentar outro endereço",
  "site.auditJustThisPage": "Auditar só esta página",
  "site.listNote":
    "Montamos a lista a partir do sitemap e dos links que conseguimos alcançar, e então auditamos cada página.",

  "history.tryDifferentDomain":
    "Tente outro domínio, ou limpe o filtro de nota para ver tudo de novo.",
  "history.runAudit": "Auditar uma página",
  "history.scoreUp": {
    one: "{count} ponto a mais que na auditoria anterior",
    other: "{count} pontos a mais que na auditoria anterior",
  },
  "history.scoreDown": {
    one: "{count} ponto a menos que na auditoria anterior",
    other: "{count} pontos a menos que na auditoria anterior",
  },
  "history.sortLabel": "Ordenar as auditorias",
  "history.clearHistory": "Limpar o histórico",
  "history.backToHistory": "Voltar ao histórico",
  "history.savedReport": "Relatório guardado",
  "history.searchByDomain": "Buscar auditorias por domínio",

  "report.sandboxApplied":
    "Aplicada e reconferida em uma cópia da página. O site auditado não foi alterado.",
  "report.whereScoreCouldGo": "Até onde a nota pode chegar",
  "report.projectionBody":
    "Se os problemas críticos e graves fossem resolvidos, a nota interna de prioridade subiria para um valor estimado de",
  "report.projectionTail":
    ". Isto é só uma projeção da nota, não uma aprovação na WCAG. Atender à WCAG também depende dos itens moderados e de",
  "report.accessibilityReport": "Relatório de acessibilidade",
  "report.detailedFindings": "Problemas detalhados",
  "report.noSeriousOnPage":
    "Nenhuma falha crítica ou grave detectada automaticamente nesta página. Itens moderados e revisão manual estão na página 3.",
  "report.changesSinceLast": "Mudanças desde a última auditoria",
  "report.scoringModelUpdated": "Modelo de pontuação atualizado",

  "login.subtitle": "Salve suas auditorias e acompanhe a nota de cada site ao longo do tempo.",
  "login.note":
    "Sem senhas. Usamos GitHub ou Google só para confirmar quem você é. O AccessCheck continua gratuito sem conta.",

  "wcagReading.notEvaluated": "Não avaliado. O AccessCheck cobre os níveis A e AA",
  "wcagReading.internalNote":
    "A nota serve para priorizar o trabalho, não para atestar conformidade. A WCAG também depende de verificações que nenhuma ferramenta automática resolve sozinha.",
  "ratio.ariaLabel": "Contraste de {found} para 1, mínimo de {required} para 1",
  "ratio.ariaLabelFixed": ", a correção alcança {fixed} para 1",
  "score.ariaLabel": "Nota interna de prioridade: {score} de 100",
  "home.cta.notConformance":
    "Nota interna de prioridade \u00b7 não é uma declaração de conformidade",
  "score.ifYouFix": "Corrigindo estes, a nota sobe para",

  "home.hero.standards": "axe-core \u00b7 WCAG 2.0 / 2.1 / 2.2 \u00b7 níveis A e AA",
  "home.footerStandards": "axe-core \u00b7 Playwright \u00b7 WCAG A e AA",
  "home.cta.standards":
    "AccessCheck \u00b7 axe-core \u00b7 Playwright \u00b7 WCAG 2.0 / 2.1 / 2.2 níveis A e AA",
  "home.lens.measureFound": "a medição encontrada",
  "home.lens.exactSelector": "o seletor exato",
  "home.lens.reauditedInCopy": "reauditada em uma cópia",
  "form.scopePage": "Página",
  "form.scopeSite": "Site",
  "home.hero.title": "Localize o problema. Entenda a causa. Teste a correção.",
  "home.hero.passes": "+ análises de teclado, viewport e visão",
  "home.hero.body":
    "Não é apenas um relatório. É um inspetor visual: cole o endereço de uma página e veja cada problema destacado no elemento em que foi encontrado, com a razão de contraste, o seletor CSS e uma correção testada em uma cópia da página.",
  "home.hero.lensNote":
    "Selecione um problema e o marcador dele acende na captura. Clique no marcador e os detalhes abrem: imagem, medição e código no mesmo lugar.",
  "home.lens.title": "Veja a barreira no elemento que a causou",
  "home.lens.body":
    "Elemento, seletor, medição e diagnóstico aparecem conectados. Ao selecionar um problema, o marcador correspondente é destacado e exibe a razão de contraste. Os demais permanecem com contorno tracejado, permitindo diferenciá-los sem depender apenas da cor.",
  "home.lens.contrastStory":
    "O texto branco sobre o botão verde-claro tem contraste insuficiente e pode ficar ilegível para pessoas com baixa visão ou em ambientes muito iluminados. O impacto é ainda maior porque esse é o botão usado para finalizar a compra.",
  "home.lens.sandboxNote": "Testado em uma cópia da página. O aurora-coffee.com não foi alterado.",
  "home.form.noAccount": "Sem criar conta ou modificar o site auditado.",
  "home.form.exportNote": "Exporte em PDF ou Markdown",
  "home.demo.roasted": "Torrado no Porto toda terça e enviado na mesma semana.",

  "home.notSeal.kicker": "Não é",
  "home.notSeal.body":
    "um selo de conformidade. A ferramenta mede o que o teste automático consegue provar e separa o restante para uma pessoa revisar.",
  "home.mostRecent": "Auditoria pública mais recente \u00b7 nota interna de prioridade",
  "home.auditSite": "Auditar site",
  "home.auditPage": "Auditar página",
  "home.timing": "De 10 a 25 segundos por página",
  "home.quickExamples": "Exemplos rápidos:",
  "home.stage.open": "Abrir",
  "home.stage.locate": "Localizar",
  "home.stage.verify": "Verificar",
  "home.stage.browserReady": "Chromium \u00b7 axe-core injetado \u00b7 página estabilizada",
  "home.axeRules.kicker": "regras do axe-core",
  "home.axeRules.note": "aprova ou reprova, sem margem para interpretação",
  "home.axeRules.countLine1": "critérios de sucesso",
  "home.axeRules.countLine2": "verificados automaticamente",
  "home.complementary.kicker": "análises complementares",
  "home.complementary.note": "o que uma ferramenta não julga sozinha",
  "home.complementary.countLine1": "análises que vão",
  "home.complementary.countLine2": "além do DOM estático",

  "results.checksPassedLabel": "verificações automáticas aprovadas",
  "results.manualReviewLabel": "itens de revisão manual, com o passo a passo",
  "results.needPersonReview": "precisam da conferência de uma pessoa, listados abaixo.",
  "results.fixArrow": "corrigir \u2192 {score}",
  "results.outsideScore": "fora da nota",
  "results.runFullAuditNote":
    "a auditoria completa para incluir a captura de tela, as verificações de teclado e o teste das correções.",
  "results.siteAuditPassNote":
    "Análise da auditoria de site: regras do axe e as detecções próprias deste projeto. Teclado, interface expandida e verificação de correções rodam na auditoria completa da página.",
  "results.noMarkerOffScreenshot": "sem marcador \u00b7 fora da captura",
  "score.checksPassed": "{count} verificações automáticas aprovadas",
  "score.nonLinearNote":
    "Cada linha mostra a nota se você corrigir só aquela severidade. A nota não é linear: corrigir mais de uma recupera menos do que a soma das linhas.",
  "wcagReading.failsBy": "Reprova em",

  "home.howItWorks.kicker": "Como funciona",
  "home.howItWorks.title": "Abrir a página, localizar o problema, verificar a correção",
  "home.checks.kicker": "Verificações incluídas",
  "home.checks.title":
    "Verificações automáticas e análises complementares que exigem avaliação humana",
  "home.sandbox.kicker": "Verificação em cópia da página",
  "home.sandbox.title": "Cada correção é testada em uma cópia. Seu site permanece intacto.",
  "home.sandbox.body":
    "Aplicamos a mudança em uma cópia da página, executamos a verificação novamente e depois a desfazemos. Se o problema deixa de ser detectado, marcamos a correção como verificada. Isso não garante conformidade, e o site original nunca é alterado.",
  "home.sandbox.measurement": "Medição de contraste \u00b7 1.4.3 AA",
  "home.sandbox.found": "encontrado \u00b7 o mínimo para texto normal é {required}:1",
  "home.export.kicker": "Exportação",
  "home.export.title": "Duas exportações, dois públicos: quem decide e quem corrige",
  "home.export.pdfFor": "para quem decide",
  "home.export.pdfTitle": "Nota, régua e impacto em linguagem simples",
  "home.export.pdfBody":
    "Resumo, níveis de severidade e o impacto de cada problema nas pessoas. Pronto para enviar a um cliente ou ao time de produto, sem exigir contexto técnico.",
  "home.export.mdFor": "para quem corrige",
  "home.export.mdTitle": "Seletor, trecho e status de verificação",
  "home.export.mdBody":
    "Tabela de severidade e lista priorizada, prontas para colar em um ticket ou pull request, já com as correções verificadas marcadas.",
  "home.cta.measured": "Medido",
  "home.cta.located": "Localizado",
  "home.cta.verified": "Verificado",
  "home.cta.title": "Audite uma página agora e veja onde está cada barreira",
  "home.cta.body":
    "Sem cadastro, sem extensão e sem alterar o seu site. O relatório fica pronto em menos de meio minuto e sai em PDF ou Markdown.",
  "home.cta.publicOnly":
    "Só conseguimos auditar páginas públicas. Endereços privados ou internos serão recusados.",

  "home.rule.contrast": "Contraste do texto contra o fundo computado",
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
    "Refaz a análise em tamanho de celular e depois de abrir menus e seções expansíveis",
  "home.pass.vision": "Visão",
  "home.pass.visionDesc":
    "Simula daltonismo (deuteranopia, protanopia, tritanopia), baixa visão e escala de cinza",
  "home.pass.motion": "Movimento",
  "home.pass.motionDesc":
    "Verifica se a página respeita a preferência de movimento reduzido de quem acessa",
  "home.pass.live": "Dinâmico",
  "home.pass.liveDesc": "Observa atualizações anunciadas a leitores de tela (regiões dinâmicas)",
  "home.pass.review": "Revisão",
  "home.pass.reviewDesc":
    "Lista o que ainda depende de conferência humana, com o passo a passo para confirmar",

  "home.step1.title": "Aberta em um navegador real",
  "home.step1.body":
    "Abrimos a página em um navegador real, esperamos ela terminar de carregar e só então rodamos os testes do axe-core. Funciona inclusive em sites com política de segurança restritiva (CSP).",
  "home.step2.title": "Cada problema é medido e ligado a um elemento",
  "home.step2.body":
    "Razão de contraste, seletor CSS, trecho de código e posição na captura de tela. Problemas repetidos ficam agrupados, então uma correção só já resolve vários elementos.",
  "home.step3.title": "Cada correção é testada antes de ser sugerida",
  "home.step3.body":
    "Aplicamos a mudança em uma cópia da página, rodamos a verificação de novo e marcamos o resultado como correção verificada ou como pendente de revisão.",

  "home.example.name": "Contraste (Mínimo)",
  "home.example.title": "Texto abaixo do contraste mínimo",
  "home.example.summary":
    "Nenhum bloqueio crítico, mas 1 problema grave ainda deixa a página mais difícil de usar para quem depende de tecnologia assistiva.",

  "home.example.desc":
    "Garante que o contraste entre as cores de primeiro plano e de fundo atenda ao limite da WCAG.",
  "home.example.fixText": "Defina a cor do texto para {hex} \u2192 {ratio}:1.",
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
    "Quem usa leitor de tela navega por nível de título para percorrer a página; um nível pulado ou fora de ordem torna a estrutura enganosa e esconde onde as seções começam.",
  "impact.headingOne":
    "Sem um título de primeiro nível, quem usa leitor de tela não tem referência confiável de \u201cdo que trata esta página\u201d e não consegue pular para o conteúdo principal por título.",
  "impact.landmark":
    "As regiões de referência (landmarks) deixam quem usa leitor de tela pular direto para a navegação, o conteúdo principal ou o rodapé. Conteúdo fora delas só é alcançado lendo a página inteira em ordem.",
  "impact.list":
    "Leitores de tela anunciam \u201clista, N itens\u201d e permitem pular; uma marcação de lista malformada perde essa contagem e a possibilidade de avançar item a item.",
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
    "Alvos de toque pequenos são difíceis de acertar para pessoas com limitações motoras ou de destreza, e para qualquer pessoa em um ônibus em movimento ou com dedos maiores.",
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
    "A página não tem <title>, a primeira coisa que os leitores de tela anunciam e o rótulo que os navegadores mostram em abas e histórico. Adicione um descritivo.",
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
  "fix.contrastHueKept": " A matiz continua a mesma; só a luminosidade muda.",
  "fix.contrastHueShifted":
    " (a matiz foi puxada para o neutro para atingir o contraste necessário sobre este fundo)",
  "fix.contrastForeground":
    "Troque a cor do texto {from} por {to} \u2192 {ratio}:1 contra {bg} {was}.{hueNote}",
  "fix.contrastAlsoBackground": " Ou mantenha o texto e defina o fundo como {bg}.",
  "fix.contrastBackground":
    "A cor de texto {fg} não alcança {required}:1 sobre {bg} mudando só o texto. Defina o fundo como {newBg} \u2192 {ratio}:1 {was}. A matiz do fundo continua a mesma; só a luminosidade muda.",
  "fix.contrastNeither":
    "A cor de texto {fg} sobre {bg} alcança apenas {measured}:1 (precisa de {required}:1). Nem o texto nem o fundo resolvem só pela luminosidade nestas matizes, então escolha um par mais escuro ou mais claro.",

  "fix.headingOne.action":
    "Adicione um <h1> que descreva o propósito principal da página, no início do conteúdo primário, antes do texto introdutório.",
  "fix.headingOne.caution":
    "Não adicione um título vazio ou escondido visualmente só para calar a regra, a menos que isso corresponda de fato à estrutura da página.",
  "fix.headingOrder.action":
    "Mude o título sinalizado para que os níveis só aumentem de um em um (h2 para h3, nunca h2 para h4). Renumere pela estrutura, não pelo tamanho visual, e use CSS para dimensionar.",
  "fix.headingOrder.caution":
    "Nunca pule um nível para conseguir uma fonte menor; estilize o nível correto.",
  "fix.landmark.action":
    "Envolva o conteúdo principal num marco <main>. Mantenha a navegação do site em <nav>, a marca introdutória em <header> e as informações de fechamento em <footer>, para que cada parte da página fique dentro de um marco.",
  "fix.list.action":
    "Garanta que todo <li> seja filho direto de um <ul> ou <ol> (e que nada além de <li> fique diretamente dentro deles). Não simule listas com <div>s e marcadores.",
  "fix.duplicateId.action":
    "Dê ao elemento sinalizado um id único. Se vários controles compartilham um rótulo, aponte cada referência de label/aria para o próprio id em vez de reutilizar um só.",
  "fix.frame.action":
    "Adicione ao <iframe> um atributo title curto e descritivo dizendo o que ele contém.",
  "fix.focusVisible.action":
    "Dê aos elementos interativos um estilo de foco claramente visível. Estilize :focus-visible em vez de remover contornos. Nunca use outline: none sem uma substituição.",
  "fix.focusVisible.caution":
    "Não dependa só de mudança de cor; mantenha um contorno ou box-shadow visível.",
  "fix.focusOrder.action":
    "Coloque os elementos no DOM na ordem em que as pessoas devem tabular por eles, e remova valores positivos de tabindex para que o foco siga a ordem do código.",
  "fix.keyboardTrap.action":
    "Garanta que o foco consiga sair do componente com Tab / Shift+Tab (e Esc para diálogos). Gerencie o foco em JS para que ele volte a um lugar sensato quando o componente fechar.",
  "fix.tabindex.action":
    'Remova valores de tabindex maiores que 0. Use tabindex="0" para tornar um controle personalizado focalizável, ou -1 para focá-lo por código. Nunca use números positivos.',
  "fix.reachable.action":
    'Faça de cada controle um elemento focalizável nativo: use <button>/<a> em vez de uma <div> clicável, ou acrescente tabindex="0" e trate os eventos de teclado ao controle personalizado.',
  "fix.targetSize.action":
    "Dê ao alvo pelo menos 24\u00d724px de área de toque (44\u00d744 é mais seguro em telas sensíveis), ou deixe espaçamento suficiente ao redor. Preencha o controle em vez de só aumentar um ícone.",
  "fix.motion.action":
    "Coloque as animações não essenciais dentro de uma consulta prefers-reduced-motion, para que sejam suprimidas para quem pediu menos movimento.",
  "fix.live.action":
    'Anuncie atualizações dinâmicas por uma região dinâmica: coloque o texto de status em um elemento com aria-live="polite" (ou role="status"), e os erros em aria-live="assertive".',

  "marker.bestPractice":
    "Boa prática, registrada como cobertura. Não se refere a um único elemento posicionado.",
  "marker.context":
    "Encontrado em outro contexto (tamanho de celular ou um estado aberto), então não está na captura de desktop.",
  "marker.keyboard":
    "Veio da análise de teclado, então aparece no caminho do foco em vez de como marcador de problema.",
  "marker.docLevel":
    "Aplica-se ao documento inteiro ou à estrutura da página, não a um único elemento posicionado.",
  "marker.offCapture":
    "O elemento afetado está fora da parte da página que capturamos (os primeiros 1200\u00d7800 pixels), está oculto, ou não tem caixa visível na captura.",

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

  "sim.deuteranopiaDesc":
    "Daltonismo vermelho-verde por ausência dos cones verdes. Atinge cerca de 6% dos homens.",
  "sim.protanopiaDesc":
    "Daltonismo vermelho-verde por ausência dos cones vermelhos. Atinge cerca de 2% dos homens.",
  "sim.tritanopiaDesc":
    "Daltonismo azul-amarelo por ausência dos cones azuis. Raro, cerca de 0,01%.",

  "report.projectionCaveat":
    ". É apenas uma projeção da nota, não uma aprovação na WCAG. Atender à WCAG depende também dos itens moderados e da revisão manual.",
  "report.recommendations": "Recomendações",
  "report.wcagDisclaimer":
    "O AccessCheck roda o axe-core contra os níveis A e AA da WCAG (2.0, 2.1 e 2.2). O teste automático cobre apenas parte dos critérios da WCAG; o restante exige a revisão de uma pessoa, muitas vezes com leitor de tela ou outra tecnologia assistiva. O nível AAA não é verificado, e este relatório não é uma declaração de conformidade.",
  "report.findingsIntro":
    "Cada problema aparece agrupado por severidade e associado ao critério de sucesso A/AA da WCAG, com o impacto nas pessoas, a medição quando existe e uma correção reauditada em uma cópia da página.",
  "report.scoringModelNote":
    "As duas auditorias foram pontuadas por modelos diferentes (v{from} e v{to}), então os números acima não representam alta nem queda. Quais regras foram corrigidas e quais regrediram continua valendo.",

  "site.theSite": "o site",
  "site.notFound": "Auditoria de site não encontrada.",
  "context.recheckShort": "Confira este elemento de novo no contexto em que ele falhou.",
  "context.recheckLong":
    "Confira este elemento de novo no contexto em que ele falhou; o motor não testou uma correção aqui.",

  "sim.normalDesc": "Renderização padrão, sem filtro de visão.",
  "sim.lowVisionDesc": "Nitidez e sensibilidade ao contraste reduzidas.",
  "sim.grayscaleDesc": "Toda a cor removida. Verifica se o significado sobrevive sem matiz.",

  "wcagReading.noA": "Nenhuma falha de nível A detectada automaticamente",
  "wcagReading.noAA": "Nenhuma falha de nível A detectada automaticamenteA",
  "provenance.title": "Procedência",
  "provenance.complementary":
    "Passagens complementares: teclado, viewport de celular, UI expandida, visão, movimento, regiões dinâmicas.",
  "stepper.previous": "Ocorrência anterior",
  "stepper.next": "Próxima ocorrência",
  "seal.verified": "Verificado: a regra parou de sinalizar o elemento",
  "seal.needsReview": "Precisa de revisão: a sugestão sozinha não resolve",
  "seal.notReaudited": "Não reauditado",

  "history.title": "Histórico de auditorias",
  "history.noMatches": "Nenhuma auditoria corresponde aos seus filtros",
  "history.empty": "Nenhuma auditoria ainda",
  "history.emptyBody":
    "Rode uma auditoria logado e ela aparece aqui, para você acompanhar a nota de cada site ao longo do tempo.",
  "history.searchPlaceholder": "Buscar por domínio\u2026",
  "history.clearSearch": "Limpar busca",
  "history.filterByScore": "Filtrar por nota",

  "site.runningAverage": "média parcial entre as páginas auditadas",
  "site.finalAverage": "média entre todas as páginas auditadas",
  "site.newAuditTitle": "Começar uma auditoria nova",
  "site.newAudit": "Nova auditoria",
  "site.fullAudit": "Auditoria de acessibilidade do site inteiro",
  "site.auditFailed": "A auditoria falhou",
  "site.score": "Nota do site",
  "site.noAutomatedFindings": "Nenhum problema detectado automaticamente",
  "site.noFindings": "Nenhum problema",
  "site.pageFailed": "Não foi possível auditar esta página.",

  "severity.critical": "Crítico",
  "severity.serious": "Grave",
  "severity.moderate": "Moderado",
  "severity.minor": "Leve",

  "cue.verified": "· verificado em cópia da página",
  "cue.partial": "· parcialmente verificado",
  "cue.sampled": "· um exemplo conferido",
  "cue.failed": "· precisa de revisão",

  "detail.sampleText": "Texto de exemplo",
  "detail.verifiedOnElement": "Verificado neste elemento",
  "detail.verifiedOnElementNote":
    "Passa no WCAG AA, confirmado por reauditoria do elemento localizado",
  "detail.uncertain": "Resultado incerto",
  "detail.uncertainNote": "Não dá para confirmar que atinge o mínimo no fundo real",
  "detail.calculated": "Calculado",
  "detail.calculatedNote":
    "Chegaria a {ratio}:1, calculado a partir das cores detectadas, não verificado ao vivo",
  "detail.previewNote":
    "A prévia usa as cores de primeiro plano e de fundo detectadas. Tipografia e contexto da página não são reproduzidos.",
  "detail.contrastPreview": "Prévia de contraste",
  "detail.property": "Propriedade",
  "detail.detected": "Detectado",
  "detail.suggested": "Sugerido",
  "detail.result": "Resultado",
  "detail.impactOnUsers": "Impacto nas pessoas",
  "detail.affectedElement": "Elemento afetado",
  "detail.howToFix": "Como corrigir",
  "detail.verificationResult": "Resultado da verificação",
  "detail.sandboxNote":
    "As correções são aplicadas e revertidas em uma cópia da página. {host} não foi alterado.",

  "verdict.label.verified": "Correção verificada",
  "verdict.label.partial": "Parcialmente verificada",
  "verdict.label.sampledMany": "Exemplos conferidos",
  "verdict.label.sampledOne": "Um exemplo conferido",
  "verdict.label.failed": "Precisa de revisão humana",
  "verdict.label.unverifiable": "Não foi possível verificar",
  "verdict.label.noAutoFix": "Precisa de revisão humana",
  "verdict.label.bestPractice": "Boa prática",
  "verdict.label.complementary": "Não reauditado",

  "verdict.others": {
    one: "A outra {count} ocorrência compartilha a mesma sugestão, mas não foi verificada individualmente.",
    other:
      "As outras {count} ocorrências compartilham a mesma sugestão, mas não foram verificadas individualmente.",
  },
  "verdict.verifiedShared":
    "Aplicada em uma cópia da página e reauditada: a regra parou de sinalizar cada uma das {count} ocorrências.",
  "verdict.verifiedSingle":
    "Aplicada em uma cópia da página e reauditada: a regra parou de sinalizar o elemento.",
  "verdict.partial":
    "Cada ocorrência foi reauditada em uma cópia da página: {cleared} de {total} passaram e {failed} continuam falhando. Revise as que continuam.",
  "verdict.sampledOne":
    "O elemento representativo passou depois da mudança sugerida, em uma cópia da página. {others}",
  "verdict.sampledMany":
    "Reauditadas {reaudited} de {total} ocorrências em uma cópia da página (uma representante por correção sugerida): {cleared} passaram{failedTail}. {others}",
  "verdict.sampledFailedTail": " e {failed} continuam falhando",
  "verdict.failedSubjectSingle": "Este elemento",
  "verdict.failedSubjectSampled": "O elemento representativo",
  "verdict.failedMeasured":
    "{subject} continua falhando depois da mudança sugerida: a nova cor chega a {ratio}:1 contra o fundo detectado, mas a regra ainda sinaliza. O fundo real pode ser uma imagem, um gradiente ou uma camada sobreposta.{tail}",
  "verdict.failedPlain":
    "{subject} continua falhando mesmo com a mudança aplicada em uma cópia da página. Revise esse caso manualmente.{tail}",
  "verdict.unverifiable":
    "Não foi possível reauditar o elemento na cópia da página — ele não foi encontrado ou a verificação foi interrompida por tempo. Confirme a mudança manualmente.",
  "verdict.noAutoFix":
    "Este problema não tem correção automática. Uma pessoa precisa decidir a mudança certa para a página.",
  "verdict.bestPractice":
    "Boa prática, não um critério de sucesso da WCAG. Vale corrigir, mas não altera a leitura WCAG.",
  "verdict.complementary":
    "Encontrado por uma análise complementar (teclado, celular, visão ou estado dinâmico); não é reauditado em uma cópia da página. Corrija e rode de novo para confirmar.",

  "keyboard.region.offscreen": "fora do viewport visível",
  "keyboard.region.top": "perto do topo da página",
  "keyboard.region.middle": "no meio da página",
  "keyboard.region.bottom": "perto do fim da página",

  "keyboard.invisible.noStyles":
    "O foco chegou a este elemento e não produziu nenhuma mudança detectável de outline, box-shadow, borda ou fundo.",
  "keyboard.invisible.noOutline":
    "nenhum outline apareceu (outline-style: {style}, outline-width: {width})",
  "keyboard.invisible.boxShadow": "o box-shadow continuou {value}",
  "keyboard.invisible.border": "a borda continuou {width} {color}",
  "keyboard.invisible.background": "o fundo continuou {value}",
  "keyboard.invisible.nothingChanged":
    "O foco chegou a este elemento e nada mudou: {unchanged}. Espera-se um indicador de foco aqui — um outline, um box-shadow, uma borda ou um fundo diferente do estado de repouso do elemento.",
  "keyboard.invisible.title": {
    one: "Sem indicador de foco visível em {count} elemento",
    other: "Sem indicador de foco visível em {count} elementos",
  },
  "keyboard.invisible.desc": {
    one: "Focar este elemento pelo teclado não produziu nenhuma mudança detectável de outline, box-shadow, borda ou fundo. Quem enxerga e usa teclado não consegue saber onde está na página.",
    other:
      "Focar estes elementos pelo teclado não produziu nenhuma mudança detectável de outline, box-shadow, borda ou fundo. Quem enxerga e usa teclado não consegue saber onde está na página.",
  },
  "keyboard.invisible.fix":
    "Adicione um estilo :focus-visible claro (por exemplo outline: 2px solid; outline-offset: 2px;) em vez de remover o contorno com outline: none.",

  "keyboard.jump.up": "o foco voltou para cima na página",
  "keyboard.jump.back": "o foco voltou para a esquerda na mesma linha",
  "keyboard.jump.where": ', de {fromRegion} ("{fromLabel}") para {toRegion} ("{toLabel}")',
  "keyboard.jump.measured": " Medido a partir do topo do viewport: {from}px → {to}px.",
  "keyboard.jump.reason":
    "Parada {from} → Parada {to}: {movement}{where}.{measured} Isto é evidência geométrica, não prova: confira se corresponde à ordem de leitura que você pretende.",

  "keyboard.trap.title": "O foco do teclado está preso",
  "keyboard.trap.desc":
    "Pressionar Tab manteve o foco no mesmo elemento em vez de avançar. Quem usa teclado ou leitor de tela pode ficar preso aqui sem saída.",
  "keyboard.trap.fix":
    "Garanta que o elemento não intercepte o Tab ou, se for um diálogo, ofereça uma saída clara: Esc fecha e devolve o foco ao controle que o abriu.",
  "keyboard.trap.occurrence":
    "O Tab foi pressionado aqui e o foco continuou neste mesmo elemento, então o percurso não pôde seguir.",

  "keyboard.unreachable.title": {
    one: "{count} controle interativo não é alcançável por teclado",
    other: "{count} controles interativos não são alcançáveis por teclado",
  },
  "keyboard.unreachable.desc": {
    one: "{count} elemento se comporta como interativo (eventos de clique ou papéis ARIA), mas o Tab nunca chega nele, então só dá para usar com mouse.",
    other:
      "{count} elementos se comportam como interativos (eventos de clique ou papéis ARIA), mas o Tab nunca chega neles, então só dá para usar com mouse.",
  },
  "keyboard.unreachable.fix":
    'Dê a cada controle um elemento focalizável nativo (<button>, <a href>) ou acrescente tabindex="0" e trate os eventos de teclado para que ele possa ser alcançado e operado.',
  "keyboard.unreachable.occurrence":
    "Este elemento parece interativo (um evento de clique ou um papel ARIA), mas o percurso do Tab nunca parou nele. Confirme se ele deveria ser operável.",

  "keyboard.order.title": {
    one: "A ordem de foco sai de sequência {count} vez",
    other: "A ordem de foco sai de sequência {count} vezes",
  },
  "keyboard.order.desc":
    "A ordem do Tab não segue a ordem visual de leitura (de cima para baixo, da esquerda para a direita). O foco pula para trás ou para cima, o que desorienta quem usa teclado e leitor de tela. Cada salto está listado abaixo: se está errado depende da ordem de leitura que a página pretende, então precisam de conferência humana.",
  "keyboard.order.fix":
    "Alinhe a ordem do DOM à ordem visual e evite reordenar com CSS (order, flex-direction: row-reverse, posicionamento absoluto) ou com tabindex positivo.",

  "keyboard.tabindex.title": {
    one: "{count} elemento usa tabindex positivo",
    other: "{count} elementos usam tabindex positivo",
  },
  "keyboard.tabindex.desc":
    "Um tabindex positivo sobrepõe a ordem natural de tabulação e quase sempre é fonte de um comportamento de foco confuso e difícil de manter.",
  "keyboard.tabindex.fix":
    'Troque os valores positivos de tabindex por tabindex="0" (ou nenhum) e deixe a ordem do DOM definir a sequência.',
  "keyboard.tabindex.occurrence":
    "Este elemento carrega um tabindex positivo, então é retirado da ordem do documento e visitado antes de elementos que vêm antes dele na página.",

  "stage.structure": "Lendo a estrutura da página",
  "stage.rules": "Rodando as regras de acessibilidade",
  "stage.focus": "Percorrendo o caminho do foco",
  "stage.report": "Preparando o relatório",

  "panel.scoreOutOf": " de 100 — voltar para o resumo",
  "panel.scoreHeading": "Nota da auditoria",
  "panel.perHundred": "/100",
  "panel.count.critical": "críticos",
  "panel.count.serious": "graves",
  "panel.count.moderate": "moderados",
  "panel.count.minor": "leves",
  "panel.count.passed": "aprovados",
  "panel.count.bestPractice": "boas práticas",
  "panel.count.manualReview": "revisão manual",

  "panel.evidence": "Evidências",
  "panel.evidenceNote": "captura do viewport",
  "panel.evidenceNoteMarked": "captura do viewport · {count} marcados",
  "panel.screenshotAlt": "Captura de tela de {url}",

  "panel.copied": "Copiado",
  "panel.copyFailed": "Falha ao copiar",
  "panel.copySelector": "Copiar seletor",
  "panel.copyHtml": "Copiar HTML",

  "panel.occurrences": "Ocorrências",
  "panel.occurrenceOf": "Ocorrência {at} de {total}",
  "panel.neverReached": "Nunca alcançado por Tab",
  "panel.stopN": "Parada {n}",
  "panel.geometryUnsure":
    "A geometria sozinha não decide este caso — confira com a ordem de leitura que você pretende.",
  "panel.position": "Posição",
  "panel.positionValue": "{w}×{h}px em {x}, {y}",
  "panel.offViewport": " · fora do viewport no momento da medição",
  "panel.element": "Elemento",
  "panel.abbreviated":
    "Abreviado com … , e atributos que podem carregar o que você digitou ficam de fora. Serve como evidência, não como código para colar de volta.",
  "panel.locating": "Procurando…",
  "panel.locate": "Localizar na página",

  "panel.alsoFailsIn": "Também falha em {contexts}",
  "panel.problem": "Problema",
  "panel.suggestedFix": "Correção sugerida",
  "panel.findings": "Problemas",
  "panel.readingLanguage":
    "Esta leitura foi gerada em {language}. Audite a página de novo para recebê-la neste idioma.",
  "panel.noFailures": "Nenhuma das verificações desta versão encontrou falhas.",

  "panel.checksPerformed": "Verificações executadas",
  "panel.check.primed":
    "Percorreu a página antes, para que o conteúdo que só aparece ao rolar fosse lido",
  "panel.check.axe": "axe-core, WCAG A e AA (2.0, 2.1, 2.2) mais boas práticas",
  "panel.check.targetSize": "Tamanho do alvo (WCAG 2.5.8)",
  "panel.check.liveRegions": "Regiões dinâmicas (WCAG 4.1.3)",
  "panel.check.screenshot": "Captura do viewport visível",
  "panel.check.focusPath": "Caminho do foco com pressionamentos reais de Tab",
  "panel.check.focusPathStopped": "Caminho do foco com pressionamentos reais de Tab (parou cedo)",

  "panel.mark.noFocusRing": "sem indicador de foco",
  "panel.mark.checkOrder": "conferir ordem",
  "panel.mark.stop": "parada",

  "panel.focusPath": "Caminho do foco",
  "panel.focusPathAbsent":
    "Esta leitura não tem caminho do foco. Percorrê-lo anexa o depurador do Chrome pelo tempo do percurso — o Chrome mostra o próprio aviso enquanto isso —, tecla Tab na página e devolve foco e rolagem no fim.",
  "panel.showFocusPath": "Mostrar o caminho do foco",
  "panel.previousStop": "Parada anterior",
  "panel.previous": "Anterior",
  "panel.nextStop": "Próxima parada",
  "panel.next": "Próxima",
  "panel.stopOf": "Parada {at} de {total}",
  "panel.showNearbyOnly": "Mostrar só as paradas próximas",
  "panel.showComplete": "Mostrar o caminho completo",
  "panel.clearOverlay": "Limpar a sobreposição",
  "panel.backToWhereYouWere": "Voltar para onde você estava",
  "panel.drawingAll":
    "Todas as paradas estão desenhadas. A atual fica destacada; as outras, esmaecidas.",
  "panel.drawingWindow":
    "Desenhando a parada atual e {neighbours} de cada lado, para a página seguir legível.",
  "panel.walkNow": "Percorrer o caminho do foco agora",

  "panel.quickAudit": "Auditoria rápida",
  "panel.auditingTab": "Auditando esta aba",
  "panel.runningNote":
    "A nota aparece quando todos os passos acima terminarem. A página não é modificada.",
  "panel.runningNoteDeep":
    " Percorrer o caminho do foco anexa o depurador do Chrome só nesse passo — o Chrome mostra o próprio aviso enquanto isso — e ele é liberado antes de o relatório aparecer.",
  "panel.announceStep": "Auditando. Passo {n}: {stage}.",

  "panel.coverageLimitations": "Limites da cobertura",
  "panel.notChecked": "Não verificado nesta versão",
  "panel.notCheckedNote":
    "Uma leitura desta versão nunca atesta que a página está livre de barreiras.",
  "panel.auditAgain": "Auditar esta aba de novo",
  "panel.runQuickAudit": "Rodar auditoria rápida",
  "panel.quickAuditNote": "Sem depurador nem caminho do foco",

  "panel.idleTitle": "Nada auditado ainda",
  "panel.idleBody":
    "Clique no ícone do AccessCheck na barra de ferramentas para auditar a página em que você está. A auditoria roda as regras e depois percorre o caminho do foco, o que anexa o depurador do Chrome nesse passo. Nada sai do seu navegador.",
  "panel.unsupportedKicker": "Sem suporte aqui",
  "panel.unsupportedTitle": "Esta página não pode ser auditada",
  "panel.errorKicker": "A auditoria falhou",
  "panel.errorTitle": "A auditoria não conseguiu terminar",
  "panel.tryAgain": "Tentar de novo",

  "panel.pageUnreachable": "Não foi possível alcançar a página daqui.",
  "panel.elementGone":
    "Esse elemento não está mais na página: o DOM mudou desde que a auditoria rodou.",
  "panel.someStopsGone":
    "{missing} de {total} paradas não estão mais na página, então não puderam ser desenhadas.",
  "panel.someStopsOffScreen":
    "{offScreen} de {total} paradas estão fora do viewport agora, então só o resto foi desenhado.",
};

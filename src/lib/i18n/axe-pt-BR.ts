export const axePtBRGaps = {
  rules: {
    "aria-braille-equivalent": {
      description:
        "Certifique-se de que aria-braillelabel e aria-brailleroledescription tenham um equivalente fora do braille",
      help: "Atributos aria-braille devem ter um equivalente fora do braille",
    },
    "aria-conditional-attr": {
      description:
        "Certifique-se de que os atributos ARIA sejam usados como a especificação da função do elemento descreve",
      help: "Atributos ARIA devem ser usados como a função do elemento especifica",
    },
    "aria-deprecated-role": {
      description: "Certifique-se de que os elementos não usem funções obsoletas",
      help: "Funções ARIA obsoletas não devem ser usadas",
    },
    "aria-prohibited-attr": {
      description:
        "Certifique-se de que os atributos ARIA não sejam proibidos para a função do elemento",
      help: "Os elementos devem usar apenas atributos ARIA permitidos",
    },
    "aria-tab-name": {
      description: "Certifique-se de que toda aba ARIA tenha um nome acessível",
      help: "Abas ARIA devem ter um nome acessível",
    },
    "meta-refresh-no-exceptions": {
      description:
        'Certifique-se de que <meta http-equiv="refresh"> não seja usado para atualizar a página depois de um tempo',
      help: "A página não deve se atualizar depois de um tempo",
    },
    "summary-name": {
      description: "Certifique-se de que elementos summary tenham texto discernível",
      help: "Elementos summary devem ter texto discernível",
    },
    "target-size": {
      description: "Certifique-se de que os alvos de toque tenham tamanho e espaço suficientes",
      help: "Alvos de toque devem ter 24px ou deixar espaço suficiente ao redor",
    },
  },
  checks: {
    "aria-allowed-attr-elm": {
      pass: "Os atributos ARIA são permitidos neste elemento",
      fail: {
        singular: "Atributo ARIA não permitido em elementos ${data.nodeName}: ${data.values}",
        plural: "Atributos ARIA não permitidos em elementos ${data.nodeName}: ${data.values}",
      },
    },
    "aria-allowed-attr": {
      incomplete:
        "Confira se nada se perde quando o atributo ARIA é ignorado neste elemento: ${data.values}",
    },
    "aria-busy": {
      pass: "O elemento tem um atributo aria-busy",
      fail: 'O elemento usa aria-busy="true" enquanto mostra um indicador de carregamento',
    },
    "aria-conditional-attr": {
      pass: "O atributo ARIA é permitido",
      fail: {
        checkbox:
          'Remova aria-checked ou defina-o como "${data.checkState}" para corresponder ao estado real da caixa de seleção',
        radio:
          'Remova aria-checked ou defina-o como "${data.checkState}" para corresponder ao estado real do botão de opção',
        rowSingular:
          "Este atributo é aceito em linhas de treegrid, mas não em ${data.ownerRole}: ${data.invalidAttrs}",
        rowPlural:
          "Estes atributos são aceitos em linhas de treegrid, mas não em ${data.ownerRole}: ${data.invalidAttrs}",
      },
    },
    "aria-errormessage": {
      fail: {
        unsupported:
          "Vários IDs em aria-errormessage não têm bom suporte nas tecnologias assistivas",
        hidden:
          "O valor de aria-errormessage `${data.values}` não pode apontar para um elemento oculto",
      },
      incomplete: {
        idrefs:
          "Não foi possível determinar se o elemento de aria-errormessage existe na página: ${data.values}",
      },
    },
    "aria-level": {
      pass: "Os valores de aria-level são válidos",
      incomplete:
        "Valores de aria-level maiores que 6 não são aceitos por todas as combinações de leitor de tela e navegador",
    },
    "aria-required-children": {
      pass: {
        "aria-busy":
          "O elemento tem um atributo aria-busy, então pode deixar de ter os filhos obrigatórios",
      },
      fail: {
        unallowed: "O elemento tem filhos que não são permitidos: ${data.values}",
        "aria-busy-fail":
          'O elemento tem filhos que não são permitidos: ${data.values}. Mesmo com aria-busy="true", filhos com funções não permitidas continuam proibidos',
      },
    },
    "aria-valid-attr-value": {
      incomplete: {
        noIdShadow:
          "O ID referenciado pelo atributo ARIA não existe na página ou está em outra árvore de shadow DOM: ${data.needsReview}",
        idrefs:
          "Não foi possível determinar se o ID referenciado pelo atributo ARIA existe na página: ${data.needsReview}",
        empty: "O valor do atributo ARIA é ignorado enquanto estiver vazio: ${data.needsReview}",
        controlsWithinPopup:
          "Não foi possível determinar se o ID referenciado por aria-controls existe na página quando aria-haspopup é usado: ${data.needsReview}",
      },
    },
    "braille-label-equivalent": {
      pass: "aria-braillelabel é usado em um elemento com texto acessível",
      fail: "aria-braillelabel é usado em um elemento sem texto acessível",
      incomplete: "Não foi possível calcular o texto acessível",
    },
    "braille-roledescription-equivalent": {
      pass: "aria-brailleroledescription é usado em um elemento com aria-roledescription",
      fail: {
        noRoleDescription:
          "aria-brailleroledescription é usado em um elemento sem aria-roledescription",
        emptyRoleDescription:
          "aria-brailleroledescription é usado em um elemento com aria-roledescription vazio",
      },
    },
    deprecatedrole: {
      pass: "A função ARIA não é obsoleta",
      fail: "A função usada é obsoleta: ${data}",
    },
    fallbackrole: {
      incomplete: "Use apenas 'presentation' ou 'none', já que as duas funções são sinônimas.",
    },
    "color-contrast-enhanced": {
      incomplete: {
        colorParse: "Não foi possível interpretar a cor ${data.colorParse}",
      },
    },
    "color-contrast": {
      incomplete: {
        complexTextShadows:
          "Não foi possível determinar o contraste porque o elemento usa sombras de texto complexas",
        colorParse: "Não foi possível interpretar a cor ${data.colorParse}",
      },
    },
    "link-in-text-block-style": {
      pass: "O estilo visual permite distinguir os links do texto ao redor",
      incomplete: {
        default: "Confira se o link precisa de um estilo que o distinga do texto próximo",
        pseudoContent:
          "Confira se o estilo do pseudoelemento do link basta para distingui-lo do texto ao redor",
      },
      fail: "O link não tem um estilo, como sublinhado, que o distinga do texto ao redor",
    },
    "autocomplete-valid": {
      incomplete:
        "O atributo autocomplete tem um valor fora do padrão. Confira se algum valor padrão pode ser usado no lugar.",
    },
    "focusable-disabled": {
      incomplete: "Confira se os elementos focalizáveis movem o indicador de foco na hora",
    },
    "focusable-not-tabbable": {
      incomplete: "Confira se os elementos focalizáveis movem o indicador de foco na hora",
    },
    "target-offset": {
      pass: {
        default:
          "O alvo tem espaço suficiente em relação aos vizinhos mais próximos. A área clicável segura tem ${data.closestOffset}px de diâmetro, pelo menos ${data.minOffset}px.",
        large: "O alvo é bem maior que o mínimo de ${data.minOffset}px.",
      },
      fail: "O alvo não tem espaço suficiente em relação aos vizinhos mais próximos. A área clicável segura tem ${data.closestOffset}px de diâmetro, em vez de pelo menos ${data.minOffset}px.",
      incomplete: {
        default:
          "Elemento com tabindex negativo sem espaço suficiente em relação aos vizinhos mais próximos. A área clicável segura tem ${data.closestOffset}px de diâmetro, em vez de pelo menos ${data.minOffset}px. Ele é um alvo?",
        nonTabbableNeighbor:
          "O alvo não tem espaço suficiente em relação aos vizinhos mais próximos. A área clicável segura tem ${data.closestOffset}px de diâmetro, em vez de pelo menos ${data.minOffset}px. O vizinho é um alvo?",
        tooManyRects: "Não foi possível medir o alvo porque há elementos sobrepostos demais",
      },
    },
    "target-size": {
      pass: {
        default:
          "O controle tem tamanho suficiente (${data.width}px por ${data.height}px, o mínimo é ${data.minSize}px por ${data.minSize}px)",
        obscured: "O controle foi ignorado porque está totalmente encoberto e não pode ser clicado",
        large: "O alvo é bem maior que o mínimo de ${data.minSize}px.",
      },
      fail: {
        default:
          "O alvo é pequeno demais (${data.width}px por ${data.height}px, o mínimo é ${data.minSize}px por ${data.minSize}px)",
        partiallyObscured:
          "O alvo é pequeno demais porque está parcialmente encoberto (o menor espaço é ${data.width}px por ${data.height}px, o mínimo é ${data.minSize}px por ${data.minSize}px)",
      },
      incomplete: {
        default:
          "Elemento com tabindex negativo pequeno demais (${data.width}px por ${data.height}px, o mínimo é ${data.minSize}px por ${data.minSize}px). Ele é um alvo?",
        contentOverflow:
          "Não foi possível medir o elemento com precisão porque o conteúdo transborda",
        partiallyObscured:
          "Elemento com tabindex negativo pequeno demais porque está parcialmente encoberto (o menor espaço é ${data.width}px por ${data.height}px, o mínimo é ${data.minSize}px por ${data.minSize}px). Ele é um alvo?",
        partiallyObscuredNonTabbable:
          "O alvo é pequeno demais porque está parcialmente encoberto por um vizinho com tabindex negativo (o menor espaço é ${data.width}px por ${data.height}px, o mínimo é ${data.minSize}px por ${data.minSize}px). O vizinho é um alvo?",
        tooManyRects: "Não foi possível medir o alvo porque há elementos sobrepostos demais",
      },
    },
    "heading-order": {
      incomplete: "Não foi possível identificar o título anterior",
    },
    "meta-refresh-no-exceptions": {
      pass: "A tag <meta> não atualiza a página automaticamente",
      fail: "A tag <meta> força a página a se atualizar depois de um tempo",
    },
    "p-as-heading": {
      incomplete: "Não foi possível determinar se elementos <p> estão estilizados como títulos",
    },
    "error-occurred": {
      pass: "",
      incomplete: "O axe encontrou um erro. Confira à mão se a página tem esse tipo de problema",
    },
    "important-letter-spacing": {
      pass: "letter-spacing no atributo style não usa !important ou atinge o mínimo",
      fail: "letter-spacing no atributo style não deve usar !important, a não ser que seja de pelo menos ${data.minValue}em (atual: ${data.value}em)",
    },
    "important-line-height": {
      pass: "line-height no atributo style não usa !important ou atinge o mínimo",
      fail: "line-height no atributo style não deve usar !important, a não ser que seja de pelo menos ${data.minValue}em (atual: ${data.value}em)",
    },
    "important-word-spacing": {
      pass: "word-spacing no atributo style não usa !important ou atinge o mínimo",
      fail: "word-spacing no atributo style não deve usar !important, a não ser que seja de pelo menos ${data.minValue}em (atual: ${data.value}em)",
    },
    "presentational-role": {
      fail: {
        iframe:
          'Usar o atributo "title" em um elemento ${data.nodeName} com função de apresentação funciona de forma diferente em cada leitor de tela',
      },
    },
    "same-caption-summary": {
      incomplete: "Não foi possível determinar se o elemento <table> tem uma legenda",
    },
  },
};

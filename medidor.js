// ============================================================
// GraficoLib.Medidor — medidor / gauge semicircular (KPI vs. meta)
// ============================================================
//
// Recebe um <svg> pronto (com viewBox) e desenha um arco semicircular
// (180°) representando o progresso de `valor` dentro de [minimo, maximo].
//
// Dois modos:
//   - Simples: trilho neutro + arco de progresso em cor única.
//   - Faixas:  zonas coloridas de fundo (ex.: ruim/atenção/bom) + ponteiro
//              apontando o valor. Ativado ao passar `faixas`.
//
// API:
//   window.GraficoLib.Medidor.Renderizar(svg, config);
//   window.GraficoLib.Medidor.Limpar(svg);
//
// config:
//   {
//     valor:          72,
//     minimo:         0,                      // default 0
//     maximo:         100,                    // default 100
//     cor:            'var(--info)',          // arco de progresso (modo simples)
//     faixas:         [ { ate: 50, cor }, { ate: 80, cor }, ... ], // opcional
//     espessura:      número,                 // largura do arco (default ~16% do raio)
//     formatarValor:  (v) => string,          // texto central (default toString)
//     rotulo:         'Meta atingida',        // texto abaixo do valor (opcional)
//     mostrarValor:   true,                   // texto central (default true)
//     animar:         false,                  // anima o preenchimento na entrada
//   }
//
// Depende de: GraficoLib.AuxiliaresSvg

(function () {

  const TESTANDO = false;

  const CLASSE_CAMADA       = 'grafico-medidor-conteudo';
  const ANGULO_INICIAL      = 180;   // graus — extremidade esquerda do semicírculo
  const ANGULO_FINAL        = 0;     // graus — extremidade direita
  const MARGEM_PADRAO       = 10;
  const ESPESSURA_FRACAO    = 0.16;  // fração do raio
  const ESPESSURA_MINIMA    = 6;
  const ESPACO_ROTULO       = 22;
  const FRACAO_FS_VALOR     = 0.34;  // fração do raio para o número central
  const FS_ROTULO           = 12;
  const DURACAO_ANIMACAO_MS = 700;
  const RAIO_DOT_PONTEIRO   = 4;


  // ----- API pública -----

  function Renderizar(svg, config) {
    if (!svg || !config)              return false;
    if (typeof config.valor !== 'number') return false;

    Limpar(svg);

    const aux = window.GraficoLib.AuxiliaresSvg;
    aux.SincronizarViewBoxComContainer(svg);
    const vbox = aux.ObterViewBox(svg);
    if (!vbox || vbox.largura <= 0 || vbox.altura <= 0) return false;

    const cfg  = mesclarConfig(config);
    const geo  = calcularGeometria(vbox, cfg);
    const camada = aux.CriarElemento('g', { class: CLASSE_CAMADA });

    // Trilho neutro sempre ao fundo: no modo simples serve de base do
    // progresso; no modo faixas garante que qualquer trecho não coberto
    // pelas zonas (faixas que não chegam ao máximo) não fique vazio.
    desenharTrilho(camada, geo);

    let ponteiro = null;
    let arco     = null;
    if (cfg.faixas) {
      desenharFaixas(camada, geo, cfg);
      ponteiro = desenharPonteiro(camada, geo, cfg);
    } else {
      arco = desenharProgresso(camada, geo, cfg);
    }

    if (cfg.mostrarValor) desenharTextoCentral(camada, geo, cfg);

    svg.appendChild(camada);

    // Animação só depois de anexar ao DOM (getTotalLength / reflow confiáveis).
    if (cfg.animar && ponteiro) animarPonteiro(ponteiro, geo, cfg);
    if (cfg.animar && arco)     animarProgresso(arco);

    return true;
  }


  function Limpar(svg) {
    if (!svg) return;
    svg.querySelectorAll('.' + CLASSE_CAMADA).forEach(el => el.remove());
  }


  // ----- Internos (hierarquia descendente) -----

  function mesclarConfig(config) {
    const minimo = config.minimo != null ? config.minimo : 0;
    const maximo = config.maximo != null ? config.maximo : 100;
    return {
      valor:         config.valor,
      minimo,
      maximo:        maximo > minimo ? maximo : minimo + 1,
      cor:           config.cor || 'var(--info)',
      faixas:        Array.isArray(config.faixas) && config.faixas.length ? config.faixas : null,
      espessura:     config.espessura != null ? config.espessura : null,
      formatarValor: config.formatarValor || ((v) => String(v)),
      rotulo:        config.rotulo || '',
      mostrarValor:  config.mostrarValor != null ? !!config.mostrarValor : true,
      animar:        !!config.animar,
    };
  }


  function calcularGeometria(vbox, cfg) {
    const margem       = MARGEM_PADRAO;
    const reservaBaixo = (cfg.mostrarValor && cfg.rotulo) ? ESPACO_ROTULO : margem;

    const raio = Math.max(
      1,
      Math.min(vbox.largura / 2 - margem, vbox.altura - margem - reservaBaixo)
    );
    const espessura = cfg.espessura != null
      ? cfg.espessura
      : Math.max(ESPESSURA_MINIMA, raio * ESPESSURA_FRACAO);

    return {
      cx: vbox.largura / 2,
      cy: margem + raio,
      raio,
      espessura,
    };
  }


  function desenharTrilho(camada, geo) {
    camada.appendChild(criarSvg('path', {
      class:            'grafico-medidor-trilho',
      d:                arcoEntreAngulos(geo, ANGULO_INICIAL, ANGULO_FINAL),
      fill:             'none',
      stroke:           'var(--rule)',
      'stroke-width':   geo.espessura,
      'stroke-linecap': 'round',
    }));
  }


  function desenharProgresso(camada, geo, cfg) {
    const fracao = fracaoDoValor(cfg.valor, cfg);
    if (fracao <= 0) return null;

    const angFim = ANGULO_INICIAL - fracao * (ANGULO_INICIAL - ANGULO_FINAL);
    const arco = criarSvg('path', {
      class:            'grafico-medidor-progresso',
      d:                arcoEntreAngulos(geo, ANGULO_INICIAL, angFim),
      fill:             'none',
      stroke:           cfg.cor,
      'stroke-width':   geo.espessura,
      'stroke-linecap': 'round',
    });
    anexarTitulo(arco, cfg);
    camada.appendChild(arco);
    return arco;
  }


  function desenharFaixas(camada, geo, cfg) {
    let limiteAnterior = cfg.minimo;
    cfg.faixas.forEach(faixa => {
      const ate = Math.min(faixa.ate, cfg.maximo);
      if (ate <= limiteAnterior) { limiteAnterior = ate; return; }

      const angIni = ANGULO_INICIAL - fracaoDoValor(limiteAnterior, cfg) * (ANGULO_INICIAL - ANGULO_FINAL);
      const angFim = ANGULO_INICIAL - fracaoDoValor(ate, cfg)            * (ANGULO_INICIAL - ANGULO_FINAL);

      camada.appendChild(criarSvg('path', {
        d:              arcoEntreAngulos(geo, angIni, angFim),
        fill:           'none',
        stroke:         faixa.cor || 'currentColor',
        'stroke-width': geo.espessura,
      }));
      limiteAnterior = ate;
    });
  }


  function desenharPonteiro(camada, geo, cfg) {
    const comprimento = geo.raio - geo.espessura / 2 - 2;
    const grupo = criarSvg('g', { class: 'grafico-medidor-ponteiro' });

    // Ponteiro desenhado apontando para a esquerda (ângulo inicial) e
    // girado pela propriedade CSS transform — assim a transição anima a
    // rotação (o atributo `transform` do SVG não é animável via CSS).
    const ponta = pontoNoAngulo(geo.cx, geo.cy, comprimento, ANGULO_INICIAL);
    grupo.appendChild(criarSvg('line', {
      x1: geo.cx, y1: geo.cy,
      x2: ponta.x, y2: ponta.y,
      stroke:           'var(--text)',
      'stroke-width':   '2',
      'stroke-linecap': 'round',
    }));
    grupo.appendChild(criarSvg('circle', {
      cx: geo.cx, cy: geo.cy,
      r:    RAIO_DOT_PONTEIRO,
      fill: 'var(--text)',
    }));

    grupo.style.transformBox    = 'view-box';
    grupo.style.transformOrigin = `${geo.cx}px ${geo.cy}px`;
    grupo.style.transform       = `rotate(${grausDoValor(cfg.valor, cfg)}deg)`;

    anexarTitulo(grupo, cfg);
    camada.appendChild(grupo);
    return grupo;
  }


  function desenharTextoCentral(camada, geo, cfg) {
    const fsValor = Math.max(FS_ROTULO, geo.raio * FRACAO_FS_VALOR);

    const numero = criarSvg('text', {
      x: geo.cx, y: geo.cy - geo.raio * 0.06,
      'text-anchor':          'middle',
      'font-family':          'var(--fonte-mono)',
      'font-size':            fsValor,
      'font-weight':          '700',
      'font-variant-numeric': 'tabular-nums',
      fill:                   'var(--text)',
    });
    numero.textContent = cfg.formatarValor(cfg.valor);
    camada.appendChild(numero);

    if (!cfg.rotulo) return;
    const rotulo = criarSvg('text', {
      x: geo.cx, y: geo.cy + ESPACO_ROTULO - 6,
      'text-anchor': 'middle',
      'font-family': 'var(--fonte-ui)',
      'font-size':   FS_ROTULO,
      'font-weight': '500',
      fill:          'var(--text-muted)',
    });
    rotulo.textContent = cfg.rotulo;
    camada.appendChild(rotulo);
  }


  // ----- Animação de entrada (opt-in) -----

  function animarProgresso(arco) {
    const comprimento = arco.getTotalLength();
    arco.style.transition         = `stroke-dashoffset ${DURACAO_ANIMACAO_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    arco.setAttribute('stroke-dasharray',  comprimento);
    arco.setAttribute('stroke-dashoffset', comprimento);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { arco.style.strokeDashoffset = '0'; });
    });
  }


  function animarPonteiro(grupo, geo, cfg) {
    const grausFinais = grausDoValor(cfg.valor, cfg);
    grupo.style.transition = 'none';
    grupo.style.transform  = 'rotate(0deg)';
    void grupo.getBoundingClientRect();   // força reflow antes de transicionar
    grupo.style.transition = `transform ${DURACAO_ANIMACAO_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { grupo.style.transform = `rotate(${grausFinais}deg)`; });
    });
  }


  // ----- Utilitários -----

  function arcoEntreAngulos(geo, angIni, angFim) {
    const p1     = pontoNoAngulo(geo.cx, geo.cy, geo.raio, angIni);
    const p2     = pontoNoAngulo(geo.cx, geo.cy, geo.raio, angFim);
    const varre  = Math.abs(angFim - angIni);
    const large  = varre > 180 ? 1 : 0;
    const sweep  = angFim < angIni ? 1 : 0;
    return `M ${p1.x.toFixed(2)},${p1.y.toFixed(2)} `
         + `A ${geo.raio} ${geo.raio} 0 ${large} ${sweep} `
         + `${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }


  function pontoNoAngulo(cx, cy, raio, graus) {
    const rad = (graus * Math.PI) / 180;
    return {
      x: cx + raio * Math.cos(rad),
      y: cy - raio * Math.sin(rad),
    };
  }


  function fracaoDoValor(valor, cfg) {
    const f = (valor - cfg.minimo) / (cfg.maximo - cfg.minimo);
    if (f < 0) return 0;
    if (f > 1) return 1;
    return f;
  }


  // Quanto o ponteiro gira no sentido horário a partir da extremidade
  // esquerda (0 = mínimo à esquerda, 180 = máximo à direita).
  function grausDoValor(valor, cfg) {
    return fracaoDoValor(valor, cfg) * (ANGULO_INICIAL - ANGULO_FINAL);
  }


  function anexarTitulo(elemento, cfg) {
    const titulo = criarSvg('title');
    titulo.textContent = cfg.formatarValor(cfg.valor);
    elemento.appendChild(titulo);
  }


  function criarSvg(tag, atributos) {
    return window.GraficoLib.AuxiliaresSvg.CriarElemento(tag, atributos);
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.Medidor = {
    Renderizar,
    Limpar,
  };

  if (TESTANDO) console.log('[GraficoLib] Medidor carregado');
})();

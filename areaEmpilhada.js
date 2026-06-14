// ============================================================
// GraficoLib.AreaEmpilhada — gráfico de áreas empilhadas (stacked area)
// ============================================================
//
// Recebe um <svg> pronto (com viewBox) e desenha múltiplas séries
// empilhadas como áreas preenchidas, com eixo X categórico (mesma
// forma de config de Colunas/Barras). Ideal para evolução de composição
// (ex.: receita por canal ao longo de meses).
//
// API:
//   window.GraficoLib.AreaEmpilhada.Renderizar(svg, config);
//   window.GraficoLib.AreaEmpilhada.Limpar(svg);
//
// config:
//   {
//     categorias:        ['Jan', 'Fev', ...],
//     series: [
//       { rotulo: 'Loja', cor: 'var(--info)', valores: [n1, n2, ...] },
//       ...
//     ],
//     formatarValor:     (v) => string,                // labels eixo Y
//     formatarRotulo:    (cat) => string,              // labels eixo X
//     padding:           { top, right, bottom, left }, // default: { 20, 16, 30, 64 }
//     numeroLinhasGrade: 4,
//     opacidadeArea:     0.85,                          // preenchimento das faixas
//     mostrarLegenda:    auto,                          // default: series.length > 1
//     mostrarTooltip:    true,
//     formatarTooltip:   (ctx) => string,              // ctx: { categoria, itens, total }
//     animar:            false,
//   }
//
// Depende de: GraficoLib.AuxiliaresSvg

(function () {

  const TESTANDO = false;

  const CLASSE_CAMADA      = 'grafico-area-empilhada-conteudo';
  const CLASSE_TOOLTIP     = 'chart-tooltip grafico-area-tooltip';
  const PADDING_PADRAO     = { top: 20, right: 16, bottom: 30, left: 64 };
  const NUM_LINHAS_PADRAO  = 4;
  const OPACIDADE_PADRAO   = 0.85;
  const LARGURA_LINHA_TOPO = 1.5;
  const ALTURA_LEGENDA     = 26;
  const TAMANHO_SWATCH     = 10;
  const RAIO_DOT_CROSS     = 3.5;

  const FS_LEGENDA         = 11;
  const FS_EIXO_Y          = 10;
  const FS_EIXO_X          = 11;

  const OFFSET_TOOLTIP     = 14;
  const MARGEM_BORDA_TT    = 4;
  const MIN_CATEGORIAS     = 2;
  const DURACAO_ANIMACAO_MS = 600;


  // ----- API pública -----

  function Renderizar(svg, config) {
    if (!svg || !config)                              return false;
    if (!Array.isArray(config.categorias))            return false;
    if (!Array.isArray(config.series))                return false;
    if (config.categorias.length < MIN_CATEGORIAS)    return false;

    Limpar(svg);

    const aux = window.GraficoLib.AuxiliaresSvg;
    aux.SincronizarViewBoxComContainer(svg);
    const vbox = aux.ObterViewBox(svg);
    if (!vbox || vbox.largura <= 0 || vbox.altura <= 0) return false;

    const cfg          = mesclarConfig(config);
    const paddingFinal = ajustarPaddingComLegenda(cfg);
    const area         = calcularAreaPlot(vbox, paddingFinal);
    const pilha        = empilharSeries(cfg);
    const escalaY      = calcularEscalaY(pilha.maxTotal);
    if (escalaY.max <= 0) return false;

    const eixoX  = calcularEixoX(area, cfg.categorias.length);
    const camada = aux.CriarElemento('g', { class: CLASSE_CAMADA });

    if (cfg.mostrarLegenda) desenharLegenda(camada, vbox, cfg);
    desenharGrade(camada, area, cfg);
    desenharEixoY(camada, area, escalaY, cfg);
    desenharAreas(camada, area, cfg, pilha, escalaY, eixoX);
    desenharBaseline(camada, area);
    desenharRotulosX(camada, area, cfg, eixoX);
    const cross = prepararCrosshair(camada, area, cfg);

    svg.appendChild(camada);

    if (cfg.animar)         animarEntrada(camada);
    if (cfg.mostrarTooltip) conectarHover(svg, area, cfg, pilha, escalaY, eixoX, cross);

    return true;
  }


  function Limpar(svg) {
    if (!svg) return;
    svg.querySelectorAll('.' + CLASSE_CAMADA).forEach(el => el.remove());
    const pai = svg.parentElement;
    if (pai) {
      pai.querySelectorAll('.grafico-area-tooltip').forEach(el => el.remove());
    }
  }


  // ----- Internos (hierarquia descendente) -----

  function mesclarConfig(config) {
    const padraoLegenda = config.series.length > 1;
    return {
      categorias:        config.categorias,
      series:            config.series,
      formatarValor:     config.formatarValor  || ((v)   => String(v)),
      formatarRotulo:    config.formatarRotulo || ((cat) => String(cat)),
      padding:           Object.assign({}, PADDING_PADRAO, config.padding || {}),
      numeroLinhasGrade: config.numeroLinhasGrade != null ? config.numeroLinhasGrade : NUM_LINHAS_PADRAO,
      opacidadeArea:     config.opacidadeArea != null ? config.opacidadeArea : OPACIDADE_PADRAO,
      mostrarLegenda:    config.mostrarLegenda  != null ? !!config.mostrarLegenda : padraoLegenda,
      mostrarTooltip:    config.mostrarTooltip  != null ? !!config.mostrarTooltip : true,
      formatarTooltip:   config.formatarTooltip || null,
      animar:            !!config.animar,
    };
  }


  function ajustarPaddingComLegenda(cfg) {
    if (!cfg.mostrarLegenda) return cfg.padding;
    return Object.assign({}, cfg.padding, { top: cfg.padding.top + ALTURA_LEGENDA });
  }


  function calcularAreaPlot(vbox, padding) {
    return {
      x:       padding.left,
      y:       padding.top,
      largura: vbox.largura - padding.left - padding.right,
      altura:  vbox.altura  - padding.top  - padding.bottom,
    };
  }


  // Acumula os valores de cada categoria. topos[s][c] = soma das séries
  // 0..s na categoria c; bases[s][c] = soma das séries 0..s-1.
  function empilharSeries(cfg) {
    const numCat = cfg.categorias.length;
    const numSer = cfg.series.length;
    const topos  = [];
    const bases  = [];
    const acumulado = new Array(numCat).fill(0);
    let maxTotal = 0;

    for (let s = 0; s < numSer; s++) {
      const base = acumulado.slice();
      const topo = new Array(numCat);
      for (let c = 0; c < numCat; c++) {
        const valor = (cfg.series[s].valores || [])[c] || 0;
        acumulado[c] += valor;
        topo[c] = acumulado[c];
        if (acumulado[c] > maxTotal) maxTotal = acumulado[c];
      }
      bases.push(base);
      topos.push(topo);
    }
    return { topos, bases, maxTotal };
  }


  function calcularEscalaY(maxTotal) {
    if (maxTotal <= 0) return { max: 0 };

    const magnitude = Math.pow(10, Math.floor(Math.log10(maxTotal)));
    const fracao    = maxTotal / magnitude;
    let multiplo;
    if      (fracao <= 1)   multiplo = 1;
    else if (fracao <= 1.5) multiplo = 1.5;
    else if (fracao <= 2)   multiplo = 2;
    else if (fracao <= 3)   multiplo = 3;
    else if (fracao <= 5)   multiplo = 5;
    else if (fracao <= 7.5) multiplo = 7.5;
    else                    multiplo = 10;
    return { max: multiplo * magnitude };
  }


  function calcularEixoX(area, numCat) {
    const xs = [];
    for (let c = 0; c < numCat; c++) {
      xs.push(area.x + (c / (numCat - 1)) * area.largura);
    }
    return xs;
  }


  function desenharLegenda(camada, vbox, cfg) {
    const aux = window.GraficoLib.AuxiliaresSvg;
    const itens = cfg.series.map(serie => ({
      rotulo:  serie.rotulo || '',
      cor:     serie.cor    || 'currentColor',
      largura: aux.EstimarLarguraTexto(serie.rotulo || '', FS_LEGENDA) + TAMANHO_SWATCH + 18,
    }));
    const larguraTotal = itens.reduce((acc, item) => acc + item.largura, 0);
    let x   = vbox.x + (vbox.largura - larguraTotal) / 2;
    const y = vbox.y + 8;

    itens.forEach(item => {
      camada.appendChild(criarSvg('rect', {
        x:      x,
        y:      y + (FS_LEGENDA - TAMANHO_SWATCH) / 2,
        width:  TAMANHO_SWATCH,
        height: TAMANHO_SWATCH,
        rx:     2,
        fill:   item.cor,
      }));
      const txt = criarSvg('text', {
        x:             x + TAMANHO_SWATCH + 6,
        y:             y + FS_LEGENDA - 1,
        'font-family': 'var(--fonte-ui)',
        'font-size':   FS_LEGENDA,
        'font-weight': '500',
        fill:          'var(--text-muted)',
      });
      txt.textContent = item.rotulo;
      camada.appendChild(txt);
      x += item.largura;
    });
  }


  function desenharGrade(camada, area, cfg) {
    const ticks = cfg.numeroLinhasGrade;
    for (let i = 1; i <= ticks; i++) {
      const t = i / ticks;
      const y = area.y + area.altura - t * area.altura;
      camada.appendChild(criarSvg('line', {
        x1:                 area.x,
        x2:                 area.x + area.largura,
        y1:                 y,
        y2:                 y,
        stroke:             'var(--rule)',
        'stroke-width':     '0.5',
        opacity:            '0.6',
      }));
    }
  }


  function desenharEixoY(camada, area, escalaY, cfg) {
    const ticks = cfg.numeroLinhasGrade;
    for (let i = 0; i <= ticks; i++) {
      const t     = i / ticks;
      const valor = escalaY.max * t;
      const y     = area.y + area.altura - t * area.altura;
      const txt = criarSvg('text', {
        x: area.x - 10, y: y + 3,
        'text-anchor':          'end',
        'font-family':          'var(--fonte-mono)',
        'font-size':            FS_EIXO_Y,
        'font-variant-numeric': 'tabular-nums',
        fill:                   'var(--text-muted)',
      });
      txt.textContent = cfg.formatarValor(valor);
      camada.appendChild(txt);
    }
  }


  function desenharAreas(camada, area, cfg, pilha, escalaY, eixoX) {
    const numSer = cfg.series.length;
    const projY  = (v) => area.y + area.altura - (v / escalaY.max) * area.altura;

    for (let s = 0; s < numSer; s++) {
      const topo = pilha.topos[s];
      const base = pilha.bases[s];

      const segTopo = topo.map((v, c) => `${eixoX[c].toFixed(1)},${projY(v).toFixed(1)}`);
      const segBase = base.map((v, c) => `${eixoX[c].toFixed(1)},${projY(v).toFixed(1)}`).reverse();
      const dArea   = 'M' + segTopo.join(' L') + ' L' + segBase.join(' L') + ' Z';

      camada.appendChild(criarSvg('path', {
        d:              dArea,
        fill:           cfg.series[s].cor || 'currentColor',
        'fill-opacity': String(cfg.opacidadeArea),
        stroke:         'none',
      }));

      const dLinha = 'M' + segTopo.join(' L');
      camada.appendChild(criarSvg('path', {
        d:                dLinha,
        fill:             'none',
        stroke:           cfg.series[s].cor || 'currentColor',
        'stroke-width':   String(LARGURA_LINHA_TOPO),
        'stroke-linejoin':'round',
      }));
    }
  }


  function desenharBaseline(camada, area) {
    const y = area.y + area.altura;
    camada.appendChild(criarSvg('line', {
      x1: area.x, x2: area.x + area.largura,
      y1: y,      y2: y,
      stroke:         'var(--eixo)',
      'stroke-width': '1',
    }));
  }


  function desenharRotulosX(camada, area, cfg, eixoX) {
    const numCat = cfg.categorias.length;
    const aux    = window.GraficoLib.AuxiliaresSvg;
    const larguraMaxTexto = Math.max(0, area.largura / numCat - 6);

    cfg.categorias.forEach((categoria, c) => {
      const ancora = c === 0 ? 'start' : c === numCat - 1 ? 'end' : 'middle';
      const completo = cfg.formatarRotulo(categoria);
      const visivel  = aux.TruncarParaLargura(completo, larguraMaxTexto, FS_EIXO_X);

      const txt = criarSvg('text', {
        x: eixoX[c], y: area.y + area.altura + 18,
        'text-anchor': ancora,
        'font-family': 'var(--fonte-ui)',
        'font-size':   FS_EIXO_X,
        'font-weight': '500',
        fill:          'var(--text-muted)',
      });
      txt.textContent = visivel;
      if (visivel !== completo) {
        const titulo = criarSvg('title');
        titulo.textContent = completo;
        txt.appendChild(titulo);
      }
      camada.appendChild(txt);
    });
  }


  function prepararCrosshair(camada, area, cfg) {
    const grupo = criarSvg('g', { class: 'grafico-area-cross' });
    grupo.style.display       = 'none';
    grupo.style.pointerEvents = 'none';

    grupo.appendChild(criarSvg('line', {
      class: 'grafico-area-cross-linha',
      y1: area.y, y2: area.y + area.altura,
      stroke:             'var(--ink-faint)',
      'stroke-width':     '1',
      'stroke-dasharray': '3 3',
    }));

    cfg.series.forEach(serie => {
      grupo.appendChild(criarSvg('circle', {
        class: 'grafico-area-cross-dot',
        r:               String(RAIO_DOT_CROSS),
        fill:            serie.cor || 'currentColor',
        stroke:          'var(--bg-elevated)',
        'stroke-width':  '2',
      }));
    });

    camada.appendChild(grupo);
    return grupo;
  }


  // ----- Animação de entrada (opt-in) -----

  function animarEntrada(camada) {
    camada.style.opacity    = '0';
    camada.style.transition = `opacity ${DURACAO_ANIMACAO_MS}ms ease`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { camada.style.opacity = '1'; });
    });
  }


  // ----- Hover / tooltip -----

  function conectarHover(svg, area, cfg, pilha, escalaY, eixoX, cross) {
    const container = svg.parentElement;
    if (!container) return;

    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const tooltip = document.createElement('div');
    tooltip.className     = CLASSE_TOOLTIP;
    tooltip.style.display = 'none';
    container.appendChild(tooltip);

    const vbox = window.GraficoLib.AuxiliaresSvg.ObterViewBox(svg);

    const aoSair = () => {
      tooltip.style.display = 'none';
      cross.style.display   = 'none';
    };

    const aoMover = (ev) => {
      const indice = categoriaSobMouse(svg, ev, area, vbox, eixoX);
      if (indice < 0) { aoSair(); return; }

      posicionarCrosshair(cross, indice, cfg, pilha, escalaY, area, eixoX);
      cross.style.display = '';
      montarTooltip(tooltip, indice, cfg, pilha);
      posicionarTooltip(tooltip, container, ev);
    };

    svg.addEventListener('mousemove',  aoMover);
    svg.addEventListener('mouseleave', aoSair);
  }


  function categoriaSobMouse(svg, ev, area, vbox, eixoX) {
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return -1;

    const svgX = ((ev.clientX - rect.left) / rect.width) * vbox.largura;
    if (svgX < area.x || svgX > area.x + area.largura) return -1;

    let melhor = 0;
    let menor  = Infinity;
    eixoX.forEach((x, c) => {
      const dist = Math.abs(x - svgX);
      if (dist < menor) { menor = dist; melhor = c; }
    });
    return melhor;
  }


  function posicionarCrosshair(cross, indice, cfg, pilha, escalaY, area, eixoX) {
    const projY = (v) => area.y + area.altura - (v / escalaY.max) * area.altura;
    const x     = eixoX[indice];

    const linha = cross.querySelector('.grafico-area-cross-linha');
    if (linha) {
      linha.setAttribute('x1', x.toFixed(1));
      linha.setAttribute('x2', x.toFixed(1));
    }

    const dots = cross.querySelectorAll('.grafico-area-cross-dot');
    cfg.series.forEach((serie, s) => {
      const dot = dots[s];
      if (!dot) return;
      dot.setAttribute('cx', x.toFixed(1));
      dot.setAttribute('cy', projY(pilha.topos[s][indice]).toFixed(1));
    });
  }


  function montarTooltip(tooltip, indice, cfg, pilha) {
    const { EscaparHtml } = window.GraficoLib.AuxiliaresSvg;
    const categoria = cfg.categorias[indice];

    const itens = cfg.series.map((serie, s) => ({
      rotulo: serie.rotulo || '',
      cor:    serie.cor || 'currentColor',
      valor:  (serie.valores || [])[indice] || 0,
    }));
    const total = itens.reduce((soma, item) => soma + item.valor, 0);

    if (typeof cfg.formatarTooltip === 'function') {
      tooltip.innerHTML = cfg.formatarTooltip({ categoria, itens, total });
      tooltip.style.display = 'block';
      return;
    }

    // Ordem visual de cima para baixo = última série empilhada primeiro.
    const linhas = itens.slice().reverse().map(item =>
      `<div class="linha"><span><span class="pt" style="background:${item.cor}"></span>${EscaparHtml(item.rotulo)}</span>`
      + `<span>${EscaparHtml(cfg.formatarValor(item.valor))}</span></div>`
    ).join('');
    const totalHtml = `<div class="linha total"><span>Total</span><span>${EscaparHtml(cfg.formatarValor(total))}</span></div>`;

    tooltip.innerHTML = `<div class="titulo">${EscaparHtml(cfg.formatarRotulo(categoria))}</div>${linhas}${totalHtml}`;
    tooltip.style.display = 'block';
  }


  function posicionarTooltip(tooltip, container, ev) {
    const aux      = window.GraficoLib.AuxiliaresSvg;
    const rectCont = container.getBoundingClientRect();
    aux.PosicionarTooltipFlutuante(tooltip, container, {
      ancoraX: ev.clientX - rectCont.left,
      ancoraY: ev.clientY - rectCont.top,
      offset:  OFFSET_TOOLTIP,
      margem:  MARGEM_BORDA_TT,
    });
  }


  // ----- Utilitários -----

  function criarSvg(tag, atributos) {
    return window.GraficoLib.AuxiliaresSvg.CriarElemento(tag, atributos);
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.AreaEmpilhada = {
    Renderizar,
    Limpar,
  };

  if (TESTANDO) console.log('[GraficoLib] AreaEmpilhada carregado');
})();

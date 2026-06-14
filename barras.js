// ============================================================
// GraficoLib.Barras — gráfico de barras horizontais
// ============================================================
//
// Recebe um <svg> pronto (com viewBox) e desenha barras horizontais
// agrupadas por categoria. Espelha a API de Colunas (mesma forma de
// config), trocando o eixo: categorias no eixo Y (uma faixa por
// categoria) e valores no eixo X. Ideal para rankings, onde rótulos
// longos cabem melhor na horizontal.
//
// API:
//   window.GraficoLib.Barras.Renderizar(svg, config);
//   window.GraficoLib.Barras.Limpar(svg);
//
// config:
//   {
//     categorias:        ['Loja A', 'Loja B', ...],
//     series: [
//       { rotulo: 'Faturamento', cor: 'var(--positive)', valores: [n1, n2, ...] },
//       ...
//     ],
//     formatarValor:     (v) => string,                // labels eixo X (default: toString)
//     formatarRotulo:    (cat) => string,              // labels eixo Y (default: identidade)
//     padding:           { top, right, bottom, left }, // default: { 20, 16, 28, 96 }
//     numeroLinhasGrade: 4,                            // default: 4
//     mostrarValores:    false,                        // valor na ponta de cada barra
//     mostrarLegenda:    auto,                         // default: series.length > 1
//     raio:              3,                            // arredondamento da barra
//     mostrarTooltip:    true,                         // tooltip no hover (default: true)
//     formatarTooltip:   (ctx) => string,              // ctx: { categoria, serie, valor, total }
//     animar:            false,                         // anima crescimento na entrada
//   }
//
// Depende de: GraficoLib.AuxiliaresSvg

(function () {

  const TESTANDO = false;

  const CLASSE_CAMADA      = 'grafico-barras-conteudo';
  const CLASSE_TOOLTIP     = 'chart-tooltip grafico-barras-tooltip';
  const PADDING_PADRAO     = { top: 20, right: 16, bottom: 28, left: 96 };
  const NUM_LINHAS_PADRAO  = 4;
  const FRACAO_GAP_GRUPO   = 0.35;
  const FRACAO_GAP_BARRA   = 0.30;
  const RAIO_PADRAO        = 3;
  const ALTURA_LEGENDA     = 26;
  const TAMANHO_SWATCH     = 10;

  const FS_LEGENDA         = 11;
  const FS_EIXO_X          = 10;
  const FS_EIXO_Y          = 11;
  const FS_VALOR           = 10;

  const OFFSET_TOOLTIP     = 12;
  const MARGEM_BORDA_TT    = 4;
  const OPACIDADE_INATIVA  = 0.35;
  const GAP_ROTULO_Y       = 10;
  const GAP_VALOR_PONTA     = 6;
  const DURACAO_ANIMACAO_MS = 600;


  // ----- API pública -----

  function Renderizar(svg, config) {
    if (!svg || !config)                   return false;
    if (!Array.isArray(config.categorias)) return false;
    if (!Array.isArray(config.series))     return false;

    Limpar(svg);

    const aux = window.GraficoLib.AuxiliaresSvg;
    aux.SincronizarViewBoxComContainer(svg);
    const vbox = aux.ObterViewBox(svg);
    if (!vbox || vbox.largura <= 0 || vbox.altura <= 0) return false;

    const cfg          = mesclarConfig(config);
    const paddingFinal = ajustarPaddingComLegenda(cfg);
    const area         = calcularAreaPlot(vbox, paddingFinal);
    const escalaX      = calcularEscalaX(cfg.series);
    if (escalaX.max <= 0) return false;

    const camada = aux.CriarElemento('g', { class: CLASSE_CAMADA });

    if (cfg.mostrarLegenda) desenharLegenda(camada, vbox, cfg);
    desenharGrade(camada, area, cfg);
    desenharEixoX(camada, area, escalaX, cfg);
    const barras = desenharBarras(camada, area, cfg, escalaX);
    desenharBaseline(camada, area);
    desenharRotulosY(camada, area, cfg);

    svg.appendChild(camada);

    if (cfg.animar)         animarEntrada(barras);
    if (cfg.mostrarTooltip) conectarHover(svg, barras, cfg);

    return true;
  }


  function Limpar(svg) {
    if (!svg) return;
    svg.querySelectorAll('.' + CLASSE_CAMADA).forEach(el => el.remove());
    const pai = svg.parentElement;
    if (pai) {
      pai.querySelectorAll('.grafico-barras-tooltip').forEach(el => el.remove());
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
      mostrarValores:    !!config.mostrarValores,
      mostrarLegenda:    config.mostrarLegenda  != null ? !!config.mostrarLegenda : padraoLegenda,
      raio:              config.raio            != null ? config.raio            : RAIO_PADRAO,
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


  function calcularEscalaX(series) {
    let max = 0;
    series.forEach(serie => (serie.valores || []).forEach(v => { if (v > max) max = v; }));
    if (max === 0) return { max: 0 };

    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const fracao    = max / magnitude;
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
      const x = area.x + t * area.largura;
      camada.appendChild(criarSvg('line', {
        x1:                 x,
        x2:                 x,
        y1:                 area.y,
        y2:                 area.y + area.altura,
        stroke:             'var(--border-strong)',
        'stroke-width':     '1',
        'stroke-dasharray': '3 4',
        opacity:            '0.65',
      }));
    }
  }


  function desenharEixoX(camada, area, escalaX, cfg) {
    const ticks = cfg.numeroLinhasGrade;
    for (let i = 0; i <= ticks; i++) {
      const t      = i / ticks;
      const valor  = escalaX.max * t;
      const x      = area.x + t * area.largura;
      const ancora = i === 0 ? 'start' : i === ticks ? 'end' : 'middle';

      const txt = criarSvg('text', {
        x, y: area.y + area.altura + 16,
        'text-anchor':          ancora,
        'font-family':          'var(--fonte-mono)',
        'font-size':            FS_EIXO_X,
        'font-variant-numeric': 'tabular-nums',
        fill:                   'var(--text-muted)',
      });
      txt.textContent = cfg.formatarValor(valor);
      camada.appendChild(txt);
    }
  }


  function desenharBarras(camada, area, cfg, escalaX) {
    const barras = [];
    const numCat = cfg.categorias.length;
    const numSer = cfg.series.length;
    if (numCat === 0 || numSer === 0) return barras;

    const alturaGrupo = area.altura / numCat;
    const alturaUtil  = alturaGrupo * (1 - FRACAO_GAP_GRUPO);
    const alturaSlot  = alturaUtil / numSer;
    const alturaBarra = alturaSlot * (1 - FRACAO_GAP_BARRA);
    const offsetGrupo = (alturaGrupo - alturaUtil) / 2;
    const offsetBarra = (alturaSlot  - alturaBarra) / 2;

    for (let c = 0; c < numCat; c++) {
      const yGrupo = area.y + c * alturaGrupo + offsetGrupo;
      for (let s = 0; s < numSer; s++) {
        const valor   = (cfg.series[s].valores || [])[c] || 0;
        const largura = (valor / escalaX.max) * area.largura;
        const y       = yGrupo + s * alturaSlot + offsetBarra;

        const rect = criarSvg('rect', {
          class:  'grafico-barras-barra',
          x:      area.x,
          y,
          width:  Math.max(0, largura),
          height: alturaBarra,
          fill:   cfg.series[s].cor || 'currentColor',
          rx:     cfg.raio,
        });
        rect.style.cursor     = 'pointer';
        rect.style.transition = 'opacity 120ms ease';
        camada.appendChild(rect);

        barras.push({
          el:              rect,
          categoria:       cfg.categorias[c],
          serie:           cfg.series[s],
          valor:           valor,
          indiceCategoria: c,
          indiceSerie:     s,
        });

        if (cfg.mostrarValores && valor > 0) {
          desenharValorNaPonta(camada, area.x + largura + GAP_VALOR_PONTA, y + alturaBarra / 2, cfg.formatarValor(valor));
        }
      }
    }
    return barras;
  }


  function desenharValorNaPonta(camada, x, y, texto) {
    const txt = criarSvg('text', {
      x, y: y + 3,
      'text-anchor':          'start',
      'font-family':          'var(--fonte-mono)',
      'font-size':            FS_VALOR,
      'font-weight':          '600',
      'font-variant-numeric': 'tabular-nums',
      fill:                   'var(--text)',
    });
    txt.textContent = texto;
    camada.appendChild(txt);
  }


  function desenharBaseline(camada, area) {
    camada.appendChild(criarSvg('line', {
      x1: area.x, x2: area.x,
      y1: area.y, y2: area.y + area.altura,
      stroke:         'var(--eixo)',
      'stroke-width': '1',
    }));
  }


  function desenharRotulosY(camada, area, cfg) {
    const numCat = cfg.categorias.length;
    if (numCat === 0) return;

    const aux             = window.GraficoLib.AuxiliaresSvg;
    const alturaGrupo     = area.altura / numCat;
    const larguraMaxTexto = Math.max(0, area.x - GAP_ROTULO_Y);

    cfg.categorias.forEach((categoria, c) => {
      const y        = area.y + c * alturaGrupo + alturaGrupo / 2;
      const completo = cfg.formatarRotulo(categoria);
      const visivel  = aux.TruncarParaLargura(completo, larguraMaxTexto, FS_EIXO_Y);

      const txt = criarSvg('text', {
        x:             area.x - GAP_ROTULO_Y,
        y:             y + 4,
        'text-anchor': 'end',
        'font-family': 'var(--fonte-ui)',
        'font-size':   FS_EIXO_Y,
        'font-weight': '500',
        fill:          'var(--text-muted)',
      });
      txt.textContent = visivel;

      // Rótulo truncado expõe o nome completo via <title> (tooltip nativo).
      if (visivel !== completo) {
        txt.style.cursor = 'help';
        const titulo = criarSvg('title');
        titulo.textContent = completo;
        txt.appendChild(titulo);
      }
      camada.appendChild(txt);
    });
  }


  // ----- Animação de entrada (opt-in) -----

  function animarEntrada(barras) {
    barras.forEach(barra => {
      const el = barra.el;
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = 'left center';
      el.style.transform       = 'scaleX(0)';
      el.style.transition      = `transform ${DURACAO_ANIMACAO_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 120ms ease`;
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        barras.forEach(barra => { barra.el.style.transform = 'scaleX(1)'; });
      });
    });
  }


  // ----- Hover / tooltip -----

  function conectarHover(svg, barras, cfg) {
    const container = svg.parentElement;
    if (!container)          return;
    if (barras.length === 0) return;

    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const tooltip = document.createElement('div');
    tooltip.className     = CLASSE_TOOLTIP;
    tooltip.style.display = 'none';
    container.appendChild(tooltip);

    const aoSair = () => {
      tooltip.style.display = 'none';
      barras.forEach(b => { b.el.style.opacity = ''; });
    };

    barras.forEach(barra => {
      barra.el.addEventListener('mouseenter', () => {
        barras.forEach(b => { b.el.style.opacity = b === barra ? '1' : String(OPACIDADE_INATIVA); });
        montarTooltip(tooltip, barra, barras, cfg);
      });
      barra.el.addEventListener('mousemove',  (ev) => posicionarTooltip(tooltip, container, ev));
      barra.el.addEventListener('mouseleave', aoSair);
    });

    svg.addEventListener('mouseleave', aoSair);
  }


  function montarTooltip(tooltip, barra, todas, cfg) {
    const { EscaparHtml } = window.GraficoLib.AuxiliaresSvg;

    if (typeof cfg.formatarTooltip === 'function') {
      const totalCategoria = todas
        .filter(b => b.indiceCategoria === barra.indiceCategoria)
        .reduce((s, b) => s + b.valor, 0);
      tooltip.innerHTML = cfg.formatarTooltip({
        categoria: barra.categoria,
        serie:     barra.serie,
        valor:     barra.valor,
        total:     totalCategoria,
      });
      tooltip.style.display = 'block';
      return;
    }

    const tituloTxt = cfg.formatarRotulo(barra.categoria);
    const cor       = barra.serie.cor    || 'currentColor';
    const nome      = barra.serie.rotulo || '';
    const valor     = cfg.formatarValor(barra.valor);
    const linha = nome
      ? `<div class="linha"><span><span class="pt" style="background:${cor}"></span>${EscaparHtml(nome)}</span><span>${EscaparHtml(valor)}</span></div>`
      : `<div class="linha"><span><span class="pt" style="background:${cor}"></span>Valor</span><span>${EscaparHtml(valor)}</span></div>`;
    tooltip.innerHTML = `<div class="titulo">${EscaparHtml(tituloTxt)}</div>${linha}`;
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
  window.GraficoLib.Barras = {
    Renderizar,
    Limpar,
  };

  if (TESTANDO) console.log('[GraficoLib] Barras carregado');
})();

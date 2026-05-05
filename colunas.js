// ============================================================
// GraficoLib.Colunas — gráfico de colunas (barras verticais)
// ============================================================
//
// Recebe um <svg> pronto (com viewBox) e desenha colunas agrupadas
// por categoria. Suporta múltiplas séries (renderiza uma coluna
// por série dentro do mesmo grupo), legenda interna no topo e
// tooltip ao passar o mouse em cada coluna.
//
// API:
//   window.GraficoLib.Colunas.Renderizar(svg, config);
//   window.GraficoLib.Colunas.Limpar(svg);
//
// config:
//   {
//     categorias:        ['Loja A', 'Loja B', ...],
//     series: [
//       { rotulo: 'Faturamento', cor: 'var(--positive)', valores: [n1, n2, ...] },
//       ...
//     ],
//     formatarValor:     (v) => string,                // labels eixo Y (default: toString)
//     formatarRotulo:    (cat) => string,              // labels eixo X (default: identidade)
//     padding:           { top, right, bottom, left }, // default: { 20, 14, 38, 64 }
//     numeroLinhasGrade: 4,                            // default: 4
//     mostrarValores:    false,                        // valor sobre cada coluna
//     mostrarLegenda:    auto,                         // default: series.length > 1
//     raio:              3,                            // arredondamento da coluna
//     mostrarTooltip:    true,                         // tooltip no hover (default: true)
//     formatarTooltip:   (ctx) => string,              // ctx: { categoria, serie, valor, total }
//   }
//
// Depende de: GraficoLib.AuxiliaresSvg

(function () {

  const TESTANDO = false;

  const CLASSE_CAMADA      = 'grafico-colunas-conteudo';
  const CLASSE_TOOLTIP     = 'chart-tooltip grafico-colunas-tooltip';
  const PADDING_PADRAO     = { top: 20, right: 14, bottom: 38, left: 64 };
  const NUM_LINHAS_PADRAO  = 4;
  const FRACAO_GAP_GRUPO   = 0.55;
  const FRACAO_GAP_BARRA   = 0.30;
  const RAIO_PADRAO        = 3;
  const ALTURA_LEGENDA     = 26;
  const TAMANHO_SWATCH     = 10;

  const FS_LEGENDA         = 11;
  const FS_EIXO_Y          = 10;
  const FS_EIXO_X          = 11;
  const FS_VALOR           = 10;

  const OFFSET_TOOLTIP     = 12;
  const MARGEM_BORDA_TT    = 4;
  const OPACIDADE_INATIVA  = 0.35;
  const GAP_ROTULO_X       = 8;


  // ----- API pública -----

  function Renderizar(svg, config) {
    if (!svg || !config)                          return false;
    if (!Array.isArray(config.categorias))        return false;
    if (!Array.isArray(config.series))            return false;

    Limpar(svg);

    const aux = window.GraficoLib.AuxiliaresSvg;
    aux.SincronizarViewBoxComContainer(svg);
    const vbox = aux.ObterViewBox(svg);
    if (!vbox || vbox.largura <= 0 || vbox.altura <= 0) return false;

    const cfg          = mesclarConfig(config);
    const paddingFinal = ajustarPaddingComLegenda(cfg);
    const area         = calcularAreaPlot(vbox, paddingFinal);
    const escalaY      = calcularEscalaY(cfg.series);
    if (escalaY.max <= 0) return false;

    const camada = aux.CriarElemento('g', { class: CLASSE_CAMADA });

    if (cfg.mostrarLegenda) desenharLegenda(camada, vbox, cfg);
    desenharGrade(camada, area, cfg);
    desenharEixoY(camada, area, escalaY, cfg);
    const barras = desenharColunas(camada, area, cfg, escalaY);
    desenharBaseline(camada, area);
    desenharRotulosX(camada, area, cfg);

    svg.appendChild(camada);

    if (cfg.mostrarTooltip) conectarHover(svg, barras, cfg);

    return true;
  }


  function Limpar(svg) {
    if (!svg) return;
    svg.querySelectorAll('.' + CLASSE_CAMADA).forEach(el => el.remove());
    const pai = svg.parentElement;
    if (pai) {
      pai.querySelectorAll('.grafico-colunas-tooltip').forEach(el => el.remove());
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


  function calcularEscalaY(series) {
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
      const y = area.y + area.altura - t * area.altura;
      camada.appendChild(criarSvg('line', {
        x1:                 area.x,
        x2:                 area.x + area.largura,
        y1:                 y,
        y2:                 y,
        stroke:             'var(--border-strong)',
        'stroke-width':     '1',
        'stroke-dasharray': '3 4',
        opacity:            '0.65',
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


  function desenharColunas(camada, area, cfg, escalaY) {
    const barras = [];
    const numCat = cfg.categorias.length;
    const numSer = cfg.series.length;
    if (numCat === 0 || numSer === 0) return barras;

    const larguraGrupo = area.largura / numCat;
    const larguraUtil  = larguraGrupo * (1 - FRACAO_GAP_GRUPO);
    const larguraSlot  = larguraUtil / numSer;
    const larguraBarra = larguraSlot * (1 - FRACAO_GAP_BARRA);
    const offsetGrupo  = (larguraGrupo - larguraUtil) / 2;
    const offsetBarra  = (larguraSlot  - larguraBarra) / 2;

    for (let c = 0; c < numCat; c++) {
      const xGrupo = area.x + c * larguraGrupo + offsetGrupo;
      for (let s = 0; s < numSer; s++) {
        const valor  = (cfg.series[s].valores || [])[c] || 0;
        const altura = (valor / escalaY.max) * area.altura;
        const y      = area.y + area.altura - altura;
        const x      = xGrupo + s * larguraSlot + offsetBarra;

        const rect = criarSvg('rect', {
          class:  'grafico-colunas-barra',
          x, y,
          width:  larguraBarra,
          height: Math.max(0, altura),
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
          desenharValorSobreBarra(camada, x + larguraBarra / 2, y - 5, cfg.formatarValor(valor));
        }
      }
    }
    return barras;
  }


  function desenharValorSobreBarra(camada, x, y, texto) {
    const txt = criarSvg('text', {
      x: x, y: y,
      'text-anchor':          'middle',
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
    const y = area.y + area.altura;
    camada.appendChild(criarSvg('line', {
      x1: area.x, x2: area.x + area.largura,
      y1: y,      y2: y,
      stroke:         'var(--eixo)',
      'stroke-width': '1',
    }));
  }


  function desenharRotulosX(camada, area, cfg) {
    const numCat = cfg.categorias.length;
    if (numCat === 0) return;

    const aux             = window.GraficoLib.AuxiliaresSvg;
    const larguraGrupo    = area.largura / numCat;
    const larguraMaxTexto = Math.max(0, larguraGrupo - GAP_ROTULO_X);

    cfg.categorias.forEach((categoria, c) => {
      const x        = area.x + c * larguraGrupo + larguraGrupo / 2;
      const completo = cfg.formatarRotulo(categoria);
      const visivel  = aux.TruncarParaLargura(completo, larguraMaxTexto, FS_EIXO_X);

      const txt = criarSvg('text', {
        x, y: area.y + area.altura + 18,
        'text-anchor': 'middle',
        'font-family': 'var(--fonte-ui)',
        'font-size':   FS_EIXO_X,
        'font-weight': '500',
        fill:          'var(--text-muted)',
      });
      txt.textContent = visivel;

      // Quando o rótulo foi truncado, expõe o nome completo via <title> —
      // o navegador mostra como tooltip nativo ao passar o mouse.
      if (visivel !== completo) {
        txt.style.cursor = 'help';
        const titulo = criarSvg('title');
        titulo.textContent = completo;
        txt.appendChild(titulo);
      }
      camada.appendChild(txt);
    });
  }


  // ----- Hover / tooltip -----

  function conectarHover(svg, barras, cfg) {
    const container = svg.parentElement;
    if (!container)         return;
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
  window.GraficoLib.Colunas = {
    Renderizar,
    Limpar,
  };

  if (TESTANDO) console.log('[GraficoLib] Colunas carregado');
})();

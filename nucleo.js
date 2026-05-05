// ============================================================
// Grafico.Nucleo — orquestrador do módulo de gráficos reutilizável
// ============================================================
//
// Expõe a factory pública `window.Grafico` que monta o DOM (SVG +
// tooltip + status), aplica domínio/eixos/séries e conecta o hover.
//
// Uso:
//   const grafico = window.Grafico(containerDiv, {
//     padding: { top: 16, right: 16, bottom: 30, left: 60 },
//     fmtY:             (v) => 'R$ ' + v.toFixed(2),
//     fmtX:             (x) => new Date(x * 1000).toLocaleDateString(),
//     fmtTooltipTitle:  (x) => new Date(x * 1000).toLocaleString(),
//     fmtTooltipValue:  (v, serie, ponto) => ...,
//   });
//
//   grafico.Renderizar({
//     series: [
//       { label, color, showArea, areaOpacity, dashed, endpointDot,
//         points: [{ x, y }, ...] },
//     ],
//   });
//   grafico.DefinirStatus('Carregando…');
//   grafico.Destruir();
//
// Depende de:
//   GraficoLib.{AuxiliaresSvg, Dominio, Eixos, Series, Interacao}
//
// Helpers expostos em `window.Grafico.*` (acessíveis sem GraficoLib):
//   Formatadores, Sparkline, Donut, Colunas, PopupGrupo

(function () {

  const TESTANDO = false;

  const PADDING_PADRAO = { top: 16, right: 16, bottom: 30, left: 60 };
  const Y_TICKS_PADRAO = 5;
  const X_TICKS_PADRAO = 5;
  const WIDTH_PADRAO   = 800;
  const HEIGHT_PADRAO  = 300;
  const OFFSET_TOOLTIP = 14;


  // ----- API pública -----

  function CriarGrafico(container, opcoes) {
    if (!container) return null;

    const config        = montarConfig(opcoes);
    const dimensoes     = { width: config.width, height: config.height };
    const camadas       = montarDomDoGrafico(container, dimensoes);
    const estado        = criarEstadoVazio();
    const formatadores  = extrairFormatadores(config);
    const projetoresRef = { posicaoX: () => 0, posicaoY: () => 0 };

    const desconectarHover = window.GraficoLib.Interacao.ConectarHover({
      svg:           camadas.svg,
      tooltip:       camadas.tooltip,
      camadas,
      container,
      estado,
      dimensoes,
      padding:       config.padding,
      projetores:    projetoresRef,
      formatadores,
      tooltipOffset: config.tooltipOffset,
    });


    function Renderizar(dados) {
      Limpar();
      DefinirStatus('');

      const series = (dados && dados.series) || [];
      estado.series = series;

      const { Dominio, Eixos, Series, Interacao } = window.GraficoLib;

      const dominio = Dominio.CalcularDominio(series, dados || {});
      if (dominio.vazio) { DefinirStatus('Sem dados'); return false; }

      Object.assign(estado, dominio);
      estado.allX = Dominio.UnirEixoX(series);

      const projetores = Dominio.CriarProjetores(dominio, dimensoes, config.padding);
      projetoresRef.posicaoX = projetores.posicaoX;
      projetoresRef.posicaoY = projetores.posicaoY;

      Eixos.Renderizar(camadas, dominio, dimensoes, config.padding, config);
      Series.Renderizar(camadas, series, projetores, dimensoes, config.padding);
      Interacao.PrepararCrosshair(camadas, dimensoes, config.padding, series);

      return true;
    }


    function DefinirStatus(mensagem) {
      camadas.status.textContent  = mensagem || '';
      camadas.status.style.display = mensagem ? 'flex' : 'none';
    }


    function Limpar() {
      window.GraficoLib.Interacao.LimparHover(camadas.tooltip, camadas);
    }


    function Destruir() {
      desconectarHover();
      removerSeExistir(camadas.svg);
      removerSeExistir(camadas.tooltip);
      removerSeExistir(camadas.status);
      container.classList.remove('chart-root');
      estado.series = [];
      estado.allX   = [];
    }


    return {
      Renderizar,
      DefinirStatus,
      Limpar,
      Destruir,
    };
  }


  // ----- Internos -----

  function montarConfig(opcoes) {
    const opts = opcoes || {};
    return {
      width:           opts.width   || WIDTH_PADRAO,
      height:          opts.height  || HEIGHT_PADRAO,
      padding:         Object.assign({}, PADDING_PADRAO, opts.padding || {}),
      yTicks:          opts.yTicks || Y_TICKS_PADRAO,
      xTicks:          opts.xTicks || X_TICKS_PADRAO,
      fmtY:            opts.fmtY            || ((v) => String(v)),
      fmtX:            opts.fmtX            || ((x) => String(x)),
      fmtTooltipTitle: opts.fmtTooltipTitle || opts.fmtX || ((x) => String(x)),
      fmtTooltipValue: opts.fmtTooltipValue || opts.fmtY || ((v) => String(v)),
      tooltipOffset:   opts.tooltipOffset != null ? opts.tooltipOffset : OFFSET_TOOLTIP,
    };
  }


  function extrairFormatadores(config) {
    return {
      fmtY:            config.fmtY,
      fmtX:            config.fmtX,
      fmtTooltipTitle: config.fmtTooltipTitle,
      fmtTooltipValue: config.fmtTooltipValue,
    };
  }


  function criarEstadoVazio() {
    return {
      series: [],
      xMin: 0, xMax: 1,
      yMin: 0, yMax: 1,
      allX: [],
    };
  }


  function montarDomDoGrafico(container, dimensoes) {
    const { CriarElemento } = window.GraficoLib.AuxiliaresSvg;

    container.classList.add('chart-root');
    container.innerHTML = '';
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const svg = CriarElemento('svg', {
      class:               'chart-svg',
      viewBox:             `0 0 ${dimensoes.width} ${dimensoes.height}`,
      preserveAspectRatio: 'none',
    });
    svg.style.width    = '100%';
    svg.style.height   = '100%';
    svg.style.display  = 'block';
    svg.style.overflow = 'visible';

    const camadas = {
      svg,
      defs:   CriarElemento('defs'),
      grade:  CriarElemento('g', { class: 'chart-grid' }),
      areas:  CriarElemento('g', { class: 'chart-areas' }),
      linhas: CriarElemento('g', { class: 'chart-lines' }),
      dots:   CriarElemento('g', { class: 'chart-dots' }),
      eixoX:  CriarElemento('g', { class: 'chart-xaxis' }),
      eixoY:  CriarElemento('g', { class: 'chart-yaxis' }),
      cross:  CriarElemento('g', { class: 'chart-cross' }),
    };

    camadas.cross.style.display       = 'none';
    camadas.cross.style.pointerEvents = 'none';

    svg.appendChild(camadas.defs);
    svg.appendChild(camadas.grade);
    svg.appendChild(camadas.areas);
    svg.appendChild(camadas.linhas);
    svg.appendChild(camadas.dots);
    svg.appendChild(camadas.eixoY);
    svg.appendChild(camadas.eixoX);
    svg.appendChild(camadas.cross);

    const tooltip = document.createElement('div');
    tooltip.className     = 'chart-tooltip';
    tooltip.style.display = 'none';

    const statusEl = document.createElement('div');
    statusEl.className     = 'chart-status';
    statusEl.style.display = 'none';

    container.appendChild(svg);
    container.appendChild(tooltip);
    container.appendChild(statusEl);

    camadas.tooltip = tooltip;
    camadas.status  = statusEl;

    return camadas;
  }


  function removerSeExistir(elemento) {
    if (!elemento)              return;
    if (!elemento.parentNode)   return;
    elemento.parentNode.removeChild(elemento);
  }


  // ----- Exporta -----

  // API pública principal — estilo Donklii (PascalCase).
  window.Grafico = CriarGrafico;

  // Helpers reutilizáveis acessíveis por consumidores.
  window.Grafico.Formatadores = window.GraficoLib.Formatadores;
  window.Grafico.Sparkline    = window.GraficoLib.Sparkline;
  window.Grafico.Donut        = window.GraficoLib.Donut;
  window.Grafico.Colunas      = window.GraficoLib.Colunas;
  window.Grafico.PopupGrupo   = window.GraficoLib.PopupGrupo;

  if (TESTANDO) console.log('[Grafico] núcleo carregado');
})();

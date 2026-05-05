// ============================================================
// GraficoLib.Interacao — crosshair + tooltip + hover do mouse
// ============================================================
//
// Cuida de toda interação com o mouse: snap do cursor ao x mais
// próximo, posicionamento do crosshair, montagem do tooltip e clamp
// dele dentro do container.
//
// Depende de: GraficoLib.AuxiliaresSvg

(function () {

  const TESTANDO = false;

  const OFFSET_TOOLTIP_PADRAO = 14;
  const MARGEM_BORDA          = 4;
  const ESPACO_VERTICAL_HOVER = 10;
  const TOLERANCIA_BORDA_X    = 2;
  const RAIO_DOT_CROSS        = 4;
  const LARGURA_DOT_CROSS     = 2;


  // ----- API pública -----

  function PrepararCrosshair(camadas, dimensoes, padding, series) {
    const { CriarElemento, LimparCamada } = window.GraficoLib.AuxiliaresSvg;
    LimparCamada(camadas.cross);

    camadas.cross.appendChild(CriarElemento('line', {
      class: 'chart-cross-line',
      y1: padding.top, y2: dimensoes.height - padding.bottom,
      stroke: 'var(--ink-faint)',
      'stroke-width': '1',
      'stroke-dasharray': '3 3',
    }));

    series.forEach(serie => {
      camadas.cross.appendChild(CriarElemento('circle', {
        class: 'chart-cross-dot',
        r:               String(RAIO_DOT_CROSS),
        fill:            serie.color,
        stroke:          'var(--bg-elevated)',
        'stroke-width':  String(LARGURA_DOT_CROSS),
      }));
    });
  }


  function ConectarHover(contexto) {
    const { svg, tooltip, camadas } = contexto;

    const aoMover = (evento) => tratarMouseMove(evento, contexto);
    const aoSair  = ()        => limparHover(tooltip, camadas);

    svg.addEventListener('mousemove',  aoMover);
    svg.addEventListener('mouseleave', aoSair);

    return function desconectar() {
      svg.removeEventListener('mousemove',  aoMover);
      svg.removeEventListener('mouseleave', aoSair);
      limparHover(tooltip, camadas);
    };
  }


  function LimparHover(tooltip, camadas) {
    limparHover(tooltip, camadas);
  }


  // ----- Internos -----

  function tratarMouseMove(evento, contexto) {
    const { svg, tooltip, camadas, container, estado, dimensoes, padding, projetores, formatadores } = contexto;

    if (!estado.series.length) return;

    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;

    const mouseX = evento.clientX - rect.left;
    const mouseY = evento.clientY - rect.top;
    const svgX   = (mouseX / rect.width) * dimensoes.width;

    if (svgX < padding.left - TOLERANCIA_BORDA_X || svgX > dimensoes.width - padding.right + TOLERANCIA_BORDA_X) {
      limparHover(tooltip, camadas);
      return;
    }

    const xValDados  = converterXParaDados(svgX, dimensoes, padding, estado);
    const indiceSnap = encontrarIndiceMaisProximo(estado.allX, xValDados);
    if (indiceSnap < 0) { limparHover(tooltip, camadas); return; }

    const snapX = estado.allX[indiceSnap];
    const xPx   = projetores.posicaoX(snapX);

    posicionarLinhaCrosshair(camadas.cross, xPx);

    const pontosPorSerie = estado.series.map(serie => buscarPontoVisivelDaSerie(serie, snapX));
    posicionarDotsCrosshair(camadas.cross, estado.series, pontosPorSerie, projetores);
    camadas.cross.style.display = '';

    montarTooltip(tooltip, snapX, estado.series, pontosPorSerie, formatadores);
    posicionarTooltip(tooltip, container, dimensoes, xPx, mouseY, contexto.tooltipOffset);
  }


  function buscarPontoVisivelDaSerie(serie, snapX) {
    const pontos = serie.points || [];
    if (pontos.length < 2) return null;

    const ponto = encontrarPontoMaisProximo(pontos, snapX);
    if (!ponto) return null;

    const sMin = pontos[0].x;
    const sMax = pontos[pontos.length - 1].x;
    if (snapX < sMin || snapX > sMax)                           return null;
    if (serie.hoverMin != null && snapX <= serie.hoverMin)      return null;
    if (serie.hoverMax != null && snapX >= serie.hoverMax)      return null;

    return ponto;
  }


  function posicionarLinhaCrosshair(crossLayer, xPx) {
    const linha = crossLayer.querySelector('line');
    if (!linha) return;
    linha.setAttribute('x1', xPx.toFixed(1));
    linha.setAttribute('x2', xPx.toFixed(1));
  }


  function posicionarDotsCrosshair(crossLayer, series, pontosPorSerie, projetores) {
    const dotEls = crossLayer.querySelectorAll('circle');
    series.forEach((serie, si) => {
      const dot = dotEls[si];
      if (!dot) return;
      const ponto = pontosPorSerie[si];
      if (ponto == null) { dot.style.display = 'none'; return; }
      dot.style.display = '';
      dot.setAttribute('cx', projetores.posicaoX(ponto.x).toFixed(1));
      dot.setAttribute('cy', projetores.posicaoY(ponto.y).toFixed(1));
    });
  }


  function montarTooltip(tooltip, snapX, series, pontosPorSerie, formatadores) {
    const titulo = formatadores.fmtTooltipTitle(snapX, { x: snapX }, series[0]);
    const linhas = series.map((serie, si) => {
      const ponto = pontosPorSerie[si];
      if (ponto == null) return '';
      return '<div class="chart-tt-row">'
           +   '<span class="chart-tt-dot" style="background:' + serie.color + '"></span>'
           +   '<span class="chart-tt-name">' + (serie.label || '') + '</span>'
           +   '<span class="chart-tt-val">' + formatadores.fmtTooltipValue(ponto.y, serie, ponto) + '</span>'
           + '</div>';
    }).join('');

    tooltip.innerHTML = '<div class="chart-tt-title">' + titulo + '</div>' + linhas;
    tooltip.style.display = 'block';
  }


  function posicionarTooltip(tooltip, container, dimensoes, xPx, mouseY, offsetTooltip) {
    const offset    = offsetTooltip != null ? offsetTooltip : OFFSET_TOOLTIP_PADRAO;
    const contRect  = container.getBoundingClientRect();
    const ttRect    = tooltip.getBoundingClientRect();
    const ttW       = ttRect.width;
    const ttH       = ttRect.height;

    const xCont = (xPx / dimensoes.width) * contRect.width;
    let left    = xCont + offset;
    if (left + ttW > contRect.width - MARGEM_BORDA) left = xCont - offset - ttW;
    left = Math.max(MARGEM_BORDA, Math.min(contRect.width - ttW - MARGEM_BORDA, left));

    let top = mouseY - ttH - ESPACO_VERTICAL_HOVER;
    if (top < MARGEM_BORDA) top = mouseY + 18;
    top = Math.max(MARGEM_BORDA, Math.min(contRect.height - ttH - MARGEM_BORDA, top));

    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }


  function limparHover(tooltip, camadas) {
    if (tooltip) tooltip.style.display = 'none';
    if (camadas && camadas.cross) camadas.cross.style.display = 'none';
  }


  function converterXParaDados(svgX, dimensoes, padding, estado) {
    const span    = estado.xMax - estado.xMin;
    const largura = dimensoes.width - padding.left - padding.right;
    return estado.xMin + ((svgX - padding.left) / largura) * span;
  }


  function encontrarIndiceMaisProximo(valoresOrdenados, alvo) {
    if (!valoresOrdenados.length) return -1;
    let lo = 0, hi = valoresOrdenados.length - 1;
    while (lo < hi) {
      const meio = (lo + hi) >> 1;
      if (valoresOrdenados[meio] < alvo) lo = meio + 1;
      else                                hi = meio;
    }
    if (lo > 0 && Math.abs(valoresOrdenados[lo - 1] - alvo) < Math.abs(valoresOrdenados[lo] - alvo)) return lo - 1;
    return lo;
  }


  function encontrarPontoMaisProximo(pontos, xVal) {
    if (!pontos || !pontos.length) return null;
    const idx = encontrarIndiceMaisProximo(pontos.map(p => p.x), xVal);
    return idx < 0 ? null : pontos[idx];
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.Interacao = {
    PrepararCrosshair,
    ConectarHover,
    LimparHover,
  };

  if (TESTANDO) console.log('[GraficoLib] Interacao carregado');
})();

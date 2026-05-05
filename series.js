// ============================================================
// GraficoLib.Series — desenha áreas, linhas e dots de cada série
// ============================================================
//
// Para cada série recebida, gera o path da linha, opcionalmente
// uma área preenchida (gradiente vertical) e um dot no último ponto.
//
// Depende de: GraficoLib.AuxiliaresSvg

(function () {

  const TESTANDO = false;

  const OPACIDADE_AREA_PADRAO = 0.18;
  const LARGURA_LINHA_PADRAO  = 2;
  const RAIO_DOT_FINAL        = 4;
  const LARGURA_DOT_FINAL     = 2;


  // ----- API pública -----

  function Renderizar(camadas, series, projetores, dimensoes, padding) {
    const { CriarElemento, LimparCamada } = window.GraficoLib.AuxiliaresSvg;

    LimparCamada(camadas.defs);
    LimparCamada(camadas.areas);
    LimparCamada(camadas.linhas);
    LimparCamada(camadas.dots);

    series.forEach((serie, indice) => {
      desenharSerie(CriarElemento, camadas, serie, indice, projetores, dimensoes, padding);
    });
  }


  // ----- Internos -----

  function desenharSerie(criar, camadas, serie, indice, projetores, dimensoes, padding) {
    const pontos = serie.points || [];
    if (pontos.length === 0) return;

    // Linha e área precisam de pelo menos 2 pontos. Com 1 ponto desenhamos
    // apenas o dot final (caso contrário o popup fica visivelmente vazio).
    if (pontos.length >= 2) {
      const caminhoLinha = montarCaminhoLinha(pontos, projetores);
      if (serie.showArea !== false) {
        desenharArea(criar, camadas, serie, indice, pontos, caminhoLinha, projetores, dimensoes, padding);
      }
      desenharLinha(criar, camadas, serie, caminhoLinha);
    }

    if (serie.endpointDot !== false) {
      desenharDotFinal(criar, camadas, serie, pontos, projetores);
    }
  }


  function desenharArea(criar, camadas, serie, indice, pontos, caminhoLinha, projetores, dimensoes, padding) {
    const idGradiente = montarIdGradiente(indice);
    const opacidade   = serie.areaOpacity != null ? serie.areaOpacity : OPACIDADE_AREA_PADRAO;

    const grad = criar('linearGradient', { id: idGradiente, x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.innerHTML =
      `<stop offset="0%" stop-color="${serie.color}" stop-opacity="${opacidade}"/>` +
      `<stop offset="100%" stop-color="${serie.color}" stop-opacity="0"/>`;
    camadas.defs.appendChild(grad);

    const baseY  = (dimensoes.height - padding.bottom).toFixed(1);
    const firstX = projetores.posicaoX(pontos[0].x).toFixed(1);
    const lastX  = projetores.posicaoX(pontos[pontos.length - 1].x).toFixed(1);
    const caminhoArea = caminhoLinha + ` L${lastX},${baseY} L${firstX},${baseY} Z`;

    camadas.areas.appendChild(criar('path', {
      d: caminhoArea, fill: `url(#${idGradiente})`,
    }));
  }


  function desenharLinha(criar, camadas, serie, caminhoLinha) {
    const linha = criar('path', {
      d:                caminhoLinha,
      fill:             'none',
      stroke:           serie.color,
      'stroke-width':   String(serie.width || LARGURA_LINHA_PADRAO),
      'stroke-linecap': 'round',
      'stroke-linejoin':'round',
    });
    if (serie.dashed) linha.setAttribute('stroke-dasharray', '4 3');
    camadas.linhas.appendChild(linha);
  }


  function desenharDotFinal(criar, camadas, serie, pontos, projetores) {
    const ultimo = pontos[pontos.length - 1];
    camadas.dots.appendChild(criar('circle', {
      cx: projetores.posicaoX(ultimo.x).toFixed(1),
      cy: projetores.posicaoY(ultimo.y).toFixed(1),
      r:               String(RAIO_DOT_FINAL),
      fill:            'var(--bg-elevated)',
      stroke:          serie.color,
      'stroke-width':  String(LARGURA_DOT_FINAL),
    }));
  }


  function montarCaminhoLinha(pontos, projetores) {
    return pontos.map((ponto, i) => {
      const x = projetores.posicaoX(ponto.x).toFixed(1);
      const y = projetores.posicaoY(ponto.y).toFixed(1);
      return (i === 0 ? 'M' : 'L') + x + ',' + y;
    }).join(' ');
  }


  function montarIdGradiente(indice) {
    return 'grafico-grad-' + indice + '-' + Math.random().toString(36).slice(2, 7);
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.Series = { Renderizar };

  if (TESTANDO) console.log('[GraficoLib] Series carregado');
})();

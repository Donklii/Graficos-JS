// ============================================================
// GraficoLib.Eixos — desenha grade horizontal e labels X/Y
// ============================================================
//
// Renderiza a malha de grade (linhas horizontais) e os labels de
// eixo X/Y nas suas respectivas camadas. Não toca em outras camadas.
//
// Depende de: GraficoLib.AuxiliaresSvg

(function () {

  const TESTANDO = false;


  // ----- API pública -----

  function Renderizar(camadas, dominio, dimensoes, padding, config) {
    const { CriarElemento, LimparCamada } = window.GraficoLib.AuxiliaresSvg;

    LimparCamada(camadas.grade);
    LimparCamada(camadas.eixoX);
    LimparCamada(camadas.eixoY);

    desenharGradeEhEixoY(CriarElemento, camadas, dominio, dimensoes, padding, config);
    desenharEixoX(CriarElemento, camadas, dominio, dimensoes, padding, config);
  }


  // ----- Internos -----

  function desenharGradeEhEixoY(criar, camadas, dominio, dimensoes, padding, config) {
    const { yMin, yMax } = dominio;
    const { width, height } = dimensoes;
    const ticks = config.yTicks;
    const fmtY  = config.fmtY;

    for (let i = 0; i <= ticks; i++) {
      const t = i / ticks;
      const v = yMin + t * (yMax - yMin);
      const y = padding.top + (1 - t) * (height - padding.top - padding.bottom);

      camadas.grade.appendChild(criar('line', {
        x1: padding.left, x2: width - padding.right,
        y1: y, y2: y,
        stroke: 'var(--rule)', 'stroke-width': '0.5', opacity: '0.6',
      }));

      const txt = criar('text', {
        x: padding.left - 8, y: y + 3,
        'text-anchor': 'end',
        class: 'chart-axis-label',
      });
      txt.textContent = fmtY(v);
      camadas.eixoY.appendChild(txt);
    }
  }


  function desenharEixoX(criar, camadas, dominio, dimensoes, padding, config) {
    const { xMin, xMax } = dominio;
    const { width, height } = dimensoes;
    const ticks = config.xTicks;
    const fmtX  = config.fmtX;

    for (let i = 0; i <= ticks; i++) {
      const t      = i / ticks;
      const valor  = xMin + t * (xMax - xMin);
      const x      = padding.left + t * (width - padding.left - padding.right);
      const ancora = i === 0 ? 'start' : i === ticks ? 'end' : 'middle';

      const txt = criar('text', {
        x: x, y: height - padding.bottom + 18,
        'text-anchor': ancora,
        class: 'chart-axis-label',
      });
      txt.textContent = fmtX(valor);
      camadas.eixoX.appendChild(txt);
    }
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.Eixos = { Renderizar };

  if (TESTANDO) console.log('[GraficoLib] Eixos carregado');
})();

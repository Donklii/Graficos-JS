// ============================================================
// GraficoLib.Dominio — cálculo de domínio (xMin/xMax/yMin/yMax) e escalas
// ============================================================
//
// Recebe a lista de séries e devolve o domínio efetivo (com margem,
// overrides e fallbacks) + funções de projeção (posicaoX / posicaoY).
// Sem dependências.

(function () {

  const TESTANDO = false;

  const MARGEM_PADRAO_Y = 0.05;   // 5% acima e abaixo do range


  // ----- API pública -----

  function CalcularDominio(series, overrides) {
    const ext = extrairExtremos(series);
    if (!isFinite(ext.xMin) || !isFinite(ext.yMin)) {
      return { vazio: true, xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
    }

    let { xMin, xMax, yMin, yMax } = ext;

    if (xMin === xMax) xMax = xMin + 1;
    if (yMin === yMax) { yMax = yMin + 1; yMin = yMin - 1; }

    const padding = (yMax - yMin) * MARGEM_PADRAO_Y;
    yMin = yMin - padding;
    yMax = yMax + padding;

    if (overrides) {
      if (overrides.yMin != null) yMin = overrides.yMin;
      if (overrides.yMax != null) yMax = overrides.yMax;
      if (overrides.xMin != null) xMin = overrides.xMin;
      if (overrides.xMax != null) xMax = overrides.xMax;
    }
    if (xMin === xMax) xMax = xMin + 1;

    return { vazio: false, xMin, xMax, yMin, yMax };
  }


  function CriarProjetores(dominio, dimensoes, padding) {
    const { xMin, xMax, yMin, yMax } = dominio;
    const { width, height } = dimensoes;

    const posicaoX = (x) => {
      const span = xMax - xMin || 1;
      return padding.left + ((x - xMin) / span) * (width - padding.left - padding.right);
    };

    const posicaoY = (y) => {
      const span = yMax - yMin || 1;
      return padding.top + (1 - (y - yMin) / span) * (height - padding.top - padding.bottom);
    };

    return { posicaoX, posicaoY };
  }


  function UnirEixoX(series) {
    const conjunto = new Set();
    series.forEach(s => (s.points || []).forEach(p => conjunto.add(p.x)));
    return Array.from(conjunto).sort((a, b) => a - b);
  }


  // ----- Internos -----

  function extrairExtremos(series) {
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    series.forEach(serie => {
      (serie.points || []).forEach(ponto => {
        if (ponto.x < xMin) xMin = ponto.x;
        if (ponto.x > xMax) xMax = ponto.x;
        if (ponto.y < yMin) yMin = ponto.y;
        if (ponto.y > yMax) yMax = ponto.y;
      });
    });
    return { xMin, xMax, yMin, yMax };
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.Dominio = {
    CalcularDominio,
    CriarProjetores,
    UnirEixoX,
  };

  if (TESTANDO) console.log('[GraficoLib] Dominio carregado');
})();

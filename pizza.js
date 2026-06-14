// ============================================================
// GraficoLib.Pizza — gráfico de pizza (fatia cheia, sem furo)
// ============================================================
//
// Variante do Donut sem o furo central: o "anel" é tão largo quanto o
// raio, preenchendo o disco até o centro. Reaproveita integralmente a
// lógica de arcos do Donut (DRY) — este módulo só calcula a geometria
// de disco cheio e delega.
//
// API (espelha o Donut):
//   window.GraficoLib.Pizza.Renderizar(svg, segmentos, opcoes);
//   window.GraficoLib.Pizza.Limpar(svg, opcoes);
//   window.GraficoLib.Pizza.RenderizarLegenda(elLegenda, segmentos, opcoes);
//
// Segmento:
//   { cor, valor, rotulo?, chave? }
//
// opcoes (além das aceitas pelo Donut):
//   { raioExterno, centroX, centroY, classeArco }
//
// Depende de: GraficoLib.AuxiliaresSvg, GraficoLib.Donut

(function () {

  const TESTANDO = false;

  const CLASSE_ARCO_PADRAO  = 'grafico-pizza-arco';
  const FATOR_RAIO_VBOX     = 0.92;   // disco ocupa 92% do menor semieixo


  // ----- API pública -----

  function Renderizar(svg, segmentos, opcoes) {
    if (!svg || !Array.isArray(segmentos)) return false;

    const geo = calcularGeometria(svg, opcoes);
    if (!geo) return false;

    return window.GraficoLib.Donut.Renderizar(svg, segmentos, montarOpcoesDonut(geo, opcoes));
  }


  function Limpar(svg, opcoes) {
    const classe = (opcoes && opcoes.classeArco) || CLASSE_ARCO_PADRAO;
    window.GraficoLib.Donut.Limpar(svg, { classeArco: classe });
  }


  function RenderizarLegenda(elLegenda, segmentos, opcoes) {
    return window.GraficoLib.Donut.RenderizarLegenda(elLegenda, segmentos, opcoes);
  }


  // ----- Internos -----

  function calcularGeometria(svg, opcoes) {
    const opts = opcoes || {};
    const vbox = window.GraficoLib.AuxiliaresSvg.ObterViewBox(svg);
    if (!vbox && (opts.raioExterno == null || opts.centroX == null || opts.centroY == null)) {
      return null;
    }

    const centroX = opts.centroX != null ? opts.centroX : vbox.largura / 2;
    const centroY = opts.centroY != null ? opts.centroY : vbox.altura / 2;
    const raioExterno = opts.raioExterno != null
      ? opts.raioExterno
      : Math.min(centroX, centroY) * FATOR_RAIO_VBOX;

    return { centroX, centroY, raioExterno };
  }


  // Disco cheio: o arco é desenhado num círculo de raio = raioExterno/2
  // com stroke-width = raioExterno, então a borda interna toca o centro.
  function montarOpcoesDonut(geo, opcoes) {
    const opts = opcoes || {};
    return Object.assign({}, opts, {
      centroX:     geo.centroX,
      centroY:     geo.centroY,
      raio:        geo.raioExterno / 2,
      larguraAnel: geo.raioExterno,
      classeArco:  opts.classeArco || CLASSE_ARCO_PADRAO,
    });
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.Pizza = {
    Renderizar,
    Limpar,
    RenderizarLegenda,
  };

  if (TESTANDO) console.log('[GraficoLib] Pizza carregado');
})();

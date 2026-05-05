// ============================================================
// GraficoLib.Donut — gráfico de rosca (pizza com furo) reutilizável
// ============================================================
//
// Recebe um <svg> pronto (com um <circle> base opcional como trilho
// e possivelmente um <text> central) e desenha os arcos coloridos
// dos segmentos por cima. Usa a técnica de stroke-dasharray +
// stroke-dashoffset acumulado — mais robusta que rotação incremental
// para casos de segmento único (100%).
//
// API:
//   window.Grafico.Donut.Renderizar(ringSvg, segmentos, opcoes);
//   window.Grafico.Donut.Limpar(ringSvg, opcoes);
//   window.Grafico.Donut.RenderizarLegenda(elLegenda, segmentos, opcoes);
//
// Segmento:
//   { cor, valor, rotulo?, chave? }
//
// Depende de: GraficoLib.AuxiliaresSvg

(function () {

  const TESTANDO = false;

  const CLASSE_ARCO_PADRAO     = 'grafico-donut-arco';
  const ROTACAO_INICIAL_PADRAO = -90;
  const MIN_FRACAO_VISIVEL     = 1e-6;
  const RAIO_PROPORCAO_VBOX    = 0.8;
  const LARGURA_ANEL_PADRAO    = 12;


  // ----- API pública -----

  function Renderizar(ringSvg, segmentos, opcoes) {
    if (!ringSvg || !Array.isArray(segmentos)) return false;

    const cfg = montarConfig(ringSvg, opcoes);
    Limpar(ringSvg, cfg);

    const total = calcularTotal(segmentos, opcoes && opcoes.total);
    if (total <= 0) return false;

    const circunferencia = 2 * Math.PI * cfg.raio;
    const ancoraInsercao = ringSvg.querySelector('text');
    let offset = 0;

    segmentos.forEach(segmento => {
      const fracao = (segmento.valor || 0) / total;
      if (fracao <= MIN_FRACAO_VISIVEL) return;
      const arco = desenharArco(cfg, circunferencia, offset, fracao, segmento);
      if (ancoraInsercao) ringSvg.insertBefore(arco, ancoraInsercao);
      else                ringSvg.appendChild(arco);
      offset += fracao * circunferencia;
    });

    return true;
  }


  function Limpar(ringSvg, opcoes) {
    if (!ringSvg) return;
    const classe = (opcoes && opcoes.classeArco) || CLASSE_ARCO_PADRAO;
    ringSvg.querySelectorAll('.' + classe).forEach(el => el.remove());
  }


  function RenderizarLegenda(elLegenda, segmentos, opcoes) {
    if (!elLegenda) return false;

    const total    = calcularTotal(segmentos, opcoes && opcoes.total);
    const max      = opcoes && opcoes.maximoItens != null ? opcoes.maximoItens : segmentos.length;
    const template = (opcoes && opcoes.template) || templatePadraoLegenda;

    if (!segmentos.length || total <= 0) {
      elLegenda.innerHTML = (opcoes && opcoes.htmlVazio) || '';
      return false;
    }

    const fatiados = segmentos.slice(0, max);
    elLegenda.innerHTML = fatiados.map(segmento => {
      const pct = total > 0 ? (segmento.valor / total) * 100 : 0;
      return template({
        cor:            segmento.cor,
        rotulo:         segmento.rotulo || '',
        chave:          segmento.chave,
        valor:          segmento.valor,
        pct,
        pctArredondado: Math.round(pct),
        pctUmDecimal:   pct.toFixed(1),
      });
    }).join('');

    return true;
  }


  // ----- Internos (hierarquia descendente) -----

  function montarConfig(ringSvg, opcoes) {
    const opts   = opcoes || {};
    const base   = detectarCirculoBase(ringSvg);
    const vbox   = window.GraficoLib.AuxiliaresSvg.ObterViewBox(ringSvg);
    const centro = centroPadrao(base, vbox);

    return {
      centroX:       opts.centroX     != null ? opts.centroX     : centro.x,
      centroY:       opts.centroY     != null ? opts.centroY     : centro.y,
      raio:          opts.raio        != null ? opts.raio        : (base ? base.raio    : Math.min(centro.x, centro.y) * RAIO_PROPORCAO_VBOX),
      larguraAnel:   opts.larguraAnel != null ? opts.larguraAnel : (base ? base.largura : LARGURA_ANEL_PADRAO),
      classeArco:    opts.classeArco       || CLASSE_ARCO_PADRAO,
      rotacao:       opts.rotacaoInicial != null ? opts.rotacaoInicial : ROTACAO_INICIAL_PADRAO,
      strokeLinecap: opts.strokeLinecap || 'butt',
    };
  }


  function desenharArco(cfg, circunferencia, offset, fracao, segmento) {
    const { CriarElemento } = window.GraficoLib.AuxiliaresSvg;
    const dash = fracao * circunferencia;
    return CriarElemento('circle', {
      class:               cfg.classeArco,
      cx:                  cfg.centroX,
      cy:                  cfg.centroY,
      r:                   cfg.raio,
      fill:                'none',
      stroke:              segmento.cor || 'currentColor',
      'stroke-width':      cfg.larguraAnel,
      'stroke-linecap':    cfg.strokeLinecap,
      'stroke-dasharray':  dash + ' ' + (circunferencia - dash),
      'stroke-dashoffset': circunferencia - offset,
      transform:           'rotate(' + cfg.rotacao + ' ' + cfg.centroX + ' ' + cfg.centroY + ')',
    });
  }


  function detectarCirculoBase(ringSvg) {
    // Usa o primeiro <circle> sem classe (assume trilho de fundo) como
    // referência para cx/cy/r/stroke-width. Arcos já renderizados têm
    // classe e são ignorados.
    const candidatos = ringSvg.querySelectorAll('circle');
    for (const candidato of candidatos) {
      if (candidato.getAttribute('class')) continue;
      return {
        cx:      parseFloat(candidato.getAttribute('cx'))            || 0,
        cy:      parseFloat(candidato.getAttribute('cy'))            || 0,
        raio:    parseFloat(candidato.getAttribute('r'))             || 0,
        largura: parseFloat(candidato.getAttribute('stroke-width'))  || 0,
      };
    }
    return null;
  }


  function centroPadrao(base, vbox) {
    if (base) return { x: base.cx, y: base.cy };
    if (vbox) return { x: vbox.largura / 2, y: vbox.altura / 2 };
    return { x: 0, y: 0 };
  }


  function calcularTotal(segmentos, totalForcado) {
    if (totalForcado != null && totalForcado > 0) return totalForcado;
    return segmentos.reduce((soma, segmento) => soma + (segmento.valor || 0), 0);
  }


  function templatePadraoLegenda(ctx) {
    const { EscaparHtml } = window.GraficoLib.AuxiliaresSvg;
    return '<div class="grafico-donut-legenda-item">'
         +   '<span class="grafico-donut-legenda-dot" style="background:' + EscaparHtml(ctx.cor) + '"></span>'
         +   '<span class="grafico-donut-legenda-rotulo">' + EscaparHtml(ctx.rotulo) + '</span>'
         +   '<span class="grafico-donut-legenda-pct">' + ctx.pctArredondado + '%</span>'
         + '</div>';
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.Donut = {
    Renderizar,
    Limpar,
    RenderizarLegenda,
  };

  if (TESTANDO) console.log('[GraficoLib] Donut carregado');
})();

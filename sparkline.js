// ============================================================
// GraficoLib.Sparkline — sparklines minimalistas reutilizáveis
// ============================================================
//
// Dois modos de uso:
//
//   Renderizar(elPath, valores, opcoes)
//     Recebe um <path> existente; só calcula o `d` e (opcional) o stroke.
//     Útil quando o consumidor já tem um <path> no template.
//
//   RenderizarRico(svg, valores, opcoes)
//     Recebe um <svg> e desenha linha + área + dot final + baseline em zero
//     (quando os valores cruzam o zero).
//
// Sem dependências.

(function () {

  const TESTANDO = false;

  const VIEW_WIDTH_PADRAO   = 160;
  const VIEW_HEIGHT_PADRAO  = 40;
  const MARGEM_PADRAO       = 2;
  const LARGURA_LINHA_RICO  = 1.6;
  const OPACIDADE_AREA_RICO = 0.18;
  const RAIO_DOT_RICO       = 1.8;
  const NS_SVG              = 'http://www.w3.org/2000/svg';


  // ----- API pública -----

  function GerarPath(valores, opcoes) {
    if (!Array.isArray(valores) || valores.length < 2) return null;

    const dimensoes = mesclarDimensoes(opcoes);
    const escala    = calcularEscala(valores, dimensoes);

    const pontos = valores.map((valor, i) => projetar(valor, i, valores.length, dimensoes, escala));
    return 'M ' + pontos.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' L ');
  }


  function Renderizar(elementoPath, valores, opcoes) {
    if (!elementoPath) return false;
    const d = GerarPath(valores, opcoes);
    if (!d) return false;

    elementoPath.setAttribute('d', d);

    const corStroke = obterCorPorTendencia(valores, opcoes);
    if (corStroke) elementoPath.setAttribute('stroke', corStroke);

    return true;
  }


  function RenderizarRico(svg, valores, opcoes) {
    if (!svg) return false;
    if (!Array.isArray(valores) || valores.length < 2) return false;

    const dimensoes = mesclarDimensoes(opcoes);
    garantirAtributosSvg(svg, dimensoes);

    const escala = calcularEscala(valores, dimensoes);
    const pontos = valores.map((v, i) => projetar(v, i, valores.length, dimensoes, escala));
    const cor    = obterCorPorTendencia(valores, opcoes) || 'currentColor';

    svg.innerHTML = '';

    if (escala.min < 0 && escala.max > 0) {
      desenharBaselineZero(svg, dimensoes, escala);
    }
    desenharArea(svg, pontos, dimensoes, cor);
    desenharLinha(svg, pontos, cor);
    desenharDotFinal(svg, pontos[pontos.length - 1], cor);

    return true;
  }


  // ----- Internos -----

  function mesclarDimensoes(opcoes) {
    const opts = opcoes || {};
    return {
      viewWidth:  opts.viewWidth  != null ? opts.viewWidth  : VIEW_WIDTH_PADRAO,
      viewHeight: opts.viewHeight != null ? opts.viewHeight : VIEW_HEIGHT_PADRAO,
      margem:     opts.margem     != null ? opts.margem     : MARGEM_PADRAO,
    };
  }


  function calcularEscala(valores, dimensoes) {
    const min  = Math.min(...valores);
    const max  = Math.max(...valores);
    const span = (max - min) || 0.0001;
    return {
      min, max, span,
      largura: dimensoes.viewWidth  - dimensoes.margem * 2,
      altura:  dimensoes.viewHeight - dimensoes.margem * 2,
    };
  }


  function projetar(valor, indice, total, dimensoes, escala) {
    return {
      x: dimensoes.margem + (indice / (total - 1)) * escala.largura,
      y: dimensoes.margem + (1 - (valor - escala.min) / escala.span) * escala.altura,
    };
  }


  function garantirAtributosSvg(svg, dimensoes) {
    if (!svg.getAttribute('viewBox')) {
      svg.setAttribute('viewBox', `0 0 ${dimensoes.viewWidth} ${dimensoes.viewHeight}`);
    }
    if (!svg.getAttribute('preserveAspectRatio')) {
      svg.setAttribute('preserveAspectRatio', 'none');
    }
  }


  function desenharBaselineZero(svg, dimensoes, escala) {
    const yZero = dimensoes.margem + (1 - (0 - escala.min) / escala.span) * escala.altura;
    svg.appendChild(criarSvg('line', {
      x1: dimensoes.margem,                       x2: dimensoes.viewWidth - dimensoes.margem,
      y1: yZero.toFixed(1),                       y2: yZero.toFixed(1),
      stroke: 'var(--border)', 'stroke-width': '0.6', 'stroke-dasharray': '2 2',
    }));
  }


  function desenharArea(svg, pontos, dimensoes, cor) {
    const dLinha = 'M ' + pontos.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' L ');
    const yBase  = dimensoes.viewHeight - dimensoes.margem;
    const ult    = pontos[pontos.length - 1];
    const pri    = pontos[0];
    const dArea  = dLinha + ` L ${ult.x.toFixed(1)},${yBase} L ${pri.x.toFixed(1)},${yBase} Z`;

    svg.appendChild(criarSvg('path', {
      d: dArea, fill: cor, 'fill-opacity': String(OPACIDADE_AREA_RICO), stroke: 'none',
    }));
  }


  function desenharLinha(svg, pontos, cor) {
    const dLinha = 'M ' + pontos.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' L ');
    svg.appendChild(criarSvg('path', {
      d:                dLinha,
      fill:             'none',
      stroke:           cor,
      'stroke-width':   String(LARGURA_LINHA_RICO),
      'stroke-linecap': 'round',
      'stroke-linejoin':'round',
    }));
  }


  function desenharDotFinal(svg, ultimoPonto, cor) {
    svg.appendChild(criarSvg('circle', {
      cx: ultimoPonto.x.toFixed(1),
      cy: ultimoPonto.y.toFixed(1),
      r:  String(RAIO_DOT_RICO),
      fill: cor,
    }));
  }


  function obterCorPorTendencia(valores, opcoes) {
    if (!opcoes) return null;
    const corPositivo = opcoes.corPositivo;
    const corNegativo = opcoes.corNegativo;
    if (!corPositivo && !corNegativo) return null;

    const subindo = valores[valores.length - 1] >= valores[0];
    const ehBom   = opcoes.inverterCor ? !subindo : subindo;
    return ehBom ? (corPositivo || null) : (corNegativo || corPositivo || null);
  }


  function criarSvg(tag, atributos) {
    const elemento = document.createElementNS(NS_SVG, tag);
    Object.keys(atributos).forEach(chave => elemento.setAttribute(chave, String(atributos[chave])));
    return elemento;
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.Sparkline = {
    GerarPath,
    Renderizar,
    RenderizarRico,
  };

  if (TESTANDO) console.log('[GraficoLib] Sparkline carregado');
})();

// ============================================================
// GraficoLib.AuxiliaresSvg — utilidades SVG e helpers compartilhados
// ============================================================
//
// Módulo sem dependências. Centraliza:
//   - criação de elementos no namespace SVG
//   - leitura/sincronização de viewBox
//   - estimativa de largura de texto e truncamento com reticências
//   - escape HTML
//   - posicionamento de tooltip flutuante (clamp dentro do container)
//
// Esses helpers eram duplicados em colunas.js, donut.js e interacao.js.
// Centralizar aqui evita divergência entre módulos.

(function () {

  const TESTANDO = false;

  const NAMESPACE_SVG    = 'http://www.w3.org/2000/svg';
  const RETICENCIAS      = '…';
  const FATOR_LARGURA_EM = 0.55;     // aproximação para fontes sans-serif


  // ----- API pública -----

  function CriarElemento(tag, atributos) {
    const elemento = document.createElementNS(NAMESPACE_SVG, tag);
    if (!atributos) return elemento;
    for (const chave in atributos) {
      elemento.setAttribute(chave, atributos[chave]);
    }
    return elemento;
  }


  function LimparCamada(camada) {
    if (!camada) return;
    camada.innerHTML = '';
  }


  function ObterViewBox(svg) {
    if (!svg) return null;
    const atributo = svg.getAttribute('viewBox');
    if (!atributo) return null;
    const partes = atributo.split(/\s+/).map(parseFloat);
    if (partes.length !== 4) return null;
    return { x: partes[0], y: partes[1], largura: partes[2], altura: partes[3] };
  }


  function SincronizarViewBoxComContainer(svg) {
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w > 1 && h > 1) {
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }
    // preserveAspectRatio="none" estica o conteúdo — corrige.
    const par = svg.getAttribute('preserveAspectRatio');
    if (par && par.toLowerCase() === 'none') {
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
  }


  function EstimarLarguraTexto(texto, fontSize) {
    if (!texto) return 0;
    return texto.length * fontSize * FATOR_LARGURA_EM;
  }


  function TruncarParaLargura(texto, larguraMax, fontSize) {
    if (!texto)          return '';
    if (larguraMax <= 0) return '';
    if (EstimarLarguraTexto(texto, fontSize) <= larguraMax) return texto;

    const larguraReticencias = EstimarLarguraTexto(RETICENCIAS, fontSize);
    if (larguraMax < larguraReticencias) return RETICENCIAS;

    let tentativa = texto;
    while (tentativa.length > 0
        && EstimarLarguraTexto(tentativa + RETICENCIAS, fontSize) > larguraMax) {
      tentativa = tentativa.slice(0, -1);
    }
    return tentativa.replace(/\s+$/, '') + RETICENCIAS;
  }


  function EscaparHtml(texto) {
    if (texto == null) return '';
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  // Posiciona um tooltip flutuante relativo a um container, com clamp
  // para nunca sair da caixa visível. Usado por colunas, popup de grupo
  // e qualquer outro caso de tooltip seguindo o mouse.
  //
  // opcoes:
  //   { ancoraX, ancoraY, offset, margem }
  //   - ancoraX/ancoraY: coordenadas em px relativas ao container
  //   - offset: distância do cursor (default 12)
  //   - margem: distância mínima da borda (default 4)
  function PosicionarTooltipFlutuante(tooltip, container, opcoes) {
    if (!tooltip || !container || !opcoes) return;
    const offset = opcoes.offset != null ? opcoes.offset : 12;
    const margem = opcoes.margem != null ? opcoes.margem : 4;
    const rectCont = container.getBoundingClientRect();
    const rectTt   = tooltip.getBoundingClientRect();

    let left = opcoes.ancoraX + offset;
    if (left + rectTt.width > rectCont.width - margem) {
      left = opcoes.ancoraX - offset - rectTt.width;
    }
    left = Math.max(margem, Math.min(rectCont.width - rectTt.width - margem, left));

    let top = opcoes.ancoraY - rectTt.height - offset;
    if (top < margem) top = opcoes.ancoraY + offset;
    top = Math.max(margem, Math.min(rectCont.height - rectTt.height - margem, top));

    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.AuxiliaresSvg = {
    CriarElemento,
    LimparCamada,
    ObterViewBox,
    SincronizarViewBoxComContainer,
    EstimarLarguraTexto,
    TruncarParaLargura,
    EscaparHtml,
    PosicionarTooltipFlutuante,
    NAMESPACE_SVG,
    RETICENCIAS,
  };

  if (TESTANDO) console.log('[GraficoLib] AuxiliaresSvg carregado');
})();

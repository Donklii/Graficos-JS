// ============================================================
// GraficoLib.PopupGrupo — popup de hover por grupo (loja, etc.)
// ============================================================
//
// Centraliza a lógica de tooltip flutuante usado por painéis que
// precisam mostrar um cartão rico ao passar o mouse sobre uma linha
// de tabela ou um item de lista (ex: donut por categoria + linha de
// evolução por loja).
//
// Responsabilidades:
//   - timer de abrir (mouse parado N ms sobre o elemento)
//   - timer de fechar (tolerância pra mover do elemento até o popup)
//   - troca de grupo: ao entrar em outro elemento, fecha o popup
//     anterior IMEDIATAMENTE (evita popup preso até sair do tbody inteiro)
//   - posicionamento acima/abaixo do mouse conforme espaço
//   - fade-in/fade-out via opacity + transition
//   - gestão de "interatividade" do popup (entrar nele mantém aberto)
//
// API:
//
//   const popup = window.GraficoLib.PopupGrupo.Criar({
//     host:           elementoOndeAnexar,         // tipicamente um <div> dentro do card
//     className:      'popup-pizza',              // classe CSS aplicada ao popup
//     largura:        'width:380px',              // CSS adicional do popup (largura)
//     delays:         { abrir: 300, fechar: 500 },
//     resolverGrupo:  (elemento) => grupo|null,   // mapeia elemento hovered → objeto grupo
//     chaveGrupo:     (grupo) => string|number,   // chave única (ex.: lojaId)
//     montarConteudo: (grupo) => {                // monta DOM + lifecycle
//       html: string,
//       aoMontar?: (popup, grupo) => void,        // pós-append; render gráficos aqui
//       aoDestruir?: (popup) => void,             // pre-remoção; teardown de gráficos
//     },
//   });
//   popup.Conectar(listaDeElementos);             // anexa listeners (mouseenter/move/leave)
//   popup.Esconder();                             // força fechar
//   popup.Destruir();                             // remove listeners e popup atual

(function () {

  const TESTANDO = false;

  const DURACAO_FADE_MS    = 160;
  const DELAY_ABRIR_PADRAO = 300;
  const DELAY_FECHAR_PADRAO = 500;
  const MARGEM_TELA        = 12;
  const OFFSET_MOUSE       = 14;


  // ----- API pública -----

  function Criar(opts) {
    if (!opts || !opts.host)                              { console.warn('[PopupGrupo] host obrigatório'); return null; }
    if (typeof opts.resolverGrupo  !== 'function')        { console.warn('[PopupGrupo] resolverGrupo obrigatório');  return null; }
    if (typeof opts.chaveGrupo     !== 'function')        { console.warn('[PopupGrupo] chaveGrupo obrigatório');     return null; }
    if (typeof opts.montarConteudo !== 'function')        { console.warn('[PopupGrupo] montarConteudo obrigatório'); return null; }

    const cfg = mesclarConfig(opts);
    const ctx = criarContextoVazio(cfg);

    return {
      Conectar(elementos) { conectar(ctx, Array.from(elementos)); },
      Esconder()          { esconderPopup(ctx); },
      Destruir() {
        ctx.desconectores.forEach(fn => { try { fn(); } catch (_) {} });
        ctx.desconectores = [];
        esconderPopup(ctx);
      },
    };
  }


  // ----- Internos (hierarquia descendente) -----

  function mesclarConfig(opts) {
    return {
      host:           opts.host,
      className:      opts.className || 'popup-grupo',
      largura:        opts.largura   || 'width:340px',
      delays: {
        abrir:  (opts.delays && opts.delays.abrir  != null) ? opts.delays.abrir  : DELAY_ABRIR_PADRAO,
        fechar: (opts.delays && opts.delays.fechar != null) ? opts.delays.fechar : DELAY_FECHAR_PADRAO,
      },
      resolverGrupo:  opts.resolverGrupo,
      chaveGrupo:     opts.chaveGrupo,
      montarConteudo: opts.montarConteudo,
      posicionar:     typeof opts.posicionar === 'function' ? opts.posicionar : posicionarPadrao,
    };
  }


  function criarContextoVazio(cfg) {
    return {
      cfg,
      popupAtivo:       null,
      grupoAtivoChave:  null,
      aoDestruirAtivo:  null,
      timerAbrir:       null,
      timerFechar:      null,
      removidoPendente: false,
      desconectores:    [],
    };
  }


  function conectar(ctx, elementos) {
    elementos.forEach(elemento => {
      const grupo = ctx.cfg.resolverGrupo(elemento);
      if (!grupo) return;

      const aoEnter = (ev) => agendarAbrir(ctx, ev, grupo);
      const aoMove  = (ev) => agendarAbrir(ctx, ev, grupo);
      const aoLeave = ()   => agendarFechar(ctx);
      // Click reseta o timer de abertura: cancela o timer pendente e
      // reagenda do zero. Se o popup já está aberto, fecha imediatamente
      // para o usuário interagir com a linha sem o popup atrapalhar.
      const aoClick = (ev) => {
        if (ctx.popupAtivo) esconderPopup(ctx, /*imediato=*/true);
        agendarAbrir(ctx, ev, grupo);
      };

      elemento.addEventListener('mouseenter', aoEnter);
      elemento.addEventListener('mousemove',  aoMove);
      elemento.addEventListener('mouseleave', aoLeave);
      elemento.addEventListener('click',      aoClick);
      ctx.desconectores.push(() => {
        elemento.removeEventListener('mouseenter', aoEnter);
        elemento.removeEventListener('mousemove',  aoMove);
        elemento.removeEventListener('mouseleave', aoLeave);
        elemento.removeEventListener('click',      aoClick);
      });
    });
  }


  function agendarAbrir(ctx, ev, grupo) {
    cancelarFechar(ctx);
    const chaveNova = ctx.cfg.chaveGrupo(grupo);

    // Hover em outro grupo enquanto o popup do anterior está aberto:
    // fecha imediatamente o anterior pra que o novo possa abrir.
    if (ctx.popupAtivo && ctx.grupoAtivoChave !== chaveNova) {
      esconderPopup(ctx, /*imediato=*/true);
    }
    if (ctx.popupAtivo) return; // mesmo grupo, já aberto

    if (ctx.timerAbrir) clearTimeout(ctx.timerAbrir);
    const ex = ev.clientX;
    const ey = ev.clientY;
    ctx.timerAbrir = setTimeout(() => {
      ctx.timerAbrir = null;
      mostrar(ctx, { clientX: ex, clientY: ey }, grupo);
    }, ctx.cfg.delays.abrir);
  }


  function agendarFechar(ctx) {
    if (ctx.timerAbrir)  { clearTimeout(ctx.timerAbrir);  ctx.timerAbrir  = null; }
    if (ctx.timerFechar) clearTimeout(ctx.timerFechar);
    ctx.timerFechar = setTimeout(() => {
      ctx.timerFechar = null;
      esconderPopup(ctx);
    }, ctx.cfg.delays.fechar);
  }


  function cancelarFechar(ctx) {
    if (!ctx.timerFechar) return;
    clearTimeout(ctx.timerFechar);
    ctx.timerFechar = null;
  }


  function mostrar(ctx, ev, grupo) {
    if (ctx.popupAtivo) return;

    const conteudo = ctx.cfg.montarConteudo(grupo);
    if (!conteudo || !conteudo.html) return;

    const popup = montarElementoPopup(ctx.cfg, conteudo.html);
    ctx.cfg.host.appendChild(popup);

    if (typeof conteudo.aoMontar === 'function') {
      try { conteudo.aoMontar(popup, grupo); } catch (e) { console.error(e); }
    }

    ctx.cfg.posicionar(popup, ev);

    // Fade in no próximo frame (deixa o navegador aplicar opacity:0 antes).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { popup.style.opacity = '1'; });
    });

    popup.addEventListener('mouseenter', () => cancelarFechar(ctx));
    popup.addEventListener('mouseleave', () => agendarFechar(ctx));

    ctx.popupAtivo      = popup;
    ctx.grupoAtivoChave = ctx.cfg.chaveGrupo(grupo);
    ctx.aoDestruirAtivo = conteudo.aoDestruir || null;
  }


  function montarElementoPopup(cfg, html) {
    const popup = document.createElement('div');
    popup.className = cfg.className;
    popup.style.cssText = [
      'position:fixed',
      'z-index:50',
      'background:var(--bg-elevated)',
      'border:1px solid var(--border)',
      'border-radius:var(--raio-md)',
      'box-shadow:var(--shadow-lg)',
      'padding:14px 16px',
      cfg.largura,
      'opacity:0',
      `transition:opacity ${DURACAO_FADE_MS}ms ease`,
    ].join(';');
    popup.innerHTML = html;
    return popup;
  }


  function esconderPopup(ctx, imediato) {
    if (ctx.timerAbrir)  { clearTimeout(ctx.timerAbrir);  ctx.timerAbrir  = null; }
    if (ctx.timerFechar) { clearTimeout(ctx.timerFechar); ctx.timerFechar = null; }

    const popup = ctx.popupAtivo;
    const ad    = ctx.aoDestruirAtivo;
    ctx.popupAtivo      = null;
    ctx.grupoAtivoChave = null;
    ctx.aoDestruirAtivo = null;
    if (!popup) return;

    const remover = () => {
      if (typeof ad === 'function') {
        try { ad(popup); } catch (e) { console.error(e); }
      }
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    };

    if (imediato) { remover(); return; }

    // Fade out + remove ao fim da transição (com fallback caso transitionend
    // não dispare — ex.: aba inativa).
    popup.style.opacity = '0';
    let removido = false;
    const fim = () => { if (!removido) { removido = true; remover(); } };
    popup.addEventListener('transitionend', fim, { once: true });
    setTimeout(fim, DURACAO_FADE_MS + 60);
  }


  function posicionarPadrao(popup, ev) {
    const rPopup = popup.getBoundingClientRect();

    let left = ev.clientX - rPopup.width / 2;
    if (left < MARGEM_TELA)                                    left = MARGEM_TELA;
    if (left + rPopup.width > window.innerWidth - MARGEM_TELA) left = window.innerWidth - rPopup.width - MARGEM_TELA;

    const espacoAcima  = ev.clientY - MARGEM_TELA;
    const espacoAbaixo = window.innerHeight - ev.clientY - MARGEM_TELA;
    let top;
    if (espacoAcima >= rPopup.height + OFFSET_MOUSE) {
      top = ev.clientY - rPopup.height - OFFSET_MOUSE;
    } else if (espacoAbaixo >= rPopup.height + OFFSET_MOUSE) {
      top = ev.clientY + OFFSET_MOUSE;
    } else {
      top = espacoAcima > espacoAbaixo ? MARGEM_TELA : window.innerHeight - rPopup.height - MARGEM_TELA;
    }

    popup.style.left = left + 'px';
    popup.style.top  = top  + 'px';
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.PopupGrupo = { Criar };

  if (TESTANDO) console.log('[GraficoLib] PopupGrupo carregado');
})();

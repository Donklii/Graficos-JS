// ============================================================
// GraficoLib.Formatadores — formatadores reutilizáveis de eixo/tooltip
// ============================================================
//
// Funções puras para formatar valores numéricos e datas em strings
// adequadas a eixos e tooltips. Evita que cada consumidor duplique seu
// próprio `fmtCompact`. Sem dependências.
//
// Uso:
//   const fmtY = window.Grafico.Formatadores.MoedaCompacta('R$ ');
//   const fmtX = window.Grafico.Formatadores.DataCurta();

(function () {

  const TESTANDO = false;

  const MESES_ABREVIADOS_PT = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  const LIMITE_MILHAO = 1_000_000;
  const LIMITE_MIL    = 1_000;


  // ----- API pública -----

  function MoedaCompacta(prefixo) {
    const pre = prefixo == null ? 'R$ ' : prefixo;
    return (valor) => formatarValorCompacto(valor, pre);
  }


  function NumeroCompacto() {
    return (valor) => formatarValorCompacto(valor, '');
  }


  function MoedaBRL(casas) {
    const fixa = casas == null ? 2 : casas;
    return (valor) => 'R$ ' + Number(valor).toLocaleString('pt-BR', {
      minimumFractionDigits: fixa,
      maximumFractionDigits: fixa,
    });
  }


  function DataCurta(opcoes) {
    const cfg = mesclarOpcoesData(opcoes);
    return (timestamp) => {
      const data = paraData(timestamp, cfg.multiplicadorTimestamp);
      if (!data) return '—';
      if (cfg.formatoMesAno) return formatarMesAno(data);
      return formatarDiaMes(data);
    };
  }


  function DataLonga(opcoes) {
    const cfg = mesclarOpcoesData(opcoes);
    return (timestamp) => {
      const data = paraData(timestamp, cfg.multiplicadorTimestamp);
      if (!data) return '—';
      return String(data.getDate()).padStart(2, '0') + ' '
           + MESES_ABREVIADOS_PT[data.getMonth()] + ' '
           + data.getFullYear();
    };
  }


  function MesAno(opcoes) {
    const cfg = mesclarOpcoesData(opcoes);
    return (timestamp) => {
      const data = paraData(timestamp, cfg.multiplicadorTimestamp);
      if (!data) return '—';
      return formatarMesAno(data);
    };
  }


  // ----- Internos -----

  function formatarValorCompacto(valor, prefixo) {
    const abs = Math.abs(valor);
    if (abs >= LIMITE_MILHAO) return prefixo + (valor / LIMITE_MILHAO).toFixed(1) + 'M';
    if (abs >= LIMITE_MIL)    return prefixo + (valor / LIMITE_MIL).toFixed(0) + 'k';
    return prefixo + valor.toFixed(0);
  }


  function mesclarOpcoesData(opcoes) {
    const opts = opcoes || {};
    return {
      multiplicadorTimestamp: opts.multiplicadorTimestamp != null ? opts.multiplicadorTimestamp : 1,
      formatoMesAno:          !!opts.formatoMesAno,
    };
  }


  function formatarMesAno(data) {
    return MESES_ABREVIADOS_PT[data.getMonth()] + '/' + String(data.getFullYear()).slice(2);
  }


  function formatarDiaMes(data) {
    return String(data.getDate()).padStart(2, '0') + '/'
         + String(data.getMonth() + 1).padStart(2, '0');
  }


  function paraData(timestamp, multiplicador) {
    const data = new Date(timestamp * multiplicador);
    if (isNaN(data.getTime())) return null;
    return data;
  }


  // ----- Exporta -----

  window.GraficoLib = window.GraficoLib || {};
  window.GraficoLib.Formatadores = {
    MoedaCompacta,
    NumeroCompacto,
    MoedaBRL,
    DataCurta,
    DataLonga,
    MesAno,
    MESES_ABREVIADOS_PT,
  };

  if (TESTANDO) console.log('[GraficoLib] Formatadores carregado');
})();

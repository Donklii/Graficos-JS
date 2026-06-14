// ============================================================
// tests/graficos — renderização de cada tipo de gráfico
// ============================================================
//
// Cada teste cobre o golden path (retorna true e desenha os elementos
// esperados) e, quando aplicável, um caso de borda (entrada inválida
// deve retornar false em vez de quebrar).

const test   = require('node:test');
const assert = require('node:assert/strict');
const { CriarAmbiente, CriarSvg } = require('./helpers/dom');

const window = CriarAmbiente();
const Grafico = window.Grafico;

const VBOX_CARTESIANO = '0 0 600 280';
const VBOX_CIRCULAR   = '0 0 100 100';
const VBOX_MEDIDOR    = '0 0 240 140';
const VBOX_SPARK      = '0 0 160 40';


// ----- Núcleo (gráfico de linha) -----

test('Linha renderiza séries válidas e expõe Redesenhar', () => {
  const container = window.document.createElement('div');
  window.document.body.appendChild(container);

  const grafico = Grafico(container, { responsivo: true });
  const ok = grafico.Renderizar({
    series: [{ label: 'R', color: '#3b82f6', points: [{ x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 15 }] }],
  });

  assert.equal(ok, true);
  assert.equal(typeof grafico.Redesenhar, 'function');
  assert.equal(grafico.Redesenhar(), true);
  grafico.Destruir();
});


test('Linha sem pontos retorna false e não quebra', () => {
  const container = window.document.createElement('div');
  window.document.body.appendChild(container);

  const grafico = Grafico(container, {});
  assert.equal(grafico.Renderizar({ series: [] }), false);
});


// ----- Colunas -----

test('Colunas desenha uma barra por categoria/série', () => {
  const svg = CriarSvg(window, VBOX_CARTESIANO);
  const ok = Grafico.Colunas.Renderizar(svg, {
    categorias: ['A', 'B'],
    series: [{ rotulo: 'x', cor: '#3b82f6', valores: [10, 20] }],
  });

  assert.equal(ok, true);
  assert.equal(svg.querySelectorAll('.grafico-colunas-barra').length, 2);
});


test('Colunas com animar não quebra e ainda retorna true', () => {
  const svg = CriarSvg(window, VBOX_CARTESIANO);
  const ok = Grafico.Colunas.Renderizar(svg, {
    categorias: ['A', 'B'],
    series: [{ rotulo: 'x', cor: '#3b82f6', valores: [10, 20] }],
    animar: true,
  });
  assert.equal(ok, true);
});


test('Colunas só com zeros retorna false', () => {
  const svg = CriarSvg(window, VBOX_CARTESIANO);
  const ok = Grafico.Colunas.Renderizar(svg, {
    categorias: ['A', 'B'],
    series: [{ rotulo: 'x', cor: '#3b82f6', valores: [0, 0] }],
  });
  assert.equal(ok, false);
});


// ----- Barras horizontais -----

test('Barras desenha uma barra por categoria', () => {
  const svg = CriarSvg(window, VBOX_CARTESIANO);
  const ok = Grafico.Barras.Renderizar(svg, {
    categorias: ['A', 'B', 'C'],
    series: [{ rotulo: 'x', cor: '#3b82f6', valores: [10, 20, 30] }],
    mostrarValores: true,
    animar: true,
  });

  assert.equal(ok, true);
  assert.equal(svg.querySelectorAll('.grafico-barras-barra').length, 3);
});


test('Barras sem séries em array retorna false', () => {
  const svg = CriarSvg(window, VBOX_CARTESIANO);
  assert.equal(Grafico.Barras.Renderizar(svg, { categorias: ['A'], series: null }), false);
});


// ----- Área empilhada -----

test('AreaEmpilhada desenha área + linha por série', () => {
  const svg = CriarSvg(window, VBOX_CARTESIANO);
  const ok = Grafico.AreaEmpilhada.Renderizar(svg, {
    categorias: ['A', 'B', 'C'],
    series: [
      { rotulo: 'x', cor: '#3b82f6', valores: [10, 20, 30] },
      { rotulo: 'y', cor: '#10b981', valores: [5, 5, 5] },
    ],
    animar: true,
  });

  assert.equal(ok, true);
  // 2 séries => 2 paths de área + 2 paths de linha de topo.
  assert.ok(svg.querySelectorAll('path').length >= 4);
});


test('AreaEmpilhada exige ao menos 2 categorias', () => {
  const svg = CriarSvg(window, VBOX_CARTESIANO);
  const ok = Grafico.AreaEmpilhada.Renderizar(svg, {
    categorias: ['A'],
    series: [{ rotulo: 'x', cor: '#3b82f6', valores: [10] }],
  });
  assert.equal(ok, false);
});


// ----- Donut -----

test('Donut desenha um arco por segmento com valor', () => {
  const svg = CriarSvg(window, VBOX_CIRCULAR);
  const ok = Grafico.Donut.Renderizar(svg, [
    { cor: '#10b981', valor: 60 },
    { cor: '#f59e0b', valor: 25 },
    { cor: '#ef4444', valor: 15 },
  ], { animar: true });

  assert.equal(ok, true);
  assert.equal(svg.querySelectorAll('.grafico-donut-arco').length, 3);
});


test('Donut com total zero retorna false', () => {
  const svg = CriarSvg(window, VBOX_CIRCULAR);
  const ok = Grafico.Donut.Renderizar(svg, [{ cor: '#10b981', valor: 0 }]);
  assert.equal(ok, false);
});


// ----- Pizza -----

test('Pizza desenha arcos de disco cheio', () => {
  const svg = CriarSvg(window, VBOX_CIRCULAR);
  const ok = Grafico.Pizza.Renderizar(svg, [
    { cor: '#3b82f6', valor: 50 },
    { cor: '#10b981', valor: 50 },
  ]);

  assert.equal(ok, true);
  assert.equal(svg.querySelectorAll('.grafico-pizza-arco').length, 2);
});


// ----- Medidor -----

test('Medidor simples desenha o arco de progresso', () => {
  const svg = CriarSvg(window, VBOX_MEDIDOR);
  const ok = Grafico.Medidor.Renderizar(svg, {
    valor: 50, maximo: 100, cor: '#3b82f6', animar: true,
  });

  assert.equal(ok, true);
  assert.equal(svg.querySelectorAll('.grafico-medidor-progresso').length, 1);
});


test('Medidor com faixas desenha ponteiro', () => {
  const svg = CriarSvg(window, VBOX_MEDIDOR);
  const ok = Grafico.Medidor.Renderizar(svg, {
    valor: 86, maximo: 100,
    faixas: [{ ate: 50, cor: '#ef4444' }, { ate: 80, cor: '#f59e0b' }, { ate: 100, cor: '#10b981' }],
    animar: true,
  });

  assert.equal(ok, true);
  assert.equal(svg.querySelectorAll('.grafico-medidor-ponteiro').length, 1);
});


test('Medidor com faixas mantém trilho neutro de fundo', () => {
  const svg = CriarSvg(window, VBOX_MEDIDOR);
  // Faixas cobrem só até 60 de 100: o trecho final depende do trilho.
  const ok = Grafico.Medidor.Renderizar(svg, {
    valor: 40, maximo: 100,
    faixas: [{ ate: 30, cor: '#ef4444' }, { ate: 60, cor: '#10b981' }],
  });

  assert.equal(ok, true);
  assert.equal(svg.querySelectorAll('.grafico-medidor-trilho').length, 1);
});


test('Medidor simples também tem trilho de fundo', () => {
  const svg = CriarSvg(window, VBOX_MEDIDOR);
  Grafico.Medidor.Renderizar(svg, { valor: 50, maximo: 100 });
  assert.equal(svg.querySelectorAll('.grafico-medidor-trilho').length, 1);
});


test('Medidor sem valor numérico retorna false', () => {
  const svg = CriarSvg(window, VBOX_MEDIDOR);
  assert.equal(Grafico.Medidor.Renderizar(svg, { valor: 'oitenta' }), false);
});


// ----- Sparkline -----

test('Sparkline rico renderiza linha + área + dot', () => {
  const svg = CriarSvg(window, VBOX_SPARK);
  const ok = Grafico.Sparkline.RenderizarRico(svg, [10, 12, 8, 15, 18, 22], {
    corPositivo: '#10b981', corNegativo: '#ef4444',
  });

  assert.equal(ok, true);
  assert.ok(svg.querySelectorAll('path').length >= 2);
  assert.equal(svg.querySelectorAll('circle').length, 1);
});


test('Sparkline barras desenha uma barra por valor', () => {
  const svg = CriarSvg(window, VBOX_SPARK);
  const valores = [8, -3, 5, -6, 10, 4, -2, 12];
  const ok = Grafico.Sparkline.RenderizarBarras(svg, valores, {
    corPositivo: '#10b981', corNegativo: '#ef4444',
  });

  assert.equal(ok, true);
  assert.equal(svg.querySelectorAll('rect').length, valores.length);
});


test('Sparkline rico exige ao menos 2 valores', () => {
  const svg = CriarSvg(window, VBOX_SPARK);
  assert.equal(Grafico.Sparkline.RenderizarRico(svg, [10]), false);
  assert.equal(Grafico.Sparkline.GerarPath([10]), null);
});

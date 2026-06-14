// ============================================================
// tests/formatadores — formatadores de eixo/tooltip (funções puras)
// ============================================================

const test   = require('node:test');
const assert = require('node:assert/strict');
const { CriarAmbiente } = require('./helpers/dom');

const window = CriarAmbiente();
const Formatadores = window.Grafico.Formatadores;

const TS_BASE = 0;                 // 1970-01-01T00:00:00Z em segundos
const MULTIPLICADOR_MS = 1000;


// ----- MoedaBRL -----

test('MoedaBRL formata em pt-BR com 2 casas', () => {
  assert.equal(Formatadores.MoedaBRL(2)(1234.5), 'R$ 1.234,50');
});


test('MoedaBRL aceita zero casas', () => {
  assert.equal(Formatadores.MoedaBRL(0)(1234), 'R$ 1.234');
});


// ----- MoedaCompacta / NumeroCompacto -----

test('MoedaCompacta abrevia milhões', () => {
  assert.equal(Formatadores.MoedaCompacta('R$ ')(2_000_000), 'R$ 2.0M');
});


test('NumeroCompacto abrevia milhares e mantém pequenos', () => {
  assert.equal(Formatadores.NumeroCompacto()(5000), '5k');
  assert.equal(Formatadores.NumeroCompacto()(500),  '500');
});


// ----- Numero -----

test('Numero respeita o número de casas decimais', () => {
  assert.equal(Formatadores.Numero(1)(1234.56), '1.234,6');
  assert.equal(Formatadores.Numero(0)(1234.56), '1.235');
});


// ----- Percentual -----

test('Percentual trata o valor como pontos percentuais', () => {
  assert.equal(Formatadores.Percentual(1)(42.5), '42,5%');
});


test('Percentual aceita atalho numérico para casas', () => {
  assert.equal(Formatadores.Percentual(0)(42.5), '43%');
});


test('Percentual converte fração quando comoFracao', () => {
  assert.equal(Formatadores.Percentual({ casas: 0, comoFracao: true })(0.42), '42%');
});


// ----- Datas -----

test('DataCurta devolve dia/mês para timestamp válido', () => {
  const resultado = Formatadores.DataCurta({ multiplicadorTimestamp: MULTIPLICADOR_MS })(TS_BASE);
  assert.match(resultado, /^\d{2}\/\d{2}$/);
});


test('DataCurta devolve travessão para timestamp inválido', () => {
  assert.equal(Formatadores.DataCurta()(NaN), '—');
});


test('DataHora inclui hora e minuto', () => {
  const resultado = Formatadores.DataHora({ multiplicadorTimestamp: MULTIPLICADOR_MS })(TS_BASE);
  assert.match(resultado, /^\d{2}\/\d{2} \d{2}:\d{2}$/);
});


test('MesAno usa mês abreviado em PT-BR', () => {
  const resultado = Formatadores.MesAno({ multiplicadorTimestamp: MULTIPLICADOR_MS })(TS_BASE);
  assert.match(resultado, /^[A-Z][a-z]{2}\/\d{2}$/);
});

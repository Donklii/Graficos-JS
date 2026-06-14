// ============================================================
// tests/helpers/dom — ambiente DOM compartilhado para os testes
// ============================================================
//
// Monta um JSDOM com scripts habilitados, injeta os stubs que o jsdom
// não implementa nativamente (ResizeObserver, getTotalLength, getBBox) e
// carrega todos os módulos da lib na ordem real de carregamento. Cada
// arquivo de teste roda em processo isolado, então chama CriarAmbiente()
// uma vez no topo. Centralizar o boilerplate aqui evita divergência.

const fs   = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..', '..');
const NAMESPACE_SVG = 'http://www.w3.org/2000/svg';

// Mesma ordem documentada no README (pizza depende de donut; nucleo por último).
const ORDEM_MODULOS = [
  'auxiliaresSvg.js', 'formatadores.js', 'dominio.js', 'eixos.js', 'series.js',
  'interacao.js', 'sparkline.js', 'donut.js', 'pizza.js', 'colunas.js', 'barras.js',
  'areaEmpilhada.js', 'medidor.js', 'popupGrupo.js', 'nucleo.js',
];

// Browsers reais fornecem estas APIs nativamente; o jsdom não.
const STUBS =
  'window.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };' +
  'window.SVGElement.prototype.getTotalLength = function(){ return 100; };' +
  'if(!window.SVGElement.prototype.getBBox) ' +
  'window.SVGElement.prototype.getBBox = function(){ return { x:0, y:0, width:10, height:10 }; };';


// ----- API pública -----

function CriarAmbiente() {
  const dom = new JSDOM('<!DOCTYPE html><body></body>', {
    runScripts:       'dangerously',
    pretendToBeVisual: true,
  });

  injetarCodigo(dom.window, STUBS);
  ORDEM_MODULOS.forEach(arquivo => injetarModulo(dom.window, arquivo));

  return dom.window;
}


function CriarSvg(window, viewBox) {
  const svg = window.document.createElementNS(NAMESPACE_SVG, 'svg');
  svg.setAttribute('viewBox', viewBox);
  const wrapper = window.document.createElement('div');
  wrapper.appendChild(svg);
  window.document.body.appendChild(wrapper);
  return svg;
}


// ----- Internos -----

function injetarModulo(window, arquivo) {
  injetarCodigo(window, fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'));
}


function injetarCodigo(window, codigo) {
  const script = window.document.createElement('script');
  script.textContent = codigo;
  window.document.body.appendChild(script);
}


// ----- Exporta -----

module.exports = { CriarAmbiente, CriarSvg };

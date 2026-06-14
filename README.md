# Graficos JS

Biblioteca leve de gráficos em SVG puro, sem dependências externas, escrita em JavaScript vanilla.
Pensada para ser carregada via `<script>` em qualquer página estática ou empacotada como submodule
de outros projetos.

Inclui:

- **Linha** com áreas, gradiente, crosshair e tooltip seguindo o mouse (com responsividade opt-in)
- **Área empilhada** (stacked area) com eixo categórico, crosshair e tooltip por categoria
- **Donut** (rosca) com legenda customizável
- **Pizza** (fatia cheia, sem furo) — variante do Donut
- **Colunas** (barras verticais) com suporte a múltiplas séries, legenda e tooltip
- **Barras** (horizontais) — ideais para rankings com rótulos longos
- **Sparkline** minimalista (modo simples, modo rico com área + dot final, e modo barras)
- **Medidor / Gauge** semicircular para KPI vs. meta (com faixas coloridas + ponteiro)
- **PopupGrupo** — popup flutuante para hover por linha/item de tabela
- **Formatadores** prontos para moeda BRL, número, percentual, números compactos e datas em PT-BR
- **Animação de entrada** opt-in em donut, pizza, colunas, barras, área empilhada e medidor

## Como usar

Inclua os scripts na ordem (a ordem importa porque cada módulo registra-se em `window.GraficoLib`; `pizza.js` depende de `donut.js`, e `nucleo.js` reexporta tudo, então vem por último):

```html
<script src="auxiliaresSvg.js"></script>
<script src="formatadores.js"></script>
<script src="dominio.js"></script>
<script src="eixos.js"></script>
<script src="series.js"></script>
<script src="interacao.js"></script>
<script src="sparkline.js"></script>
<script src="donut.js"></script>
<script src="pizza.js"></script>
<script src="colunas.js"></script>
<script src="barras.js"></script>
<script src="areaEmpilhada.js"></script>
<script src="medidor.js"></script>
<script src="popupGrupo.js"></script>
<script src="nucleo.js"></script>
```

### Gráfico de linha

```js
const grafico = window.Grafico(document.getElementById('meu-chart'), {
  fmtY: window.Grafico.Formatadores.MoedaCompacta('R$ '),
  fmtX: window.Grafico.Formatadores.DataCurta({ multiplicadorTimestamp: 1000 }),
});

grafico.Renderizar({
  series: [
    {
      label:   'Receita',
      color:   '#3b82f6',
      points:  [ { x: 1700000000, y: 120 }, { x: 1700086400, y: 180 } ],
      showArea:    true,
      areaOpacity: 0.18,
    },
  ],
});
```

### Donut

```js
window.Grafico.Donut.Renderizar(svgRing, [
  { cor: '#10b981', valor: 60, rotulo: 'Aprovado' },
  { cor: '#ef4444', valor: 40, rotulo: 'Pendente' },
]);
```

### Colunas

```js
window.Grafico.Colunas.Renderizar(svgEl, {
  categorias: ['Loja A', 'Loja B', 'Loja C'],
  series: [
    { rotulo: 'Faturamento', cor: '#3b82f6', valores: [120, 180, 95] },
  ],
  formatarValor: window.Grafico.Formatadores.MoedaCompacta('R$ '),
});
```

### Barras (horizontais)

Mesma forma de config das Colunas — útil quando os rótulos de categoria são longos.

```js
window.Grafico.Barras.Renderizar(svgEl, {
  categorias: ['Distrito Federal', 'São Paulo', 'Rio de Janeiro'],
  series: [
    { rotulo: 'Faturamento', cor: '#3b82f6', valores: [210, 180, 95] },
  ],
  formatarValor:  window.Grafico.Formatadores.MoedaCompacta('R$ '),
  mostrarValores: true,
  animar:         true,
});
```

### Área empilhada

Eixo X categórico (igual Colunas/Barras); as séries são empilhadas.

```js
window.Grafico.AreaEmpilhada.Renderizar(svgEl, {
  categorias: ['Jan', 'Fev', 'Mar', 'Abr'],
  series: [
    { rotulo: 'Loja A', cor: '#3b82f6', valores: [40, 55, 50, 70] },
    { rotulo: 'Loja B', cor: '#10b981', valores: [20, 25, 35, 30] },
  ],
  formatarValor: window.Grafico.Formatadores.MoedaCompacta('R$ '),
  animar:        true,
});
```

### Pizza

Mesma API do Donut, sem furo central. Não precisa de `<circle>` base no SVG.

```js
window.Grafico.Pizza.Renderizar(svgEl, [
  { cor: '#10b981', valor: 60, rotulo: 'Aprovado' },
  { cor: '#ef4444', valor: 40, rotulo: 'Pendente' },
]);
window.Grafico.Pizza.RenderizarLegenda(legendaEl, segmentos);
```

### Medidor / Gauge

```js
// Modo simples: arco de progresso colorido
window.Grafico.Medidor.Renderizar(svgEl, {
  valor:         72,
  maximo:        100,
  cor:           '#3b82f6',
  formatarValor: window.Grafico.Formatadores.Percentual(0),
  rotulo:        'Meta do mês',
  animar:        true,
});

// Modo faixas: zonas coloridas de fundo + ponteiro
window.Grafico.Medidor.Renderizar(svgEl, {
  valor:  72,
  maximo: 100,
  faixas: [
    { ate: 50,  cor: '#ef4444' },
    { ate: 80,  cor: '#f59e0b' },
    { ate: 100, cor: '#10b981' },
  ],
});
```

### Sparkline

```js
// Modo rico: linha + área + dot final
window.Grafico.Sparkline.RenderizarRico(svgEl, [10, 12, 8, 15, 18, 22], {
  corPositivo: '#10b981',
  corNegativo: '#ef4444',
});

// Modo barras: mini-gráfico de colunas
window.Grafico.Sparkline.RenderizarBarras(svgEl, [10, -4, 8, -2, 15, 22], {
  corPositivo: '#10b981',
  corNegativo: '#ef4444',
});
```

### Responsividade (gráfico de linha)

Passe `responsivo: true` para o gráfico reflui automaticamente ao redimensionar o
container (via `ResizeObserver`). Também há `grafico.Redesenhar()` para forçar manualmente.

```js
const grafico = window.Grafico(container, { responsivo: true, fmtY, fmtX });
grafico.Renderizar({ series: [...] });
// grafico.Redesenhar();  // redesenha com os últimos dados
```

### Formatadores

```js
window.Grafico.Formatadores.MoedaBRL(2)(1234.5);          // "R$ 1.234,50"
window.Grafico.Formatadores.MoedaCompacta('R$ ')(1500);   // "R$ 2k"
window.Grafico.Formatadores.Numero(1)(1234.56);           // "1.234,6"
window.Grafico.Formatadores.Percentual(1)(42.5);          // "42,5%"
window.Grafico.Formatadores.Percentual({ casas: 0, comoFracao: true })(0.42); // "42%"
window.Grafico.Formatadores.DataCurta()(Date.now() / 1000 | 0); // depende da data
window.Grafico.Formatadores.DataHora({ multiplicadorTimestamp: 1000 })(ts);    // "13/06 21:36"
```

## Variáveis CSS esperadas

A biblioteca não impõe um tema; lê valores via `var(...)` para respeitar o design system do
consumidor. Defina os tokens abaixo no escopo onde os gráficos vivem (ou em `:root`) — qualquer
um sem definição cai no `currentColor` ou em uma cor neutra:

| Token              | Uso                                               |
|--------------------|---------------------------------------------------|
| `--text`           | texto principal sobre colunas                     |
| `--text-muted`     | labels de eixo e legendas                         |
| `--rule`           | linhas da grade                                   |
| `--border`         | bordas suaves (popups, baseline em sparkline)     |
| `--border-strong`  | linhas pontilhadas em colunas                     |
| `--eixo`           | linha de baseline                                 |
| `--ink-faint`      | linha do crosshair                                |
| `--bg-elevated`    | fundo de popup e contorno do dot final            |
| `--shadow-lg`      | sombra do popup                                   |
| `--raio-md`        | raio de borda do popup                            |
| `--fonte-ui`       | fonte de labels e legendas                        |
| `--fonte-mono`     | fonte tabular para eixos numéricos                |

## Como importar em outro projeto

### Como Git submodule (recomendado)

```bash
git submodule add <url-do-repo> caminho/no/seu/projeto/grafico
```

Depois inclua os `<script>` apontando para `caminho/no/seu/projeto/grafico/<arquivo>.js`.

### Cópia direta

Copie os 15 `.js` para uma pasta `grafico/` no seu projeto e referencie diretamente
(na ordem de carregamento mostrada acima).

## Testes

A suíte usa o runner nativo do Node (`node --test`) com **jsdom** para simular o DOM
(única `devDependency`). Os arquivos ficam em [`tests/`](tests/):

```bash
npm install   # instala o jsdom (dev)
npm test      # roda node --test (descobre tests/*.test.js)
```

Cobertura: formatadores (funções puras) e renderização de cada tipo de gráfico
(golden path + casos de borda). O CI roda a suíte a cada `push`/`pull_request` em
qualquer branch via [`.github/workflows/testes.yml`](.github/workflows/testes.yml).

## Licença

Pública para uso pessoal. Veja [LICENSE](LICENSE) para os termos.

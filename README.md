# Graficos JS

Biblioteca leve de gráficos em SVG puro, sem dependências externas, escrita em JavaScript vanilla.
Pensada para ser carregada via `<script>` em qualquer página estática ou empacotada como submodule
de outros projetos.

Inclui:

- **Linha** com áreas, gradiente, crosshair e tooltip seguindo o mouse
- **Donut** (rosca) com legenda customizável
- **Colunas** (barras verticais) com suporte a múltiplas séries, legenda e tooltip
- **Sparkline** minimalista (modo simples e modo rico com área + dot final)
- **PopupGrupo** — popup flutuante para hover por linha/item de tabela
- **Formatadores** prontos para moeda BRL, números compactos e datas em PT-BR

## Como usar

Inclua os scripts na ordem (a ordem importa porque cada módulo registra-se em `window.GraficoLib`):

```html
<script src="auxiliaresSvg.js"></script>
<script src="formatadores.js"></script>
<script src="dominio.js"></script>
<script src="eixos.js"></script>
<script src="series.js"></script>
<script src="interacao.js"></script>
<script src="sparkline.js"></script>
<script src="donut.js"></script>
<script src="colunas.js"></script>
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

### Sparkline

```js
window.Grafico.Sparkline.RenderizarRico(svgEl, [10, 12, 8, 15, 18, 22], {
  corPositivo: '#10b981',
  corNegativo: '#ef4444',
});
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

Copie os 11 `.js` para uma pasta `grafico/` no seu projeto e referencie diretamente.

## Licença

Pública para uso pessoal. Veja [LICENSE](LICENSE) para os termos.

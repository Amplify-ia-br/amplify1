# Amplify Day — Visual Kit

A geometria de Brasília como sistema gráfico: seis grafismos, três texturas, três
tratamentos de imagem, quatro micro-animações e duas composições de exemplo.

Catálogo navegável: **`/amplify-day/visual-kit`**.

Estes elementos são **isolados e opcionais**. Nenhuma página existente os importa;
adicioná-los a uma página não muda nada nas outras.

---

## Princípios de implementação

- **Astro + CSS + SVG.** Sem Tailwind, sem React, sem runtime do Claude Design.
- **Um JavaScript só, e opcional:** o `IntersectionObserver` do `SublinhadoEixo`
  no modo `once`. Todo o resto é CSS.
- **CSS escopado.** Cada componente escreve apenas dentro do próprio bloco
  `<style>` do Astro — nada vaza para a página que o hospeda, e nada nele depende
  de CSS global.
- **Sem posicionamento global.** Nenhum componente usa `position: fixed`, z-index
  de página ou margens externas. Quem posiciona é sempre o container.
- **Responsivo por proporção.** Os desenhos têm `aspect-ratio` nativa e ocupam
  100% da largura do container; passe `width`, `height` ou `ratio` para mudar.
- **`prefers-reduced-motion` respeitado** em todos os que animam — e cada um
  repousa num estado final legível, nunca invisível.

## Props comuns

Todos aceitam o contrato de `kit.ts`:

| Prop        | Vira            | Para quê                                              |
| ----------- | --------------- | ----------------------------------------------------- |
| `class`     | —               | classes externas, mescladas na raiz                   |
| `style`     | —               | estilo inline extra (vence as variáveis do kit)       |
| `color`     | `--vk-color`    | cor do traço (padrão: `currentColor`)                 |
| `accent`    | `--vk-accent`   | o acento — ciano por padrão                           |
| `surface`   | `--vk-surface`  | cor de fundo, quando o elemento tem uma               |
| `opacity`   | `--vk-opacity`  | opacidade do conjunto                                 |
| `intensity` | `--vk-intensity`| peso do traço / força do efeito (1 = como desenhado)  |
| `speed`     | `--vk-speed`    | multiplicador de velocidade (2 = duas vezes mais rápido) |
| `animated`  | —               | `false` congela a animação no estado final            |
| `width` / `height` / `ratio` | — | dimensões da caixa                          |

As variáveis também podem ser definidas por CSS em qualquer ancestral — é assim
que o tema troca a paleta de todos de uma vez.

## Elementos

**`grafismos/`** — `GrafismoEixo`, `GrafismoTesourinha`, `GrafismoNave`,
`GrafismoCandangos`, `GrafismoCupulas`, `GrafismoSuperquadra` (aceita ainda
`columns`, `rows`, `lit`, `gap`).

**`texturas/`** — `TexturaMalhaUrbana`, `TexturaConcreto`, `TexturaHorizonte`.
Todas aceitam `inset` para preencher o ancestral posicionado mais próximo.

**`imagem/`** — `ImagemDuotone` (`tint`, `scrim`), `ImagemLavada` (`scanline`),
`ImagemReticula` (`step`, `sweep`). Todas pedem `src` e `alt`, e isolam o blend
(`isolation: isolate`) para não alcançar o fundo da página.

**`motion/`** — `SublinhadoEixo` (`once`), `PulsoMarcoZero`, `FitaDeDados`
(`items`, `repeat`), `BotaoEixo` (`href`, `variant`, `noArrow`).

**`aplicacoes/`** — `AplicacaoHero` e `AplicacaoConvite`: exemplos de composição
para o catálogo. Copie a estrutura; não são blocos de produção.

## Tema (opcional)

`visual-kit.css` traz as duas paletas e as fontes do kit. Importe na página e
marque o container:

```astro
---
import "@/components/amplify-day/visual-kit/visual-kit.css";
import GrafismoEixo from "@/components/amplify-day/visual-kit/grafismos/GrafismoEixo.astro";
---

<section data-vk-theme="tinta">
  <GrafismoEixo width={320} speed={0.6} />
</section>
```

- `creme` — a paleta do kit como desenhado (fundo `#eae6d9`, tinta `#0d0d0d`).
- `tinta` — o kit sobre o canvas escuro do Design System Amplify (`#0a0a0a`).

Sem o tema, cada componente cai nos próprios valores-padrão e continua
funcionando — o arquivo só troca a paleta inteira de uma vez.

## Uso do acento

O ciano `#2dd4bf` é o único acento e vale ~10% da peça: onde há inteligência em
ação. O carmim `#c01a4e` é da jornada de conversão (pop-up e confirmação), nunca
da home. Uma animação por dobra, no máximo.

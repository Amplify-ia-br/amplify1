/**
 * Amplify Day — Visual Kit
 * Contrato de props compartilhado por todos os elementos do kit.
 *
 * A geometria de Brasília como sistema gráfico: traço fino, monocromo,
 * um único acento ciano e movimento contido.
 *
 * Cada elemento é isolado: não posiciona nada globalmente, não define
 * margens externas e só escreve CSS dentro do próprio bloco `<style>`
 * escopado do Astro. A customização acontece por props, que viram
 * variáveis CSS inline na raiz do componente — de modo que um consumidor
 * também pode sobrescrevê-las por CSS, sem tocar no componente.
 */

export interface VisualKitProps {
  /** Classes extras aplicadas à raiz do elemento. */
  class?: string;
  /** Estilo inline extra, concatenado depois das variáveis do kit. */
  style?: string;
  /** Cor do traço principal. Padrão: `currentColor`. → `--vk-color` */
  color?: string;
  /** Cor de acento (o ciano do sistema). Padrão: `#2dd4bf`. → `--vk-accent` */
  accent?: string;
  /** Cor de fundo/superfície, quando o elemento tem uma. → `--vk-surface` */
  surface?: string;
  /** Opacidade do conjunto (0–1). → `--vk-opacity` */
  opacity?: number | string;
  /** Peso do traço / força do efeito. 1 = como desenhado. → `--vk-intensity` */
  intensity?: number | string;
  /** Multiplicador de velocidade. 1 = como desenhado, 2 = duas vezes mais rápido. → `--vk-speed` */
  speed?: number | string;
  /** Liga/desliga a animação. Padrão: `true`. */
  animated?: boolean;
  /** Largura da caixa (número = px). Padrão: 100% do container. */
  width?: number | string;
  /** Altura da caixa (número = px). Padrão: derivada da proporção do desenho. */
  height?: number | string;
  /**
   * Proporção da caixa, sobrescrevendo a nativa do desenho.
   * Aceita `"220 / 150"` ou um número.
   */
  ratio?: number | string;
  /**
   * Rótulo acessível. Quando ausente o desenho é puramente decorativo
   * e recebe `aria-hidden="true"`.
   */
  title?: string;
}

const VAR_BY_PROP: Record<string, string> = {
  color: "--vk-color",
  accent: "--vk-accent",
  surface: "--vk-surface",
  opacity: "--vk-opacity",
  intensity: "--vk-intensity",
  speed: "--vk-speed",
};

/** Números viram px; strings passam intactas (permite `clamp()`, `%`, `rem`…). */
export function len(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

/**
 * Monta a string de `style` da raiz do componente:
 * variáveis do kit + dimensões + o `style` recebido de fora (que vem por
 * último e, por isso, vence).
 */
export function kitStyle(
  props: VisualKitProps,
  extra: Record<string, string | number | undefined> = {},
): string | undefined {
  const decls: string[] = [];

  for (const [prop, cssVar] of Object.entries(VAR_BY_PROP)) {
    const value = (props as Record<string, unknown>)[prop];
    if (value !== undefined && value !== null && value !== "") {
      decls.push(`${cssVar}: ${value}`);
    }
  }

  const width = len(props.width);
  if (width) decls.push(`width: ${width}`);
  const height = len(props.height);
  if (height) decls.push(`height: ${height}`);
  if (props.ratio !== undefined && props.ratio !== "") {
    decls.push(`aspect-ratio: ${props.ratio}`);
  }

  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== null && value !== "") {
      decls.push(`${key}: ${value}`);
    }
  }

  const own = decls.join("; ");
  const outer = props.style?.trim().replace(/;$/, "");
  const merged = [own, outer].filter(Boolean).join("; ");
  return merged || undefined;
}

/** Atributos de acessibilidade do `<svg>`: rotulado ou puramente decorativo. */
export function a11y(title: string | undefined) {
  return title
    ? { role: "img", "aria-label": title }
    : { "aria-hidden": "true", focusable: "false" };
}

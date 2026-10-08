import { z } from "zod-v4";

export const ANA_MODELS = {
  "inclusionai/ling-3.1-flash-free": {
    label: "Ling 3.1 Flash",
    hint: "grátis",
    inputCostPerToken: 0,
    outputCostPerToken: 0,
  },
  "poolside/laguna-s-2.1-free": {
    label: "Laguna S 2.1",
    hint: "grátis",
    inputCostPerToken: 0,
    outputCostPerToken: 0,
  },
} as const;

export type AnaModelId = keyof typeof ANA_MODELS;
export type AnaKnowledgeMode = "mcp" | "direct";

export const DEFAULT_ANA_MODEL: AnaModelId = "inclusionai/ling-3.1-flash-free";

export const anaChatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
  model: z.enum(Object.keys(ANA_MODELS) as [AnaModelId, ...AnaModelId[]]).default(DEFAULT_ANA_MODEL),
  mode: z.enum(["mcp", "direct"]).default("mcp"),
});

export function estimateAnaCost(
  model: AnaModelId,
  usage: { inputTokens?: number; outputTokens?: number },
) {
  const prices = ANA_MODELS[model];
  return (usage.inputTokens ?? 0) * prices.inputCostPerToken +
    (usage.outputTokens ?? 0) * prices.outputCostPerToken;
}

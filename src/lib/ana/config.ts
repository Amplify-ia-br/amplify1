import { z } from "zod-v4";

export const ANA_MODELS = {
  "inclusionai/ling-3.1-flash-free": {
    label: "Ling 3.1 Flash",
    hint: "grátis",
    provider: "gateway",
    inputCostPerToken: 0,
    outputCostPerToken: 0,
  },
  "poolside/laguna-s-2.1-free": {
    label: "Laguna S 2.1",
    hint: "grátis",
    provider: "gateway",
    inputCostPerToken: 0,
    outputCostPerToken: 0,
  },
  "anthropic/claude-haiku-5-5": {
    label: "Claude Haiku 5.5",
    hint: "BYOK",
    provider: "anthropic",
  },
} as const;

export type AnaModelId = keyof typeof ANA_MODELS;
export type AnaKnowledgeMode = "mcp" | "direct";

export const DEFAULT_ANA_MODEL: AnaModelId = "inclusionai/ling-3.1-flash-free";

const ANA_GATEWAY_FALLBACKS = [
  "inclusionai/ling-3.1-flash-free",
  "poolside/laguna-s-2.1-free",
  "stealth/glyph-cluster",
] as const;

export function getAnaFallbackModels(model: AnaModelId) {
  if (ANA_MODELS[model].provider !== "gateway") return [];
  return ANA_GATEWAY_FALLBACKS.filter((candidate) => candidate !== model);
}

export const anaChatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
  model: z.enum(Object.keys(ANA_MODELS) as [AnaModelId, ...AnaModelId[]]).default(DEFAULT_ANA_MODEL),
  mode: z.enum(["mcp", "direct"]).default("mcp"),
  apiKey: z.string().trim().min(1).max(512).optional(),
}).superRefine((value, context) => {
  if (ANA_MODELS[value.model].provider === "anthropic" && !value.apiKey) {
    context.addIssue({
      code: "custom",
      path: ["apiKey"],
      message: "Informe uma chave da Anthropic para usar o Claude em modo BYOK.",
    });
  }
});

export function estimateAnaCost(
  model: AnaModelId,
  usage: { inputTokens?: number; outputTokens?: number },
) {
  const prices = ANA_MODELS[model];
  if (!("inputCostPerToken" in prices) || !("outputCostPerToken" in prices)) return undefined;
  return (usage.inputTokens ?? 0) * prices.inputCostPerToken +
    (usage.outputTokens ?? 0) * prices.outputCostPerToken;
}

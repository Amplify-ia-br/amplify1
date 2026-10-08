import { describe, expect, it } from "vitest";
import { anaChatRequestSchema, DEFAULT_ANA_MODEL, estimateAnaCost } from "./config";

describe("Ana Lab configuration", () => {
  it("accepts only the supported models and knowledge modes", () => {
    const valid = anaChatRequestSchema.parse({ messages: [{}], mode: "mcp" });
    expect(valid.model).toBe(DEFAULT_ANA_MODEL);
    expect(anaChatRequestSchema.safeParse({ messages: [{}], model: "unknown/model" }).success).toBe(false);
    expect(anaChatRequestSchema.safeParse({ messages: [{}], mode: "internal" }).success).toBe(false);
  });

  it("estimates model cost from token usage", () => {
    expect(estimateAnaCost("inclusionai/ling-3.1-flash-free", { inputTokens: 1_000, outputTokens: 500 })).toBe(0);
    expect(estimateAnaCost("poolside/laguna-s-2.1-free", { inputTokens: 1_000, outputTokens: 500 })).toBe(0);
  });
});

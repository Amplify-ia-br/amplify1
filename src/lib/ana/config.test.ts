import { describe, expect, it } from "vitest";
import {
  anaChatRequestSchema,
  DEFAULT_ANA_MODEL,
  estimateAnaCost,
  getAnaFallbackModels,
  getAnaQualityRetryModel,
} from "./config";

const message = { id: "message-1", role: "user", parts: [{ type: "text", text: "Olá" }] };

describe("Ana Lab configuration", () => {
  it("accepts only the supported models and knowledge modes", () => {
    const valid = anaChatRequestSchema.parse({ messages: [message], mode: "mcp" });
    expect(valid.model).toBe(DEFAULT_ANA_MODEL);
    expect(anaChatRequestSchema.safeParse({ messages: [message], model: "unknown/model" }).success).toBe(false);
    expect(anaChatRequestSchema.safeParse({ messages: [message], mode: "internal" }).success).toBe(false);
    expect(anaChatRequestSchema.safeParse({
      messages: [message],
      model: "byok/anthropic/claude-haiku-5-5",
    }).success).toBe(false);
    expect(anaChatRequestSchema.safeParse({
      messages: [message],
      model: "byok/anthropic/claude-haiku-5-5",
      apiKey: "test-key",
    }).success).toBe(true);
  });

  it("accepts only one bounded user text message", () => {
    expect(anaChatRequestSchema.safeParse({ messages: [null] }).success).toBe(false);
    expect(anaChatRequestSchema.safeParse({ messages: [{ ...message, role: "assistant" }] }).success).toBe(false);
    expect(anaChatRequestSchema.safeParse({ messages: [message, message] }).success).toBe(false);
    expect(anaChatRequestSchema.safeParse({
      messages: [{ ...message, parts: [{ type: "text", text: "x".repeat(4_001) }] }],
    }).success).toBe(false);
  });

  it("estimates model cost from token usage", () => {
    expect(estimateAnaCost("inclusionai/ling-3.1-flash-free", { inputTokens: 1_000, outputTokens: 500 })).toBe(0);
    expect(estimateAnaCost("poolside/laguna-s-2.1-free", { inputTokens: 1_000, outputTokens: 500 })).toBe(0);
    expect(estimateAnaCost("openai/gpt-5.4-mini-fast", { inputTokens: 1_000, outputTokens: 500 })).toBe(0.006);
  });

  it("uses only approved paid models as automatic Gateway fallbacks", () => {
    const fallbacks = getAnaFallbackModels("inclusionai/ling-3.1-flash-free");
    expect(fallbacks).toEqual([
      "openai/gpt-5.4-mini-fast",
      "google/gemini-3.1-flash-lite",
    ]);
    expect(getAnaFallbackModels("openai/gpt-5.4-mini-fast")).toEqual(["google/gemini-3.1-flash-lite"]);
  });

  it("does not send direct Anthropic models through Gateway fallbacks", () => {
    expect(getAnaFallbackModels("byok/anthropic/claude-haiku-5-5")).toEqual([]);
  });

  it("retries quality failures with an approved model", () => {
    expect(getAnaQualityRetryModel("inclusionai/ling-3.1-flash-free")).toBe("openai/gpt-5.4-mini-fast");
    expect(getAnaQualityRetryModel("openai/gpt-5.4-mini-fast")).toBe("google/gemini-3.1-flash-lite");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnaConversationState } from "./conversation";
import type { AnaRetrievalTrace } from "./retrieval";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  gateway: vi.fn((model: string) => ({ model })),
}));

vi.mock("ai", async (importOriginal) => ({
  ...await importOriginal<typeof import("ai")>(),
  generateText: mocks.generateText,
  gateway: mocks.gateway,
}));

import { generateAnaAnswer } from "./agent";

const conversation = {
  turnKind: "request",
  stage: "solution",
  shouldRetrieveKnowledge: true,
  shouldAskQuestion: false,
  knownFacts: [],
  recentAssistantQuestions: [],
  userTurnCount: 1,
  qualification: {
    commercialIntent: false,
    pricingIntent: false,
    meetingIntent: false,
    advancementIntent: false,
    contactConsent: false,
    contactRevoked: false,
  },
  qualificationScore: 0,
  leadStage: "engaged",
  shouldPersistLead: false,
  shouldExpandLeia: false,
  answeredNameThisTurn: false,
  incompleteUserThought: false,
  answerRequired: true,
} as AnaConversationState;

const retrieval = {
  query: "consultoria",
  normalizedTerms: ["consultoria"],
  intent: "portfolio",
  mode: "direct",
  listMs: 1,
  fetchMs: 1,
  totalMs: 2,
  ranked: [{ id: "portfolio", title: "Portfólio", score: 100 }],
  documents: [{
    id: "portfolio",
    title: "Portfólio",
    description: "Consultoria, educação e desenvolvimento de produtos de IA.",
    type: "portfolio",
    tags: ["consultoria"],
    content: "A Amplify oferece consultoria, educação e desenvolvimento de produtos de IA.",
  }],
  fallbackText: "Consultoria, educação e desenvolvimento de produtos de IA.",
} as AnaRetrievalTrace;

function generated(text: string, modelId = "openai/gpt-5.4-mini-fast") {
  return {
    text,
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    finalStep: {
      providerMetadata: { gateway: { generationId: "generation-1" } },
      response: { modelId },
    },
    finishReason: "stop",
  };
}

describe("Ana buffered generation", () => {
  beforeEach(() => {
    mocks.generateText.mockReset();
    mocks.gateway.mockClear();
  });

  it("returns a fully validated answer without retry", async () => {
    mocks.generateText.mockResolvedValueOnce(generated("A Amplify oferece consultoria para mapear e implementar oportunidades de IA."));

    const answer = await generateAnaAnswer("direct", "openai/gpt-5.4-mini-fast", [], retrieval, conversation);
    expect(answer).toMatchObject({
      qualityRetryCount: 0,
      qualityFallback: false,
      validationIssues: [],
      resolvedModel: "openai/gpt-5.4-mini-fast",
    });
    expect(mocks.generateText).toHaveBeenCalledTimes(1);
  });

  it("rejects a mixed-script answer and retries once with an approved model", async () => {
    mocks.generateText
      .mockResolvedValueOnce(generated("As atividades acontecem em پروژهis."))
      .mockResolvedValueOnce(generated("As atividades acontecem em projetos.", "google/gemini-3.1-flash-lite"));

    const answer = await generateAnaAnswer("direct", "openai/gpt-5.4-mini-fast", [], retrieval, conversation);
    expect(answer).toMatchObject({
      text: "As atividades acontecem em projetos.",
      qualityRetryCount: 1,
      qualityFallback: false,
      resolvedModel: "google/gemini-3.1-flash-lite",
    });
    expect(answer.validationIssues).toContain("non_latin_script");
    expect(mocks.generateText).toHaveBeenCalledTimes(2);
    expect(mocks.gateway).toHaveBeenNthCalledWith(2, "google/gemini-3.1-flash-lite");
  });

  it("uses the deterministic documentation fallback after two model failures", async () => {
    mocks.generateText.mockRejectedValue(new Error("provider_unavailable"));

    const answer = await generateAnaAnswer("direct", "openai/gpt-5.4-mini-fast", [], retrieval, conversation);
    expect(answer).toMatchObject({
      qualityRetryCount: 1,
      qualityFallback: true,
      resolvedModel: "ana-documentation-fallback",
      finishReason: "fallback",
    });
    expect(answer.text).toContain("Consultoria, educação e desenvolvimento de produtos de IA.");
    expect(mocks.generateText).toHaveBeenCalledTimes(2);
  });
});

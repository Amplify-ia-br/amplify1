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

import { buildAnaInstructions, generateAnaAnswer } from "./agent";
import { analyzeAnaConversation } from "./conversation";
import { progressMessages } from "./progress-suite";

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

  it("instructs the model to qualify an advancing lead before requesting contact", () => {
    const instructions = buildAnaInstructions({
      ...conversation,
      stage: "qualification",
      shouldAskQuestion: true,
      qualification: {
        ...conversation.qualification,
        advancementIntent: true,
        multiOfferInterest: true,
      },
      nextQuestion: {
        key: "priority",
        text: "Qual dessas duas frentes é mais urgente agora?",
      },
    });

    expect(instructions).toContain("Não peça contato nem ofereça agendamento agora");
    expect(instructions).toContain("Qual dessas duas frentes é mais urgente agora?");
    expect(instructions).toContain("sem repetir explicações já dadas");
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

  it("rejects an inappropriate offer and realizes the controller's next action on retry", async () => {
    const state = analyzeAnaConversation(progressMessages("Meu nome é Carlitos. Tenho um escritório de advocacia. Quero contratar um diagnóstico para atendimento."));
    mocks.generateText
      .mockResolvedValueOnce(generated("Recomendo o L.E.I.A. — Laboratório Escolar de Inteligência Artificial para preparar a equipe do escritório."))
      .mockResolvedValueOnce(generated("A consultoria pode avaliar o atendimento. Qual é a sua empresa ou organização?"));
    const answer = await generateAnaAnswer("direct", "openai/gpt-5.4-mini-fast", [], retrieval, state);
    expect(answer.validationIssues).toContain("inappropriate_offer");
    expect(answer.validationIssues).toContain("missing_recommended_question");
    expect(answer.qualityFallback).toBe(false);
    expect(mocks.generateText).toHaveBeenCalledTimes(2);
  });

  it("a catalogue fallback describes documentation without recommending every offer", async () => {
    const state = analyzeAnaConversation(progressMessages("Meu nome é Carlitos. Tenho um escritório de advocacia. Quero contratar um diagnóstico para atendimento."));
    mocks.generateText.mockResolvedValue(generated("Recomendo L.E.I.A. para preparar sua equipe."));
    const answer = await generateAnaAnswer("direct", "openai/gpt-5.4-mini-fast", [], {
      ...retrieval, documents: [...retrieval.documents,
        { ...retrieval.documents[0], id: "method", title: "Método", description: "Começar pelo problema antes da ferramenta." },
        { ...retrieval.documents[0], id: "leia", title: "L.E.I.A.", description: "Programa para estudantes do 9º ano ao Ensino Médio." }],
    }, state);
    expect(answer.qualityFallback).toBe(true);
    expect(answer.text).toContain("Na documentação");
    expect(answer.text).toContain(state.nextQuestion!.text);
    expect(answer.text).not.toContain("ajudar nestas frentes");
    expect(answer.text).not.toContain("L.E.I.A.");
    expect(mocks.generateText).toHaveBeenCalledTimes(2);
  });
});

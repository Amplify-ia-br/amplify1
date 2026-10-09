import { describe, expect, it } from "vitest";
import { buildAnaInstructions } from "./agent";
import type { AnaConversationState } from "./conversation";

const state: AnaConversationState = {
  turnKind: "disclosure",
  stage: "discovery",
  shouldRetrieveKnowledge: false,
  shouldAskQuestion: true,
  pageHint: "leia",
  knownFacts: ["A pessoa é proprietária de uma escola."],
  recentAssistantQuestions: ["Quais séries sua escola atende?"],
  userTurnCount: 2,
};

describe("Ana conversation instructions", () => {
  it("prioritizes conversation before a commercial pitch", () => {
    const instructions = buildAnaInstructions(state);
    expect(instructions).toContain("Você conversa antes de vender");
    expect(instructions).toContain("Não apresente produtos ainda");
    expect(instructions).toContain("A pessoa é proprietária de uma escola.");
  });

  it("treats page context as a hint and prevents repeated questions", () => {
    const instructions = buildAnaInstructions(state);
    expect(instructions).toContain("trate isso apenas como pista");
    expect(instructions).toContain("Quais séries sua escola atende?");
    expect(instructions).toContain("NÃO REPITA");
  });

  it("keeps citations out of the visible conversation", () => {
    expect(buildAnaInstructions(state)).toContain("Não inclua linhas de fonte ou citações no texto da conversa");
  });
});

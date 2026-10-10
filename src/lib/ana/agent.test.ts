import { describe, expect, it } from "vitest";
import { buildAnaInstructions, normalizeAnaTextStream } from "./agent";
import type { AnaConversationState } from "./conversation";
import { normalizeAnaProductName } from "./text";

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

  it("requires the full L.E.I.A. name on Ana's first mention", () => {
    expect(buildAnaInstructions({ ...state, shouldExpandLeia: true })).toContain(
      "L.E.I.A. — Laboratório Escolar de Inteligência Artificial",
    );
  });

  it("normalizes spaced variations of the L.E.I.A. name", () => {
    expect(normalizeAnaProductName("O L. E. I. A. ajuda escolas.")).toBe("O L.E.I.A. ajuda escolas.");
    expect(normalizeAnaProductName("O L. E. I. A.. é um programa.")).toBe("O L.E.I.A. é um programa.");
  });

  it("normalizes the product name even when it is split across stream chunks", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "text-start", id: "answer" } as const);
        controller.enqueue({ type: "text-delta", id: "answer", text: "O L." } as const);
        controller.enqueue({ type: "text-delta", id: "answer", text: " E." } as const);
        controller.enqueue({ type: "text-delta", id: "answer", text: " I." } as const);
        controller.enqueue({ type: "text-delta", id: "answer", text: " A.. atende escolas." } as const);
        controller.enqueue({ type: "text-end", id: "answer" } as const);
        controller.close();
      },
    }).pipeThrough(normalizeAnaTextStream()());

    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const text = chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => chunk.text).join("");
    expect(text).toBe("O L.E.I.A. atende escolas.");
  });
});

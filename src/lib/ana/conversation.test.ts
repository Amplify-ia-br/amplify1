import { describe, expect, it } from "vitest";
import type { AnaMessage } from "./types";
import { analyzeAnaConversation, immediateAnaReply } from "./conversation";
import { ANA_REFERENCE_SUITE } from "./reference-suite";

function messages(turns: Array<{ role: "user" | "assistant"; text: string }>) {
  return turns.map((turn, index) => ({
    id: `message-${index}`,
    role: turn.role,
    parts: [{ type: "text", text: turn.text }],
  })) as AnaMessage[];
}

describe("Ana reference conversation suite", () => {
  it.each(ANA_REFERENCE_SUITE)("$name", (scenario) => {
    const state = analyzeAnaConversation(messages(scenario.turns), scenario.pagePath);
    expect(state).toMatchObject(scenario.expected);
  });

  it("answers a greeting briefly without pitching the company", () => {
    const conversation = messages([{ role: "user", text: "Olá" }]);
    const reply = immediateAnaReply(analyzeAnaConversation(conversation), conversation);
    expect(reply).toBe("Oi! Tudo bem? Como posso te ajudar?");
    expect(reply).not.toContain("Amplify ajuda");
  });

  it("acknowledges L.E.I.A. without repeating the previous qualification question", () => {
    const conversation = messages([
      { role: "user", text: "Quero conhecer o L.E.I.A." },
      { role: "assistant", text: "Quais séries sua escola atende?" },
      { role: "user", text: "Entendi." },
    ]);
    const reply = immediateAnaReply(analyzeAnaConversation(conversation), conversation);
    expect(reply).toContain("L.E.I.A.");
    expect(reply).not.toContain("Quais séries");
    expect(reply?.match(/\?/g) ?? []).toHaveLength(0);
  });

  it("retains useful facts and recent questions as conversation memory", () => {
    const conversation = messages([
      { role: "user", text: "Sou dono de uma escola particular." },
      { role: "assistant", text: "Que legal. Você busca algo para alunos ou professores?" },
      { role: "user", text: "Para os alunos." },
    ]);
    const state = analyzeAnaConversation(conversation);
    expect(state.knownFacts).toContain("A pessoa é proprietária de uma escola.");
    expect(state.knownFacts).toContain("A escola é particular.");
    expect(state.knownFacts).toContain("O interesse mencionado envolve estudantes.");
    expect(state.recentAssistantQuestions).toEqual(["Que legal. Você busca algo para alunos ou professores?"]);
  });
});

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

  it("qualifies a L.E.I.A. lead progressively without repeating questions", () => {
    const conversation = messages([
      { role: "user", text: "Sou dono de uma escola particular e quero conhecer o L.E.I.A." },
      { role: "assistant", text: "Sua escola atende turmas do 9º ano do Ensino Fundamental à 3ª série do Ensino Médio?" },
      { role: "user", text: "Sim, temos 180 alunos." },
    ]);
    const state = analyzeAnaConversation(conversation);
    expect(state.stage).toBe("qualification");
    expect(state.leadStage).toBe("qualifying");
    expect(state.qualification).toMatchObject({
      role: "proprietário(a)",
      schoolSector: "private",
      offerInterest: "leia",
      gradeFit: true,
      studentCount: 180,
    });
    expect(state.nextQuestion).toEqual({
      key: "internet",
      text: "A escola tem conexão estável à internet para as turmas?",
    });
  });

  it("moves a qualified lead to consented handoff when contact is supplied", () => {
    const conversation = messages([
      { role: "user", text: "Sou diretor de uma escola. Atendemos do 9º ano ao Ensino Médio, com 200 alunos e internet estável." },
      { role: "assistant", text: "Posso registrar seu nome e seu melhor e-mail ou WhatsApp para o time continuar essa conversa?" },
      { role: "user", text: "Sim, meu nome é Rafael e meu e-mail é rafael@colegio.com.br." },
    ]);
    const state = analyzeAnaConversation(conversation);
    expect(state.stage).toBe("handoff");
    expect(state.leadStage).toBe("handoff");
    expect(state.qualification).toMatchObject({
      name: "Rafael",
      email: "rafael@colegio.com.br",
      contactConsent: true,
    });
    expect(state.nextQuestion).toBeUndefined();
  });

  it("does not treat a contact detail as consent when Ana did not ask for it", () => {
    const state = analyzeAnaConversation(messages([
      { role: "user", text: "Meu e-mail é pessoa@exemplo.com e queria entender o programa." },
    ]));
    expect(state.qualification.email).toBe("pessoa@exemplo.com");
    expect(state.qualification.contactConsent).toBe(false);
    expect(state.leadStage).not.toBe("handoff");
  });

  it("stops qualification when the school does not serve the L.E.I.A. grade range", () => {
    const state = analyzeAnaConversation(messages([
      { role: "user", text: "Sou dono de uma escola particular, mas atendemos somente até o 8º ano." },
    ]));
    expect(state.leadStage).toBe("nurture");
    expect(state.qualification.gradeFit).toBe(false);
    expect(state.nextQuestion).toBeUndefined();
  });

  it("confirms handoff only after persistence succeeds", () => {
    const conversation = messages([
      { role: "user", text: "Quero falar com vendas sobre o L.E.I.A." },
      { role: "assistant", text: "Posso registrar seu nome e seu melhor e-mail ou WhatsApp para o time continuar essa conversa?" },
      { role: "user", text: "Pode sim, meu e-mail é contato@escola.com.br." },
    ]);
    const state = analyzeAnaConversation(conversation);
    expect(immediateAnaReply(state, conversation)).toBeUndefined();
    expect(immediateAnaReply(state, conversation, true)).toContain("contato ficou registrado");
  });

  it("respects an explicit refusal of contact", () => {
    const state = analyzeAnaConversation(messages([
      { role: "user", text: "Sou diretor de uma escola com turmas do 9º ano, 150 alunos e internet estável." },
      { role: "assistant", text: "Posso registrar seus dados para o time continuar a conversa?" },
      { role: "user", text: "Prefiro não receber contato." },
    ]));
    expect(state.qualification.contactRevoked).toBe(true);
    expect(state.qualification.contactConsent).toBe(false);
    expect(state.nextQuestion).toBeUndefined();
    expect(state.leadStage).toBe("qualified");
  });
});

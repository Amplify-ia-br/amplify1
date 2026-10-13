import { describe, expect, it } from "vitest";
import { analyzeAnaConversation, immediateAnaReply, type AnaLeadQualification } from "./conversation";
import { buildAnaInstructions } from "./agent";
import type { AnaMessage } from "./types";

const messages = (...turns: string[]): AnaMessage[] => turns.map((text, i) => ({
  id: `continuity-${i}`, role: i % 2 ? "assistant" : "user", parts: [{ type: "text", text }],
}));

// Verbatim real Ana output from candidate-comparison.json (12 Oct 2026),
// scenario "duas necessidades devem ser respondidas juntas", Gemini.
const realAnaExplanation = "Olá! Para ensinar IA aos estudantes, nós temos o L.E.I.A. — Laboratório Escolar de Inteligência Artificial. É um programa anual voltado para o 9º ano do Fundamental à 3ª série do Médio, que foca na fluência e no uso crítico e responsável da tecnologia através de projetos, sem que os alunos precisem saber programar.\n\nJá para a operação da sua escola, nossa frente de Consultoria pode ajudar no diagnóstico de oportunidades, redesenho de processos e na implementação de soluções customizadas, como automações ou assistentes que ajudem a tornar o dia a dia da instituição mais eficiente.\n\nQual é o seu nome?";
// Controlled invitation: the user described its intent, not its exact wording.
const choiceInvitation = "Podemos aprofundar o L.E.I.A. ou a consultoria. Qual dessas frentes você prefere aprofundar?";
const fullHistory = messages(
  "Oi", "Oi! Tudo bem? Eu sou a Ana. Qual é o seu nome?",
  "Eu me chama Leonardo", "Prazer, Leonardo. Como posso te ajudar?",
  "Sou dono de uma escola. Quero ensinar IA para os alunos e melhorar a gestão.", realAnaExplanation,
  "O que a Amplify pode fazer por mim?", choiceInvitation,
  "Entendi. Podemos começar com o LEIA",
);

describe("Ana continuity regression: offered fronts", () => {
  // Final offers copied verbatim from the live multi-turn run on 13 Oct 2026.
  it.each([
    "Se você quiser, eu posso detalhar primeiro a frente de alunos ou a de gestão.",
    "Qual dessas frentes faz mais sentido para o seu momento atual?",
    "Qual dessas duas frentes é a sua prioridade no momento?",
  ])("honors choices after real model variations: %s", invitation => {
    const state = analyzeAnaConversation(messages("Sou Leo. Quero ensinar IA aos alunos e melhorar a gestão.", `${realAnaExplanation}\n${invitation}`, "Entendi. Podemos começar com o LEIA"));
    expect(state.qualification.qualificationFocus).toBe("leia");
    expect(state.qualification.advancementIntent).toBe(false);
    expect(state.answerRequired).toBe(true);
    expect(state.nextQuestion).toBeUndefined();
  });

  it("does not confuse a purchase request with acceptance of an explanation", () => {
    const state = analyzeAnaConversation(messages("Sou Leo. Quero ensinar IA aos alunos e melhorar a gestão.", choiceInvitation, "Quero contratar o LEIA"));
    expect(state.acceptedAssistantOffer).toBeUndefined();
    expect(state.qualification.advancementIntent).toBe(true);
    expect(state.qualification.contactConsent).toBe(false);
  });
  it("replays the complete conversation with real previous assistant text", () => {
    let previous: AnaLeadQualification | undefined;
    for (let i = 0; i < fullHistory.length; i += 2) {
      const history = fullHistory.slice(0, i + 1);
      const state = analyzeAnaConversation(history, undefined, previous);
      if (i === 2) expect(state.qualification.name).toBe("Leonardo");
      if (i === 6) {
        expect(state.answerRequired).toBe(true);
        expect(immediateAnaReply(state, history)).toBeUndefined();
      }
      if (i === 8) {
        expect(state.qualification.qualificationFocus).toBe("leia");
        expect(state.qualification.timeline).toBeUndefined();
        expect(state.qualification.advancementIntent).toBe(false);
        expect(state.qualification.contactConsent).toBe(false);
        expect(state.answerRequired).toBe(true);
        expect(state.acceptedAssistantOffer).toContain("L.E.I.A.");
        expect(state.nextQuestion).toBeUndefined();
        expect(immediateAnaReply(state, history)).toBeUndefined();
      }
      previous = state.qualification;
    }
  });

  it.each(["Entendi. Podemos começar com o LEIA", "Vamos pelo L.E.I.A.", "LEIA", "Prefiro o LEIA", "Primeiro o LEIA"])("recognizes offered choice: %s", answer => {
    const state = analyzeAnaConversation(messages("Sou Leo. Quero ensinar IA e melhorar a gestão da escola.", choiceInvitation, answer));
    expect(state.qualification.qualificationFocus).toBe("leia");
    expect(state.answerRequired).toBe(true);
    expect(state.nextQuestion).toBeUndefined();
  });

  it.each(["Não quero o LEIA", "O que é LEIA?", "Ainda não sei", "LEIA ou consultoria"])("does not invent a priority from ambiguity/refusal/question: %s", answer => {
    const state = analyzeAnaConversation(messages("Sou Leo. Quero ensinar IA e melhorar a gestão da escola.", choiceInvitation, answer));
    expect(state.qualification.qualificationFocus).toBeUndefined();
    expect(state.acceptedAssistantOffer).toBeUndefined();
  });

  it("records another choice without erasing other interests, including truncated history", () => {
    const first = analyzeAnaConversation(fullHistory);
    const history = messages("Agora prefiro consultoria para a gestão");
    const state = analyzeAnaConversation(history, undefined, first.qualification);
    expect(state.qualification.qualificationFocus).toBe("consulting");
    expect(state.qualification.offerInterests).toContain("leia");
    expect(state.qualification.name).toBe("Leonardo");
  });

  it("continues commercial qualification for the chosen front, not the old choice", () => {
    const state = analyzeAnaConversation([...fullHistory, ...messages("Certo.", "Quero contratar o L.E.I.A.").map((m, i) => ({ ...m, id: `next-${i}`, role: i ? "user" as const : "assistant" as const }))]);
    expect(state.qualification.qualificationFocus).toBe("leia");
    expect(state.nextQuestion?.key).toBe("grades");
    expect(state.nextQuestion?.key).not.toBe("priority");
  });

  it("keeps qualification priority distinct from a promise to explain", () => {
    const state = analyzeAnaConversation(messages("Sou Leo. Quero contratar para alunos e gestão da escola.", "Qual dessas duas frentes é mais urgente agora: implementar o L.E.I.A. ou aplicar IA na operação da escola?", "LEIA"));
    expect(state.qualification.qualificationFocus).toBe("leia");
    expect(state.acceptedAssistantOffer).toBeUndefined();
    expect(state.nextQuestion?.key).toBe("grades");
  });

  it("does not turn a priority answer into a start date", () => {
    const state = analyzeAnaConversation(messages("Sou Leo. Quero contratar para alunos e gestão.", "Por qual frente você quer começar: L.E.I.A. ou consultoria?", "LEIA"));
    expect(state.qualification.timeline).toBeUndefined();
  });

  it.each(["Eu me chama Leonardo", "Eu me chamo Leonardo", "Meu nome é Leonardo"])("extracts only the name: %s", text => {
    const history = messages("Oi", "Qual é seu nome?", text);
    expect(analyzeAnaConversation(history).qualification.name).toBe("Leonardo");
  });

  it("answers a question after a repeated name request instead of greeting again", () => {
    const history = messages("Meu nome é Leonardo", "Qual é seu nome?", "O que a Amplify pode fazer por mim?");
    const state = analyzeAnaConversation(history);
    expect(state.answeredNameThisTurn).toBe(false);
    expect(state.shouldRetrieveKnowledge).toBe(true);
    expect(immediateAnaReply(state, history)).toBeUndefined();
  });

  it("answers even when the visitor supplies name and question together", () => {
    const history = messages("Oi", "Qual é seu nome?", "Eu me chama Leonardo. O que a Amplify pode fazer por mim?");
    const state = analyzeAnaConversation(history);
    expect(state.qualification.name).toBe("Leonardo");
    expect(immediateAnaReply(state, history)).toBeUndefined();
  });

  it("prioritizes an explicit question over an old commercial intention", () => {
    const state = analyzeAnaConversation(messages("O que a Amplify pode fazer por mim?"), undefined, { name: "Leo", advancementIntent: true });
    const directive = buildAnaInstructions(state).split("DIRETRIZ DESTE TURNO:")[1];
    expect(directive).toContain("Responda-a primeiro");
    expect(directive).not.toContain("faça exatamente a pergunta recomendada");
  });

  it("uses progressive detail without dropping required names or caveats", () => {
    const instructions = buildAnaInstructions(analyzeAnaConversation(fullHistory));
    expect(instructions).toContain("até 120 palavras");
    expect(instructions).toContain("pré-requisitos");
    expect(instructions).toContain("Não volte a perguntar qual frente");
  });
});
